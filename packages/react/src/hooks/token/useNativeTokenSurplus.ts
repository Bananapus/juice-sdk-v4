import { NATIVE_TOKEN } from "juice-sdk-core";
import { useReadJbMultiTerminalCurrentSurplusOf } from "../../generated/juicebox";
import { useJBContractContext } from "../../contexts/JBContractContext/JBContractContext";

/**
 * Return the current surplus of JB Native token, from the project's primary native terminal.
 */
export function useNativeTokenSurplus() {
  const {
    projectId,
    contracts: { primaryNativeTerminal },
  } = useJBContractContext();

  return useReadJbMultiTerminalCurrentSurplusOf({
    address: primaryNativeTerminal.data ?? undefined,
    args: [projectId, 18n, BigInt(NATIVE_TOKEN)],
  });
}
