import {
  JBChainId,
  NATIVE_CURRENCY_ID,
  NATIVE_TOKEN,
  NATIVE_TOKEN_DECIMALS,
} from "juice-sdk-core";
import { useReadJbMultiTerminalCurrentSurplusOf } from "../../generated/juicebox";
import { useJBContractContext } from "../../contexts/JBContractContext/JBContractContext";
import { useJBChainId } from "src/contexts/JBChainContext/JBChainContext";

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
          currency: NATIVE_CURRENCY_ID,
        },
      ],
      BigInt(NATIVE_TOKEN_DECIMALS),
      BigInt(NATIVE_CURRENCY_ID),
    ],
  });
}
