import fs from "fs";
import { Chain } from "viem";
import { optimismSepolia, sepolia } from "viem/chains";

enum JBContracts {
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

async function importDeployment(
  chain: Chain,
  contractName: keyof typeof JBContracts
) {
  // TODO extremely flaky. We should add a const mapping of nana-core deployment chain names to chain ids
  const deployment = await import(
    `@bananapus/core/deployments/nana-core/${chain.name
      .toLowerCase()
      .split(" ")
      .join("_")}/${contractName}.json`
  );

  return deployment as unknown as {
    address: string;
    abi: unknown[];
  };
}

const EXTRAS = {
  JBAddressRegistry: {
    "11155111": "0x903412238A2A8507D3b202399536E34B404Abb0C",
    "11155420": "0x4fd2e89F2D22b931203f061e65C1180569575299",
  },
};

/**
 * Download the latest deployment manifest for each chain and generate a JSON file with the addresses.
 * Result file used in Wagmi CLI codegen.
 */
async function main() {
  const chainToContractAddress = await Promise.all(
    Object.values(JBContracts).map(async (contractName) => {
      const deployment = await importDeployment(sepolia, contractName);
      const deploymentOp = await importDeployment(
        optimismSepolia,
        contractName
      );

      // return addresses.reduce((acc, address, i) => {
      return {
        [sepolia.id]: deployment.address,
        [optimismSepolia.id]: deploymentOp.address,
      };
      // }, {});
    })
  );

  let contractNameToAddresses = Object.values(JBContracts).reduce(
    (acc, contractName, i) => {
      return {
        ...acc,
        [contractName]: chainToContractAddress[i],
      };
    },
    {}
  );

  // add in extras
  contractNameToAddresses = {
    ...contractNameToAddresses,
    ...EXTRAS,
  };

  fs.writeFileSync("src/generated/addresses.json", JSON.stringify(contractNameToAddresses));

  console.log("✅ Addresses generated and saved to addresses.json");
}

main();
