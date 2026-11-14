import { type Address, type PublicClient, getAddress, zeroAddress } from "viem";
import type { JBChainId } from "../types.js";
import { isV6Deployment, v6Address } from "./types.js";

// Only the reads below: the full ABIs would weigh on every card that asks.
const hookConfig = [
  { name: "dataHook", type: "address" },
  { name: "useDataHookForPay", type: "bool" },
  { name: "useDataHookForCashOut", type: "bool" },
] as const;
const projectHooksAbi = [
  {
    type: "function",
    name: "controllerOf",
    stateMutability: "view",
    inputs: [{ name: "projectId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "currentRulesetOf",
    stateMutability: "view",
    inputs: [{ name: "projectId", type: "uint256" }],
    outputs: [
      {
        name: "ruleset",
        type: "tuple",
        components: [
          { name: "cycleNumber", type: "uint48" },
          { name: "id", type: "uint48" },
          { name: "basedOnId", type: "uint48" },
          { name: "start", type: "uint48" },
          { name: "duration", type: "uint32" },
          { name: "weight", type: "uint112" },
          { name: "weightCutPercent", type: "uint32" },
          { name: "approvalHook", type: "address" },
          { name: "metadata", type: "uint256" },
        ],
      },
      {
        name: "metadata",
        type: "tuple",
        components: [
          { name: "reservedPercent", type: "uint16" },
          { name: "cashOutTaxRate", type: "uint16" },
          { name: "baseCurrency", type: "uint32" },
          { name: "pausePay", type: "bool" },
          { name: "pauseCreditTransfers", type: "bool" },
          { name: "allowOwnerMinting", type: "bool" },
          { name: "allowSetCustomToken", type: "bool" },
          { name: "allowTerminalMigration", type: "bool" },
          { name: "allowSetTerminals", type: "bool" },
          { name: "allowSetController", type: "bool" },
          { name: "allowAddAccountingContext", type: "bool" },
          { name: "allowAddPriceFeed", type: "bool" },
          { name: "ownerMustSendPayouts", type: "bool" },
          { name: "holdFees", type: "bool" },
          { name: "scopeCashOutsToLocalBalances", type: "bool" },
          { name: "useDataHookForPay", type: "bool" },
          { name: "useDataHookForCashOut", type: "bool" },
          { name: "dataHook", type: "address" },
          { name: "metadata", type: "uint16" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "extraDataHookOf",
    stateMutability: "view",
    inputs: [
      { name: "projectId", type: "uint256" },
      { name: "rulesetId", type: "uint256" },
    ],
    outputs: [{ name: "hook", type: "tuple", components: hookConfig }],
  },
  {
    type: "function",
    name: "tiered721HookOf",
    stateMutability: "view",
    inputs: [
      { name: "projectId", type: "uint256" },
      { name: "rulesetId", type: "uint256" },
    ],
    outputs: [
      { name: "hook", type: "address" },
      { name: "useDataHookForCashOut", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "BUYBACK_HOOK",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "hookOf",
    stateMutability: "view",
    inputs: [{ name: "projectId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

/** Where a project's buyback hook was found. */
export type ProjectBuybackHookSource =
  /** The ruleset's data hook is the buyback registry. */
  | "registry"
  /** The data hook is a revnet's owner contract, which forwards to its registry. */
  | "revnet"
  /** The data hook is the omnichain deployer, which forwards to the project's extra hook. */
  | "omnichain"
  /** The data hook is a buyback hook itself. */
  | "direct"
  /** The ruleset calls no buyback hook in this direction. */
  | "none";

export interface ResolvedProjectBuybackHook {
  /** The buyback hook the project's current ruleset reaches, or null. */
  hook: Address | null;
  via: ProjectBuybackHookSource;
  /** The current ruleset's data hook, or the zero address. */
  dataHook: Address;
  rulesetId: bigint;
  /** The registry that resolved `hook`, when one did. */
  registry: Address | null;
}

/**
 * The buyback hook a project's current ruleset actually calls when it is paid
 * or cashed out, found the way the contracts find it: through the ruleset's
 * data hook.
 *
 * `JBBuybackHookRegistry.hookOf` answers for every project, with a cohort
 * default when nothing is pinned, so reading it alone names a hook for
 * projects whose rulesets never call one. This follows the data hook instead:
 *
 * - the registry itself: its `hookOf`;
 * - a revnet's `REVOwner`: its own `BUYBACK_HOOK()` registry, then `hookOf`;
 * - `JBOmnichainDeployer`: the project's extra data hook for this ruleset,
 *   when it is used in this direction, resolved by the rules above. On cash
 *   out the deployer skips the extra hook when the project's 721 hook handles
 *   cash outs;
 * - a buyback hook of any generation: that hook;
 * - anything else, no data hook, or the direction's use flag off: none.
 *
 * A failed read throws: "no hook" is an answer, never a guess.
 *
 * @link https://github.com/Bananapus/nana-omnichain-deployers-v6/blob/main/src/JBOmnichainDeployer.sol
 * @link https://github.com/rev-net/revnet-core-v6/blob/main/src/REVOwner.sol
 */
export async function resolveProjectBuybackHook(
  client: PublicClient,
  {
    chainId,
    projectId,
    direction = "pay",
  }: {
    chainId: JBChainId;
    projectId: bigint;
    direction?: "pay" | "cashOut";
  },
): Promise<ResolvedProjectBuybackHook> {
  const read = <const Name extends (typeof projectHooksAbi)[number]["name"]>(
    address: Address,
    functionName: Name,
    args: readonly bigint[] = [],
  ) =>
    client.readContract({
      address,
      abi: projectHooksAbi,
      functionName,
      args,
    } as never) as Promise<unknown>;
  const used = (hook: {
    useDataHookForPay: boolean;
    useDataHookForCashOut: boolean;
  }) =>
    direction === "pay" ? hook.useDataHookForPay : hook.useDataHookForCashOut;
  const is = (
    address: Address,
    contract: Parameters<typeof isV6Deployment>[1],
  ) => isV6Deployment(address, contract, chainId);

  const controller = (await read(
    v6Address("JBDirectory", chainId),
    "controllerOf",
    [projectId],
  )) as Address;
  const none = (dataHook: Address, rulesetId: bigint) => ({
    hook: null,
    via: "none" as const,
    dataHook,
    rulesetId,
    registry: null,
  });
  if (controller === zeroAddress) return none(zeroAddress, 0n);
  const [ruleset, metadata] = (await read(controller, "currentRulesetOf", [
    projectId,
  ])) as [
    { id: number | bigint },
    {
      dataHook: Address;
      useDataHookForPay: boolean;
      useDataHookForCashOut: boolean;
    },
  ];
  const rulesetId = BigInt(ruleset.id);
  const dataHook = getAddress(metadata.dataHook);

  /** The buyback hook behind one data hook, without unwrapping the omnichain deployer. */
  const behind = async (
    hook: Address,
  ): Promise<Pick<ResolvedProjectBuybackHook, "hook" | "via" | "registry">> => {
    if (is(hook, "JBBuybackHook")) {
      return { hook, via: "direct", registry: null };
    }
    const revnet = is(hook, "REVOwner");
    if (!revnet && !is(hook, "JBBuybackHookRegistry")) {
      return { hook: null, via: "none", registry: null };
    }
    const registry = revnet
      ? getAddress((await read(hook, "BUYBACK_HOOK")) as Address)
      : hook;
    const resolved = (await read(registry, "hookOf", [projectId])) as Address;
    return {
      hook: resolved === zeroAddress ? null : getAddress(resolved),
      via: revnet ? "revnet" : "registry",
      registry,
    };
  };

  if (dataHook === zeroAddress || !used(metadata)) {
    return none(dataHook, rulesetId);
  }
  if (!is(dataHook, "JBOmnichainDeployer")) {
    return { ...(await behind(dataHook)), dataHook, rulesetId };
  }
  if (direction === "cashOut") {
    const [hook721, handlesCashOut] = (await read(dataHook, "tiered721HookOf", [
      projectId,
      rulesetId,
    ])) as [Address, boolean];
    if (hook721 !== zeroAddress && handlesCashOut) {
      return none(dataHook, rulesetId);
    }
  }
  const extra = (await read(dataHook, "extraDataHookOf", [
    projectId,
    rulesetId,
  ])) as {
    dataHook: Address;
    useDataHookForPay: boolean;
    useDataHookForCashOut: boolean;
  };
  if (extra.dataHook === zeroAddress || !used(extra)) {
    return none(dataHook, rulesetId);
  }
  const found = await behind(getAddress(extra.dataHook));
  return {
    ...found,
    // The deployer is how the hook is reached; the registry field still names what resolved it.
    via: found.hook ? "omnichain" : "none",
    dataHook,
    rulesetId,
  };
}
