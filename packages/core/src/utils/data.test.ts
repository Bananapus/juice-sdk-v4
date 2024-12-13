import { describe, expect, test } from 'vitest';
import { WeightCutPercent, ReservedPercent } from "./data.js";

describe("jb", () => {
  test("reserved rate", () => {
    const reservedPercentRaw = 2_345; // 23.45%
    const reservedPercent: ReservedPercent = new ReservedPercent(reservedPercentRaw);
    expect(reservedPercent.format()).toEqual("0.2345");
    expect(reservedPercent.toFloat()).toEqual(0.2345);

    reservedPercent.setPercentage(0.5);
    expect(reservedPercent.format()).toEqual("0.5");
    expect(reservedPercent.formatPercentage()).toEqual(50);
    expect(reservedPercent.value).toEqual(5_000n);
  });

  test("decay rate", () => {
    const weightCutPercentRaw = 200_000_000; // 20%
    const weightCutPercent = new WeightCutPercent(weightCutPercentRaw);
    expect(weightCutPercent.format()).toEqual("0.2");
    expect(weightCutPercent.toFloat()).toEqual(0.2);

    weightCutPercent.setPercentage(0.5123);
    expect(weightCutPercent.format()).toEqual("0.5123");
    expect(weightCutPercent.formatPercentage()).toEqual(51.23);
    expect(weightCutPercent.value).toEqual(512_300_000n);
  });
});
