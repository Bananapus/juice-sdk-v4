import {
  ETH_CURRENCY_ID,
  JBChainId,
  NATIVE_TOKEN_DECIMALS,
  applyJbDaoCashOutFee,
  jbTerminalStoreAbi,
} from "juice-sdk-core";
import { useJBChainId } from "../../contexts/JBChainContext/JBChainContext";
import { useJBContractContext } from "../../contexts/JBContractContext/JBContractContext";
import { useJBTerminalContext } from "../../contexts/JBTerminalContext/JBTerminalContext";
import { useReadContract } from "wagmi";

/**
 * Return the amount of ETH (wei) received from redeerming [tokenAmountWei] project tokens.
 */
export function useTokenCashOutQuoteEth(
  tokenAmountWei: bigint | undefined,
  { chainId }: { chainId?: JBChainId }
) {
  const { projectId } = useJBContractContext();
  const { store } = useJBTerminalContext();
  const jbChainId = useJBChainId();
  const _chainId = chainId ?? jbChainId;

  return useReadContract({
    abi: jbTerminalStoreAbi,
    functionName: "currentReclaimableSurplusOf",
    chainId: _chainId,
    address: store.data ?? undefined,
    args: tokenAmountWei
      ? [projectId, tokenAmountWei, [], [], BigInt(NATIVE_TOKEN_DECIMALS), BigInt(ETH_CURRENCY_ID)]
      : undefined,
    query: {
      select(data: bigint) {
        return applyJbDaoCashOutFee(data);
      },
    },
  });
}
