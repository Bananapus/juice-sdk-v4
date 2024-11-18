import { Chain } from "viem";
import {
  arbitrumSepolia,
  baseSepolia,
  optimismSepolia,
  sepolia,
} from "viem/chains";

enum JBCoreContracts {
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
  JBPrices = "JBPrices",
}

enum JB721HookContracts {
  JBAddressRegistry = "JBAddressRegistry",
  JB721TiersHookDeployer = "JB721TiersHookDeployer",
  JB721TiersHookProjectDeployer = "JB721TiersHookProjectDeployer",
  JB721TiersHook = "JB721TiersHook",
}

enum JBSuckerContracts {
  BPSuckerRegistry = "BPSuckerRegistry",
}

type Contracts = JB721HookContracts | JBCoreContracts | JBSuckerContracts;

const SUPPORTED_CHAINS = [
  sepolia,
  optimismSepolia,
  baseSepolia,
  arbitrumSepolia,
];

/**
 * Name of chains, according to the nannypus deployment directory names
 */
const CHAIN_NAME = {
  [sepolia.id]: "sepolia",
  [optimismSepolia.id]: "optimism_sepolia",
  [arbitrumSepolia.id]: "arbitrum_sepolia",
  [baseSepolia.id]: "base_sepolia",
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
  JB721HookContracts.JBAddressRegistry,
  JB721HookContracts.JB721TiersHookDeployer,
  JB721HookContracts.JB721TiersHookProjectDeployer,
  JBSuckerContracts.BPSuckerRegistry,
];

function nanaCorePath(chain: Chain, contractName: Contracts) {
  const chainName = CHAIN_NAME[chain.id];
  return `@bananapus/core/deployments/nana-core-testnet/${chainName}/${contractName}.json`;
}

function nanaSuckersPath(chain: Chain, contractName: Contracts) {
  const chainName = CHAIN_NAME[chain.id];
  return `@bananapus/suckers/deployments/nana-suckers-testnet/${chainName}/${contractName}.json`;
}

/**
 * JBAddressRegistry didnt get deployed in the nana-721-hook-testnet.
 * This function should be temporary fix unitl JBAddressRegistry is included in the nana-721-hook-testnet.
 */
function legacyNana721HookPath(chain: Chain, contractName: Contracts) {
  const chainName = CHAIN_NAME[chain.id];
  return `@bananapus/721-hook/deployments/nana-721-hook/${chainName}/${contractName}.json`;
}

function nana721HookPath(chain: Chain, contractName: Contracts) {
  if (contractName === JB721HookContracts.JBAddressRegistry) {
    return legacyNana721HookPath(chain, contractName);
  }

  const chainName = CHAIN_NAME[chain.id];
  return `@bananapus/721-hook/deployments/nana-721-hook-testnet/${chainName}/${contractName}.json`;
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

async function buildContractConfig(
  contractNames: Contracts[],
  getPath: (chain: Chain, contractName: Contracts) => string
) {
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

      const abi = deployments[0].abi; // assume all deployments have the same ABI

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

async function buildNanaSuckersContractConfig() {
  return buildContractConfig(Object.values(JBSuckerContracts), nanaSuckersPath);
}

const coreContracts = await buildNanaCoreContractConfig();
const contracts721 = await buildNana721ContractConfig();
const contractsSuckers = await buildNanaSuckersContractConfig();
const contracts = [...coreContracts, ...contracts721, ...contractsSuckers];

export default {
  out: "src/generated.ts",
  contracts,
  plugins: [],
};
