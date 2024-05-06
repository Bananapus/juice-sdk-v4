import fs from "fs";
import { Chain } from "viem";
import { optimismSepolia, sepolia } from "viem/chains";

enum JBCoreContracts {
  JBController = "JBController",
  JBDirectory = "JBDirectory",
  JBMultiTerminal = "JBMultiTerminal",
  JBRulesets = "JBRulesets",
  JBPermissions = "JBPermissions",
  JBProjects = "JBProjects",
  JBSplits = "JBSplits",
  JBTokens = "JBTokens",
  JBTerminalStore = "JBTerminalStore",
  JBFundAccessLimits = "JBFundAccessLimits",
}

enum JB721HookContracts {
  JBAddressRegistry = "JBAddressRegistry",
  JB721TiersHookDeployer = "JB721TiersHookDeployer",
  JB721TiersHook = "JB721TiersHook",
}

function nanaCorePath(
  chain: Chain,
  contractName: keyof typeof JBCoreContracts
) {
  // TODO not robust, probably. We should add a const mapping of nana-core deployment chain names to chain ids
  return `@bananapus/core/deployments/nana-core/${chain.name
    .toLowerCase()
    .split(" ")
    .join("_")}/${contractName}.json`;
}

function nana721HookPath(
  chain: Chain,
  contractName: keyof typeof JB721HookContracts
) {
  // TODO not robust, probably. We should add a const mapping of nana-721-hook deployment chain names to chain ids
  return `@bananapus/721-hook/deployments/nana-721-hook/${chain.name
    .toLowerCase()
    .split(" ")
    .join("_")}/${contractName}.json`;
}

async function importDeployment(importPath: string) {
  const deployment = await import(importPath);
  return deployment as unknown as {
    address: string;
    abi: unknown[];
  };
}

async function generateNanaCoreAddresses() {
  const chainToContractAddress = await Promise.all(
    Object.values(JBCoreContracts).map(async (contractName) => {
      const deployment = await importDeployment(
        nanaCorePath(sepolia, contractName)
      );
      const deploymentOp = await importDeployment(
        nanaCorePath(optimismSepolia, contractName)
      );

      // return addresses.reduce((acc, address, i) => {
      return {
        [sepolia.id]: deployment.address,
        [optimismSepolia.id]: deploymentOp.address,
      };
      // }, {});
    })
  );

  const contractNameToAddresses = Object.values(JBCoreContracts).reduce(
    (acc, contractName, i) => {
      return {
        ...acc,
        [contractName]: chainToContractAddress[i],
      };
    },
    {}
  );

  return contractNameToAddresses;
}

async function generateNana721HookAddresses() {
  const chainToContractAddress = await Promise.all(
    Object.values(JB721HookContracts).map(async (contractName) => {
      const deployment = await importDeployment(
        nana721HookPath(sepolia, contractName)
      );
      const deploymentOp = await importDeployment(
        nana721HookPath(optimismSepolia, contractName)
      );

      // return addresses.reduce((acc, address, i) => {
      return {
        [sepolia.id]: deployment.address,
        [optimismSepolia.id]: deploymentOp.address,
      };
      // }, {});
    })
  );

  const contractNameToAddresses = Object.values(JB721HookContracts).reduce(
    (acc, contractName, i) => {
      return {
        ...acc,
        [contractName]: chainToContractAddress[i],
      };
    },
    {}
  );

  return contractNameToAddresses;
}

/**
 * Download the latest deployment manifest for each chain and generate a JSON file with the addresses.
 * Result file used in Wagmi CLI codegen.
 */
async function main() {
  const [nanaCoreAddresses, nana721HookAddresses] = await Promise.all([
    generateNanaCoreAddresses(),
    generateNana721HookAddresses(),
  ]);

  const addresses = {
    ...nanaCoreAddresses,
    ...nana721HookAddresses,
  };

  fs.writeFileSync("src/generated/addresses.json", JSON.stringify(addresses));

  console.log("✅ Addresses generated and saved to addresses.json");
}

main();
