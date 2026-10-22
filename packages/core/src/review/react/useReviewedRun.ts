import {
  findReviewedSequence,
  isDefiniteWalletRejection,
  resumeReviewed,
  sendReviewed,
  transactionMessage,
  TransactionReviewCancelledError,
  WriteHeldError,
  type HeldWriteView,
  type ReviewedAction,
  type ReviewedCall,
  type ReviewedProgress,
  type ReviewedResult,
  type ReviewedSendDeps,
} from "../index.js";
import { useRef, useState } from "react";
import { keyOf } from "./heldView.js";
import type { Address, Hex } from "viem";

export type UseReviewedRunDeps = ReviewedSendDeps & {
  account: Address | undefined;
  guard?: () => void;
};

export type UseReviewedRunResult = {
  /**
   * Review and send `action` once. A `scope` with an unfinished sequence
   * of the same calls saved resumes it instead: only its remaining steps
   * are reviewed and sent. Other calls under that scope are refused until
   * it is resumed or discarded. Null when nothing finished: the user cancelled (`error` stays
   * null), or it failed (`error` says why).
   */
  run: (
    action: Omit<ReviewedAction, "account" | "guard">,
  ) => Promise<ReviewedResult | null>;
  phase: ReviewedProgress["phase"] | "idle";
  step: number;
  total: number;
  error: string | null;
  hash: Hex | null;
  safeTxHash: Hex | null;
  /** The hold that refused a step, as of the refusal. */
  held: HeldWriteView | null;
  reset: () => void;
};

type RunState = Omit<UseReviewedRunResult, "run" | "reset">;

const IDLE: RunState = {
  phase: "idle",
  step: 0,
  total: 0,
  error: null,
  hash: null,
  safeTxHash: null,
  held: null,
};

/** The bytes a call sends, for comparing two actions. */
const sent = ({ chainId, to, data, value }: ReviewedCall) => [
  chainId,
  to.toLowerCase(),
  data.toLowerCase(),
  value ?? 0n,
];

export const REVIEWED_RUN_SCOPE_LINE =
  "This action has more than one step and no scope to resume it by. Nothing was sent.";

/**
 * The one reviewed-send hook every site shares: its state, progress and
 * error lines. A site's own hook only builds `deps` from its wallet library;
 * null `deps` (no wallet yet) refuses every run.
 */
export function useReviewedRun(
  deps: UseReviewedRunDeps | null,
): UseReviewedRunResult {
  const [state, setState] = useState<RunState>(IDLE);
  /** The latest run: an earlier one's late answers change nothing. */
  const latest = useRef(0);
  return {
    ...state,
    reset: () => {
      latest.current += 1;
      setState(IDLE);
    },
    run: async (action) => {
      const id = ++latest.current;
      const update = (next: Partial<RunState>) => {
        if (latest.current === id) setState((now) => ({ ...now, ...next }));
      };
      setState({ ...IDLE, phase: "review", total: action.calls.length });
      try {
        if (!deps?.account) throw new Error("Connect a wallet first.");
        if (action.calls.length > 1 && action.scope === undefined)
          throw new Error(REVIEWED_RUN_SCOPE_LINE);
        const { account, guard } = deps;
        const tracked: ReviewedSendDeps = {
          ...deps,
          onProgress: (progress) => {
            deps.onProgress?.(progress);
            update({
              phase: progress.phase,
              step: progress.step,
              total: progress.total,
              ...(progress.hash
                ? progress.phase === "proposed"
                  ? { safeTxHash: progress.hash }
                  : { hash: progress.hash }
                : {}),
            });
          },
        };
        const unfinished =
          action.scope === undefined
            ? null
            : findReviewedSequence(action.scope, account, {
                storage: deps.storage,
              });
        // Resumed only when the user asked for the same calls again;
        // otherwise sendReviewed refuses while it is unfinished.
        const saved =
          unfinished &&
          keyOf(unfinished.calls.map(sent)) === keyOf(action.calls.map(sent))
            ? unfinished
            : null;
        const result = saved
          ? await resumeReviewed(saved, { ...action, guard }, tracked)
          : await sendReviewed({ ...action, account, guard }, tracked);
        if (result.status === "done" && saved && !result.receipts.length)
          // Its last step settled while away: nothing was left to send.
          update({
            phase: "done",
            step: saved.calls.length - 1,
            total: saved.calls.length,
          });
        return result;
      } catch (error) {
        const cancelled =
          error instanceof TransactionReviewCancelledError ||
          isDefiniteWalletRejection(error);
        update({
          ...IDLE,
          error: cancelled
            ? null
            : transactionMessage(
                error instanceof Error ? error.message : String(error),
              ),
          held:
            error instanceof WriteHeldError
              ? {
                  phase: "held",
                  state: error.state,
                  line: error.state.line,
                  exit: false,
                  adopting: false,
                }
              : null,
        });
        return null;
      }
    },
  };
}
