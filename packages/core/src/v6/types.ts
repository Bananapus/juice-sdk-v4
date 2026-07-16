import { Address } from "viem";
import { jbContractAddress } from "../generated/juicebox.js";
import { JBChainId } from "../types.js";

/**
 * The contracts deployed for Juicebox v6.
 */
export type V6Contract = keyof (typeof jbContractAddress)["6"];

/**
 * The address of a v6 contract on a chain.
 */
export function v6Address(contract: V6Contract, chainId: JBChainId): Address {
  const address = (jbContractAddress["6"][contract] as Record<string, Address>)[
    String(chainId)
  ];
  if (!address) {
    throw new Error(`No v6 ${String(contract)} deployment on chain ${chainId}`);
  }
  return address;
}
