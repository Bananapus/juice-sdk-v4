import {
  ETH_CURRENCY_ID,
  JBChainId,
  NATIVE_TOKEN_DECIMALS,
  applyJbDaoCashOutFee,
  jbTerminalStoreAbi,
  jbTerminalStoreV5Abi,
} from "@bananapus/nana-sdk-core";
import { useJBChainId } from "../../contexts/JBChainContext/JBChainContext";
import { useJBContractContext } from "../../contexts/JBContractContext/JBContractContext";
import { useJBTerminalContext } from "../../contexts/JBTerminalContext/JBTerminalContext";
import { useReadContract } from "wagmi";

/**
 * Return the amount of ETH (wei) received from redeerming [tokenAmountWei] project tokens.
 */
export function useTokenCashOutQuoteEth(
  tokenAmountWei: bigint | undefined,
  { chainId }: { chainId?: JBChainId },
) {
  const { projectId, version } = useJBContractContext();
  const { store } = useJBTerminalContext();
  const jbChainId = useJBChainId();
  const _chainId = chainId ?? jbChainId;

  // `projectId` and the terminal store in context both belong to the context
  // chain: a project's id and its store differ per chain. Reading them against
  // another chain quotes the wrong project, so only the context chain is
  // quotable here — use `useSuckersCashOutQuote` for the group-wide value.
  const isContextChain = !!_chainId && _chainId === jbChainId;

  // The two array args are empty either way, but the selector differs: v6 takes
  // (address[], address[]) where v4/v5 take (address[], tuple[]).
  return useReadContract({
    abi: version === 6 ? jbTerminalStoreAbi : jbTerminalStoreV5Abi,
    functionName: "currentReclaimableSurplusOf",
    chainId: _chainId,
    address: store.data ?? undefined,
    args: tokenAmountWei
      ? [
          projectId,
          tokenAmountWei,
          [],
          [],
          BigInt(NATIVE_TOKEN_DECIMALS),
          BigInt(ETH_CURRENCY_ID),
        ]
      : undefined,
    query: {
      enabled: isContextChain && !!store.data && !!tokenAmountWei,
      select(data: bigint) {
        return applyJbDaoCashOutFee(data);
      },
    },
  });
}
