import { ReviewLineError } from "../lineError.js";
import {
  createHeldWriteView,
  discardReviewedSequence,
  errorLine,
  findReviewedSequence,
  isDefiniteWalletRejection,
  openStepHold,
  RECEIPT_RETRY_MS,
  REVIEWED_ACCOUNT_CHANGED_LINE,
  REVIEWED_ENGINE_LOAD_LINE,
  ReviewedReceiptUnverifiedError,
  safeBatchCall,
  settledLine,
  TransactionReviewCancelledError,
  walletReady,
  type HeldWriteView,
  type ReviewedAction,
  type ReviewedCall,
  type ReviewedProgress,
  type ReviewedResult,
  type ReviewedSendDeps,
  type completeReviewedStep,
  type resumeReviewed,
  type sendReviewed,
  type WriteHoldClient,
  type WriteHoldHandle,
  type WriteHoldSettled,
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
import type { Address, Hex, TransactionReceipt } from "viem";

/** The send engine: the review model, its decoder and the ABIs it reads. */
export type ReviewedEngine = {
  sendReviewed: typeof sendReviewed;
  resumeReviewed: typeof resumeReviewed;
  completeReviewedStep: typeof completeReviewedStep;
};

export type UseReviewedRunDeps = ReviewedSendDeps & {
  account: Address | undefined;
  guard?: () => void;
  /**
   * Loads the send engine, so the app chooses whether a page's first load
   * carries it: `() => import("@bananapus/nana-sdk-core/review")` keeps it
   * out. The hook calls it once mounted, so a run does not wait on it, and
   * again only after a load failed.
   */
  engine: () => Promise<ReviewedEngine>;
};

/** A run that failed: `error` is the line to show, `failure` the value thrown. */
export type ReviewedRunFailed = {
  status: "failed";
  error: string;
  failure: unknown;
};

/**
 * A run whose step was sent and is still confirming: its hold has not yet
 * verified the receipt. Never failed; the hook follows the hold to `done`.
 */
export type ReviewedRunReceipt = {
  status: "receipt";
  step: number;
  hash: Hex;
  /** The action's signatures, signed before the send, when it had any. */
  signatures?: Hex[];
};

export type UseReviewedRunResult = {
  /**
   * Review and send `action` once. A `scope` with an unfinished sequence
   * of the same calls saved resumes it instead: only its remaining steps
   * are reviewed and sent. Other calls under that scope are refused until
   * it is resumed or discarded. Null when the user cancelled; `failed`, with
   * the same `error` and `failure` the hook shows, when it failed. An
   * `account` (the one the calls were built for) refuses the run before its
   * review unless it is the connected one. A `done` it shows is
   * acknowledged; one it could not show refuses the next run, with
   * `sendAgainAction`. A sent step whose receipt its hold has not verified
   * resolves `receipt`, as the hook's `phase` shows, and the hook follows
   * the hold until it settles.
   */
  run: (
    action: Omit<ReviewedAction, "account" | "guard"> & { account?: Address },
  ) => Promise<ReviewedResult | ReviewedRunReceipt | ReviewedRunFailed | null>;
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
   * The receipt that settled a followed Safe proposal (or held step), once
   * its hold settled it: `phase` is then "done" on success, and `error`
   * says why on a failure or expiry.
   */
  receipt: TransactionReceipt | null;
  /**
   * When a followed step settled successfully: which step of the action it
   * was, and whether that finished the whole action. A step before the last
   * (an approval) leaves `phase` idle: running the action again resumes it.
   */
  settled: { step: number; finished: boolean } | null;
  /**
   * After a run that did not finish: the hold of its step still in flight
   * (the saved sequence's, or the first of its calls held), followed as it
   * changes, here or in another window. Null once that hold is clear or
   * released. Its exit and send-again are `exitAction` and `sendAgainAction`.
   */
  held: HeldWriteView | null;
  reset: () => void;
  /**
   * Loads the send engine now (on hover, focus or pointerdown of the action),
   * so the review opens without a wait. Safe to call any number of times: it
   * loads once, and again only after a load failed.
   */
  preload: () => void;
  /**
   * Drops the unfinished sequence saved under `scope` for `account` (the one
   * that sent it, as `run` took it; the connected one when omitted), say one
   * whose step was released, so the action is reviewed fresh, every step
   * again. Refused while one of its steps is still held, and while a run of
   * this hook is open. Nothing saved is a no-op.
   */
  discard: (scope: string, account?: Address) => Promise<void>;
} & HeldViewActions;

type RunState = Omit<
  UseReviewedRunResult,
  "run" | "reset" | "held" | "preload" | "discard" | keyof HeldViewActions
>;

const IDLE: RunState = {
  phase: "idle",
  step: 0,
  total: 0,
  error: null,
  failure: null,
  hash: null,
  safeTxHash: null,
  receipt: null,
  settled: null,
};

/** The bytes a call sends, for comparing two actions. */
const sent = ({ chainId, to, data, value, gas }: ReviewedCall) => [
  chainId,
  to.toLowerCase(),
  data.toLowerCase(),
  value ?? 0n,
  gas ?? null,
];

export const REVIEWED_RUN_SCOPE_LINE =
  "This action has more than one step and no scope to resume it by. Nothing was sent.";

export const REVIEWED_RUN_BUSY_LINE =
  "This action is still running. Wait for it to finish, then try again.";

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
    /** The run that followed it: a reset or a later run ignores its end. */
    run: number;
    /** The followed step's index in the action, and the action's step count. */
    step: number;
    total: number;
    /** A run left at its receipt: its settlement completes the step before it shows. */
    finish?: (
      settled: WriteHoldSettled,
      receipt: TransactionReceipt | null,
    ) => void;
  } | null>(null);
  /** The latest run: an earlier one's late answers change nothing. */
  const latest = useRef(0);
  /** How many runs are open: a discard waits for none. */
  const open = useRef(0);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  /** How a followed step ended, as the run that followed it shows it. */
  const showSettled = (
    run: number,
    step: number,
    total: number,
    settled: WriteHoldSettled,
    receipt: TransactionReceipt | null,
  ) => {
    if (latest.current !== run) return;
    const finished = step === total - 1;
    setState((now) =>
      settled.result !== "success"
        ? { ...IDLE, error: settledLine(settled), receipt }
        : finished
          ? {
              ...now,
              phase: "done",
              hash: settled.hash,
              receipt,
              error: null,
              failure: null,
              settled: { step, finished },
            }
          : {
              ...IDLE,
              step,
              total,
              hash: settled.hash,
              receipt,
              settled: { step, finished },
            },
    );
  };
  /** The engine's load, shared by every preload and run until one fails. */
  const loading = useRef<Promise<ReviewedEngine> | null>(null);
  const view = useMemo(
    () =>
      watched
        ? createHeldWriteView(watched.handle, {
            client: watched.client,
            // The followed step's end ends the run: a proposal never stays proposed.
            onSettled: (settled, receipt) =>
              watched.finish
                ? watched.finish(settled, receipt)
                : showSettled(
                    watched.run,
                    watched.step,
                    watched.total,
                    settled,
                    receipt,
                  ),
            onReleased: () => latest.current === watched.run && setState(IDLE),
          })
        : undefined,
    [watched],
  );
  useEffect(() => view?.start(), [view]);
  const engine = deps?.engine;
  const load = (from: () => Promise<ReviewedEngine>) => {
    const pending = (loading.current ??= from());
    pending.catch(() => {
      // A failed load is tried again by the next preload or run.
      if (loading.current === pending) loading.current = null;
    });
    return pending;
  };
  const preload = () => {
    if (engine)
      load(engine).catch(() => {
        /* A run loads it again, and reports its failure. */
      });
  };
  useEffect(preload, [engine]);
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
  return {
    ...state,
    held,
    ...actionsOf(shown, held ? view : undefined),
    reset: () => {
      latest.current += 1;
      setState(IDLE);
      setWatched(null);
    },
    preload,
    discard: async (scope, account = deps?.account) => {
      if (open.current) throw new ReviewLineError(REVIEWED_RUN_BUSY_LINE);
      if (!deps || !account)
        throw new ReviewLineError("Connect a wallet first.");
      const { storage } = deps;
      const saved = findReviewedSequence(scope, account, { storage });
      if (saved) await discardReviewedSequence(saved, { storage });
      if (open.current) return;
      latest.current += 1;
      setState(IDLE);
      setWatched(null);
    },
    run: async (action) => {
      const id = ++latest.current;
      open.current += 1;
      const update = (next: Partial<RunState>) => {
        if (latest.current === id) setState((now) => ({ ...now, ...next }));
      };
      setState({ ...IDLE, phase: "review", total: action.calls.length });
      let loaded: ReviewedEngine | undefined;
      setWatched(null);
      /** The step a run that did not finish leaves held, if any. */
      const follow = async (finish?: (typeof watched & {})["finish"]) => {
        if (latest.current !== id || !deps?.account) return;
        try {
          const { account, adapter, hold, storage } = deps;
          // Its Safe mode is read only once the wallet says it is known.
          await walletReady(adapter);
          if (latest.current !== id) return;
          const safe = adapter.isSafe();
          const saved = !action.scope
            ? null
            : findReviewedSequence(action.scope, account, { storage });
          const total = saved?.calls.length ?? action.calls.length;
          // A Safe app's batch is held as its one MultiSend proposal, its last step.
          const steps = saved?.sending
            ? [
                {
                  call: saved.calls[saved.sending.step],
                  step: saved.sending.step,
                },
              ]
            : !saved && action.batch && safe && action.calls.length > 1
              ? [
                  {
                    call: safeBatchCall(account, action.calls),
                    step: total - 1,
                  },
                ]
              : action.calls.map((call, step) => ({ call, step }));
          // A held step, or the last step's success nothing showed.
          const found = steps
            .map(({ call, step }) => ({
              call,
              step,
              handle: openStepHold(hold, account, safe, call),
            }))
            .find(
              ({ handle, step }) =>
                handle.peek().status !== "clear" ||
                (step === total - 1 && handle.unacknowledgedSuccess()),
            );
          setWatched(
            found
              ? {
                  handle: found.handle,
                  client: deps.clientFor(found.call.chainId),
                  run: id,
                  step: found.step,
                  total,
                  ...(finish ? { finish } : {}),
                }
              : null,
          );
        } catch {
          /* A call the hold can't open holds nothing to show. */
        }
      };
      try {
        if (!deps?.account)
          throw new ReviewLineError("Connect a wallet first.");
        if (
          action.account &&
          action.account.toLowerCase() !== deps.account.toLowerCase()
        )
          throw new ReviewLineError(REVIEWED_ACCOUNT_CHANGED_LINE);
        if (action.calls.length > 1 && action.scope === undefined)
          throw new ReviewLineError(REVIEWED_RUN_SCOPE_LINE);
        const { signal } = action;
        if (signal?.aborted) throw new TransactionReviewCancelledError();
        let withdraw = () => {};
        loaded = await Promise.race([
          load(deps.engine).catch((cause: unknown) => {
            throw Object.assign(
              new ReviewLineError(REVIEWED_ENGINE_LOAD_LINE),
              { cause },
            );
          }),
          // A review withdrawn while the engine loads ends here, cancelled.
          new Promise<never>((_, reject) => {
            withdraw = () => reject(new TransactionReviewCancelledError());
            signal?.addEventListener("abort", withdraw, { once: true });
          }),
        ]).finally(() => signal?.removeEventListener("abort", withdraw));
        const { resumeReviewed, sendReviewed } = loaded;
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
        if (result.status === "proposed") void follow();
        else if (mounted.current && latest.current === id) {
          // Shown: its success blocks no later run.
          const calls = saved?.calls ?? action.calls;
          const handle = openStepHold(
            deps.hold,
            account,
            false,
            calls[calls.length - 1],
          );
          const success = handle.unacknowledgedSuccess();
          if (
            success &&
            result.hashes.some((h) => h.toLowerCase() === success.hash)
          )
            await handle.acknowledge(success).catch(() => undefined);
        }
        return result;
      } catch (error) {
        if (error instanceof ReviewedReceiptUnverifiedError) {
          // Still confirming: followed until its hold settles it.
          update({
            phase: "receipt",
            step: error.step,
            hash: error.hash,
            error: null,
            failure: null,
          });
          const complete = loaded!.completeReviewedStep;
          const action$ = {
            account: deps!.account!,
            scope: action.scope,
            onConfirmed: action.onConfirmed,
          };
          let completed: Promise<WriteHoldSettled | null> =
            Promise.resolve(null);
          let shown = false;
          // Completes the step once its hold settled it, then shows how it ended, once.
          const finish = (
            seen?: WriteHoldSettled,
            receipt: TransactionReceipt | null = null,
          ) => {
            let unread = false;
            completed = completed.then(
              (prior) =>
                prior ??
                complete(error, action$, deps!, receipt).catch(() => {
                  unread = true;
                  return null;
                }),
            );
            void completed.then((settled) => {
              if (shown || latest.current !== id) return;
              // Its receipt could not be read: nothing advanced, so it is tried again.
              if (unread) {
                if (mounted.current)
                  setTimeout(() => finish(seen, receipt), RECEIPT_RETRY_MS);
                return;
              }
              const ended = settled ?? seen;
              if (!ended) return;
              shown = true;
              showSettled(id, error.step, action.calls.length, ended, receipt);
              setWatched(null);
            });
          };
          // Followed for a later settlement; one already there is read once it attaches.
          void follow(finish).then(() => finish());
          return {
            status: "receipt",
            step: error.step,
            hash: error.hash,
            ...(error.held?.signatures
              ? { signatures: error.held.signatures }
              : {}),
          };
        }
        const cancelled =
          error instanceof TransactionReviewCancelledError ||
          isDefiniteWalletRejection(error);
        const line = cancelled ? null : errorLine(error);
        update({ ...IDLE, error: line, failure: cancelled ? null : error });
        void follow();
        return line === null
          ? null
          : { status: "failed", error: line, failure: error };
      } finally {
        open.current -= 1;
      }
    },
  };
}
