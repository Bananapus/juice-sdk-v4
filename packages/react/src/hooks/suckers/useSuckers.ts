import { debug, SuckerPair } from "juice-sdk-core";
import { useJBChainId } from "../../contexts/JBChainContext/JBChainContext";
import { useQuery, UseQueryReturnType } from "wagmi/query";
import { useJBContractContext } from "../../contexts/JBContractContext/JBContractContext";
import {
  mainnet,
  base,
  optimism,
  arbitrum,
  sepolia,
  baseSepolia,
  optimismSepolia,
  arbitrumSepolia,
} from "viem/chains";

/**
 * Preferred chain ordering
 */
const chainOrder = [
  mainnet.id,
  base.id,
  optimism.id,
  arbitrum.id,

  sepolia.id,
  baseSepolia.id,
  optimismSepolia.id,
  arbitrumSepolia.id,
];

/**
 * Return sucker pairs for the project ID in context.
 *
 * Hits JBM endpoint, heavily cached
 * @returns
 */
export function useSuckers(args?: { enabled: boolean }): UseQueryReturnType<SuckerPair[]> {
  const { enabled = true } = args ?? {};
  const { projectId } = useJBContractContext();
  const chainId = useJBChainId();

  debug("useSuckers::args", { projectId, chainId });

  return useQuery({
    queryKey: ["juice-sdk", "suckers", projectId.toString(), chainId?.toString()],
    staleTime: Infinity,
    enabled: !!chainId && enabled,
    queryFn: async () => {
      if (!chainId) return [];

      const suckersData = await fetch(
        `https://juicebox.money/api/juicebox/v4/project/${projectId}/sucker-pairs?chainId=${chainId}`
      ).then((res) => res.json());

      // sort by `chainOrder`
      return (suckersData.suckers as SuckerPair[]).sort((a: SuckerPair, b: SuckerPair) => {
        const aChainId = chainOrder.indexOf(a.peerChainId);
        const bChainId = chainOrder.indexOf(b.peerChainId);
        if (aChainId === -1 || bChainId === -1) {
          return 0;
        }

        return aChainId - bChainId;
      });
    },
  });
}
