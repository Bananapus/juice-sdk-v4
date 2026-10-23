import {
  findReviewedSequence,
  isDefiniteWalletRejection,
  openStepHold,
  resumeReviewed,
  sendReviewed,
  transactionMessage,
  TransactionReviewCancelledError,
  type HeldWriteView,
  type ReviewedAction,
  type ReviewedCall,
  type ReviewedProgress,
  type ReviewedResult,
  type ReviewedSendDeps,
  type WriteHoldHandle,
  type WriteHoldState,
} from "../index.js";
import { useEffect, useRef, useState } from "react";
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
  /**
   * The value the failed run threw, with its cause chain, for a site's own
   * decoder (a slippage retry, say). Null on success and on cancel.
   */
  failure: unknown;
  hash: Hex | null;
  safeTxHash: Hex | null;
  /**
   * After a run that did not finish: the hold of its step still in flight
   * (the saved sequence's, or the first of its calls held), followed as it
   * changes, here or in another window. Null once that hold is clear.
   */
  held: HeldWriteView | null;
  reset: () => void;
};

type RunState = Omit<UseReviewedRunResult, "run" | "reset" | "held">;

const IDLE: RunState = {
  phase: "idle",
  step: 0,
  total: 0,
  error: null,
  failure: null,
  hash: null,
  safeTxHash: null,
};

const viewOf = (state: WriteHoldState | null): HeldWriteView | null =>
  state && state.status !== "clear"
    ? {
        phase: "held",
        state,
        line: state.line,
        exit: false,
        adopting: false,
      }
    : null;

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
  /** The hold followed after a run: its state is `held`. */
  const [watched, setWatched] = useState<WriteHoldHandle | null>(null);
  const [holdState, setHoldState] = useState<WriteHoldState | null>(null);
  useEffect(() => {
    setHoldState(watched?.peek() ?? null);
    return watched?.subscribe(setHoldState);
  }, [watched]);
  /** The latest run: an earlier one's late answers change nothing. */
  const latest = useRef(0);
  return {
    ...state,
    held: viewOf(holdState),
    reset: () => {
      latest.current += 1;
      setState(IDLE);
      setWatched(null);
    },
    run: async (action) => {
      const id = ++latest.current;
      const update = (next: Partial<RunState>) => {
        if (latest.current === id) setState((now) => ({ ...now, ...next }));
      };
      setState({ ...IDLE, phase: "review", total: action.calls.length });
      setWatched(null);
      /** The step a run that did not finish leaves held, if any. */
      const follow = () => {
        if (latest.current !== id || !deps?.account) return;
        try {
          const { account, adapter, hold, storage } = deps;
          const safe = adapter.isSafe();
          const saved = !action.scope
            ? null
            : findReviewedSequence(action.scope, account, { storage });
          const handles = saved?.sending
            ? [
                openStepHold(
                  hold,
                  account,
                  safe,
                  saved.calls[saved.sending.step],
                ),
              ]
            : action.calls.map((call) =>
                openStepHold(hold, account, safe, call),
              );
          setWatched(
            handles.find((handle) => handle.peek().status !== "clear") ?? null,
          );
        } catch {
          /* A call the hold can't open holds nothing to show. */
        }
      };
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
        if (result.status === "proposed") follow();
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
          failure: cancelled ? null : error,
        });
        follow();
        return null;
      }
    },
  };
}
