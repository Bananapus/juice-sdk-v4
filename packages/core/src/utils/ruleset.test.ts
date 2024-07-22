import { describe, expect, test } from "vitest";
import { getNextRulesetWeight, getPrevRulesetWeight } from "./ruleset.js";

describe("Ruleset Weight utilities", () => {
  test.each`
    weight  | decayPercent  | expected
    ${100n} | ${200000000n} | ${80n}
    ${200n} | ${300000000n} | ${140n}
    ${300n} | ${0n}         | ${300n}
  `(
    "computes next ruleset weight correctly",
    ({ weight, decayPercent, expected }) => {
      expect(getNextRulesetWeight({ weight, decayPercent })).toEqual(expected);
    }
  );

  test.each`
    weight  | decayPercent  | expected
    ${80n}  | ${200000000n} | ${100n}
    ${160n} | ${300000000n} | ${228n}
    ${300n} | ${0n}         | ${300n}
  `(
    "computes previous cycle weight correctly",
    ({ weight, decayPercent, expected }) => {
      expect(getPrevRulesetWeight({ weight, decayPercent })).toEqual(expected);
    }
  );
});
