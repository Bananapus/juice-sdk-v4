import { Chain } from "viem";
import {
  arbitrum,
  arbitrumSepolia,
  base,
  baseSepolia,
  mainnet,
  optimism,
  optimismSepolia,
  sepolia,
} from "viem/chains";
import { react } from "@wagmi/cli/plugins";

enum RevnetCoreContracts {
  REVDeployer = "REVDeployer",
  REVLoans = "REVLoans",
}

/**
 * Name of chains, according to the nannypus deployment directory names
 */
const CHAIN_NAME = {
  [sepolia.id]: "sepolia",
  [optimismSepolia.id]: "optimism_sepolia",
  [arbitrumSepolia.id]: "arbitrum_sepolia",
  [baseSepolia.id]: "base_sepolia",
  [mainnet.id]: "ethereum",
  [optimism.id]: "optimism",
  [arbitrum.id]: "arbitrum",
  [base.id]: "base",

} as Record<number, string>;

function revnetCorePath(
  chain: Chain,
  contractName: keyof typeof RevnetCoreContracts
) {
  const chainName = CHAIN_NAME[chain.id];
  return `@rev-net/core/deployments/revnet-core/${chainName}/${contractName}.json`;
  // return `https://raw.githubusercontent.com/rev-net/revnet-core/main/deployments/revnet-core/${chainName}/REVDeployer.json`;
}

async function importDeployment(importPath: string) {
  const { default: deployment } = await import(importPath, {
    assert: { type: "json" },
  });
  return deployment;

  // const deployment = await fetch(importPath).then((res) => res.json());
  // return deployment as unknown as {
  //   address: string;
  //   abi: unknown[];
  // };
}

async function buildRevnetCoreContractConfig() {
  const chainToContractAddress = await Promise.all(
    Object.values(RevnetCoreContracts).map(async (contractName) => {
      const deploymentSep = await importDeployment(
        revnetCorePath(sepolia, contractName)
      );
      const deploymentOpSep = await importDeployment(
        revnetCorePath(optimismSepolia, contractName)
      );
      const deploymentBaseSep = await importDeployment(
        revnetCorePath(baseSepolia, contractName)
      );
      const deploymentArbSep = await importDeployment(
        revnetCorePath(arbitrumSepolia, contractName)
      );

      const deployment = await importDeployment(
        revnetCorePath(mainnet, contractName)
      );
      const deploymentOp = await importDeployment(
        revnetCorePath(optimism, contractName)
      );
      const deploymentBase = await importDeployment(
        revnetCorePath(base, contractName)
      );
      const deploymentArb = await importDeployment(
        revnetCorePath(arbitrum, contractName)
      );

      return {
        name: contractName,
        abi: deploymentSep.abi,
        address: {
          [sepolia.id]: deploymentSep.address,
          [optimismSepolia.id]: deploymentOpSep.address,
          [baseSepolia.id]: deploymentBaseSep.address,
          [arbitrumSepolia.id]: deploymentArbSep.address,
          [mainnet.id]: deploymentArb.address,
          [optimism.id]: deploymentOp.address,
          [base.id]: deploymentBase.address,
          [arbitrum.id]: deploymentArb.address,
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
