import { Chain } from "viem";
import { optimismSepolia, sepolia } from "viem/chains";

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
}

enum JB721HookContracts {
  JBAddressRegistry = "JBAddressRegistry",
  JB721TiersHookDeployer = "JB721TiersHookDeployer",
  JB721TiersHook = "JB721TiersHook",
}

/**
 * Name of chains, according to the nannypus deployment directory names
 */
const CHAIN_NAME = {
  [sepolia.id]: "sepolia",
  [optimismSepolia.id]: "optimism_sepolia",
} as Record<number, string>;

const HAS_STATIC_ADDRESS: (JB721HookContracts | JBCoreContracts)[] = [
  JBCoreContracts.JBDirectory,
  JBCoreContracts.JBRulesets,
  JBCoreContracts.JBSplits,
  JBCoreContracts.JBTokens,
  JB721HookContracts.JBAddressRegistry,
  JB721HookContracts.JB721TiersHookDeployer,
];

function nanaCorePath(
  chain: Chain,
  contractName: keyof typeof JBCoreContracts
) {
  const chainName = CHAIN_NAME[chain.id];
  return `@bananapus/core/deployments/nana-core-testnet/${chainName}/${contractName}.json`;
}

/**
 * JBAddressRegistry didnt get deployed in the nana-721-hook-testnet.
 * This function should be temporary fix unitl JBAddressRegistry is included in the nana-721-hook-testnet.
 */
function legacyNana721HookPath(
  chain: Chain,
  contractName: keyof typeof JB721HookContracts
) {
  const chainName = CHAIN_NAME[chain.id];
  return `@bananapus/721-hook/deployments/nana-721-hook/${chainName}/${contractName}.json`;
}

function nana721HookPath(
  chain: Chain,
  contractName: keyof typeof JB721HookContracts
) {
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

async function buildNanaCoreContractConfig() {
  const chainToContractAddress = await Promise.all(
    Object.values(JBCoreContracts).map(async (contractName) => {
      const deployment = await importDeployment(
        nanaCorePath(sepolia, contractName)
      );
      const deploymentOp = await importDeployment(
        nanaCorePath(optimismSepolia, contractName)
      );

      return {
        name: contractName,
        abi: deployment.abi,
        address: HAS_STATIC_ADDRESS.includes(contractName)
          ? {
              [sepolia.id]: deployment.address,
              [optimismSepolia.id]: deploymentOp.address,
            }
          : undefined,
      };
    })
  );

  return chainToContractAddress;
}

async function buildNana721ContractConfig() {
  const chainToContractAddress = await Promise.all(
    Object.values(JB721HookContracts).map(async (contractName) => {
      const deployment = await importDeployment(
        nana721HookPath(sepolia, contractName)
      );
      const deploymentOp = await importDeployment(
        nana721HookPath(optimismSepolia, contractName)
      );

      return {
        name: contractName,
        abi: deployment.abi,
        address: HAS_STATIC_ADDRESS.includes(contractName)
          ? {
              [sepolia.id]: deployment.address,
              [optimismSepolia.id]: deploymentOp.address,
            }
          : null,
      };
    })
  );

  return chainToContractAddress;
}

const coreContracts = await buildNanaCoreContractConfig();
const contracts721 = await buildNana721ContractConfig();
const contracts = [...coreContracts, ...contracts721];

export default {
  out: "src/generated.ts",
  contracts,
  plugins: [],
};
