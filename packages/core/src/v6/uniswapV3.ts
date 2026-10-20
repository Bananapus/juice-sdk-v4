import {
  Address,
  PublicClient,
  decodeFunctionResult,
  encodeFunctionData,
} from "viem";
import { JBChainId } from "../types.js";

/**
 * Canonical Uniswap V3 QuoterV2 deployments. Each one's `factory()` and
 * `WETH9()` match the factory and wrapped native token the v6 router terminal
 * swaps through on that chain. Missing chains must fail closed.
 */
export const UNISWAP_V3_QUOTER_V2_ADDRESSES: Readonly<
  Partial<Record<JBChainId, Address>>
> = {
  1: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
  10: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
  8453: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
  42161: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
  84532: "0xC5290058841028F1614F3A6F0F5816cAd0df5E27",
  421614: "0x2779a0CC1c3e0E44D2542EC3e79e3864Ae93Ef0B",
  11155111: "0xEd1f6473345F45b75F8179591dd5bA1888cf2FB3",
};

const V3_QUOTER_ABI = [
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

/**
 * Quote an exact-input swap through one Uniswap V3 pool, fee and price impact
 * included. Tokens are ERC-20s: pass the wrapped native token, not the native
 * sentinel.
 */
export async function quoteUniswapV3ExactInputSingle(
  client: PublicClient,
  {
    chainId,
    tokenIn,
    tokenOut,
    fee,
    amountIn,
  }: {
    chainId: JBChainId;
    tokenIn: Address;
    tokenOut: Address;
    fee: number;
    amountIn: bigint;
  },
): Promise<bigint> {
  const quoter = UNISWAP_V3_QUOTER_V2_ADDRESSES[chainId];
  if (!quoter)
    throw new Error(`No supported Uniswap V3 quoter on chain ${chainId}.`);
  const call = await client.call({
    to: quoter,
    data: encodeFunctionData({
      abi: V3_QUOTER_ABI,
      functionName: "quoteExactInputSingle",
      args: [{ tokenIn, tokenOut, amountIn, fee, sqrtPriceLimitX96: 0n }],
    }),
  });
  if (!call.data) throw new Error("Uniswap V3 quoter returned no data.");
  const [amountOut] = decodeFunctionResult({
    abi: V3_QUOTER_ABI,
    functionName: "quoteExactInputSingle",
    data: call.data,
  });
  return amountOut;
}
