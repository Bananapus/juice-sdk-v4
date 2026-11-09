import type { HeldWritePhase } from "./heldWrite.js";
import type { ReviewedProgress } from "./send.js";

/**
 * Where a reviewed run stands, the one status every app shows for it. A run
 * in flight is in its `ReviewedProgress` phase; a step it left held takes
 * its hold's `HeldWritePhase`:
 *
 * - `idle`: nothing run, or reset;
 * - `review`, `simulating`, `signing`: before the wallet sends;
 * - `receipt`: sent, its receipt being confirmed (a Safe's execution too);
 * - `proposed`: a Safe proposal awaiting its signers;
 * - `held`: the hold has more to say than confirming (its line, its exit, a
 *   success the user has not acknowledged);
 * - `settled`: a step before the last (an approval) settled: running the
 *   action again resumes it;
 * - `done`: every step settled;
 * - `failed`: it failed, with the run's `error`;
 * - `cancelled`: the review or the wallet prompt was closed, or the action's
 *   `signal` withdrew it, with nothing sent and nothing held.
 */
export type ReviewedRunStatus =
  | "idle"
  | "review"
  | "simulating"
  | "signing"
  | "receipt"
  | "proposed"
  | "held"
  | "settled"
  | "done"
  | "failed"
  | "cancelled";

/** What `reviewedRunStatus` reads: `useReviewedRun`'s fields of the same names. */
export type ReviewedRunStatusInput = {
  phase: ReviewedProgress["phase"] | "idle";
  error: string | null;
  settled: { step: number; finished: boolean } | null;
  held: { phase: HeldWritePhase } | null;
  /** The last run ended cancelled. */
  cancelled?: boolean;
};

/** A held step's status, or null when its hold holds nothing to show. */
function heldStatus(phase: HeldWritePhase): ReviewedRunStatus | null {
  switch (phase) {
    case "awaiting":
      return "proposed";
    case "confirming":
      return "receipt";
    case "held":
    case "succeeded":
      return "held";
    default:
      return null;
  }
}

/**
 * A reviewed run's status, and whether it is busy: reviewing, simulating,
 * signing or confirming a receipt, when the app keeps its action from
 * running again. Pure: a run's state from `useReviewedRun`, or one an app
 * or test builds, gives the same answer.
 */
export function reviewedRunStatus(run: ReviewedRunStatusInput): {
  status: ReviewedRunStatus;
  busy: boolean;
} {
  const held = run.held ? heldStatus(run.held.phase) : null;
  const status: ReviewedRunStatus =
    run.phase === "done"
      ? "done"
      : run.phase === "receipt" || run.phase === "proposed"
        ? (held ?? run.phase)
        : run.phase !== "idle"
          ? run.phase
          : (held ??
            (run.error !== null
              ? "failed"
              : run.settled && !run.settled.finished
                ? "settled"
                : run.cancelled
                  ? "cancelled"
                  : "idle"));
  return {
    status,
    busy:
      status === "review" ||
      status === "simulating" ||
      status === "signing" ||
      status === "receipt",
  };
}
