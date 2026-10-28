import { ReviewLineError } from "./lineError.js";
import type { Hex, TransactionReceipt } from "viem";
import { heldReceipt, tell } from "./receipt.js";
import {
  hasSafeService,
  SAFE_PROPOSAL_AWAITING,
  waitForSafeExecutionHash,
} from "../safeService.js";
import {
  HELD_AWAY_SUCCESS_LINE,
  HELD_CONFIRMING_LINE,
  HELD_EXPIRED_LINE,
  HELD_RELEASED_ELSEWHERE_LINE,
  HELD_RELEASED_LINE,
  HELD_SUCCESS_LINE,
  WRITE_HOLD_MINED_LINE,
  WRITE_HOLD_PENDING_LINE,
  HELD_FAILED_LINE,
} from "./messages.js";
import {
  WriteHeldError,
  type WriteHoldClient,
  type WriteHoldGate,
  type WriteHoldHandle,
  type WriteHoldSettled,
  type WriteHoldState,
} from "./writeHold.js";

/**
 * Where one held write stands, for the one way every app shows it:
 *
 * - `clear`: nothing held (a failure or expiry from an earlier visit is in
 *   `settled`);
 * - `succeeded`: a success the hold settled while the user was away: every
 *   send refuses until they acknowledge it (`acknowledge`, "Send it again"),
 *   since sending again may pay twice;
 * - `awaiting`: a Safe proposal waiting for its signers;
 * - `confirming`: sent, being confirmed; once a write is confirming it never
 *   goes back to awaiting;
 * - `held`: held with the hold's own line (its exit when `exit`);
 * - `settled`: the hold settled what this view saw held, on authenticated
 *   evidence;
 * - `released`: the user's exit released it (`releasedBy: "user"`), or another
 *   window did (`"other-tab"`, neutral copy).
 */
export type HeldWritePhase =
  | "clear"
  | "succeeded"
  | "awaiting"
  | "confirming"
  | "held"
  | "settled"
  | "released";

export type HeldWriteView = {
  phase: HeldWritePhase;
  /** The last hold state this view accepted. */
  state: WriteHoldState | null;
  /** The one line to show, or null. */
  line: string | null;
  /** A second line for an exit that can run the write twice. */
  warning?: string;
  /** While holds last only in this tab. */
  notice?: string;
  /** Whether the gated hold offers its exit right now. */
  exit: boolean;
  settled?: WriteHoldSettled;
  releasedBy?: "user" | "other-tab";
  /** A previous deploy's record is being moved into the hold: sends wait. */
  adopting: boolean;
};

/** What a previous deploy saved of a write: the evidence `hold.adopt` takes. */
export type HeldWriteEvidence = NonNullable<
  Parameters<WriteHoldHandle["adopt"]>[1]
>;

/** How often a held write is asked again: 30 s by default, kept between 15 s and 60 s. */
export const HELD_POLL_MS = 30_000;
const MIN_POLL_MS = 15_000;
const MAX_POLL_MS = 60_000;
/** A follower's first looks, a few seconds apart, before it slows to the poll. */
const FAST_MS = 4_000;
const FAST_LOOKS = 15;
/** How long a settled step waits before its completion reads its receipt again. */
export const RECEIPT_RETRY_MS = 4_000;

/** How long a sent step still confirming is followed before it is handed back. */
export const FOLLOW_MS = 120_000;
/** A direct write's confirming line gives way to the wallet's pending line after this long. */
const CONFIRMING_MS = 120_000;

const pollOf = (ms?: number) =>
  Math.min(MAX_POLL_MS, Math.max(MIN_POLL_MS, ms ?? HELD_POLL_MS));

function pause(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(done, ms);
    signal.addEventListener("abort", done, { once: true });
    function done() {
      clearTimeout(timer);
      signal.removeEventListener("abort", done);
      resolve();
    }
  });
}

/**
 * Follow one held write to its end, whatever becomes of the flow that sent
 * it: a direct transaction by its hold's own reads, a Safe proposal also by
 * Safe's service, whose execution goes to the hold (`onExecuted`) and whose
 * loss ends it unproven (`onUnproven`). It ends only when the hold is clear
 * (an authenticated settlement or an exit) or `signal` aborts: never on its
 * own reading of a receipt, a replacement or an expiry. The hold decides.
 */
export async function followHeldWrite(
  handle: WriteHoldHandle,
  client: WriteHoldClient,
  {
    signal,
    pollMs,
    fastMs = FAST_MS,
    onRead,
  }: {
    signal: AbortSignal;
    pollMs?: number;
    fastMs?: number;
    /** Each read of the hold as it starts, while it holds the call's lock. */
    onRead?: (read: Promise<unknown>) => void;
  },
): Promise<WriteHoldState | null> {
  const now = handle.peek();
  if (
    now.status !== "clear" &&
    now.record.safe &&
    now.record.hash &&
    !now.record.executed &&
    hasSafeService(now.record.chainId)
  ) {
    const proposal = now.record.hash;
    void waitForSafeExecutionHash(now.record.chainId, proposal, {
      signal,
      client: client as never,
    })
      .then(
        (execution) => handle.onExecuted(client, execution),
        () => (signal.aborted ? null : handle.onUnproven(client, proposal)),
      )
      .catch(() => null);
  }
  for (let look = 0; !signal.aborted; look += 1) {
    const read = handle.state(client).catch(() => null);
    onRead?.(read);
    const state = await read;
    if (state?.status === "clear") return state;
    await pause(look < FAST_LOOKS ? fastMs : pollOf(pollMs), signal);
  }
  return null;
}

/** Reservations seen confirming in this tab: a new view of one never shows it awaiting. */
const confirmed = new Set<string>();

/** One follower per reservation in this tab, however many views show it. */
const followers = new Map<
  string,
  {
    views: number;
    stop: AbortController;
    ended: Promise<WriteHoldState | null>;
    /** Its read under way, if any: a send of a view it follows for waits for it. */
    reads: Set<Promise<unknown>>;
  }
>();

function followShared(
  reservation: string,
  handle: WriteHoldHandle,
  client: WriteHoldClient,
  pollMs: number | undefined,
): {
  ended: Promise<WriteHoldState | null>;
  leave: () => void;
  reads: Set<Promise<unknown>>;
} {
  let shared = followers.get(reservation);
  // A follower stopped by its last view, still ending, is never rejoined.
  if (!shared || shared.stop.signal.aborted) {
    const stop = new AbortController();
    const reads = new Set<Promise<unknown>>();
    const ended = followHeldWrite(handle, client, {
      signal: stop.signal,
      pollMs,
      onRead(read) {
        reads.add(read);
        void read.finally(() => reads.delete(read));
      },
    }).finally(() => {
      if (followers.get(reservation)?.stop === stop)
        followers.delete(reservation);
    });
    shared = { views: 0, stop, ended, reads };
    followers.set(reservation, shared);
  }
  shared.views += 1;
  const joined = shared;
  return {
    ended: joined.ended,
    reads: joined.reads,
    leave() {
      joined.views -= 1;
      if (joined.views === 0) joined.stop.abort();
    },
  };
}

/**
 * Whether `next` would hide an exit `shown` offers without the chain having
 * been checked: an emission, a replay or a contended read
 * (`checked: false`). Only a checked answer removes it.
 */
export function hidesShownExit(
  shown: WriteHoldState | null | undefined,
  next: WriteHoldState,
): boolean {
  return (
    !!shown &&
    shown.status !== "clear" &&
    shown.exit &&
    next.status !== "clear" &&
    !next.exit &&
    next.checked !== true
  );
}

/** The line for a settlement. */
export function settledLine(settled: WriteHoldSettled): string {
  return settled.result === "success"
    ? HELD_SUCCESS_LINE
    : settled.result === "expired"
      ? HELD_EXPIRED_LINE
      : HELD_FAILED_LINE;
}

/**
 * One held write's view, framework-free: its phase and line, the watch
 * (the hold's own events, and a checked read on start, after each send, on
 * focus and every poll while held), a shared follower for its hash, its
 * exit, its send and the adoption of a previous deploy's record. Every app
 * binds the same one (useHeldWrite in React), so the same action behaves the
 * same everywhere.
 *
 * - A read the chain didn't check never hides an exit already shown.
 * - Once confirming, a write never goes back to awaiting.
 * - `onSettled` fires once, only for a settlement of what this view saw held.
 * - A hold released without a settlement is `released`: by the user's exit
 *   here, or neutrally by another window.
 */
export function createHeldWriteView(
  handle: WriteHoldHandle,
  options: {
    client: WriteHoldClient;
    pollMs?: number;
    /** Follow a held hash to its end (default true). */
    follow?: boolean;
    onSettled?: (
      settled: WriteHoldSettled,
      receipt: TransactionReceipt | null,
    ) => void;
    onReleased?: (by: "user" | "other-tab") => void;
    /** A previous deploy's saved evidence of this write, if any: adopted before any send. */
    adopt?: () => Promise<HeldWriteEvidence | null | undefined>;
    /** The state the hold took the adopted record into (held, or settled). */
    onAdopted?: (state: WriteHoldState) => void;
  },
) {
  const { client } = options;
  let view: HeldWriteView = {
    phase: "clear",
    state: null,
    line: null,
    exit: false,
    adopting: !!options.adopt,
  };
  const listeners = new Set<() => void>();
  /** The reservation this view saw held, and whether its exit here released it. */
  let observed: string | undefined;
  let wasHeld = false;
  let exitedHere: string | undefined;
  /** The reservation this view's own send withdrew before the wallet: never another window's release. */
  let withdrawn: string | undefined;
  /**
   * The user's exit asking the hold, shared by every concurrent call: a
   * release seen meanwhile waits for its answer.
   */
  let exiting: Promise<boolean> | undefined;
  const delivered = new Set<string>();
  /** Every reservation this view saw held and hasn't delivered: each is delivered once, whatever is shown. */
  const seen = new Set<string>();
  let following:
    | {
        reservation: string;
        leave: () => void;
        reads: Set<Promise<unknown>>;
      }
    | undefined;
  let running = false;
  /** Each start and stop begins a new lifecycle: a read or receipt from an earlier one is dropped. */
  let epoch = 0;
  let live = true;
  let adoption: Promise<boolean> | undefined;

  function set(next: Partial<HeldWriteView>) {
    view = { ...view, ...next };
    for (const listener of listeners) listener();
  }

  function stopFollowing() {
    following?.leave();
    following = undefined;
  }

  function follow(reservation: string) {
    if (
      options.follow === false ||
      !running ||
      following?.reservation === reservation
    )
      return;
    stopFollowing();
    const shared = followShared(reservation, handle, client, options.pollMs);
    const mine = { reservation, leave: shared.leave, reads: shared.reads };
    following = mine;
    const at = epoch;
    void shared.ended.then((end) => {
      if (following === mine) following = undefined;
      if (end && at === epoch) apply(end);
    });
  }

  /** Settlements this view saw, still to tell the app, by reservation: kept across a restart. */
  const undelivered = new Map<string, WriteHoldSettled>();

  /**
   * Tell the app of a settlement it saw held, once, while live: a lifecycle
   * change before then leaves it to the next start. The view never
   * acknowledges a success: only the app's checked completion does, so
   * until then every send stays gated. A view without `onSettled` (a
   * watcher) tells no one: the gate keeps it, shown as `succeeded`, until
   * the user acts.
   */
  function deliver(settled: WriteHoldSettled, key: string) {
    undelivered.set(key, settled);
    if (!live) return;
    const at = epoch;
    const done = (receipt: TransactionReceipt | null) => {
      if (at !== epoch || delivered.has(key)) return;
      delivered.add(key);
      undelivered.delete(key);
      const shown = !!options.onSettled;
      if (shown && "hash" in settled) told.add(settled.hash.toLowerCase());
      // A send under way never saw it: it blocks that send, acknowledged or not.
      if (settled.result === "success")
        for (const during of sending) during.add(key);
      void tell(options.onSettled, settled, receipt);
      present();
    };
    if (!options.onSettled || !("hash" in settled)) {
      done(null);
      return;
    }
    // The receipt the hold verified, never another block's.
    void heldReceipt(settled, client).then(
      (receipt) => done(receipt),
      () => done(null),
    );
  }

  /** The phase and line a held state shows, monotonic once confirming. */
  function heldView(next: Exclude<WriteHoldState, { status: "clear" }>) {
    // A held state's reservation is its record's id.
    const reservation = next.record.id;
    const record = next.record;
    if (
      next.status === "ran-executed" ||
      (record.safe &&
        (record.executed ||
          record.executionHash !== undefined ||
          (record.candidates?.length ?? 0) > 0))
    )
      confirmed.add(reservation);
    const base = {
      state: next,
      exit: next.exit,
      warning: "warning" in next ? next.warning : undefined,
      notice: next.notice,
      settled: undefined,
      releasedBy: undefined,
    };
    if (next.exit) return { ...base, phase: "held" as const, line: next.line };
    if (next.status === "ran-executed")
      return {
        ...base,
        phase: "confirming" as const,
        line: HELD_CONFIRMING_LINE,
      };
    if (next.status === "pending-known-hash") {
      if (record.safe)
        return confirmed.has(reservation)
          ? {
              ...base,
              phase: "confirming" as const,
              line: HELD_CONFIRMING_LINE,
            }
          : {
              ...base,
              phase: "awaiting" as const,
              line: SAFE_PROPOSAL_AWAITING,
            };
      // A direct write: confirming, pending or mined with its result unread,
      // until it has waited a while.
      const since = Number(record.submittedAt ?? record.firstSeenAt);
      const line =
        (next.line === WRITE_HOLD_PENDING_LINE ||
          next.line === WRITE_HOLD_MINED_LINE) &&
        !(Date.now() - since >= CONFIRMING_MS)
          ? HELD_CONFIRMING_LINE
          : next.line;
      return { ...base, phase: "confirming" as const, line };
    }
    return { ...base, phase: "held" as const, line: next.line };
  }

  /** Take a hold state, through the one guard every source goes through. */
  function apply(next: WriteHoldState | null | undefined) {
    if (!next || hidesShownExit(view.state, next)) return;
    if (next.status === "clear") {
      const reservation = next.reservation;
      const mine = wasHeld && (!reservation || reservation === observed);
      // Whose release it is, only the exit's answer says.
      if (exiting && mine && !next.settled) return;
      stopFollowing();
      if (next.settled && mine) {
        seen.delete(observed!);
        deliver(next.settled, observed!);
        set({
          phase: "settled",
          state: next,
          line: settledLine(next.settled),
          warning: undefined,
          notice: undefined,
          exit: false,
          settled: next.settled,
          releasedBy: undefined,
        });
      } else if (mine && withdrawn !== observed) {
        const by = exitedHere === observed ? "user" : "other-tab";
        set({
          phase: "released",
          state: next,
          line:
            by === "user" ? HELD_RELEASED_LINE : HELD_RELEASED_ELSEWHERE_LINE,
          warning: undefined,
          notice: undefined,
          exit: false,
          settled: undefined,
          releasedBy: by,
        });
        options.onReleased?.(by);
      } else if (view.phase === "settled" || view.phase === "released") {
        // Already shown: kept, unless the gate below has another success.
      } else
        set({
          phase: "clear",
          state: next,
          line: null,
          warning: undefined,
          notice: undefined,
          exit: false,
          settled: next.settled,
        });
      if (mine) seen.delete(observed!);
      wasHeld = false;
      observed = undefined;
      exitedHere = undefined;
      withdrawn = undefined;
      collect();
      present();
      return;
    }
    const reservation = next.record.id;
    if (observed !== reservation) {
      observed = reservation;
      exitedHere = undefined;
      withdrawn = undefined;
    }
    wasHeld = true;
    seen.add(reservation);
    set(heldView(next));
    if (next.record.hash) follow(reservation);
    collect();
  }

  /** Deliver the settlement of every other reservation this view saw held. */
  function collect() {
    for (const reservation of [...seen]) {
      if (reservation === observed) continue;
      const settled = handle.settlementOf(reservation);
      if (!settled) continue;
      seen.delete(reservation);
      deliver(settled, reservation);
    }
  }

  /**
   * The send gate, from current evidence alone: any unacknowledged success
   * of the intent or an eligible legacy hold, told or not, or any success
   * delivered `during` the send. It holds whatever is shown.
   */
  function unacknowledged(during: ReadonlySet<string>) {
    if (!during.size && !handle.unacknowledgedSuccess()) return;
    // One told that the app never completed is shown now, with its send-again.
    told.clear();
    present();
    throw new ReviewLineError(HELD_AWAY_SUCCESS_LINE);
  }

  /** Successes this view told the app of: its completion is under way, so they aren't shown `succeeded`. */
  const told = new Set<string>();
  /** Per send under way, the successes delivered since it started. */
  const sending = new Set<Set<string>>();
  /** The gate's success, but for one this view already told the app of. */
  function gate() {
    return handle.unacknowledgedSuccess((hash) => told.has(hash.toLowerCase()));
  }

  /**
   * Show the gate's success as `succeeded` ("Send it again") once nothing is
   * left to deliver, unless a hold is shown.
   */
  function present() {
    const success = gate();
    if (!success || undelivered.size) return;
    if (
      view.phase === "awaiting" ||
      view.phase === "confirming" ||
      view.phase === "held"
    )
      return;
    // A success this view saw settle was told, so the gate never names it.
    set({
      phase: "succeeded",
      state: view.state,
      line: HELD_AWAY_SUCCESS_LINE,
      warning: undefined,
      notice: undefined,
      exit: false,
      settled: { result: "success", hash: success.hash },
      releasedBy: undefined,
    });
  }

  /** This view's reads under way: its own send waits for them, never refused as busy. */
  const reading = new Set<Promise<unknown>>();

  /** The gated answer, now. */
  async function check(): Promise<HeldWriteView> {
    const at = epoch;
    const before = observed;
    const read = handle.state(client).catch(() => null);
    reading.add(read);
    const next = await read.finally(() => reading.delete(read));
    // A clear read begun before this view saw its reservation says nothing of it.
    const stale =
      next?.status === "clear" &&
      observed !== before &&
      next.reservation !== observed;
    if (at === epoch && !stale) apply(next);
    return view;
  }

  /** Move a previous deploy's record into the hold, once, before any send. */
  function adopt(): Promise<boolean> {
    const provider = options.adopt;
    if (!provider) return Promise.resolve(true);
    adoption ??= (async () => {
      set({ adopting: true });
      // Each answer is this lifecycle's only: a stopped view's late read
      // applies nothing and acknowledges nothing.
      const at = epoch;
      const current = () => {
        if (at !== epoch) throw new ReviewLineError("Stopped while adopting.");
      };
      const snapshot = await handle.state(client);
      current();
      apply(snapshot);
      if (snapshot.status === "clear") {
        const evidence = await provider();
        current();
        if (evidence) {
          const state = await handle.adopt(snapshot, evidence, client);
          current();
          // Unread (the chain, or a lock another writer held): no send until it is.
          if ((state as { declined?: string }).declined === "unreadable")
            throw new ReviewLineError("The saved write couldn't be checked.");
          apply(state);
          if (state.status !== "clear" || state.settled)
            options.onAdopted?.(state);
        }
      }
      set({ adopting: false });
      return true;
    })().catch(() => {
      // Unchecked: asked again on the next send.
      adoption = undefined;
      set({ adopting: false });
      return false;
    });
    return adoption;
  }

  return {
    get: () => view,
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    check,
    /**
     * Start watching: the hold's events, a checked read now (after adoption),
     * on focus and every poll while held. Returns the stop.
     */
    start(): () => void {
      running = true;
      live = true;
      epoch += 1;
      // Every settlement a stopped lifecycle never told is told now.
      for (const [key, settled] of [...undelivered]) deliver(settled, key);
      const unsubscribe = handle.subscribe(apply);
      // An adoption a stopped lifecycle left unfinished runs again here.
      // Its first read is this view's from now: a send made at once waits for it.
      const first = adopt()
        .then((done) => (done || !running ? done : adopt()))
        .then(() => (running ? check() : view));
      reading.add(first);
      void first.finally(() => reading.delete(first));
      const timer = setInterval(() => {
        const held =
          view.phase === "awaiting" ||
          view.phase === "confirming" ||
          view.phase === "held";
        const hidden = globalThis.document?.visibilityState === "hidden";
        if (held && !hidden) void check();
      }, pollOf(options.pollMs));
      const onFocus = () => void check();
      globalThis.addEventListener?.("focus", onFocus);
      return () => {
        running = false;
        live = false;
        epoch += 1;
        unsubscribe();
        clearInterval(timer);
        globalThis.removeEventListener?.("focus", onFocus);
        stopFollowing();
      };
    },
    /**
     * The user checked their wallet: the exit the shown state offers, asked
     * of the chain once more. True when released: the app reopens its review.
     */
    exit(): Promise<boolean> {
      if (exiting) return exiting;
      const shown = view.state;
      if (!shown || shown.status === "clear" || !view.exit)
        return Promise.resolve(false);
      // Asked once `exiting` is set: a release it emits at once waits too.
      exiting = Promise.resolve()
        .then(() => handle.exit(shown, { checkedWallet: true }, client))
        .finally(() => (exiting = undefined))
        .then((ended) => {
          // Released by this exit, or else by another window meanwhile.
          if (ended.released) exitedHere = shown.record.id;
          apply(ended.state);
          return ended.released;
        });
      return exiting;
    },
    /**
     * Send under the hold, once any adoption is done. A held write refuses
     * with the hold's checked state shown.
     */
    async send(run: (gate: WriteHoldGate) => Promise<Hex>): Promise<Hex> {
      // One delivered after it starts was never seen, so it blocks too.
      const during = new Set<string>();
      sending.add(during);
      const guard = () => unacknowledged(during);
      try {
        if (!(await adopt()))
          throw new ReviewLineError(
            "Saved transactions are still being checked. Try again in a moment.",
          );
        // This view's own reads, and its follower's, end first: only another
        // writer's lock refuses the send as busy.
        const own = () => [...reading, ...(following?.reads ?? [])];
        for (let reads = own(); reads.length; reads = own())
          await Promise.all(reads);
        guard();
        // The send's own check may find one too: it says so before the wallet.
        // Its own listener: unsubscribing it leaves a started view's in place.
        const unsubscribe = handle.subscribe((state) => apply(state));
        try {
          const hash = await handle.send(client, async (gate) => {
            guard();
            // Nothing reached the wallet: the reservation it withdraws is this view's own.
            const withdraw = () => {
              withdrawn = observed;
              gate.onRejected();
            };
            return run({
              ...gate,
              onRejected: withdraw,
              // Asked again at the reservation itself, after any lock retries.
              async beforeSend(actualCall) {
                guard();
                await gate.beforeSend(actualCall);
                try {
                  guard();
                } catch (error) {
                  withdraw();
                  throw error;
                }
              },
            });
          });
          unsubscribe();
          apply(handle.peek());
          // The chain asked once more after the send, as a start asks before it.
          void check();
          return hash;
        } catch (error) {
          unsubscribe();
          // Its own evidence, checked or not: a contended refusal hides no exit.
          if (error instanceof WriteHeldError) apply(error.state);
          else if ((view.phase as HeldWritePhase) !== "succeeded")
            await check();
          throw error;
        }
      } finally {
        sending.delete(during);
      }
    },
    /**
     * The user saw a success that settled while away and chose to send again:
     * the hold marks it acknowledged, for every reader, and sends are allowed.
     */
    async acknowledge(): Promise<void> {
      const success = gate();
      if (view.phase !== "succeeded" || !success) return;
      const at = epoch;
      await handle.acknowledge({ result: success.result, hash: success.hash });
      // Only that success's presentation ends: never a newer hold or its exit.
      if (
        at === epoch &&
        view.phase === "succeeded" &&
        view.settled !== undefined &&
        "hash" in view.settled &&
        view.settled.hash === success.hash
      )
        set({ phase: "clear", line: null, settled: undefined, state: null });
      // Another success still unacknowledged is shown next.
      present();
    },
  };
}

export type HeldWriteViewController = ReturnType<typeof createHeldWriteView>;
