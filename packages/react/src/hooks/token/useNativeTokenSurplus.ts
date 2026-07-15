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

  const _chainId = chainId ?? useJBChainId();

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
    query: { enabled: version === 6 },
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
    query: { enabled: version !== 6 },
  });

  return version === 6 ? v6Query : legacyQuery;
}
