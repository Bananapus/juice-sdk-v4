import fs from "fs";
import path from "path";

/**
 * Name of chains, according to the nannypus deployment directory names
 */
const CHAIN_NAME = {
  11155111: "sepolia",
  11155420: "optimism_sepolia",
  421614: "arbitrum_sepolia",
  84532: "base_sepolia",
};

function nanaCorePath(chain, contractName) {
  const chainName = CHAIN_NAME[chain.id];
  return `@bananapus/core/deployments/nana-core-testnet/${chainName}/${contractName}.json`;
}

function nana721HookPath(chain, contractName) {
  const chainName = CHAIN_NAME[chain.id];
  return `@bananapus/721-hook/deployments/nana-721-hook-testnet/${chainName}/${contractName}.json`;
}

const CORE_CONTRACTS = ["JBMultiTerminal", "JBController"];
const CONTRACTS_721 = ["JB721TiersHookStore"];

async function buildDefaultAddresses() {
  const addresses = {};
  for (const contract of CORE_CONTRACTS) {
    const contractAddresses = {};

    for (const chainId of Object.keys(CHAIN_NAME)) {
      const path = nanaCorePath({ id: chainId }, contract);
      const data = await import(path, { assert: { type: "json" } });
      contractAddresses[chainId] = data.default.address;
    }
    addresses[contract] = contractAddresses;
  }
  for (const contract of CONTRACTS_721) {
    const contractAddresses = {};

    for (const chainId of Object.keys(CHAIN_NAME)) {
      const path = nana721HookPath({ id: chainId }, contract);
      const data = await import(path, { assert: { type: "json" } });
      contractAddresses[chainId] = data.default.address;
    }
    addresses[contract] = contractAddresses;
  }

  return addresses;
}

async function buildDefaultAddressContent() {
  const content = `
  /**
   * Addresses to use in JB project deployments.
   */
  export const jbProjectDeploymentAddresses = ${JSON.stringify(await buildDefaultAddresses(), null, 2)};`;
  return content;
}

async function addDefaultAddresses() {
  const content = await buildDefaultAddressContent();
  fs.appendFileSync("src/generated/juicebox.ts", content);
}

addDefaultAddresses();
