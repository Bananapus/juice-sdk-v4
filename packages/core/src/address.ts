import { JBChainId } from "./types.js";
import { pathForFamily, JBVersion } from "@jbm/wagmi-config/deployPaths";

// Minimal runtime resolver that reads deployment JSONs directly when versioned constants are not present
const CHAIN_NAME: Record<number, string> = {
  11155111: "sepolia",
  11155420: "optimism_sepolia",
  421614: "arbitrum_sepolia",
  84532: "base_sepolia",
  1: "ethereum",
  10: "optimism",
  42161: "arbitrum",
  8453: "base",
};

function deploymentPath(
  family:
    | "core"
    | "721"
    | "address-registry"
    | "suckers"
    | "swap-terminal"
    | "buyback-hook"
    | "omnichain-deployers",
  version: JBVersion,
  chainId: number,
  contractName: string
) {
  const chain = CHAIN_NAME[chainId];
  return pathForFamily(version, family as any, chain, contractName);
}

export async function getDeploymentAddress(args: {
  family:
    | "core"
    | "721"
    | "address-registry"
    | "suckers"
    | "swap-terminal"
    | "buyback-hook"
    | "omnichain-deployers";
  contractName: string;
  chainId: JBChainId;
  version?: JBVersion;
}): Promise<`0x${string}`> {
  const { family, contractName, chainId, version = 4 } = args;
  const p = deploymentPath(family, version, Number(chainId), contractName);
  const { default: deployment } = (await import(p)) as unknown as {
    default: { address: `0x${string}` };
  };

  return deployment.address;
}
