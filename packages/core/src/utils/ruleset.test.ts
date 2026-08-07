import { describe, expect, test } from "vitest";
import { MAX_WEIGHT_CUT_PERCENT } from "../constants.js";
import { getNextRulesetWeight, getPrevRulesetWeight } from "./ruleset.js";

describe("Ruleset Weight utilities", () => {
  test.each`
    weight  | weightCutPercent | expected
    ${100n} | ${200000000}     | ${80n}
    ${200n} | ${300000000}     | ${140n}
    ${300n} | ${0}             | ${300n}
  `(
    "computes next ruleset weight correctly",
    ({ weight, weightCutPercent, expected }) => {
      expect(getNextRulesetWeight({ weight, weightCutPercent })).toEqual(
        expected,
      );
    },
  );

  test.each`
    weight  | weightCutPercent | expected
    ${80n}  | ${200000000}     | ${100n}
    ${160n} | ${300000000}     | ${228n}
    ${300n} | ${0}             | ${300n}
  `(
    "computes previous cycle weight correctly",
    ({ weight, weightCutPercent, expected }) => {
      expect(getPrevRulesetWeight({ weight, weightCutPercent })).toEqual(
        expected,
      );
    },
  );

  test("a 100% cut drives the next weight to zero", () => {
    expect(
      getNextRulesetWeight({
        weight: 1_000n,
        weightCutPercent: MAX_WEIGHT_CUT_PERCENT,
      }),
    ).toEqual(0n);
  });

  test("a 100% cut has no invertible previous weight", () => {
    // 1e9 is a legal on-chain weightCutPercent, so the old inverse divided by
    // zero and threw an unattributable `RangeError: Division by zero`.
    expect(() =>
      getPrevRulesetWeight({
        weight: 1_000n,
        weightCutPercent: MAX_WEIGHT_CUT_PERCENT,
      }),
    ).toThrow(/no invertible previous weight/);
  });
});
