import { zeroAddress, type Address, type PublicClient } from "viem";
import {
  JBAddressRegistryContracts,
  JBCoreContracts,
  JBOmnichainDeployerContracts,
} from "../contracts.js";
import { jbAddressRegistryAbi } from "../generated/abi/jbAddressRegistryAbi.js";
import { jbDirectoryAbi } from "../generated/abi/jbDirectoryAbi.js";
import { jbOmnichainDeployerAbi } from "../generated/abi/jbOmnichainDeployerAbi.js";
import { jbV6ContractAddress } from "../generated/addresses/jbV6ContractAddress.js";
import type { JBChainId } from "../types.js";
import { getProjectNftInventory } from "../v6/nftInventory.js";
import { resolveProjectBuybackHook } from "../v6/projectHooks.js";
import { getCurrentRuleset } from "../v6/rulesets.js";
import { resolveProjectRouterTerminal } from "../v6/terminals.js";
import { knownAddressName } from "./decode.js";

/** One contract a project points at that the SDK does not recognize. */
export type UnknownProjectContract = {
  chainId: JBChainId;
  role: string;
  address: Address;
  note: string;
};

export type ProjectContractAudit = {
  chainId: JBChainId;
  unknown: UnknownProjectContract[];
  /**
   * A read failed. An empty `unknown` then proves nothing: the caller says the check did not
   * finish instead of showing a clean project.
   */
  failed: boolean;
};

const same = (a: string, b: string | undefined) =>
  !!b && a.toLowerCase() === b.toLowerCase();

const isKnown = (chainId: JBChainId, address: string) =>
  !!knownAddressName(chainId, address);

/**
 * The contracts one project points at on one chain, checked against the deployments the SDK
 * names: the controller, every terminal, the rule-change hook, the data hook, the hook the
 * omnichain deployer delegates to, and the buyback hook behind them. An instance counts as known
 * when the address registry names a known deployer for it, or when it is the project's verified
 * Defifa game.
 */
export async function auditProjectContracts(
  client: PublicClient,
  {
    chainId,
    projectId,
    isRevnet,
  }: { chainId: JBChainId; projectId: bigint; isRevnet: boolean },
): Promise<ProjectContractAudit> {
  const unknown: UnknownProjectContract[] = [];
  const directory = jbV6ContractAddress[JBCoreContracts.JBDirectory][
    chainId
  ] as Address;
  const registry = jbV6ContractAddress[
    JBAddressRegistryContracts.JBAddressRegistry
  ][chainId] as Address;
  const omnichain =
    jbV6ContractAddress[JBOmnichainDeployerContracts.JBOmnichainDeployer][
      chainId
    ];

  const check = async (
    role: string,
    address: Address | undefined,
    note: string,
  ) => {
    if (!address || address === zeroAddress || isKnown(chainId, address))
      return;
    const deployer = await client.readContract({
      address: registry,
      abi: jbAddressRegistryAbi,
      functionName: "deployerOf",
      args: [address],
    });
    if (deployer !== zeroAddress && isKnown(chainId, deployer)) return;
    unknown.push({ chainId, role, address, note });
  };
  const checkDataHook = async (
    role: string,
    hook: Address | undefined,
    note: string,
  ) => {
    if (!hook || hook === zeroAddress || isKnown(chainId, hook)) return;
    const inventory = await getProjectNftInventory(client, {
      chainId,
      projectId,
      isRevnet,
      tierLimit: 1,
    });
    if (inventory?.protocol === "defifa" && same(inventory.hook, hook)) return;
    await check(role, hook, note);
  };

  try {
    const [controller, terminals] = await Promise.all([
      client.readContract({
        address: directory,
        abi: jbDirectoryAbi,
        functionName: "controllerOf",
        args: [projectId],
      }),
      client.readContract({
        address: directory,
        abi: jbDirectoryAbi,
        functionName: "terminalsOf",
        args: [projectId],
      }),
    ]);
    await check(
      "Controller",
      controller,
      "Rulesets and token actions are governed by this contract.",
    );
    for (const terminal of terminals) {
      await check(
        "Payment terminal",
        terminal,
        "Payments, payouts, cash outs, and balances depend on terminal behavior.",
      );
    }
    // The registry is known, but it forwards payments to a terminal it picks per project.
    const route = await resolveProjectRouterTerminal(client, {
      chainId,
      projectId,
    });
    if (route.via === "registry" && route.status === "unknown") {
      unknown.push({
        chainId,
        role: "Router terminal",
        address: route.terminal,
        note: "The router registry forwards this project’s routed payments to this contract.",
      });
    }
    // A project with no controller has no rules to read.
    if (controller === zeroAddress) return { chainId, unknown, failed: false };

    const current = await getCurrentRuleset(client, { chainId, projectId });
    const dataHook = current.metadata.dataHook as Address;
    await check(
      "Rule-change hook",
      current.ruleset.approvalHook as Address,
      "This hook can affect when queued rulesets take effect.",
    );
    await checkDataHook(
      "Data hook",
      dataHook,
      "Payments and cash outs can run custom hook logic.",
    );
    if (same(dataHook, omnichain)) {
      const extra = await client.readContract({
        address: dataHook,
        abi: jbOmnichainDeployerAbi,
        functionName: "extraDataHookOf",
        args: [projectId, BigInt(current.ruleset.id)],
      });
      await checkDataHook(
        "Extra data hook",
        extra.dataHook,
        "The omnichain deployer delegates project hook behavior here.",
      );
    }
    // A ruleset can use its hook for payments, cash outs or both, and each resolves on its own.
    const seen = new Set<string>();
    for (const direction of ["pay", "cashOut"] as const) {
      const { hook } = await resolveProjectBuybackHook(client, {
        chainId,
        projectId,
        direction,
      });
      if (!hook || seen.has(hook.toLowerCase())) continue;
      seen.add(hook.toLowerCase());
      await check(
        "Buyback hook",
        hook,
        "Buyback swap behavior is delegated to this hook.",
      );
    }
    return { chainId, unknown, failed: false };
  } catch {
    return { chainId, unknown, failed: true };
  }
}
