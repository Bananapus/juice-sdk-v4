import {
  checkedItLabel,
  type SavedAttempt,
  type SavedAttemptOutcome,
  type SavedAttemptRecovery,
  type SavedAttemptRetirement,
  type WriteHoldClient,
} from "@bananapus/nana-sdk-core/review";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type UseSavedAttemptOptions<T> = {
  /** The app's one saved-attempt recovery (createSavedAttemptRecovery()). */
  recovery: SavedAttemptRecovery;
  /** The saved attempt; none while nothing is saved. */
  attempt: SavedAttempt<T> | null | undefined;
  /** Reads the attempt's chain. */
  client: WriteHoldClient | undefined;
  /** The check action's next step: "I checked it. <next>." ("Review it again" by default). */
  checkNext?: string;
};

/** What a retirement returned: whether it took, and whether it outlives this tab. */
type Retired = Awaited<ReturnType<SavedAttemptRecovery["retire"]>>;

export type UseSavedAttemptResult<T> = {
  /** How recovery ended; null until it has, or with no attempt. */
  outcome: SavedAttemptOutcome<T> | null;
  recovering: boolean;
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
   * Retire after the user's exit or a followed settlement; recovers again.
   * Bound to the attempt it was rendered for: called after that attempt (or
   * its recovery or client) changed, it refuses before anything is saved.
   */
  retire: (reason: SavedAttemptRetirement) => Promise<Retired>;
};

const keyOf = (attempt: SavedAttempt<unknown> | null | undefined) =>
  attempt
    ? JSON.stringify({ ...attempt, authenticate: undefined }, (_, value) =>
        typeof value === "bigint" ? value.toString() : value,
      )
    : null;

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
  const { recovery, client, checkNext } = options;
  const key = keyOf(options.attempt);
  const attempt = options.attempt;
  /** One lifecycle per attempt, recovery and client, with its latest request. */
  const lifecycle = useMemo(
    () => ({ attempt, recovery, client, request: 0 }),
    // The key stands for the attempt.
    [key, recovery, client],
  );
  type Lifecycle = typeof lifecycle;
  /** The lifecycle mounted now; none between a cleanup and the next mount. */
  const active = useRef<Lifecycle | undefined>(undefined);
  const [shown, setShown] = useState<{
    of?: Lifecycle;
    outcome: SavedAttemptOutcome<T> | null;
    recovering: boolean;
  }>({ outcome: null, recovering: false });

  const recover = useCallback(async () => {
    const { attempt, recovery, client } = lifecycle;
    if (!attempt || !client || active.current !== lifecycle) return null;
    const request = ++lifecycle.request;
    setShown((now) => ({
      of: lifecycle,
      outcome: now.of === lifecycle ? now.outcome : null,
      recovering: true,
    }));
    const outcome = await recovery.recover(attempt, client);
    // Only the latest request of the mounted lifecycle shows.
    if (active.current !== lifecycle || lifecycle.request !== request)
      return null;
    setShown({ of: lifecycle, outcome, recovering: false });
    return outcome;
  }, [lifecycle]);

  useEffect(() => {
    active.current = lifecycle;
    void recover();
    return () => {
      if (active.current === lifecycle) active.current = undefined;
    };
  }, [lifecycle, recover]);

  const retire = useCallback(
    async (reason: SavedAttemptRetirement): Promise<Retired> => {
      const { attempt, recovery } = lifecycle;
      if (!attempt || active.current !== lifecycle) return { retired: false };
      const retired = await recovery.retire(attempt, reason);
      if (active.current === lifecycle) await recover();
      return retired;
    },
    [lifecycle, recover],
  );

  const outcome = shown.of === lifecycle ? shown.outcome : null;
  return {
    outcome,
    recovering: shown.of === lifecycle && shown.recovering,
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
    retire,
  };
}
