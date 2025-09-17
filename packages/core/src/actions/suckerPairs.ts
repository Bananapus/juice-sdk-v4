import { Address, PublicClient, getContract } from "viem";
import { jbSuckerRegistryAbi } from "../generated/juicebox.js";
import { JBSuckerAbi } from "./JBSuckerAbi.js";
import { JBChainId, JBSuckerContracts, JBVersion } from "../types.js";
import { getJBContractAddress } from "../utils/contracts.js";
import { useConfig } from "wagmi";

export type SuckerPair = {
  peerChainId: JBChainId;
  projectId: bigint;
};

export async function getSuckerPairs({
  config,
  chainId,
  projectId,
  version,
}: {
  config: ReturnType<typeof useConfig>;
  chainId: JBChainId;
  projectId: bigint;
  version: JBVersion;
}): Promise<SuckerPair[]> {
  const jbSuckerRegistry = getJBContractAddress(
    JBSuckerContracts.JBSuckerRegistry,
    version,
    chainId
  );

  const client = config.getClient({ chainId: Number(chainId) }) as PublicClient;
  const suckerRegistry = getContract({
    address: jbSuckerRegistry,
    abi: jbSuckerRegistryAbi,
    client,
  });
  const suckers = await suckerRegistry.read.suckerPairsOf([projectId]);

  const suckerPairs = await Promise.all(
    suckers.map(async (sucker) => {
      const client = config.getClient({
        chainId: Number(sucker.remoteChainId),
      }) as PublicClient;

      const suckerContract = getContract({
        address: sucker.remote,
        abi: JBSuckerAbi,
        client,
      });

      const peer = (await suckerContract.read.peer()) as Address | undefined;
      if (!peer) {
        return;
      }

      const peerContract = getContract({
        address: peer,
        abi: JBSuckerAbi,
        client,
      });
      const projectId = await peerContract.read.projectId();

      return {
        peerChainId: Number(sucker.remoteChainId),
        projectId,
      } as SuckerPair;
    })
  );

  return suckerPairs.filter((x) => x) as SuckerPair[];
}

export async function resolveSuckers({
  config,
  chainId,
  projectId,
  version,
}: {
  config: ReturnType<typeof useConfig>;
  chainId: JBChainId;
  projectId: bigint;
  version: JBVersion;
}) {
  const initialPairs = await getSuckerPairs({ config, chainId, projectId, version });
  const pairs = [...initialPairs];

  await Promise.all(
    initialPairs.map(async (pair) => {
      try {
        const peerPairs = await getSuckerPairs({
          config,
          chainId: pair.peerChainId,
          projectId: pair.projectId,
          version,
        });

        peerPairs.forEach((pair) => {
          if (!pairs.some((x) => x.peerChainId === pair.peerChainId)) {
            pairs.push(pair);
          }
        });
      } catch (e) {
        console.error("peer error", e);
      }
    })
  );

  return pairs;
}
