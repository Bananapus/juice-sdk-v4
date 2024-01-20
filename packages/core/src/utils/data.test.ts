import { DiscountRate, ReservedRate } from "./data";
import { describe, expect, test } from 'vitest'

describe("jb", () => {
  test("reserved rate", () => {
    const reservedRateRaw = 2_345n; // 23.45%
    const reservedRate: ReservedRate = new ReservedRate(reservedRateRaw);
    expect(reservedRate.format()).toEqual("0.2345");
    expect(reservedRate.toFloat()).toEqual(0.2345);

    reservedRate.setPercentage(0.5);
    expect(reservedRate.format()).toEqual("0.5");
    expect(reservedRate.formatPercentage()).toEqual(50);
    expect(reservedRate.val).toEqual(5_000n);
  });

  test("discount rate", () => {
    const discountRateRaw = 200_000_000n; // 20%
    const discountRate = new DiscountRate(discountRateRaw);
    expect(discountRate.format()).toEqual("0.2");
    expect(discountRate.toFloat()).toEqual(0.2);

    discountRate.setPercentage(0.5123);
    expect(discountRate.format()).toEqual("0.5123");
    expect(discountRate.formatPercentage()).toEqual(51.23);
    expect(discountRate.val).toEqual(512_300_000n);
  });
});
