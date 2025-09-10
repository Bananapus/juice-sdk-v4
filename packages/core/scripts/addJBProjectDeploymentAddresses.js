import fs from "fs";

/**
 * Name of chains, according to the nannypus deployment directory names
 */
const CHAIN_NAME = {
  11155111: "sepolia",
  11155420: "optimism_sepolia",
  421614: "arbitrum_sepolia",
  84532: "base_sepolia",
  1: "ethereum",
  10: "optimism",
  42161: "arbitrum",
  8453: "base",
};

const FAMILIES = {
  core: ["JBMultiTerminal", "JBController", "JBController4_1"],
  721: ["JB721TiersHookStore"],
  buyback: ["JBBuybackHook"],
  swap: ["JBSwapTerminal", "JBSwapTerminal1_1"],
};

function nanaPathFor(version, family) {
  const suffix = version === 5 ? "-v5" : "";
  switch (family) {
    case "core":
      return (chain, name) =>
        `@bananapus/core/deployments/nana-core${suffix}/${CHAIN_NAME[chain.id]}/${name}.json`;
    case "721":
      return (chain, name) =>
        `@bananapus/721-hook/deployments/nana-721-hook${suffix}/${CHAIN_NAME[chain.id]}/${name}.json`;
    case "buyback":
      return (chain, name) =>
        `@bananapus/buyback-hook/deployments/nana-buyback-hook${suffix}/${CHAIN_NAME[chain.id]}/${name}.json`;
    case "swap":
      return (chain, name) =>
        `@bananapus/swap-terminal/deployments/nana-swap-terminal${suffix}/${CHAIN_NAME[chain.id]}/${name}.json`;
    default:
      throw new Error(`unknown family ${family}`);
  }
}

async function buildAddressesFor(version) {
  const addresses = {};
  for (const [family, contracts] of Object.entries(FAMILIES)) {
    const getPath = nanaPathFor(version, family);
    for (const contract of contracts) {
      const contractAddresses = {};
      for (const chainId of Object.keys(CHAIN_NAME)) {
        const path = getPath({ id: chainId }, contract);
        const data = await import(path, { assert: { type: "json" } });
        contractAddresses[chainId] = data.default.address;
      }
      addresses[contract] = contractAddresses;
    }
  }
  return addresses;
}

async function buildDefaultAddressContent() {
  const v4 = await buildAddressesFor(4);
  const v5 = await buildAddressesFor(5);

  const content = `
  /**
   * Addresses to use in JB project deployments.
   */
  export const jbProjectDeploymentAddresses = ${JSON.stringify(v4, null, 2)};
  export const jbProjectDeploymentAddressesV5 = ${JSON.stringify(v5, null, 2)};`;
  return content;
}

async function addDefaultAddresses() {
  const filePath = "src/generated/juicebox.ts";
  // Do not mutate generated addresses; only append project deployment maps
  const content = await buildDefaultAddressContent();
  fs.appendFileSync(filePath, content);
}

addDefaultAddresses();
