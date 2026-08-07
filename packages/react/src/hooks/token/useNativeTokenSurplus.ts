import {
  ETH_CURRENCY_ID,
  JBChainId,
  jbMultiTerminalAbi,
  jbMultiTerminalV5Abi,
  NATIVE_TOKEN,
  NATIVE_TOKEN_DECIMALS,
} from "@bananapus/nana-sdk-core";
import { useJBChainId } from "../../contexts/JBChainContext/JBChainContext";
import { useJBContractContext } from "../../contexts/JBContractContext/JBContractContext";
import { useReadContract } from "wagmi";

/**
 * Return the current surplus of JB Native token, from the project's primary native terminal.
 */
export function useNativeTokenSurplus({
  chainId,
}: { chainId?: JBChainId } = {}) {
  const {
    projectId,
    version,
    contracts: { primaryNativeTerminal },
  } = useJBContractContext();

  // `??` short-circuits, so calling the hook on the right-hand side would skip
  // it whenever a chain is passed — a hook-count change on the render where the
  // caller's chainId flips defined <-> undefined.
  const contextChainId = useJBChainId();
  const _chainId = chainId ?? contextChainId;

  // `projectId` and the primary terminal in context both belong to the context
  // chain: a project's id and its terminal differ per chain. Reading them
  // against another chain answers for the wrong project, so only the context
  // chain is quotable here — use `useSuckersNativeTokenSurplus` for the group.
  const isContextChain = !!_chainId && _chainId === contextChainId;

  // v6 takes token addresses; v4/v5 take accounting context structs.
  const v6Query = useReadContract({
    chainId: _chainId,
    abi: jbMultiTerminalAbi,
    functionName: "currentSurplusOf",
    address: primaryNativeTerminal.data ?? undefined,
    args: [
      projectId,
      [NATIVE_TOKEN],
      BigInt(NATIVE_TOKEN_DECIMALS),
      BigInt(ETH_CURRENCY_ID),
    ],
    query: { enabled: version === 6 && isContextChain },
  });

  const legacyQuery = useReadContract({
    chainId: _chainId,
    abi: jbMultiTerminalV5Abi,
    functionName: "currentSurplusOf",
    address: primaryNativeTerminal.data ?? undefined,
    args: [
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
    ],
    query: { enabled: version !== 6 && isContextChain },
  });

  return version === 6 ? v6Query : legacyQuery;
}
