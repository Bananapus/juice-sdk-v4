import {
  ContractFunctionArgs,
  ContractFunctionReturnType,
  PublicClient,
} from "viem";
import { MAX_WEIGHT_CUT_PERCENT } from "../constants.js";
import { jbControllerAbi } from "../generated/juicebox.js";
import { JBChainId } from "../types.js";
import { v6Address } from "./types.js";

type QueueRulesetsArgs = ContractFunctionArgs<
  typeof jbControllerAbi,
  "nonpayable",
  "queueRulesetsOf"
>;

/**
 * JBRulesets configuration sentinel meaning “derive the prior ruleset's
 * cut-adjusted weight.” Zero is real zero issuance and must not be substituted.
 */
export const RULESET_WEIGHT_INHERIT = 1n;

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

/** Minimal ruleset shape needed to project an issuance schedule. */
export interface RulesetIssuanceStage {
  start: number;
  duration: number;
  weight: bigint;
  weightCutPercent: number;
  /**
   * Explicitly inherit the prior stage's cut-adjusted rate. Leave false for
   * stored on-chain rulesets, whose weights have already been resolved.
   */
  inheritsWeight?: boolean;
}

/** A stage with its inherited starting issuance rate resolved. */
export interface ResolvedRulesetIssuanceStage {
  start: number;
  duration: number;
  weightCutPercent: number;
  /** Approximate tokens issued per unit of the ruleset's base currency. */
  issuanceRate: number;
}

function assertIssuanceStage(stage: RulesetIssuanceStage): void {
  if (!Number.isSafeInteger(stage.start) || stage.start < 0) {
    throw new Error("A ruleset stage start must be a non-negative timestamp.");
  }
  if (!Number.isSafeInteger(stage.duration) || stage.duration < 0) {
    throw new Error("A ruleset stage duration must be non-negative seconds.");
  }
  if (stage.weight < 0n) {
    throw new Error("A ruleset stage weight cannot be negative.");
  }
  if (stage.weight >= 1n << 112n) {
    throw new Error("A ruleset stage weight must fit in uint112.");
  }
  if (
    !Number.isSafeInteger(stage.weightCutPercent) ||
    stage.weightCutPercent < 0 ||
    stage.weightCutPercent > MAX_WEIGHT_CUT_PERCENT
  ) {
    throw new Error(
      `A ruleset weight cut must be between 0 and ${MAX_WEIGHT_CUT_PERCENT}.`,
    );
  }
}

/**
 * Project one resolved stage's issuance rate at a Unix timestamp.
 *
 * This intentionally returns display-grade floating-point math. Transaction
 * builders must continue to use the original bigint `weight`; this helper is
 * for charts, estimates, and explanatory UI shared by web clients.
 */
export function rulesetIssuanceRateWithinStage(
  stage: ResolvedRulesetIssuanceStage,
  timestamp: number,
): number {
  if (!Number.isFinite(timestamp)) {
    throw new Error("A ruleset projection timestamp must be finite.");
  }
  if (stage.duration === 0 || stage.weightCutPercent === 0) {
    return stage.issuanceRate;
  }
  const cycles = Math.max(
    0,
    Math.floor((timestamp - stage.start) / stage.duration),
  );
  return (
    stage.issuanceRate *
    Math.pow(
      (MAX_WEIGHT_CUT_PERCENT - stage.weightCutPercent) /
        MAX_WEIGHT_CUT_PERCENT,
      cycles,
    )
  );
}

/**
 * Sort ruleset stages and resolve explicitly requested inheritance at each
 * boundary. Stored on-chain rulesets should never set `inheritsWeight`: core
 * has already replaced its configured `weight == 1` sentinel with the derived
 * weight. Keeping this explicit also preserves genuine zero-issuance stages.
 */
export function resolveRulesetIssuanceStages(
  stages: readonly RulesetIssuanceStage[],
): ResolvedRulesetIssuanceStage[] {
  const sorted = stages.slice().sort((left, right) => left.start - right.start);
  const resolved: ResolvedRulesetIssuanceStage[] = [];

  for (const stage of sorted) {
    assertIssuanceStage(stage);
    const previous = resolved[resolved.length - 1];
    if (stage.inheritsWeight && !previous) {
      throw new Error("The first ruleset stage cannot inherit a prior weight.");
    }
    const issuanceRate =
      stage.inheritsWeight && previous
        ? rulesetIssuanceRateWithinStage(previous, stage.start)
        : Number(stage.weight) / 1e18;
    resolved.push({
      start: stage.start,
      duration: stage.duration,
      weightCutPercent: stage.weightCutPercent,
      issuanceRate,
    });
  }
  return resolved;
}

/** Approximate issuance rate at a timestamp across a resolved schedule. */
export function rulesetIssuanceRateAt(
  stages: readonly ResolvedRulesetIssuanceStage[],
  timestamp: number,
): number {
  if (stages.length === 0 || timestamp < stages[0].start) return 0;
  let active = stages[0];
  for (const stage of stages) {
    if (stage.start > timestamp) break;
    active = stage;
  }
  return rulesetIssuanceRateWithinStage(active, timestamp);
}

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
