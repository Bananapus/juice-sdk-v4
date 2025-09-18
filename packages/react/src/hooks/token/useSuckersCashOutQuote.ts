import {
  applyJbDaoCashOutFee,
  ETH_CURRENCY_ID,
  getProjectTerminalStore,
  JBChainId,
  jbTerminalStoreAbi,
  JBVersion,
  NATIVE_TOKEN_DECIMALS,
} from "juice-sdk-core";
import { getContract } from "viem";
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
  const { projectId, version } = useJBContractContext();

  const { data: pairs = [], isLoading, error } = useSuckers();

  const suckersQuote: UseQueryReturnType<bigint | null> = useQuery({
    queryKey: [
      "suckersTokenRedemptionQuote",
      projectId.toString(),
      chainId?.toString(),
      tokenAmountWei.toString(),
      pairs.map((pair) => pair.peerChainId).join(","),
    ],
    enabled: Boolean(!isLoading && chainId),
    queryFn: async () => {
      if (!chainId) return null;

      const quotes = await Promise.all(
        pairs.map(async ({ peerChainId, projectId }) => {
          return getTokenRedemptionQuote(
            config,
            peerChainId as JBChainId,
            projectId,
            tokenAmountWei,
            version
          );
        }) ?? []
      );

      return quotes.reduce((acc, quote) => acc + quote, 0n);
    },
  });

  const netTotal = applyJbDaoCashOutFee(suckersQuote.data ?? 0n);

  return {
    data: netTotal,
    isLoading: suckersQuote.isLoading || isLoading,
    errors: [error, suckersQuote.error].filter(Boolean),
  };
}

async function getTokenRedemptionQuote(
  config: ReturnType<typeof useConfig>,
  chainId: JBChainId,
  projectId: bigint,
  tokenAmountWei: bigint,
  version: JBVersion
) {
  const contract = getContract({
    address: getProjectTerminalStore(chainId, version),
    abi: jbTerminalStoreAbi,
    client: config.getClient({ chainId }),
  });

  return await contract.read.currentReclaimableSurplusOf([
    projectId,
    tokenAmountWei,
    [],
    [],
    BigInt(NATIVE_TOKEN_DECIMALS),
    BigInt(ETH_CURRENCY_ID),
  ]);
}
