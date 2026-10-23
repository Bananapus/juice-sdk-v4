import {
  createHeldWriteView,
  findReviewedSequence,
  isDefiniteWalletRejection,
  openStepHold,
  resumeReviewed,
  REVIEWED_ACCOUNT_CHANGED_LINE,
  sendReviewed,
  transactionMessage,
  TransactionReviewCancelledError,
  type HeldWriteView,
  type ReviewedAction,
  type ReviewedCall,
  type ReviewedProgress,
  type ReviewedResult,
  type ReviewedSendDeps,
  type WriteHoldClient,
  type WriteHoldHandle,
} from "../index.js";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  actionsOf,
  idle,
  keyOf,
  none,
  type HeldViewActions,
} from "./heldView.js";
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
   * null), or it failed (`error` says why). An `account` (the one the calls
   * were built for) refuses the run before its review unless it is the
   * connected one.
   */
  run: (
    action: Omit<ReviewedAction, "account" | "guard"> & { account?: Address },
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
   * changes, here or in another window. Null once that hold is clear or
   * released. Its exit and send-again are `exitAction` and `sendAgainAction`.
   */
  held: HeldWriteView | null;
  reset: () => void;
} & HeldViewActions;

type RunState = Omit<
  UseReviewedRunResult,
  "run" | "reset" | "held" | keyof HeldViewActions
>;

const IDLE: RunState = {
  phase: "idle",
  step: 0,
  total: 0,
  error: null,
  failure: null,
  hash: null,
  safeTxHash: null,
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
  /** The hold followed after a run, and its chain's client: its view is `held`. */
  const [watched, setWatched] = useState<{
    handle: WriteHoldHandle;
    client: WriteHoldClient;
  } | null>(null);
  const view = useMemo(
    () =>
      watched
        ? createHeldWriteView(watched.handle, { client: watched.client })
        : undefined,
    [watched],
  );
  useEffect(() => view?.start(), [view]);
  const shown = useSyncExternalStore(
    view?.subscribe ?? none,
    view?.get ?? idle,
    view?.get ?? idle,
  );
  const held =
    shown.phase === "clear" ||
    shown.phase === "released" ||
    shown.phase === "settled"
      ? null
      : shown;
  /** The latest run: an earlier one's late answers change nothing. */
  const latest = useRef(0);
  return {
    ...state,
    held,
    ...actionsOf(shown, held ? view : undefined),
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
          const calls = saved?.sending
            ? [saved.calls[saved.sending.step]]
            : action.calls;
          const found = calls
            .map((call) => ({
              call,
              handle: openStepHold(hold, account, safe, call),
            }))
            .find(({ handle }) => handle.peek().status !== "clear");
          setWatched(
            found
              ? {
                  handle: found.handle,
                  client: deps.clientFor(found.call.chainId),
                }
              : null,
          );
        } catch {
          /* A call the hold can't open holds nothing to show. */
        }
      };
      try {
        if (!deps?.account) throw new Error("Connect a wallet first.");
        if (
          action.account &&
          action.account.toLowerCase() !== deps.account.toLowerCase()
        )
          throw new Error(REVIEWED_ACCOUNT_CHANGED_LINE);
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
