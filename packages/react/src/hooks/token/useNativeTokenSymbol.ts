import { JB_CHAIN_SLUGS, DEFAULT_NATIVE_TOKEN_SYMBOL } from "juice-sdk-core";
import { useJBChainId } from "../../contexts/JBChainContext/JBChainContext";

/**
 * Return the human-readable token symbol for the chain set in JBChainContext.
 *
 * Depends on JBChainContext.
 */
export function useNativeTokenSymbol() {
  const chainId = useJBChainId();
  if (!chainId) {
    return DEFAULT_NATIVE_TOKEN_SYMBOL;
  }

  return (
    JB_CHAIN_SLUGS[chainId]?.nativeTokenSymbol ?? DEFAULT_NATIVE_TOKEN_SYMBOL
  );
}
