import {
    getProjectTerminalStore,
    NATIVE_TOKEN,
    readJbDirectoryPrimaryTerminalOf,
    readJbTerminalStoreBalanceOf
} from "juice-sdk-core";
import { zeroAddress } from "viem";
import { useConfig } from "wagmi";
import { useQuery } from "wagmi/query";
import {
    JBChainId,
    useJBChainId,
} from "../../contexts/JBChainContext/JBChainContext";
import { useJBContractContext } from "../../contexts/JBContractContext/JBContractContext";
import { useSuckers } from "../suckers/useSuckers";

/**
 * Return the current surplus of JB Native token across each sucker on all chains for the current project.
 */
export function useSuckersNativeTokenBalance() {
  const config = useConfig();

  const chainId = useJBChainId();
  const { projectId } = useJBContractContext();

  const suckersQuery = useSuckers();
  const pairs = suckersQuery.data;

  const balanceQuery = useQuery({
    queryKey: [
      "suckersNativeTokenBalance",
      projectId.toString(),
      chainId?.toString(),
      pairs?.map((pair) => pair.peerChainId).join(","),
    ],
    queryFn: async () => {
      if (!chainId) return null;

      if (!pairs || pairs.length === 0) {
        return [];
      }

      /**
       * For each peer, get its terminal, then get the current surplus.
       */
      const balances = await Promise.all(
        pairs.map(async (pair) => {
          const { peerChainId, projectId } = pair;
          const [terminal, store] = await Promise.all([
            readJbDirectoryPrimaryTerminalOf(config, {
              chainId: Number(peerChainId) as JBChainId,
              args: [projectId, NATIVE_TOKEN],
            }), // TODO should probably be api'd and cached one day
            getProjectTerminalStore(config, peerChainId, projectId),
          ]);

          const balance = await readJbTerminalStoreBalanceOf(config, {
            chainId: Number(peerChainId) as JBChainId,
            address: store,
            args: [terminal ?? zeroAddress, projectId, NATIVE_TOKEN],
          });

          return { balance, chainId: peerChainId, projectId };
        })
      );

      return balances;
    },
  });

  return {
    isLoading: balanceQuery.isLoading || suckersQuery.isLoading,
    isError: balanceQuery.isError || suckersQuery.isError,
    data: balanceQuery.data as
      | { balance: bigint; chainId: number; projectId: bigint }[]
      | undefined,
  };
}
