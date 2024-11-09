import { Address, PublicClient, getContract } from "viem";
import { readBpSuckerRegistrySuckersOf } from "../generated/juicebox.js";
import { JBSuckerAbi } from "./JBSuckerAbi.js";

export type SuckerPair = {
  peerChainId: number;
  projectId: bigint;
};

export async function getSuckerPairs({
  config,
  chainId,
  projectId,
}: {
  config: any; // TODO wagmi config
  chainId: number;
  projectId: bigint;
}): Promise<SuckerPair[]> {
  const client = config.getClient({ chainId }) as PublicClient;

  const suckers = await readBpSuckerRegistrySuckersOf(config, {
    chainId: chainId as any, // TODO fix
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
      if (!peer) {
        return;
      }

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
        peerChainId: Number(peerChainId),
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
  chainId: number;
  projectId: bigint;
}) {
  const initialPairs = await getSuckerPairs({ config, chainId, projectId });
  const pairs = [...initialPairs];
  await Promise.all(
    initialPairs.map(async (pair) => {
      const peerPairs = await getSuckerPairs({
        config,
        chainId: pair.peerChainId,
        projectId: pair.projectId,
      });
      
      if (!pairs.some((x) => x.peerChainId === pair.peerChainId)) {
        pairs.push(...peerPairs);
      }
    })
  );
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
