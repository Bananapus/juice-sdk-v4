import { ONE_ETHER } from "../constants.js";
import { describe, expect, test } from "vitest";
import { applyJbDaoCashOutFee } from "./fee.js";

describe("fee", () => {
  test("applyJbDaoCashOutFee", () => {
    // 1e18 - 1e18/40: also what the legacy ×975/1000 arithmetic produced for
    // this input — the pinned value is correct under both.
    expect(applyJbDaoCashOutFee(ONE_ETHER)).toEqual(975000000000000000n);
  });

  test("uses the contract's floor division, not ×975/1000", () => {
    // 41 - 41/40 = 40; the legacy ×975/1000 arithmetic floored to 39, a 1-wei
    // divergence that can break an exact on-chain minimum.
    expect(applyJbDaoCashOutFee(41n)).toEqual(40n);
    // Amounts below 40 pay no fee at all under floor division.
    expect(applyJbDaoCashOutFee(39n)).toEqual(39n);
    expect(applyJbDaoCashOutFee(0n)).toEqual(0n);
  });
});
