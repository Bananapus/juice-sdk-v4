import {
  NATIVE_CURRENCY_ID,
  NATIVE_TOKEN,
  NATIVE_TOKEN_DECIMALS,
  readJbDirectoryPrimaryTerminalOf,
  readJbMultiTerminalCurrentSurplusOf,
  SuckerPair,
} from "juice-sdk-core";
import {
  JBChainId,
  useJBChainId,
} from "../../contexts/JBChainContext/JBChainContext";
import { useJBContractContext } from "../../contexts/JBContractContext/JBContractContext";
import { useConfig } from "wagmi";
import { useQuery } from "wagmi/query";
import { useNativeTokenSurplus } from "./useNativeTokenSurplus";
import { useSuckers } from "../suckers/useSuckers";

/**
 * Return the current surplus of JB Native token across each sucker on all chains for the current project.
 */
export function useSuckersNativeTokenSurplus() {
  const config = useConfig();

  const chainId = useJBChainId();
  const { projectId } = useJBContractContext();

  const suckersQuery = useSuckers();
  const pairs = suckersQuery.data;

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
          const terminal = await readJbDirectoryPrimaryTerminalOf(config, {
            chainId: Number(peerChainId) as JBChainId,
            args: [projectId, NATIVE_TOKEN],
          });

          const surplus = await readJbMultiTerminalCurrentSurplusOf(config, {
            chainId: Number(peerChainId) as JBChainId,
            address: terminal,
            args: [
              projectId,
              [
                {
                  token: NATIVE_TOKEN,
                  decimals: NATIVE_TOKEN_DECIMALS,
                  currency: NATIVE_CURRENCY_ID,
                },
              ],
              BigInt(NATIVE_TOKEN_DECIMALS),
              BigInt(NATIVE_CURRENCY_ID),
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
      | { surplus: bigint; chainId: number; projectId: bigint }[]
      | undefined,
  };
}
