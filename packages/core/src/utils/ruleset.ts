import { MAX_DECAY_PERCENT } from "../constants.js";

/**
 * Derive the next ruleset's Weight value from the current ruleset.
 *
 * Useful when projecting a project's future Token B price.
 * E.g. "In the next ruleset, how much will Token B cost, given the new Weight?"
 */
export function getNextRulesetWeight(currentRuleset: {
  weight: bigint;
  decayPercent: number;
}) {
  const nextRulesetWeight =
    (currentRuleset.weight *
      BigInt(MAX_DECAY_PERCENT - currentRuleset.decayPercent)) /
    BigInt(MAX_DECAY_PERCENT);

  return nextRulesetWeight;
}

/**
 * Derive the previous ruleset's Weight value from the current ruleset.
 */
export function getPrevRulesetWeight(currentRuleset: {
  weight: bigint;
  decayPercent: number;
}) {
  // reverse of getNextRulesetWeight
  const prevRulesetWeight =
    (currentRuleset.weight * BigInt(MAX_DECAY_PERCENT)) /
    BigInt(MAX_DECAY_PERCENT - currentRuleset.decayPercent);

  return prevRulesetWeight;
}
