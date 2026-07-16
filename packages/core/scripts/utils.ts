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
import { JBRouterTerminalContracts } from "../src/contracts.js";
import { JBOmnichainDeployerContracts } from "../src/contracts.js";

/**
 * The v6 ERC2771Forwarder. It isn't included in the `@bananapus/core-v6` deployment files,
 * but is deployed to the same address on every supported chain.
 */
const V6_ERC2771_FORWARDER = "0x3bA60b60933916a7C87D0860DcEE62a0CE34E3e2";

export async function getContractsList() {
  const v6Contracts = await Promise.all(
    getAllContractNames(6).map((name) => getContract(name, 6, mainnet.id)),
  );

  const v5Contracts = await Promise.all(
    getAllContractNames(5).map((name) => getContract(name, 5, mainnet.id)),
  );

  const v4Contracts = await Promise.all(
    getAllContractNames(4).map((name) => getContract(name, 4, mainnet.id)),
  );

  // The unsuffixed ABI for each contract name comes from the latest version that deploys it.
  // Older versions whose ABI drifted from that canonical one get their own `<Name>V<version>`
  // entry (e.g. `JBOmnichainDeployerV5`), so version-branched code can target the right ABI.
  const byName = new Map(
    v6Contracts.map((contract) => [contract.name, contract]),
  );
  const allContracts = [...v6Contracts];

  for (const { contracts, version } of [
    { contracts: v5Contracts, version: 5 },
    { contracts: v4Contracts, version: 4 },
  ]) {
    for (const contract of contracts) {
      const canonical = byName.get(contract.name);
      if (!canonical) {
        byName.set(contract.name, contract);
        allContracts.push(contract);
      } else if (abiKey(canonical.abi) !== abiKey(contract.abi)) {
        allContracts.push({ ...contract, name: `${contract.name}V${version}` });
      }
    }
  }

  return allContracts.map(({ name, abi }) => ({
    name,
    abi: parseAbi(name, abi),
  }));
}

// Normalizes away artifact-format noise (JSON key order, `internalType`) so only real
// interface changes (selectors, param/return layouts and names) count as drift.
function abiKey(abi: unknown[]) {
  const normalizeParam = (param: any): unknown => ({
    name: param.name ?? "",
    type: param.type,
    components: (param.components ?? []).map(normalizeParam),
  });
  return JSON.stringify(
    abi
      .map((item: any) =>
        JSON.stringify({
          type: item.type,
          name: item.name ?? "",
          stateMutability: item.stateMutability ?? "",
          inputs: (item.inputs ?? []).map(normalizeParam),
          outputs: (item.outputs ?? []).map(normalizeParam),
        }),
      )
      .sort(),
  );
}

export async function getContractAddress(
  contract: Contract,
  version: JBVersion,
  chainId: JBChainId,
) {
  const { address } = await getContract(contract, version, chainId);
  return address;
}

/**
 * The address of the v6 CCIP sucker deployer on `chainId` that bridges to `peerChainId`.
 *
 * Unlike v4/v5 (which numbered the deployers `JBCCIPSuckerDeployer`, `_1`, `_2`), v6 names each
 * deployer after its remote chain (e.g. `JBCCIPSuckerDeployer__OP`), and the set differs per chain.
 */
export async function getV6CcipDeployerAddress(
  chainId: JBChainId,
  peerChainId: JBChainId,
) {
  const { address } = await importDeploymentFile(
    `@bananapus/suckers-v6/deployments/${getChainName(chainId)}/JBCCIPSuckerDeployer__${
      CCIP_REMOTE_LABELS[peerChainId]
    }.json`,
  );
  return address;
}

const CCIP_REMOTE_LABELS: Record<JBChainId, string> = {
  1: "ETH",
  10: "OP",
  8453: "BASE",
  42161: "ARB",
  11155111: "ETH_SEP",
  11155420: "OP_SEP",
  84532: "BASE_SEP",
  421614: "ARB_SEP",
};

/**
 * The address of the v6 native-bridge sucker deployer on `chainId` that bridges to
 * `peerChainId`, or null when the pair has no native bridge (native bridges only connect
 * Ethereum with an L2). The deployer is named after the pair's rollup on both sides
 * (e.g. `JBOptimismSuckerDeployer` on both ethereum and optimism).
 */
export async function getV6NativeDeployerAddress(
  chainId: JBChainId,
  peerChainId: JBChainId,
) {
  const localIsL1 = L1_CHAIN_IDS.includes(chainId);
  const peerIsL1 = L1_CHAIN_IDS.includes(peerChainId);
  if (localIsL1 === peerIsL1) return null;
  const rollup = NATIVE_ROLLUP_LABELS[localIsL1 ? peerChainId : chainId];
  if (!rollup) return null;
  const { address } = await importDeploymentFile(
    `@bananapus/suckers-v6/deployments/${getChainName(chainId)}/JB${rollup}SuckerDeployer.json`,
  );
  return address;
}

const L1_CHAIN_IDS: JBChainId[] = [1, 11155111];

const NATIVE_ROLLUP_LABELS: Partial<Record<JBChainId, string>> = {
  10: "Optimism",
  8453: "Base",
  42161: "Arbitrum",
  11155420: "Optimism",
  84532: "Base",
  421614: "Arbitrum",
};

async function getContract(
  contract: Contract,
  version: JBVersion,
  chainId: JBChainId,
) {
  if (version === 6 && contract === JBCoreContracts.ERC2771Forwarder) {
    // Same OZ forwarder ABI as v4; only the address differs.
    const { abi } = await importDeploymentFile(
      `@bananapus/core/deployments/nana-core/${getChainName(chainId)}/ERC2771Forwarder.json`,
    );
    return { name: contract, abi, address: V6_ERC2771_FORWARDER };
  }

  const pkg = PACKAGES.find((p) => p.contracts.includes(contract));
  if (!pkg) throw new Error(`Contract ${contract} not found in any package`);

  const pkgPath = getVersionedPath(pkg.path, version);

  const { abi, address } = await importDeploymentFile(
    `${pkgPath}/${getChainName(chainId)}/${contract}.json`,
  );

  return { name: contract, abi, address };
}

function getVersionedPath(path: Path, version: JBVersion) {
  if (version === 4) return path;
  const [scope, packageName, , dir] = path.split("/");
  // v6 packages put the per-chain files directly under `deployments/`.
  if (version === 6) return `${scope}/${packageName}-v6/deployments`;
  return `${scope}/${packageName}-v${version}/deployments/${dir === "nana-address-registry" ? dir : `${dir}-v${version}`}`;
}

async function importDeploymentFile(path: string) {
  const { default: deployment } = await import(path, {
    with: { type: "json" },
  });
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
      (a: any) =>
        !(a.name === "currentReclaimableSurplusOf" && a.inputs.length === 4),
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
    contracts: Object.values(JBRouterTerminalContracts) as Contract[],
    path: "@bananapus/router-terminal/deployments/nana-router-terminal",
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
      if (contract === JBSwapTerminalContracts.JBSwapTerminalRegistry)
        return false; // Added in v5
      if (contract === JBBuybackHookContracts.JBBuybackHookRegistry)
        return false; // Added in v5
      if (contract === JBSwapTerminalContracts.JBSwapTerminalUSDCRegistry)
        return false; // Added in v5
    }

    if (version > 4) {
      if (contract === JBCoreContracts.JBController4_1) return false; // Exclude JBController4_1 for >v4
      if (contract === JBSwapTerminalContracts.JBSwapTerminal1_1) return false; // Exclude JBSwapTerminal1_1 for >v4
      if (contract === JBOmnichainDeployerContracts.JBOmnichainDeployer4_1)
        return false; // Exclude JBOmnichainDeployer4_1 for >v4
      if (contract === RevnetCoreContracts.REVLoans1_1) return false; // Exclude RevLoans1_1 for >v4
    }

    // The router terminal replaces the swap terminal in v6.
    if (version < 6) {
      if (contract === JBRouterTerminalContracts.JBRouterTerminal) return false;
      if (contract === JBRouterTerminalContracts.JBRouterTerminalRegistry)
        return false;
      if (contract === RevnetCoreContracts.REVOwner) return false; // Added in v6
    }

    if (version === 6) {
      if (contract === JBSwapTerminalContracts.JBSwapTerminal) return false;
      if (contract === JBSwapTerminalContracts.JBSwapTerminalRegistry)
        return false;
      if (contract === JBSwapTerminalContracts.JBSwapTerminalUSDCRegistry)
        return false;

      // v6 CCIP sucker deployers are named per remote chain and the set differs per chain;
      // they're exposed via `CCIP_SUCKER_DEPLOYER_ADDRESSES` instead of `jbContractAddress`.
      if (contract === JBSuckerContracts.JBCCIPSuckerDeployer) return false;
      if (contract === JBSuckerContracts.JBCCIPSuckerDeployer_1) return false;
      if (contract === JBSuckerContracts.JBCCIPSuckerDeployer_2) return false;
    }

    return true;
  });
}
