import {
  PublicClient,
  decodeAbiParameters,
  decodeFunctionData,
  encodeAbiParameters,
  encodeFunctionData,
  sliceHex,
} from "viem";
import { describe, expect, test } from "vitest";
import type { Address, Hex } from "viem";
import { NATIVE_TOKEN } from "../constants.js";
import { v6Address } from "./types.js";
import { hookMetadataId } from "../utils/hook.js";
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
      async readContract(params: { functionName: string }) {
        calls.push(params);
        if (params.functionName === "hookOf") {
          return "0x0000000000000000000000000000000000000000";
        }
        return [{ weight: 0n, metadata: 0n }, 100n, 25n, []];
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
  projectTokenIs0 = false,
  amountToMintWith = 0n,
  minimumSwapAmountOut,
  tokenCountWithoutHook = 0n,
  weightRatio = 10n ** 18n,
  amountToSwapWith = 0n,
  poolId = `0x${"00".repeat(32)}`,
  rawSwapQuote,
  oracleUnseeded = false,
  skipSplits,
  reservedPercent,
}: {
  projectTokenIs0?: boolean;
  amountToMintWith?: bigint;
  minimumSwapAmountOut: bigint;
  tokenCountWithoutHook?: bigint;
  weightRatio?: bigint;
  amountToSwapWith?: bigint;
  poolId?: Hex;
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
      projectTokenIs0,
      amountToMintWith,
      minimumSwapAmountOut,
      false,
      terminal,
      tokenCountWithoutHook,
      weightRatio,
      amountToSwapWith,
      0,
      0n,
      poolId,
      0n,
      0n,
      rawSwapQuote,
      oracleUnseeded,
      skipSplits,
      reservedPercent,
    ],
  );
}

// Hook 1.1.1's 15-word spec: the 1.4 layout without skipSplits and reservedPercent.
const legacySpec = (metadata: Hex) => sliceHex(metadata, 0, 15 * 32);

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
            metadata: sliceHex(metadata, 0, 16 * 32),
          },
        ],
      }),
    ).toEqual(zero);
  });

  test("a 1.1.1 spec reserves the ruleset's split of the swap", () => {
    expect(
      effectivePayPreview({
        ...base,
        reservedPercent: 3_000n,
        hookSpecifications: [
          {
            hook: buybackHook,
            noop: false,
            metadata: legacySpec(
              buybackPaySpec({
                minimumSwapAmountOut: 900n,
                rawSwapQuote: 1_000n,
                skipSplits: true,
                reservedPercent: 0n,
              }),
            ),
          },
        ],
      }),
    ).toEqual({ beneficiaryTokenCount: 700n, reservedTokenCount: 300n });
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

// The minimum in the quote entry buildUserPayMetadata puts first.
const explicitMinimumOf = (metadata: Hex) =>
  metadata.length < 2 + 160 * 2
    ? 0n
    : decodeAbiParameters(
        [{ type: "uint256" }, { type: "uint256" }, { type: "bool" }],
        sliceHex(metadata, 64, 160),
      )[1];

describe("prepareUserPay", () => {
  const projectToken = "0x7777777777777777777777777777777777777777" as const;
  const nativeKey = {
    currency0: "0x0000000000000000000000000000000000000000",
    currency1: projectToken,
    fee: 10_000,
    tickSpacing: 200,
    hooks: "0x0000000000000000000000000000000000000000",
  } as const;
  // Reserved percent 2,000 packed at bits 4-19 of the ruleset metadata.
  const ruleset = { weight: 10n ** 18n, metadata: 2_000n << 4n };

  function mockClient({
    terminalCounts = [0n, 0n] as const,
    spec,
    noop = false,
    hook = buybackHook as Address | Error,
    poolKey = nativeKey as
      | typeof nativeKey
      | {
          currency0: Address;
          currency1: Address;
          fee: number;
          tickSpacing: number;
          hooks: Address;
        },
    quote = 10_000n as bigint | Error,
    rulesetMetadata = ruleset.metadata,
    extraDataHook,
    specHook = buybackHook as Address,
    respond,
  }: {
    rulesetMetadata?: bigint;
    /** The hook the spec comes from. */
    specHook?: Address;
    /** Answer each preview from the metadata it was sent, as a hook reading only its own entry does. */
    respond?: (metadata: Hex) => {
      spec?: Hex | Error;
      noop?: boolean;
      terminalCounts?: readonly [bigint, bigint];
    };
    extraDataHook?: { dataHook: Address; useDataHookForPay: boolean };
    terminalCounts?: readonly [bigint, bigint];
    spec?: Hex | Error;
    noop?: boolean;
    hook?: Address | Error;
    poolKey?: {
      currency0: Address;
      currency1: Address;
      fee: number;
      tickSpacing: number;
      hooks: Address;
    };
    quote?: bigint | Error;
  }) {
    const calls: {
      address?: Address;
      functionName?: string;
      args?: unknown;
      data?: Hex;
    }[] = [];
    const client = {
      async readContract({
        address,
        functionName,
        args,
      }: {
        address: Address;
        functionName: string;
        args: unknown;
      }) {
        calls.push({ address, functionName, args });
        if (functionName === "previewPayFor") {
          const sent = (args as unknown[])[4] as Hex;
          // A hook given an explicit minimum above minting swaps.
          const explicit = explicitMinimumOf(sent) !== 0n;
          const answer = {
            spec,
            noop: noop && !explicit,
            terminalCounts,
            ...respond?.(sent),
          };
          if (answer.spec instanceof Error) throw answer.spec;
          return [
            { ...ruleset, id: 9, metadata: rulesetMetadata },
            answer.terminalCounts[0],
            answer.terminalCounts[1],
            answer.spec
              ? [
                  {
                    hook: specHook,
                    noop: answer.noop,
                    amount: 0n,
                    metadata: answer.spec,
                  },
                ]
              : [],
          ];
        }
        if (functionName === "hookOf") {
          if (hook instanceof Error) throw hook;
          return hook;
        }
        if (functionName === "extraDataHookOf") {
          if (!extraDataHook) throw new Error("not an omnichain project");
          return { ...extraDataHook, useDataHookForCashOut: false };
        }
        return poolKey;
      },
      async call({ data }: { data: Hex }) {
        calls.push({ data });
        if (quote instanceof Error) throw quote;
        return {
          data: encodeAbiParameters(
            [{ type: "uint256" }, { type: "uint256" }],
            [quote, 0n],
          ),
        };
      },
    } as unknown as PublicClient;
    return { client, calls };
  }
  const args = {
    chainId: 8453 as const,
    terminal,
    projectId,
    token: NATIVE_TOKEN,
    amount: 1000n,
    beneficiary,
  };
  // REVOwner forwards only the net of 721 tier splits, so the hook quotes 800.
  const swapSpec = (
    overrides: Partial<Parameters<typeof buybackPaySpec>[0]> = {},
  ) =>
    buybackPaySpec({
      minimumSwapAmountOut: 0n,
      tokenCountWithoutHook: 50n,
      amountToSwapWith: 800n,
      poolId: uniswapV4PoolId(nativeKey),
      rawSwapQuote: 0n,
      skipSplits: true,
      reservedPercent: 2_000n,
      ...overrides,
    });
  const quotedArgs = (calls: { data?: Hex }[]) => {
    const data = calls.find((c) => c.data)!.data!;
    const [params] = decodeFunctionData({ abi: quoterAbi, data }).args;
    return params;
  };

  test("sends the slippage-floored pool quote as the hook's explicit minimum", async () => {
    const { client, calls } = mockClient({ spec: swapSpec(), noop: true });
    const prepared = await prepareUserPay(client, args);
    expect(prepared.preview).toEqual({
      beneficiaryTokenCount: 10_000n,
      reservedTokenCount: 0n,
    });
    expect(prepared.minReturnedTokens).toBe(9_900n);
    expect(prepared.metadata).toEqual(
      buildUserPayMetadata({ chainId: 8453, minimumSwapAmountOut: 9_900n }),
    );
    expect(calls.find((c) => c.functionName === "poolKeyOf")!.args).toEqual([
      projectId,
      "0x0000000000000000000000000000000000000000",
    ]);
    expect(quotedArgs(calls)).toMatchObject({
      zeroForOne: true,
      exactAmount: 800n,
    });
  });

  test("keeps the mint path when the hook rejects the quoted minimum", async () => {
    // The quoter crossed to liquidity beyond the current tick; the hook sees none.
    const { client } = mockClient({
      spec: swapSpec(),
      noop: true,
      terminalCounts: [40n, 10n],
      respond: (metadata) =>
        explicitMinimumOf(metadata) === 0n
          ? {}
          : { spec: new Error("JBBuybackHook_SpecifiedSlippageExceeded") },
    });
    expect(await prepareUserPay(client, args)).toEqual({
      metadata: buildUserPayMetadata({ chainId: 8453 }),
      preview: { beneficiaryTokenCount: 40n, reservedTokenCount: 10n },
      minReturnedTokens: 39n,
    });
  });

  test("keeps the mint path when the quoted preview does not swap", async () => {
    const { client } = mockClient({
      spec: swapSpec(),
      terminalCounts: [40n, 10n],
      respond: () => ({ noop: true }),
    });
    expect((await prepareUserPay(client, args)).metadata).toEqual(
      buildUserPayMetadata({ chainId: 8453 }),
    );
  });

  test("adds what the terminal issues itself beside the swap, such as for NFT splits", async () => {
    const { client } = mockClient({
      spec: swapSpec({ skipSplits: false, tokenCountWithoutHook: 1_000n }),
      respond: (metadata) =>
        explicitMinimumOf(metadata) === 0n
          ? {}
          : { terminalCounts: [160n, 40n] as const },
    });
    const prepared = await prepareUserPay(client, {
      ...args,
      skipSplits: false,
    });
    expect(prepared.preview).toEqual({
      beneficiaryTokenCount: 8_160n,
      reservedTokenCount: 2_040n,
    });
    expect(prepared.minReturnedTokens).toBe(7_920n + 160n);
  });

  test("does not count a router's folded estimate as terminal issuance", async () => {
    // The router reports the hook's 12,000 estimate in place of zero counts.
    const { client } = mockClient({
      spec: swapSpec(),
      noop: true,
      respond: (metadata) =>
        explicitMinimumOf(metadata) === 0n
          ? {}
          : {
              spec: swapSpec({
                rawSwapQuote: 12_000n,
                minimumSwapAmountOut: 9_900n,
              }),
              terminalCounts: [12_000n, 0n] as const,
            },
    });
    const prepared = await prepareUserPay(client, {
      ...args,
      terminal: v6Address("JBRouterTerminalRegistry", 8453),
    });
    expect(prepared.preview).toEqual({
      beneficiaryTokenCount: 10_000n,
      reservedTokenCount: 0n,
    });
    expect(prepared.minReturnedTokens).toBe(9_900n);
  });

  test("looks up an ERC-20 pool by the token and swaps toward currency0", async () => {
    const usdcKey = { ...nativeKey, currency0: projectToken, currency1: usdc };
    const { client, calls } = mockClient({
      spec: swapSpec({
        projectTokenIs0: true,
        poolId: uniswapV4PoolId(usdcKey),
      }),
      poolKey: usdcKey,
    });
    const prepared = await prepareUserPay(client, { ...args, token: usdc });
    expect(prepared.minReturnedTokens).toBe(9_900n);
    expect(calls.find((c) => c.functionName === "poolKeyOf")!.args).toEqual([
      projectId,
      usdc,
    ]);
    expect(quotedArgs(calls)).toMatchObject({ zeroForOne: false });
  });

  test("keeps the mint path, at the terminal's issuance, when the pool loses", async () => {
    const { client } = mockClient({
      terminalCounts: [100n, 25n],
      spec: swapSpec(),
      noop: true,
      quote: 50n,
    });
    expect(await prepareUserPay(client, args)).toEqual({
      metadata: buildUserPayMetadata({ chainId: 8453 }),
      preview: { beneficiaryTokenCount: 100n, reservedTokenCount: 25n },
      minReturnedTokens: 99n,
    });
  });

  test("behind a router, requires only the mint entitlement, not the optimistic preview", async () => {
    // The router's own preview already folded the raw TWAP quote into 1,000.
    const { client, calls } = mockClient({
      terminalCounts: [1_000n, 0n],
      spec: swapSpec({ poolId: `0x${"ab".repeat(32)}` }),
    });
    const prepared = await prepareUserPay(client, args);
    expect(prepared.preview.beneficiaryTokenCount).toBe(1_000n);
    expect(prepared.minReturnedTokens).toBe(47n);
    expect(prepared.metadata).toEqual(buildUserPayMetadata({ chainId: 8453 }));
    expect(calls.some((c) => c.data)).toBe(false);
  });

  test("a failed quote falls back to the mint entitlement", async () => {
    const { client } = mockClient({
      spec: swapSpec({ rawSwapQuote: 900n, minimumSwapAmountOut: 600n }),
      quote: new Error("quoter reverted"),
    });
    const prepared = await prepareUserPay(client, args);
    expect(prepared.preview.beneficiaryTokenCount).toBe(900n);
    expect(prepared.minReturnedTokens).toBe(47n);
  });

  test("quotes hook 1.1.1 too: it ignores skipSplits, so the quote is reminted through the split", async () => {
    const { client, calls } = mockClient({
      spec: legacySpec(swapSpec({ tokenCountWithoutHook: 1_000n })),
    });
    const prepared = await prepareUserPay(client, args);
    // 1.1.1 reads only (amountToSwapWith, minimum) and requires swap + leftover mint >= 9,900.
    expect(
      decodeAbiParameters(
        [{ type: "uint256" }, { type: "uint256" }],
        sliceHex(prepared.metadata, 64, 128),
      ),
    ).toEqual([0n, 9_900n]);
    expect(prepared.metadata).toEqual(
      buildUserPayMetadata({ chainId: 8453, minimumSwapAmountOut: 9_900n }),
    );
    // The ruleset's 20% split of the 10,000 quote, and of the 9,900 minimum.
    expect(prepared.preview).toEqual({
      beneficiaryTokenCount: 8_000n,
      reservedTokenCount: 2_000n,
    });
    expect(prepared.minReturnedTokens).toBe(7_920n);
    expect(quotedArgs(calls)).toMatchObject({ exactAmount: 800n });
  });

  test("hook 1.1.1 without a quote requires the beneficiary's split of a mint", async () => {
    const { client } = mockClient({
      spec: legacySpec(
        swapSpec({ tokenCountWithoutHook: 1_000n, rawSwapQuote: 1_500n }),
      ),
      quote: new Error("quoter reverted"),
    });
    const prepared = await prepareUserPay(client, args);
    // 1,500 swapped, reminted through the ruleset's 20% split.
    expect(prepared.preview).toEqual({
      beneficiaryTokenCount: 1_200n,
      reservedTokenCount: 300n,
    });
    expect(prepared.minReturnedTokens).toBe(790n);
    expect(prepared.metadata).toEqual(buildUserPayMetadata({ chainId: 8453 }));
  });

  test("a project with no buyback hook keeps the terminal's own counts", async () => {
    const { client } = mockClient({
      terminalCounts: [200n, 50n],
      hook: "0x0000000000000000000000000000000000000000",
    });
    expect((await prepareUserPay(client, args)).minReturnedTokens).toBe(198n);
  });

  test("a payment without hook specs never needs the registry", async () => {
    const { client, calls } = mockClient({
      terminalCounts: [200n, 50n],
      hook: new Error("rpc down"),
    });
    expect((await prepareUserPay(client, args)).minReturnedTokens).toBe(198n);
    expect(calls.some((c) => c.functionName === "hookOf")).toBe(false);
  });

  test("an unreadable registry fails instead of dropping the minimum", async () => {
    const { client } = mockClient({
      spec: swapSpec(),
      hook: new Error("rpc down"),
    });
    await expect(prepareUserPay(client, args)).rejects.toThrow("rpc down");
  });

  test("a swapping hook with an unknown spec fails instead of dropping the minimum", async () => {
    const { client } = mockClient({ spec: sliceHex(swapSpec(), 0, 16 * 32) });
    await expect(prepareUserPay(client, args)).rejects.toThrow(
      /unknown specification/,
    );
  });

  test("skipSplits false sends the quote as the minimum on the whole issuance, and requires the beneficiary's split of it", async () => {
    const { client, calls } = mockClient({
      spec: swapSpec({
        skipSplits: false,
        tokenCountWithoutHook: 1_000n,
        reservedPercent: 1_667n,
      }),
      noop: true,
    });
    const prepared = await prepareUserPay(client, {
      ...args,
      skipSplits: false,
    });
    // The hook compares swap + leftover mint, before the split, to 9,900.
    expect(prepared.metadata).toEqual(
      buildUserPayMetadata({
        chainId: 8453,
        minimumSwapAmountOut: 9_900n,
        skipSplits: false,
      }),
    );
    expect(
      decodeAbiParameters(
        [{ type: "uint256" }, { type: "uint256" }, { type: "bool" }],
        sliceHex(prepared.metadata, 64),
      ),
    ).toEqual([0n, 9_900n, false]);
    // The controller mints 83.33% of it to the beneficiary, rounded down.
    expect(prepared.preview).toEqual({
      beneficiaryTokenCount: 8_333n,
      reservedTokenCount: 1_667n,
    });
    expect(prepared.minReturnedTokens).toBe(8_249n);
    expect(quotedArgs(calls)).toMatchObject({
      zeroForOne: true,
      exactAmount: 800n,
    });
  });

  test("a direct mint leg joins the split with the swap, or is split alone when the swap skips it", async () => {
    // 200 wei minted directly at weight 1e18 / weightRatio 1e18: 200 tokens.
    const honored = mockClient({
      spec: swapSpec({
        skipSplits: false,
        tokenCountWithoutHook: 1_000n,
        reservedPercent: 1_667n,
        amountToMintWith: 200n,
      }),
    });
    const split = await prepareUserPay(honored.client, {
      ...args,
      skipSplits: false,
    });
    expect(split.preview).toEqual({
      beneficiaryTokenCount: 8_499n,
      reservedTokenCount: 1_701n,
    });
    expect(split.minReturnedTokens).toBe(8_416n);

    const skipped = mockClient({
      spec: swapSpec({ amountToMintWith: 200n }),
    });
    const skip = await prepareUserPay(skipped.client, args);
    expect(skip.preview).toEqual({
      beneficiaryTokenCount: 10_160n,
      reservedTokenCount: 40n,
    });
    expect(skip.minReturnedTokens).toBe(10_060n);
  });

  test("skipSplits false without a quote falls back to the split mint entitlement", async () => {
    const { client } = mockClient({
      spec: swapSpec({ skipSplits: false, tokenCountWithoutHook: 1_000n }),
      quote: new Error("quoter reverted"),
    });
    const prepared = await prepareUserPay(client, {
      ...args,
      skipSplits: false,
    });
    expect(prepared.metadata).toEqual(
      buildUserPayMetadata({ chainId: 8453, skipSplits: false }),
    );
    // The beneficiary's 80% of a 1,000-token mint, less 2 for rounding, less 1%.
    expect(prepared.minReturnedTokens).toBe(790n);
  });

  // useDataHookForPay (bit 80) with the data hook packed at bits 82-241.
  const dataHookMetadata = (hook: Address) =>
    ruleset.metadata | (1n << 80n) | (BigInt(hook) << 82n);
  const sentMetadata = (calls: { functionName?: string; args?: unknown }[]) =>
    calls
      .filter((c) => c.functionName === "previewPayFor")
      .map((c) => (c.args as unknown[])[4]);

  // Buyback 1.4 called directly reads only the entry keyed to its own address.
  // Without one it mints through the split; with one it honors the entry's skipSplits.
  const directHook =
    (hookSpec: (skipSplits: boolean) => Hex) => (metadata: Hex) => {
      const id = hookMetadataId(buybackHook, "pay").slice(2).toLowerCase();
      if (!metadata.toLowerCase().includes(id))
        return {
          spec: hookSpec(false),
          noop: false,
          terminalCounts: [400n, 100n] as const,
        };
      const [, , skip] = decodeAbiParameters(
        [{ type: "uint256" }, { type: "uint256" }, { type: "bool" }],
        sliceHex(metadata, 64, 64 + 96),
      );
      return {
        spec: hookSpec(skip),
        noop: skip && explicitMinimumOf(metadata) === 0n,
        terminalCounts: [0n, 0n] as const,
      };
    };

  test("keys the quote to buyback 1.4 when the ruleset calls it directly", async () => {
    const { client, calls } = mockClient({
      respond: directHook((skipSplits) => swapSpec({ skipSplits })),
      rulesetMetadata: dataHookMetadata(buybackHook),
      hook: new Error("the registry is not on this route"),
    });
    const prepared = await prepareUserPay(client, args);
    // The registry-keyed first preview minted 400 through the split; the hook-keyed one swaps.
    expect(prepared.preview).toEqual({
      beneficiaryTokenCount: 10_000n,
      reservedTokenCount: 0n,
    });
    expect(prepared.metadata).toEqual(
      buildUserPayMetadata({
        chainId: 8453,
        minimumSwapAmountOut: 9_900n,
        hook: buybackHook,
      }),
    );
    expect(prepared.minReturnedTokens).toBe(9_900n);
    // Registry-keyed, hook-keyed, then the quoted minimum checked.
    expect(sentMetadata(calls)).toEqual([
      buildUserPayMetadata({ chainId: 8453 }),
      buildUserPayMetadata({ chainId: 8453, hook: buybackHook }),
      prepared.metadata,
    ]);
    expect(calls.some((c) => c.functionName === "hookOf")).toBe(false);
  });

  test("skipSplits false on a direct buyback 1.4 keys the split-honoring entry to the hook", async () => {
    const { client, calls } = mockClient({
      respond: directHook((skipSplits) =>
        swapSpec({ skipSplits, tokenCountWithoutHook: 1_000n }),
      ),
      rulesetMetadata: dataHookMetadata(buybackHook),
      hook: new Error("the registry is not on this route"),
    });
    const prepared = await prepareUserPay(client, {
      ...args,
      skipSplits: false,
    });
    expect(prepared.metadata).toEqual(
      buildUserPayMetadata({
        chainId: 8453,
        minimumSwapAmountOut: 9_900n,
        skipSplits: false,
        hook: buybackHook,
      }),
    );
    expect(prepared.minReturnedTokens).toBe(7_920n);
    expect(sentMetadata(calls)).toEqual([
      buildUserPayMetadata({ chainId: 8453, skipSplits: false }),
      buildUserPayMetadata({
        chainId: 8453,
        skipSplits: false,
        hook: buybackHook,
      }),
      prepared.metadata,
    ]);
    expect(quotedArgs(calls)).toMatchObject({ exactAmount: 800n });
  });

  test("a direct buyback 1.4 behind the router terminal is previewed through the router", async () => {
    const router = v6Address("JBRouterTerminalRegistry", 8453);
    const { client, calls } = mockClient({
      respond: directHook((skipSplits) => swapSpec({ skipSplits })),
      rulesetMetadata: dataHookMetadata(buybackHook),
      hook: new Error("the registry is not on this route"),
    });
    const prepared = await prepareUserPay(client, {
      ...args,
      terminal: router,
    });
    expect(prepared.metadata).toEqual(
      buildUserPayMetadata({
        chainId: 8453,
        minimumSwapAmountOut: 9_900n,
        hook: buybackHook,
      }),
    );
    const previews = calls.filter((c) => c.functionName === "previewPayFor");
    expect(previews.map((c) => c.address)).toEqual([router, router, router]);
  });

  test("a custom data hook is not a direct buyback: one registry-keyed preview, no buyback spec", async () => {
    const custom = "0xc0ffee0000000000000000000000000000000001" as const;
    const { client, calls } = mockClient({
      terminalCounts: [200n, 50n],
      spec: swapSpec(),
      specHook: custom,
      rulesetMetadata: dataHookMetadata(custom),
    });
    const prepared = await prepareUserPay(client, args);
    expect(prepared.metadata).toEqual(buildUserPayMetadata({ chainId: 8453 }));
    expect(prepared.minReturnedTokens).toBe(198n);
    expect(sentMetadata(calls)).toHaveLength(1);
    expect(calls.some((c) => c.functionName === "hookOf")).toBe(true);
  });

  test("buyback 1.4 set as the data hook with pay disabled is not a direct route", async () => {
    const { client, calls } = mockClient({
      spec: swapSpec(),
      noop: true,
      // useDataHookForPay (bit 80) off.
      rulesetMetadata: ruleset.metadata | (BigInt(buybackHook) << 82n),
    });
    const prepared = await prepareUserPay(client, args);
    expect(prepared.metadata).toEqual(
      buildUserPayMetadata({ chainId: 8453, minimumSwapAmountOut: 9_900n }),
    );
    expect(sentMetadata(calls)).toEqual([
      buildUserPayMetadata({ chainId: 8453 }),
      prepared.metadata,
    ]);
    expect(calls.some((c) => c.functionName === "hookOf")).toBe(true);
  });

  test("keys the quote to buyback 1.4 behind the omnichain deployer, and to the registry otherwise", async () => {
    const omnichainRuleset = dataHookMetadata(
      v6Address("JBOmnichainDeployer", 8453),
    );
    const direct = mockClient({
      respond: directHook((skipSplits) => swapSpec({ skipSplits })),
      rulesetMetadata: omnichainRuleset,
      extraDataHook: { dataHook: buybackHook, useDataHookForPay: true },
    });
    expect((await prepareUserPay(direct.client, args)).metadata).toEqual(
      buildUserPayMetadata({
        chainId: 8453,
        minimumSwapAmountOut: 9_900n,
        hook: buybackHook,
      }),
    );
    expect(
      direct.calls.find((c) => c.functionName === "extraDataHookOf")!.args,
    ).toEqual([projectId, 9n]);
    const viaRegistry = mockClient({
      spec: swapSpec(),
      noop: true,
      rulesetMetadata: omnichainRuleset,
      extraDataHook: { dataHook: registry, useDataHookForPay: true },
    });
    expect((await prepareUserPay(viaRegistry.client, args)).metadata).toEqual(
      buildUserPayMetadata({ chainId: 8453, minimumSwapAmountOut: 9_900n }),
    );
    expect(sentMetadata(viaRegistry.calls)).toHaveLength(2);
  });
});

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
    outputs: [],
  },
] as const;
