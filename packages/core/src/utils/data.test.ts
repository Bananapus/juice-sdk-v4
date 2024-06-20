import { describe, expect, test } from 'vitest';
import { DecayRate, ReservedRate } from "./data.js";

describe("jb", () => {
  test("reserved rate", () => {
    const reservedRateRaw = 2_345n; // 23.45%
    const reservedRate: ReservedRate = new ReservedRate(reservedRateRaw);
    expect(reservedRate.format()).toEqual("0.2345");
    expect(reservedRate.toFloat()).toEqual(0.2345);

    reservedRate.setPercentage(0.5);
    expect(reservedRate.format()).toEqual("0.5");
    expect(reservedRate.formatPercentage()).toEqual(50);
    expect(reservedRate.value).toEqual(5_000n);
  });

  test("decay rate", () => {
    const decayRateRaw = 200_000_000n; // 20%
    const decayRate = new DecayRate(decayRateRaw);
    expect(decayRate.format()).toEqual("0.2");
    expect(decayRate.toFloat()).toEqual(0.2);

    decayRate.setPercentage(0.5123);
    expect(decayRate.format()).toEqual("0.5123");
    expect(decayRate.formatPercentage()).toEqual(51.23);
    expect(decayRate.value).toEqual(512_300_000n);
  });
});
