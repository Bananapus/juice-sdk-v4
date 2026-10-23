import { PublicClient, getContract, isAddressEqual } from "viem";
import { JBSuckerAbi } from "./JBSuckerAbi.js";
import { JBChainId } from "../types.js";
import { getV6SuckerPairs, suckerBytes32ToAddress } from "../v6/suckers.js";
import { useConfig } from "wagmi";

export type SuckerPair = {
  peerChainId: JBChainId;
  projectId: bigint;
};

/**
 * Read a project's directly-paired suckers from the JBSuckerRegistry on `chainId`.
 *
 * The peer project id is read from the remote sucker the registry names, NOT
 * from whatever address the remote sucker's own `peer()` points back at: the
 * two coincide only for the deterministic same-address deployments, and
 * `JBSucker` explicitly supports an overridden peer address. `peer()` is still
 * read, as a symmetry check that the remote sucker is paired back to this
 * project's local sucker, so a stale or misconfigured registry entry fails
 * closed instead of yielding another project's id.
 *
 * Rejects rather than dropping a pair — a silently short group is
 * indistinguishable from a project with fewer chains.
 *
 * Reads Juicebox V6 only, so a page loads the v6 address table and no other.
 */
export async function getSuckerPairs({
  config,
  chainId,
  projectId,
  version,
}: {
  config: ReturnType<typeof useConfig>;
  chainId: JBChainId;
  projectId: bigint;
  version?: 6;
}): Promise<SuckerPair[]> {
  if (version !== undefined && version !== 6) {
    throw new Error(
      `Sucker groups are read for Juicebox V6 only, not V${version}.`,
    );
  }

  const client = config.getClient({ chainId: Number(chainId) }) as PublicClient;
  const suckers = await getV6SuckerPairs(client, { chainId, projectId });

  return Promise.all(
    suckers.map(async (sucker) => {
      const remoteClient = config.getClient({
        chainId: Number(sucker.remoteChainId),
      }) as PublicClient;

      const remoteSucker = getContract({
        address: sucker.remote,
        abi: JBSuckerAbi,
        client: remoteClient,
      });

      const [peer, peerProjectId] = await Promise.all([
        remoteSucker.read.peer(),
        remoteSucker.read.projectId(),
      ]);

      if (!isAddressEqual(suckerBytes32ToAddress(peer), sucker.local)) {
        throw new Error(
          `The sucker at ${sucker.remote} on chain ${sucker.remoteChainId} is not paired back to ${sucker.local}.`,
        );
      }

      return {
        peerChainId: Number(sucker.remoteChainId),
        projectId: peerProjectId,
      } as SuckerPair;
    }),
  );
}

/**
 * Resolve the full sucker group for a project: the local `(chainId, projectId)`
 * itself, its direct peers, and the peers those peers name (one hop of gossip).
 *
 * The local entry is always first, so callers never have to guess whether a
 * given result includes the chain they asked about. Entries are deduped by the
 * whole `(chainId, projectId)` pair — two chains in a group can hold different
 * project ids, and a chain id alone is not an identity.
 *
 * Any registry or sucker read failure rejects. A partially-resolved group would
 * under-count supply, surplus, and balances without any signal to the caller.
 */
export async function resolveSuckers({
  config,
  chainId,
  projectId,
  version,
}: {
  config: ReturnType<typeof useConfig>;
  chainId: JBChainId;
  projectId: bigint;
  version?: 6;
}): Promise<SuckerPair[]> {
  const pairs: SuckerPair[] = [{ peerChainId: chainId, projectId }];
  const seen = new Set([`${chainId}:${projectId}`]);

  const add = (pair: SuckerPair) => {
    const key = `${pair.peerChainId}:${pair.projectId}`;
    if (seen.has(key)) return;
    seen.add(key);
    pairs.push(pair);
  };

  const directPairs = await getSuckerPairs({
    config,
    chainId,
    projectId,
    version,
  });
  directPairs.forEach(add);

  const transitivePairs = await Promise.all(
    directPairs.map((pair) =>
      getSuckerPairs({
        config,
        chainId: pair.peerChainId,
        projectId: pair.projectId,
      }),
    ),
  );
  transitivePairs.flat().forEach(add);

  return pairs;
}
