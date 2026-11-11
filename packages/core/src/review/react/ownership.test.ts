import { describe, expect, test } from "vitest";
import type { Address } from "viem";
import { mergeOwn, type OwnChange, type OwnEntry } from "./ownership.js";

const A = "0x1111111111111111111111111111111111111111" as Address;
const B = "0x3333333333333333333333333333333333333333" as Address;

/** `after` is `before`, or a step forward of it. */
const forward = (before: OwnEntry | undefined, after: OwnEntry) =>
  !before ||
  (after.account === before.account &&
    after.reservation === before.reservation &&
    (before.state === "owned" || after.state === "shown") &&
    before.dismissed.every((run) => after.dismissed.includes(run)));

describe("mergeOwn", () => {
  test("keeps the sender's account, keeps every dismissing run, and ignores a showing by one", () => {
    let entry = mergeOwn(undefined, A, "r", { kind: "keep" });
    expect(entry).toEqual({
      account: A,
      reservation: "r",
      state: "owned",
      dismissed: [],
    });
    entry = mergeOwn(entry, B, "r", { kind: "dismiss", run: 2 });
    // A later keep (an undelivered recovery) drops no dismissing run.
    entry = mergeOwn(entry, B, "r", { kind: "keep" });
    expect(entry).toMatchObject({ account: A, dismissed: [2] });
    expect(mergeOwn(entry, A, "r", { kind: "dismiss", run: 2 })).toBe(entry);
    // Shown by the run the user dismissed: not seen.
    expect(mergeOwn(entry, A, "r", { kind: "shown", run: 2 })).toBe(entry);
    entry = mergeOwn(entry, A, "r", { kind: "shown", run: 3 });
    expect(entry.state).toBe("shown");
    // Shown is final.
    for (const change of [
      { kind: "keep" },
      { kind: "dismiss", run: 4 },
      { kind: "shown" },
    ] as OwnChange[])
      expect(mergeOwn(entry, A, "r", change)).toBe(entry);
    expect(mergeOwn(undefined, A, "s", { kind: "shown" }).state).toBe("shown");
  });

  test("never moves an entry backwards, over any sequence of changes", () => {
    let seed = 0x0a11;
    const random = () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const pick = <T>(options: readonly T[]) =>
      options[Math.floor(random() * options.length)];
    for (let round = 0; round < 500; round += 1) {
      let entry: OwnEntry | undefined;
      for (let step = 0; step < 12; step += 1) {
        const run = Math.floor(random() * 4);
        const change = pick<OwnChange>([
          { kind: "keep" },
          { kind: "dismiss", run },
          { kind: "shown", run },
          { kind: "shown" },
        ]);
        const next = mergeOwn(entry, pick([A, B]), "r", change);
        expect(forward(entry, next)).toBe(true);
        entry = next;
      }
    }
  });
});
