import {
  Contract,
  JBChainId,
  JBVersion,
  SUPPORTED_CHAINS,
} from "../src/contracts.js";
import fs from "fs";
import { aliasRouterAbis } from "./aliasRouterAbis.js";
import {
  getAllContractNames,
  getHistoricalContract,
  isMissingDeployment,
  V6_HISTORY,
  getContractAddress,
  getV6CcipDeployerAddress,
  getV6NativeDeployerAddress,
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
        if (version !== 6 || !isMissingDeployment(e)) throw e;
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

/**
 * v6 native-bridge sucker deployer addresses, keyed by local chain then remote chain.
 * Only L1<->L2 edges exist (native bridges only connect Ethereum with an L2).
 */
async function buildV6NativeDeployerAddresses() {
  const addresses = {};

  for (const chainId of chainIds) {
    const isMainnet = MAINNET_CHAIN_IDS.includes(chainId);
    const peers = chainIds.filter(
      (peer) =>
        peer !== chainId && MAINNET_CHAIN_IDS.includes(peer) === isMainnet,
    );

    addresses[chainId] = {};
    for (const peer of peers) {
      const address = await getV6NativeDeployerAddress(chainId, peer);
      if (address) addresses[chainId][peer] = address;
    }
  }

  return addresses;
}

async function buildV6History() {
  const history = {};
  for (const name of Object.keys(V6_HISTORY) as Contract[]) {
    history[name] = {};
    for (const generation of ["previous", "v1"] as const) {
      history[name][generation] = {};
      for (const chainId of chainIds) {
        try {
          history[name][generation][chainId] = (
            await getHistoricalContract(name, generation, chainId)
          ).address;
        } catch (error) {
          if (!isMissingDeployment(error)) throw error;
        }
      }
    }
  }
  return history;
}

async function buildDefaultAddressContent() {
  const current = await buildAddressesFor(6);
  const history = await buildV6History();
  const generations = {};
  for (const name of Object.keys(V6_HISTORY)) {
    generations[name] = {};
    for (const [chainId, address] of Object.entries(current[name])) {
      generations[name][chainId] =
        ["previous", "v1"].find(
          (generation) =>
            history[name][generation][chainId]?.toLowerCase() ===
            (address as string).toLowerCase(),
        ) ?? "current";
    }
  }
  const content = `
  /**
   * Addresses to use in JB project deployments.
   */
  export const jbContractAddress = ${JSON.stringify(
    {
      4: await buildAddressesFor(4),
      5: await buildAddressesFor(5),
      6: current,
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
  )} as const;

  /**
   * v6 native-bridge sucker deployer addresses, keyed by local chain then remote chain.
   * Native bridges only connect Ethereum with an L2, so only L1<->L2 edges exist.
   */
  export const jbNativeSuckerDeployerAddress = ${JSON.stringify(
    {
      6: await buildV6NativeDeployerAddresses(),
    },
    null,
    2,
  )} as const;

  /** Historical v6 deployments retained for activity decoding and projects that have not migrated. */
  export const jbContractAddressHistory = ${JSON.stringify({ 6: history }, null, 2)} as const;

  /** ABI generation for each canonical v6 deployment during the phased rollout. */
  export const jbContractAbiGeneration = ${JSON.stringify({ 6: generations }, null, 2)} as const;`;
  return content;
}

async function addDefaultAddresses() {
  const filePath = "src/generated/juicebox.ts";
  const content = await buildDefaultAddressContent();
  const bindings = aliasRouterAbis(fs.readFileSync(filePath, "utf8"));
  fs.writeFileSync(filePath, bindings + content);
}

addDefaultAddresses();
