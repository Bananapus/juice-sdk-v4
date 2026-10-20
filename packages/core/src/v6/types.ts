import { Address } from "viem";
import { jbV6ContractAddress } from "../generated/addresses/jbV6ContractAddress.js";
import type { JBChainId } from "../types.js";

/**
 * The contracts deployed for Juicebox v6.
 */
export type V6Contract = keyof typeof jbV6ContractAddress;

/**
 * The address of a v6 contract on a chain.
 */
export function v6Address(contract: V6Contract, chainId: JBChainId): Address {
  const address = (jbV6ContractAddress[contract] as Record<string, Address>)[
    String(chainId)
  ];
  if (!address) {
    throw new Error(`No v6 ${String(contract)} deployment on chain ${chainId}`);
  }
  return address;
}
