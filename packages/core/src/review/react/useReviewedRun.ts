import { ReviewLineError } from "../lineError.js";
import { tell } from "../receipt.js";
import {
  createHeldWriteView,
  discardReviewedSequence,
  errorLine,
  findReviewedSequence,
  followHeldWrite,
  isDefiniteWalletRejection,
  listReviewedWrites,
  openStepHold,
  RECEIPT_RETRY_MS,
  REVIEWED_ACCOUNT_CHANGED_LINE,
  REVIEWED_ENGINE_LOAD_LINE,
  ReviewedReceiptUnverifiedError,
  reviewedRunStatus,
  safeBatchCall,
  settledLine,
  TransactionReviewCancelledError,
  walletReady,
  type HeldWriteView,
  type ReviewedAction,
  type ReviewedCall,
  type ReviewedProgress,
  type ReviewedResult,
  type ReviewedRunStatus,
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
  /** A held step `dismiss` closed later succeeded: refresh its reads. */
  onDismissedSettled?: (call: ReviewedCall) => void;
};

type Detached = {
  handle: WriteHoldHandle;
  client: WriteHoldClient;
  call: ReviewedCall;
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
  /**
   * How the run ends once the step's hold settles it: `done` with every
   * step's hash (and the signatures), `failed`, or null when its hold was
   * released, a reset, an unmount or a later run replaced this one, or the
   * action's own `follow.signal` aborted (the step stays held). A step
   * before the last continues the action first, its remaining steps
   * reviewed again, as a resumed run is.
   */
  ended: () => Promise<ReviewedResult | ReviewedRunFailed | null>;
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
   * is followed in place (`phase` "receipt"), in the same review, for
   * `follow.timeoutMs` (2 minutes by default); only then does the run resolve
   * `receipt`, and the hook follows the hold until it settles.
   * `onCancelled` runs once when the run ends `cancelled`: nothing sent and
   * nothing held; `onStopped` once when it ends `stopped`, with the last step
   * sent. Both are told once that state rendered.
   */
  run: (
    action: Omit<ReviewedAction, "account" | "guard"> & {
      account?: Address;
      onCancelled?: () => void;
      onStopped?: (step: number) => void;
    },
  ) => Promise<ReviewedResult | ReviewedRunReceipt | ReviewedRunFailed | null>;
  /**
   * The highest step of the action whose hash the wallet returned in the
   * latest run (a resumed sequence's completed or proposed steps count), or
   * null. It outlasts the run's failure or release; `reset` clears it.
   */
  lastSubmittedStep: number | null;
  /** The run's status, from `reviewedRunStatus`: the one every app shows. */
  status: ReviewedRunStatus;
  /** Reviewing, simulating, signing or confirming in place (not `following`). */
  busy: boolean;
  /** The run only follows a sent step's hold: the confirm can close. */
  following: boolean;
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
   * Closes the confirm; false while the review or wallet is open. A held
   * earlier step ends the run (nothing more reviewed; its hold followed
   * detached, `onDismissedSettled`). A held last step only ends the wait
   * (`ended()` null) and stays shown. Otherwise it resets, following any hold
   * it showed detached. Never evidence a step can be resent.
   */
  dismiss: () => boolean;
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
  | "run"
  | "reset"
  | "dismiss"
  | "held"
  | "preload"
  | "discard"
  | "status"
  | "busy"
  | keyof HeldViewActions
> & {
  /** The last run ended cancelled. */
  cancelled: boolean;
  /** The last run ended stopped. */
  stopped: boolean;
};

const IDLE: RunState = {
  cancelled: false,
  stopped: false,
  following: false,
  lastSubmittedStep: null,
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
  /** A cancel or stop to tell once rendered. */
  const [cancelling, setCancelling] = useState<{ told: () => void } | null>(
    null,
  );
  useEffect(() => {
    if (cancelling) void tell(cancelling.told);
  }, [cancelling]);
  /** The hold followed after a run, and its chain's client: its view is `held`. */
  const [watched, setWatched] = useState<{
    handle: WriteHoldHandle;
    client: WriteHoldClient;
    /** The run that followed it: a reset or a later run ignores its end. */
    run: number;
    /** The followed step's call and index, and the action's step count. */
    call: ReviewedCall;
    step: number;
    total: number;
    /** Its settlement completes the step, checked, before it shows. */
    finish: (
      settled: WriteHoldSettled,
      receipt: TransactionReceipt | null,
    ) => void;
    /** That run's end, when its hold is released instead. */
    released?: () => void;
  } | null>(null);
  /** The latest run: an earlier one's late answers change nothing. */
  const latest = useRef(0);
  /** The sent step whose hold the latest run's `ended()` awaits. */
  const awaiting = useRef<{
    last: boolean;
    detached: Detached | null;
    end: () => void;
  } | null>(null);
  /** How many runs are open: a discard waits for none. */
  const open = useRef(0);
  const settling = useRef(0);
  const mounted = useRef(false);
  /** This render's `run`: a run's end that continues the action runs it. */
  const runLatest = useRef<UseReviewedRunResult["run"]>(async () => null);
  /**
   * Ends the latest run's in-place follow, and resolves an `ended()` it left
   * pending with null (released): a reset or a later run replaced it. Its
   * hold keeps the sent step.
   */
  const leave = useRef(() => {});
  const replaced = () => {
    latest.current += 1;
    awaiting.current = null;
    const left = leave.current;
    leave.current = () => {};
    left();
  };
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      // Unmounted: the run ends as on a reset.
      replaced();
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
        ? {
            ...IDLE,
            error: settledLine(settled),
            receipt,
            lastSubmittedStep: now.lastSubmittedStep,
          }
        : finished
          ? {
              ...now,
              following: false,
              phase: "done",
              hash: settled.hash,
              receipt,
              error: null,
              failure: null,
              settled: { step, finished },
            }
          : {
              ...IDLE,
              lastSubmittedStep: now.lastSubmittedStep,
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
            // The followed step's end ends the run once checked: a proposal
            // never stays proposed, and never shows done unverified.
            onSettled: (settled, receipt) => watched.finish(settled, receipt),
            onReleased: () => {
              watched.released?.();
              if (latest.current === watched.run)
                setState((now) => ({
                  ...IDLE,
                  lastSubmittedStep: now.lastSubmittedStep,
                }));
            },
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
  const { cancelled: _cancelled, stopped: _stopped, ...shownState } = state;
  const status = reviewedRunStatus({ ...state, held });
  const reset = () => {
    replaced();
    setState(IDLE);
    setWatched(null);
  };
  const detach = (target: Detached | null) => {
    // ponytail: unbounded; it ends once the hold is clear.
    if (target)
      void followHeldWrite(target.handle, target.client, {
        signal: new AbortController().signal,
      }).then(
        (end) =>
          end?.status === "clear" &&
          end.settled?.result === "success" &&
          tell(deps?.onDismissedSettled, target.call),
        () => undefined,
      );
  };
  const api: UseReviewedRunResult = {
    ...shownState,
    ...status,
    busy: status.busy && !state.following,
    held,
    ...actionsOf(shown, held ? view : undefined),
    reset,
    dismiss: () => {
      const waiting = awaiting.current;
      if ((open.current && !waiting) || settling.current) return false;
      if (waiting?.last) {
        awaiting.current = null;
        waiting.end();
        return true;
      }
      detach(
        waiting
          ? waiting.detached
          : watched && {
              handle: watched.handle,
              client: watched.client,
              call: watched.call,
            },
      );
      reset();
      return true;
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
      replaced();
      setState(IDLE);
      setWatched(null);
    },
    run: async ({ onCancelled, onStopped, ...action }) => {
      replaced();
      const id = latest.current;
      // A step still confirming is followed in place, in the same review,
      // until a reset or a later run ends it.
      const following = new AbortController();
      leave.current = () => following.abort();
      open.current += 1;
      const update = (next: Partial<RunState>) => {
        if (latest.current === id) setState((now) => ({ ...now, ...next }));
      };
      setState({ ...IDLE, phase: "review", total: action.calls.length });
      let loaded: ReviewedEngine | undefined;
      /** A step of the action was sent before this run, or by it: never a cancel. */
      let sentAny = false;
      let submitted: number | null = null;
      const submit = (step: number) => {
        if (submitted !== null && submitted >= step) return;
        submitted = step;
        update({ lastSubmittedStep: step });
      };
      setWatched(null);
      /**
       * Completes a sent step once its hold settled it, as the run would
       * have (`completeReviewedStep`: the journal, `onConfirmed` once with
       * the receipt its hold verified, the acknowledgement), then shows how
       * it ended, once. Until it can (the receipt unread, or the hold not yet
       * settled for this send), it is tried again, never shown.
       */
      const completing = (
        target: Pick<ReviewedReceiptUnverifiedError, "step" | "held">,
        total: number,
        end?: (outcome: {
          settled: WriteHoldSettled;
          receipt: TransactionReceipt | null;
        }) => void,
      ) => {
        let completed: Promise<
          Awaited<ReturnType<ReviewedEngine["completeReviewedStep"]>>
        > = Promise.resolve(null);
        let shown = false;
        const action$ = {
          account: deps!.account!,
          scope: action.scope,
          onConfirmed: action.onConfirmed,
        };
        const finish = (
          seen?: WriteHoldSettled,
          receipt: TransactionReceipt | null = null,
        ) => {
          let unread = false;
          settling.current += 1;
          completed = completed.then(
            (prior) =>
              prior ??
              (loaded ? Promise.resolve(loaded) : load(deps!.engine))
                .then((engine) =>
                  engine.completeReviewedStep(target, action$, deps!, receipt),
                )
                .catch(() => {
                  unread = true;
                  return null;
                }),
          );
          void completed.then((ended) => {
            settling.current -= 1;
            if (shown || latest.current !== id) return;
            // Nothing advanced (its receipt unread, or its hold not settled
            // for this send yet): it is tried again.
            if (unread || (!ended && seen)) {
              if (mounted.current)
                setTimeout(() => finish(seen, receipt), RECEIPT_RETRY_MS);
              return;
            }
            if (!ended) return;
            shown = true;
            // Shown with the receipt completion checked, a failure's too.
            showSettled(id, target.step, total, ended.settled, ended.receipt);
            setWatched(null);
            end?.(ended);
          });
        };
        return finish;
      };
      /**
       * The step a run that did not finish leaves held, if any: whether it
       * found one, or null when the wallet could not say (its Safe mode unknown).
       */
      const follow = async (
        finish?: (typeof watched & {})["finish"],
        released?: () => void,
      ): Promise<boolean | null> => {
        if (latest.current !== id || !deps?.account) return false;
        const { account, adapter, hold, storage } = deps;
        // Its Safe mode is read only once the wallet says it is known.
        try {
          await walletReady(adapter);
        } catch {
          return null;
        }
        try {
          if (latest.current !== id) return false;
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
          // Its settlement completes it as a send's would: a proposal too.
          const reservation =
            found?.handle.peek().reservation ??
            found?.handle.unacknowledgedSuccess()?.reservation;
          setWatched(
            found
              ? {
                  handle: found.handle,
                  client: deps.clientFor(found.call.chainId),
                  run: id,
                  call: found.call as ReviewedCall,
                  step: found.step,
                  total,
                  finish:
                    finish ??
                    completing(
                      {
                        step: found.step,
                        held: { call: found.call as ReviewedCall, reservation },
                      },
                      total,
                    ),
                  ...(released ? { released } : {}),
                }
              : null,
          );
          return !!found;
        } catch {
          /* A call the hold can't open holds nothing to show. */
          return false;
        }
      };
      const heldStep = (
        target: Pick<ReviewedReceiptUnverifiedError, "step" | "held">,
      ): Detached | null => {
        const call = target.held?.call ?? action.calls[target.step];
        if (!deps?.account || !call) return null;
        try {
          return {
            handle: openStepHold(
              deps.hold,
              deps.account,
              deps.adapter.isSafe(),
              call,
            ),
            client: deps.clientFor(call.chainId),
            call,
          };
        } catch {
          return null;
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
            sentAny ||= progress.step > 0 || !!progress.hash;
            tell(deps.onProgress, progress);
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
        if (saved?.completed.length) {
          sentAny = true;
          submit(saved.completed.length - 1);
        }
        if (saved?.proposed) submit(saved.proposed.step);
        // Its step in flight counts once the wallet returned its hash.
        const sending = saved?.sending;
        if (
          sending &&
          listReviewedWrites(
            { chainId: saved.calls[sending.step].chainId, account },
            { storage: deps.storage },
          ).some(
            ({ record }) => record.id === sending.reservation && !!record.hash,
          )
        ) {
          sentAny = true;
          submit(sending.step);
        }
        const onSubmitted: ReviewedAction["onSubmitted"] = (
          call,
          step,
          hash,
          how,
        ) => {
          submit(step);
          return action.onSubmitted?.(call, step, hash, how);
        };
        const given = action.follow?.signal;
        const inPlace: ReviewedAction["follow"] = {
          ...action.follow,
          signal: given
            ? AbortSignal.any([following.signal, given])
            : following.signal,
          onConfirming: (step) => {
            update({ phase: "receipt", step });
            tell(action.follow?.onConfirming, step);
          },
        };
        const result = saved
          ? await resumeReviewed(
              saved,
              { ...action, guard, follow: inPlace, onSubmitted },
              tracked,
            )
          : await sendReviewed(
              { ...action, account, guard, follow: inPlace, onSubmitted },
              tracked,
            );
        // A wallet that reviews on its own page reports no progress: the
        // result is the run's last word.
        update({ phase: result.status });
        // Every step of a done run has its hash, a resumed one's too.
        submit(
          result.status === "done"
            ? (saved?.calls ?? action.calls).length - 1
            : result.step,
        );
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
            following: true,
          });
          let end!: (
            outcome: {
              settled: WriteHoldSettled;
              receipt: TransactionReceipt | null;
            } | null,
          ) => void;
          const cancelled = action.follow?.signal;
          const abandon = () => end(null);
          const outcome = new Promise<Parameters<typeof end>[0]>(
            (resolve) =>
              (end = (ran) => {
                cancelled?.removeEventListener("abort", abandon);
                if (awaiting.current?.end === abandon) awaiting.current = null;
                resolve(ran);
              }),
          );
          // Replaced, or the caller's follow ended (a cancel, unlike its
          // timeout), already or later: its end is null, the step still held,
          // and nothing continues the action.
          if (latest.current !== id || cancelled?.aborted) end(null);
          else {
            leave.current = abandon;
            cancelled?.addEventListener("abort", abandon, { once: true });
            awaiting.current = {
              last: error.step === action.calls.length - 1,
              detached: heldStep(error),
              end: abandon,
            };
          }
          const finish = completing(error, action.calls.length, end);
          // Followed for a later settlement; one already there is read once it attaches.
          void follow(finish, () => end(null)).then(() => finish());
          const before = error.held?.hashes ?? [];
          return {
            status: "receipt",
            step: error.step,
            hash: error.hash,
            ...(error.held?.signatures
              ? { signatures: error.held.signatures }
              : {}),
            ended: () =>
              outcome.then(async (ran) => {
                if (!ran) return null;
                const { settled, receipt } = ran;
                if (settled.result !== "success") {
                  const line = settledLine(settled);
                  return {
                    status: "failed" as const,
                    error: line,
                    failure: new ReviewLineError(line),
                  };
                }
                const signatures = error.held?.signatures;
                if (error.step < action.calls.length - 1) {
                  const started = await runLatest.current({
                    ...action,
                    ...(onCancelled ? { onCancelled } : {}),
                    ...(onStopped ? { onStopped } : {}),
                  });
                  const next =
                    started?.status === "receipt"
                      ? await started.ended()
                      : started;
                  return next?.status === "done" &&
                    signatures &&
                    !next.signatures
                    ? { ...next, signatures }
                    : next;
                }
                return {
                  status: "done" as const,
                  hashes: [...before, settled.hash],
                  receipts: receipt ? [receipt] : [],
                  ...(signatures ? { signatures } : {}),
                };
              }),
          };
        }
        // A resume can complete a step the wallet sent before the reload.
        try {
          const after =
            action.scope === undefined || !deps?.account
              ? null
              : findReviewedSequence(action.scope, deps.account, {
                  storage: deps.storage,
                });
          if (
            after?.completed.length &&
            keyOf(after.calls.map(sent)) === keyOf(action.calls.map(sent))
          ) {
            sentAny = true;
            submit(after.completed.length - 1);
          }
        } catch {
          /* An unreadable sequence adds nothing to what this run saw. */
        }
        const cancelled =
          error instanceof TransactionReviewCancelledError ||
          isDefiniteWalletRejection(error);
        const line = cancelled ? null : errorLine(error);
        update({
          ...IDLE,
          lastSubmittedStep: submitted,
          error: line,
          failure: cancelled ? null : error,
        });
        // A cancel only once its hold is read and holds nothing: until the
        // wallet says, it is read again.
        const settle = () =>
          void follow().then((found) => {
            if (latest.current !== id || !mounted.current) return;
            if (found === null) setTimeout(settle, RECEIPT_RETRY_MS);
            else if (cancelled && !found) {
              const step = submitted ?? 0;
              update(sentAny ? { stopped: true } : { cancelled: true });
              const told = sentAny
                ? onStopped && (() => onStopped(step))
                : onCancelled;
              setCancelling(told ? { told } : null);
            }
          });
        settle();
        return line === null
          ? null
          : { status: "failed", error: line, failure: error };
      } finally {
        open.current -= 1;
      }
    },
  };
  runLatest.current = api.run;
  return api;
}
