import {
  applyJbDaoCashOutFee,
  JBChainId,
  NATIVE_TOKEN_DECIMALS,
  getProjectTerminalStore,
  readJbTerminalStoreCurrentReclaimableSurplusOf,
  ETH_CURRENCY_ID,
} from "juice-sdk-core";
import { useConfig } from "wagmi";
import { useQuery, UseQueryReturnType } from "wagmi/query";
import { useJBChainId } from "../../contexts/JBChainContext/JBChainContext";
import { useJBContractContext } from "../../contexts/JBContractContext/JBContractContext";
import { useSuckers } from "../suckers/useSuckers";

/**
 * Return the amount of ETH (wei) received from cashing out [tokenAmountWei] project tokens, across all suckers.
 * @param tokenAmountWei the amount of tokens to cash out.
 */
export function useSuckersCashOutQuote(tokenAmountWei: bigint) {
  const config = useConfig();
  const chainId = useJBChainId();
  const { projectId } = useJBContractContext();

  const suckersQuery = useSuckers();
  const pairs = suckersQuery.data;

  const suckersQuote: UseQueryReturnType<bigint | null> = useQuery({
    queryKey: [
      "suckersTokenRedemptionQuote",
      projectId.toString(),
      chainId?.toString(),
      tokenAmountWei.toString(),
      pairs?.map((pair) => pair.peerChainId).join(","),
    ],
    enabled: Boolean(!suckersQuery.isLoading && chainId),
    queryFn: async () => {
      if (!chainId) {
        return null;
      }

      const quotes = await Promise.all(
        pairs?.map(async ({ peerChainId, projectId }) => {
          return getTokenRedemptionQuote(
            config,
            peerChainId as JBChainId,
            projectId,
            tokenAmountWei
          );
        }) ?? []
      );

      return quotes.reduce((acc, quote) => acc + quote, 0n);
    },
  });

  const netTotal = applyJbDaoCashOutFee(suckersQuote.data ?? 0n);

  return {
    data: netTotal,
    isLoading: suckersQuote.isLoading || suckersQuery.isLoading,
    errors: [suckersQuery.error, suckersQuote.error].filter(Boolean),
  };
}

async function getTokenRedemptionQuote(
  config: ReturnType<typeof useConfig>,
  chainId: JBChainId,
  projectId: bigint,
  tokenAmountWei: bigint
) {
  const terminalStore = await getProjectTerminalStore(
    config,
    chainId,
    projectId
  );
  return await readJbTerminalStoreCurrentReclaimableSurplusOf(config, {
    chainId,
    address: terminalStore,
    args: [
      projectId,
      tokenAmountWei,
      [],
      [],
      BigInt(NATIVE_TOKEN_DECIMALS),
      BigInt(ETH_CURRENCY_ID),
    ],
  });
}
