import {
  getAllContractNames,
  getContractAddress,
  JBChainId,
  JBVersion,
  SUPPORTED_CHAINS,
} from "@jbm/wagmi-config/contracts";
import fs from "fs";

const chainIds = Object.keys(SUPPORTED_CHAINS).map(Number) as JBChainId[];

async function buildAddressesFor(version: JBVersion) {
  const addresses = {};

  const names = getAllContractNames(version);

  for (const name of names) {
    addresses[name] = {};
    for (const chainId of chainIds) {
      addresses[name][chainId] = await getContractAddress(name, version, chainId);
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
  export const jbContractAddress = {} as Record<4|5, Record<string, Record<string, \`0x\${string}\`>>>;

  jbContractAddress["4"] = ${JSON.stringify(v4, null, 2)} as const;
  
  jbContractAddress["5"] = ${JSON.stringify(v5, null, 2)} as const;`;
  return content;
}

async function addDefaultAddresses() {
  const filePath = "src/generated/juicebox.ts";
  // Do not mutate generated addresses; only append project deployment maps
  const content = await buildDefaultAddressContent();
  fs.appendFileSync(filePath, content);
}

addDefaultAddresses();
