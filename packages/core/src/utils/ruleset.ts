import { MAX_DECAY_RATE } from "../constants.js";

/**
 * Derive the next ruleset's Weight value from the current ruleset.
 *
 * Useful when projecting a project's future Token B price.
 * E.g. "In the next ruleset, how much will Token B cost, given the new Weight?"
 */
export function getNextRulesetWeight(currentRuleset: {
  weight: bigint;
  decayPercent: bigint;
}) {
  const nextRulesetWeight =
    (currentRuleset.weight * (MAX_DECAY_RATE - currentRuleset.decayPercent)) /
    MAX_DECAY_RATE;

  return nextRulesetWeight;
}

/**
 * Derive the previous ruleset's Weight value from the current ruleset.
 */
export function getPrevRulesetWeight(currentRuleset: {
  weight: bigint;
  decayPercent: bigint;
}) {
  // reverse of getNextRulesetWeight
  const prevRulesetWeight =
    (currentRuleset.weight * MAX_DECAY_RATE) /
    (MAX_DECAY_RATE - currentRuleset.decayPercent);

  return prevRulesetWeight;
}
