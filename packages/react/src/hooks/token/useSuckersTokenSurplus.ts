import {
  Token,
  Currency,
  readJbDirectoryPrimaryTerminalOf,
  readJbMultiTerminalCurrentSurplusOf,
} from "juice-sdk-core";
import { useConfig } from "wagmi";
import { useQuery } from "wagmi/query";
import {
  JBChainId,
  useJBChainId,
} from "../../contexts/JBChainContext/JBChainContext";
import { useJBContractContext } from "../../contexts/JBContractContext/JBContractContext";
import { useSuckers } from "../suckers/useSuckers";

/**
 * Return the current surplus of JB token (can be different per chain) across each sucker on all chains for the current project.
 */
export function useSuckersTokenSurplus(
  tokenMap: Record<JBChainId, { token: Token; currency: Currency; decimals: number }>,
  inTermsOfCurrency: Currency,
  inTermsOfDecimals: number
) {
  const config = useConfig();

  const chainId = useJBChainId();
  const { projectId } = useJBContractContext();

  const suckersQuery = useSuckers();
  const pairs = suckersQuery.data;

  const surplusQuery = useQuery({
    queryKey: [
      "suckersTokenSurplus",
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
          const tokenConfig = tokenMap[peerChainId as JBChainId];
          if (!tokenConfig) {
            // If no config for this chain, skip
            return { surplus: null, chainId: peerChainId, projectId };
          }
          const { token, currency, decimals } = tokenConfig;
          const terminal = await readJbDirectoryPrimaryTerminalOf(config, {
            chainId: Number(peerChainId) as JBChainId,
            args: [projectId, token],
          });

          const surplus = await readJbMultiTerminalCurrentSurplusOf(config, {
            chainId: Number(peerChainId) as JBChainId,
            address: terminal,
            args: [
              projectId,
              [
                {
                  token: token,
                  decimals: decimals,
                  currency: currency,
                },
              ],
              BigInt(inTermsOfDecimals),
              BigInt(inTermsOfCurrency),
            ],
          });

          return { surplus, chainId: peerChainId, projectId };
        })
      );

      return surpluses;
    },
  });

  return {
    isLoading: surplusQuery.isLoading || suckersQuery.isLoading,
    isError: surplusQuery.isError || suckersQuery.isError,
    data: surplusQuery.data as
      | { surplus: bigint; chainId: JBChainId; projectId: bigint }[]
      | undefined,
  };
}
