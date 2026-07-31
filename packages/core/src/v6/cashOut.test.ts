import {
  PublicClient,
  decodeAbiParameters,
  encodeAbiParameters,
  encodeFunctionData,
  sliceHex,
} from "viem";
import { describe, expect, test } from "vitest";
import { NATIVE_TOKEN, ONE_ETHER } from "../constants.js";
import { jbTerminalStoreAbi } from "../generated/juicebox.js";
import {
  build721CashOutMetadata,
  buildBuybackCashOutMetadata,
  buildCashOutTx,
  cashOutPoolBufferBps,
  cashOutProtocolFee,
  chooseBestCashOutRoute,
  classifyCashOutExecutionError,
  decodeBuybackCashOutSpec,
  getBestCashOutRoute,
  getCashOutQuote,
  getHookAwareCashOutQuote,
  prepareBestCashOut,
  prepareHookAwareCashOut,
  resolveCashOutRoute,
  slippageFloor,
} from "./cashOut.js";
import { v6Address } from "./types.js";
import { hookMetadataId } from "../utils/hook.js";

const chainId = 11155111;
const terminal = "0x1111111111111111111111111111111111111111" as const;
const holder = "0x2222222222222222222222222222222222222222" as const;
const beneficiary = "0x3333333333333333333333333333333333333333" as const;
const projectId = 3n;

describe("cashOut", () => {
  test("buildCashOutTx encodes cashOutTokensOf", () => {
    const tx = buildCashOutTx({
      chainId,
      terminal,
      holder,
      projectId,
      cashOutCount: ONE_ETHER,
      tokenToReclaim: NATIVE_TOKEN,
      beneficiary,
    });

    expect(tx.chainId).toEqual(chainId);
    expect(tx.address).toEqual(terminal);
    expect(tx.functionName).toEqual("cashOutTokensOf");
    expect(tx.args).toEqual([
      holder,
      projectId,
      ONE_ETHER,
      NATIVE_TOKEN,
      0n,
      beneficiary,
      "0x",
    ]);
    expect(() => encodeFunctionData(tx)).not.toThrow();
  });

  test("buildCashOutTx passes minTokensReclaimed and metadata through", () => {
    const tx = buildCashOutTx({
      chainId,
      terminal,
      holder,
      projectId,
      cashOutCount: ONE_ETHER,
      tokenToReclaim: NATIVE_TOKEN,
      minTokensReclaimed: 999n,
      beneficiary,
      metadata: "0x1234",
    });

    expect(tx.args[4]).toEqual(999n);
    expect(tx.args[6]).toEqual("0x1234");
    expect(() => encodeFunctionData(tx)).not.toThrow();
  });

  test("getCashOutQuote reads the terminal store and applies the 2.5% fee", async () => {
    const calls: any[] = [];
    const client = {
      async readContract(params: unknown) {
        calls.push(params);
        return ONE_ETHER;
      },
    } as unknown as PublicClient;

    const quote = await getCashOutQuote(client, {
      chainId,
      projectId,
      cashOutCount: ONE_ETHER,
    });

    expect(quote.reclaimAmount).toEqual(ONE_ETHER);
    expect(quote.reclaimAmountAfterFee).toEqual(975000000000000000n);

    expect(calls[0].address).toEqual(v6Address("JBTerminalStore", chainId));
    expect(calls[0].abi).toBe(jbTerminalStoreAbi);
    expect(calls[0].functionName).toEqual("currentReclaimableSurplusOf");
    // Empty terminal/token arrays use all of the project's terminals and tokens;
    // defaults quote 18 decimals in the native token's currency.
    expect(calls[0].args).toEqual([projectId, ONE_ETHER, [], [], 18n, 61166n]);
  });

  test("getCashOutQuote respects custom decimals and currency", async () => {
    const calls: any[] = [];
    const client = {
      async readContract(params: unknown) {
        calls.push(params);
        return 0n;
      },
    } as unknown as PublicClient;

    await getCashOutQuote(client, {
      chainId,
      projectId,
      cashOutCount: ONE_ETHER,
      decimals: 6n,
      currency: 0x3606eb48n,
    });

    expect(calls[0].args).toEqual([
      projectId,
      ONE_ETHER,
      [],
      [],
      6n,
      0x3606eb48n,
    ]);
  });

  test("build721CashOutMetadata packs the cashOut id and token ids", () => {
    // With a target whose first 4 bytes are zero, the id is the first 4 bytes
    // of keccak256("cashOut").
    const metadata = build721CashOutMetadata({
      metadataIdTarget: "0x00000000000000000000000000000000DeaDBeef",
      tokenIds: [1_000_000_001n, 1_000_000_002n],
    });

    expect(sliceHex(metadata, 0, 32)).toEqual(`0x${"00".repeat(32)}`);
    // keccak256("cashOut") first 4 bytes, then the payload word offset (2).
    expect(sliceHex(metadata, 32, 36)).toEqual("0x86b14ff4");
    expect(sliceHex(metadata, 36, 37)).toEqual("0x02");
    const [tokenIds] = decodeAbiParameters(
      [{ type: "uint256[]" }],
      sliceHex(metadata, 64),
    );
    expect(tokenIds).toEqual([1_000_000_001n, 1_000_000_002n]);
  });

  test("build721CashOutMetadata rejects empty, duplicate, and zero token ids", () => {
    const target = "0x00000000000000000000000000000000DeaDBeef" as const;
    expect(() =>
      build721CashOutMetadata({ metadataIdTarget: target, tokenIds: [] }),
    ).toThrow(/at least one/);
    expect(() =>
      build721CashOutMetadata({ metadataIdTarget: target, tokenIds: [1n, 1n] }),
    ).toThrow(/unique/);
    expect(() =>
      build721CashOutMetadata({ metadataIdTarget: target, tokenIds: [0n] }),
    ).toThrow(/positive/);
  });
});

describe("hook-aware cash-out routing", () => {
  const hook = "0x4444444444444444444444444444444444444444" as const;
  const poolId = `0x${"12".repeat(32)}` as const;

  function specMetadata(
    params: {
      minimumSwap?: bigint;
      netDirect?: bigint;
      rawQuote?: bigint;
      userSpecified?: boolean;
    } = {},
  ) {
    return encodeAbiParameters(
      [
        { type: "uint256" },
        { type: "uint256" },
        { type: "uint256" },
        { type: "int24" },
        { type: "uint128" },
        { type: "bytes32" },
        { type: "uint256" },
        { type: "bool" },
      ],
      [
        params.minimumSwap ?? 1_100n,
        100n,
        params.netDirect ?? 900n,
        -123,
        456n,
        poolId,
        params.rawQuote ?? 1_200n,
        params.userSpecified ?? false,
      ],
    );
  }

  test("slippageFloor floors but never zeroes a positive quote", () => {
    expect(slippageFloor(1_000n, 100n)).toEqual(990n);
    expect(slippageFloor(1n, 100n)).toEqual(1n);
    expect(slippageFloor(0n, 100n)).toEqual(0n);
    expect(() => slippageFloor(1_000n, 10_000n)).toThrow();
  });

  test("cashOutProtocolFee matches the terminal's exact /40 rounding", () => {
    // 1001 / 40 = 25 exactly as the contract floors it; the legacy
    // ×975/1000 estimate yields net 975 — one wei below the true 976.
    expect(
      cashOutProtocolFee({ reclaimAmount: 1_001n, cashOutTaxRate: 1n }),
    ).toEqual(25n);
    expect(
      cashOutProtocolFee({ reclaimAmount: 1_000n, cashOutTaxRate: 0n }),
    ).toEqual(0n);
    expect(
      cashOutProtocolFee({
        reclaimAmount: 1_000n,
        cashOutTaxRate: 0n,
        feeFreeSurplus: 400n,
      }),
    ).toEqual(10n);
    expect(
      cashOutProtocolFee({
        reclaimAmount: 1_000n,
        cashOutTaxRate: 1n,
        beneficiaryIsFeeless: true,
      }),
    ).toEqual(0n);
  });

  test("treasury route floors the exact fee-adjusted net", () => {
    const route = resolveCashOutRoute({
      reclaimAmount: 1_000n,
      cashOutTaxRate: 1n,
      hookSpecifications: [],
    });
    expect(route.route).toEqual("treasury");
    expect(route.treasuryProtocolFee).toEqual(25n);
    expect(route.expectedReturn).toEqual(975n);
    expect(route.terminalMinimum).toEqual(965n);
    expect(route.metadata).toEqual("0x");
  });

  test("amm route moves the floor into hook metadata with zero terminal minimum", () => {
    const route = resolveCashOutRoute({
      reclaimAmount: 0n,
      cashOutTaxRate: 10_000n,
      hookSpecifications: [
        { hook, noop: false, amount: 0n, metadata: specMetadata() },
      ],
      buybackHookAddress: hook,
    });
    expect(route.route).toEqual("amm");
    expect(route.expectedReturn).toEqual(1_200n);
    expect(route.minimumReturn).toEqual(1_089n);
    expect(route.terminalMinimum).toEqual(0n);
    expect(route.metadata).toEqual(
      buildBuybackCashOutMetadata({ hook, minimumSwapAmountOut: 1_089n }),
    );
  });

  test("re-previewed explicit floor is preserved, not double-discounted", () => {
    const route = resolveCashOutRoute({
      reclaimAmount: 0n,
      cashOutTaxRate: 10_000n,
      hookSpecifications: [
        {
          hook,
          noop: false,
          amount: 0n,
          metadata: specMetadata({
            minimumSwap: 1_188n,
            rawQuote: 0n,
            userSpecified: true,
          }),
        },
      ],
      buybackHookAddress: hook,
    });
    expect(route.route).toEqual("amm");
    expect(route.minimumReturn).toEqual(1_188n);
  });

  test("uses the executable pool quote rather than the optimistic raw quote", () => {
    const route = resolveCashOutRoute({
      reclaimAmount: 1_510_000n,
      cashOutTaxRate: 1n,
      hookSpecifications: [
        {
          hook,
          noop: false,
          amount: 0n,
          metadata: specMetadata({
            minimumSwap: 16_000_000n,
            netDirect: 1_470_000n,
            rawQuote: 16_419_630n,
          }),
        },
      ],
      buybackHookAddress: hook,
      slippageBps: 100n,
    });

    expect(route.route).toEqual("amm");
    expect(route.expectedReturn).toEqual(16_419_630n);
    expect(route.minimumReturn).toEqual(15_840_000n);
    expect(cashOutPoolBufferBps(route)).toEqual(256n);
    expect(route.metadata).toEqual(
      buildBuybackCashOutMetadata({
        hook,
        minimumSwapAmountOut: 15_840_000n,
      }),
    );
  });

  test("noop spec stays on the treasury path", () => {
    const route = resolveCashOutRoute({
      reclaimAmount: 1_000n,
      cashOutTaxRate: 1n,
      hookSpecifications: [
        { hook, noop: true, amount: 0n, metadata: specMetadata() },
      ],
      buybackHookAddress: hook,
    });
    expect(route.route).toEqual("treasury");
    expect(route.metadata).toEqual("0x");
    expect(route.expectedReturn).toEqual(975n);
    expect(route.buyback?.hook).toEqual(hook);
  });

  test("amm route without safe market advantage falls back to treasury", () => {
    // Floored pool quote (990) does not beat the direct net (995): an
    // explicit metadata minimum would re-route to the terminal path anyway.
    const route = resolveCashOutRoute({
      reclaimAmount: 1_000n,
      cashOutTaxRate: 1n,
      hookSpecifications: [
        {
          hook,
          noop: false,
          amount: 0n,
          metadata: specMetadata({ rawQuote: 1_000n, netDirect: 995n }),
        },
      ],
      buybackHookAddress: hook,
    });
    expect(route.route).toEqual("treasury");
    expect(route.terminalMinimum).toEqual(965n);
  });

  test("buyback cashOut metadata envelope roundtrips", () => {
    const metadata = buildBuybackCashOutMetadata({
      hook,
      minimumSwapAmountOut: 123n,
      skip: true,
    });
    // 32-byte reserved word, then the id/offset table entry.
    expect(sliceHex(metadata, 0, 32)).toEqual(`0x${"00".repeat(32)}`);
    expect(sliceHex(metadata, 32, 36)).toEqual(hookMetadataId(hook, "cashOut"));
    const [minimum, skip] = decodeAbiParameters(
      [{ type: "uint256" }, { type: "bool" }],
      sliceHex(metadata, 64),
    );
    expect(minimum).toEqual(123n);
    expect(skip).toEqual(true);
  });

  test("decodeBuybackCashOutSpec decodes the diagnostic payload", () => {
    const spec = decodeBuybackCashOutSpec(
      specMetadata({ minimumSwap: 5n, netDirect: 7n, rawQuote: 9n }),
    );
    expect(spec.minimumSwapAmountOut).toEqual(5n);
    expect(spec.netDirectCashOutAmount).toEqual(7n);
    expect(spec.rawSwapQuote).toEqual(9n);
    expect(spec.poolId).toEqual(poolId);
    expect(spec.twapTick).toEqual(-123);
  });

  test("spec from a non-buyback hook is never selected as the amm route", () => {
    // A 721 tiers hook (or any other data-hook-returned specification) can
    // carry metadata that garbage-decodes to plausible buyback values. It must
    // NOT be routed as a pool sell with a zero terminal minimum.
    const route = resolveCashOutRoute({
      reclaimAmount: 1_000n,
      cashOutTaxRate: 1n,
      hookSpecifications: [
        { hook, noop: false, amount: 0n, metadata: specMetadata() },
      ],
      buybackHookAddress: "0x5555555555555555555555555555555555555555",
    });
    expect(route.route).toEqual("treasury");
    expect(route.terminalMinimum).toEqual(965n);
    expect(route.metadata).toEqual("0x");
    expect(route.buyback).toBeNull();
  });

  test("without a buyback hook address no spec is trusted as the amm route", () => {
    const route = resolveCashOutRoute({
      reclaimAmount: 1_000n,
      cashOutTaxRate: 1n,
      hookSpecifications: [
        { hook, noop: false, amount: 0n, metadata: specMetadata() },
      ],
    });
    expect(route.route).toEqual("treasury");
    expect(route.terminalMinimum).toEqual(965n);
    expect(route.metadata).toEqual("0x");
    expect(route.buyback).toBeNull();
  });

  test("buyback spec is matched by address, case-insensitively", () => {
    // Checksummed on-chain hook vs lowercase address-book entry.
    const checksummed = "0xAbCdaBCDabcDabcdaBcdABCdaBCDAbCDaBcDABcd" as const;
    const route = resolveCashOutRoute({
      reclaimAmount: 0n,
      cashOutTaxRate: 10_000n,
      hookSpecifications: [
        {
          hook: checksummed,
          noop: false,
          amount: 0n,
          metadata: specMetadata(),
        },
      ],
      buybackHookAddress: "0xabcdabcdabcdabcdabcdabcdabcdabcdabcdabcd",
    });
    expect(route.route).toEqual("amm");
    expect(route.terminalMinimum).toEqual(0n);
    expect(route.buyback?.hook).toEqual(checksummed);
  });

  test("mixed specs select the buyback one by address, not position", () => {
    const otherHook = "0x6666666666666666666666666666666666666666" as const;
    const route = resolveCashOutRoute({
      reclaimAmount: 0n,
      cashOutTaxRate: 10_000n,
      hookSpecifications: [
        // A non-buyback spec listed first, with metadata that happens to
        // decode: the legacy first-with-metadata heuristic picked this one.
        {
          hook: otherHook,
          noop: false,
          amount: 0n,
          metadata: specMetadata({ rawQuote: 9_999n }),
        },
        { hook, noop: false, amount: 0n, metadata: specMetadata() },
      ],
      buybackHookAddress: hook,
    });
    expect(route.route).toEqual("amm");
    expect(route.expectedReturn).toEqual(1_200n);
    expect(route.buyback?.hook).toEqual(hook);
    expect(route.metadata).toEqual(
      buildBuybackCashOutMetadata({ hook, minimumSwapAmountOut: 1_089n }),
    );
  });

  test("classifies nested cash-out execution errors without owning UI copy", () => {
    expect(
      classifyCashOutExecutionError({
        message: "execution reverted",
        cause: { details: "reverted with signature 0xe2d708a9" },
      }),
    ).toEqual({
      code: "BUYBACK_SLIPPAGE_EXCEEDED",
      selector: "0xe2d708a9",
    });
    expect(
      classifyCashOutExecutionError({
        cause: { errorName: "JBMultiTerminal_UnderMin" },
      }),
    ).toEqual({ code: "TERMINAL_UNDER_MIN", selector: "0x6b2bb382" });
    expect(
      classifyCashOutExecutionError(new Error("user rejected")),
    ).toBeNull();
  });

  test("chooses a direct sale only for claimed tokens with a strictly better protected output", () => {
    const cashOut = resolveCashOutRoute({
      reclaimAmount: 1_000n,
      cashOutTaxRate: 1n,
      hookSpecifications: [],
    });
    const poolKey = {
      currency0: holder,
      currency1: "0x0000000000000000000000000000000000000000",
      fee: 10_000,
      tickSpacing: 200,
      hooks: hook,
    } as const;

    expect(
      chooseBestCashOutRoute({
        cashOut,
        directSwapQuote: 1_000n,
        directSwapPoolKey: poolKey,
        directSwapZeroForOne: true,
        spendableProjectTokenCount: 100n,
        cashOutCount: 100n,
      }),
    ).toMatchObject({
      kind: "direct-swap",
      expectedReturn: 1_000n,
      minimumReturn: 990n,
    });
    expect(
      chooseBestCashOutRoute({
        cashOut,
        directSwapQuote: 1_000n,
        directSwapPoolKey: poolKey,
        directSwapZeroForOne: true,
        spendableProjectTokenCount: 99n,
        cashOutCount: 100n,
      }).kind,
    ).toEqual("cash-out");
    expect(
      chooseBestCashOutRoute({
        cashOut,
        directSwapQuote: 980n,
        directSwapPoolKey: poolKey,
        directSwapZeroForOne: true,
        spendableProjectTokenCount: 100n,
        cashOutCount: 100n,
      }).kind,
    ).toEqual("cash-out");
  });

  test("quotes and prepares a direct native-pair sale when it safely beats cashing out", async () => {
    const projectToken = "0x7777777777777777777777777777777777777777" as const;
    const poolKey = {
      currency0: "0x0000000000000000000000000000000000000000",
      currency1: projectToken,
      fee: 10_000,
      tickSpacing: 200,
      hooks: hook,
    } as const;
    const calls: string[] = [];
    const client = {
      readContract: async (call: { functionName: string }) => {
        calls.push(call.functionName);
        if (call.functionName === "previewCashOutFrom") {
          return [{ id: 42n }, 1_000n, 1n, []];
        }
        throw new Error(`unexpected call ${call.functionName}`);
      },
      call: async () => {
        calls.push("quoteExactInputSingle");
        return {
          data: encodeAbiParameters(
            [{ type: "uint256" }, { type: "uint256" }],
            [1_200n, 50_000n],
          ),
        };
      },
    } as unknown as PublicClient;
    const args = {
      chainId,
      projectId,
      holder,
      cashOutCount: 100n,
      tokenToReclaim: NATIVE_TOKEN,
      directSwap: {
        poolKey,
        projectToken,
        spendableProjectTokenCount: 100n,
      },
    } as const;

    const best = await getBestCashOutRoute(client, args);
    expect(best).toMatchObject({
      kind: "direct-swap",
      expectedReturn: 1_200n,
      minimumReturn: 1_188n,
      zeroForOne: false,
    });

    const prepared = await prepareBestCashOut(client, {
      ...args,
      beneficiary,
      directSwapDeadline: 123_456n,
    });
    expect(prepared.kind).toEqual("direct-swap");
    if (prepared.kind !== "direct-swap") throw new Error("expected swap");
    expect(prepared.transaction.functionName).toEqual("execute");
    expect(prepared.transaction.args[2]).toEqual(123_456n);
    expect(prepared.route.minimumReturn).toEqual(1_188n);
    expect(calls).toEqual([
      "previewCashOutFrom",
      "quoteExactInputSingle",
      "previewCashOutFrom",
      "quoteExactInputSingle",
    ]);
  });

  test("does not quote a pool whose output is not the reclaim token", async () => {
    const projectToken = "0x7777777777777777777777777777777777777777" as const;
    let poolCalls = 0;
    const client = {
      readContract: async () => [{ id: 42n }, 1_000n, 1n, []],
      call: async () => {
        poolCalls += 1;
        throw new Error("should not quote");
      },
    } as unknown as PublicClient;
    const best = await getBestCashOutRoute(client, {
      chainId,
      projectId,
      holder,
      cashOutCount: 100n,
      tokenToReclaim: NATIVE_TOKEN,
      directSwap: {
        projectToken,
        spendableProjectTokenCount: 100n,
        poolKey: {
          currency0: projectToken,
          currency1: beneficiary,
          fee: 10_000,
          tickSpacing: 200,
          hooks: hook,
        },
      },
    });
    expect(best.kind).toEqual("cash-out");
    expect(poolCalls).toEqual(0);
  });

  test("falls back to the terminal when the optional direct-swap quoter fails", async () => {
    const projectToken = "0x7777777777777777777777777777777777777777" as const;
    const client = {
      readContract: async () => [{ id: 42n }, 1_000n, 1n, []],
      call: async () => {
        throw new Error("quoter unavailable");
      },
    } as unknown as PublicClient;
    const best = await getBestCashOutRoute(client, {
      chainId,
      projectId,
      holder,
      cashOutCount: 100n,
      tokenToReclaim: NATIVE_TOKEN,
      directSwap: {
        projectToken,
        spendableProjectTokenCount: 100n,
        poolKey: {
          currency0: projectToken,
          currency1: "0x0000000000000000000000000000000000000000",
          fee: 10_000,
          tickSpacing: 200,
          hooks: hook,
        },
      },
    });
    expect(best).toMatchObject({
      kind: "cash-out",
      expectedReturn: 975n,
      minimumReturn: 965n,
    });
  });

  test("getHookAwareCashOutQuote reads previewCashOutFrom and resolves", async () => {
    const calls: { functionName: string }[] = [];
    const client = {
      readContract: async (call: {
        functionName: string;
        args: readonly unknown[];
      }) => {
        calls.push(call);
        if (call.functionName === "previewCashOutFrom") {
          return [{}, 1_000n, 1n, []];
        }
        throw new Error(`unexpected call ${call.functionName}`);
      },
    } as unknown as PublicClient;

    const route = await getHookAwareCashOutQuote(client, {
      chainId,
      projectId,
      holder,
      cashOutCount: ONE_ETHER,
      tokenToReclaim: NATIVE_TOKEN,
    });
    expect(calls.map((call) => call.functionName)).toEqual([
      "previewCashOutFrom",
    ]);
    expect(route.route).toEqual("treasury");
    expect(route.expectedReturn).toEqual(975n);
    expect(route.terminalMinimum).toEqual(965n);
  });

  test("getHookAwareCashOutQuote routes to amm only for the chain's buyback hook", async () => {
    const buybackHook = v6Address("JBBuybackHook", chainId);
    const clientFor = (specHook: string) =>
      ({
        readContract: async (call: { functionName: string }) => {
          if (call.functionName === "previewCashOutFrom") {
            return [
              {},
              1_000n,
              1n,
              [
                {
                  hook: specHook,
                  noop: false,
                  amount: 0n,
                  metadata: specMetadata(),
                },
              ],
            ];
          }
          throw new Error(`unexpected call ${call.functionName}`);
        },
      }) as unknown as PublicClient;

    // The chain's canonical buyback hook wins the pool route.
    const ammRoute = await getHookAwareCashOutQuote(clientFor(buybackHook), {
      chainId,
      projectId,
      holder,
      cashOutCount: ONE_ETHER,
      tokenToReclaim: NATIVE_TOKEN,
    });
    expect(ammRoute.route).toEqual("amm");
    expect(ammRoute.terminalMinimum).toEqual(0n);
    expect(ammRoute.buyback?.hook).toEqual(buybackHook);

    // Any other hook's spec stays on the treasury path with a real minimum.
    const treasuryRoute = await getHookAwareCashOutQuote(
      clientFor("0x9999999999999999999999999999999999999999"),
      {
        chainId,
        projectId,
        holder,
        cashOutCount: ONE_ETHER,
        tokenToReclaim: NATIVE_TOKEN,
      },
    );
    expect(treasuryRoute.route).toEqual("treasury");
    expect(treasuryRoute.terminalMinimum).toEqual(965n);
    expect(treasuryRoute.metadata).toEqual("0x");
    expect(treasuryRoute.buyback).toBeNull();
  });

  test("prepareHookAwareCashOut locks the pool route and builds its transaction", async () => {
    const buybackHook = v6Address("JBBuybackHook", chainId);
    const calls: { functionName: string; args: readonly unknown[] }[] = [];
    const client = {
      readContract: async (call: {
        functionName: string;
        args: readonly unknown[];
      }) => {
        calls.push(call);
        if (call.functionName !== "previewCashOutFrom") {
          throw new Error(`unexpected call ${call.functionName}`);
        }
        const metadata = call.args[5];
        return [
          { id: 42n },
          0n,
          10_000n,
          [
            {
              hook: buybackHook,
              noop: false,
              amount: 0n,
              metadata:
                metadata === "0x"
                  ? specMetadata()
                  : specMetadata({
                      minimumSwap: 1_089n,
                      rawQuote: 0n,
                      userSpecified: true,
                    }),
            },
          ],
        ];
      },
    } as unknown as PublicClient;

    const prepared = await prepareHookAwareCashOut(client, {
      chainId,
      projectId,
      holder,
      cashOutCount: ONE_ETHER,
      tokenToReclaim: NATIVE_TOKEN,
      beneficiary,
    });

    expect(calls).toHaveLength(2);
    expect(prepared.preview.rulesetId).toEqual(42n);
    expect(prepared.lockedPreview?.rulesetId).toEqual(42n);
    expect(prepared.route.route).toEqual("amm");
    expect(prepared.route.minimumReturn).toEqual(1_089n);
    expect(prepared.transaction.args[4]).toEqual(0n);
    expect(prepared.transaction.args[5]).toEqual(beneficiary);
    expect(prepared.transaction.args[6]).toEqual(prepared.route.metadata);
  });

  test("prepareHookAwareCashOut rejects a route which changes while locking", async () => {
    const buybackHook = v6Address("JBBuybackHook", chainId);
    let previewCount = 0;
    const client = {
      readContract: async (call: { functionName: string }) => {
        if (call.functionName !== "previewCashOutFrom") {
          throw new Error(`unexpected call ${call.functionName}`);
        }
        previewCount += 1;
        return [
          { id: 42n },
          previewCount === 1 ? 0n : 1_000n,
          previewCount === 1 ? 10_000n : 1n,
          previewCount === 1
            ? [
                {
                  hook: buybackHook,
                  noop: false,
                  amount: 0n,
                  metadata: specMetadata(),
                },
              ]
            : [],
        ];
      },
    } as unknown as PublicClient;

    await expect(
      prepareHookAwareCashOut(client, {
        chainId,
        projectId,
        holder,
        cashOutCount: ONE_ETHER,
        tokenToReclaim: NATIVE_TOKEN,
      }),
    ).rejects.toMatchObject({ code: "CASH_OUT_ROUTE_CHANGED" });
  });
});
