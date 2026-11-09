import { describe, expect, test } from "vitest";
import {
  reviewedRunStatus,
  type ReviewedRunStatus,
  type ReviewedRunStatusInput,
} from "./runStatus.js";

const run = (
  given: Partial<ReviewedRunStatusInput>,
): ReviewedRunStatusInput => ({
  phase: "idle",
  error: null,
  settled: null,
  held: null,
  ...given,
});

describe("reviewedRunStatus", () => {
  test.each<
    [string, Partial<ReviewedRunStatusInput>, ReviewedRunStatus, boolean]
  >([
    ["nothing run", {}, "idle", false],
    ["reviewing", { phase: "review" }, "review", true],
    ["simulating", { phase: "simulating" }, "simulating", true],
    ["signing", { phase: "signing" }, "signing", true],
    ["confirming in place", { phase: "receipt" }, "receipt", true],
    [
      "confirming, its hold with more to say",
      { phase: "receipt", held: { phase: "held" } },
      "held",
      false,
    ],
    [
      "confirming, its hold confirming",
      { phase: "receipt", held: { phase: "confirming" } },
      "receipt",
      true,
    ],
    ["proposed", { phase: "proposed" }, "proposed", false],
    [
      "proposed, its hold awaiting signers",
      { phase: "proposed", held: { phase: "awaiting" } },
      "proposed",
      false,
    ],
    [
      "proposed, executed and confirming",
      { phase: "proposed", held: { phase: "confirming" } },
      "receipt",
      true,
    ],
    [
      "proposed, its proof lost",
      { phase: "proposed", held: { phase: "held" } },
      "held",
      false,
    ],
    ["done", { phase: "done" }, "done", false],
    ["failed", { error: "It failed." }, "failed", false],
    [
      "failed with its step held",
      { error: "It may have been sent.", held: { phase: "held" } },
      "held",
      false,
    ],
    ["a success while away", { held: { phase: "succeeded" } }, "held", false],
    [
      "a step still confirming after the run",
      { held: { phase: "confirming" } },
      "receipt",
      true,
    ],
    [
      "a proposal still awaiting after the run",
      { held: { phase: "awaiting" } },
      "proposed",
      false,
    ],
    [
      "a hold already clear",
      { held: { phase: "clear" }, cancelled: true },
      "cancelled",
      false,
    ],
    [
      "an approval settled, more steps left",
      { settled: { step: 0, finished: false } },
      "settled",
      false,
    ],
    ["cancelled", { cancelled: true }, "cancelled", false],
    [
      "a new run after a cancel",
      { phase: "review", cancelled: true },
      "review",
      true,
    ],
  ])("%s", (_, given, status, busy) => {
    expect(reviewedRunStatus(run(given))).toEqual({ status, busy });
  });
});
