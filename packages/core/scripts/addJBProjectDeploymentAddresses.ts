import { JBChainId, JBVersion, SUPPORTED_CHAINS } from "../src/contracts.js";
import fs from "fs";
import {
  getAllContractNames,
  getContractAddress,
  getV6CcipDeployerAddress,
} from "./utils.js";

const chainIds = Object.keys(SUPPORTED_CHAINS).map(Number) as JBChainId[];

const MAINNET_CHAIN_IDS: JBChainId[] = [1, 10, 8453, 42161];

async function buildAddressesFor(version: JBVersion) {
  const addresses = {};

  const names = getAllContractNames(version);

  for (const name of names) {
    addresses[name] = {};
    for (const chainId of chainIds) {
      try {
        addresses[name][chainId] = await getContractAddress(
          name,
          version,
          chainId,
        );
      } catch (e) {
        // Not every v6 contract is deployed on every chain (e.g. the v6 JBBuybackHook is not
        // on optimism_sepolia). A missing v4/v5 artifact is a regression — fail loudly.
        if (version !== 6) throw e;
        console.warn(
          `No v${version} ${name} deployment on chain ${chainId}, skipping.`,
        );
      }
    }
  }

  return addresses;
}

/**
 * v6 CCIP sucker deployer addresses, keyed by local chain then remote chain.
 */
async function buildV6CcipDeployerAddresses() {
  const addresses = {};

  for (const chainId of chainIds) {
    const isMainnet = MAINNET_CHAIN_IDS.includes(chainId);
    const peers = chainIds.filter(
      (peer) =>
        peer !== chainId && MAINNET_CHAIN_IDS.includes(peer) === isMainnet,
    );

    addresses[chainId] = {};
    for (const peer of peers) {
      addresses[chainId][peer] = await getV6CcipDeployerAddress(chainId, peer);
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
      6: await buildAddressesFor(6),
    },
    null,
    2,
  )} as const;

  /**
   * v6 CCIP sucker deployer addresses, keyed by local chain then remote chain.
   */
  export const jbCcipSuckerDeployerAddress = ${JSON.stringify(
    {
      6: await buildV6CcipDeployerAddresses(),
    },
    null,
    2,
  )} as const;`;
  return content;
}

async function addDefaultAddresses() {
  const filePath = "src/generated/juicebox.ts";
  const content = await buildDefaultAddressContent();
  fs.appendFileSync(filePath, content);
}

addDefaultAddresses();
