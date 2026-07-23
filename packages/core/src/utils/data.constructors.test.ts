import { describe, expect, test } from "vitest";
import {
  CashOutTaxRate,
  Ether,
  JBProjectToken,
  RulesetWeight,
  SplitPortion,
} from "./data.js";

describe("fixed-point data constructors", () => {
  test("apply the protocol precision to each public value type", () => {
    expect(new CashOutTaxRate(2_500).format()).toBe("0.25");
    expect(new SplitPortion(500_000_000).format()).toBe("0.5");
    expect(new Ether(1_000_000_000_000_000_000n).format()).toBe("1");
    expect(new JBProjectToken(2_000_000_000_000_000_000n).format()).toBe("2");
    expect(new RulesetWeight(3_000_000_000_000_000_000n).format()).toBe("3");
  });
});
