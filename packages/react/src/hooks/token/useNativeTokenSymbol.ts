import { DEFAULT_NATIVE_TOKEN_SYMBOL, JB_CHAINS, JBChainId } from "juice-sdk-core";
import { useJBChainId } from "../../contexts/JBChainContext/JBChainContext";

/**
 * Return the human-readable token symbol for the chain set in JBChainContext.
 *
 * Depends on JBChainContext.
 */
export function useNativeTokenSymbol(chainId?: JBChainId) {
  const _chainId = chainId ?? useJBChainId();
  if (!_chainId) {
    return DEFAULT_NATIVE_TOKEN_SYMBOL;
  }

  return JB_CHAINS[_chainId]?.nativeTokenSymbol ?? DEFAULT_NATIVE_TOKEN_SYMBOL;
}
