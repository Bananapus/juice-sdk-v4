import {
  DEFAULT_NATIVE_TOKEN_SYMBOL,
  JB_CHAINS,
  JBChainId,
} from "@bananapus/nana-sdk-core";
import { useJBChainId } from "../../contexts/JBChainContext/JBChainContext";

/**
 * Return the human-readable token symbol for the chain set in JBChainContext.
 *
 * Depends on JBChainContext.
 */
export function useNativeTokenSymbol(chainId?: JBChainId) {
  // `??` short-circuits, so calling the hook on the right-hand side would skip
  // it whenever a chain is passed — a hook-count change on the render where the
  // caller's chainId flips defined <-> undefined.
  const contextChainId = useJBChainId();
  const _chainId = chainId ?? contextChainId;
  if (!_chainId) {
    return DEFAULT_NATIVE_TOKEN_SYMBOL;
  }

  return JB_CHAINS[_chainId]?.nativeTokenSymbol ?? DEFAULT_NATIVE_TOKEN_SYMBOL;
}
