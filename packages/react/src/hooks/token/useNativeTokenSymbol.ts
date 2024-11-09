import { NATIVE_TOKEN_SYMBOLS } from "juice-sdk-core";
import { useJBChainId } from "src/contexts/JBChainContext/JBChainContext";

const DEFAULT_TOKEN_SYMBOL = "ETH";

/**
 * Return the human-readable token symbol for the chain set in JBChainContext.
 *
 * Depends on JBChainContext.
 */
export function useNativeTokenSymbol() {
  const chainId = useJBChainId();
  if (!chainId) {
    return DEFAULT_TOKEN_SYMBOL;
  }

  return NATIVE_TOKEN_SYMBOLS[chainId] ?? DEFAULT_TOKEN_SYMBOL;
}
