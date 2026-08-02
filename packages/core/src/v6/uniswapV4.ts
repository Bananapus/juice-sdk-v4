import {
  decodeFunctionResult,
  encodeAbiParameters,
  encodeFunctionData,
  keccak256,
  toEventSelector,
  zeroAddress,
} from "viem";
import type { Address, Hex, PublicClient } from "viem";
import { NATIVE_TOKEN } from "../constants.js";
import type { JBChainId } from "../types.js";
import {
  UNISWAP_V4_POOL_MANAGER_ADDRESSES,
  uniswapV4Deployment,
} from "./uniswapV4Deployments.js";
export * from "./uniswapV4Deployments.js";

export const UNISWAP_V4_Q96 = 1n << 96n;
export const UNISWAP_V4_MAX_TICK = 887_272;

/** Pool key tuple used by the Juicebox buyback and LP integrations. */
export interface UniswapV4PoolKey {
  currency0: Address;
  currency1: Address;
  fee: number;
  tickSpacing: number;
  hooks: Address;
}

function normalizeUniswapV4Currency(token: Address): string {
  return token.toLowerCase() === NATIVE_TOKEN.toLowerCase()
    ? zeroAddress
    : token.toLowerCase();
}

/**
 * Resolve the exact swap direction for a token pair, normalizing Juicebox's
 * native-token sentinel to Uniswap V4's zero-address currency.
 *
 * Returns `null` unless both input and output match opposite sides of the pool.
 * Clients should fail closed on `null` instead of inferring the output token
 * from the input side alone.
 */
export function uniswapV4SwapDirection({
  poolKey,
  tokenIn,
  tokenOut,
}: {
  poolKey: UniswapV4PoolKey;
  tokenIn: Address;
  tokenOut: Address;
}): boolean | null {
  const input = normalizeUniswapV4Currency(tokenIn);
  const output = normalizeUniswapV4Currency(tokenOut);
  const currency0 = poolKey.currency0.toLowerCase();
  const currency1 = poolKey.currency1.toLowerCase();
  if (input === currency0 && output === currency1) return true;
  if (input === currency1 && output === currency0) return false;
  return null;
}

const V4_QUOTER_ABI = [
  {
    type: "function",
    name: "quoteExactInputSingle",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          {
            name: "poolKey",
            type: "tuple",
            components: [
              { name: "currency0", type: "address" },
              { name: "currency1", type: "address" },
              { name: "fee", type: "uint24" },
              { name: "tickSpacing", type: "int24" },
              { name: "hooks", type: "address" },
            ],
          },
          { name: "zeroForOne", type: "bool" },
          { name: "exactAmount", type: "uint128" },
          { name: "hookData", type: "bytes" },
        ],
      },
    ],
    outputs: [
      { name: "amountOut", type: "uint256" },
      { name: "gasEstimate", type: "uint256" },
    ],
  },
] as const;

const UNIVERSAL_ROUTER_ABI = [
  {
    type: "function",
    name: "execute",
    stateMutability: "payable",
    inputs: [
      { name: "commands", type: "bytes" },
      { name: "inputs", type: "bytes[]" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

const PERMIT2_ABI = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "spender", type: "address" },
      { name: "amount", type: "uint160" },
      { name: "expiration", type: "uint48" },
    ],
    outputs: [],
  },
] as const;

const UINT128_MAX = (1n << 128n) - 1n;
const UINT160_MAX = (1n << 160n) - 1n;

/** Quote an exact-input single-pool swap, including the pool hook's behavior. */
export async function quoteUniswapV4ExactInputSingle(
  client: PublicClient,
  {
    chainId,
    poolKey,
    zeroForOne,
    amountIn,
    hookData = "0x",
  }: {
    chainId: JBChainId;
    poolKey: UniswapV4PoolKey;
    zeroForOne: boolean;
    amountIn: bigint;
    hookData?: Hex;
  },
): Promise<bigint> {
  if (amountIn <= 0n || amountIn > UINT128_MAX) {
    throw new Error("Swap amount is outside Uniswap V4's uint128 range.");
  }
  const quoter = uniswapV4Deployment(chainId)?.quoter;
  if (!quoter)
    throw new Error(`No supported Uniswap V4 quoter on chain ${chainId}.`);

  const call = await client.call({
    to: quoter,
    data: encodeFunctionData({
      abi: V4_QUOTER_ABI,
      functionName: "quoteExactInputSingle",
      args: [{ poolKey, zeroForOne, exactAmount: amountIn, hookData }],
    }),
  });
  if (!call.data) throw new Error("Uniswap V4 quoter returned no data.");
  const [amountOut] = decodeFunctionResult({
    abi: V4_QUOTER_ABI,
    functionName: "quoteExactInputSingle",
    data: call.data,
  });
  return amountOut;
}

export interface UniswapV4SwapTxRequest {
  chainId: JBChainId;
  address: Address;
  abi: typeof UNIVERSAL_ROUTER_ABI;
  functionName: "execute";
  args: readonly [Hex, readonly Hex[], bigint];
  value: bigint;
}

/**
 * Build a Universal Router exact-input V4 swap.
 *
 * ERC-20 input must first approve Permit2, then authorize the Universal Router
 * with {@link buildPermit2ApproveTx}. Native input is supplied as `msg.value`.
 */
export function buildUniswapV4ExactInputSwapTx({
  chainId,
  poolKey,
  zeroForOne,
  amountIn,
  minimumAmountOut,
  recipient,
  deadline,
  hookData = "0x",
}: {
  chainId: JBChainId;
  poolKey: UniswapV4PoolKey;
  zeroForOne: boolean;
  amountIn: bigint;
  minimumAmountOut: bigint;
  recipient: Address;
  deadline: bigint;
  hookData?: Hex;
}): UniswapV4SwapTxRequest {
  if (
    amountIn <= 0n ||
    amountIn > UINT128_MAX ||
    minimumAmountOut <= 0n ||
    minimumAmountOut > UINT128_MAX
  ) {
    throw new Error("Swap amounts are outside Uniswap V4's uint128 range.");
  }
  const universalRouter = uniswapV4Deployment(chainId)?.universalRouter;
  if (!universalRouter) {
    throw new Error(
      `No supported Uniswap Universal Router on chain ${chainId}.`,
    );
  }

  const currencyIn = zeroForOne ? poolKey.currency0 : poolKey.currency1;
  const currencyOut = zeroForOne ? poolKey.currency1 : poolKey.currency0;
  const swap = encodeAbiParameters(
    [
      {
        type: "tuple",
        components: [
          {
            type: "tuple",
            components: [
              { type: "address" },
              { type: "address" },
              { type: "uint24" },
              { type: "int24" },
              { type: "address" },
            ],
          },
          { type: "bool" },
          { type: "uint128" },
          { type: "uint128" },
          { type: "bytes" },
        ],
      },
    ],
    [
      [
        [
          poolKey.currency0,
          poolKey.currency1,
          poolKey.fee,
          poolKey.tickSpacing,
          poolKey.hooks,
        ],
        zeroForOne,
        amountIn,
        minimumAmountOut,
        hookData,
      ],
    ],
  );
  const settle = encodeAbiParameters(
    [{ type: "address" }, { type: "uint256" }],
    [currencyIn, amountIn],
  );
  const take = encodeAbiParameters(
    [{ type: "address" }, { type: "address" }, { type: "uint256" }],
    [currencyOut, recipient, 0n],
  );
  const input = encodeAbiParameters(
    [{ type: "bytes" }, { type: "bytes[]" }],
    ["0x060c0e", [swap, settle, take]],
  );

  return {
    chainId,
    address: universalRouter,
    abi: UNIVERSAL_ROUTER_ABI,
    functionName: "execute",
    args: ["0x10", [input], deadline],
    value: currencyIn.toLowerCase() === zeroAddress ? amountIn : 0n,
  };
}

export interface Permit2ApproveTxRequest {
  chainId: JBChainId;
  address: Address;
  abi: typeof PERMIT2_ABI;
  functionName: "approve";
  args: readonly [Address, Address, bigint, number];
  value: 0n;
}

/** Authorize the Universal Router to spend an ERC-20 already approved to Permit2. */
export function buildPermit2ApproveTx({
  chainId,
  token,
  amount = UINT160_MAX,
  expiration,
}: {
  chainId: JBChainId;
  token: Address;
  amount?: bigint;
  expiration: number;
}): Permit2ApproveTxRequest {
  if (amount <= 0n || amount > UINT160_MAX) {
    throw new Error("Permit2 amount is outside its uint160 range.");
  }
  if (
    !Number.isInteger(expiration) ||
    expiration <= 0 ||
    expiration >= 2 ** 48
  ) {
    throw new Error("Permit2 expiration is outside its uint48 range.");
  }
  const deployment = uniswapV4Deployment(chainId);
  if (!deployment?.universalRouter) {
    throw new Error(
      `No supported Uniswap Universal Router on chain ${chainId}.`,
    );
  }
  return {
    chainId,
    address: deployment.permit2,
    abi: PERMIT2_ABI,
    functionName: "approve",
    args: [token, deployment.universalRouter, amount, expiration],
    value: 0n,
  };
}

const POOL_KEY_TUPLE = [
  {
    type: "tuple",
    components: [
      { type: "address" },
      { type: "address" },
      { type: "uint24" },
      { type: "int24" },
      { type: "address" },
    ],
  },
] as const;

/** `PoolId.unwrap(PoolIdLibrary.toId(key))`. */
export function uniswapV4PoolId(key: UniswapV4PoolKey): Hex {
  return keccak256(
    encodeAbiParameters(POOL_KEY_TUPLE, [
      [key.currency0, key.currency1, key.fee, key.tickSpacing, key.hooks],
    ]),
  );
}

/** Storage slot containing the pool's packed slot0 in PoolManager. */
export function uniswapV4PoolStateSlot(poolId: Hex): Hex {
  return keccak256(
    encodeAbiParameters(
      [{ type: "bytes32" }, { type: "uint256" }],
      [poolId, 6n],
    ),
  );
}

/** Extract slot0's low-160-bit sqrtPriceX96 value. */
export function uniswapV4SqrtPriceX96FromSlot0(slot0: Hex): bigint {
  return BigInt(slot0) & ((1n << 160n) - 1n);
}

/**
 * Convert a pool sqrt price into human pair-token units per project token.
 * Juicebox project tokens use 18 decimals.
 */
export function uniswapV4PriceFromSqrtPriceX96(
  sqrtPriceX96: bigint,
  pairIsCurrency0: boolean,
  pairTokenDecimals: number,
): number | null {
  if (sqrtPriceX96 <= 0n) return null;
  const sqrtPrice = Number(sqrtPriceX96) / 2 ** 96;
  const rawPrice = sqrtPrice * sqrtPrice;
  const rawRatio = pairIsCurrency0
    ? rawPrice > 0
      ? 1 / rawPrice
      : null
    : rawPrice;
  if (rawRatio === null) return null;
  const price = rawRatio * 10 ** (18 - pairTokenDecimals);
  return Number.isFinite(price) && price > 0 ? price : null;
}

/** Human pair-token price at a Uniswap V4 tick, in either currency ordering. */
export function uniswapV4PriceAtTick(
  tick: number,
  pairIsCurrency0: boolean,
  pairTokenDecimals: number,
): number | null {
  if (!Number.isInteger(tick)) return null;
  return uniswapV4PriceFromSqrtPriceX96(
    uniswapV4SqrtPriceX96AtTick(tick),
    pairIsCurrency0,
    pairTokenDecimals,
  );
}

/** Inverse of {@link uniswapV4PriceAtTick}; returns a fractional raw tick. */
export function uniswapV4TickAtPrice(
  price: number,
  pairIsCurrency0: boolean,
  pairTokenDecimals: number,
): number | null {
  if (
    !(price > 0) ||
    !Number.isFinite(price) ||
    !Number.isSafeInteger(pairTokenDecimals)
  ) {
    return null;
  }
  const decimalFactor = 10 ** (18 - pairTokenDecimals);
  const rawRatio = pairIsCurrency0
    ? decimalFactor / price
    : price / decimalFactor;
  const tick = Math.log(rawRatio) / Math.log(1.0001);
  return Number.isFinite(tick) ? tick : null;
}

/** Map two ticks to an order-independent human-price range. */
export function uniswapV4PriceRangeFromTicks(
  tickA: number,
  tickB: number,
  pairIsCurrency0: boolean,
  pairTokenDecimals: number,
): { min: number; max: number } | null {
  const priceA = uniswapV4PriceAtTick(
    tickA,
    pairIsCurrency0,
    pairTokenDecimals,
  );
  const priceB = uniswapV4PriceAtTick(
    tickB,
    pairIsCurrency0,
    pairTokenDecimals,
  );
  return priceA === null || priceB === null
    ? null
    : { min: Math.min(priceA, priceB), max: Math.max(priceA, priceB) };
}

/** Map two human prices to an order-independent raw-tick range. */
export function uniswapV4TickRangeFromPrices(
  priceA: number,
  priceB: number,
  pairIsCurrency0: boolean,
  pairTokenDecimals: number,
): { lower: number; upper: number } | null {
  const tickA = uniswapV4TickAtPrice(
    priceA,
    pairIsCurrency0,
    pairTokenDecimals,
  );
  const tickB = uniswapV4TickAtPrice(
    priceB,
    pairIsCurrency0,
    pairTokenDecimals,
  );
  return tickA === null || tickB === null
    ? null
    : { lower: Math.min(tickA, tickB), upper: Math.max(tickA, tickB) };
}

/** Exact integer port of Uniswap V4 TickMath.getSqrtPriceAtTick. */
export function uniswapV4SqrtPriceX96AtTick(tick: number): bigint {
  tick = Math.trunc(tick);
  const absoluteTick = tick < 0 ? -tick : tick;
  if (absoluteTick > UNISWAP_V4_MAX_TICK) {
    throw new Error("Uniswap V4 tick is outside the supported range.");
  }

  let price =
    absoluteTick & 0x1 ? 0xfffcb933bd6fad37aa2d162d1a594001n : 1n << 128n;
  if (absoluteTick & 0x2)
    price = (price * 0xfff97272373d413259a46990580e213an) >> 128n;
  if (absoluteTick & 0x4)
    price = (price * 0xfff2e50f5f656932ef12357cf3c7fdccn) >> 128n;
  if (absoluteTick & 0x8)
    price = (price * 0xffe5caca7e10e4e61c3624eaa0941cd0n) >> 128n;
  if (absoluteTick & 0x10)
    price = (price * 0xffcb9843d60f6159c9db58835c926644n) >> 128n;
  if (absoluteTick & 0x20)
    price = (price * 0xff973b41fa98c081472e6896dfb254c0n) >> 128n;
  if (absoluteTick & 0x40)
    price = (price * 0xff2ea16466c96a3843ec78b326b52861n) >> 128n;
  if (absoluteTick & 0x80)
    price = (price * 0xfe5dee046a99a2a811c461f1969c3053n) >> 128n;
  if (absoluteTick & 0x100)
    price = (price * 0xfcbe86c7900a88aedcffc83b479aa3a4n) >> 128n;
  if (absoluteTick & 0x200)
    price = (price * 0xf987a7253ac413176f2b074cf7815e54n) >> 128n;
  if (absoluteTick & 0x400)
    price = (price * 0xf3392b0822b70005940c7a398e4b70f3n) >> 128n;
  if (absoluteTick & 0x800)
    price = (price * 0xe7159475a2c29b7443b29c7fa6e889d9n) >> 128n;
  if (absoluteTick & 0x1000)
    price = (price * 0xd097f3bdfd2022b8845ad8f792aa5825n) >> 128n;
  if (absoluteTick & 0x2000)
    price = (price * 0xa9f746462d870fdf8a65dc1f90e061e5n) >> 128n;
  if (absoluteTick & 0x4000)
    price = (price * 0x70d869a156d2a1b890bb3df62baf32f7n) >> 128n;
  if (absoluteTick & 0x8000)
    price = (price * 0x31be135f97d08fd981231505542fcfa6n) >> 128n;
  if (absoluteTick & 0x10000)
    price = (price * 0x9aa508b5b7a84e1c677de54f3e99bc9n) >> 128n;
  if (absoluteTick & 0x20000)
    price = (price * 0x5d6af8dedb81196699c329225ee604n) >> 128n;
  if (absoluteTick & 0x40000)
    price = (price * 0x2216e584f5fa1ea926041bedfe98n) >> 128n;
  if (absoluteTick & 0x80000)
    price = (price * 0x48a170391f7dc42444e8fa2n) >> 128n;
  if (tick > 0) price = ((1n << 256n) - 1n) / price;
  return (price + 0xffffffffn) >> 32n;
}

function sortSqrtPrices(a: bigint, b: bigint): [bigint, bigint] {
  return a > b ? [b, a] : [a, b];
}

function requireSqrtRange(a: bigint, b: bigint): void {
  if (a <= 0n || b <= 0n || a === b) {
    throw new Error(
      "A Uniswap V4 sqrt-price range must be positive and non-zero.",
    );
  }
}

function amount0ForLiquidity(
  sqrtA: bigint,
  sqrtB: bigint,
  liquidity: bigint,
): bigint {
  const [lower, upper] = sortSqrtPrices(sqrtA, sqrtB);
  return ((liquidity << 96n) * (upper - lower)) / upper / lower;
}

function amount1ForLiquidity(
  sqrtA: bigint,
  sqrtB: bigint,
  liquidity: bigint,
): bigint {
  const [lower, upper] = sortSqrtPrices(sqrtA, sqrtB);
  return (liquidity * (upper - lower)) / UNISWAP_V4_Q96;
}

/** Currency amounts represented by liquidity at a current sqrt price. */
export function uniswapV4AmountsForLiquidity(
  currentSqrtPrice: bigint,
  sqrtPriceA: bigint,
  sqrtPriceB: bigint,
  liquidity: bigint,
): { amount0: bigint; amount1: bigint } {
  requireSqrtRange(sqrtPriceA, sqrtPriceB);
  if (currentSqrtPrice <= 0n || liquidity < 0n) {
    throw new Error(
      "Uniswap V4 prices must be positive and liquidity cannot be negative.",
    );
  }
  const [lower, upper] = sortSqrtPrices(sqrtPriceA, sqrtPriceB);
  if (currentSqrtPrice <= lower) {
    return {
      amount0: amount0ForLiquidity(lower, upper, liquidity),
      amount1: 0n,
    };
  }
  if (currentSqrtPrice < upper) {
    return {
      amount0: amount0ForLiquidity(currentSqrtPrice, upper, liquidity),
      amount1: amount1ForLiquidity(lower, currentSqrtPrice, liquidity),
    };
  }
  return {
    amount0: 0n,
    amount1: amount1ForLiquidity(lower, upper, liquidity),
  };
}

function liquidityForAmount0(
  sqrtA: bigint,
  sqrtB: bigint,
  amount0: bigint,
): bigint {
  const [lower, upper] = sortSqrtPrices(sqrtA, sqrtB);
  return (amount0 * ((lower * upper) / UNISWAP_V4_Q96)) / (upper - lower);
}

function liquidityForAmount1(
  sqrtA: bigint,
  sqrtB: bigint,
  amount1: bigint,
): bigint {
  const [lower, upper] = sortSqrtPrices(sqrtA, sqrtB);
  return (amount1 * UNISWAP_V4_Q96) / (upper - lower);
}

/** Maximum liquidity supported by two token amounts over a range. */
export function uniswapV4LiquidityForAmounts(
  currentSqrtPrice: bigint,
  sqrtPriceA: bigint,
  sqrtPriceB: bigint,
  amount0: bigint,
  amount1: bigint,
): bigint {
  requireSqrtRange(sqrtPriceA, sqrtPriceB);
  if (currentSqrtPrice <= 0n || amount0 < 0n || amount1 < 0n) {
    throw new Error(
      "Uniswap V4 prices must be positive and amounts cannot be negative.",
    );
  }
  const [lower, upper] = sortSqrtPrices(sqrtPriceA, sqrtPriceB);
  if (currentSqrtPrice <= lower) {
    return liquidityForAmount0(lower, upper, amount0);
  }
  if (currentSqrtPrice < upper) {
    const liquidity0 = liquidityForAmount0(currentSqrtPrice, upper, amount0);
    const liquidity1 = liquidityForAmount1(lower, currentSqrtPrice, amount1);
    return liquidity0 < liquidity1 ? liquidity0 : liquidity1;
  }
  return liquidityForAmount1(lower, upper, amount1);
}

function requireTickSpacing(spacing: number): void {
  if (!Number.isInteger(spacing) || spacing <= 0) {
    throw new Error("Uniswap V4 tick spacing must be a positive integer.");
  }
}

function requireIntegerTick(tick: number): void {
  if (!Number.isInteger(tick)) {
    throw new Error("A Uniswap V4 tick must be an integer.");
  }
}

/** Align a tick down to its nearest usable tick. */
export function uniswapV4AlignTickDown(tick: number, spacing: number): number {
  requireTickSpacing(spacing);
  requireIntegerTick(tick);
  let remainder = tick % spacing;
  if (remainder !== 0 && tick < 0) remainder += spacing;
  return tick - remainder;
}

/** Align a tick up to its nearest usable tick. */
export function uniswapV4AlignTickUp(tick: number, spacing: number): number {
  requireTickSpacing(spacing);
  requireIntegerTick(tick);
  return uniswapV4AlignTickDown(tick + spacing - 1, spacing);
}

function signExtend24(value: bigint): number {
  return Number(value & 0x800000n ? value - 0x1000000n : value);
}

/** Decode PositionManager's packed lower and upper ticks. */
export function uniswapV4PositionTicks(positionInfo: bigint): {
  lower: number;
  upper: number;
} {
  return {
    lower: signExtend24((positionInfo >> 8n) & 0xffffffn),
    upper: signExtend24((positionInfo >> 32n) & 0xffffffn),
  };
}

/**
 * Human-price counterpart amount for a concentrated-liquidity deposit.
 * This float helper is for form auto-fill; transaction amounts should use the
 * exact bigint liquidity helpers above.
 */
export function uniswapV4CounterpartAmount(
  amount: number,
  inputIsPairToken: boolean,
  currentPrice: number,
  minPrice: number,
  maxPrice: number,
): number | null {
  if (
    !(amount > 0) ||
    !(currentPrice > 0) ||
    !(minPrice > 0) ||
    !(maxPrice > minPrice)
  ) {
    return null;
  }
  const currentSqrt = Math.sqrt(currentPrice);
  const minSqrt = Math.sqrt(minPrice);
  const maxSqrt = Math.sqrt(maxPrice);
  if (currentPrice <= minPrice) return inputIsPairToken ? null : 0;
  if (currentPrice >= maxPrice) return inputIsPairToken ? 0 : null;
  if (inputIsPairToken) {
    const liquidity = amount / (currentSqrt - minSqrt);
    return liquidity * (1 / currentSqrt - 1 / maxSqrt);
  }
  const liquidity = amount / (1 / currentSqrt - 1 / maxSqrt);
  return liquidity * (currentSqrt - minSqrt);
}

/** Choose the economic floor/ceiling range when it brackets spot. */
export function uniswapV4DefaultPriceRange(
  poolPrice: number,
  cashOutFloor: number,
  issuanceCeiling: number,
): { min: number; max: number; economic: boolean } {
  const spot = Number.isFinite(poolPrice) && poolPrice > 0 ? poolPrice : 0;
  const floor =
    Number.isFinite(cashOutFloor) && cashOutFloor > 0 ? cashOutFloor : 0;
  const ceiling =
    Number.isFinite(issuanceCeiling) && issuanceCeiling > 0
      ? issuanceCeiling
      : 0;
  const economic =
    spot > 0 && floor > 0 && ceiling > floor && floor < spot && spot < ceiling;
  let min = economic ? floor : spot > 0 ? spot / 2 : ceiling / 10;
  let max = economic ? ceiling : spot > 0 ? spot * 2 : ceiling;
  if (spot > 0 && (!(min > 0) || min >= spot)) min = spot / 2;
  if (spot > 0 && !(max > spot)) max = spot * 2;
  if (!(min > 0) && max > 0) min = max / 10;
  if (!(max > min)) max = min > 0 ? min * 10 : 0;
  return { min, max, economic };
}

export const UNISWAP_V4_INITIALIZE_TOPIC = toEventSelector(
  "Initialize(bytes32,address,address,uint24,int24,address,uint160,int24)",
).toLowerCase() as Hex;

export const UNISWAP_V4_MODIFY_LIQUIDITY_TOPIC = toEventSelector(
  "ModifyLiquidity(bytes32,address,int24,int24,int256,bytes32)",
).toLowerCase() as Hex;

/** Extract the PositionManager token id (the position salt) from a pool log. */
export function uniswapV4PositionTokenIdFromLog(
  log: { topics?: readonly (string | null)[]; data?: string },
  positionManager: Address,
): bigint | null {
  if (
    String(log.topics?.[0] ?? "").toLowerCase() !==
    UNISWAP_V4_MODIFY_LIQUIDITY_TOPIC
  ) {
    return null;
  }
  const sender = String(log.topics?.[2] ?? "")
    .slice(-40)
    .toLowerCase();
  if (sender !== positionManager.slice(2).toLowerCase()) return null;
  const data = String(log.data ?? "");
  if (!/^0x[0-9a-fA-F]{256}$/.test(data)) {
    throw new Error("Malformed Uniswap V4 ModifyLiquidity log.");
  }
  const tokenId = BigInt(`0x${data.slice(194, 258)}`);
  return tokenId > 0n ? tokenId : null;
}

/** Whether an address is one of the canonical PoolManager deployments. */
export function isUniswapV4PoolManager(address: string): boolean {
  const normalized = address.toLowerCase();
  return Object.values(UNISWAP_V4_POOL_MANAGER_ADDRESSES).some(
    (candidate) => candidate.toLowerCase() === normalized,
  );
}
