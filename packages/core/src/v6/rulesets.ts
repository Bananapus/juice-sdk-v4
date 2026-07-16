import {
  ContractFunctionArgs,
  ContractFunctionReturnType,
  PublicClient,
} from "viem";
import { jbControllerAbi } from "../generated/juicebox.js";
import { JBChainId } from "../types.js";
import { v6Address } from "./types.js";

type QueueRulesetsArgs = ContractFunctionArgs<
  typeof jbControllerAbi,
  "nonpayable",
  "queueRulesetsOf"
>;

/**
 * A full ruleset configuration as passed to `launchProjectFor` /
 * `queueRulesetsOf` (v6 shape).
 */
export type JBRulesetConfig = QueueRulesetsArgs[1][number];

/**
 * A ruleset's metadata (v6 field names, e.g. `scopeCashOutsToLocalBalances`
 * — NOT the old inverted `useTotalSurplusForCashOuts`).
 */
export type JBRulesetMetadata = JBRulesetConfig["metadata"];

type CurrentRulesetResult = ContractFunctionReturnType<
  typeof jbControllerAbi,
  "view",
  "currentRulesetOf"
>;

/**
 * A ruleset as stored onchain (decoded `JBRuleset` struct).
 */
export type JBRuleset = CurrentRulesetResult[0];

/**
 * A ruleset together with its expanded metadata, as returned by the
 * controller's ruleset reads.
 */
export type JBRulesetWithMetadata = {
  ruleset: JBRuleset;
  metadata: JBRulesetMetadata;
};

/**
 * Build a `JBController.queueRulesetsOf` transaction request queuing rulesets
 * for an existing project on a single chain.
 *
 * The caller must be the project's owner or have the `QUEUE_RULESETS`
 * permission. For an omnichain project, queue through the omnichain deployer
 * instead (see `buildOmnichainQueueRulesetsTx`) so every chain stays in sync.
 *
 * @param args.rulesetConfigurations The rulesets to queue, in order. Use
 * `buildRulesetConfiguration` to construct them.
 * @param args.memo An optional memo emitted with the queue event.
 */
export function buildQueueRulesetsTx(args: {
  chainId: JBChainId;
  projectId: bigint;
  rulesetConfigurations: readonly JBRulesetConfig[];
  memo?: string;
}) {
  return {
    chainId: args.chainId,
    address: v6Address("JBController", args.chainId),
    abi: jbControllerAbi,
    functionName: "queueRulesetsOf" as const,
    args: [
      args.projectId,
      args.rulesetConfigurations,
      args.memo ?? "",
    ] as const,
  };
}

/**
 * Read a project's currently active ruleset and its metadata from the
 * controller.
 */
export async function getCurrentRuleset(
  client: PublicClient,
  args: { chainId: JBChainId; projectId: bigint },
): Promise<JBRulesetWithMetadata> {
  const [ruleset, metadata] = await client.readContract({
    address: v6Address("JBController", args.chainId),
    abi: jbControllerAbi,
    functionName: "currentRulesetOf",
    args: [args.projectId],
  });
  return { ruleset, metadata };
}

/**
 * Read a project's next upcoming ruleset and its metadata from the
 * controller. Returns an empty (all-zero) ruleset if none is queued.
 */
export async function getUpcomingRuleset(
  client: PublicClient,
  args: { chainId: JBChainId; projectId: bigint },
): Promise<JBRulesetWithMetadata> {
  const [ruleset, metadata] = await client.readContract({
    address: v6Address("JBController", args.chainId),
    abi: jbControllerAbi,
    functionName: "upcomingRulesetOf",
    args: [args.projectId],
  });
  return { ruleset, metadata };
}

/**
 * Read a page of a project's rulesets (with metadata) from the controller,
 * sorted from latest to earliest.
 *
 * @param args.startingId The ruleset id to start from. 0n (the default)
 * starts from the latest ruleset.
 * @param args.size The maximum number of rulesets to return. Defaults to 50n.
 */
export async function getAllRulesets(
  client: PublicClient,
  args: {
    chainId: JBChainId;
    projectId: bigint;
    startingId?: bigint;
    size?: bigint;
  },
): Promise<readonly JBRulesetWithMetadata[]> {
  return client.readContract({
    address: v6Address("JBController", args.chainId),
    abi: jbControllerAbi,
    functionName: "allRulesetsOf",
    args: [args.projectId, args.startingId ?? 0n, args.size ?? 50n],
  });
}
