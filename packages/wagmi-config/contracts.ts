export type JBVersion = 4 | 5;

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

export type Contract =
  | JB721HookContracts
  | JBCoreContracts
  | JBSuckerContracts
  | JBAddressRegistryContracts
  | JBSwapTerminalContracts
  | JBBuybackHookContracts
  | JBOmnichainDeployerContracts;

type Path = `@bananapus/${string}/deployments/nana-${string}`;

export const PACKAGES: { contracts: Contract[]; path: Path }[] = [
  {
    contracts: Object.values(JBCoreContracts) as Contract[],
    path: "@bananapus/core/deployments/nana-core",
  },
  {
    contracts: Object.values(JB721HookContracts) as Contract[],
    path: "@bananapus/721-hook/deployments/nana-721-hook",
  },
  {
    contracts: Object.values(JBAddressRegistryContracts) as Contract[],
    path: "@bananapus/address-registry/deployments/nana-address-registry",
  },
  {
    contracts: Object.values(JBSuckerContracts) as Contract[],
    path: "@bananapus/suckers/deployments/nana-suckers",
  },
  {
    contracts: Object.values(JBSwapTerminalContracts) as Contract[],
    path: "@bananapus/swap-terminal/deployments/nana-swap-terminal",
  },
  {
    contracts: Object.values(JBBuybackHookContracts) as Contract[],
    path: "@bananapus/buyback-hook/deployments/nana-buyback-hook",
  },
  {
    contracts: Object.values(JBOmnichainDeployerContracts) as Contract[],
    path: "@bananapus/omnichain-deployers/deployments/nana-omnichain-deployers",
  },
];

export async function getContract(contract: Contract, version: JBVersion, chainId: JBChainId) {
  const pkg = PACKAGES.find((p) => p.contracts.includes(contract));
  if (!pkg) throw new Error(`Contract ${contract} not found in any package`);

  const pkgPath = getVersionedPath(pkg.path, version);

  const { abi, address } = await importDeploymentFile(
    `${pkgPath}/${getChainName(chainId)}/${contract}.json`
  );

  return { name: contract, abi, address };
}

export async function getContractAddress(
  contract: Contract,
  version: JBVersion,
  chainId: JBChainId
) {
  const { address } = await getContract(contract, version, chainId);
  return address;
}

export function getAllContractNames(version: JBVersion) {
  return PACKAGES.flatMap(({ contracts }) => contracts).filter((contract) => {
    if (version === 4) return true; // Include all contracts for v4

    if (contract === JBCoreContracts.JBController4_1) return false; // Exclude JBController4_1 for >v4
    if (contract === JBSwapTerminalContracts.JBSwapTerminal1_1) return false; // Exclude JBSwapTerminal1_1 for >v4
    if (contract === JBOmnichainDeployerContracts.JBOmnichainDeployer4_1) return false; // Exclude JBOmnichainDeployer4_1 for >v4
    return true;
  });
}

function getVersionedPath(path: Path, version: JBVersion) {
  if (version === 4) return path;
  const [, packageName, , dir] = path.split("/");
  return `@bananapus/${packageName}-v${version}/deployments/${dir === "nana-address-registry" ? dir : `${dir}-v${version}`}`;
}

async function importDeploymentFile(path: string) {
  const { default: deployment } = await import(path, { assert: { type: "json" } });
  return deployment as { address: string; abi: unknown[] };
}

function getChainName(chainId: JBChainId) {
  return SUPPORTED_CHAINS[chainId];
}
export type JBChainId = keyof typeof SUPPORTED_CHAINS;

export const SUPPORTED_CHAINS = {
  11155111: "sepolia",
  11155420: "optimism_sepolia",
  421614: "arbitrum_sepolia",
  84532: "base_sepolia",
  1: "ethereum",
  10: "optimism",
  42161: "arbitrum",
  8453: "base",
} as const;

/**
 * Contracts whose addresses aren;t projrect-specific (i.e. the same for all projects)
 */
// const HAS_STATIC_ADDRESS: Contracts[] = [
//   JBCoreContracts.JBDirectory,
//   JBCoreContracts.JBProjects,
//   JBCoreContracts.JBRulesets,
//   JBCoreContracts.JBSplits,
//   JBCoreContracts.JBTokens,
//   JBCoreContracts.JBPrices,
//   JBCoreContracts.ERC2771Forwarder,

//   JBAddressRegistryContracts.JBAddressRegistry,

//   JB721HookContracts.JB721TiersHookDeployer,
//   JB721HookContracts.JB721TiersHookProjectDeployer,

//   JBSuckerContracts.JBSuckerRegistry,
//   JBSuckerContracts.JBCCIPSuckerDeployer,
//   JBSuckerContracts.JBCCIPSuckerDeployer_1,
//   JBSuckerContracts.JBCCIPSuckerDeployer_2,

//   JBOmnichainDeployerContracts.JBOmnichainDeployer,
//   JBOmnichainDeployerContracts.JBOmnichainDeployer4_1,
// ];
