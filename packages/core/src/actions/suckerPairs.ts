import { sepolia } from "@wagmi/core/chains";
import { Address, PublicClient, getContract } from "viem";
import { readBpSuckerRegistrySuckersOf } from "../generated/juicebox.js";
import { JBSuckerAbi } from "./JBSuckerAbi.js";

export async function getSuckerPairs({
  config,
  chainId,
  projectId,
}: {
  config: any; // TODO wagmi config
  chainId: number;
  projectId: bigint;
}) {
  const client = config.getClient({ chainId }) as PublicClient;

  const suckers = await readBpSuckerRegistrySuckersOf(config, {
    chainId: sepolia.id,
    args: [projectId],
  });

  const suckerPairs = await Promise.all(
    suckers.map(async (suckerAddress) => {
      const suckerContract = getContract({
        address: suckerAddress,
        abi: JBSuckerAbi,
        client,
      });

      const peer = (await suckerContract.read.PEER()) as Address | undefined;
      if (!peer) return;

      const peerContract = getContract({
        address: peer,
        abi: JBSuckerAbi,
        client,
      });

      const [peerChainId, projectId] = await Promise.all([
        peerContract.read.peerChainID(),
        peerContract.read.PROJECT_ID(),
      ]);

      return {
        peerChainId,
        projectId,
      };
    })
  );

  return suckerPairs;
}
