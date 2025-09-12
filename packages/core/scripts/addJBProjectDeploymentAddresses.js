import fs from "fs";
import { pathForFamily } from "@jbm/wagmi-config/deployPaths";

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
  core: ["JBMultiTerminal", "JBController"],
  721: ["JB721TiersHookStore"],
  "buyback-hook": ["JBBuybackHook"],
  "swap-terminal": ["JBSwapTerminal"],
};

function getFamiliesFor(version) {
  if (version === 5) return FAMILIES;
  if (version === 4) {
    return {
      ...FAMILIES,
      core: [...FAMILIES.core, "JBController4_1"],
      "swap-terminal": [...FAMILIES["swap-terminal"], "JBSwapTerminal1_1"],
    };
  }
  throw new Error(`Invalid version: ${version}`);
}

async function buildAddressesFor(version) {
  const addresses = {};

  for (const [family, contracts] of Object.entries(getFamiliesFor(version))) {
    for (const contract of contracts) {
      const contractAddresses = {};
      for (const chainId of Object.keys(CHAIN_NAME)) {
        const path = pathForFamily(
          version,
          /** @type {import("@jbm/wagmi-config/deployPaths").Family} */ (family),
          CHAIN_NAME[chainId],
          contract
        );
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
