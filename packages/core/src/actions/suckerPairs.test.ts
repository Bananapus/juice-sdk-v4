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

const paddedLocal = `0x${"0".repeat(24)}${localSucker.slice(2)}` as const;

describe("getSuckerPairs", () => {
  test("reads the peer project id off the remote sucker itself, not its peer()", async () => {
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
        // The peer sucker sits at a different address than the local one, so
        // reading projectId() at peer() on the remote chain would land on the
        // wrong contract entirely.
        expect(request.address).toBe(getAddress(remoteSucker));
        if (request.functionName === "peer") return paddedLocal;
        expect(request.functionName).toBe("projectId");
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
        expect(request.address).toBe(remoteSucker);
        // A v5 `address` return decodes identically under the bytes32 entry.
        if (request.functionName === "peer") return paddedLocal;
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

  test("rejects a cleared remote instead of truncating it to a bogus address", async () => {
    const fixture = config({
      1: () => [
        {
          local: localSucker,
          remote: `0x${"0".repeat(64)}`,
          remoteChainId: 10n,
        },
      ],
    });

    await expect(
      getSuckerPairs({
        config: fixture.config,
        chainId: 1,
        projectId: 7n,
        version: 6,
      }),
    ).rejects.toThrow("does not contain an address");
    expect(fixture.calls[10]).toBeUndefined();
  });

  test("rejects a non-EVM remote instead of truncating it to a bogus address", async () => {
    const fixture = config({
      1: () => [
        {
          local: localSucker,
          remote: `0x${"11".repeat(12)}${remoteSucker.slice(2)}`,
          remoteChainId: 10n,
        },
      ],
    });

    await expect(
      getSuckerPairs({
        config: fixture.config,
        chainId: 1,
        projectId: 7n,
        version: 6,
      }),
    ).rejects.toThrow("is not an EVM address");
  });

  test("rejects a remote sucker that is not paired back to the local one", async () => {
    const fixture = config({
      1: () => [
        { local: localSucker, remote: paddedRemote, remoteChainId: 10n },
      ],
      10: (request) => {
        if (request.functionName === "peer")
          return `0x${"0".repeat(24)}${peer.slice(2)}`;
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
    ).rejects.toThrow("is not paired back to");
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
  // chain 1 (project 7) <-> chain 10 (project 91) <-> chain 8453 (project 55),
  // reached only through chain 10's registry.
  const baseSucker = "0x4000000000000000000000000000000000000004" as Address;
  const opSuckerToBase =
    "0x6000000000000000000000000000000000000006" as Address;
  const pad = (address: Address) => `0x${"0".repeat(24)}${address.slice(2)}`;

  test("puts the local pair first and picks up transitive peers", async () => {
    const fixture = config({
      1: (request) => {
        if (request.functionName === "suckerPairsOf") {
          return [
            {
              local: localSucker,
              remote: pad(remoteSucker),
              remoteChainId: 10n,
            },
          ];
        }
        if (request.functionName === "peer") return pad(remoteSucker);
        return 7n;
      },
      10: (request) => {
        if (request.functionName === "suckerPairsOf") {
          return [
            {
              local: remoteSucker,
              remote: pad(localSucker),
              remoteChainId: 1n,
            },
            {
              local: opSuckerToBase,
              remote: pad(baseSucker),
              remoteChainId: 8453n,
            },
          ];
        }
        if (request.functionName === "peer") return pad(localSucker);
        return 91n;
      },
      8453: (request) => {
        if (request.functionName === "peer") return pad(opSuckerToBase);
        return 55n;
      },
    });

    // The back edge (chain 1, project 7) collapses into the local entry.
    await expect(
      resolveSuckers({
        config: fixture.config,
        chainId: 1,
        projectId: 7n,
        version: 6,
      }),
    ).resolves.toEqual([
      { peerChainId: 1, projectId: 7n },
      { peerChainId: 10, projectId: 91n },
      { peerChainId: 8453, projectId: 55n },
    ]);
  });

  test("keeps a same-chain pair that carries a different project id", async () => {
    const otherLocalSucker =
      "0x7000000000000000000000000000000000000007" as Address;
    const fixture = config({
      1: (request) => {
        if (request.functionName === "suckerPairsOf") {
          return [
            {
              local: localSucker,
              remote: pad(remoteSucker),
              remoteChainId: 10n,
            },
          ];
        }
        if (request.functionName === "peer") return pad(remoteSucker);
        return request.address === otherLocalSucker ? 42n : 7n;
      },
      10: (request) => {
        if (request.functionName === "suckerPairsOf") {
          // Chain 10 also sucks into a DIFFERENT project back on chain 1.
          return [
            {
              local: remoteSucker,
              remote: pad(otherLocalSucker),
              remoteChainId: 1n,
            },
          ];
        }
        if (request.functionName === "peer") return pad(localSucker);
        return 91n;
      },
    });

    // Deduping on peerChainId alone would drop (1, 42) as "already have chain 1".
    await expect(
      resolveSuckers({
        config: fixture.config,
        chainId: 1,
        projectId: 7n,
        version: 6,
      }),
    ).resolves.toEqual([
      { peerChainId: 1, projectId: 7n },
      { peerChainId: 10, projectId: 91n },
      { peerChainId: 1, projectId: 42n },
    ]);
  });

  test("rejects rather than returning a silently truncated group", async () => {
    const failure = new Error("remote registry unavailable");
    const fixture = config({
      1: () => [
        { local: localSucker, remote: paddedRemote, remoteChainId: 10n },
      ],
      10: (request) => {
        if (request.functionName === "peer") return pad(localSucker);
        if (request.functionName === "projectId") return 91n;
        throw failure;
      },
    });

    await expect(
      resolveSuckers({
        config: fixture.config,
        chainId: 1,
        projectId: 7n,
        version: 6,
      }),
    ).rejects.toBe(failure);
  });
});
