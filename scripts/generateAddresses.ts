import { addressFor, ForgeDeploy } from "forge-run-parser";
import fs from "fs";
import { CHAINS } from "../juice.config";

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
}

/**
 * Fetch the latest Forge deployment manifest for a given chain ID. From GitHub.
 *
 * @link https://github.com/Bananapus/juice-contracts-v4
 */
async function fetchLatestDeploymentFile(chainId: number) {
  const url = `https://github.com/Bananapus/nana-core/raw/main/broadcast/Deploy.s.sol/${chainId}/run-latest.json`;
  const response = await fetch(url);
  const file = await response.text();

  return JSON.parse(file) as unknown as ForgeDeploy;
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
  const files = await Promise.all(
    CHAINS.map((chainId) => fetchLatestDeploymentFile(chainId))
  );

  const chainToContractAddress = await Promise.all(
    Object.values(JBContracts).map(async (contractName) => {
      const addresses = await Promise.all(
        files.map((file) => addressFor(contractName, file))
      );

      return addresses.reduce((acc, address, i) => {
        return {
          ...acc,
          [CHAINS[i]]: address,
        };
      }, {});
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

  fs.writeFileSync("addresses.json", JSON.stringify(contractNameToAddresses));

  console.log("✅ Addresses generated and saved to addresses.json");
}

main();
