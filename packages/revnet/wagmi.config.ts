import { Chain } from "viem";
import {
  arbitrumSepolia,
  baseSepolia,
  optimismSepolia,
  sepolia,
} from "viem/chains";
import { react } from "@wagmi/cli/plugins";

enum RevnetCoreContracts {
  REVBasicDeployer = "REVBasicDeployer",
}

/**
 * Name of chains, according to the nannypus deployment directory names
 */
const CHAIN_NAME = {
  [sepolia.id]: "sepolia",
  [optimismSepolia.id]: "optimism_sepolia",
  [baseSepolia.id]: "base_sepolia",
  [arbitrumSepolia.id]: "arbitrum_sepolia",
} as Record<number, string>;

function revnetCorePath(
  chain: Chain,
  contractName: keyof typeof RevnetCoreContracts
) {
  const chainName = CHAIN_NAME[chain.id];
  //   return `@rev-net/core/deployments/revnet-core/${chainName}/${contractName}.json`;
  return `https://raw.githubusercontent.com/rev-net/revnet-core/main/deployments/revnet-core-testnet/${chainName}/REVBasicDeployer.json`;
}

async function importDeployment(importPath: string) {
  //   const { default: deployment } = await import(importPath);
  const deployment = await fetch(importPath).then((res) => res.json());
  return deployment as unknown as {
    address: string;
    abi: unknown[];
  };
}

async function buildRevnetCoreContractConfig() {
  const chainToContractAddress = await Promise.all(
    Object.values(RevnetCoreContracts).map(async (contractName) => {
      const deployment = await importDeployment(
        revnetCorePath(sepolia, contractName)
      );
      const deploymentOp = await importDeployment(
        revnetCorePath(optimismSepolia, contractName)
      );
      const deploymentBase = await importDeployment(
        revnetCorePath(baseSepolia, contractName)
      );
      const deploymentArb = await importDeployment(
        revnetCorePath(arbitrumSepolia, contractName)
      );

      return {
        name: contractName,
        abi: deployment.abi,
        address: {
          [sepolia.id]: deployment.address,
          [optimismSepolia.id]: deploymentOp.address,
          [baseSepolia.id]: deploymentBase.address,
          [arbitrumSepolia.id]: deploymentArb.address,
        },
      };
    })
  );

  return chainToContractAddress;
}

const contracts = await buildRevnetCoreContractConfig();

const config = {
  out: "src/generated/revnet.ts",
  contracts,
  plugins: [react()],
};

export default config;
