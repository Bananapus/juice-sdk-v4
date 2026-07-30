import { describe, expect, test } from "vitest";
import { downsampleTimeSeries } from "./timeSeries.js";

type Point = { timestamp: number; value: number };

const sample = (rows: readonly Point[], maxPoints: number) =>
  downsampleTimeSeries(
    rows,
    maxPoints,
    (point) => point.timestamp,
    (point) => point.value,
  );

describe("downsampleTimeSeries", () => {
  test("returns a shallow copy when the series already fits", () => {
    const rows = [
      { timestamp: 1, value: 1 },
      { timestamp: 2, value: 2 },
    ];

    const result = sample(rows, 3);

    expect(result).toEqual(rows);
    expect(result).not.toBe(rows);
  });

  test("retains the first, latest, and visually significant observations", () => {
    const rows = Array.from({ length: 100 }, (_, timestamp) => ({
      timestamp,
      value: timestamp === 47 ? 1_000 : timestamp % 5,
    }));

    const result = sample(rows, 12);

    expect(result).toHaveLength(12);
    expect(result[0]).toBe(rows[0]);
    expect(result[result.length - 1]).toBe(rows[rows.length - 1]);
    expect(result).toContain(rows[47]);
    expect(result.map((point) => point.timestamp)).toEqual(
      [...result].map((point) => point.timestamp).sort((a, b) => a - b),
    );
  });

  test("does not mutate the source series", () => {
    const rows = Object.freeze(
      Array.from({ length: 20 }, (_, timestamp) =>
        Object.freeze({ timestamp, value: Math.sin(timestamp) }),
      ),
    );

    expect(() => sample(rows, 6)).not.toThrow();
    expect(rows).toHaveLength(20);
  });

  test("has deterministic zero, one, and two-point limits", () => {
    const rows = [
      { timestamp: 1, value: 10 },
      { timestamp: 2, value: 20 },
      { timestamp: 3, value: 30 },
    ];

    expect(sample(rows, 0)).toEqual([]);
    expect(sample(rows, 1)).toEqual([rows[0]]);
    expect(sample(rows, 2)).toEqual([rows[0], rows[2]]);
  });

  test("rejects invalid point limits", () => {
    const rows = [{ timestamp: 1, value: 10 }];

    expect(() => sample(rows, -1)).toThrow(RangeError);
    expect(() => sample(rows, 1.5)).toThrow(RangeError);
    expect(() => sample(rows, Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });

  test("handles non-finite projected coordinates deterministically", () => {
    const rows = Array.from({ length: 10 }, (_, timestamp) => ({
      timestamp,
      value: timestamp === 4 ? Number.NaN : timestamp,
    }));

    const first = sample(rows, 5);
    const second = sample(rows, 5);

    expect(first).toEqual(second);
    expect(first).toHaveLength(5);
    expect(first[0]).toBe(rows[0]);
    expect(first[first.length - 1]).toBe(rows[rows.length - 1]);
  });
});
