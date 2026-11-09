import {
  checkedItLabel,
  SAVED_ATTEMPT_CONTINUE_ANYWAY_LABEL,
  SAVED_ATTEMPT_UNREADABLE_LINE,
  type SavedAttempt,
  type SavedAttemptOutcome,
  type SavedAttemptRecovery,
  type SavedAttemptRetirement,
  type WriteHoldClient,
} from "../index.js";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type UseSavedAttemptOptions<T> = {
  /** The app's one saved-attempt recovery (createSavedAttemptRecovery()). */
  recovery: SavedAttemptRecovery;
  /** The saved attempt; none while nothing is saved. */
  attempt: SavedAttempt<T> | null | undefined;
  /** Reads the attempt's chain. */
  client: WriteHoldClient | undefined;
  /** The check action's next step: "I checked it. <next>." ("Review it again" by default). */
  checkNext?: string;
  /**
   * Whether this attempt completes the flow: then only an authenticated
   * success clears it, and a proven revert does not. Otherwise a revert clears
   * it and a success leaves it for the app.
   */
  completion?: boolean;
  /**
   * Records a `done` outcome (the app's journal, its follow-up checks). True
   * retires the attempt as settled; false or a throw leaves it to be offered
   * again on the next outcome. Called once per outcome.
   */
  onDone?: (
    outcome: Extract<SavedAttemptOutcome<T>, { status: "done" }>,
  ) => Promise<boolean>;
  /** The attempt was retired by the user's exit or check, or by a wallet rejection. Called once per outcome. */
  onRetired?: (by: "exit" | "check" | "rejected") => void | Promise<void>;
  /** Recover again on this interval while the outcome can still change (not while held, nor while the page is hidden). */
  recheckMs?: number;
};

/** What a retirement returned: whether it took, and whether it outlives this tab. */
type Retired = Awaited<ReturnType<SavedAttemptRecovery["retire"]>>;

export type UseSavedAttemptResult<T> = {
  /** How recovery ended; null until it has, or with no attempt. */
  outcome: SavedAttemptOutcome<T> | null;
  recovering: boolean;
  /**
   * True when nothing saved stands in the way of a new send: no attempt, or
   * one recovered as `none`, or done in a way `completion` says is over.
   */
  clear: boolean;
  /** Recover again now: also "Check again" on a success whose details are unavailable. */
  recover: () => Promise<SavedAttemptOutcome<T> | null>;
  /** On `check`: the one explicit action, which retires the attempt for every tab and reload. */
  checkAction: {
    line: string;
    warning: string;
    label: string;
    run: () => Promise<Retired>;
  } | null;
  /**
   * Only after the check action came back `reason: "unreadable"` (the browser
   * has storage it can't read): the warned exit, "I checked my wallet.
   * Continue anyway", which retires in this tab alone if storage still can't
   * be read. Never a first option.
   */
  unreadableAction: {
    line: string;
    label: string;
    run: () => Promise<Retired>;
  } | null;
  /**
   * Retire after the user's exit or a followed settlement; recovers again.
   * Bound to the attempt it was rendered for: called after that attempt (or
   * its recovery or client) changed, it refuses before anything is saved.
   */
  retire: (reason: SavedAttemptRetirement) => Promise<Retired>;
};

const markOf = (value: unknown) =>
  JSON.stringify(value, (_, v) => (typeof v === "bigint" ? v.toString() : v));

const keyOf = (attempt: SavedAttempt<unknown> | null | undefined) =>
  attempt ? markOf({ ...attempt, authenticate: undefined }) : null;

function clearOf<T>(
  attempt: SavedAttempt<T> | null | undefined,
  outcome: SavedAttemptOutcome<T> | null,
  completion?: boolean,
): boolean {
  if (!attempt) return true;
  if (!outcome || outcome.status !== "done") return outcome?.status === "none";
  if (outcome.result === "failed") return !completion;
  return outcome.authenticated && completion === true;
}

/**
 * One saved attempt's recovery, the one way every app runs it: recovered
 * when it (or the client) appears, before the app prepares any new send, with
 * the check action ready on `check`. Every answer and callback belongs to the
 * attempt, recovery and client it started with: an earlier one's, or an older
 * request's, never reaches the current one.
 */
export function useSavedAttempt<T>(
  options: UseSavedAttemptOptions<T>,
): UseSavedAttemptResult<T> {
  const { recovery, client, checkNext, completion, recheckMs } = options;
  const callbacks = useRef(options);
  callbacks.current = options;
  const key = keyOf(options.attempt);
  const attempt = options.attempt;
  /** The attempt as last rendered: the same saved fields, with the app's newest callbacks. */
  const latest = useRef(attempt);
  latest.current = attempt;
  /** One lifecycle per attempt, recovery and client, with its latest request. */
  const lifecycle = useMemo(
    () => ({ attempt, recovery, client, request: 0 }),
    // The key stands for the attempt.
    [key, recovery, client],
  );
  type Lifecycle = typeof lifecycle;
  /** Whether `of` is the mounted hook's lifecycle now. */
  const current = (of: Lifecycle) => mounted.current && rendered.current === of;
  /**
   * The lifecycle last rendered: set during render, so a callback of an
   * earlier one is refused from the next commit's first layout effect on. A
   * render React then discards leaves the shown callbacks refused (fail
   * closed) until the next commit.
   */
  const rendered = useRef<Lifecycle | undefined>(undefined);
  rendered.current = lifecycle;
  /** Whether the hook is mounted: no callback or answer acts after unmount. */
  const mounted = useRef(false);
  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const [shown, setShown] = useState<{
    of?: Lifecycle;
    outcome: SavedAttemptOutcome<T> | null;
    recovering: boolean;
  }>({ outcome: null, recovering: false });
  /** The lifecycle whose check action last found storage unreadable. */
  const [unreadable, setUnreadable] = useState<Lifecycle | undefined>();

  const recover = useCallback(async () => {
    const { recovery, client } = lifecycle;
    const attempt = latest.current;
    if (!attempt || !client || !current(lifecycle)) return null;
    const request = ++lifecycle.request;
    setShown((now) => ({
      of: lifecycle,
      outcome: now.of === lifecycle ? now.outcome : null,
      recovering: true,
    }));
    const outcome = await recovery.recover(attempt, client);
    // Only the latest request of the mounted lifecycle shows.
    if (!current(lifecycle) || lifecycle.request !== request) return null;
    setShown({ of: lifecycle, outcome, recovering: false });
    return outcome;
  }, [lifecycle]);

  useEffect(() => {
    void recover();
  }, [recover]);

  /** Retires `attempt` of this lifecycle; only a current lifecycle shows what follows. */
  const retireOf = useCallback(
    async (
      attempt: SavedAttempt<T>,
      reason: SavedAttemptRetirement,
    ): Promise<Retired> => {
      const retired = await lifecycle.recovery.retire(attempt, reason);
      if (!current(lifecycle)) return retired;
      if (!retired.retired && retired.reason === "unreadable")
        setUnreadable(lifecycle);
      await recover();
      return retired;
    },
    [lifecycle, recover],
  );

  const retire = useCallback(
    async (reason: SavedAttemptRetirement): Promise<Retired> => {
      const attempt = latest.current;
      if (!attempt || !current(lifecycle)) return { retired: false };
      return retireOf(attempt, reason);
    },
    [lifecycle, retireOf],
  );

  const outcome = shown.of === lifecycle ? shown.outcome : null;

  /** The outcome last handed to onDone or onRetired, by value, so each is handed once. */
  const handed = useRef<string | null>(null);
  useEffect(() => {
    if (!outcome || (outcome.status !== "done" && outcome.status !== "none"))
      return;
    const mark = `${key}:${markOf(outcome)}`;
    if (handed.current === mark) return;
    const rearm = () => {
      if (handed.current === mark) handed.current = null;
    };
    const { onDone, onRetired } = callbacks.current;
    if (outcome.status === "done" && onDone) {
      handed.current = mark;
      const hash = outcome.hash;
      // Handed only while its attempt is still the hook's: a replacement's
      // never. The handed attempt is retired even if onDone cleared it.
      let handedAttempt: SavedAttempt<T> | null | undefined;
      void Promise.resolve()
        .then(() => {
          if (!current(lifecycle)) return false;
          handedAttempt = latest.current;
          return onDone(outcome);
        })
        .then(async (settled) => {
          // A retirement another tab's lock refused is offered again.
          if (
            !settled ||
            !handedAttempt ||
            !(
              await retireOf(handedAttempt, {
                by: "settled",
                ...(hash ? { hash } : {}),
              })
            ).retired
          )
            rearm();
        })
        .catch(rearm);
    } else if (
      outcome.status === "none" &&
      outcome.retired &&
      outcome.retired !== "settled" &&
      onRetired
    ) {
      handed.current = mark;
      const by = outcome.retired;
      void Promise.resolve()
        .then(() => (current(lifecycle) ? onRetired(by) : undefined))
        .catch(rearm);
    }
  }, [key, lifecycle, outcome, retireOf]);

  const status = outcome?.status;
  const recovering = shown.of === lifecycle && shown.recovering;
  const busy = useRef(recovering);
  busy.current = recovering;
  useEffect(() => {
    if (!recheckMs || !status || status === "held") return;
    // A slow recovery finishes before the next one starts.
    const timer = setInterval(() => {
      if (
        !busy.current &&
        (typeof document === "undefined" || !document.hidden)
      )
        void recover();
    }, recheckMs);
    return () => clearInterval(timer);
  }, [recheckMs, status, recover]);

  return {
    outcome,
    recovering,
    clear: clearOf(attempt, outcome, completion),
    recover,
    checkAction:
      outcome?.status === "check"
        ? {
            line: outcome.line,
            warning: outcome.warning,
            label: checkedItLabel(checkNext),
            run: () => retire({ by: "check", outcome }),
          }
        : null,
    unreadableAction:
      outcome?.status === "check" && unreadable === lifecycle
        ? {
            line: SAVED_ATTEMPT_UNREADABLE_LINE,
            label: SAVED_ATTEMPT_CONTINUE_ANYWAY_LABEL,
            run: () => retire({ by: "check", outcome, force: "unreadable" }),
          }
        : null,
    retire,
  };
}
