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
  cashOutProtocolFee,
  decodeBuybackCashOutSpec,
  getCashOutQuote,
  getHookAwareCashOutQuote,
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
    expect(cashOutProtocolFee({ reclaimAmount: 1_000n, cashOutTaxRate: 0n })).toEqual(
      0n,
    );
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
    });
    expect(route.route).toEqual("amm");
    expect(route.expectedReturn).toEqual(1_200n);
    expect(route.minimumReturn).toEqual(1_188n);
    expect(route.terminalMinimum).toEqual(0n);
    expect(route.metadata).toEqual(
      buildBuybackCashOutMetadata({ hook, minimumSwapAmountOut: 1_188n }),
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
    });
    expect(route.route).toEqual("amm");
    expect(route.minimumReturn).toEqual(1_188n);
  });

  test("noop spec stays on the treasury path", () => {
    const route = resolveCashOutRoute({
      reclaimAmount: 1_000n,
      cashOutTaxRate: 1n,
      hookSpecifications: [
        { hook, noop: true, amount: 0n, metadata: specMetadata() },
      ],
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

  test("getHookAwareCashOutQuote reads previewCashOutFrom and resolves", async () => {
    const calls: { functionName: string }[] = [];
    const client = {
      readContract: async (call: {
        functionName: string;
        args: readonly unknown[];
      }) => {
        calls.push(call);
        if (call.functionName === "previewCashOutFrom") {
          return [
            {},
            1_000n,
            1n,
            [],
          ];
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
});
