import { PublicClient, decodeFunctionData, encodeAbiParameters } from "viem";
import { describe, expect, test } from "vitest";
import {
  UNISWAP_V3_QUOTER_V2_ADDRESSES,
  quoteUniswapV3ExactInputSingle,
} from "./uniswapV3.js";

const tokenIn = "0x4200000000000000000000000000000000000006" as const;
const tokenOut = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;
const quoterAbi = [
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
    outputs: [],
  },
] as const;

describe("quoteUniswapV3ExactInputSingle", () => {
  const args = {
    chainId: 8453,
    tokenIn,
    tokenOut,
    fee: 500,
    amountIn: 10n ** 18n,
  } as const;

  test("quotes through the chain's QuoterV2 with no price limit", async () => {
    const sent: { to: string; data: `0x${string}` }[] = [];
    const client = {
      async call(request: { to: string; data: `0x${string}` }) {
        sent.push(request);
        return {
          data: encodeAbiParameters(
            [
              { type: "uint256" },
              { type: "uint160" },
              { type: "uint32" },
              { type: "uint256" },
            ],
            [3_900_000_000n, 1n, 2, 3n],
          ),
        };
      },
    } as unknown as PublicClient;
    expect(await quoteUniswapV3ExactInputSingle(client, args)).toBe(
      3_900_000_000n,
    );
    expect(sent[0].to).toBe(UNISWAP_V3_QUOTER_V2_ADDRESSES[8453]);
    expect(
      decodeFunctionData({ abi: quoterAbi, data: sent[0].data }).args[0],
    ).toEqual({
      tokenIn,
      tokenOut,
      amountIn: 10n ** 18n,
      fee: 500,
      sqrtPriceLimitX96: 0n,
    });
  });

  test("fails closed with no quoter or no data", async () => {
    const empty = { call: async () => ({}) } as unknown as PublicClient;
    await expect(quoteUniswapV3ExactInputSingle(empty, args)).rejects.toThrow(
      /no data/,
    );
    await expect(
      quoteUniswapV3ExactInputSingle(empty, { ...args, chainId: 999 as 8453 }),
    ).rejects.toThrow(/No supported Uniswap V3 quoter/);
  });
});
