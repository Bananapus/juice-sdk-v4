/**
 * IMPORTANT
 *
 * Update JBSuckerAbi.ts whenever it changes
 */

import { Chain } from "viem";
import {
  arbitrum,
  arbitrumSepolia,
  base,
  baseSepolia,
  mainnet,
  optimism,
  optimismSepolia,
  sepolia,
} from "viem/chains";

type ContractConfig = {
  name: string;
  abi: unknown[];
  address?: Record<number, `0x${string}`>;
};

export enum JBCoreContracts {
  JBController = "JBController",
  JBController4_1 = "JBController4_1",
  JBDirectory = "JBDirectory",
  JBMultiTerminal = "JBMultiTerminal",
  JBRulesets = "JBRulesets",
  JBPermissions = "JBPermissions",
  JBProjects = "JBProjects",
  JBSplits = "JBSplits",
  JBTokens = "JBTokens",
  JBTerminalStore = "JBTerminalStore",
  JBFundAccessLimits = "JBFundAccessLimits",
  JBPrices = "JBPrices",
  ERC2771Forwarder = "ERC2771Forwarder",
}

export enum JB721HookContracts {
  JB721TiersHookDeployer = "JB721TiersHookDeployer",
  JB721TiersHookProjectDeployer = "JB721TiersHookProjectDeployer",
  JB721TiersHook = "JB721TiersHook",
  JB721TiersHookStore = "JB721TiersHookStore",
}

export enum JBAddressRegistryContracts {
  JBAddressRegistry = "JBAddressRegistry",
}

export enum JBSuckerContracts {
  JBSuckerRegistry = "JBSuckerRegistry",
  JBCCIPSuckerDeployer = "JBCCIPSuckerDeployer",
  JBCCIPSuckerDeployer_1 = "JBCCIPSuckerDeployer_1",
  JBCCIPSuckerDeployer_2 = "JBCCIPSuckerDeployer_2",
}

export enum JBSwapTerminalContracts {
  JBSwapTerminal = "JBSwapTerminal",
  JBSwapTerminal1_1 = "JBSwapTerminal1_1",
}

export enum JBBuybackHookContracts {
  JBBuybackHook = "JBBuybackHook",
}

export enum JBOmnichainDeployerContracts {
  JBOmnichainDeployer = "JBOmnichainDeployer",
  JBOmnichainDeployer4_1 = "JBOmnichainDeployer4_1",
}

type Contracts =
  | JB721HookContracts
  | JBCoreContracts
  | JBSuckerContracts
  | JBAddressRegistryContracts
  | JBSwapTerminalContracts
  | JBBuybackHookContracts
  | JBOmnichainDeployerContracts;

const SUPPORTED_CHAINS = [
  sepolia,
  optimismSepolia,
  baseSepolia,
  arbitrumSepolia,
  mainnet,
  optimism,
  base,
  arbitrum,
] as const;

/**
 * Name of chains, according to the nannypus deployment directory names
 */
const CHAIN_NAME = {
  [sepolia.id]: "sepolia",
  [optimismSepolia.id]: "optimism_sepolia",
  [arbitrumSepolia.id]: "arbitrum_sepolia",
  [baseSepolia.id]: "base_sepolia",
  [mainnet.id]: "ethereum",
  [optimism.id]: "optimism",
  [arbitrum.id]: "arbitrum",
  [base.id]: "base",
} as Record<number, string>;

/**
 * Contracts whose addresses aren;t projrect-specific (i.e. the same for all projects)
 */
const HAS_STATIC_ADDRESS: Contracts[] = [
  JBCoreContracts.JBDirectory,
  JBCoreContracts.JBProjects,
  JBCoreContracts.JBRulesets,
  JBCoreContracts.JBSplits,
  JBCoreContracts.JBTokens,
  JBCoreContracts.JBPrices,
  JBCoreContracts.ERC2771Forwarder,

  JBAddressRegistryContracts.JBAddressRegistry,

  JB721HookContracts.JB721TiersHookDeployer,
  JB721HookContracts.JB721TiersHookProjectDeployer,

  JBSuckerContracts.JBSuckerRegistry,
  JBSuckerContracts.JBCCIPSuckerDeployer,
  JBSuckerContracts.JBCCIPSuckerDeployer_1,
  JBSuckerContracts.JBCCIPSuckerDeployer_2,

  JBOmnichainDeployerContracts.JBOmnichainDeployer,
  JBOmnichainDeployerContracts.JBOmnichainDeployer4_1,
];

function nanaCorePath(chain: Chain, contractName: Contracts) {
  const chainName = CHAIN_NAME[chain.id];
  return `@bananapus/core/deployments/nana-core/${chainName}/${contractName}.json`;
}

function nanaSuckersPath(chain: Chain, contractName: Contracts) {
  const chainName = CHAIN_NAME[chain.id];
  return `@bananapus/suckers/deployments/nana-suckers/${chainName}/${contractName}.json`;
}

function nana721HookPath(chain: Chain, contractName: Contracts) {
  const chainName = CHAIN_NAME[chain.id];
  return `@bananapus/721-hook/deployments/nana-721-hook/${chainName}/${contractName}.json`;
}

function nanaAddressRegistryPath(chain: Chain, contractName: Contracts) {
  const chainName = CHAIN_NAME[chain.id];
  return `@bananapus/address-registry/deployments/nana-address-registry/${chainName}/${contractName}.json`;
}

function nanaSwapTerminalPath(chain: Chain, contractName: Contracts) {
  const chainName = CHAIN_NAME[chain.id];
  return `@bananapus/swap-terminal/deployments/nana-swap-terminal/${chainName}/${contractName}.json`;
}

function nanaBuybackHookPath(chain: Chain, contractName: Contracts) {
  const chainName = CHAIN_NAME[chain.id];
  return `@bananapus/buyback-hook/deployments/nana-buyback-hook/${chainName}/${contractName}.json`;
}

function nanaOmnichainDeployerPath(chain: Chain, contractName: Contracts) {
  const chainName = CHAIN_NAME[chain.id];
  return `@bananapus/omnichain-deployers/deployments/nana-omnichain-deployers/${chainName}/${contractName}.json`;
}

async function importDeployment(importPath: string) {
  const { default: deployment } = await import(importPath, {
    assert: { type: "json" },
  });
  return deployment as unknown as {
    address: string;
    abi: unknown[];
  };
}

function parseAbi(contractName: string, abi: any) {
  /**
   * @note there are 2 versions of `currentReclaimableSurplusOf` in JBTerminalStore ABI. We only want one of them.
   * Filter out the one we don't want.
   */
  if (contractName === JBCoreContracts.JBTerminalStore) {
    return abi.filter(
      (a: any) =>
        !(a.name === "currentReclaimableSurplusOf" && a.inputs.length === 4)
    );
  }
  return abi;
}

async function buildContractConfig(
  contractNames: Contracts[],
  getPath: (chain: Chain, contractName: Contracts) => string
): Promise<ContractConfig[]> {
  const chainToContractAddress = await Promise.all(
    Object.values(contractNames).map(async (contractName) => {
      // import deployment for each chain
      const deployments = await Promise.all(
        SUPPORTED_CHAINS.map(async (chain) =>
          importDeployment(getPath(chain, contractName))
        )
      );

      const address = SUPPORTED_CHAINS.reduce((acc: any, chain, i) => {
        acc[chain.id] = deployments[i].address;
        return acc;
      }, {});

      const abi = parseAbi(contractName, deployments[0].abi); // assume all deployments have the same ABI

      return {
        name: contractName,
        abi,
        address: HAS_STATIC_ADDRESS.includes(contractName)
          ? address
          : undefined,
      };
    })
  );

  return chainToContractAddress;
}

async function buildNanaCoreContractConfig() {
  return buildContractConfig(Object.values(JBCoreContracts), nanaCorePath);
}

async function buildNana721ContractConfig() {
  return buildContractConfig(
    Object.values(JB721HookContracts),
    nana721HookPath
  );
}

async function buildNanaAddressRegistryContractConfig() {
  return buildContractConfig(
    Object.values(JBAddressRegistryContracts),
    nanaAddressRegistryPath
  );
}

async function buildNanaSuckersContractConfig() {
  return buildContractConfig(Object.values(JBSuckerContracts), nanaSuckersPath);
}

async function buildNanaSwapTerminalContractConfig() {
  return buildContractConfig(
    Object.values(JBSwapTerminalContracts),
    nanaSwapTerminalPath
  );
}

async function buildNanaBuybackHookContractConfig() {
  return buildContractConfig(
    Object.values(JBBuybackHookContracts),
    nanaBuybackHookPath
  );
}

async function buildNanaOmnichainDeployerContractConfig() {
  return buildContractConfig(
    Object.values(JBOmnichainDeployerContracts),
    nanaOmnichainDeployerPath
  );
}

const coreContracts = await buildNanaCoreContractConfig();
const contracts721 = await buildNana721ContractConfig();
const contractsSuckers = await buildNanaSuckersContractConfig();
const contractsAddressRegistry = await buildNanaAddressRegistryContractConfig();
const contractsSwapTerminal = await buildNanaSwapTerminalContractConfig();
const contractsBuybackHook = await buildNanaBuybackHookContractConfig();
const contractsOmnichainDeployer =
  await buildNanaOmnichainDeployerContractConfig();

const contracts = [
  ...coreContracts,
  ...contracts721,
  ...contractsSuckers,
  ...contractsAddressRegistry,
  ...contractsSwapTerminal,
  ...contractsBuybackHook,
  ...contractsOmnichainDeployer,
];

export default {
  out: "src/generated.ts",
  contracts,
  plugins: [],
};
