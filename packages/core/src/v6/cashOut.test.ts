import { PublicClient, encodeFunctionData } from "viem";
import { describe, expect, test } from "vitest";
import { NATIVE_TOKEN, ONE_ETHER } from "../constants.js";
import { jbTerminalStoreAbi } from "../generated/juicebox.js";
import { buildCashOutTx, getCashOutQuote } from "./cashOut.js";
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
});
