import {
  checkedItLabel,
  type SavedAttempt,
  type SavedAttemptOutcome,
  type SavedAttemptRecovery,
  type SavedAttemptRetirement,
  type WriteHoldClient,
} from "@bananapus/nana-sdk-core/review";
import { useCallback, useEffect, useRef, useState } from "react";

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

export type UseSavedAttemptResult<T> = {
  /** How recovery ended; null until it has, or with no attempt. */
  outcome: SavedAttemptOutcome<T> | null;
  recovering: boolean;
  /** Recover again now. */
  recover: () => Promise<SavedAttemptOutcome<T> | null>;
  /** On `check`: the one explicit action, which retires the attempt for every tab and reload. */
  checkAction: {
    line: string;
    warning: string;
    label: string;
    run: () => Promise<boolean>;
  } | null;
  /** Retire after the user's exit or a followed settlement; recovers again either way. */
  retire: (reason: SavedAttemptRetirement) => Promise<boolean>;
};

const keyOf = (attempt: SavedAttempt<unknown> | null | undefined) =>
  attempt
    ? JSON.stringify({ ...attempt, authenticate: undefined }, (_, value) =>
        typeof value === "bigint" ? value.toString() : value,
      )
    : null;

const same = (a: unknown[], b: unknown[]) =>
  a.length === b.length && a.every((part, index) => part === b[index]);

/**
 * One saved attempt's recovery, the one way every app runs it: recovered
 * when it (or the client) appears, before the app prepares any new send, with
 * the check action ready on `check`. Answers from an earlier attempt or client
 * never reach the current one.
 */
export function useSavedAttempt<T>(
  options: UseSavedAttemptOptions<T>,
): UseSavedAttemptResult<T> {
  const { recovery, client, checkNext } = options;
  const key = keyOf(options.attempt);
  const latest = useRef(options);
  latest.current = options;
  /** The lifecycle of the current attempt, recovery and client: a later one drops earlier answers. */
  const epoch = useRef(0);
  const [shown, setShown] = useState<{
    /** The attempt, recovery and client this answer is for. */
    of: unknown[];
    outcome: SavedAttemptOutcome<T> | null;
    recovering: boolean;
  }>({ of: [], outcome: null, recovering: false });
  const of = [key, recovery, client];

  const recover = useCallback(async () => {
    const own = epoch.current;
    const attempt = latest.current.attempt;
    if (!attempt || !client) return null;
    const now = [key, recovery, client];
    setShown((shown) => ({
      of: now,
      outcome: same(shown.of, now) ? shown.outcome : null,
      recovering: true,
    }));
    const outcome = await recovery.recover(attempt, client);
    if (epoch.current !== own) return null;
    setShown({ of: now, outcome, recovering: false });
    return outcome;
    // The key stands for the attempt.
  }, [recovery, client, key]);

  useEffect(() => {
    epoch.current += 1;
    void recover();
    return () => {
      epoch.current += 1;
    };
  }, [recover]);

  const retire = useCallback(
    async (reason: SavedAttemptRetirement) => {
      const attempt = latest.current.attempt;
      const own = epoch.current;
      const retired = attempt ? await recovery.retire(attempt, reason) : false;
      if (epoch.current === own) await recover();
      return retired;
    },
    [recovery, recover],
  );

  // Only an answer for what is rendered now: never an earlier attempt's, even for one render.
  const current = same(shown.of, of);
  const outcome = current ? shown.outcome : null;
  return {
    outcome,
    recovering: current && shown.recovering,
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
