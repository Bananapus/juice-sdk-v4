import { Address, PublicClient, getContract } from "viem";
import { readJbSuckerRegistrySuckerPairsOf } from "../generated/juicebox.js";
import { JBSuckerAbi } from "./JBSuckerAbi.js";
import { JBChainId } from "src/types.js";

export type SuckerPair = {
  peerChainId: JBChainId;
  projectId: bigint;
};

export async function getSuckerPairs({
  config,
  chainId,
  projectId,
}: {
  config: any; // TODO wagmi config type
  chainId: JBChainId;
  projectId: bigint;
}): Promise<SuckerPair[]> {
  const suckers = await readJbSuckerRegistrySuckerPairsOf(config, {
    chainId, // TODO fix type
    args: [projectId],
  });

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
}: {
  config: any; // TODO wagmi config
  chainId: JBChainId;
  projectId: bigint;
}) {
  const initialPairs = await getSuckerPairs({ config, chainId, projectId });
  const pairs = [...initialPairs];

  await Promise.all(
    initialPairs.map(async (pair) => {
      try {
        const peerPairs = await getSuckerPairs({
          config,
          chainId: pair.peerChainId,
          projectId: pair.projectId,
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

// // example, delete this.

// const config = createConfig({
//   chains: [sepolia],
//   transports: {
//     [sepolia.id]: http(
//       `https://sepolia.infura.io/v3/c2838024e339438fbe8a31d6754efe8a`
//     ),
//   },
// });

// const x = await getSuckerPairs({
//   config,
//   chainId: sepolia.id,
//   projectId: 2n,
// });

// console.log(x);
