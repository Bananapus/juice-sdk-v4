import { Address } from "viem";
import { jbV6ContractAddress } from "../generated/addresses/jbV6ContractAddress.js";
import { jbContractAddressHistory } from "../generated/addresses/jbContractAddressHistory.js";
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

/** A retired v6 generation, newest first after `current`. */
export type V6Generation = "current" | "previous" | "v2" | "v1";

/**
 * A v6 contract's addresses on a chain: the current deployment, then each
 * retired generation still in use, newest first. Projects move to a new
 * generation one by one, so code that recognizes a deployment checks them all.
 */
export function v6Deployments(
  contract: V6Contract,
  chainId: JBChainId,
  generations: readonly V6Generation[] = ["current", "previous", "v2", "v1"],
): Address[] {
  const history = jbContractAddressHistory["6"] as Partial<
    Record<string, Partial<Record<string, Partial<Record<string, Address>>>>>
  >;
  return generations
    .map((generation) =>
      generation === "current"
        ? (
            jbV6ContractAddress[contract] as
              | Partial<Record<string, Address>>
              | undefined
          )?.[String(chainId)]
        : history[contract]?.[generation]?.[String(chainId)],
    )
    .filter((address): address is Address => !!address);
}

/** Whether `address` is any generation of a v6 contract on a chain. */
export function isV6Deployment(
  address: string,
  contract: V6Contract,
  chainId: JBChainId,
  generations?: readonly V6Generation[],
): boolean {
  return v6Deployments(contract, chainId, generations).some(
    (deployed) => deployed.toLowerCase() === address.toLowerCase(),
  );
}
