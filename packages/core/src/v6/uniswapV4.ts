import { encodeAbiParameters, keccak256, toEventSelector } from "viem";
import type { Address, Hex } from "viem";
import type { JBChainId } from "../types.js";

/**
 * Canonical Uniswap V4 PoolManager deployments used by Juicebox v6.
 * Optimism Sepolia is intentionally absent: deploy-all skips the Uniswap stack
 * there because Uniswap has not published supported V4 periphery deployments.
 */
export const UNISWAP_V4_POOL_MANAGER_ADDRESSES: Readonly<
  Partial<Record<JBChainId, Address>>
> = {
  1: "0x000000000004444c5dc75cb358380d2e3de08a90",
  10: "0x9a13f98cb987694c9f086b1f5eb990eea8264ec3",
  8453: "0x498581ff718922c3f8e6a244956af099b2652b2b",
  42161: "0x360e68faccca8ca495c1b759fd9eee466db9fb32",
  84532: "0x05e73354cfdd6745c338b50bcfdfa3aa6fa03408",
  421614: "0xfb3e0c6f74eb1a21cc1da29aec80d2dfe6c9a317",
  11155111: "0xe03a1074c86cfedd5c142c4f04f1a1536e203543",
};

/** Canonical Uniswap V4 PositionManager deployments used by Juicebox v6. */
export const UNISWAP_V4_POSITION_MANAGER_ADDRESSES: Readonly<
  Partial<Record<JBChainId, Address>>
> = {
  1: "0xbd216513d74c8cf14cf4747e6aaa6420ff64ee9e",
  10: "0x3c3ea4b57a46241e54610e5f022e5c45859a1017",
  8453: "0x7c5f5a4bbd8fd63184577525326123b519429bdc",
  42161: "0xd88f38f930b7952f2db2432cb002e7abbf3dd869",
  84532: "0x4b2c77d209d3405f41a037ec6c77f7f5b8e2ca80",
  421614: "0xac631556d3d4019c95769033b5e719dd77124bac",
  11155111: "0x429ba70129df741b2ca2a85bc3a2a3328e5c09b4",
};

/** Canonical V4Quoter deployments; missing chains must fail closed. */
export const UNISWAP_V4_QUOTER_ADDRESSES: Readonly<
  Partial<Record<JBChainId, Address>>
> = {
  1: "0x52f0e24d1c21c8a0cb1e5a5dd6198556bd9e1203",
  10: "0x1f3131a13296fb91c90870043742c3cdbff1a8d7",
  8453: "0x0d5e0f971ed27fbff6c2837bf31316121532048d",
  42161: "0x3972c00f7ed4885e145823eb7c655375d275a1c5",
  84532: "0x4a6513c898fe1b2d0e78d3b0e0a4a151589b1cba",
  421614: "0x7de51022d70a725b508085468052e25e22b5c4c9",
  11155111: "0x61b3f2011a92d183c7dbadbda940a7555ccf9227",
};

/** Permit2 is deployed at the same address on supported EVM chains. */
export const UNISWAP_PERMIT2_ADDRESS: Address =
  "0x000000000022D473030F116dDEE9F6B43aC78BA3";

/** Resolve the supported V4 surface for a chain without guessing addresses. */
export function uniswapV4Deployment(chainId: number): {
  poolManager: Address;
  positionManager: Address | null;
  quoter: Address | null;
  permit2: Address;
} | null {
  const poolManager = (
    UNISWAP_V4_POOL_MANAGER_ADDRESSES as Readonly<
      Partial<Record<number, Address>>
    >
  )[chainId];
  if (!poolManager) return null;
  return {
    poolManager,
    positionManager:
      (
        UNISWAP_V4_POSITION_MANAGER_ADDRESSES as Readonly<
          Partial<Record<number, Address>>
        >
      )[chainId] ?? null,
    quoter:
      (
        UNISWAP_V4_QUOTER_ADDRESSES as Readonly<
          Partial<Record<number, Address>>
        >
      )[chainId] ?? null,
    permit2: UNISWAP_PERMIT2_ADDRESS,
  };
}

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
