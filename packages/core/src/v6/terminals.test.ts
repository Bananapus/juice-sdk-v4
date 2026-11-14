import { Address, PublicClient, zeroAddress } from "viem";
import { describe, expect, test, vi } from "vitest";
import { NATIVE_TOKEN } from "../constants.js";
import {
  jbContractAddressHistory,
  jbDirectoryAbi,
  jbMultiTerminalAbi,
  jbRouterTerminalGatewayAbi,
  jbRouterTerminalRegistryAbi,
} from "../generated/juicebox.js";
import {
  getAccountingContexts,
  resolvePaymentTerminal,
  resolveProjectRouterTerminal,
  resolveRouterPath,
} from "./terminals.js";
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

function mockRouteClient(...results: (Address | Error)[]) {
  const readContract = vi.fn();
  for (const result of results) {
    if (result instanceof Error) readContract.mockRejectedValueOnce(result);
    else readContract.mockResolvedValueOnce(result);
  }
  return {
    client: { readContract } as unknown as PublicClient,
    readContract,
  };
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

  test("resolveRouterPath preserves the registry's unresolved result", async () => {
    const { client, readContract } = mockRouteClient(zeroAddress);
    const registry = v6Address("JBRouterTerminalRegistry", chainId);

    expect(await resolveRouterPath(client, { chainId, projectId })).toEqual({
      status: "unresolved",
      registry,
      terminal: null,
      gateway: null,
      router: null,
    });
    expect(readContract).toHaveBeenCalledExactlyOnceWith({
      address: registry,
      abi: jbRouterTerminalRegistryAbi,
      functionName: "terminalOf",
      args: [projectId],
    });
  });

  test("resolveRouterPath recognizes the current router regardless of address casing", async () => {
    const router = v6Address("JBRouterTerminal", chainId);
    const terminal = `0x${router.slice(2).toUpperCase()}` as Address;
    const { client, readContract } = mockRouteClient(terminal);

    expect(await resolveRouterPath(client, { chainId, projectId })).toEqual({
      status: "direct",
      registry: v6Address("JBRouterTerminalRegistry", chainId),
      terminal,
      gateway: null,
      router: terminal,
    });
    expect(readContract).toHaveBeenCalledTimes(1);
  });

  test.each(["previous", "v1"] as const)(
    "resolveRouterPath recognizes a project still using the %s router",
    async (generation) => {
      const terminal =
        jbContractAddressHistory["6"].JBRouterTerminal[generation][chainId];
      const { client, readContract } = mockRouteClient(terminal);

      expect(await resolveRouterPath(client, { chainId, projectId })).toEqual({
        status: "direct",
        registry: v6Address("JBRouterTerminalRegistry", chainId),
        terminal,
        gateway: null,
        router: terminal,
      });
      expect(readContract).toHaveBeenCalledTimes(1);
    },
  );

  test.each([1, 10, 8453, 42161, chainId] as const)(
    "resolveRouterPath unwraps the selected deployed gateway on chain %s",
    async (chainId) => {
      const gateway = v6Address("JBRouterTerminalGateway", chainId);
      const terminal = `0x${gateway.slice(2).toUpperCase()}` as Address;
      const router = v6Address("JBRouterTerminal", chainId);
      const { client, readContract } = mockRouteClient(terminal, router);

      expect(await resolveRouterPath(client, { chainId, projectId })).toEqual({
        status: "gateway",
        registry: v6Address("JBRouterTerminalRegistry", chainId),
        terminal,
        gateway: terminal,
        router,
      });
      expect(readContract).toHaveBeenCalledTimes(2);
      expect(readContract).toHaveBeenNthCalledWith(2, {
        address: terminal,
        abi: jbRouterTerminalGatewayAbi,
        functionName: "ROUTER",
      });
    },
  );

  test("resolveRouterPath preserves unknown terminals without probing their ABI", async () => {
    const terminal = "0x1111111111111111111111111111111111111111";
    const { client, readContract } = mockRouteClient(
      terminal,
      v6Address("JBRouterTerminal", chainId),
    );

    expect(await resolveRouterPath(client, { chainId, projectId })).toEqual({
      status: "unknown",
      registry: v6Address("JBRouterTerminalRegistry", chainId),
      terminal,
      gateway: null,
      router: null,
    });
    expect(readContract).toHaveBeenCalledTimes(1);
  });

  test("resolveRouterPath does not infer a gateway deployment on another chain", async () => {
    // OP Sepolia has a registry but no deployed gateway in these records.
    const otherChainId = 11155420;
    const terminal = v6Address("JBRouterTerminalGateway", chainId);
    const { client, readContract } = mockRouteClient(terminal);

    expect(
      await resolveRouterPath(client, { chainId: otherChainId, projectId }),
    ).toEqual({
      status: "unknown",
      registry: v6Address("JBRouterTerminalRegistry", otherChainId),
      terminal,
      gateway: null,
      router: null,
    });
    expect(readContract).toHaveBeenCalledTimes(1);
  });

  test("resolveRouterPath propagates registry RPC failures", async () => {
    const failure = new Error("registry read failed");
    const { client, readContract } = mockRouteClient(failure);

    await expect(
      resolveRouterPath(client, { chainId, projectId }),
    ).rejects.toBe(failure);
    expect(readContract).toHaveBeenCalledTimes(1);
  });

  test("resolveRouterPath propagates gateway RPC failures", async () => {
    const failure = new Error("gateway read failed");
    const { client, readContract } = mockRouteClient(
      v6Address("JBRouterTerminalGateway", chainId),
      failure,
    );

    await expect(
      resolveRouterPath(client, { chainId, projectId }),
    ).rejects.toBe(failure);
    expect(readContract).toHaveBeenCalledTimes(2);
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

describe("resolveProjectRouterTerminal", () => {
  const registry = v6Address("JBRouterTerminalRegistry", chainId);
  const gateway = v6Address("JBRouterTerminalGateway", chainId);
  const router = v6Address("JBRouterTerminal", chainId);
  const multi = v6Address("JBMultiTerminal", chainId);

  /** A directory listing `terminals`; the registry and the gateway answer their own reads. */
  function clientListing(terminals: Address[], registryTerminal: Address) {
    const readContract = vi.fn(
      async ({ functionName }: { functionName: string }) => {
        if (functionName === "terminalsOf") return terminals;
        if (functionName === "terminalOf") return registryTerminal;
        if (functionName === "ROUTER") return router;
        throw new Error(`unexpected read ${functionName}`);
      },
    );
    return {
      client: { readContract } as unknown as PublicClient,
      reads: () => readContract.mock.calls.map(([call]) => call.functionName),
    };
  }

  test("a project that lists the registry gets the registry's route", async () => {
    const { client } = clientListing([multi, registry], gateway);
    expect(
      await resolveProjectRouterTerminal(client, { chainId, projectId }),
    ).toEqual({
      status: "gateway",
      registry,
      terminal: gateway,
      gateway,
      router,
      via: "registry",
    });
  });

  test("a project that never listed the registry has no route, whatever default the registry names", async () => {
    const { client, reads } = clientListing([multi], gateway);
    expect(
      await resolveProjectRouterTerminal(client, { chainId, projectId }),
    ).toEqual({
      status: "unresolved",
      registry,
      terminal: null,
      gateway: null,
      router: null,
      via: "none",
    });
    expect(reads()).toEqual(["terminalsOf"]);
  });

  test("a project that lists a gateway or router itself uses that terminal", async () => {
    const viaGateway = clientListing([multi, gateway], zeroAddress);
    expect(
      await resolveProjectRouterTerminal(viaGateway.client, {
        chainId,
        projectId,
      }),
    ).toMatchObject({
      status: "gateway",
      terminal: gateway,
      router,
      via: "direct",
    });
    expect(viaGateway.reads()).not.toContain("terminalOf");
    const viaRouter = clientListing([router], zeroAddress);
    expect(
      await resolveProjectRouterTerminal(viaRouter.client, {
        chainId,
        projectId,
      }),
    ).toMatchObject({
      status: "direct",
      terminal: router,
      router,
      via: "direct",
    });
  });

  test("a failed read is an error, never a missing route", async () => {
    const cases: [string, Address[], Address][] = [
      ["terminalsOf", [multi, registry], gateway],
      ["terminalOf", [multi, registry], gateway],
      ["ROUTER", [multi, registry], gateway],
      ["ROUTER", [gateway], zeroAddress],
    ];
    for (const [failing, terminals, registryTerminal] of cases) {
      const readContract = vi.fn(
        async ({ functionName }: { functionName: string }) => {
          if (functionName === failing) throw new Error("rpc down");
          if (functionName === "terminalsOf") return terminals;
          if (functionName === "terminalOf") return registryTerminal;
          return router;
        },
      );
      await expect(
        resolveProjectRouterTerminal(
          { readContract } as unknown as PublicClient,
          { chainId, projectId },
        ),
      ).rejects.toThrow("rpc down");
    }
  });

  test("a listed registry with nothing resolved stays unresolved through the registry", async () => {
    const { client } = clientListing([registry], zeroAddress);
    expect(
      await resolveProjectRouterTerminal(client, { chainId, projectId }),
    ).toMatchObject({ status: "unresolved", via: "registry" });
  });
});
