import type { Address, Hex } from "viem";
import {
  SAVED_ATTEMPT_CHECK_LINE,
  SAVED_ATTEMPT_CHECK_WARNING,
} from "./messages.js";
import type {
  WriteHeldState,
  WriteHold,
  WriteHoldClient,
  WriteHoldHandle,
  WriteHoldState,
} from "./writeHold.js";
import {
  createBrowserWriteRecovery,
  createHeldWriteStorage,
  type HeldWriteStorage,
  type ReviewedWriteRecoveryInput,
} from "./writeRecovery.js";

/** What the app's domain check says of one transaction (or, given none, of a search for the attempt). */
export type SavedAttemptProof<T> =
  /** The chain shows this attempt ran, with the app's result (a project ID, a launch). */
  | { result: "proven"; value: T }
  /** The transaction is some other write. */
  | { result: "not-this"; reason?: string }
  /** It couldn't be read or shown. */
  | { result: "unknown"; reason?: string };

/** Where a saved attempt was held, and what the app saved of it. Only what was saved: nothing fresh. */
export type SavedAttemptScope = {
  chainId: number;
  /** The account that sent it: the wallet, or the Safe. */
  account: Address;
  /** Whether `account` is a Safe; a saved `safeTxHash` says so too. */
  safe?: boolean;
  /** Every intent namespace the attempt may be held under, the current one first, legacy ones after. */
  namespaces: readonly string[];
  /** The exact saved call, when kept: a saved hash is adopted into the hold against it. */
  call?: ReviewedWriteRecoveryInput["call"];
  saved?: {
    /** The app's send began: the wallet may have opened. */
    started?: boolean;
    /** The transaction hash the wallet returned. */
    hash?: Hex;
    /** The Safe proposal the wallet returned. */
    safeTxHash?: Hex;
    /** That proposal's Safe nonce, when saved. */
    safeNonce?: number;
    /** The account's next nonce before the wallet opened, with the block it was read at. */
    nonce?: number | bigint;
    sentNonce?: number | bigint;
    fromBlock?: bigint;
    /** When the wallet returned the hash, in milliseconds since the epoch. */
    submittedAt?: number;
    /** Settlements already shown before this attempt began: never this attempt's. */
    before?: readonly Hex[];
  };
};

/** A saved attempt with the app's domain check of a transaction (or, given none, its search for the attempt). */
export type SavedAttempt<T> = SavedAttemptScope & {
  authenticate(hash: Hex | undefined): Promise<SavedAttemptProof<T>>;
};

/** Why an attempt is retired: the only three things that retire one. */
export type SavedAttemptRetirement =
  /** The user's exit released the hold. */
  | { by: "exit" }
  /** The user's "I checked it. ..." on exactly this check outcome. */
  | { by: "check"; outcome: SavedAttemptCheck }
  /** The app followed and recorded this settlement. */
  | { by: "settled"; hash?: Hex };

export type SavedAttemptCheck = {
  status: "check";
  /** What couldn't be shown, for logs and details. */
  reason: string;
  line: string;
  warning: string;
  /** The hold evidence this check evaluated: the user's check retires exactly this. */
  evidence: string;
};

/**
 * How recovering a saved attempt ended, the one rule every app follows
 * before any send or discard:
 * - `held`: the hold still holds the write. Count nothing; show `state`, and
 *   its exit when due (through `handle`);
 * - `done`: `success` ran. `authenticated: true` when the app's check showed
 *   it as this attempt (`value`); `false` when the hold settled it but the
 *   app's details are unavailable (`reason`): record its `hash` and follow it,
 *   with "Check again" (recover again) as its only action. Either way, never
 *   send it again; only `retire({ by: "settled" })` retires it. `failed` is
 *   the hold's proven revert of it;
 * - `check`: it can't be shown. One explicit action, "I checked it. ...",
 *   and only that, retires it (`retire({ by: "check", outcome })`);
 * - `none`: the hold proves nothing was reserved and nothing saved says it
 *   was sent, or the attempt was retired (`retired`): by the user or a
 *   followed settlement, or by the SDK itself when it dropped every
 *   reservation of it on a definite wallet rejection or an abort before the
 *   wallet opened (`"rejected"`: nothing can have been sent).
 */
export type SavedAttemptOutcome<T> =
  | { status: "held"; state: WriteHeldState; handle: WriteHoldHandle }
  | {
      status: "done";
      result: "success";
      authenticated: true;
      hash?: Hex;
      value: T;
    }
  | {
      status: "done";
      result: "success";
      authenticated: false;
      hash: Hex;
      reason: string;
    }
  | { status: "done"; result: "failed"; hash: Hex }
  | SavedAttemptCheck
  | { status: "none"; retired?: SavedAttemptRetirement["by"] | "rejected" };

/** A call stand-in for an attempt saved without its call: the namespace finds the hold. */
const NO_CALL = {
  to: "0x0000000000000000000000000000000000000000" as Address,
  data: "0x" as Hex,
};
const RETIRED_PREFIX = "nana-sdk:saved-attempt:retired:";
/** How many times a check the hold moved under is evaluated again. */
const PASSES = 3;

const lower = (hash?: Hex) => hash?.toLowerCase() as Hex | undefined;
const reasonOf = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

/**
 * Saved-attempt recovery over the app's write hold, framework-free: every
 * app's launches, linked plans, shop updates and other saved writes recover
 * the same way. Pass the hold's own `storage` and `locks` when it was made
 * with custom ones; the defaults are the hold's defaults.
 *
 * - Recovery needs only what was saved: run it right after a saved attempt is
 *   found, before any fresh-send preparation.
 * - Absence of evidence is `check`, never `none`: a missing hold record, a
 *   refused or unreadable adoption, an empty search and every exception.
 * - A settled success always wins: it is never downgraded by a later failed
 *   or empty read, and it blocks discard until followed.
 * - Only the user's exit, the user's check action, a followed settlement and
 *   the SDK's own drop of a rejected reservation retire an attempt, persisted under the hold's locks for every tab and
 *   reload, and only for the hold evidence they saw.
 */
export function createSavedAttemptRecovery(options: {
  hold: WriteHold;
  storage?: HeldWriteStorage;
  locks?: Pick<LockManager, "request">;
}) {
  const { hold, locks } = options;
  const storage = options.storage ?? createHeldWriteStorage();

  function inputOf(attempt: SavedAttemptScope, namespace: string) {
    return {
      chainId: attempt.chainId,
      account: attempt.account,
      safe: attempt.safe ?? !!attempt.saved?.safeTxHash,
      namespace,
      call: attempt.call ?? NO_CALL,
    };
  }
  function handlesOf(attempt: SavedAttemptScope): WriteHoldHandle[] {
    if (!attempt.namespaces.length)
      throw new Error("A saved attempt names at least one namespace.");
    return attempt.namespaces.map((namespace) =>
      hold.open(inputOf(attempt, namespace)),
    );
  }
  const retiredKey = (attempt: SavedAttemptScope) =>
    `${RETIRED_PREFIX}${JSON.stringify([attempt.chainId, attempt.account.toLowerCase(), attempt.namespaces])}`;
  /** What the hold shows of the attempt now, from storage: what a retirement is bound to. */
  function evidenceOf(attempt: SavedAttemptScope, states: WriteHoldState[]) {
    return JSON.stringify({
      saved: lower(attempt.saved?.hash ?? attempt.saved?.safeTxHash) ?? null,
      holds: states.map((state, index) => [
        attempt.namespaces[index],
        state.reservation ?? null,
        state.status,
        state.status === "clear" && state.settled && "hash" in state.settled
          ? state.settled.hash.toLowerCase()
          : null,
      ]),
    });
  }
  function retirementOf(
    attempt: SavedAttemptScope,
    evidence: string,
  ): SavedAttemptRetirement["by"] | undefined {
    const saved = JSON.parse(
      storage.getItem(retiredKey(attempt)) ?? "null",
    ) as {
      by?: SavedAttemptRetirement["by"];
      evidence?: string;
    } | null;
    return saved?.evidence === evidence ? saved.by : undefined;
  }
  /** Successes and failures the hold settled for this attempt (never one from before it). */
  function settlementsOf(attempt: SavedAttemptScope, states: WriteHoldState[]) {
    const before = new Set((attempt.saved?.before ?? []).map(lower));
    const success: Hex[] = [];
    const failed: Hex[] = [];
    for (const state of states) {
      if (state.status !== "clear" || !state.settled) continue;
      if (!("hash" in state.settled)) continue;
      const hash = lower(state.settled.hash)!;
      if (before.has(hash)) continue;
      (state.settled.result === "success" ? success : failed).push(hash);
    }
    return { success, failed };
  }

  function check(reason: string, evidence: string): SavedAttemptCheck {
    return {
      status: "check",
      reason,
      line: SAVED_ATTEMPT_CHECK_LINE,
      warning: SAVED_ATTEMPT_CHECK_WARNING,
      evidence,
    };
  }
  /** The evidence the hold shows now, or "" (no check on it can be retired) when unreadable. */
  function evidenceNow(attempt: SavedAttemptScope, handles: WriteHoldHandle[]) {
    try {
      return evidenceOf(
        attempt,
        handles.map((handle) => handle.peek()),
      );
    } catch {
      return "";
    }
  }

  /**
   * Recover one saved attempt: exactly one outcome, never a throw. Its
   * inputs are only what was saved, so call it before preparing any new send.
   */
  async function recover<T>(
    attempt: SavedAttempt<T>,
    client: WriteHoldClient,
  ): Promise<SavedAttemptOutcome<T>> {
    let outcome = await pass(attempt, client);
    // A check the hold moved under (a settlement landed while the app's check
    // ran) is evaluated again; one that keeps moving stays bound to what it saw.
    for (
      let again = 0;
      again < PASSES - 1 && outcome.status === "check";
      again++
    ) {
      let handles: WriteHoldHandle[];
      try {
        handles = handlesOf(attempt);
      } catch {
        break;
      }
      if (evidenceNow(attempt, handles) === outcome.evidence) break;
      outcome = await pass(attempt, client);
    }
    return outcome;
  }

  async function pass<T>(
    attempt: SavedAttempt<T>,
    client: WriteHoldClient,
  ): Promise<SavedAttemptOutcome<T>> {
    let evidence = "";
    const reasons: string[] = [];
    const prove = async (hash: Hex | undefined) => {
      try {
        const proof = await attempt.authenticate(hash);
        if (proof?.result === "proven") return proof;
        reasons.push(
          proof?.reason ??
            (proof?.result === "not-this"
              ? "Its transaction is another write."
              : "Its transaction could not be shown here."),
        );
      } catch (error) {
        reasons.push(reasonOf(error));
      }
      return undefined;
    };
    /** A settled success wins: shown as this attempt, or else followed by its hash alone; never a check. */
    const followed = async (
      states: WriteHoldState[],
    ): Promise<SavedAttemptOutcome<T> | undefined> => {
      const { success, failed } = settlementsOf(attempt, states);
      for (const hash of success) {
        const proof = await prove(hash);
        if (proof)
          return {
            status: "done",
            result: "success",
            authenticated: true,
            hash,
            value: proof.value,
          };
      }
      if (success.length) {
        const saved = lower(attempt.saved?.hash);
        const proof =
          saved && !success.includes(saved) ? await prove(saved) : undefined;
        if (proof)
          return {
            status: "done",
            result: "success",
            authenticated: true,
            hash: saved,
            value: proof.value,
          };
        return {
          status: "done",
          result: "success",
          authenticated: false,
          hash: success[0],
          reason: reasons.join(" "),
        };
      }
      if (failed.length)
        return { status: "done", result: "failed", hash: failed[0] };
      return undefined;
    };
    try {
      const handles = handlesOf(attempt);
      const states: WriteHoldState[] = [];
      for (const handle of handles) {
        const state = await handle.state(client).catch(() => handle.peek());
        if (state.status !== "clear") return { status: "held", state, handle };
        states.push(state);
      }
      evidence = evidenceNow(attempt, handles);
      const retired = retirementOf(attempt, evidence);
      if (
        retired &&
        (retired === "settled" ||
          !settlementsOf(attempt, states).success.length)
      )
        return { status: "none", retired };
      const settled = await followed(states);
      if (settled) return settled;

      const saved = attempt.saved ?? {};
      const identity = saved.safeTxHash ?? saved.hash;
      if (!identity) {
        // Nothing reserved, with nothing saved of a send; or every reservation
        // dropped on a definite rejection (or an abort before the wallet opened).
        if (
          !saved.started &&
          hold.durable() &&
          states.every((state) => state.reservation === undefined)
        )
          return { status: "none" };
        // A reservation id names one attempt wherever it is mirrored: a
        // rejection saved at any of its keys covers them all.
        const rejected = new Set(
          attempt.namespaces.map((namespace) =>
            createBrowserWriteRecovery(inputOf(attempt, namespace), {
              storage,
              locks,
            }).rejectedReservation(),
          ),
        );
        if (
          states.some((state) => state.reservation !== undefined) &&
          states.every(
            (state) =>
              state.reservation === undefined ||
              rejected.has(state.reservation),
          )
        )
          return { status: "none", retired: "rejected" };
      }

      if (identity && attempt.call) {
        // A saved hash the hold doesn't know: adopted against the exact call.
        const adopted = await handles[0].adopt(
          states[0],
          {
            ...(saved.safeTxHash
              ? { safe: { safeTxHash: saved.safeTxHash } }
              : { hash: saved.hash }),
            nonce: saved.nonce,
            sentNonce: saved.sentNonce,
            fromBlock: saved.fromBlock,
            submittedAt: saved.submittedAt,
          },
          client,
        );
        let state: WriteHoldState = adopted;
        const declined = "declined" in adopted ? adopted.declined : undefined;
        if (declined)
          reasons.push(
            declined === "refused"
              ? "Its saved transaction is not this write."
              : "Its saved transaction could not be read.",
          );
        if (
          saved.safeTxHash &&
          saved.safeNonce !== undefined &&
          state.status !== "clear"
        )
          state = await handles[0].attachSafeNonce(client, {
            safeTxHash: saved.safeTxHash,
            nonce: saved.safeNonce,
          });
        if (state.status !== "clear")
          return { status: "held", state, handle: handles[0] };
        const after = await followed([state]);
        if (after) return after;
      }

      // No hold evidence: the app's own search of the saved transaction (or of the attempt).
      const proof = await prove(saved.hash);
      if (proof)
        return {
          status: "done",
          result: "success",
          authenticated: true,
          ...(saved.hash ? { hash: saved.hash } : {}),
          value: proof.value,
        };
      return check(reasons.join(" "), evidence);
    } catch (error) {
      return check([...reasons, reasonOf(error)].join(" "), evidence);
    }
  }

  /** Under every namespace key's hold lock, in one order, never waiting on a busy one. */
  async function underLocks<R>(
    attempt: SavedAttemptScope,
    work: () => Promise<R>,
  ): Promise<R> {
    const journals = attempt.namespaces
      .map((namespace) =>
        createBrowserWriteRecovery(inputOf(attempt, namespace), {
          storage,
          locks,
        }),
      )
      .sort((a, b) => (a.scopeKey < b.scopeKey ? -1 : 1));
    const run = (index: number): Promise<R> =>
      index === journals.length
        ? work()
        : journals[index].withLock(() => run(index + 1));
    return run(0);
  }

  /**
   * Retire a saved attempt for every tab and reload: the user's exit (once
   * the hold released it), the user's check action on the exact outcome they
   * saw, or a settlement the app followed and recorded. Refused
   * (`retired: false`) while anything holds it, while the hold changed since
   * the check was shown, while an unfollowed success shows (only `settled`
   * retires one), or while a lock is busy: recover again. `durable: false`
   * says it lasts in this tab alone (holds kept only in its memory); the app
   * decides whether to say so.
   */
  async function retire(
    attempt: SavedAttemptScope,
    reason: SavedAttemptRetirement,
  ): Promise<{ retired: false } | { retired: true; durable: boolean }> {
    let settled: { handle: WriteHoldHandle; state: WriteHoldState }[] = [];
    try {
      const handles = handlesOf(attempt);
      const done = await underLocks(attempt, async () => {
        const states = handles.map((handle) => handle.peek());
        if (states.some((state) => state.status !== "clear")) return false;
        const evidence = evidenceOf(attempt, states);
        if (reason.by === "check" && reason.outcome.evidence !== evidence)
          return false;
        if (
          reason.by !== "settled" &&
          settlementsOf(attempt, states).success.length
        )
          return false;
        const key = retiredKey(attempt);
        const value = JSON.stringify({
          by: reason.by,
          evidence,
          ...(reason.by === "settled" && reason.hash
            ? { hash: lower(reason.hash) }
            : {}),
        });
        storage.setItem(key, value);
        if (storage.getItem(key) !== value) return false;
        settled = states.flatMap((state, index) =>
          reason.by === "settled" &&
          state.status === "clear" &&
          state.settled &&
          "hash" in state.settled &&
          !state.settled.acknowledged &&
          (!reason.hash || lower(state.settled.hash) === lower(reason.hash))
            ? [{ handle: handles[index], state }]
            : [],
        );
        return true;
      });
      // A followed success no longer blocks a send (outside the lock its acknowledgement takes).
      for (const { handle, state } of settled)
        if (
          state.status === "clear" &&
          state.settled &&
          "hash" in state.settled
        )
          await handle.acknowledge(state.settled).catch(() => undefined);
      return done
        ? { retired: true, durable: storage.durable() }
        : { retired: false };
    } catch {
      return { retired: false };
    }
  }

  /**
   * Whether the app may delete its saved attempt now, from storage alone:
   * never while the hold holds it, or while a success it settled hasn't been
   * followed (retired). Unreadable reads as no.
   */
  function canDiscard(attempt: SavedAttemptScope): boolean {
    try {
      const states = handlesOf(attempt).map((handle) => handle.peek());
      if (states.some((state) => state.status !== "clear")) return false;
      const unfollowed = settlementsOf(attempt, states).success.length > 0;
      const retired = retirementOf(attempt, evidenceOf(attempt, states));
      return unfollowed ? retired === "settled" : true;
    } catch {
      return false;
    }
  }

  return { recover, retire, canDiscard };
}

export type SavedAttemptRecovery = ReturnType<
  typeof createSavedAttemptRecovery
>;
