import { JBChainId, JBVersion, SUPPORTED_CHAINS } from "../src/contracts.js";
import fs from "fs";
import { getAllContractNames, getContractAddress } from "./utils.js";

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
  const content = `
  /**
   * Addresses to use in JB project deployments.
   */
  export const jbContractAddress = ${JSON.stringify(
    {
      4: await buildAddressesFor(4),
      5: await buildAddressesFor(5),
    },
    null,
    2
  )} as const;`;
  return content;
}

async function addDefaultAddresses() {
  const filePath = "src/generated/juicebox.ts";
  const content = await buildDefaultAddressContent();
  fs.appendFileSync(filePath, content);
}

addDefaultAddresses();
