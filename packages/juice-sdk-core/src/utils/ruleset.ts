import { MAX_DECAY_RATE } from "./data";

export function getNextRulesetWeight(currentRuleset: {
  weight: bigint;
  decayRate: bigint;
}) {
  const nextRulesetWeight =
    (currentRuleset.weight * (MAX_DECAY_RATE - currentRuleset.decayRate)) /
    MAX_DECAY_RATE;

  return nextRulesetWeight;
}

export function getPrevRulesetWeight(currentRuleset: {
  weight: bigint;
  decayRate: bigint;
}) {
  // reverse of getNextRulesetWeight
  const prevRulesetWeight =
    (currentRuleset.weight * MAX_DECAY_RATE) /
    (MAX_DECAY_RATE - currentRuleset.decayRate);

  return prevRulesetWeight;
}
