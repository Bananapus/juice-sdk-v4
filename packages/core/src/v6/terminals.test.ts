import { PublicClient, zeroAddress } from "viem";
import { describe, expect, test } from "vitest";
import { NATIVE_TOKEN } from "../constants.js";
import { jbDirectoryAbi, jbMultiTerminalAbi } from "../generated/juicebox.js";
import { getAccountingContexts, resolvePaymentTerminal } from "./terminals.js";
import { v6Address } from "./types.js";

const chainId = 11155111;
const projectId = 3n;

function mockClient(result: unknown, calls: unknown[] = []) {
  return {
    async readContract(params: unknown) {
      calls.push(params);
      return result;
    },
  } as unknown as PublicClient;
}

describe("terminals", () => {
  test("resolvePaymentTerminal returns the primary terminal when set", async () => {
    const terminal = "0x1111111111111111111111111111111111111111";
    const calls: any[] = [];

    const resolved = await resolvePaymentTerminal(mockClient(terminal, calls), {
      chainId,
      projectId,
      token: NATIVE_TOKEN,
    });

    expect(resolved).toEqual({ address: terminal, isRouter: false });
    expect(calls[0].address).toEqual(v6Address("JBDirectory", chainId));
    expect(calls[0].abi).toBe(jbDirectoryAbi);
    expect(calls[0].functionName).toEqual("primaryTerminalOf");
    expect(calls[0].args).toEqual([projectId, NATIVE_TOKEN]);
  });

  test("resolvePaymentTerminal falls back to the router registry", async () => {
    const resolved = await resolvePaymentTerminal(mockClient(zeroAddress), {
      chainId,
      projectId,
      token: NATIVE_TOKEN,
    });

    expect(resolved).toEqual({
      address: v6Address("JBRouterTerminalRegistry", chainId),
      isRouter: true,
    });
  });

  test("getAccountingContexts reads the multi terminal", async () => {
    const contexts = [{ token: NATIVE_TOKEN, decimals: 18, currency: 61166 }];
    const calls: any[] = [];

    const result = await getAccountingContexts(mockClient(contexts, calls), {
      chainId,
      projectId,
    });

    expect(result).toEqual(contexts);
    expect(calls[0].address).toEqual(v6Address("JBMultiTerminal", chainId));
    expect(calls[0].abi).toBe(jbMultiTerminalAbi);
    expect(calls[0].functionName).toEqual("accountingContextsOf");
    expect(calls[0].args).toEqual([projectId]);
  });
});
