import {
  ETH_CURRENCY_ID,
  getPrimaryNativeTerminal,
  JBChainId,
  jbMultiTerminalAbi,
  NATIVE_TOKEN,
  NATIVE_TOKEN_DECIMALS,
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
export function useSuckersNativeTokenSurplus() {
  const config = useConfig();

  const chainId = useJBChainId();
  const { projectId, version } = useJBContractContext();

  const { data: pairs = [], isLoading, isError } = useSuckers();

  const surplusQuery = useQuery({
    queryKey: [
      "suckersNativeTokenSurplus",
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
      const surpluses = await Promise.all(
        pairs.map(async (pair) => {
          const { peerChainId, projectId } = pair;
          const terminal = await getPrimaryNativeTerminal(config, peerChainId, projectId, version);

          const contract = getContract({
            address: terminal,
            abi: jbMultiTerminalAbi,
            client: config.getClient({ chainId: peerChainId }),
          });

          const surplus = await contract.read.currentSurplusOf([
            projectId,
            [
              {
                token: NATIVE_TOKEN,
                decimals: NATIVE_TOKEN_DECIMALS,
                currency: ETH_CURRENCY_ID,
              },
            ],
            BigInt(NATIVE_TOKEN_DECIMALS),
            BigInt(ETH_CURRENCY_ID),
          ]);

          return { surplus, chainId: peerChainId, projectId };
        })
      );

      return surpluses;
    },
  });

  return {
    isLoading: surplusQuery.isLoading || isLoading,
    isError: surplusQuery.isError || isError,
    data: surplusQuery.data as
      | { surplus: bigint; chainId: JBChainId; projectId: bigint }[]
      | undefined,
  };
}
