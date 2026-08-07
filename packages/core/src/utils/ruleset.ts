import { MAX_WEIGHT_CUT_PERCENT } from "../constants.js";

/**
 * Derive the next ruleset's Weight value from the current ruleset.
 *
 * Useful when projecting a project's future Token B price.
 * E.g. "In the next ruleset, how much will Token B cost, given the new Weight?"
 *
 * Projects ONE cycle. `JBRulesets` applies the cut once per elapsed cycle
 * (`JBRulesets.sol:685-690`), so this is not the weight `n` cycles out. It also
 * does not model the weight-1 "inherit the previous weight" sentinel
 * (`JBRulesets.sol:822-824`) — for a ruleset whose configured weight may still
 * be `RULESET_WEIGHT_INHERIT`, use `resolveRulesetIssuanceStages` from
 * `@bananapus/nana-sdk-core/v6` first.
 */
export function getNextRulesetWeight(currentRuleset: {
  weight: bigint;
  weightCutPercent: number;
}) {
  const nextRulesetWeight =
    (currentRuleset.weight *
      BigInt(MAX_WEIGHT_CUT_PERCENT - currentRuleset.weightCutPercent)) /
    BigInt(MAX_WEIGHT_CUT_PERCENT);

  return nextRulesetWeight;
}

/**
 * Derive the previous ruleset's Weight value from the current ruleset.
 *
 * The inverse of {@link getNextRulesetWeight}, with the same one-cycle and
 * sentinel caveats, and lossy by floor division.
 *
 * @throws {RangeError} When `weightCutPercent` is 100% (`MAX_WEIGHT_CUT_PERCENT`).
 * A full cut sends every subsequent weight to 0, so no previous weight can be
 * recovered from the current one — the inverse has no value to return.
 */
export function getPrevRulesetWeight(currentRuleset: {
  weight: bigint;
  weightCutPercent: number;
}) {
  // A 100% cut is a legal on-chain value (`JBRulesets.sol:139` rejects only
  // `> MAX_WEIGHT_CUT_PERCENT`), so this is a reachable input, not an assert.
  if (currentRuleset.weightCutPercent === MAX_WEIGHT_CUT_PERCENT) {
    throw new RangeError(
      "A 100% weightCutPercent has no invertible previous weight.",
    );
  }

  // reverse of getNextRulesetWeight
  const prevRulesetWeight =
    (currentRuleset.weight * BigInt(MAX_WEIGHT_CUT_PERCENT)) /
    BigInt(MAX_WEIGHT_CUT_PERCENT - currentRuleset.weightCutPercent);

  return prevRulesetWeight;
}
