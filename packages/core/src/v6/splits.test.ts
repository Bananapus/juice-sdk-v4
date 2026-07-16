import { decodeFunctionData, encodeFunctionData } from "viem";
import { sepolia } from "viem/chains";
import { describe, expect, test } from "vitest";
import { NATIVE_TOKEN, SPLITS_TOTAL_PERCENT } from "../constants.js";
import { jbControllerAbi } from "../generated/juicebox.js";
import {
  RESERVED_TOKEN_SPLIT_GROUP_ID,
  buildSetSplitGroupsTx,
  buildSplit,
  fillSplitPercents,
  payoutSplitGroupId,
} from "./splits.js";
import { v6Address } from "./types.js";

const BENEFICIARY = "0x000000000000000000000000000000000000dEaD" as const;

describe("fillSplitPercents", () => {
  test("returns an empty array for an empty group", () => {
    expect(fillSplitPercents([])).toEqual([]);
  });

  test("leaves an exact group untouched", () => {
    expect(fillSplitPercents([600_000_000, 400_000_000])).toEqual([
      600_000_000, 400_000_000,
    ]);
    expect(fillSplitPercents([SPLITS_TOTAL_PERCENT])).toEqual([
      SPLITS_TOTAL_PERCENT,
    ]);
  });

  test("assigns a positive remainder to the largest share", () => {
    const third = Math.floor(SPLITS_TOTAL_PERCENT / 3);
    const filled = fillSplitPercents([third, third, third]);
    // 3 * 333,333,333 = 999,999,999 — one atom short; the first max takes it.
    expect(filled).toEqual([third + 1, third, third]);
    expect(filled.reduce((a, b) => a + b, 0)).toBe(SPLITS_TOTAL_PERCENT);
  });

  test("assigns the remainder to the largest share, not the last", () => {
    const filled = fillSplitPercents([100_000_000, 899_999_999]);
    expect(filled).toEqual([100_000_000, 900_000_000]);
  });

  test("shaves a negative remainder off the largest share", () => {
    const filled = fillSplitPercents([500_000_000, 500_000_001]);
    expect(filled).toEqual([500_000_000, 500_000_000]);
    expect(filled.reduce((a, b) => a + b, 0)).toBe(SPLITS_TOTAL_PERCENT);
  });

  test("uneven 7-way split fills to exactly 1e9", () => {
    const seventh = Math.floor(SPLITS_TOTAL_PERCENT / 7);
    const shares = Array(7).fill(seventh);
    const filled = fillSplitPercents(shares);
    expect(filled.reduce((a, b) => a + b, 0)).toBe(SPLITS_TOTAL_PERCENT);
    // 1e9 - 7 * 142,857,142 = 6 atoms on the first max.
    expect(filled[0]).toBe(seventh + 6);
    expect(filled.slice(1)).toEqual(Array(6).fill(seventh));
  });

  test("throws when the drift exceeds rounding error", () => {
    expect(() => fillSplitPercents([0])).toThrow(/drift larger than rounding/);
    expect(() => fillSplitPercents([50, 50])).toThrow(
      /drift larger than rounding/,
    );
    expect(() => fillSplitPercents([0, 0, 0])).toThrow(
      /drift larger than rounding/,
    );
  });

  test("does not mutate the input", () => {
    const shares = [499999999, 499999999, 1];
    fillSplitPercents(shares);
    expect(shares).toEqual([499999999, 499999999, 1]);
  });

  test("throws on negative or non-integer shares", () => {
    expect(() => fillSplitPercents([-1, SPLITS_TOTAL_PERCENT])).toThrow(
      /non-negative integers/,
    );
    expect(() => fillSplitPercents([0.5, SPLITS_TOTAL_PERCENT])).toThrow(
      /non-negative integers/,
    );
  });

  test("repairs a small oversum even above the total", () => {
    // sum = 1e9 + 2; shaving 2 off the largest still leaves it non-negative.
    const filled = fillSplitPercents([SPLITS_TOTAL_PERCENT + 1, 1]);
    expect(filled).toEqual([SPLITS_TOTAL_PERCENT - 1, 1]);
    expect(filled.reduce((a, b) => a + b, 0)).toBe(SPLITS_TOTAL_PERCENT);
  });

  test("throws when the group oversums beyond repair", () => {
    // sum = 1.8e9; the -8e8 delta far exceeds rounding error.
    expect(() =>
      fillSplitPercents([600_000_000, 600_000_000, 600_000_000]),
    ).toThrow(/drift larger than rounding/);
  });
});

describe("split group ids", () => {
  test("reserved-token group id is 1n", () => {
    expect(RESERVED_TOKEN_SPLIT_GROUP_ID).toBe(1n);
  });

  test("payout group id is uint256(uint160(token))", () => {
    expect(payoutSplitGroupId(NATIVE_TOKEN)).toBe(61166n);
    expect(
      payoutSplitGroupId("0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984"),
    ).toBe(BigInt("0x1f9840a85d5af5bf1d1762f925bdaddc4201f984"));
  });
});

describe("buildSplit", () => {
  test("applies safe defaults", () => {
    const split = buildSplit({ beneficiary: BENEFICIARY, percent: 1 });
    expect(split).toEqual({
      percent: 1,
      projectId: 0n,
      beneficiary: BENEFICIARY,
      preferAddToBalance: false,
      lockedUntil: 0,
      hook: "0x0000000000000000000000000000000000000000",
    });
  });

  test("honors overrides", () => {
    const split = buildSplit({
      beneficiary: BENEFICIARY,
      percent: 5,
      projectId: 3n,
      preferAddToBalance: true,
      lockedUntil: 1_750_000_000,
      hook: BENEFICIARY,
    });
    expect(split.projectId).toBe(3n);
    expect(split.preferAddToBalance).toBe(true);
    expect(split.lockedUntil).toBe(1_750_000_000);
    expect(split.hook).toBe(BENEFICIARY);
  });
});

describe("buildSetSplitGroupsTx", () => {
  test("encodes against the controller ABI", () => {
    const percents = fillSplitPercents([
      Math.floor(SPLITS_TOTAL_PERCENT * 0.7),
      Math.floor(SPLITS_TOTAL_PERCENT * 0.3),
    ]);
    const request = buildSetSplitGroupsTx({
      chainId: sepolia.id,
      projectId: 5n,
      rulesetId: 1_700_000_000n,
      splitGroups: [
        {
          groupId: RESERVED_TOKEN_SPLIT_GROUP_ID,
          splits: percents.map((percent) =>
            buildSplit({ beneficiary: BENEFICIARY, percent }),
          ),
        },
      ],
    });

    expect(request.address).toBe(v6Address("JBController", sepolia.id));
    expect(request.chainId).toBe(sepolia.id);
    expect(request.functionName).toBe("setSplitGroupsOf");

    const data = encodeFunctionData(request);
    const decoded = decodeFunctionData({ abi: jbControllerAbi, data });
    expect(decoded.functionName).toBe("setSplitGroupsOf");
    expect(decoded.args[0]).toBe(5n);
  });
});
