import { Chain } from "viem";
import { useAccount, useClient } from "wagmi";

/**
 * Return the chain that the user is currently connected to.
 * If user is not connected, return the public chain. (configured in wagmiConfig)
 * @returns {Chain}
 */
export function useChain(): Chain | undefined {
  const { chain } = useAccount();
  const client = useClient();
  return chain ?? client?.chain;
}
