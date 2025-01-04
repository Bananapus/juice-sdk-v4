import { describe, expect, test } from "vitest";
import { getNextRulesetWeight, getPrevRulesetWeight } from "./ruleset.js";

describe("Ruleset Weight utilities", () => {
  test.each`
    weight  | weightCutPercent | expected
    ${100n} | ${200000000}     | ${80n}
    ${200n} | ${300000000}     | ${140n}
    ${300n} | ${0}            | ${300n}
  `(
    "computes next ruleset weight correctly",
    ({ weight, weightCutPercent, expected }) => {
      expect(getNextRulesetWeight({ weight, weightCutPercent })).toEqual(
        expected
      );
    }
  );

  test.each`
    weight  | weightCutPercent | expected
    ${80n}  | ${200000000}     | ${100n}
    ${160n} | ${300000000}     | ${228n}
    ${300n} | ${0}            | ${300n}
  `(
    "computes previous cycle weight correctly",
    ({ weight, weightCutPercent, expected }) => {
      expect(getPrevRulesetWeight({ weight, weightCutPercent })).toEqual(
        expected
      );
    }
  );
});
