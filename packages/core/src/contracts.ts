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
  JBSwapTerminalRegistry = "JBSwapTerminalRegistry",
}

export enum JBBuybackHookContracts {
  JBBuybackHook = "JBBuybackHook",
  JBBuybackHookRegistry = "JBBuybackHookRegistry",
}

export enum JBOmnichainDeployerContracts {
  JBOmnichainDeployer = "JBOmnichainDeployer",
  JBOmnichainDeployer4_1 = "JBOmnichainDeployer4_1",
}

export enum RevnetCoreContracts {
  REVDeployer = "REVDeployer",
  REVLoans = "REVLoans",
  REVLoans1_1 = "REVLoans1_1", // for v4
}

export type Contract =
  | JB721HookContracts
  | JBCoreContracts
  | JBSuckerContracts
  | JBAddressRegistryContracts
  | JBSwapTerminalContracts
  | JBBuybackHookContracts
  | JBOmnichainDeployerContracts
  | RevnetCoreContracts;

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

export type JBChainId = keyof typeof SUPPORTED_CHAINS;
