import {
  PublicClient,
  decodeAbiParameters,
  encodeAbiParameters,
  encodeFunctionData,
  sliceHex,
} from "viem";
import { describe, expect, test } from "vitest";
import type { Hex } from "viem";
import { NATIVE_TOKEN } from "../constants.js";
import { uniswapV4PoolId } from "./uniswapV4.js";
import { jbMultiTerminalAbi } from "../generated/juicebox.js";
import {
  build721PayMetadata,
  buildBuybackPayMetadata,
  buildPayTx,
  buildUserPayMetadata,
  effectivePayPreview,
  prepareUserPay,
  previewPay,
} from "./pay.js";

const chainId = 11155111;
const terminal = "0x1111111111111111111111111111111111111111" as const;
const projectId = 3n;
const beneficiary = "0x2222222222222222222222222222222222222222" as const;
const usdc = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as const;

describe("pay", () => {
  test("buildPayTx sets value for native token payments", () => {
    const tx = buildPayTx({
      chainId,
      terminal,
      projectId,
      token: NATIVE_TOKEN,
      amount: 1000n,
      beneficiary,
    });

    expect(tx.chainId).toEqual(chainId);
    expect(tx.address).toEqual(terminal);
    expect(tx.functionName).toEqual("pay");
    expect(tx.value).toEqual(1000n);
    expect(tx.args).toEqual([
      projectId,
      NATIVE_TOKEN,
      1000n,
      beneficiary,
      0n,
      "",
      "0x",
    ]);
    expect(() => encodeFunctionData(tx)).not.toThrow();
  });

  test("buildPayTx sets no value for ERC-20 payments", () => {
    const tx = buildPayTx({
      chainId,
      terminal,
      projectId,
      token: usdc,
      amount: 1000n,
      beneficiary,
      minReturnedTokens: 7n,
      memo: "gm",
      metadata: "0x1234",
    });

    expect(tx.value).toEqual(0n);
    expect(tx.args).toEqual([
      projectId,
      usdc,
      1000n,
      beneficiary,
      7n,
      "gm",
      "0x1234",
    ]);
    expect(() => encodeFunctionData(tx)).not.toThrow();
  });

  test("previewPay calls the terminal's previewPayFor", async () => {
    const calls: any[] = [];
    const client = {
      async readContract(params: unknown) {
        calls.push(params);
        return [{}, 100n, 25n, []];
      },
    } as unknown as PublicClient;

    const preview = await previewPay(client, {
      chainId,
      terminal,
      projectId,
      token: NATIVE_TOKEN,
      amount: 1000n,
      beneficiary,
    });

    expect(preview).toEqual({
      beneficiaryTokenCount: 100n,
      reservedTokenCount: 25n,
    });
    expect(calls[0].address).toEqual(terminal);
    expect(calls[0].abi).toBe(jbMultiTerminalAbi);
    expect(calls[0].functionName).toEqual("previewPayFor");
    expect(calls[0].args).toEqual([
      projectId,
      NATIVE_TOKEN,
      1000n,
      beneficiary,
      "0x",
    ]);
  });

  test("build721PayMetadata packs the hook's metadata id and tier payload", () => {
    // With a hook address whose first 4 bytes are zero, the metadata id is the first
    // 4 bytes of keccak256("pay").
    const metadata = build721PayMetadata({
      hookAddress: "0x00000000000000000000000000000000DeaDBeef",
      tierIdsToMint: [1n, 2n],
    });

    // Word 0 is the protocol's reserved word.
    expect(sliceHex(metadata, 0, 32)).toEqual(`0x${"00".repeat(32)}`);
    // The lookup table: the hook's metadata id, then the payload's word offset (2).
    expect(sliceHex(metadata, 32, 36)).toEqual("0xadc75680");
    expect(sliceHex(metadata, 36, 37)).toEqual("0x02");
    // The payload starts at word 2 and decodes to (allowOverspending, tierIdsToMint).
    const payload = sliceHex(metadata, 64);
    const [allowOverspending, tierIds] = decodeAbiParameters(
      [{ type: "bool" }, { type: "uint16[]" }],
      payload,
    );
    expect(allowOverspending).toEqual(true);
    expect(tierIds).toEqual([1, 2]);
  });

  test("build721PayMetadata respects allowOverspending false", () => {
    const metadata = build721PayMetadata({
      hookAddress: "0x00000000000000000000000000000000DeaDBeef",
      tierIdsToMint: [5n],
      allowOverspending: false,
    });

    const [allowOverspending, tierIds] = decodeAbiParameters(
      [{ type: "bool" }, { type: "uint16[]" }],
      sliceHex(metadata, 64),
    );
    expect(allowOverspending).toEqual(false);
    expect(tierIds).toEqual([5]);
  });

  test("build721PayMetadata id XORs the hook address with keccak256('pay')", () => {
    const metadata = build721PayMetadata({
      hookAddress: "0x1111111111111111111111111111111111111111",
      tierIdsToMint: [1n],
    });

    // 0xadc75680 (first 4 bytes of keccak256("pay")) XOR 0x11111111.
    expect(sliceHex(metadata, 32, 36)).toEqual("0xbcd64791");
  });

  test("build721PayMetadata metadataIdTarget matches the hookAddress alias", () => {
    const target = "0x1111111111111111111111111111111111111111" as const;
    expect(
      build721PayMetadata({ metadataIdTarget: target, tierIdsToMint: [1n] }),
    ).toEqual(
      build721PayMetadata({ hookAddress: target, tierIdsToMint: [1n] }),
    );
  });

  test("build721PayMetadata throws when no target is given", () => {
    expect(() => build721PayMetadata({ tierIdsToMint: [1n] })).toThrow(
      /metadataIdTarget/,
    );
  });
});

describe("buyback pay quote", () => {
  test.each([false, true])(
    "encodes the required third word (skipSplits=%s)",
    (skipSplits) => {
      const metadata = buildBuybackPayMetadata({
        hook: terminal,
        amountToSwapWith: 100n,
        minimumSwapAmountOut: 99n,
        skipSplits,
      });
      expect(
        decodeAbiParameters(
          [{ type: "uint256" }, { type: "uint256" }, { type: "bool" }],
          sliceHex(metadata, 64),
        ),
      ).toEqual([100n, 99n, skipSplits]);
      expect(metadata.length).toBe(2 + 5 * 64);
    },
  );
  test("defaults to honoring reserved splits with an oracle-derived floor", () => {
    const metadata = buildBuybackPayMetadata({
      hook: terminal,
      amountToSwapWith: 100n,
      minimumSwapAmountOut: 0n,
    });
    expect(
      decodeAbiParameters(
        [{ type: "uint256" }, { type: "uint256" }, { type: "bool" }],
        sliceHex(metadata, 64),
      ),
    ).toEqual([100n, 0n, false]);
  });
});

const buybackHook = "0xb222da5a71e8fb89a5a38b7c920eab5dfbc74b91" as const;
const registry = "0x72f55a54cd53410a5ff175508a5a384227081788" as const;

// The 17-word pay specification buyback 1.4 returns from beforePayRecordedWith.
function buybackPaySpec({
  amountToMintWith = 0n,
  minimumSwapAmountOut,
  weightRatio = 10n ** 18n,
  rawSwapQuote,
  oracleUnseeded = false,
  skipSplits,
  reservedPercent,
}: {
  amountToMintWith?: bigint;
  minimumSwapAmountOut: bigint;
  weightRatio?: bigint;
  rawSwapQuote: bigint;
  oracleUnseeded?: boolean;
  skipSplits: boolean;
  reservedPercent: bigint;
}) {
  const u = { type: "uint256" } as const;
  return encodeAbiParameters(
    [
      { type: "bool" },
      u,
      u,
      { type: "bool" },
      { type: "address" },
      u,
      u,
      u,
      { type: "int24" },
      { type: "uint128" },
      { type: "bytes32" },
      u,
      u,
      u,
      { type: "bool" },
      { type: "bool" },
      u,
    ],
    [
      false,
      amountToMintWith,
      minimumSwapAmountOut,
      false,
      terminal,
      0n,
      weightRatio,
      0n,
      0,
      0n,
      `0x${"00".repeat(32)}`,
      0n,
      0n,
      rawSwapQuote,
      oracleUnseeded,
      skipSplits,
      reservedPercent,
    ],
  );
}

describe("effectivePayPreview", () => {
  const base = {
    buybackHook,
    beneficiaryTokenCount: 0n,
    reservedTokenCount: 0n,
    weight: 10n ** 18n,
  };

  test("a skipped split hands the whole swap quote to the beneficiary", () => {
    expect(
      effectivePayPreview({
        ...base,
        hookSpecifications: [
          {
            hook: buybackHook,
            noop: false,
            metadata: buybackPaySpec({
              minimumSwapAmountOut: 900n,
              rawSwapQuote: 1_000n,
              skipSplits: true,
              reservedPercent: 3_000n,
            }),
          },
        ],
      }),
    ).toEqual({ beneficiaryTokenCount: 1_000n, reservedTokenCount: 0n });
  });

  test("an honored split reserves its share of the swap", () => {
    expect(
      effectivePayPreview({
        ...base,
        hookSpecifications: [
          {
            hook: buybackHook,
            noop: false,
            metadata: buybackPaySpec({
              minimumSwapAmountOut: 900n,
              rawSwapQuote: 1_000n,
              skipSplits: false,
              reservedPercent: 3_000n,
            }),
          },
        ],
      }),
    ).toEqual({ beneficiaryTokenCount: 700n, reservedTokenCount: 300n });
  });

  test("an unseeded oracle trusts only the floor, and the mint leg still splits", () => {
    expect(
      effectivePayPreview({
        ...base,
        hookSpecifications: [
          {
            hook: buybackHook,
            noop: false,
            metadata: buybackPaySpec({
              amountToMintWith: 100n,
              minimumSwapAmountOut: 900n,
              rawSwapQuote: 1_000n,
              oracleUnseeded: true,
              skipSplits: true,
              reservedPercent: 5_000n,
            }),
          },
        ],
      }),
    ).toEqual({ beneficiaryTokenCount: 950n, reservedTokenCount: 50n });
  });

  test("terminal counts, noop specs, other hooks and pre-1.4 specs pass through", () => {
    const metadata = buybackPaySpec({
      minimumSwapAmountOut: 900n,
      rawSwapQuote: 1_000n,
      skipSplits: true,
      reservedPercent: 0n,
    });
    const zero = { beneficiaryTokenCount: 0n, reservedTokenCount: 0n };
    expect(
      effectivePayPreview({
        ...base,
        beneficiaryTokenCount: 5n,
        hookSpecifications: [{ hook: buybackHook, noop: false, metadata }],
      }),
    ).toEqual({ beneficiaryTokenCount: 5n, reservedTokenCount: 0n });
    expect(
      effectivePayPreview({
        ...base,
        hookSpecifications: [{ hook: buybackHook, noop: true, metadata }],
      }),
    ).toEqual(zero);
    expect(
      effectivePayPreview({
        ...base,
        hookSpecifications: [{ hook: terminal, noop: false, metadata }],
      }),
    ).toEqual(zero);
    expect(
      effectivePayPreview({
        ...base,
        hookSpecifications: [
          {
            hook: buybackHook,
            noop: false,
            metadata: sliceHex(metadata, 0, 15 * 32),
          },
        ],
      }),
    ).toEqual(zero);
  });
});

describe("buildUserPayMetadata", () => {
  const quoteWords = [
    { type: "uint256" },
    { type: "uint256" },
    { type: "bool" },
  ] as const;

  test("keys a skip-splits quote to the buyback registry", () => {
    const metadata = buildUserPayMetadata({ chainId: 8453 });
    expect(metadata).toEqual(
      buildBuybackPayMetadata({
        hook: registry,
        amountToSwapWith: 0n,
        minimumSwapAmountOut: 0n,
        skipSplits: true,
      }),
    );
    expect(decodeAbiParameters(quoteWords, sliceHex(metadata, 64))).toEqual([
      0n,
      0n,
      true,
    ]);
  });

  test("adds the 721 tiers when the payment buys NFTs", () => {
    const target = "0x4444444444444444444444444444444444444444" as const;
    const metadata = buildUserPayMetadata({
      chainId: 8453,
      tiers: { metadataIdTarget: target, tierIdsToMint: [1n, 2n] },
    });
    const tierMetadata = build721PayMetadata({
      metadataIdTarget: target,
      tierIdsToMint: [1n, 2n],
    });
    // Two table entries, the quote, then the same tier payload.
    expect(metadata.endsWith(sliceHex(tierMetadata, 64).slice(2))).toBe(true);
    expect(
      buildUserPayMetadata({
        chainId: 8453,
        tiers: { metadataIdTarget: target, tierIdsToMint: [] },
      }),
    ).toEqual(buildUserPayMetadata({ chainId: 8453 }));
  });
});

describe("prepareUserPay", () => {
  const poolKey = {
    currency0: "0x0000000000000000000000000000000000000000",
    currency1: "0x7777777777777777777777777777777777777777",
    fee: 10_000,
    tickSpacing: 200,
    hooks: "0x0000000000000000000000000000000000000000",
  } as const;
  const poolId = uniswapV4PoolId(poolKey);
  // A 1.4 spec on the hook's pool: TWAP floor 0 (a large buy), mint share 50.
  const spec = (id: Hex) => {
    const words = sliceHex(
      buybackPaySpec({
        minimumSwapAmountOut: 0n,
        rawSwapQuote: 0n,
        skipSplits: true,
        reservedPercent: 5_000n,
      }),
      0,
    ).slice(2);
    const set = (i: number, v: string) =>
      words.slice(0, i * 64) + v + words.slice((i + 1) * 64);
    let w = set(5, 50n.toString(16).padStart(64, "0"));
    w =
      w.slice(0, 7 * 64) +
      1000n.toString(16).padStart(64, "0") +
      w.slice(8 * 64);
    w = w.slice(0, 10 * 64) + id.slice(2) + w.slice(11 * 64);
    return `0x${w}` as Hex;
  };
  const client = (quote: bigint | Error, id: Hex = poolId) =>
    ({
      async readContract({ functionName }: { functionName: string }) {
        if (functionName === "previewPayFor") {
          return [
            { weight: 10n ** 18n },
            100n,
            100n,
            [{ hook: buybackHook, noop: true, amount: 0n, metadata: spec(id) }],
          ];
        }
        return poolKey;
      },
      async call() {
        if (quote instanceof Error) throw quote;
        return {
          data: encodeAbiParameters(
            [{ type: "uint256" }, { type: "uint256" }],
            [quote, 0n],
          ),
        };
      },
    }) as unknown as PublicClient;
  const args = {
    chainId: 8453 as const,
    terminal,
    projectId,
    token: NATIVE_TOKEN,
    amount: 1000n,
    beneficiary,
  };

  test("sends the slippage-floored pool quote as the hook's explicit minimum", async () => {
    const prepared = await prepareUserPay(client(10_000n), args);
    expect(prepared.preview).toEqual({
      beneficiaryTokenCount: 10_000n,
      reservedTokenCount: 0n,
    });
    expect(prepared.minReturnedTokens).toBe(9_900n);
    expect(prepared.metadata).toEqual(
      buildUserPayMetadata({ chainId: 8453, minimumSwapAmountOut: 9_900n }),
    );
  });

  test("keeps the mint path when the pool loses, the pool differs or the quote fails", async () => {
    const mint = {
      metadata: buildUserPayMetadata({ chainId: 8453 }),
      preview: { beneficiaryTokenCount: 100n, reservedTokenCount: 100n },
      minReturnedTokens: 99n,
    };
    expect(await prepareUserPay(client(50n), args)).toEqual(mint);
    expect(
      await prepareUserPay(client(10_000n, `0x${"ab".repeat(32)}`), args),
    ).toEqual(mint);
    expect(await prepareUserPay(client(new Error("no pool")), args)).toEqual(
      mint,
    );
  });
});
