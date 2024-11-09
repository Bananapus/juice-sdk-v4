import {
  NATIVE_TOKEN,
  readJbDirectoryPrimaryTerminalOf,
  readJbMultiTerminalCurrentSurplusOf,
  SuckerPair,
} from "juice-sdk-core";
import {
  JBChainId,
  useJBChainId,
} from "src/contexts/JBChainContext/JBChainContext";
import { useConfig } from "wagmi";
import { useQuery } from "wagmi/query";
import { useSuckerPairs } from "../suckers/useSuckerPairs";
import { useNativeTokenSurplus } from "./useNativeTokenSurplus";
import { useJBContractContext } from "src/contexts/JBContractContext/JBContractContext";

/**
 * Return the current surplus of JB Native token across each sucker on all chains for the current project.
 */
export function useSuckersNativeTokenSurplus() {
  const config = useConfig();

  const chainId = useJBChainId();
  const { projectId } = useJBContractContext();

  const { data: currentChainNativeTokenSurplus } = useNativeTokenSurplus();
  const suckerPairsQuery = useSuckerPairs();
  const pairs = suckerPairsQuery.data as SuckerPair[] | undefined;

  return useQuery({
    queryKey: ["suckersNativeTokenSurplus", chainId, projectId, pairs],
    queryFn: async () => {
      if (!pairs || pairs.length !== 0) return;

      /**
       * For each peer, get its terminal, then get the current surplus.
       */
      const surpluses = await Promise.all(
        pairs.map(async (pair) => {
          const { peerChainId, projectId } = pair;
          const terminal = await readJbDirectoryPrimaryTerminalOf(config, {
            chainId: peerChainId as JBChainId,
            args: [projectId, NATIVE_TOKEN],
          });
          const surplus = await readJbMultiTerminalCurrentSurplusOf(config, {
            chainId: peerChainId,
            address: terminal,
            args: [projectId, 18n, BigInt(NATIVE_TOKEN)],
          });

          return { surplus, chainId: peerChainId, projectId };
        })
      );

      if (chainId) {
        // Add the current chain's surplus to the list.
        surpluses.push({
          surplus: currentChainNativeTokenSurplus ?? 0n,
          chainId,
          projectId,
        });
      }

      return surpluses;
    },
  });
}
