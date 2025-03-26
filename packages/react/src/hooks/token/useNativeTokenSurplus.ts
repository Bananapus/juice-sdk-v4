import {
  ETH_CURRENCY_ID,
  JBChainId,
  NATIVE_TOKEN,
  NATIVE_TOKEN_DECIMALS,
} from "juice-sdk-core";
import { useJBChainId } from "../../contexts/JBChainContext/JBChainContext";
import { useJBContractContext } from "../../contexts/JBContractContext/JBContractContext";
import { useReadJbMultiTerminalCurrentSurplusOf } from "../../generated/juicebox";

/**
 * Return the current surplus of JB Native token, from the project's primary native terminal.
 */
export function useNativeTokenSurplus({
  chainId,
}: { chainId?: JBChainId } = {}) {
  const {
    projectId,
    contracts: { primaryNativeTerminal },
  } = useJBContractContext();

  const _chainId = chainId ?? useJBChainId();

  return useReadJbMultiTerminalCurrentSurplusOf({
    chainId: _chainId,
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
  });
}
