import { describe, expect, test } from "vitest";
import { mergeCrossChainActivityGroups } from "./activityGroups.js";

const row = (
  value: string,
  chainId: number,
  timestamp = 100_000,
  signature = "actor|buybackPool",
) => ({ value, chainId, timestamp, signature, txHash: `hash-${value}` });
const link = (chainId: number, value: string) => ({
  chainId,
  txHash: `hash-${value}`,
});

describe("mergeCrossChainActivityGroups", () => {
  test("keeps four-chain setup links in their original order with the first value", () => {
    expect(
      mergeCrossChainActivityGroups([
        row("base", 8453),
        row("ethereum", 1),
        row("arbitrum", 42161),
        row("optimism", 10),
      ]),
    ).toEqual([
      {
        value: "base",
        chains: [
          link(8453, "base"),
          link(1, "ethereum"),
          link(42161, "arbitrum"),
          link(10, "optimism"),
        ],
      },
    ]);
  });

  test("preserves JBM's first eligible host and output order for interleaved repeats", () => {
    expect(
      mergeCrossChainActivityGroups([
        row("first-eth", 1),
        row("second-eth", 1),
        row("other-action", 10, 100_000, "actor|setUri"),
        row("first-base", 8453),
        row("second-base", 8453),
        row("other-actor", 42161, 100_000, "otherActor|buybackPool"),
        row("first-op", 10),
      ]),
    ).toEqual([
      {
        value: "first-eth",
        chains: [
          link(1, "first-eth"),
          link(8453, "first-base"),
          link(10, "first-op"),
        ],
      },
      {
        value: "second-eth",
        chains: [link(1, "second-eth"), link(8453, "second-base")],
      },
      { value: "other-action", chains: [link(10, "other-action")] },
      { value: "other-actor", chains: [link(42161, "other-actor")] },
    ]);
  });

  test.each([-1, 1])(
    "includes the six-hour boundary in either direction (%s)",
    (direction) => {
      const groups = mergeCrossChainActivityGroups([
        row("first", 1),
        row("boundary", 10, 100_000 + direction * 21_600),
        row("outside", 8453, 100_000 + direction * 21_601),
      ]);
      expect(groups).toEqual([
        { value: "first", chains: [link(1, "first"), link(10, "boundary")] },
        { value: "outside", chains: [link(8453, "outside")] },
      ]);
    },
  );

  test("anchors the window to the first representative, not the last merged row", () => {
    expect(
      mergeCrossChainActivityGroups([
        row("first", 1, 0),
        row("six-hours", 10, 21_600),
        row("twelve-hours", 8453, 43_200),
      ]),
    ).toEqual([
      { value: "first", chains: [link(1, "first"), link(10, "six-hours")] },
      { value: "twelve-hours", chains: [link(8453, "twelve-hours")] },
    ]);
  });

  test("never merges two rows on the same chain, including identical links", () => {
    const repeated = row("repeat", 1);
    expect(mergeCrossChainActivityGroups([repeated, repeated])).toEqual([
      { value: "repeat", chains: [link(1, "repeat")] },
      { value: "repeat", chains: [link(1, "repeat")] },
    ]);
  });

  test("accepts empty or readonly inputs without mutating rows or representative values", () => {
    expect(mergeCrossChainActivityGroups([])).toEqual([]);
    const value = Object.freeze([{ id: "event" }]);
    const first = Object.freeze({ ...row("first", 1), value });
    const second = Object.freeze({
      ...row("second", 10),
      value: [{ id: "other" }],
    });
    const rows = Object.freeze([first, second]);
    const groups = mergeCrossChainActivityGroups(rows);
    expect(groups[0].value).toBe(value);
    expect(groups[0].chains).toEqual([link(1, "first"), link(10, "second")]);
    expect(rows).toEqual([first, second]);
    expect(Object.keys(groups[0])).toEqual(["value", "chains"]);
  });
});
