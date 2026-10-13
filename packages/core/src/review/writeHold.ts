import type { Hex, PublicClient, TransactionReceipt } from "viem";
import {
  lookAtSafeProposalEnd,
  SAFE_PROPOSAL_AWAITING,
  type SafeServiceOptions,
} from "../safeService.js";
import {
  SAFE_PROPOSAL_EXECUTED_LINE,
  WRITE_HOLD_IN_TAB_LINE,
  WRITE_HOLD_NONCE_LINE,
  WRITE_HOLD_PENDING_LINE,
  WRITE_HOLD_UNCHECKED_LINE,
  WRITE_HOLD_REVERTED_LINE,
  writeHeldMessage,
} from "./messages.js";
import {
  createBrowserWriteRecovery,
  createHeldWriteStorage,
  readReviewedWriteNonce,
  SubmittedWritePersistenceError,
  verifyReviewedWriteExpiry,
  verifyReviewedWriteReceipt,
  type HeldWriteStorage,
  type ReviewedWriteRecoveryInput,
  type ReviewedWriteRecoveryRecord,
} from "./writeRecovery.js";

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
  /** The app's effect read showed it ran; a Safe proposal another transaction replaced, or that expired unrun. */
  | { result: "ran" | "replaced" | "expired" };

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
 * - `clear`: nothing is held; `settled` says how a hold just ended;
 * - `pending-known-hash`: its saved hash (or Safe proposal) can still run. No
 *   exit: the wallet speeds it up or cancels it;
 * - `held-no-hash`: the wallet never returned a hash. The exit is offered;
 * - `dropped-proven`: the node doesn't know the saved hash and a canonical
 *   finalized block shows another transaction ran at the nonce it was
 *   actually sent at (`sentNonce`, from its authenticated transaction; the
 *   nonce read before the wallet opened only locates the call). The exit is
 *   offered;
 * - `held-unchecked`: a saved hash the node doesn't know, on a record saved
 *   with no nonce to check, or 30 minutes after the wallet returned it. The
 *   exit is offered, with a line that says so; a hash that shows up later is
 *   followed as usual;
 * - `ran-executed`: the chain shows it ran (a Safe execution, or a revert
 *   not final yet). It is kept until its result settles it, and never offered
 *   a resend.
 */
export type WriteHoldState =
  | { status: "clear"; settled?: WriteHoldSettled }
  | Held<"pending-known-hash", { hash: Hex; exit: false }>
  | Held<"held-no-hash", { exit: true }>
  | Held<"dropped-proven", { hash: Hex; usedBy: Hex; exit: true }>
  | Held<"held-unchecked", { hash: Hex; exit: true }>
  | Held<
      "ran-executed",
      { executionHash?: Hex; result?: "failed"; exit: false }
    >;

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
  afterSubmit(hash: Hex): void;
  /** Nothing reached the wallet, or it refused: `onWriteRejected` and `onBeforeWriteAborted`. */
  onRejected(): void;
};

type Locks = Pick<LockManager, "request">;

const SETTLE_POLL_MS = 15_000;
/** A hash the network still hasn't seen this long after the wallet returned it was almost certainly never broadcast. */
const UNSEEN_HASH_MS = 30 * 60_000;
/** About an hour of polls; a later state() looks again. */
const SETTLE_POLL_ATTEMPTS = 240;

function listenerKey(call: ReviewedWriteRecoveryInput): string {
  const scope =
    call.namespace ??
    `${call.call.to}:${BigInt(call.call.value ?? 0)}:${call.call.data}`;
  return `${call.chainId}:${call.account}:${scope}`.toLowerCase();
}

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
  if (record.executed) return ranExecuted(record);
  if (!record.hash)
    return {
      status: "held-no-hash",
      record,
      exit: true,
      line:
        record.safe || record.nonce !== undefined
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
 *   proven replaced, or expired, releases.
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

  function emit(key: string, state: WriteHoldState) {
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
    const key = listenerKey(call);
    const peek = () => classify(recovery.read());
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
      if (verdict && release(record))
        return clear({
          result: verdict,
          hash: receipt.transactionHash.toLowerCase() as Hex,
        });
      if (
        !record.safe &&
        receipt.status === "reverted" &&
        receipt.transactionHash.toLowerCase() === record.hash
      ) {
        follow(client, record.id);
        return ranExecuted(record, record.hash, "failed");
      }
      if (record.executed) follow(client, record.id);
      return classify(recovery.read());
    }

    async function safeState(
      saved: ReviewedWriteRecoveryRecord,
      client: WriteHoldClient,
    ): Promise<WriteHoldState> {
      let record = saved;
      if (!record.hash) return classify(record);
      if (!record.executionHash) {
        // The wallet's reply may be the execution itself (run at once).
        const atOnce = record.executed
          ? null
          : await client
              .getTransactionReceipt({ hash: record.hash })
              .catch(() => null);
        if (atOnce) {
          const settled = await settle(record, atOnce, client);
          if (settled.status === "clear") return settled;
          // It ran; only its verified result (a failure at finality) ends it.
          record = recovery.executed(record, record.hash);
          follow(client, record.id);
          return ranExecuted(record);
        }
        const end = await lookAtSafeProposalEnd(
          client as never,
          record.chainId,
          record.account,
          record.hash,
          options.safeService,
        );
        if (end.look === "replaced" && !record.executed && release(record))
          return clear({ result: "replaced" });
        if (end.look === "expired" && !record.executed) {
          const expired = await verifyReviewedWriteExpiry(
            client,
            record,
            options.safeService,
          ).catch(() => false);
          if (expired && release(record)) return clear({ result: "expired" });
        }
        if (end.look === "executed")
          record = recovery.executed(record, end.execution?.executionHash);
        if (!record.executionHash) {
          if (record.executed) follow(client, record.id);
          return classify(record);
        }
      }
      const receipt = await client
        .getTransactionReceipt({ hash: record.executionHash })
        .catch(() => null);
      if (receipt) return settle(record, receipt, client);
      follow(client, record.id);
      return ranExecuted(record);
    }

    async function inspect(
      client: WriteHoldClient,
      effect?: (chainId: number) => Promise<boolean>,
    ): Promise<WriteHoldState> {
      let record = recovery.read();
      if (!record) return clear();
      // No evidence from another chain.
      if ((await client.getChainId().catch(() => null)) !== record.chainId)
        return classify(record);
      if (record.safe) return safeState(record, client);
      const check = await recovery
        .resolve(client, effect ? { effect } : undefined)
        .catch(() => null);
      if (check?.status === "ran") return clear({ result: "ran" });
      record = recovery.read();
      if (!record) return clear();
      if (check?.status === "sent") {
        const receipt = await client
          .getTransactionReceipt({ hash: check.hash })
          .catch(() => null);
        return receipt ? settle(record, receipt, client) : pendingHash(record);
      }
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
        };
      if (
        record.hash &&
        record.sentNonce === undefined &&
        (record.nonce === undefined ||
          Date.now() - Number(record.submittedAt ?? Date.now()) >=
            UNSEEN_HASH_MS) &&
        (await client.getTransaction({ hash: record.hash }).then(
          () => false,
          (error: { name?: unknown } | null) =>
            error?.name === "TransactionNotFoundError",
        ))
      )
        return {
          status: "held-unchecked",
          record,
          hash: record.hash,
          exit: true,
          line: WRITE_HOLD_UNCHECKED_LINE,
        };
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
      const result = await locked(() => inspect(client, checks.effect), false);
      return shown(result ? result.value : peek());
    }

    return {
      state,
      /** What the saved record alone says, without asking the chain. */
      peek,
      /** Every state this controller reads or makes for the call, and other tabs' changes. */
      subscribe(listener: (state: WriteHoldState) => void): () => void {
        let set = listeners.get(key);
        if (!set) listeners.set(key, (set = new Set()));
        set.add(listener);
        peekers.set(key, peek);
        watchTabs();
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
              const now = peek();
              if (now.status !== "clear") throw new WriteHeldError(now);
              throw error;
            }
            shown(peek());
          },
          afterSubmit(hash) {
            if (!attempt)
              throw new Error("Hold the write before the wallet opens.");
            try {
              attempt = recovery.submitted(hash, attempt);
            } catch (error) {
              if (!(error instanceof SubmittedWritePersistenceError))
                throw error;
              attempt = error.record;
            }
            shown(classify(attempt));
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
          const now = await inspect(client);
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
            return { released: false, state: peek() };
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
            return classify(record);
          return settle(record, receipt, client, proof);
        }, true);
        return shown(result?.value ?? peek());
      },
      /**
       * The app's own proof that the held Safe proposal ran, with its
       * execution's transaction when known. Kept until its result settles it.
       */
      async onExecuted(
        client: WriteHoldClient,
        executionHash?: Hex,
      ): Promise<WriteHoldState> {
        const result = await locked(async () => {
          const record = recovery.read();
          if (!record?.safe || !record.hash) return classify(record);
          recovery.executed(record, executionHash);
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
