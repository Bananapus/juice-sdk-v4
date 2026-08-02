import {
  decodeFunctionResult,
  encodeAbiParameters,
  encodeFunctionData,
  encodePacked,
  zeroAddress,
} from "viem";
import type { Address, Hex, PublicClient } from "viem";
import { NATIVE_TOKEN } from "../constants.js";
import type { JBChainId } from "../types.js";
import {
  chooseBestPayRoute,
  type PayPreview,
  type PaySettlement,
} from "./pay.js";
import type { Permit2SignatureAuthorization } from "./permit2.js";
import {
  buildUniswapV4ExactInputSwapTx,
  quoteUniswapV4ExactInputSingle,
  uniswapV4Deployment,
  type UniswapV4PoolKey,
} from "./uniswapV4.js";

export interface NativeSwapConfig {
  wrappedNative: Address;
  bridgeToken: Address;
  v3Quoter: Address;
}

/** Canonical WETH/USDC V3 bridge used by direct-pay swaps on all v6 mainnets. */
export const NATIVE_SWAP_BY_CHAIN: Readonly<
  Partial<Record<JBChainId, NativeSwapConfig>>
> = {
  1: {
    wrappedNative: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    bridgeToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    v3Quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
  },
  10: {
    wrappedNative: "0x4200000000000000000000000000000000000006",
    bridgeToken: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
    v3Quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
  },
  8453: {
    wrappedNative: "0x4200000000000000000000000000000000000006",
    bridgeToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    v3Quoter: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
  },
  42161: {
    wrappedNative: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    bridgeToken: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    v3Quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
  },
};

const V3_FEES = [100, 500, 3_000, 10_000] as const;
const ADDRESS_THIS = "0x0000000000000000000000000000000000000002" as Address;
const CONTRACT_BALANCE = 1n << 255n;
const UINT128_MAX = (1n << 128n) - 1n;

const v3QuoterAbi = [
  {
    type: "function",
    name: "quoteExactInputSingle",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "tokenIn", type: "address" },
          { name: "tokenOut", type: "address" },
          { name: "amountIn", type: "uint256" },
          { name: "fee", type: "uint24" },
          { name: "sqrtPriceLimitX96", type: "uint160" },
        ],
      },
    ],
    outputs: [
      { name: "amountOut", type: "uint256" },
      { name: "sqrtPriceX96After", type: "uint160" },
      { name: "initializedTicksCrossed", type: "uint32" },
      { name: "gasEstimate", type: "uint256" },
    ],
  },
] as const;

const universalRouterAbi = [
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

export type DirectPayInputRoute =
  | { kind: "single-v4" }
  | {
      kind: "native-v3-v4";
      wrappedNative: Address;
      bridgeToken: Address;
      bridgeTokenSymbol: "USDC";
      bridgeTokenDecimals: 6;
      v3Fee: number;
      quotedBridgeAmount: bigint;
    }
  | {
      kind: "erc20-v3-native-v4";
      inputToken: Address;
      wrappedNative: Address;
      bridgeTokenSymbol: "ETH";
      bridgeTokenDecimals: 18;
      v3Fee: number;
      quotedBridgeAmount: bigint;
    };

export interface DirectPaySwapQuote {
  kind: "direct-swap";
  poolKey: UniswapV4PoolKey;
  zeroForOne: boolean;
  quotedTokenCount: bigint;
  /** Protected minimum and the beneficiary's direct-swap token count. */
  minimumTokenCount: bigint;
  beneficiaryTokenCount: bigint;
  reservedTokenCount: 0n;
  inputRoute: DirectPayInputRoute;
}

function isNative(token: Address): boolean {
  return token.toLowerCase() === NATIVE_TOKEN.toLowerCase();
}

async function quoteV3ExactInput({
  client,
  config,
  tokenIn,
  tokenOut,
  amountIn,
}: {
  client: PublicClient;
  config: NativeSwapConfig;
  tokenIn: Address;
  tokenOut: Address;
  amountIn: bigint;
}): Promise<{ fee: number; amountOut: bigint } | null> {
  const quotes = await Promise.all(
    V3_FEES.map(async (fee) => {
      try {
        const call = await client.call({
          to: config.v3Quoter,
          data: encodeFunctionData({
            abi: v3QuoterAbi,
            functionName: "quoteExactInputSingle",
            args: [
              {
                tokenIn,
                tokenOut,
                amountIn,
                fee,
                sqrtPriceLimitX96: 0n,
              },
            ],
          }),
        });
        if (!call.data) return null;
        const [amountOut] = decodeFunctionResult({
          abi: v3QuoterAbi,
          functionName: "quoteExactInputSingle",
          data: call.data,
        });
        return amountOut > 0n ? { fee, amountOut } : null;
      } catch {
        return null;
      }
    }),
  );
  return quotes.reduce<{ fee: number; amountOut: bigint } | null>(
    (best, quote) =>
      !quote || (best && best.amountOut >= quote.amountOut) ? best : quote,
    null,
  );
}

/**
 * Quote the best direct pool purchase, including the atomic ETH/USDC V3 bridge
 * when the user's payment currency differs from the hooked V4 pool currency.
 * Returns null unless its slippage-protected minimum beats terminal payment.
 */
export async function quoteDirectPaySwap({
  client,
  chainId,
  poolKey,
  pairIsCurrency0,
  paymentToken,
  amount,
  payPreview,
  paySettlement = "issuance",
  slippageBps = 100n,
}: {
  client: PublicClient;
  chainId: JBChainId;
  poolKey: UniswapV4PoolKey;
  pairIsCurrency0: boolean;
  paymentToken: Address;
  amount: bigint;
  payPreview: PayPreview;
  paySettlement?: PaySettlement;
  slippageBps?: bigint;
}): Promise<DirectPaySwapQuote | null> {
  if (!uniswapV4Deployment(chainId)?.universalRouter || amount <= 0n) {
    return null;
  }
  const currencyIn = pairIsCurrency0 ? poolKey.currency0 : poolKey.currency1;
  const normalizedPayment = isNative(paymentToken)
    ? zeroAddress
    : paymentToken.toLowerCase();
  let v4AmountIn = amount;
  let inputRoute: DirectPayInputRoute = { kind: "single-v4" };

  if (currencyIn.toLowerCase() !== normalizedPayment) {
    const config = NATIVE_SWAP_BY_CHAIN[chainId];
    const canBridgeNative =
      !!config &&
      isNative(paymentToken) &&
      currencyIn.toLowerCase() === config.bridgeToken.toLowerCase();
    const canBridgeUsdcToNative =
      !!config &&
      paymentToken.toLowerCase() === config.bridgeToken.toLowerCase() &&
      currencyIn.toLowerCase() === zeroAddress;
    if (!config || (!canBridgeNative && !canBridgeUsdcToNative)) return null;
    const bridgeQuote = await quoteV3ExactInput({
      client,
      config,
      tokenIn: canBridgeNative ? config.wrappedNative : config.bridgeToken,
      tokenOut: canBridgeNative ? config.bridgeToken : config.wrappedNative,
      amountIn: amount,
    });
    if (!bridgeQuote) return null;
    v4AmountIn = bridgeQuote.amountOut;
    inputRoute = canBridgeNative
      ? {
          kind: "native-v3-v4",
          wrappedNative: config.wrappedNative,
          bridgeToken: config.bridgeToken,
          bridgeTokenSymbol: "USDC",
          bridgeTokenDecimals: 6,
          v3Fee: bridgeQuote.fee,
          quotedBridgeAmount: bridgeQuote.amountOut,
        }
      : {
          kind: "erc20-v3-native-v4",
          inputToken: config.bridgeToken,
          wrappedNative: config.wrappedNative,
          bridgeTokenSymbol: "ETH",
          bridgeTokenDecimals: 18,
          v3Fee: bridgeQuote.fee,
          quotedBridgeAmount: bridgeQuote.amountOut,
        };
  }

  const quotedTokenCount = await quoteUniswapV4ExactInputSingle(client, {
    chainId,
    poolKey,
    zeroForOne: pairIsCurrency0,
    amountIn: v4AmountIn,
  });
  const best = chooseBestPayRoute({
    pay: payPreview,
    paySettlement,
    directSwapQuote: quotedTokenCount,
    slippageBps,
  });
  if (best.kind !== "direct-swap") return null;
  return {
    kind: "direct-swap",
    poolKey,
    zeroForOne: pairIsCurrency0,
    quotedTokenCount,
    minimumTokenCount: best.beneficiaryTokenCount,
    beneficiaryTokenCount: best.beneficiaryTokenCount,
    reservedTokenCount: 0n,
    inputRoute,
  };
}

function encodeV4SwapFromRouterBalance({
  quote,
  recipient,
  currencyIn,
}: {
  quote: DirectPaySwapQuote;
  recipient: Address;
  currencyIn: Address;
}): Hex {
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
          quote.poolKey.currency0,
          quote.poolKey.currency1,
          quote.poolKey.fee,
          quote.poolKey.tickSpacing,
          quote.poolKey.hooks,
        ],
        quote.zeroForOne,
        0n,
        quote.minimumTokenCount,
        "0x",
      ],
    ],
  );
  const settle = encodeAbiParameters(
    [{ type: "address" }, { type: "uint256" }, { type: "bool" }],
    [currencyIn, CONTRACT_BALANCE, false],
  );
  const currencyOut = quote.zeroForOne
    ? quote.poolKey.currency1
    : quote.poolKey.currency0;
  const take = encodeAbiParameters(
    [{ type: "address" }, { type: "address" }, { type: "uint256" }],
    [currencyOut, recipient, 0n],
  );
  return encodeAbiParameters(
    [{ type: "bytes" }, { type: "bytes[]" }],
    ["0x0b060e", [settle, swap, take]],
  );
}

/** Build the atomic Universal Router transaction for a direct-pay quote. */
export function buildDirectPaySwapTx({
  chainId,
  quote,
  amount,
  recipient,
  deadline,
}: {
  chainId: JBChainId;
  quote: DirectPaySwapQuote;
  amount: bigint;
  recipient: Address;
  deadline: bigint;
}) {
  if (quote.inputRoute.kind === "single-v4") {
    return buildUniswapV4ExactInputSwapTx({
      chainId,
      poolKey: quote.poolKey,
      zeroForOne: quote.zeroForOne,
      amountIn: amount,
      minimumAmountOut: quote.minimumTokenCount,
      recipient,
      deadline,
    });
  }
  if (amount <= 0n || amount > UINT128_MAX || quote.minimumTokenCount <= 0n) {
    throw new Error("Swap amounts are outside the supported range.");
  }
  const config = NATIVE_SWAP_BY_CHAIN[chainId];
  const router = uniswapV4Deployment(chainId)?.universalRouter;
  if (!config || !router) {
    throw new Error("No supported native bridge route on this chain.");
  }

  if (quote.inputRoute.kind === "erc20-v3-native-v4") {
    if (
      quote.inputRoute.inputToken.toLowerCase() !==
        config.bridgeToken.toLowerCase() ||
      quote.inputRoute.wrappedNative.toLowerCase() !==
        config.wrappedNative.toLowerCase()
    ) {
      throw new Error(
        "This ERC-20 bridge route is not supported on this chain.",
      );
    }
    const v3Input = encodeAbiParameters(
      [
        { type: "address" },
        { type: "uint256" },
        { type: "uint256" },
        { type: "bytes" },
        { type: "bool" },
      ],
      [
        ADDRESS_THIS,
        amount,
        0n,
        encodePacked(
          ["address", "uint24", "address"],
          [
            quote.inputRoute.inputToken,
            quote.inputRoute.v3Fee,
            quote.inputRoute.wrappedNative,
          ],
        ),
        true,
      ],
    );
    const unwrapInput = encodeAbiParameters(
      [{ type: "address" }, { type: "uint256" }],
      [ADDRESS_THIS, 0n],
    );
    const v4Input = encodeV4SwapFromRouterBalance({
      quote,
      recipient,
      currencyIn: zeroAddress,
    });
    return {
      chainId,
      address: router,
      abi: universalRouterAbi,
      functionName: "execute" as const,
      args: [
        "0x000c10" as Hex,
        [v3Input, unwrapInput, v4Input],
        deadline,
      ] as const,
      value: 0n,
    };
  }

  if (
    quote.inputRoute.bridgeToken.toLowerCase() !==
      config.bridgeToken.toLowerCase() ||
    quote.inputRoute.wrappedNative.toLowerCase() !==
      config.wrappedNative.toLowerCase()
  ) {
    throw new Error("This native bridge route is not supported on this chain.");
  }
  const wrapInput = encodeAbiParameters(
    [{ type: "address" }, { type: "uint256" }],
    [ADDRESS_THIS, amount],
  );
  const v3Input = encodeAbiParameters(
    [
      { type: "address" },
      { type: "uint256" },
      { type: "uint256" },
      { type: "bytes" },
      { type: "bool" },
    ],
    [
      ADDRESS_THIS,
      amount,
      0n,
      encodePacked(
        ["address", "uint24", "address"],
        [
          quote.inputRoute.wrappedNative,
          quote.inputRoute.v3Fee,
          quote.inputRoute.bridgeToken,
        ],
      ),
      false,
    ],
  );
  const v4Input = encodeV4SwapFromRouterBalance({
    quote,
    recipient,
    currencyIn: quote.inputRoute.bridgeToken,
  });
  return {
    chainId,
    address: router,
    abi: universalRouterAbi,
    functionName: "execute" as const,
    args: ["0x0b0010" as Hex, [wrapInput, v3Input, v4Input], deadline] as const,
    value: amount,
  };
}

/** Prepend Universal Router's PERMIT2_PERMIT command to a reviewed swap. */
export function addPermit2SignatureToDirectPaySwap(
  request: ReturnType<typeof buildDirectPaySwapTx>,
  authorization: Permit2SignatureAuthorization,
  signature: Hex,
): ReturnType<typeof buildDirectPaySwapTx> {
  if (request.address.toLowerCase() !== authorization.spender.toLowerCase()) {
    throw new Error(
      "The reviewed Permit2 authorization does not match the swap.",
    );
  }
  const [commands, inputs, deadline] = request.args;
  const commandShape = commands.toLowerCase();
  const supportedShape =
    (commandShape === "0x10" && inputs.length === 1) ||
    (commandShape === "0x000c10" && inputs.length === 3);
  if (!supportedShape) {
    throw new Error(
      "The reviewed swap has an unsupported Universal Router shape.",
    );
  }
  const permitInput = encodeAbiParameters(
    [
      {
        type: "tuple",
        components: [
          {
            type: "tuple",
            components: [
              { type: "address" },
              { type: "uint160" },
              { type: "uint48" },
              { type: "uint48" },
            ],
          },
          { type: "address" },
          { type: "uint256" },
        ],
      },
      { type: "bytes" },
    ],
    [
      [
        [
          authorization.token,
          authorization.amount,
          authorization.expiration,
          authorization.nonce,
        ],
        authorization.spender,
        authorization.sigDeadline,
      ],
      signature,
    ],
  );
  return {
    ...request,
    args: [
      `0x0a${commands.slice(2)}` as Hex,
      [permitInput, ...inputs],
      deadline,
    ],
  } as ReturnType<typeof buildDirectPaySwapTx>;
}
