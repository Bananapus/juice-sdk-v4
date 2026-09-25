import { getAddress, zeroAddress } from "viem";
import { base, sepolia } from "viem/chains";
import { describe, expect, test } from "vitest";
import { jbContractAddress } from "../generated/juicebox.js";
import { buildSplit } from "./splits.js";
import {
  STICKY_CRITERIA_BASE,
  STICKY_DEFAULT_GROUP_ID,
  STICKY_MAX_CRITERIA_WEEKS,
  decodeStickyGroupId,
  describeStickySplit,
  isStickySplit,
  stickyDistributorAddress,
  stickyGroupId,
  validateStickyGroupId,
} from "./sticky.js";

const STICKY_TOKEN = "0x000000000000000000000000000000000000dEaD" as const;

// Mirrors StickyDistributor.isValidGroupId, for exhaustive comparison.
function contractIsValid(groupId: bigint): boolean {
  if (groupId === 0n) return true;
  const min = groupId / 1000n;
  const max = groupId % 1000n;
  return min !== 0n && min <= 520n && max <= 520n && (max === 0n || max >= min);
}

describe("constants", () => {
  test("match the distributor", () => {
    expect(STICKY_DEFAULT_GROUP_ID).toBe(0n);
    expect(STICKY_CRITERIA_BASE).toBe(1000n);
    expect(STICKY_MAX_CRITERIA_WEEKS).toBe(520);
  });
});

describe("stickyDistributorAddress", () => {
  test("reads the V6 registry", () => {
    expect(stickyDistributorAddress(base.id)).toBe(
      jbContractAddress["6"].StickyDistributor[base.id],
    );
    expect(stickyDistributorAddress(sepolia.id)).toBe(
      jbContractAddress["6"].StickyDistributor[sepolia.id],
    );
  });
});

describe("isStickySplit", () => {
  const distributor = jbContractAddress["6"].StickyDistributor[base.id];

  test("matches the distributor hook in any casing", () => {
    expect(isStickySplit({ hook: distributor }, base.id)).toBe(true);
    expect(isStickySplit({ hook: getAddress(distributor) }, base.id)).toBe(
      true,
    );
  });

  test("rejects other hooks and plain splits", () => {
    expect(isStickySplit({ hook: zeroAddress }, base.id)).toBe(false);
    expect(isStickySplit({ hook: STICKY_TOKEN }, base.id)).toBe(false);
  });
});

describe("validateStickyGroupId", () => {
  test("accepts the default group and boundary windows", () => {
    for (const id of [0n, 1000n, 1001n, 1520n, 4052n, 520000n, 520520n]) {
      expect(validateStickyGroupId(id)).toBeNull();
    }
  });

  test("rejects negative IDs", () => {
    expect(validateStickyGroupId(-1n)).toBe("Group ID can't be negative.");
  });

  test("rejects a zero minimum", () => {
    expect(validateStickyGroupId(1n)).toBe(
      "Tenure groups need a minimum of at least 1 week.",
    );
    expect(validateStickyGroupId(520n)).toBe(
      "Tenure groups need a minimum of at least 1 week.",
    );
  });

  test("rejects a minimum over 520 weeks", () => {
    expect(validateStickyGroupId(521000n)).toBe(
      "Minimum weeks can't be more than 520.",
    );
  });

  test("rejects a maximum over 520 weeks", () => {
    expect(validateStickyGroupId(1521n)).toBe(
      "Maximum weeks can't be more than 520.",
    );
    expect(validateStickyGroupId(1999n)).toBe(
      "Maximum weeks can't be more than 520.",
    );
  });

  test("rejects a maximum below the minimum", () => {
    expect(validateStickyGroupId(52004n)).toBe(
      "Maximum weeks can't be less than minimum weeks.",
    );
  });

  test("agrees with the contract rule across the whole encoding range", () => {
    const mismatches: bigint[] = [];
    for (let id = 0n; id <= 522_000n; id += 1n) {
      if ((validateStickyGroupId(id) === null) !== contractIsValid(id)) {
        mismatches.push(id);
      }
    }
    expect(mismatches).toEqual([]);
  });
});

describe("stickyGroupId", () => {
  test("encodes bounded and open-ended windows", () => {
    expect(stickyGroupId({ minWeeks: 4, maxWeeks: 52 })).toBe(4052n);
    expect(stickyGroupId({ minWeeks: 1, maxWeeks: 1 })).toBe(1001n);
    expect(stickyGroupId({ minWeeks: 520, maxWeeks: 520 })).toBe(520520n);
    expect(stickyGroupId({ minWeeks: 520 })).toBe(520000n);
    expect(stickyGroupId({ minWeeks: 3, maxWeeks: 0 })).toBe(3000n);
  });

  test("rejects windows the distributor would not honor", () => {
    expect(() => stickyGroupId({ minWeeks: 0, maxWeeks: 4 })).toThrow(
      "Tenure groups need a minimum of at least 1 week.",
    );
    expect(() => stickyGroupId({ minWeeks: 521 })).toThrow(
      "Minimum weeks can't be more than 520.",
    );
    expect(() => stickyGroupId({ minWeeks: 52, maxWeeks: 4 })).toThrow(
      "Maximum weeks can't be less than minimum weeks.",
    );
  });

  test("rejects a maximum that would carry into the minimum", () => {
    expect(() => stickyGroupId({ minWeeks: 1, maxWeeks: 521 })).toThrow(
      "Maximum weeks can't be more than 520.",
    );
    expect(() => stickyGroupId({ minWeeks: 1, maxWeeks: 1000 })).toThrow(
      "Maximum weeks can't be more than 520.",
    );
  });

  test("rejects fractional and negative weeks", () => {
    for (const args of [
      { minWeeks: 1.5 },
      { minWeeks: 1, maxWeeks: 2.5 },
      { minWeeks: -1 },
      { minWeeks: 1, maxWeeks: -1 },
    ]) {
      expect(() => stickyGroupId(args)).toThrow(
        "Sticky group weeks must be whole numbers, 0 or more.",
      );
    }
  });
});

describe("decodeStickyGroupId", () => {
  test("decodes the default group", () => {
    expect(decodeStickyGroupId(0n)).toEqual({ kind: "default" });
  });

  test("decodes tenure windows", () => {
    expect(decodeStickyGroupId(4052n)).toEqual({
      kind: "tenure",
      minWeeks: 4,
      maxWeeks: 52,
    });
    expect(decodeStickyGroupId(520520n)).toEqual({
      kind: "tenure",
      minWeeks: 520,
      maxWeeks: 520,
    });
    expect(decodeStickyGroupId(520000n)).toEqual({
      kind: "tenure",
      minWeeks: 520,
      maxWeeks: 0,
    });
  });

  test("decodes invalid IDs as the default group they fund", () => {
    for (const id of [-1n, 999n, 1521n, 52004n, 521000n]) {
      expect(decodeStickyGroupId(id)).toEqual({ kind: "default" });
    }
  });

  test("round-trips every valid window", () => {
    for (let min = 1; min <= STICKY_MAX_CRITERIA_WEEKS; min += 1) {
      for (const max of [0, min, STICKY_MAX_CRITERIA_WEEKS]) {
        expect(
          decodeStickyGroupId(stickyGroupId({ minWeeks: min, maxWeeks: max })),
        ).toEqual({ kind: "tenure", minWeeks: min, maxWeeks: max });
      }
    }
  });
});

describe("describeStickySplit", () => {
  const split = (projectId: bigint) =>
    buildSplit({
      beneficiary: STICKY_TOKEN,
      percent: 1,
      projectId,
      hook: jbContractAddress["6"].StickyDistributor[base.id],
    });

  test("describes the default group", () => {
    expect(describeStickySplit(split(0n))).toBe(
      "Sticky group 0 (all holders by voting power)",
    );
  });

  test("describes tenure windows", () => {
    expect(describeStickySplit(split(4052n))).toBe(
      "Sticky holders stuck 4 to 52 weeks",
    );
    expect(describeStickySplit(split(1520n))).toBe(
      "Sticky holders stuck 1 to 520 weeks",
    );
    expect(describeStickySplit(split(4000n))).toBe(
      "Sticky holders stuck 4 weeks or more",
    );
    expect(describeStickySplit(split(1000n))).toBe(
      "Sticky holders stuck 1 week or more",
    );
    expect(describeStickySplit(split(520520n))).toBe(
      "Sticky holders stuck 520 weeks",
    );
    expect(describeStickySplit(split(1001n))).toBe(
      "Sticky holders stuck 1 week",
    );
  });

  test("names the fallback for an invalid group", () => {
    expect(describeStickySplit(split(52004n))).toBe(
      "Sticky group 0 (all holders by voting power), since group 52004 is invalid",
    );
  });
});
