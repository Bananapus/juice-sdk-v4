import { describe, expect, test } from 'vitest';
import { DecayPercent, ReservedPercent } from "./data.js";

describe("jb", () => {
  test("reserved rate", () => {
    const reservedPercentRaw = 2_345n; // 23.45%
    const reservedPercent: ReservedPercent = new ReservedPercent(reservedPercentRaw);
    expect(reservedPercent.format()).toEqual("0.2345");
    expect(reservedPercent.toFloat()).toEqual(0.2345);

    reservedPercent.setPercentage(0.5);
    expect(reservedPercent.format()).toEqual("0.5");
    expect(reservedPercent.formatPercentage()).toEqual(50);
    expect(reservedPercent.value).toEqual(5_000n);
  });

  test("decay rate", () => {
    const decayPercentRaw = 200_000_000n; // 20%
    const decayPercent = new DecayPercent(decayPercentRaw);
    expect(decayPercent.format()).toEqual("0.2");
    expect(decayPercent.toFloat()).toEqual(0.2);

    decayPercent.setPercentage(0.5123);
    expect(decayPercent.format()).toEqual("0.5123");
    expect(decayPercent.formatPercentage()).toEqual(51.23);
    expect(decayPercent.value).toEqual(512_300_000n);
  });
});
