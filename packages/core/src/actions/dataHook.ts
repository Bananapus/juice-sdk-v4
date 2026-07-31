import {
  JB721HookContracts,
  JBAddressRegistryContracts,
  type JBChainId,
  type JBVersion,
} from "../types.js";
import { getJBContractAddress } from "../utils/contracts.js";
import {
  getContract,
  isAddressEqual,
  zeroAddress,
  type Address,
  type PublicClient,
} from "viem";
import {
  jb721TiersHookAbi,
  jb721TiersHookV5Abi,
  jbAddressRegistryAbi,
} from "../generated/juicebox.js";
import { debug } from "../utils/debug.js";

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
    version: JBVersion;
  },
) {
  const chainId = publicClient.chain?.id;
  if (!chainId) {
    throw new Error("[@bananapus/nana-sdk-core] No chain ID on public client.");
  }

  let registerAddress: Address;
  try {
    registerAddress = getJBContractAddress(
      JBAddressRegistryContracts.JBAddressRegistry,
      args.version,
      chainId as JBChainId,
    );
  } catch {
    throw new Error(
      `[@bananapus/nana-sdk-core] No JBAddressRegistry address for chain ${chainId}.`,
    );
  }

  const deployerAddress = getJBContractAddress(
    JB721HookContracts.JB721TiersHookDeployer,
    args.version,
    chainId as JBChainId,
  );

  const registry = getContract({
    address: registerAddress,
    abi: jbAddressRegistryAbi,
    client: publicClient,
  });

  debug("🧃 getHookSpecifications::args", {
    dataHookAddress: args.dataHookAddress,
    projectId: args.projectId,
    rulesetId: args.rulesetId,
  });

  const hookSpecs = await getHookSpecifications(publicClient, {
    dataHookAddress: args.dataHookAddress,
    projectId: args.projectId,
    rulesetId: args.rulesetId,
    version: args.version,
  });

  const res = await Promise.all(
    hookSpecs.map(async (h) => {
      const deployerOf = await registry.read.deployerOf([h.hook]);
      debug("🧃 deployerOf", {
        hook: h.hook,
        deployerOf,
        deployerAddress,
      });
      return isAddressEqual(deployerOf, deployerAddress);
    }),
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
    version: JBVersion;
  },
) {
  // v6's returned JBPayHookSpecification gained a `noop` field, so the v4/v5 response
  // doesn't decode with the v6 ABI.
  const dataHook = getContract({
    address: args.dataHookAddress,
    abi: args.version === 6 ? jb721TiersHookAbi : jb721TiersHookV5Abi,
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

  debug("🧃 getHookSpecifications", { args, hookSpecifications });

  return hookSpecifications;
}
