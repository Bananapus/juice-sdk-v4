import type { Address, PublicClient } from "viem";
import { getAddress } from "viem";
import { describe, expect, test, vi } from "vitest";
import {
  jbContractAddress,
  jbSuckerRegistryAbi,
  jbSuckerRegistryV5Abi,
} from "../generated/juicebox.js";
import { JBSuckerAbi } from "./JBSuckerAbi.js";
import { getSuckerPairs, resolveSuckers } from "./suckerPairs.js";

const localSucker = "0x1000000000000000000000000000000000000001" as Address;
const remoteSucker = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266" as Address;
const peer = "0x3000000000000000000000000000000000000003" as Address;
const paddedRemote = `0x${"0".repeat(24)}${remoteSucker.slice(2)}` as const;

function config(
  readers: Record<number, (request: any) => unknown | Promise<unknown>>,
) {
  const calls: Record<number, any[]> = {};
  const getClient = vi.fn(({ chainId }: { chainId: number }) => {
    calls[chainId] ??= [];
    return {
      readContract: async (request: any) => {
        calls[chainId].push(request);
        const reader = readers[chainId];
        if (!reader) throw new Error(`No client for chain ${chainId}`);
        return reader(request);
      },
    } as unknown as PublicClient;
  });
  return { config: { getClient } as any, calls, getClient };
}

describe("getSuckerPairs", () => {
  test("decodes v6 bytes32 remotes and preserves the peer project identity", async () => {
    const fixture = config({
      1: (request) => {
        expect(request.abi).toBe(jbSuckerRegistryAbi);
        expect(request).toMatchObject({
          address: jbContractAddress["6"].JBSuckerRegistry[1],
          functionName: "suckerPairsOf",
          args: [7n],
        });
        return [
          { local: localSucker, remote: paddedRemote, remoteChainId: 10n },
        ];
      },
      10: (request) => {
        expect(request.abi).toBe(JBSuckerAbi);
        if (request.functionName === "peer") {
          expect(request.address).toBe(getAddress(remoteSucker));
          return peer;
        }
        expect(request).toMatchObject({
          address: peer,
          functionName: "projectId",
        });
        return 91n;
      },
    });

    await expect(
      getSuckerPairs({
        config: fixture.config,
        chainId: 1,
        projectId: 7n,
        version: 6,
      }),
    ).resolves.toEqual([{ peerChainId: 10, projectId: 91n }]);
    expect(fixture.getClient.mock.calls.map(([args]) => args.chainId)).toEqual([
      1, 10,
    ]);
  });

  test("uses the v5 registry ABI and the returned EVM address directly", async () => {
    const fixture = config({
      1: (request) => {
        expect(request.abi).toBe(jbSuckerRegistryV5Abi);
        expect(request.address).toBe(
          jbContractAddress["5"].JBSuckerRegistry[1],
        );
        return [
          { local: localSucker, remote: remoteSucker, remoteChainId: 10n },
        ];
      },
      10: (request) => {
        if (request.functionName === "peer") {
          expect(request.address).toBe(remoteSucker);
          return peer;
        }
        return 12n;
      },
    });

    await expect(
      getSuckerPairs({
        config: fixture.config,
        chainId: 1,
        projectId: 7n,
        version: 5,
      }),
    ).resolves.toEqual([{ peerChainId: 10, projectId: 12n }]);
  });

  test("filters an uninitialized remote peer", async () => {
    const fixture = config({
      1: () => [
        { local: localSucker, remote: paddedRemote, remoteChainId: 10n },
      ],
      10: () => undefined,
    });

    await expect(
      getSuckerPairs({
        config: fixture.config,
        chainId: 1,
        projectId: 7n,
        version: 6,
      }),
    ).resolves.toEqual([]);
    expect(fixture.calls[10]).toHaveLength(1);
  });

  test("propagates registry and peer read failures", async () => {
    const registryFailure = new Error("registry reverted");
    const brokenRegistry = config({
      1: () => {
        throw registryFailure;
      },
    });
    await expect(
      getSuckerPairs({
        config: brokenRegistry.config,
        chainId: 1,
        projectId: 7n,
        version: 6,
      }),
    ).rejects.toBe(registryFailure);

    const peerFailure = new Error("peer unavailable");
    const brokenPeer = config({
      1: () => [
        { local: localSucker, remote: paddedRemote, remoteChainId: 10n },
      ],
      10: () => {
        throw peerFailure;
      },
    });
    await expect(
      getSuckerPairs({
        config: brokenPeer.config,
        chainId: 1,
        projectId: 7n,
        version: 6,
      }),
    ).rejects.toBe(peerFailure);
  });
});

describe("resolveSuckers", () => {
  test("adds transitive peers once and retains exact project IDs", async () => {
    const remoteBackToMainnet =
      "0x5000000000000000000000000000000000000005" as Address;
    const paddedBack = `0x${"0".repeat(24)}${remoteBackToMainnet.slice(2)}`;
    const fixture = config({
      1: (request) => {
        if (request.functionName === "suckerPairsOf") {
          return request.args[0] === 7n
            ? [
                {
                  local: localSucker,
                  remote: paddedRemote,
                  remoteChainId: 10n,
                },
              ]
            : [];
        }
        if (request.functionName === "peer") return peer;
        return 7n;
      },
      10: (request) => {
        if (request.functionName === "suckerPairsOf") {
          return [
            {
              local: remoteSucker,
              remote: paddedBack,
              remoteChainId: 1n,
            },
          ];
        }
        if (request.functionName === "peer") return peer;
        return 91n;
      },
    });

    await expect(
      resolveSuckers({
        config: fixture.config,
        chainId: 1,
        projectId: 7n,
        version: 6,
      }),
    ).resolves.toEqual([
      { peerChainId: 10, projectId: 91n },
      { peerChainId: 1, projectId: 7n },
    ]);
  });

  test("keeps resolved peers when a transitive registry is unavailable", async () => {
    const failure = new Error("remote registry unavailable");
    const fixture = config({
      1: () => [
        { local: localSucker, remote: paddedRemote, remoteChainId: 10n },
      ],
      10: (request) => {
        if (request.functionName === "peer") return peer;
        if (request.functionName === "projectId") return 91n;
        throw failure;
      },
    });
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    await expect(
      resolveSuckers({
        config: fixture.config,
        chainId: 1,
        projectId: 7n,
        version: 6,
      }),
    ).resolves.toEqual([{ peerChainId: 10, projectId: 91n }]);
    expect(error).toHaveBeenCalledWith("peer error", failure);
  });
});
