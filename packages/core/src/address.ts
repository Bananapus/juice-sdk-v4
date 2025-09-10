import { JBChainId } from "./types.js";

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
    | "omnichain",
  version: 4 | 5,
  chainId: number,
  contractName: string
) {
  const chain = CHAIN_NAME[chainId];
  const suffix = version === 5 ? "-v5" : "";
  switch (family) {
    case "core":
      return `@bananapus/core/deployments/nana-core${suffix}/${chain}/${contractName}.json`;
    case "721":
      return `@bananapus/721-hook/deployments/nana-721-hook${suffix}/${chain}/${contractName}.json`;
    case "address-registry":
      return `@bananapus/address-registry/deployments/nana-address-registry${suffix}/${chain}/${contractName}.json`;
    case "suckers":
      return `@bananapus/suckers/deployments/nana-suckers${suffix}/${chain}/${contractName}.json`;
    case "swap-terminal":
      return `@bananapus/swap-terminal/deployments/nana-swap-terminal${suffix}/${chain}/${contractName}.json`;
    case "buyback-hook":
      return `@bananapus/buyback-hook/deployments/nana-buyback-hook${suffix}/${chain}/${contractName}.json`;
    case "omnichain":
      return `@bananapus/omnichain-deployers/deployments/nana-omnichain-deployers${suffix}/${chain}/${contractName}.json`;
  }
}

export async function getDeploymentAddress(args: {
  family:
    | "core"
    | "721"
    | "address-registry"
    | "suckers"
    | "swap-terminal"
    | "buyback-hook"
    | "omnichain";
  contractName: string;
  chainId: JBChainId;
  version?: 4 | 5;
}): Promise<`0x${string}`> {
  const { family, contractName, chainId, version = 4 } = args;
  const p = deploymentPath(family, version, Number(chainId), contractName);
  const { default: deployment } = (await import(p, {
    assert: { type: "json" },
  })) as unknown as { default: { address: `0x${string}` } };
  return deployment.address;
}
