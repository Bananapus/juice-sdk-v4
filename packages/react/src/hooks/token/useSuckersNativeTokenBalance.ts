import {
  getPrimaryNativeTerminal,
  getProjectTerminalStore,
  jbTerminalStoreAbi,
  NATIVE_TOKEN,
} from "juice-sdk-core";
import { getContract } from "viem";
import { useConfig } from "wagmi";
import { useQuery } from "wagmi/query";
import { useJBChainId } from "../../contexts/JBChainContext/JBChainContext";
import { useJBContractContext } from "../../contexts/JBContractContext/JBContractContext";
import { useSuckers } from "../suckers/useSuckers";

/**
 * Return the current surplus of JB Native token across each sucker on all chains for the current project.
 */
export function useSuckersNativeTokenBalance() {
  const config = useConfig();

  const chainId = useJBChainId();
  const { projectId, version } = useJBContractContext();

  const { data: pairs = [], isLoading, isError } = useSuckers();

  const balanceQuery = useQuery({
    queryKey: [
      "suckersNativeTokenBalance",
      projectId.toString(),
      chainId?.toString(),
      pairs.map((pair) => pair.peerChainId).join(","),
    ],
    queryFn: async () => {
      if (!chainId) return null;
      if (!pairs || pairs.length === 0) return [];

      /**
       * For each peer, get its terminal, then get the current surplus.
       */
      const balances = await Promise.all(
        pairs.map(async (pair) => {
          const { peerChainId, projectId } = pair;
          const [terminal, store] = await Promise.all([
            getPrimaryNativeTerminal(config, peerChainId, projectId, version),
            getProjectTerminalStore(config, peerChainId, projectId, version),
          ]);

          const contract = getContract({
            address: store,
            abi: jbTerminalStoreAbi,
            client: config.getClient({ chainId: peerChainId }),
          });

          const balance = await contract.read.balanceOf([terminal, projectId, NATIVE_TOKEN]);

          return { balance, chainId: peerChainId, projectId };
        })
      );

      return balances;
    },
  });

  return {
    isLoading: balanceQuery.isLoading || isLoading,
    isError: balanceQuery.isError || isError,
    data: balanceQuery.data as
      | { balance: bigint; chainId: number; projectId: bigint }[]
      | undefined,
  };
}
