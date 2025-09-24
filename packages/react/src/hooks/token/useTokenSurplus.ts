import {
  JBChainId,
  Token,
  Currency,
} from "juice-sdk-core";
import { useJBChainId } from "../../contexts/JBChainContext/JBChainContext";
import { useJBContractContext } from "../../contexts/JBContractContext/JBContractContext";
import { useReadJbMultiTerminalCurrentSurplusOf } from "../../generated/juicebox";

/**
 * Return the current surplus of JB Native token, from the project's primary native terminal.
 */
export function useTokenSurplus({
  chainId,
  token,
  currency,
  decimals,
  inTermsOfCurrency,
  inTermsOfDecimals,
}: { chainId?: JBChainId; token?: Token, currency?: Currency, decimals?: number, inTermsOfCurrency?: Currency, inTermsOfDecimals?: number } = {}) {
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
          token: token,
          decimals: decimals,
          currency: currency,
        },
      ],
      BigInt(inTermsOfDecimals ?? 0),
      BigInt(inTermsOfCurrency ?? 0),
    ],
  });
}
