import {
  PublicClient,
  decodeAbiParameters,
  encodeFunctionData,
  sliceHex,
} from "viem";
import { describe, expect, test } from "vitest";
import { NATIVE_TOKEN, ONE_ETHER } from "../constants.js";
import { jbTerminalStoreAbi } from "../generated/juicebox.js";
import {
  build721CashOutMetadata,
  buildCashOutTx,
  getCashOutQuote,
} from "./cashOut.js";
import { v6Address } from "./types.js";

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
