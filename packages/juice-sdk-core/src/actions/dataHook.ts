import {
  Address,
  PublicClient,
  getContract,
  isAddressEqual,
  zeroAddress,
} from "viem";
import {
  jb721TiersHookDeployerAddress,
  jbAddressRegistryABI,
  jbAddressRegistryAddress,
} from "../generated/juicebox";
import { DATA_HOOK_ABI } from "./JB721TiersHookAbi";

export async function getHookSpecifications(
  publicClient: PublicClient,
  args: {
    dataHookAddress: Address;
    projectId: bigint;
    rulesetId: bigint;
  }
) {
  const dataHook = getContract({
    address: args.dataHookAddress,
    abi: DATA_HOOK_ABI,
    publicClient,
  });

  const [_, hookSpecifications] = await dataHook.read.beforePayRecordedWith([
    {
      projectId: args.projectId,
      rulesetId: args.rulesetId,
      terminal: zeroAddress,
      beneficiary: zeroAddress,
      amount: {
        token: zeroAddress,
        value: 0n,
        decimals: 0n,
        currency: 0n,
      },
      payer: zeroAddress,
      weight: 0n,
      reservedRate: 0n,
      metadata: zeroAddress,
    },
  ]);

  return hookSpecifications;
}

/**
 * Find the 721 data hook for a given project and ruleset.
 *
 * NOTE this is an expensive call. Best to run it server-side and cache it.
 */
export async function find721DataHook(
  publicClient: PublicClient,
  args: {
    dataHookAddress: Address;
    projectId: bigint;
    rulesetId: bigint;
  }
) {
  const chainId = publicClient.chain?.id;
  if (!chainId) {
    throw new Error("[juice-sdk-core] No chain ID on public client.");
  }

  const deployerAddress =
    jb721TiersHookDeployerAddress[
      chainId as keyof typeof jb721TiersHookDeployerAddress
    ];

  const registerAddress =
    jbAddressRegistryAddress[chainId as keyof typeof jbAddressRegistryAddress];

  if (!registerAddress) {
    throw new Error(
      `[juice-sdk-core] No JBAddressRegistry address for chain ${chainId}.`
    );
  }
  const registry = getContract({
    address: registerAddress,
    abi: jbAddressRegistryABI,
    publicClient,
  });

  const hookSpecs = await getHookSpecifications(publicClient, {
    dataHookAddress: args.dataHookAddress,
    projectId: args.projectId,
    rulesetId: args.rulesetId,
  });

  const res = await Promise.all(
    hookSpecs.map(async (h) => {
      const deployerOf = await registry.read.deployerOf([h.hook]);
      return isAddressEqual(deployerOf, deployerAddress as Address);
    })
  );

  const index = res.findIndex((r) => r);
  if (index === -1) {
    return null;
  }

  return hookSpecs[index].hook;
}
