import { Address, PublicClient, getAddress, getContract, sliceHex } from "viem";
import { jbSuckerRegistryAbi, jbSuckerRegistryV5Abi } from "../generated/juicebox.js";
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

  // v6 identifies remote suckers as bytes32 (for cross-VM compatibility); for EVM peers
  // the address is in the low 20 bytes.
  const suckers =
    version === 6
      ? (
          await getContract({
            address: jbSuckerRegistry,
            abi: jbSuckerRegistryAbi,
            client,
          }).read.suckerPairsOf([projectId])
        ).map((sucker) => ({ ...sucker, remote: getAddress(sliceHex(sucker.remote, 12)) }))
      : await getContract({
          address: jbSuckerRegistry,
          abi: jbSuckerRegistryV5Abi,
          client,
        }).read.suckerPairsOf([projectId]);

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
