import {
  Contract,
  JBChainId,
  JBVersion,
  RevnetCoreContracts,
  SUPPORTED_CHAINS,
} from "../src/contracts.js";
import { mainnet } from "viem/chains";
import { JBCoreContracts } from "../src/contracts.js";
import { JB721HookContracts } from "../src/contracts.js";
import { JBAddressRegistryContracts } from "../src/contracts.js";
import { JBSuckerContracts } from "../src/contracts.js";
import { JBSwapTerminalContracts } from "../src/contracts.js";
import { JBBuybackHookContracts } from "../src/contracts.js";
import { JBOmnichainDeployerContracts } from "../src/contracts.js";

export async function getContractsList() {
  const v5Contracts = await Promise.all(
    getAllContractNames(5).map((name) => getContract(name, 5, mainnet.id))
  );

  const v4Contracts = await Promise.all(
    getAllContractNames(4).map((name) => getContract(name, 4, mainnet.id))
  );

  const v5ContractsMap = new Map(v5Contracts.map((contract) => [contract.name, contract]));
  const uniqueV4Contracts = v4Contracts.filter((contract) => !v5ContractsMap.has(contract.name));

  const allContracts = [...v5Contracts, ...uniqueV4Contracts];

  return allContracts.map(({ name, abi }) => ({ name, abi: parseAbi(name, abi) }));
}

export async function getContractAddress(
  contract: Contract,
  version: JBVersion,
  chainId: JBChainId
) {
  const { address } = await getContract(contract, version, chainId);
  return address;
}

async function getContract(contract: Contract, version: JBVersion, chainId: JBChainId) {
  const pkg = PACKAGES.find((p) => p.contracts.includes(contract));
  if (!pkg) throw new Error(`Contract ${contract} not found in any package`);

  const pkgPath = getVersionedPath(pkg.path, version);

  const { abi, address } = await importDeploymentFile(
    `${pkgPath}/${getChainName(chainId)}/${contract}.json`
  );

  return { name: contract, abi, address };
}

function getVersionedPath(path: Path, version: JBVersion) {
  if (version === 4) return path;
  const [scope, packageName, , dir] = path.split("/");
  return `${scope}/${packageName}-v${version}/deployments/${dir === "nana-address-registry" ? dir : `${dir}-v${version}`}`;
}

async function importDeploymentFile(path: string) {
  const { default: deployment } = await import(path, { with: { type: "json" } });
  return deployment as { address: string; abi: unknown[] };
}

function getChainName(chainId: JBChainId) {
  return SUPPORTED_CHAINS[chainId];
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

type Path = `@${"bananapus" | "rev-net"}/${string}/deployments/${string}`;

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
  {
    contracts: Object.values(RevnetCoreContracts) as Contract[],
    path: "@rev-net/core/deployments/revnet-core",
  },
];

export function getAllContractNames(version: JBVersion) {
  return PACKAGES.flatMap(({ contracts }) => contracts).filter((contract) => {
    if (version === 4) {
      if (contract === JBSwapTerminalContracts.JBSwapTerminalRegistry) return false; // Added in v5
      if (contract === JBBuybackHookContracts.JBBuybackHookRegistry) return false; // Added in v5
    }

    if (version > 4) {
      if (contract === JBCoreContracts.JBController4_1) return false; // Exclude JBController4_1 for >v4
      if (contract === JBSwapTerminalContracts.JBSwapTerminal1_1) return false; // Exclude JBSwapTerminal1_1 for >v4
      if (contract === JBOmnichainDeployerContracts.JBOmnichainDeployer4_1) return false; // Exclude JBOmnichainDeployer4_1 for >v4
      if (contract === RevnetCoreContracts.REVLoans1_1) return false; // Exclude RevLoans1_1 for >v4
    }

    return true;
  });
}
