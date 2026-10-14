import {
  isAddress,
  toEventSelector,
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
  writeHeldMessage,
} from "./messages.js";
import {
  createBrowserWriteRecovery,
  createHeldWriteStorage,
  findTransactionAtNonce,
  readReviewedWriteNonce,
  SubmittedWritePersistenceError,
  verifyReviewedWriteExpiry,
  verifyReviewedWriteReceipt,
  type HeldWriteStorage,
  type ReviewedWriteRecoveryInput,
  type ReviewedWriteRecoveryRecord,
} from "./writeRecovery.js";
import { isBytes32 } from "../untrusted.js";
import { atCanonicalFinalizedBlock } from "./relayr.js";

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
 * - `held-unchecked`: a saved hash the node doesn't know, on a record saved
 *   with no nonce to check, or 30 minutes after the wallet returned it (or,
 *   for a record saved before that time was kept, after it was first read). The
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
export type WriteHoldState =
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
export type WriteHeldState = Exclude<WriteHoldState, { status: "clear" }>;

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
/** A Safe's execution events, in its 1.3 and 1.4 layouts alike. */
const SAFE_EXECUTION_TOPICS = [
  toEventSelector("ExecutionSuccess(bytes32,uint256)"),
  toEventSelector("ExecutionFailure(bytes32,uint256)"),
];
/** A hash the network still hasn't seen this long after the wallet returned it was almost certainly never broadcast. */
const UNSEEN_HASH_MS = 30 * 60_000;

/** The 30 minutes have passed since the wallet returned the hash, or since it was first read. A clock that couldn't be saved (NaN) never runs out. */
function unseenTooLong(record: ReviewedWriteRecoveryRecord): boolean {
  return (
    Date.now() - Number(record.submittedAt ?? record.firstSeenAt) >=
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

function clear(settled?: WriteHoldSettled): WriteHoldState {
  return settled ? { status: "clear", settled } : { status: "clear" };
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
  const interval = options.settle?.intervalMs ?? SETTLE_POLL_MS;
  const attempts = options.settle?.attempts ?? SETTLE_POLL_ATTEMPTS;
  const listeners = new Map<string, Set<(state: WriteHoldState) => void>>();
  const peekers = new Map<string, () => WriteHoldState>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  let onStorage: ((event: StorageEvent) => void) | undefined;

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
      if (event.key && !event.key.startsWith("nana-sdk:reviewed-write")) return;
      for (const [key, peek] of peekers) {
        try {
          emit(key, peek());
        } catch {
          /* An unreadable record is shown at its next state(). */
        }
      }
    };
    globalThis.addEventListener("storage", onStorage);
  }

  function open(call: ReviewedWriteRecoveryInput) {
    const recovery = createBrowserWriteRecovery(call, {
      storage,
      locks: options.locks,
    });
    // The canonical recovery scope: a namespace and an exact call never share it.
    const key = recovery.scopeKey;
    /** The effect read the last state() was given: the exit asks it again. */
    let lastEffect: ((chainId: number) => Promise<boolean>) | undefined;
    /** Nothing held: how the call's last write settled, if saved. */
    const cleared = () => clear(recovery.settled());
    const peek = () => {
      const record = recovery.read();
      return record ? ungated(classify(record)) : cleared();
    };
    const shown = (state: WriteHoldState) => (emit(key, state), state);

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
        return clear(settled);
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

    /** The authenticated nonce of a Safe proposal, from Safe's service. */
    async function proposalNonceOf(
      record: ReviewedWriteRecoveryRecord,
    ): Promise<bigint | null> {
      try {
        const proposal = await readSafeTransaction(
          record.chainId,
          record.account,
          record.hash!,
          options.safeService,
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
        return { ...state, record: recovery.mined(state.record, false) };
      const record =
        look === "mined" ? recovery.mined(state.record, true) : state.record;
      if (record.minedAt === undefined) return state;
      if (Date.now() - Number(record.minedAt) >= UNSEEN_HASH_MS)
        return unchecked(record);
      return { ...state, record, line: WRITE_HOLD_MINED_LINE };
    }

    /** What the node shows of `hash`: positive pending or mined metadata, or nothing it can say. */
    async function lookAt(
      hash: Hex,
      client: WriteHoldClient,
    ): Promise<"pending" | "mined" | null> {
      const sent = await client.getTransaction({ hash }).catch(() => null);
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
        if (look !== null)
          record = own
            ? recovery.mined(record, look === "mined")
            : recovery.candidateMined(record, hash, look === "mined");
        const at = own ? record.minedAt : record.candidateMinedAt?.[hash];
        if (
          look === "pending" ||
          (at !== undefined && Date.now() - Number(at) < UNSEEN_HASH_MS)
        )
          return {
            status: "pending-known-hash",
            record,
            hash,
            exit: false,
            line:
              look === "pending"
                ? WRITE_HOLD_PENDING_LINE
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
          options.safeService,
        ));
      // Another Safe transaction took its nonce, even after a saved execution
      // was reorganized away. It may have run the call too: the exit, never a release.
      if (end.look === "replaced")
        return safeReplaced(recovery.replacedOnChain(record));
      if (end.look === "expired" && !record.executed) {
        const expired = await verifyReviewedWriteExpiry(
          client,
          record,
          options.safeService,
        ).catch(() => false);
        if (expired && release(record)) return clear({ result: "expired" });
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
          return clear(settled);
        }
      }
      if (
        !record.executed &&
        !record.unproven &&
        record.safeNonce === undefined &&
        unseenTooLong(record)
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
        (record.nonce === undefined ||
          record.fromBlock === undefined ||
          unseenTooLong(record)) &&
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
      return shown(result ? result.value : peek());
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
            JSON.stringify(
              state.status === "clear" ? (state.settled ?? null) : state.record,
            );
          listener(ungated(identity(now) === identity(last) ? last : now));
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
            try {
              attempt = recovery.reserve(actualCall, evidence);
            } catch (error) {
              const now = await finish(classify(recovery.read()), client);
              shown(now);
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
            attempt = undefined;
            shown(peek());
          },
        };
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
          return { released: true, state: clear() };
        }, true);
        const ended = result?.value ?? { released: false, state: peek() };
        shown(ended.state);
        return ended;
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
            isBytes32(hash) &&
            (await client.getChainId().catch(() => null)) === record.chainId
          ) {
            const sent = await client
              .getTransaction({ hash })
              .catch(() => null);
            if (
              sent?.hash?.toLowerCase() === hash.toLowerCase() &&
              sent.from?.toLowerCase() === record.account &&
              (sent.chainId === undefined || sent.chainId === record.chainId) &&
              sent.to?.toLowerCase() === record.call.to &&
              sent.input?.toLowerCase() === record.call.data &&
              BigInt(sent.value) === BigInt(record.call.value) &&
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

  return {
    open,
    /** Whether holds outlive this tab right now. */
    durable: () => storage.durable(),
    /** The review's line while holds last only in this tab, or null. */
    reviewLine: () => (storage.durable() ? null : WRITE_HOLD_IN_TAB_LINE),
    /** Stop every settle poll and the tab listener (tests, teardown). */
    dispose() {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
      if (onStorage) globalThis.removeEventListener?.("storage", onStorage);
      onStorage = undefined;
    },
  };
}

export type WriteHold = ReturnType<typeof createWriteHold>;
export type WriteHoldHandle = ReturnType<WriteHold["open"]>;
