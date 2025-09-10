/**
 * IMPORTANT
 *
 * Update JBSuckerAbi.ts whenever it changes
 */

import { Chain } from "viem";
import { JBVersion, withVersionPath } from "./deployPaths.js";
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

function buildPath(
  base: string,
  version: JBVersion,
  chain: Chain,
  contractName: string | Contracts
) {
  const chainName = CHAIN_NAME[chain.id];
  return withVersionPath(base, version, chainName, String(contractName));
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
      (a: any) => !(a.name === "currentReclaimableSurplusOf" && a.inputs.length === 4)
    );
  }
  return abi;
}

async function buildContractConfig(
  contractNames: Contracts[],
  getPath: (chain: Chain, contractName: Contracts, version: JBVersion) => string,
  version: JBVersion = 4
): Promise<ContractConfig[]> {
  const chainToContractAddress = await Promise.all(
    Object.values(contractNames).map(async (contractName) => {
      // import deployment for each chain
      const deployments = await Promise.all(
        SUPPORTED_CHAINS.map(async (chain) =>
          importDeployment(getPath(chain, contractName, version))
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
        address: HAS_STATIC_ADDRESS.includes(contractName) ? address : undefined,
      };
    })
  );

  return chainToContractAddress;
}

const FAMILY_CONFIGS: { contracts: Contracts[]; base: string }[] = [
  {
    contracts: Object.values(JBCoreContracts) as unknown as Contracts[],
    base: "@bananapus/core/deployments/nana-core",
  },
  {
    contracts: Object.values(JB721HookContracts) as unknown as Contracts[],
    base: "@bananapus/721-hook/deployments/nana-721-hook",
  },
  {
    contracts: Object.values(JBAddressRegistryContracts) as unknown as Contracts[],
    base: "@bananapus/address-registry/deployments/nana-address-registry",
  },
  {
    contracts: Object.values(JBSuckerContracts) as unknown as Contracts[],
    base: "@bananapus/suckers/deployments/nana-suckers",
  },
  {
    contracts: Object.values(JBSwapTerminalContracts) as unknown as Contracts[],
    base: "@bananapus/swap-terminal/deployments/nana-swap-terminal",
  },
  {
    contracts: Object.values(JBBuybackHookContracts) as unknown as Contracts[],
    base: "@bananapus/buyback-hook/deployments/nana-buyback-hook",
  },
  {
    contracts: Object.values(JBOmnichainDeployerContracts) as unknown as Contracts[],
    base: "@bananapus/omnichain-deployers/deployments/nana-omnichain-deployers",
  },
];

async function buildFamilies(version: JBVersion) {
  const chunks = await Promise.all(
    FAMILY_CONFIGS.map(({ contracts, base }) =>
      buildContractConfig(contracts, (c, n, v) => buildPath(base, v, c, n), version)
    )
  );
  return chunks.flat();
}

const contracts = await buildFamilies(4);

export default {
  out: "src/generated.ts",
  contracts,
  plugins: [],
};
