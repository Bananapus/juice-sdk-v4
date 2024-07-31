import {
  Address,
  PublicClient,
  getContract,
  isAddressEqual,
  zeroAddress,
} from "viem";
import {
  jb721TiersHookAbi,
  jb721TiersHookDeployerAddress,
  jbAddressRegistryAbi,
  jbAddressRegistryAddress,
} from "../generated/juicebox.js";

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
    rulesetId: number;
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
    abi: jbAddressRegistryAbi,
    client: publicClient,
  });

  console.log("🧃 getHookSpecifications::args", {
    dataHookAddress: args.dataHookAddress,
    projectId: args.projectId,
    rulesetId: args.rulesetId,
  });

  const hookSpecs = await getHookSpecifications(publicClient, {
    dataHookAddress: args.dataHookAddress,
    projectId: args.projectId,
    rulesetId: args.rulesetId,
  });

  const res = await Promise.all(
    hookSpecs.map(async (h) => {
      const deployerOf = await registry.read.deployerOf([h.hook]);
      console.log("🧃 deployerOf", {
        hook: h.hook,
        deployerOf,
        deployerAddress,
      });
      return isAddressEqual(deployerOf, deployerAddress as Address);
    })
  );

  const index = res.findIndex((r) => r);
  if (index === -1) {
    return null;
  }

  return hookSpecs[index].hook;
}

export async function getHookSpecifications(
  publicClient: PublicClient,
  args: {
    dataHookAddress: Address;
    projectId: bigint;
    rulesetId: number;
  }
) {
  const dataHook = getContract({
    address: args.dataHookAddress,
    abi: jb721TiersHookAbi,
    client: publicClient,
  });

  const [_, hookSpecifications] = await dataHook.read.beforePayRecordedWith([
    {
      projectId: args.projectId,
      rulesetId: BigInt(args.rulesetId), // TODO update the ABI to be a number, will fix this.
      terminal: zeroAddress,
      beneficiary: zeroAddress,
      amount: {
        token: zeroAddress,
        value: 0n,
        decimals: 0,
        currency: 0,
      },
      payer: zeroAddress,
      weight: 0n,
      reservedPercent: 0n,
      metadata: zeroAddress,
    },
  ]);

  console.log("🧃 getHookSpecifications", { args, hookSpecifications });

  return hookSpecifications;
}
