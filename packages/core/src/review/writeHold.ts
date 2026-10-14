import {
  isAddress,
  toEventSelector,
  type Address,
  type Hex,
  type PublicClient,
  type TransactionReceipt,
} from "viem";
import {
  canonicalSafeTxHash,
  lookAtSafeProposalEnd,
  provenSafeProposalEnd,
  readSafeTransaction,
  SAFE_PROPOSAL_AWAITING,
  safeTransactionMessage,
  type SafeQueuedTransaction,
  type SafeServiceOptions,
} from "../safeService.js";
import {
  SAFE_PROPOSAL_EXECUTED_LINE,
  WRITE_HOLD_HASHED_EXIT_LINE,
  WRITE_HOLD_IN_TAB_LINE,
  WRITE_HOLD_LOOKS_DONE_LINE,
  WRITE_HOLD_MINED_LINE,
  WRITE_HOLD_NONCE_LINE,
  WRITE_HOLD_PENDING_LINE,
  WRITE_HOLD_UNCHECKED_LINE,
  WRITE_HOLD_REVERTED_LINE,
  WRITE_HOLD_SAFE_REPLACED_LINE,
  WRITE_HOLD_SAFE_UNPROVEN_LINE,
  WRITE_HOLD_STALE_REVIEW_LINE,
  writeHeldMessage,
} from "./messages.js";
import {
  createBrowserWriteRecovery,
  createHeldWriteStorage,
  findReviewedWrites,
  heldSafeProposal,
  findTransactionAtNonce,
  listReviewedWrites,
  readReviewedWriteNonce,
  safeProposalIsHeldCall,
  SubmittedWritePersistenceError,
  verifyReviewedWriteExpiry,
  verifyReviewedWriteReceipt,
  type HeldWriteStorage,
  type ReviewedWriteRecoveryInput,
  type ReviewedWriteRecoveryRecord,
} from "./writeRecovery.js";
import { isBytes32 } from "../untrusted.js";
import { readBoundedSafeNonce } from "../safe.js";
import { atCanonicalFinalizedBlock } from "./relayr.js";
import { TAB, tabShared } from "./tabState.js";

/** `sent` is the transaction at `hash`, exactly `record`'s call, from its account, on its chain. */
function sentIsCall(
  sent: {
    hash?: Hex;
    from?: Address;
    chainId?: number;
    to?: Address | null;
    input?: Hex;
    value: bigint;
  },
  hash: Hex,
  record: {
    account: string;
    chainId: number;
    call: { to: string; data: string; value: string };
  },
): boolean {
  return (
    sent.hash?.toLowerCase() === hash.toLowerCase() &&
    sent.from?.toLowerCase() === record.account &&
    (sent.chainId === undefined || sent.chainId === record.chainId) &&
    sent.to?.toLowerCase() === record.call.to &&
    sent.input?.toLowerCase() === record.call.data &&
    BigInt(sent.value) === BigInt(record.call.value)
  );
}

/** The stop of every controller with a follower or tab listener running, for the test-only reset. */
const liveHolds = tabShared(TAB.holds, () => new Set<() => void>());

/** The reads a write hold makes on the call's chain; a viem PublicClient satisfies it. */
export type WriteHoldClient = Pick<
  PublicClient,
  | "getBlock"
  | "getBlockNumber"
  | "getChainId"
  | "getTransaction"
  | "getTransactionCount"
  | "getTransactionReceipt"
  | "request"
>;

/** How a held write ended, when the hold saw it end. */
export type WriteHoldSettled =
  /** Its verified receipt (a revert only once final). */
  | { result: "success" | "failed"; hash: Hex }
  /** A Safe proposal's expiry before it ran is proven. */
  | { result: "expired" };

type Held<S extends string, Extra> = {
  status: S;
  /** The record this state was read from: the identity an exit must name. */
  record: ReviewedWriteRecoveryRecord;
  /** The one line the app shows for it. */
  line: string;
} & Extra;

/**
 * What a write hold says about one exact call, from {@link WriteHold.state}:
 *
 * "The exit is offered" means through the gate: `exit` is true only on a
 * state from state() or exit(). peek(), replays and every other emitted state
 * keep the status and line with `exit: false`.
 *
 * - `clear`: nothing is held; `settled` says how the call's last write
 *   ended on authenticated evidence (its receipt or canonical execution),
 *   saved for every reader until the next write on the call is reserved. A
 *   proven expiry says so only to the caller that saw it; the user's exit
 *   leaves none;
 * - `pending-known-hash`: its saved hash (or Safe proposal) can still run. No
 *   exit: the wallet speeds it up or cancels it;
 * - `held-no-hash`: the wallet never returned a hash. The exit is offered;
 * - `dropped-proven`: the node doesn't know the saved hash and a canonical
 *   finalized block shows another transaction ran at the nonce it was
 *   actually sent at (`sentNonce`, from its authenticated transaction; the
 *   nonce read before the wallet opened only locates the call). The exit is
 *   offered;
 * - `held-unchecked`: a saved hash the node doesn't know 30 minutes after
 *   the wallet returned it (or, for a record saved before that time was
 *   kept or adopted without it, after it was first read). The
 *   exit is offered, with a line that says so; a hash that shows up later is
 *   followed as usual. A hash seen with its sent nonce that the node has not
 *   known for 30 minutes, with that nonce unused at a canonical finalized
 *   block, gets it too (`vanishedAt` keeps the clock). A Safe proposal Safe's service never authenticates
 *   gets it after the same 30 minutes. Its `warning` says a resend can run it
 *   twice;
 * - `safe-replaced`: another Safe transaction used a Safe write's nonce (or
 *   the executor's, for an execution returned at once). It may have run the
 *   call too, so it is never released on its own: the exit is offered at
 *   once, with its `warning`;
 * - `safe-unproven`: the app's Safe follower ended without proof
 *   ({@link WriteHoldHandle.onUnproven}). The exit is offered at once, with
 *   its `warning`; authenticated evidence that arrives later still settles it;
 * - `looks-done`: the app's effect read shows the call took effect. Nothing
 *   is released on that alone: its line says so, and the exit is offered at
 *   once (with the `warning` when it has a hash);
 * - `ran-executed`: the chain shows it ran (a Safe execution, or a revert
 *   not final yet). It is kept until its result settles it, and never offered
 *   a resend.
 */
export type WriteHoldState = WriteHoldStateOf & {
  /** Only while holds last in this tab alone: {@link WRITE_HOLD_IN_TAB_LINE}. */
  notice?: string;
  /**
   * The reservation this state belongs to (on a clear, the one that ended),
   * so an observer can ignore a newer reservation it didn't start.
   */
  reservation?: string;
  /**
   * On a result of state() or exit(): true when the gate read the chain
   * under the call's lock; false when the lock was busy and this is only the
   * saved record (its exit hidden). Never let a false one hide an exit
   * already shown.
   */
  checked?: boolean;
};

type WriteHoldStateOf =
  | { status: "clear"; settled?: WriteHoldSettled }
  | Held<"pending-known-hash", { hash: Hex; exit: false }>
  | Held<"held-no-hash", { exit: boolean }>
  | Held<
      "dropped-proven",
      { hash: Hex; usedBy: Hex; exit: boolean; warning: string }
    >
  | Held<"held-unchecked", { hash: Hex; exit: boolean; warning: string }>
  | Held<"safe-replaced", { hash: Hex; exit: boolean; warning: string }>
  | Held<"safe-unproven", { hash: Hex; exit: boolean; warning: string }>
  | Held<"looks-done", { hash?: Hex; exit: boolean; warning?: string }>
  | Held<
      "ran-executed",
      { executionHash?: Hex; result?: "failed"; exit: false }
    >;

/**
 * A state read without the chain (peek, a replay, another tab's change, a
 * send's progress): its status and line, never the exit. Only the gate in
 * state() and exit() offers that.
 */
function ungated(state: WriteHoldState): WriteHoldState {
  return state.status === "clear" || !state.exit
    ? state
    : ({ ...state, exit: false } as WriteHoldState);
}

/** Any state but `clear`. */
export type WriteHeldState = Exclude<WriteHoldStateOf, { status: "clear" }> & {
  reservation?: string;
};

/** A send was refused because the exact call is held; `state` says how. */
export class WriteHeldError extends Error {
  readonly name = "WriteHeldError";
  constructor(readonly state: WriteHeldState) {
    super(state.line);
  }
}

/** The account's nonce couldn't be read, so the wallet never opened. */
export class WriteHoldNonceError extends Error {
  readonly name = "WriteHoldNonceError";
  constructor(readonly cause: unknown) {
    super(WRITE_HOLD_NONCE_LINE);
  }
}

/**
 * The review went stale: another window's attempt of the same write was
 * reserved, and maybe settled (`settled`), while it was open. Review again;
 * the next review sends normally.
 */
export class WriteHoldStaleReviewError extends Error {
  readonly name = "WriteHoldStaleReviewError";
  constructor(readonly settled?: WriteHoldSettled) {
    super(WRITE_HOLD_STALE_REVIEW_LINE);
  }
}

/** The exact call is already being sent from another flow or tab. */
export class WriteHoldBusyError extends Error {
  readonly name = "WriteHoldBusyError";
  constructor() {
    super("This transaction is already open in another window.");
  }
}

/** The callbacks a send hands its wallet boundary (`submitReviewedContractWrite`). */
export type WriteHoldGate = {
  /**
   * Hold the call right before the wallet opens: `beforeWrite`. It reads the
   * account's next nonce for later proof, rechecks, and throws
   * {@link WriteHeldError} if the call became held meanwhile. `actualCall`:
   * a reused Safe proposal's exact call.
   */
  beforeSend(actualCall?: ReviewedWriteRecoveryInput["call"]): Promise<void>;
  /** The wallet returned this hash (a Safe proposal's safeTxHash): `onWriteSubmitted`. */
  afterSubmit(hash: Hex, proposal?: SafeQueuedTransaction): void;
  /** Nothing reached the wallet, or it refused: `onWriteRejected` and `onBeforeWriteAborted`. */
  onRejected(): void;
};

type Locks = Pick<LockManager, "request">;

const SETTLE_POLL_MS = 15_000;
/** How long a reservation retries a lock another writer briefly holds. */
const RESERVE_RETRY_MS = 2_000;
/** A Safe's execution events, in its 1.3 and 1.4 layouts alike. */
const SAFE_EXECUTION_TOPICS = [
  toEventSelector("ExecutionSuccess(bytes32,uint256)"),
  toEventSelector("ExecutionFailure(bytes32,uint256)"),
];
/** A hash the network still hasn't seen this long after the wallet returned it was almost certainly never broadcast. */
const UNSEEN_HASH_MS = 30 * 60_000;

/** The longest one request to Safe's service may take inside the hold. */
const SAFE_SERVICE_READ_MS = 8_000;

/** The 30 minutes have passed since the wallet returned the hash, or since it was first read. A clock that couldn't be saved (NaN) never runs out. */
function unseenTooLong(
  record: ReviewedWriteRecoveryRecord,
  /** A later authenticated sighting, when there is one: the clock runs from it. */
  seen?: string,
): boolean {
  return (
    Date.now() - Number(seen ?? record.submittedAt ?? record.firstSeenAt) >=
    UNSEEN_HASH_MS
  );
}

/** Whether a canonical finalized block shows the account's nonce still at or below the sent nonce; false when it can't say. */
async function nonceUnused(
  client: WriteHoldClient,
  record: ReviewedWriteRecoveryRecord,
): Promise<boolean> {
  const proof = await atCanonicalFinalizedBlock(
    client as never,
    async (blockNumber) =>
      BigInt(
        await client.getTransactionCount({
          address: record.account,
          blockNumber,
        }),
      ) <= BigInt(record.sentNonce!),
  );
  return proof?.value === true;
}

/** A Safe write whose nonce another Safe transaction used: never released on its own. */
function safeReplaced(record: ReviewedWriteRecoveryRecord): WriteHoldState {
  return {
    status: "safe-replaced",
    record,
    hash: record.hash!,
    exit: true,
    line: WRITE_HOLD_SAFE_REPLACED_LINE,
    warning: WRITE_HOLD_HASHED_EXIT_LINE,
  };
}

/** A Safe write whose follower ended without proof: the exit at once. */
function safeUnproven(record: ReviewedWriteRecoveryRecord): WriteHoldState {
  return {
    status: "safe-unproven",
    record,
    hash: record.hash!,
    exit: true,
    line: WRITE_HOLD_SAFE_UNPROVEN_LINE,
    warning: WRITE_HOLD_HASHED_EXIT_LINE,
  };
}

function unchecked(record: ReviewedWriteRecoveryRecord): WriteHoldState {
  return {
    status: "held-unchecked",
    record,
    hash: record.hash!,
    exit: true,
    line: WRITE_HOLD_UNCHECKED_LINE,
    warning: WRITE_HOLD_HASHED_EXIT_LINE,
  };
}
/** About an hour of polls; a later state() looks again. */
const SETTLE_POLL_ATTEMPTS = 240;

function clear(
  settled?: WriteHoldSettled,
  reservation?: string,
): WriteHoldState {
  return {
    status: "clear",
    ...(settled ? { settled } : {}),
    ...(reservation === undefined ? {} : { reservation }),
  };
}

function ranExecuted(
  record: ReviewedWriteRecoveryRecord,
  executionHash = record.executionHash,
  result?: "failed",
): WriteHoldState {
  return {
    status: "ran-executed",
    record,
    exit: false,
    line:
      result === "failed" && !record.safe
        ? WRITE_HOLD_REVERTED_LINE
        : SAFE_PROPOSAL_EXECUTED_LINE,
    ...(executionHash ? { executionHash } : {}),
    ...(result ? { result } : {}),
  };
}

function pendingHash(record: ReviewedWriteRecoveryRecord): WriteHoldState {
  return {
    status: "pending-known-hash",
    record,
    hash: record.hash!,
    exit: false,
    line: record.safe ? SAFE_PROPOSAL_AWAITING : WRITE_HOLD_PENDING_LINE,
  };
}

/** What the saved record alone says, without asking the chain. */
function classify(record: ReviewedWriteRecoveryRecord | null): WriteHoldState {
  if (!record) return clear();
  if (record.replaced) return safeReplaced(record);
  if (record.executed) return ranExecuted(record);
  if (record.unproven) return safeUnproven(record);
  if (!record.hash)
    return {
      status: "held-no-hash",
      record,
      exit: true,
      line:
        record.safe ||
        (record.nonce !== undefined && record.fromBlock !== undefined)
          ? writeHeldMessage()
          : WRITE_HOLD_UNCHECKED_LINE,
    };
  return pendingHash(record);
}

/**
 * One controller for held wallet writes, framework-free: every app wires its
 * send, receipt and exit through it, so nothing is ever sent twice.
 *
 * - Holds live in the browser's storage, shared by tabs and kept across
 *   reloads, or in this tab's memory where storage is refused
 *   ({@link createHeldWriteStorage}); {@link reviewLine} is then the line the
 *   review shows. The wallet never opens without a hold.
 * - A send checks, reserves and hands the call to the wallet under one lock
 *   per exact call (Web Locks, or the SDK's fallback), so two flows or tabs
 *   can never both reserve it.
 * - A verified successful receipt releases at once. A revert holds until a
 *   canonical finalized block includes it. A Safe proposal proven executed
 *   is kept through reload until its execution's receipt settles it; one
 *   proven expired releases. One another Safe transaction replaced is never
 *   released on its own: the user's exit ends it.
 */
export function createWriteHold(
  options: {
    storage?: HeldWriteStorage;
    locks?: Locks;
    safeService?: SafeServiceOptions;
    /** How often, and how many times, a ran write is looked at again until it settles. */
    settle?: { intervalMs?: number; attempts?: number };
  } = {},
) {
  const storage = options.storage ?? createHeldWriteStorage();
  /**
   * Safe's service, every request and its body bounded together to
   * {@link SAFE_SERVICE_READ_MS} whatever its fetch does with the signal: a read that times out is
   * unknown, which never releases or settles, so a hung service can't hold
   * a send or the call's lock.
   */
  const service: SafeServiceOptions = {
    ...options.safeService,
    fetch: (url, init) => {
      const request = options.safeService?.fetch ?? globalThis.fetch;
      let timer: ReturnType<typeof setTimeout> | undefined;
      return Promise.race([
        // The whole read, its body included, under the one deadline.
        request(url, init).then(
          async (response) =>
            new Response(await response.arrayBuffer(), {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers,
            }),
        ),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error("Safe's service did not answer in time.")),
            SAFE_SERVICE_READ_MS,
          );
        }),
      ]).finally(() => clearTimeout(timer));
    },
  };
  const interval = options.settle?.intervalMs ?? SETTLE_POLL_MS;
  const attempts = options.settle?.attempts ?? SETTLE_POLL_ATTEMPTS;
  const listeners = new Map<string, Set<(state: WriteHoldState) => void>>();
  const peekers = new Map<string, () => WriteHoldState>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  let onStorage: ((event: StorageEvent) => void) | undefined;

  /**
   * The one decorator every state leaves through for its storage notice:
   * while holds last in this tab alone, a held state carries
   * {@link WRITE_HOLD_IN_TAB_LINE}; otherwise none.
   */
  function noticed(state: WriteHoldState): WriteHoldState {
    const { notice: _, ...rest } = state;
    return state.status !== "clear" && !storage.durable()
      ? ({ ...rest, notice: WRITE_HOLD_IN_TAB_LINE } as WriteHoldState)
      : (rest as WriteHoldState);
  }

  /** The latest state emitted for each call, replayed to a late subscriber. */
  const latest = new Map<string, WriteHoldState>();
  function emit(key: string, state: WriteHoldState) {
    latest.set(key, state);
    for (const listener of listeners.get(key) ?? []) listener(state);
  }

  /** Another tab changed a hold: every subscribed call shows what it holds now. */
  function watchTabs() {
    if (onStorage || typeof globalThis.addEventListener !== "function") return;
    onStorage = (event) => {
      if (
        event.key &&
        (!event.key.startsWith("nana-sdk:reviewed-write") ||
          event.key === "nana-sdk:reviewed-write:probe")
      )
        return;
      for (const [key, peek] of peekers) {
        try {
          emit(key, peek());
        } catch {
          /* An unreadable record is shown at its next state(). */
        }
      }
    };
    globalThis.addEventListener("storage", onStorage);
    liveHolds.add(dispose);
  }

  /** Stop every settle poll and the tab listener. */
  function dispose() {
    for (const timer of timers.values()) clearTimeout(timer);
    timers.clear();
    if (onStorage) globalThis.removeEventListener?.("storage", onStorage);
    onStorage = undefined;
    liveHolds.delete(dispose);
  }

  function openOne(
    call: ReviewedWriteRecoveryInput,
    hooks: {
      /**
       * Takes this key's lock (`ownLock`) and any others the caller needs,
       * runs the final reservation (`unreserve` undoes it while nothing was
       * sent), resolves once reserved, and keeps every lock until the send
       * ends (`until`). With it, the send holds no lock while it reviews.
       */
      across?: (
        ownLock: <T>(work: () => Promise<T>) => Promise<T>,
        reserve: () => void,
        unreserve: () => void,
        until: Promise<void>,
        reviewed: string,
      ) => Promise<{ released: Promise<void>; unsent: () => void }>;
      /** Every involved key's generation, read when the review opens. */
      generations?: () => string;
    } = {},
    /** The key a found write was saved under, when it isn't its call's own. */
    at?: string,
  ) {
    const recovery = createBrowserWriteRecovery(call, {
      storage,
      locks: options.locks,
      at,
    });
    // The canonical recovery scope: a namespace and an exact call never share it.
    const key = recovery.scopeKey;
    /** The effect read the last state() was given: the exit asks it again. */
    let lastEffect: ((chainId: number) => Promise<boolean>) | undefined;
    /** Nothing held: how the call's last write settled, if saved. */
    const cleared = () => clear(recovery.settled());
    /** Every state leaves with the reservation it belongs to. */
    const tagged = (state: WriteHoldState): WriteHoldState => {
      const reservation =
        state.reservation ??
        (state.status === "clear"
          ? recovery.latestReservation()
          : state.record.id);
      return noticed({
        ...state,
        ...(reservation === undefined ? {} : { reservation }),
      });
    };
    const peek = () => {
      const record = recovery.read();
      return tagged(record ? ungated(classify(record)) : cleared());
    };
    const shown = (state: WriteHoldState) => {
      const out = tagged(state);
      emit(key, out);
      return out;
    };

    async function locked<T>(
      work: () => Promise<T>,
      wait: boolean,
    ): Promise<{ value: T } | null> {
      let entered = false;
      try {
        return {
          value: await recovery.withLock(async () => {
            entered = true;
            return work();
          }, wait),
        };
      } catch (error) {
        if (entered) throw error;
        return null;
      }
    }

    /** End exactly `record` (read under this lock), committing a hash kept only in memory first. */
    function release(record: ReviewedWriteRecoveryRecord): boolean {
      try {
        recovery.clear(recovery.submitted(record.hash!, record));
        return true;
      } catch {
        return false;
      }
    }

    function follow(client: WriteHoldClient, id: string, left = attempts) {
      if (timers.has(id) || left <= 0) return;
      liveHolds.add(dispose);
      timers.set(
        id,
        setTimeout(() => {
          void state(client)
            .catch(() => null)
            .then((next) => {
              timers.delete(id);
              if (next?.status === "ran-executed") follow(client, id, left - 1);
            });
        }, interval),
      );
    }

    async function settle(
      record: ReviewedWriteRecoveryRecord,
      receipt: TransactionReceipt,
      client: WriteHoldClient,
      proof?: Parameters<typeof verifyReviewedWriteReceipt>[3],
    ): Promise<WriteHoldState> {
      const verdict = await verifyReviewedWriteReceipt(
        client as never,
        record,
        receipt,
        proof,
      ).catch(() => null);
      if (verdict && release(record)) {
        const settled = {
          result: verdict,
          hash: receipt.transactionHash.toLowerCase() as Hex,
        };
        // Kept for any later reader: another tab, a reload, a follow timer.
        recovery.markSettled(record, settled);
        return clear(settled, record.id);
      }
      if (
        !record.safe &&
        receipt.status === "reverted" &&
        receipt.transactionHash.toLowerCase() === record.hash
      ) {
        follow(client, record.id);
        return ranExecuted(record, record.hash, "failed");
      }
      // An authenticated Safe failure that isn't final yet: saved, never an exit.
      // (A verified success has already settled above.)
      const ran =
        record.safe &&
        (await verifyReviewedWriteReceipt(
          client as never,
          record,
          receipt,
          proof,
          { finality: false },
        ).catch(() => null));
      if (ran === "failed") {
        const hash = receipt.transactionHash.toLowerCase() as Hex;
        const saved = recovery.executed(record, hash);
        follow(client, saved.id);
        return ranExecuted(saved, hash, "failed");
      }
      if (record.executed) follow(client, record.id);
      return classify(recovery.read());
    }

    /**
     * Whether a previous deploy's `hash` may be this call's: a valid hash
     * read on the call's chain that isn't shown to be another write. A
     * transaction must be the exact call from the account; a Safe proposal,
     * exactly this call. One that can't be read is unknown, not refused.
     */
    async function adoptable(
      hash: Hex,
      client: WriteHoldClient | undefined,
    ): Promise<"yes" | "refused" | "unreadable"> {
      if (!isBytes32(hash)) return "refused";
      if (!client) return "unreadable";
      const chainId = await client.getChainId().catch(() => null);
      // A client on another chain can't check this chain's transaction.
      if (chainId !== call.chainId) return "unreadable";
      const reviewed = {
        account: call.account.toLowerCase(),
        chainId: call.chainId,
        call: {
          to: call.call.to.toLowerCase(),
          data: call.call.data.toLowerCase(),
          value: String(call.call.value ?? 0),
        },
      };
      // One the chain or the service can't show is this call's, held.
      if (call.safe) {
        const proposal = await readSafeTransaction(
          call.chainId,
          call.account,
          hash,
          service,
        ).catch(() => null);
        return !proposal || safeProposalIsHeldCall(proposal, call)
          ? "yes"
          : "refused";
      }
      const sent = await client.getTransaction({ hash }).catch(() => null);
      return !sent || sentIsCall(sent, hash, reviewed) ? "yes" : "refused";
    }

    /** The authenticated nonce of a Safe proposal, from Safe's service. */
    async function proposalNonceOf(
      record: ReviewedWriteRecoveryRecord,
    ): Promise<bigint | null> {
      try {
        const proposal = await readSafeTransaction(
          record.chainId,
          record.account,
          record.hash!,
          service,
        );
        return safeTransactionMessage(proposal).nonce;
      } catch {
        return null;
      }
    }

    /** Follow a saved execution's receipt; null while the node has none. */
    async function execution(
      record: ReviewedWriteRecoveryRecord,
      client: WriteHoldClient,
    ): Promise<WriteHoldState | null> {
      const receipt = await client
        .getTransactionReceipt({ hash: record.executionHash! })
        .catch(() => null);
      return receipt ? settle(record, receipt, client) : null;
    }

    /**
     * A direct execution whose receipt is gone: another transaction the
     * executor sent at its nonce, at a canonical finalized block, means it
     * never ran. History that can't be read keeps it held, and after 30
     * minutes with the transaction unknown it gets the unchecked exit.
     */
    async function reconcileDirect(
      record: ReviewedWriteRecoveryRecord,
      client: WriteHoldClient,
    ): Promise<WriteHoldState | null> {
      const used =
        record.sentFrom && record.sentNonce !== undefined
          ? await findTransactionAtNonce(
              client,
              record.sentFrom,
              BigInt(record.sentNonce),
            )
          : null;
      // Another transaction at that nonce may have run the call too.
      if (used && used.hash !== record.hash)
        return safeReplaced(recovery.replacedOnChain(record));
      if (
        used ||
        !unseenTooLong(record) ||
        !(await client.getTransaction({ hash: record.hash! }).then(
          () => false,
          (error: { name?: unknown } | null) =>
            error?.name === "TransactionNotFoundError",
        ))
      )
        return null;
      // A proof that can't be dropped keeps the exit refusing it.
      return unchecked(recovery.unexecuted(record));
    }

    /** The first hash the hold has seen that the node knows as a transaction with no receipt yet. */
    /**
     * Positive proof that `receipt` isn't the held Safe proposal's
     * execution: it is in a canonical block, and it reverted or its Safe
     * logged no execution of the proposal's safeTxHash. A read that fails
     * proves nothing.
     */
    async function disproves(
      record: ReviewedWriteRecoveryRecord,
      receipt: TransactionReceipt,
      client: WriteHoldClient,
    ): Promise<boolean> {
      const block = await client
        .getBlock({ blockNumber: receipt.blockNumber })
        .catch(() => null);
      if (
        !block?.hash ||
        block.hash.toLowerCase() !== receipt.blockHash?.toLowerCase()
      )
        return false;
      if (receipt.status === "reverted") return true;
      return !receipt.logs.some(
        (log) =>
          log.address?.toLowerCase() === record.account &&
          SAFE_EXECUTION_TOPICS.includes(log.topics?.[0] as Hex) &&
          (log.topics.length === 2
            ? log.topics[1]
            : log.data?.slice(0, 66)
          )?.toLowerCase() === record.hash,
      );
    }

    /**
     * A held hash the node shows mined, though its receipt can't be read: it
     * may have run, so no exit at once, and no "speed it up" either. Once
     * that has lasted 30 minutes (`minedAt` keeps the clock), the warned exit.
     * Seen pending again, the clock stops.
     */
    async function minedUnread(
      state: Extract<WriteHoldState, { status: "pending-known-hash" }>,
      client: WriteHoldClient,
    ): Promise<WriteHoldState> {
      const look = await lookAt(state.hash, client);
      // Only positive pending evidence stops the clock; a read that fails
      // keeps the one saved.
      if (look === "pending")
        return {
          ...state,
          record: recovery.seenPending(recovery.mined(state.record, false)),
        };
      const record =
        look === "mined" ? recovery.mined(state.record, true) : state.record;
      // Unknown or not found is not pending: with no read showing it pending
      // or mined for 30 minutes (since it was last seen pending, or else
      // submitted), the warned explicit exit, never a release on its own. A
      // Safe proposal's hash isn't a transaction to read.
      if (
        (look === "unknown" || look === null) &&
        !record.safe &&
        record.minedAt === undefined &&
        Date.now() -
          Number(
            record.pendingSeenAt ?? record.submittedAt ?? record.firstSeenAt,
          ) >=
          UNSEEN_HASH_MS
      )
        return unchecked(record);
      if (record.minedAt === undefined) return state;
      if (Date.now() - Number(record.minedAt) >= UNSEEN_HASH_MS)
        return unchecked(record);
      return { ...state, record, line: WRITE_HOLD_MINED_LINE };
    }

    /** What the node shows of `hash`: positive pending or mined metadata, or nothing it can say. */
    async function lookAt(
      hash: Hex,
      client: WriteHoldClient,
    ): Promise<"pending" | "mined" | "unknown" | null> {
      const sent = await client.getTransaction({ hash }).then(
        (tx) => tx,
        (error: { name?: unknown } | null) =>
          error?.name === "TransactionNotFoundError" ? null : undefined,
      );
      if (sent === undefined) return "unknown";
      if (sent?.hash?.toLowerCase() !== hash) return null;
      return sent.blockNumber === null ? "pending" : "mined";
    }

    /**
     * No exit while a hash the hold has seen (its own, unless proven dropped,
     * or a candidate) is pending, or was seen mined with its receipt
     * unreadable less than 30 minutes ago: it may have run. Its clock is
     * kept per hash, survives read failures, and stops only on positive
     * pending evidence.
     */
    async function seenGate(
      saved: ReviewedWriteRecoveryRecord,
      client: WriteHoldClient,
      ownDropped: boolean,
    ): Promise<WriteHoldState | null> {
      let record = saved;
      const seen = [
        ...(record.hash && !ownDropped ? [record.hash] : []),
        ...(record.candidates ?? []),
      ];
      for (const hash of seen) {
        const own = hash === record.hash;
        const look = await lookAt(hash, client);
        // Unknown changes nothing: only positive metadata moves a clock.
        if (look === "pending" || look === "mined")
          record = own
            ? recovery.mined(record, look === "mined")
            : recovery.candidateMined(record, hash, look === "mined");
        const at = own ? record.minedAt : record.candidateMinedAt?.[hash];
        // A candidate the chain hasn't answered for since it was reported
        // keeps its unseen window through failing reads.
        const unread =
          !own && look === "unknown" && at === undefined
            ? record.candidateSeenAt?.[hash]
            : undefined;
        if (
          look === "pending" ||
          (at !== undefined && Date.now() - Number(at) < UNSEEN_HASH_MS) ||
          (unread !== undefined && Date.now() - Number(unread) < UNSEEN_HASH_MS)
        )
          return {
            status: "pending-known-hash",
            record,
            hash,
            exit: false,
            line:
              look === "pending"
                ? WRITE_HOLD_PENDING_LINE
                : at === undefined
                  ? writeHeldMessage()
                  : WRITE_HOLD_MINED_LINE,
          };
      }
      return null;
    }

    async function safeState(
      saved: ReviewedWriteRecoveryRecord,
      client: WriteHoldClient,
    ): Promise<WriteHoldState> {
      let record = saved;
      const hash = record.hash;
      if (!hash || record.replaced) return classify(record);
      if (record.submittedAt === undefined) record = recovery.firstSeen(record);
      // The wallet's reply may be the execution itself (run at once).
      if (!record.executed) {
        const atOnce = await client
          .getTransactionReceipt({ hash })
          .catch(() => null);
        if (atOnce) {
          const settled = await settle(record, atOnce, client);
          if (settled.status === "clear") return settled;
          // Saved as executed only once authenticated as this Safe's
          // execution of the exact call (settle does that); a receipt alone
          // proves nothing, and the record stays unproven.
          if (settled.status === "ran-executed") {
            record = settled.record;
            // Who sent it at which nonce proves a canonical replacement later.
            const sent = await client
              .getTransaction({ hash })
              .catch(() => null);
            if (sent?.hash?.toLowerCase() === hash && isAddress(sent.from))
              record = recovery.sentBy(record, sent.from, BigInt(sent.nonce));
            return ranExecuted(record, hash, settled.result);
          }
        }
      }
      // An execution hash the app reported settles it only on its own
      // authenticated receipt; until then it is a candidate, never proof.
      if (!record.executionHash)
        for (const candidate of record.candidates ?? []) {
          const receipt = await client
            .getTransactionReceipt({ hash: candidate })
            .catch(() => null);
          if (!receipt) continue;
          const settled = await settle(record, receipt, client);
          if (settled.status === "clear" || settled.status === "ran-executed")
            return settled;
          // Only a canonical receipt that names no execution of this
          // proposal disproves it; anything unread keeps it.
          if (await disproves(record, receipt, client))
            record = recovery.disproven(record, candidate);
        }
      if (record.executed && record.executionHash) {
        const settled = await execution(record, client);
        if (settled?.status === "clear") return settled;
        if (record.executionHash === hash) {
          if (!settled) {
            const reconciled = await reconcileDirect(record, client);
            if (reconciled) return reconciled;
          }
          follow(client, record.id);
          return settled ?? ranExecuted(record);
        }
      }
      // The chain's proof, from the proposal's nonce: Safe's service is asked
      // only for the nonce, once, and for an expiry.
      if (record.safeNonce === undefined) {
        const nonce = await proposalNonceOf(record);
        if (nonce !== null) record = recovery.proposalNonce(record, nonce);
      }
      const end =
        (record.safeNonce !== undefined &&
          (await provenSafeProposalEnd(
            client,
            record.account,
            hash,
            BigInt(record.safeNonce),
          ))) ||
        (await lookAtSafeProposalEnd(
          client as never,
          record.chainId,
          record.account,
          hash,
          service,
        ));
      // Another Safe transaction took its nonce, even after a saved execution
      // was reorganized away. It may have run the call too: the exit, never a release.
      if (end.look === "replaced")
        return safeReplaced(recovery.replacedOnChain(record));
      if (end.look === "expired" && !record.executed) {
        const expired = await verifyReviewedWriteExpiry(
          client,
          record,
          service,
        ).catch(() => false);
        if (expired && release(record))
          return clear({ result: "expired" }, record.id);
      }
      if (end.look === "executed") {
        if (
          !record.executed ||
          (end.execution &&
            end.execution.executionHash !== record.executionHash)
        )
          record = recovery.executed(record, end.execution?.executionHash);
        if (record.executionHash) {
          const settled = await execution(record, client);
          // Only a settled receipt ends it here; one that can't be verified
          // leaves the finalized log to decide.
          if (settled?.status === "clear") return settled;
        }
        // It ran: with its receipt unreadable, the canonical log at a
        // finalized block carries its result. Never a resend exit.
        if (end.execution && release(record)) {
          const settled = {
            result: end.execution.status,
            hash: end.execution.executionHash,
          };
          recovery.markSettled(record, settled);
          return clear(settled, record.id);
        }
      }
      // A saved nonce the chain shows the Safe still waiting at is
      // authenticated evidence of a live proposal; without it, the wait is
      // bounded like any unchecked write.
      if (
        !record.executed &&
        !record.unproven &&
        record.safeNonce !== undefined &&
        end.look === "live"
      ) {
        const now = await readBoundedSafeNonce(
          client as never,
          record.account,
        ).catch(() => null);
        if (now !== null && now <= BigInt(record.safeNonce))
          record = recovery.seenPending(record);
      }
      if (
        !record.executed &&
        !record.unproven &&
        unseenTooLong(
          record,
          record.safeNonce === undefined ? undefined : record.pendingSeenAt,
        )
      )
        return unchecked(record);
      if (record.executed) follow(client, record.id);
      return classify(record);
    }

    /**
     * The one gate for every exit, offered or taken: no exit while any hash
     * the hold has seen (its own, or a candidate) is a known pending
     * transaction, whatever the state says, a replacement included.
     */
    async function inspect(
      client: WriteHoldClient,
      effect?: (chainId: number) => Promise<boolean>,
    ): Promise<WriteHoldState> {
      const state = await inspectChain(client, effect);
      if (state.status === "pending-known-hash")
        return minedUnread(state, client);
      if (state.status === "clear" || !state.exit) return state;
      // A hash proven dropped (another transaction used its sent nonce at a
      // canonical finalized block) can't run, whatever a node still shows.
      return (
        (await seenGate(
          state.record,
          client,
          state.status === "dropped-proven",
        )) ?? state
      );
    }

    /**
     * The way out of every method that has a client: a state that could
     * offer the exit, or track a hash, is the gate's answer (inspect), so no
     * method reports an exit state() would refuse. Under the call's lock.
     */
    async function finish(
      state: WriteHoldState,
      client: WriteHoldClient,
    ): Promise<WriteHoldState> {
      return state.status === "clear" || state.status === "ran-executed"
        ? state
        : inspect(client);
    }

    async function inspectChain(
      client: WriteHoldClient,
      effect?: (chainId: number) => Promise<boolean>,
    ): Promise<WriteHoldState> {
      let record = recovery.read();
      if (!record) return cleared();
      // A mirror carries no evidence of its own: its source attempt does.
      if (record.mirrorOf) return classify(record);
      // No evidence from another chain.
      if ((await client.getChainId().catch(() => null)) !== record.chainId)
        return classify(record);
      if (record.safe) return safeState(record, client);
      const check = await recovery
        .resolve(client, effect ? { effect } : undefined)
        .catch(() => null);
      record = recovery.read();
      if (!record) return cleared();
      if (check?.status === "sent") {
        // An authenticated hash is seen: any vanished clock stops.
        if (record.vanishedAt !== undefined)
          record = recovery.vanished(record, false);
        const receipt = await client
          .getTransactionReceipt({ hash: check.hash })
          .catch(() => null);
        return receipt ? settle(record, receipt, client) : pendingHash(record);
      }
      // A hash saved before its clock existed starts it now.
      if (record.hash && record.submittedAt === undefined)
        record = recovery.firstSeen(record);
      if (
        record.hash &&
        record.sentNonce !== undefined &&
        check?.status === "pending" &&
        check.usedBy
      )
        return {
          status: "dropped-proven",
          record,
          hash: record.hash,
          usedBy: check.usedBy,
          exit: true,
          line: writeHeldMessage(),
          warning: WRITE_HOLD_HASHED_EXIT_LINE,
        };
      // The app's effect read only changes the line, and offers the exit;
      // a proven drop above takes priority.
      if (check?.status === "pending" && check.effect)
        return {
          status: "looks-done",
          record,
          exit: true,
          line: WRITE_HOLD_LOOKS_DONE_LINE,
          ...(record.hash
            ? { hash: record.hash, warning: WRITE_HOLD_HASHED_EXIT_LINE }
            : {}),
        };
      // A hash seen with its sent nonce that the node has since lost.
      if (
        record.hash &&
        record.sentNonce !== undefined &&
        check?.status === "pending" &&
        !check.usedBy
      ) {
        const known = await client.getTransaction({ hash: record.hash }).then(
          () => true,
          (error: { name?: unknown } | null) =>
            error?.name === "TransactionNotFoundError" ? false : null,
        );
        if (known !== null) record = recovery.vanished(record, !known);
        if (
          known === false &&
          Date.now() - Number(record.vanishedAt) >= UNSEEN_HASH_MS &&
          (await nonceUnused(client, record))
        )
          return unchecked(record);
      }
      if (
        record.hash &&
        record.sentNonce === undefined &&
        unseenTooLong(record) &&
        (await client.getTransaction({ hash: record.hash }).then(
          () => false,
          (error: { name?: unknown } | null) =>
            error?.name === "TransactionNotFoundError",
        ))
      )
        return unchecked(record);
      return classify(record);
    }

    /**
     * The one answer for this call: what is held, asking the chain. A flow
     * sending it right now leaves the saved record's own answer.
     */
    async function state(
      client: WriteHoldClient,
      checks: { effect?: (chainId: number) => Promise<boolean> } = {},
    ): Promise<WriteHoldState> {
      lastEffect = checks.effect;
      const result = await locked(() => inspect(client, checks.effect), false);
      return { ...shown(result ? result.value : peek()), checked: !!result };
    }

    return {
      state,
      /** What the saved record alone says, without asking the chain. */
      peek,
      /**
       * Every state this controller reads or makes for the call, and other
       * tabs' changes. The latest one, if any, is replayed at once.
       */
      subscribe(listener: (state: WriteHoldState) => void): () => void {
        let set = listeners.get(key);
        if (!set) listeners.set(key, (set = new Set()));
        set.add(listener);
        peekers.set(key, peek);
        watchTabs();
        // A subscriber that arrives after the hold spoke hears its latest state.
        // Only while it still names the call's current record; otherwise
        // what the saved record says now.
        const last = latest.get(key);
        if (last) {
          const now = peek();
          // A clear is compared by its settlement's identity, a hold by its record.
          const identity = (state: WriteHoldState) =>
            JSON.stringify([
              state.reservation ?? null,
              state.status === "clear" ? (state.settled ?? null) : state.record,
            ]);
          listener(
            noticed(ungated(identity(now) === identity(last) ? last : now)),
          );
        }
        return () => {
          set!.delete(listener);
          if (!set!.size) {
            listeners.delete(key);
            peekers.delete(key);
          }
        };
      },
      /**
       * Send the call under its hold. A held call throws
       * {@link WriteHeldError} before anything opens, and another flow or tab
       * sending it throws {@link WriteHoldBusyError}. `run` hands the
       * {@link WriteHoldGate} to its wallet boundary. A write that may have
       * reached the wallet stays held whatever `run` throws.
       */
      async send<T>(
        client: WriteHoldClient,
        run: (gate: WriteHoldGate) => Promise<T>,
      ): Promise<T> {
        let attempt: ReviewedWriteRecoveryRecord | undefined;
        let ended!: () => void;
        const until = new Promise<void>((resolve) => (ended = resolve));
        let released: Promise<void> | undefined;
        /** Under an intent: removes the reservation's mirrors, never sent. */
        let unsent: (() => void) | undefined;
        let reviewed = "";
        const gate: WriteHoldGate = {
          async beforeSend(actualCall) {
            let evidence:
              | Awaited<ReturnType<typeof readReviewedWriteNonce>>
              | undefined;
            if (!call.safe) {
              // The nonce proves later what became of the write: one retry, or nothing is sent.
              const read = () => readReviewedWriteNonce(client, call.account);
              try {
                evidence = await read().catch(read);
              } catch (cause) {
                throw new WriteHoldNonceError(cause);
              }
            }
            const reserve = () => {
              attempt = recovery.reserve(actualCall, evidence);
            };
            try {
              if (hooks.across)
                ({ released, unsent } = await hooks.across(
                  (work) => recovery.withLock(work),
                  reserve,
                  () => {
                    recovery.rejected();
                    attempt = undefined;
                  },
                  until,
                  reviewed,
                ));
              else reserve();
            } catch (error) {
              if (
                error instanceof WriteHeldError ||
                error instanceof WriteHoldBusyError ||
                error instanceof WriteHoldStaleReviewError
              )
                throw error;
              if (hooks.across) {
                // No lock is held here: what the saved record says.
                const now = shown(peek());
                if (now.status !== "clear") throw new WriteHeldError(now);
                throw error;
              }
              const now = shown(
                await finish(classify(recovery.read()), client),
              );
              if (now.status !== "clear") throw new WriteHeldError(now);
              throw error;
            }
            shown(peek());
          },
          afterSubmit(hash, proposal) {
            if (!attempt)
              throw new Error("Hold the write before the wallet opens.");
            try {
              attempt = recovery.submitted(hash, attempt);
            } catch (error) {
              if (!(error instanceof SubmittedWritePersistenceError))
                throw error;
              attempt = error.record;
            }
            // The proposal the app made, if it hashes to the reply: its nonce.
            if (call.safe && proposal)
              try {
                canonicalSafeTxHash(call.chainId, call.account, proposal, hash);
                attempt = recovery.proposalNonce(
                  attempt,
                  safeTransactionMessage(proposal).nonce,
                );
              } catch {
                /* Not this proposal: the service is asked later. */
              }
            shown(ungated(classify(attempt)));
          },
          onRejected() {
            recovery.rejected();
            // Nothing was sent: no mirror holds it for older readers.
            if (attempt && !recovery.read()) unsent?.();
            attempt = undefined;
            shown(peek());
          },
        };
        if (hooks.across) {
          // Checked under this key's lock, which is then let go: the final
          // check and reservation take every lock again, in order.
          const checked = await locked(
            async () => shown(await inspect(client)),
            false,
          );
          if (!checked) throw new WriteHoldBusyError();
          if (checked.value.status !== "clear")
            throw new WriteHeldError(checked.value);
          // Given with `across`: the generations the review is checked against.
          reviewed = hooks.generations!();
          try {
            return await run(gate);
          } finally {
            // The send ends: every lock it reserved under is let go first.
            ended();
            await released;
          }
        }
        const result = await locked(async () => {
          const now = shown(await inspect(client));
          if (now.status !== "clear") throw new WriteHeldError(now);
          return run(gate);
        }, false);
        if (!result) throw new WriteHoldBusyError();
        return result.value;
      },
      /**
       * The user checked their wallet. Only an exit-offered `snapshot`, the
       * state the user saw, is released, after the chain is asked once more:
       * any change refuses it, and a confirmation that landed meanwhile wins.
       * `released` true: send again.
       */
      async exit(
        snapshot: WriteHoldState,
        acknowledgement: { checkedWallet: true },
        client: WriteHoldClient,
      ): Promise<{ released: boolean; state: WriteHoldState }> {
        if (acknowledgement?.checkedWallet !== true)
          throw new Error(
            "Release a held write only after the user confirms they checked their wallet.",
          );
        const result = await locked(async () => {
          const now = await inspect(client, lastEffect);
          if (
            snapshot.status === "clear" ||
            now.status === "clear" ||
            !now.exit ||
            now.status !== snapshot.status ||
            JSON.stringify(now.record) !== JSON.stringify(snapshot.record)
          )
            return { released: false, state: now };
          try {
            recovery.abandon(snapshot.record, { checkedWallet: true });
          } catch {
            return {
              released: false,
              state: await finish(classify(recovery.read()), client),
            };
          }
          return {
            released: true,
            state: clear(undefined, snapshot.record.id),
          };
          // Never waits behind another send's wallet prompt: on contention,
          // what the saved record says, with no exit.
        }, false);
        const ended = result?.value ?? { released: false, state: peek() };
        return {
          ...ended,
          state: { ...shown(ended.state), checked: !!result },
        };
      },
      /**
       * A receipt for the held write: an ordinary write's own hash, or a Safe
       * proposal's execution (`proof`: its whole batch). It releases only once
       * verified, and a revert only once final.
       */
      async onReceipt(
        receipt: TransactionReceipt,
        client: WriteHoldClient,
        proof?: Parameters<typeof verifyReviewedWriteReceipt>[3],
      ): Promise<WriteHoldState> {
        const result = await locked(async () => {
          const record = recovery.read();
          if (
            !record ||
            record.mirrorOf ||
            (!record.safe &&
              record.hash !== receipt?.transactionHash?.toLowerCase())
          )
            return finish(classify(record), client);
          return finish(await settle(record, receipt, client, proof), client);
        }, true);
        return shown(result?.value ?? peek());
      },
      /**
       * The app's Safe follower ended without proof (its watch gave up, or
       * the service lost the proposal). `proposalHash`, when given, must name
       * the held one. It is held with the exit at once, through reloads;
       * authenticated evidence that arrives later still settles it.
       */
      async onUnproven(
        client: WriteHoldClient,
        proposalHash?: Hex,
      ): Promise<WriteHoldState> {
        const result = await locked(async () => {
          const record = recovery.read();
          if (
            record?.safe &&
            record.hash &&
            (proposalHash === undefined ||
              proposalHash.toLowerCase() === record.hash)
          )
            recovery.unprovenEnd(record);
          return inspect(client);
        }, true);
        return shown(result?.value ?? peek());
      },
      /**
       * Attach a hash the chain authenticates as this exact call, sent by the
       * account on the reservation's chain at or after its next nonce, and
       * not mined before it was reserved, to the held write that has none: under
       * one lock, without releasing it. The hold then follows that hash: no
       * exit while it is pending, and its receipt settles it.
       */
      /**
       * Move a write a previous deploy kept (outside these holds) into this
       * hold. `snapshot` is the state the app read before deciding. Under
       * the call's lock, it reserves a held record with `evidence` (the
       * account's next nonce, or the nonce it was sent at, with the block it
       * was read at; when it was sent; and its `hash`, or for a Safe write
       * `safe.safeTxHash`) only while nothing is held and no reservation
       * came since `snapshot`: another tab's hold or settlement wins, and
       * the current state is returned unchanged. A hash is checked first
       * with `client`: a transaction that is another call, from another
       * account or on another chain (or a Safe proposal of another call) is
       * refused, adopting nothing. One the chain can't show is held, with
       * the warned exit 30 minutes after it was sent (or adopted). Then the
       * gate reads it: a mined one settles on its verified receipt. It never
       * sends or releases; adopting twice holds once.
       */
      async adopt(
        snapshot: WriteHoldState,
        evidence: {
          nonce?: number | bigint;
          sentNonce?: number | bigint;
          fromBlock?: bigint;
          submittedAt?: number;
          hash?: Hex;
          safe?: { safeTxHash: Hex };
        } = {},
        client?: WriteHoldClient,
      ): Promise<WriteHoldState & { declined?: "refused" | "unreadable" }> {
        const nonce = evidence.nonce ?? evidence.sentNonce;
        const hash = (
          call.safe ? evidence.safe?.safeTxHash : evidence.hash
        )?.toLowerCase() as Hex | undefined;
        /** Nothing held, and no reservation since the app's read. */
        const free = () =>
          snapshot.status === "clear" &&
          !recovery.read() &&
          recovery.latestReservation() === snapshot.reservation;
        const reserve = () =>
          recovery.reserve(
            undefined,
            nonce !== undefined && evidence.fromBlock !== undefined
              ? { nonce, blockNumber: evidence.fromBlock }
              : undefined,
            {
              hash,
              submittedAt:
                evidence.submittedAt === undefined
                  ? undefined
                  : String(evidence.submittedAt),
            },
          );
        if (hooks.across) {
          // Under an intent: the same atomic reserve as a send, under every
          // legacy key's lock, mirrored at each so older versions see it.
          if (!free()) return shown(peek());
          const verdict =
            hash === undefined ? "yes" : await adoptable(hash, client);
          if (verdict !== "yes") return { ...shown(peek()), declined: verdict };
          let adopted = false;
          let busy = false;
          try {
            const { released } = await hooks.across(
              (work) => recovery.withLock(work),
              () => {
                if (!free()) throw new Error("Held since the app's read.");
                reserve();
                adopted = true;
              },
              recovery.rejected,
              Promise.resolve(),
              hooks.generations!(),
            );
            await released;
          } catch (error) {
            // Held elsewhere or no longer free: what the hold shows. Busy: unread.
            busy = error instanceof WriteHoldBusyError;
          }
          // A mined hash settles on its verified receipt, through the gate.
          if (adopted && hash && client) return state(client);
          const now = shown(peek());
          return busy && now.status === "clear"
            ? { ...now, declined: "unreadable" }
            : now;
        }
        const result = await locked(async () => {
          if (!free()) return peek();
          const verdict =
            hash === undefined ? "yes" : await adoptable(hash, client);
          if (verdict !== "yes") return { ...peek(), declined: verdict };
          reserve();
          return hash && client ? inspect(client) : peek();
        }, true);
        if (!result) return { ...shown(peek()), declined: "unreadable" };
        const { declined, ...answer } = result.value as WriteHoldState & {
          declined?: "refused" | "unreadable";
        };
        return {
          ...shown(answer as WriteHoldState),
          ...(declined ? { declined } : {}),
        };
      },
      /**
       * Save the Safe nonce of a held Safe proposal adopted before it was
       * known, so a replacement can be proven later. Under the call's lock,
       * only while the held proposal is `safeTxHash` with no nonce yet, and
       * only when the call's proposal at `nonce` hashes to it: the hash is
       * the proof. Then the gate reads it. Never sends or releases.
       */
      async attachSafeNonce(
        client: WriteHoldClient,
        { safeTxHash, nonce }: { safeTxHash: Hex; nonce: number },
      ): Promise<WriteHoldState> {
        const result = await locked(async () => {
          const record = recovery.read();
          if (
            record?.safe &&
            !record.mirrorOf &&
            record.safeNonce === undefined &&
            record.hash === safeTxHash.toLowerCase()
          )
            try {
              canonicalSafeTxHash(
                call.chainId,
                call.account,
                heldSafeProposal(call, nonce),
                safeTxHash,
              );
              recovery.proposalNonce(record, BigInt(nonce));
            } catch {
              /* Not this proposal at that nonce: nothing saved. */
            }
          return inspect(client);
        }, true);
        return shown(result?.value ?? peek());
      },
      /**
       * The user acknowledged a success the hold settled while they were
       * away: its saved settlement is forgotten, for every reader, so the
       * action can be sent again. Under the call's lock; nothing is sent.
       */
      async acknowledge(settled: {
        result: "success" | "failed";
        hash: Hex;
      }): Promise<WriteHoldState> {
        const result = await locked(async () => {
          recovery.forgetSettled(settled);
          return peek();
        }, true);
        return shown(result?.value ?? peek());
      },
      async attachHash(
        client: WriteHoldClient,
        hash: Hex,
      ): Promise<WriteHoldState> {
        const result = await locked(async () => {
          const record = recovery.read();
          if (
            record &&
            !record.safe &&
            !record.hash &&
            !record.mirrorOf &&
            isBytes32(hash) &&
            (await client.getChainId().catch(() => null)) === record.chainId
          ) {
            const sent = await client
              .getTransaction({ hash })
              .catch(() => null);
            if (
              sent &&
              sentIsCall(sent, hash, record) &&
              // This attempt, not an earlier identical call: never below the
              // account's next nonce or mined before it was reserved.
              // With no such evidence, an identical earlier call can't be
              // told apart: nothing is attached, and the exit stays.
              record.nonce !== undefined &&
              record.fromBlock !== undefined &&
              BigInt(sent.nonce) >= BigInt(record.nonce) &&
              (sent.blockNumber === null ||
                sent.blockNumber >= BigInt(record.fromBlock))
            )
              try {
                recovery.submitted(hash, record);
              } catch {
                /* Kept in this tab's memory, it still holds. */
              }
          }
          return inspect(client);
        }, true);
        return shown(result?.value ?? peek());
      },
      /**
       * The app's word that the held Safe proposal ran, with its execution's
       * transaction when known. Nothing is saved as executed on its word:
       * the hash is kept as a candidate, and settles it only once its own
       * receipt proves this Safe's execution of the exact proposal or call.
       */
      async onExecuted(
        client: WriteHoldClient,
        executionHash?: Hex,
      ): Promise<WriteHoldState> {
        const result = await locked(async () => {
          const record = recovery.read();
          if (!record?.safe || !record.hash)
            return finish(classify(record), client);
          if (executionHash) {
            // Authenticated on arrival: its own receipt settles it, or proves
            // it isn't this write's; only an unresolved one is kept.
            const receipt = await client
              .getTransactionReceipt({ hash: executionHash })
              .catch(() => null);
            if (receipt) {
              const settled = await settle(record, receipt, client);
              if (
                settled.status === "clear" ||
                settled.status === "ran-executed"
              )
                return settled;
            }
            if (!receipt || !(await disproves(record, receipt, client)))
              recovery.candidate(record, executionHash);
          }
          return inspect(client);
        }, true);
        return shown(result?.value ?? peek());
      },
    };
  }

  /**
   * `legacy`: for a write held under an intent namespace, the keys an earlier
   * version held it under (an old namespace, or `{ call }` for an exact
   * call); the current exact call is always checked. `{ match: { to,
   * selector } }` finds them instead: every exact-call write this account
   * saved on this chain to `to` with that 4-byte selector, for a hold saved
   * before the intent key existed under calldata the retry can't rebuild (an
   * old minimum, expiration or deadline). Pass one only for a write whose
   * calldata is volatile: it holds every such call. It is found when the
   * handle opens, and again right before a send reserves. While any of them holds
   * an unresolved write, the intent handle *is* that hold: its state, its
   * refusal and its own exit, in place. Each is checked alone, under its own
   * lock only, never two at once. Only when all are clear does the intent's
   * own record apply, and only then can a send reserve; they are checked
   * again right before it does.
   */
  function open(
    call: ReviewedWriteRecoveryInput,
    {
      legacy = [],
    }: {
      legacy?: (
        | string
        | { call: ReviewedWriteRecoveryInput["call"] }
        | { match: { to: Address; selector: Hex } }
      )[];
    } = {},
  ) {
    if (call.namespace === undefined) return openExact(call);
    const matches = legacy.flatMap((source) =>
      typeof source === "object" && "match" in source ? [source.match] : [],
    );
    /** Every exact-call write the matches find in storage now. */
    const matched = () =>
      matches.flatMap((match) =>
        findReviewedWrites(
          { chainId: call.chainId, account: call.account, ...match },
          { storage },
        ),
      );
    const namespace = call.namespace;
    const own = openOne(call, {
      across: reserveAcross,
      generations: () => generations(),
    });
    const ownJournal = createBrowserWriteRecovery(call, { storage });
    /** Every involved key's latest reservation id, its generation. */
    const generations = () =>
      JSON.stringify(
        [ownJournal, ...journals].map((journal) => journal.latestReservation()),
      );
    const { namespace: _, ...exact } = call;
    const scopeOf = (input: ReviewedWriteRecoveryInput) =>
      createBrowserWriteRecovery(input, { storage }).scopeKey;
    const scopes = new Set([scopeOf(call)]);
    /**
     * The keys a match found: only true pre-intent exact-call records hold
     * there. Any intent's mirror is skipped (each intent's own namespace
     * holds its writes), and none is written there.
     */
    const matchedKeys = new Set<string>();
    /** Whether `journal`'s record holds this intent: never its own mirror, nor any mirror at a matched key. */
    const holds = (journal: (typeof journals)[number]) => {
      const record = journal.read();
      return (
        !!record &&
        record.mirrorOf !== namespace &&
        !(record.mirrorOf !== undefined && matchedKeys.has(journal.scopeKey))
      );
    };
    // Mirror-aware: evidence and exits always act on the source attempt.
    const delegates: ReturnType<typeof openExact>[] = [];
    const journals: ReturnType<typeof createBrowserWriteRecovery>[] = [];
    /** Hold `inputs` too, each once, in one canonical order by scope for every writer's locks. */
    function include(
      inputs: { input: ReviewedWriteRecoveryInput; at?: string }[],
    ) {
      const added = inputs.filter(({ input, at }) => {
        const scope = at ?? scopeOf(input);
        return !scopes.has(scope) && !!scopes.add(scope);
      });
      if (!added.length) return;
      const keyed = [
        ...delegates.map((delegate, index) => ({
          delegate,
          journal: journals[index],
        })),
        ...added.map(({ input, at }) => ({
          delegate: openExact(input, at),
          journal: createBrowserWriteRecovery(input, {
            storage,
            locks: options.locks,
            at,
          }),
        })),
      ].sort(
        (a, b) =>
          Number(a.journal.scopeKey > b.journal.scopeKey) -
          Number(a.journal.scopeKey < b.journal.scopeKey),
      );
      delegates.splice(0, delegates.length, ...keyed.map((k) => k.delegate));
      journals.splice(0, journals.length, ...keyed.map((k) => k.journal));
    }
    /**
     * Look for matching writes again (on every state(), send() and exit());
     * those found since are held too, each at the exact key it was found
     * under, with its own Safe flag. Returns the ones that are new.
     */
    function rescan(): ReviewedWriteRecoveryRecord[] {
      const found = matched().filter(({ key }) => !scopes.has(key));
      for (const { key } of found) matchedKeys.add(key);
      include(
        found.map(({ key, record }) => ({
          input: { ...exact, safe: record.safe, call: record.call },
          at: key,
        })),
      );
      return found.map(({ record }) => record);
    }
    include(
      [{ call: call.call }, ...legacy].flatMap((source) =>
        typeof source === "string"
          ? [{ input: { ...call, namespace: source } }]
          : "call" in source
            ? [{ input: { ...exact, call: source.call } }]
            : [],
      ),
    );
    rescan();
    /** A legacy key holding anything but this intent's own mirror. */
    const foreign = (index: number) =>
      holds(journals[index]) && delegates[index].peek().status !== "clear";
    /** The legacy hold the intent stands for right now, from storage alone. */
    const active = () => delegates.find((_, index) => foreign(index));
    /** The first legacy key holding an unresolved write, through its own gate. */
    async function delegated(
      client: WriteHoldClient,
    ): Promise<WriteHeldState | null> {
      rescan();
      for (const [index, handle] of delegates.entries()) {
        if (!foreign(index)) continue;
        const state = await handle.state(client);
        if (state.status !== "clear") return state;
      }
      return null;
    }
    /**
     * The final check and reservation, under every legacy key's lock taken
     * in one sorted order (the intent's own is held by its send), each
     * without waiting: a key another writer holds refuses as busy. A legacy
     * hold refuses; otherwise the intent reserves, and mirrors itself at each
     * legacy key so its readers, older versions included, see it held.
     */
    async function reserveAcross(
      ownLock: <T>(work: () => Promise<T>) => Promise<T>,
      reserve: () => void,
      unreserve: () => void,
      until: Promise<void>,
      reviewed: string,
    ): Promise<{ released: Promise<void>; unsent: () => void }> {
      const locks = [
        { scope: scopeOf(call), take: ownLock },
        ...journals.map((journal) => ({
          scope: journal.scopeKey,
          take: <T>(work: () => Promise<T>) => journal.withLock(work),
        })),
      ].sort((a, b) => Number(a.scope > b.scope) - Number(a.scope < b.scope));
      const deadline = Date.now() + RESERVE_RETRY_MS;
      /**
       * Removes this reservation's mirrors, each by its id, while its locks
       * are held: after a failed mirror write, or once the app reports the
       * send never reached the wallet.
       */
      let unsent!: () => void;
      for (;;) {
        let entered = 0;
        let reserved!: () => void;
        const done = new Promise<void>((resolve) => (reserved = resolve));
        const acquire = async (index: number): Promise<void> => {
          if (index < locks.length)
            return locks[index].take(async () => {
              entered += 1;
              return acquire(index + 1);
            });
          const refuse = (held: ReviewedWriteRecoveryRecord) =>
            new WriteHeldError(
              noticed({
                ...ungated(classify(held)),
                reservation: held.id,
              }) as WriteHeldState,
            );
          for (const journal of journals) {
            const held = journal.read();
            if (held && holds(journal)) throw refuse(held);
          }
          // A matching write saved since the last look holds it too, and
          // its own state() and exit() are reached from now on.
          const [late] = rescan();
          if (late) throw refuse(late);
          // Another attempt since this review opened: review it again.
          if (generations() !== reviewed)
            throw new WriteHoldStaleReviewError(ownJournal.settled());
          reserve();
          const record = (own.peek() as WriteHeldState).record;
          // Every mirror is saved, in the store the hold itself uses (its
          // memory fallback included), before the wallet opens; otherwise
          // this unsent reservation and its partial mirrors are undone.
          const mirrors: [
            (typeof journals)[number],
            ReviewedWriteRecoveryRecord,
          ][] = [];
          unsent = () => {
            for (const [journal, mirror] of mirrors.splice(0))
              try {
                journal.clear(mirror);
              } catch {
                /* Held for old readers until their explicit exit. */
              }
          };
          try {
            for (const journal of journals)
              if (!matchedKeys.has(journal.scopeKey))
                mirrors.push([journal, journal.mirror(record, namespace)]);
          } catch (error) {
            unsent();
            try {
              unreserve();
            } catch {
              /* Unsent, it stays held with its explicit exit. */
            }
            throw error;
          }
          // Reserved: every lock is kept until the send ends.
          reserved();
          await until;
        };
        const holding = acquire(0);
        const failed = await Promise.race([
          done.then(() => null),
          holding.then(
            () => null,
            (error: unknown) => ({ error }),
          ),
        ]);
        if (!failed) return { released: holding.catch(() => {}), unsent };
        // Not reserved: every lock, its own included, is let go before any
        // retry; the checks run again each time.
        const { error } = failed;
        if (
          entered === locks.length ||
          error instanceof WriteHeldError ||
          error instanceof WriteHoldStaleReviewError
        )
          throw error;
        if (Date.now() >= deadline) throw new WriteHoldBusyError();
        await new Promise((resolve) =>
          setTimeout(resolve, 25 + Math.random() * 75),
        );
      }
    }
    /** Remove this intent's mirrors of the reservation that ended, by its id only. */
    async function clearMirrors(ended: string): Promise<void> {
      for (const journal of journals) {
        if (journal.read()?.id !== ended) continue;
        await journal
          .withLock(async () => {
            const current = journal.read();
            if (current?.mirrorOf === namespace && current.id === ended)
              journal.clear(current);
          })
          .catch(() => {
            /* Kept for old readers until their explicit exit. */
          });
      }
    }
    /** After a call that ended this intent's reservation, its mirrors go. */
    const after = async <T extends WriteHoldState>(value: T): Promise<T> => {
      if (value.status === "clear" && value.reservation)
        await clearMirrors(value.reservation);
      return value;
    };
    return {
      ...own,
      peek: () => active()?.peek() ?? own.peek(),
      async state(
        client: WriteHoldClient,
        checks?: { effect?: (chainId: number) => Promise<boolean> },
      ): Promise<WriteHoldState> {
        return (
          (await delegated(client)) ?? after(await own.state(client, checks))
        );
      },
      async send<T>(
        client: WriteHoldClient,
        run: (gate: WriteHoldGate) => Promise<T>,
      ): Promise<T> {
        const held = await delegated(client);
        if (held) throw new WriteHeldError(held);
        return own.send(client, run);
      },
      async exit(
        snapshot: WriteHoldState,
        acknowledgement: { checkedWallet: true },
        client: WriteHoldClient,
      ): Promise<{ released: boolean; state: WriteHoldState }> {
        rescan();
        const owner =
          snapshot.status === "clear"
            ? undefined
            : delegates.find((handle, index) => {
                const now = handle.peek();
                return (
                  foreign(index) &&
                  now.status !== "clear" &&
                  now.record.id === snapshot.record.id
                );
              });
        if (owner) return owner.exit(snapshot, acknowledgement, client);
        const held = await delegated(client);
        if (held) return { released: false, state: held };
        const ended = await own.exit(snapshot, acknowledgement, client);
        await after(ended.state);
        return ended;
      },
      onReceipt: async (...args: Parameters<typeof own.onReceipt>) =>
        active()?.onReceipt(...args) ?? after(await own.onReceipt(...args)),
      onUnproven: async (...args: Parameters<typeof own.onUnproven>) =>
        active()?.onUnproven(...args) ?? after(await own.onUnproven(...args)),
      onExecuted: async (...args: Parameters<typeof own.onExecuted>) =>
        active()?.onExecuted(...args) ?? after(await own.onExecuted(...args)),
      attachHash: async (...args: Parameters<typeof own.attachHash>) =>
        active()?.attachHash(...args) ?? after(await own.attachHash(...args)),
      attachSafeNonce: async (
        ...args: Parameters<typeof own.attachSafeNonce>
      ) =>
        active()?.attachSafeNonce(...args) ??
        after(await own.attachSafeNonce(...args)),
      // A legacy hold already holds it: nothing is adopted.
      adopt: async (...args: Parameters<typeof own.adopt>) =>
        active()?.peek() ?? after(await own.adopt(...args)),
    };
  }

  /**
   * An exact-call handle. When its key holds a mirror of an intent's write,
   * it is that intent's hold: it never sends or releases on its own, and its
   * exit is the intent's. A mirror left after the intent ended is removed.
   */
  function openExact(call: ReviewedWriteRecoveryInput, at?: string) {
    const own = openOne(call, {}, at);
    const journal = createBrowserWriteRecovery(call, {
      storage,
      locks: options.locks,
      at,
    });
    /** The intent this key mirrors, from storage alone. */
    const mirrored = () => {
      const record = journal.read();
      return record?.mirrorOf
        ? { record, intent: openOne({ ...call, namespace: record.mirrorOf }) }
        : undefined;
    };
    /** Remove a mirror whose intent holds nothing any more. */
    async function clearStale(found: {
      record: ReviewedWriteRecoveryRecord;
    }): Promise<void> {
      await journal
        .withLock(async () => {
          const current = journal.read();
          if (current?.id === found.record.id) journal.clear(current);
        })
        .catch(() => {
          /* The stale mirror still holds; its intent is clear. */
        });
    }
    /** The intent's state while it holds anything: this key is its mirror. */
    async function intentState(
      client: WriteHoldClient,
    ): Promise<WriteHeldState | null> {
      const found = mirrored();
      if (!found) return null;
      const state = await found.intent.state(client);
      if (state.status !== "clear") return state;
      await clearStale(found);
      return null;
    }
    /** The intent in charge, from storage alone. */
    const route = () => {
      const found = mirrored();
      return found && found.intent.peek().status !== "clear"
        ? found.intent
        : undefined;
    };
    return {
      ...own,
      peek: () => route()?.peek() ?? own.peek(),
      async state(
        client: WriteHoldClient,
        checks?: { effect?: (chainId: number) => Promise<boolean> },
      ): Promise<WriteHoldState> {
        return (await intentState(client)) ?? own.state(client, checks);
      },
      async send<T>(
        client: WriteHoldClient,
        run: (gate: WriteHoldGate) => Promise<T>,
      ): Promise<T> {
        const held = await intentState(client);
        if (held) throw new WriteHeldError(held);
        return own.send(client, run);
      },
      async exit(
        snapshot: WriteHoldState,
        acknowledgement: { checkedWallet: true },
        client: WriteHoldClient,
      ): Promise<{ released: boolean; state: WriteHoldState }> {
        const found = mirrored();
        if (!found || found.intent.peek().status === "clear")
          return own.exit(snapshot, acknowledgement, client);
        const ended = await found.intent.exit(
          snapshot,
          acknowledgement,
          client,
        );
        if (ended.released) await clearStale(found);
        return ended;
      },
      onReceipt: (...args: Parameters<typeof own.onReceipt>) =>
        (route() ?? own).onReceipt(...args),
      onUnproven: (...args: Parameters<typeof own.onUnproven>) =>
        (route() ?? own).onUnproven(...args),
      onExecuted: (...args: Parameters<typeof own.onExecuted>) =>
        (route() ?? own).onExecuted(...args),
      attachHash: (...args: Parameters<typeof own.attachHash>) =>
        (route() ?? own).attachHash(...args),
      attachSafeNonce: (...args: Parameters<typeof own.attachSafeNonce>) =>
        (route() ?? own).attachSafeNonce(...args),
      // An intent's mirror already holds it: nothing is adopted.
      adopt: async (...args: Parameters<typeof own.adopt>) =>
        route()?.peek() ?? own.adopt(...args),
    };
  }
  /**
   * Every write held for `account` on `chainId`, with a handle to each at
   * the key it was saved under: for an app-wide notice of everything held,
   * whatever action made it. Read from storage alone; each handle's state()
   * is the gated answer.
   */
  function list({ account, chainId }: { account: Address; chainId: number }) {
    return listReviewedWrites({ account, chainId }, { storage }).map(
      ({ key, record }) => {
        const input: ReviewedWriteRecoveryInput = {
          chainId: record.chainId,
          account: record.account,
          safe: record.safe,
          call: record.call,
        };
        const handle: ReturnType<typeof open> =
          record.namespace === undefined
            ? openExact(input, key)
            : open({ ...input, namespace: record.namespace });
        return { key, record, handle };
      },
    );
  }

  return {
    open,
    list,
    /** Whether holds outlive this tab right now. */
    durable: () => storage.durable(),
    /** The review's line while holds last only in this tab, or null. */
    reviewLine: () => (storage.durable() ? null : WRITE_HOLD_IN_TAB_LINE),
    /** Stop every settle poll and the tab listener (tests, teardown). */
    dispose,
  };
}

export type WriteHold = ReturnType<typeof createWriteHold>;
export type WriteHoldHandle = ReturnType<WriteHold["open"]>;
