import { useJBChainId } from "../../contexts/JBChainContext/JBChainContext";
import {
  arbitrumSepolia,
  baseSepolia,
  optimismSepolia,
  sepolia,
} from "viem/chains";

/**
 * Return the human-readable token symbol for the chain set in JBChainContext.
 *
 * Depends on JBChainContext.
 */
export function useNativeTokenSymbol() {
  const symbols: { [k: number]: string } = {
    [sepolia.id]: "SepETH",
    [optimismSepolia.id]: "OPSepETH",
    [arbitrumSepolia.id]: "ArbSepETH",
    [baseSepolia.id]: "BaseSepETH",
  };

  const chainId = useJBChainId();
  return symbols[chainId ?? 0] ?? "ETH";
}
