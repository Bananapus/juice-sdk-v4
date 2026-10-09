import {
  isAddress,
  type Address,
  type Hex,
  type PublicClient,
  type TransactionReceipt,
} from "viem";
import {
  lookAtSafeProposal,
  readSafeAppExecution,
  readSafeTransaction,
  safeTransactionMatchesCall,
  type SafeServiceOptions,
} from "../safeService.js";
import { isBytes32, isHexBytes, uint256 } from "../untrusted.js";
import { atCanonicalFinalizedBlock } from "./relayr.js";

export type ReviewedWriteRecoveryInput = {
  chainId: number;
  account: Address;
  safe: boolean;
  call: { to: Address; data: Hex; value?: bigint | string };
};

export type ReviewedWriteRecoveryRecord = Omit<
  ReviewedWriteRecoveryInput,
  "call"
> & {
  version: 1;
  id: string;
  call: { to: Address; data: Hex; value: string };
  /** The identity returned by the wallet, never an inferred historical match. */
  hash?: Hex;
};

type RecoveryStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
type RecoveryLocks = Pick<LockManager, "request">;
// A returned hash must survive a component remount even when its durable update
// failed. It is visible only while the exact durable reservation still exists.
const unpersistedSubmissions = new WeakMap<
  RecoveryStorage,
  Map<string, ReviewedWriteRecoveryRecord>
>();

/** The wallet returned this identity, but storing it failed. Keep it in memory and retry submitted(hash, record). */
export class SubmittedWritePersistenceError extends Error {
  readonly name = "SubmittedWritePersistenceError";
  readonly record: ReviewedWriteRecoveryRecord;
  declare readonly cause: unknown;

  constructor(record: ReviewedWriteRecoveryRecord, cause: unknown) {
    super(
      "The wallet returned a transaction identity, but recovery storage is unavailable. Keep this transaction pending.",
    );
    this.record = recordOf(record);
    Object.defineProperty(this, "cause", { value: cause, configurable: true });
  }
}

function normalized(
  input: ReviewedWriteRecoveryInput,
): ReviewedWriteRecoveryInput & {
  call: ReviewedWriteRecoveryRecord["call"];
} {
  const value = uint256(input?.call?.value ?? 0n);
  if (
    !Number.isSafeInteger(input?.chainId) ||
    input.chainId <= 0 ||
    !isAddress(input?.account, { strict: false }) ||
    typeof input?.safe !== "boolean" ||
    !isAddress(input?.call?.to, { strict: false }) ||
    !isHexBytes(input?.call?.data) ||
    value === null
  )
    throw new Error("Invalid reviewed write recovery evidence.");
  return {
    chainId: input.chainId,
    account: input.account.toLowerCase() as Address,
    safe: input.safe,
    call: {
      to: input.call.to.toLowerCase() as Address,
      data: input.call.data.toLowerCase() as Hex,
      value: value.toString(),
    },
  };
}

function recordOf(value: unknown): ReviewedWriteRecoveryRecord {
  const record = value as ReviewedWriteRecoveryRecord | null;
  if (
    record?.version !== 1 ||
    typeof record.id !== "string" ||
    !record.id ||
    typeof record.call?.value !== "string" ||
    !/^(0|[1-9]\d*)$/.test(record.call.value) ||
    (record.hash !== undefined && !isBytes32(record.hash))
  )
    throw new Error(
      "Invalid saved write recovery record. Keep this action pending.",
    );
  return {
    version: 1,
    id: record.id,
    ...normalized(record),
    ...(record.hash === undefined
      ? {}
      : { hash: record.hash.toLowerCase() as Hex }),
  };
}

/** Validate an existing domain journal's recovered record with the shared storage rules. */
export { recordOf as parseReviewedWriteRecoveryRecord };

/** Amounts and quote changes must not evade an unresolved action. */
function scope(input: ReviewedWriteRecoveryInput): string {
  return `nana-sdk:reviewed-write:v1:${input.chainId}:${input.account}:${input.call.to}:${input.call.data.slice(0, 10)}`;
}

/** Exact reviewed evidence, independent of the reservation and submission identities. */
export function sameReviewedWrite(
  record: ReviewedWriteRecoveryRecord,
  input: ReviewedWriteRecoveryInput,
): boolean {
  return (
    JSON.stringify(normalized(record)) === JSON.stringify(normalized(input))
  );
}

/**
 * One ordinary-write reservation per account/chain/target/selector. Use the
 * existing domain journal instead when an action already has one. There is no
 * expiry or nonce-based release: an unknown broadcast remains unknown.
 *
 * Every mutation must run inside withLock, including receipt-based clearing.
 * Storage and native cross-tab exclusion are mandatory before opening a wallet.
 */
export function createBrowserWriteRecovery(
  input: ReviewedWriteRecoveryInput,
  options: { storage?: RecoveryStorage; locks?: RecoveryLocks } = {},
) {
  const reviewed = normalized(input);
  const key = scope(reviewed);
  let owned: ReviewedWriteRecoveryRecord | undefined;
  let locked = false;
  let lastStorage: RecoveryStorage | undefined;

  function storage(): RecoveryStorage {
    const store = options.storage ?? globalThis.localStorage;
    if (!store) throw new Error("Write recovery storage is unavailable.");
    lastStorage = store;
    return store;
  }
  function rememberSubmission(record: ReviewedWriteRecoveryRecord) {
    if (!lastStorage) return;
    let pending = unpersistedSubmissions.get(lastStorage);
    if (!pending)
      unpersistedSubmissions.set(lastStorage, (pending = new Map()));
    pending.set(key, recordOf(record));
  }
  function requireLock() {
    if (!locked)
      throw new Error("Write recovery changes require the browser lock.");
  }
  function readStored(raw: string | null): ReviewedWriteRecoveryRecord | null {
    if (raw === null) return null;
    const record = recordOf(JSON.parse(raw));
    if (scope(record) !== key)
      throw new Error("Saved write recovery scope does not match.");
    return record;
  }
  function read(): ReviewedWriteRecoveryRecord | null {
    const store = storage();
    const record = readStored(store.getItem(key));
    const memory = unpersistedSubmissions.get(store)?.get(key);
    if (
      !record ||
      !memory ||
      JSON.stringify({ ...record, hash: undefined }) !==
        JSON.stringify({ ...memory, hash: undefined }) ||
      (record.hash && record.hash !== memory.hash)
    )
      return record;
    if (record.hash) unpersistedSubmissions.get(store)?.delete(key);
    return recordOf(memory);
  }
  function persist(record: ReviewedWriteRecoveryRecord) {
    const raw = JSON.stringify(record);
    const store = storage();
    store.setItem(key, raw);
    if (store.getItem(key) !== raw)
      throw new Error("Write recovery storage did not retain the action.");
  }
  function clear(expected: ReviewedWriteRecoveryRecord): void {
    requireLock();
    // A volatile returned hash is useful for tracking, but is not a successful
    // durable commit. submitted(hash, record) must retry that commit first.
    const current = readStored(storage().getItem(key));
    if (!current) return;
    if (JSON.stringify(current) !== JSON.stringify(recordOf(expected))) {
      throw new Error(
        "Write recovery changed. Keep the current action pending.",
      );
    }
    const store = storage();
    store.removeItem(key);
    if (store.getItem(key) !== null)
      throw new Error("Write recovery storage did not clear the action.");
    unpersistedSubmissions.get(store)?.delete(key);
  }
  function rejected(): void {
    requireLock();
    // A rejection callback from another attempt must never release this one.
    if (!owned || owned.hash) return;
    const current = read();
    if (current?.id === owned.id && current.hash) return;
    clear(owned);
    owned = undefined;
  }

  return {
    read,
    reserve(
      actualCall?: ReviewedWriteRecoveryInput["call"],
    ): ReviewedWriteRecoveryRecord {
      requireLock();
      // A reused Safe proposal may have a different, already verified deadline.
      // Retain its actual call, without widening the unresolved-action scope.
      const actual = actualCall
        ? normalized({ ...reviewed, call: actualCall })
        : reviewed;
      if (scope(actual) !== key)
        throw new Error("The adopted write has a different recovery scope.");
      if (read())
        throw new Error(
          "An earlier wallet write is still unresolved. Check it before trying again.",
        );
      const record: ReviewedWriteRecoveryRecord = {
        version: 1,
        id: globalThis.crypto.randomUUID(),
        ...actual,
      };
      owned = recordOf(record);
      try {
        persist(record);
      } catch (error) {
        // The wallet has not been invoked. A failed readback may still have
        // stored this marker; clean only our exact reservation if readable.
        try {
          rejected();
        } catch {
          /* Retain ownership for a later cleanup. */
        }
        throw error;
      }
      return recordOf(record);
    },
    submitted(
      hash: Hex,
      expected: ReviewedWriteRecoveryRecord | undefined = owned,
    ): ReviewedWriteRecoveryRecord {
      requireLock();
      if (!isBytes32(hash))
        throw new Error("The wallet returned an invalid transaction identity.");
      const previous = expected && recordOf(expected);
      const submittedHash = hash.toLowerCase() as Hex;
      if (
        !previous ||
        scope(previous) !== key ||
        (previous.hash && previous.hash !== submittedHash)
      ) {
        throw new Error(
          "Write recovery changed before submission was recorded.",
        );
      }
      const submitted = { ...previous, hash: submittedHash };
      let raw: string | null;
      try {
        raw = storage().getItem(key);
      } catch (cause) {
        owned = submitted;
        rememberSubmission(submitted);
        throw new SubmittedWritePersistenceError(submitted, cause);
      }
      const current = readStored(raw);
      if (
        !current ||
        JSON.stringify({ ...current, hash: undefined }) !==
          JSON.stringify({ ...previous, hash: undefined }) ||
        (current.hash && current.hash !== submittedHash)
      ) {
        throw new Error(
          "Write recovery changed before submission was recorded.",
        );
      }
      owned = recordOf(submitted);
      if (!current.hash) {
        try {
          persist(submitted);
        } catch (cause) {
          rememberSubmission(submitted);
          throw new SubmittedWritePersistenceError(submitted, cause);
        }
      }
      if (lastStorage) unpersistedSubmissions.get(lastStorage)?.delete(key);
      return submitted;
    },
    rejected,
    clear,
    async withLock<T>(work: () => Promise<T>, wait = false): Promise<T> {
      const locks = options.locks ?? globalThis.navigator?.locks;
      if (!locks)
        throw new Error("This browser cannot safely coordinate wallet writes.");
      return locks.request(
        key,
        { mode: "exclusive", ...(!wait && { ifAvailable: true }) },
        async (lock) => {
          if (!lock)
            throw new Error(
              "This wallet action is already open in another tab.",
            );
          locked = true;
          try {
            return await work();
          } finally {
            locked = false;
          }
        },
      );
    },
  };
}

/** Minimal RPC reads; PublicClient instances for any chain satisfy this shape. */
export type ReviewedWriteReceiptClient = {
  getChainId(): Promise<number>;
  getTransaction(args: { hash: Hex }): Promise<{
    hash: Hex;
    chainId?: number;
    from: Address;
    to: Address | null;
    input: Hex;
    blockHash: Hex | null;
    blockNumber: bigint | null;
    transactionIndex: number | null;
  }>;
  getTransactionReceipt(args: { hash: Hex }): Promise<TransactionReceipt>;
  getBlock(args: {
    blockNumber: bigint;
  }): Promise<{ hash: Hex | null; number: bigint | null }>;
  getBlock(args: { blockTag: "finalized" }): Promise<{
    number: bigint | null;
    hash: Hex | null;
    timestamp: bigint;
  }>;
};

/**
 * Authenticate the saved wallet identity, canonical inclusion and Safe effect.
 * Ordinary wallet wrappers are allowed: the wallet's returned hash binds their
 * execution. A wallet-returned Safe proposal hash authenticates its execution
 * event even through a wrapper; an immediate execution hash additionally needs
 * exact reviewed calldata. A failure releases only after finality.
 * Throws on missing or inconsistent evidence; the caller retains its record.
 */
export async function verifyReviewedWriteReceipt(
  client: ReviewedWriteReceiptClient,
  saved: ReviewedWriteRecoveryRecord,
  receipt: TransactionReceipt,
  proof?: {
    calls: readonly ReviewedWriteRecoveryInput["call"][];
    batch?: boolean;
  },
): Promise<"success" | "failed"> {
  const record = recordOf(saved);
  const pending = () =>
    new Error(
      "The saved wallet write is not yet proven. Keep this action pending.",
    );
  let calls = [record.call];
  if (proof) {
    if (
      !record.safe ||
      !Array.isArray(proof.calls) ||
      !proof.calls.length ||
      (proof.batch !== undefined && typeof proof.batch !== "boolean")
    )
      throw pending();
    calls = proof.calls.map((call) => normalized({ ...record, call }).call);
    if (JSON.stringify(calls[0]) !== JSON.stringify(record.call))
      throw pending();
  }
  if (
    !record.hash ||
    !isBytes32(receipt?.transactionHash) ||
    (!record.safe && record.hash !== receipt.transactionHash.toLowerCase())
  )
    throw pending();
  const hash = receipt.transactionHash;
  const [chainId, transaction, canonical] = await Promise.all([
    client.getChainId(),
    client.getTransaction({ hash }),
    client.getTransactionReceipt({ hash }),
  ]);
  if (
    chainId !== record.chainId ||
    (transaction.chainId !== undefined &&
      transaction.chainId !== record.chainId) ||
    transaction.hash?.toLowerCase() !== hash.toLowerCase() ||
    canonical.transactionHash?.toLowerCase() !== hash.toLowerCase() ||
    !isBytes32(canonical.blockHash) ||
    canonical.blockHash.toLowerCase() !== receipt.blockHash?.toLowerCase() ||
    canonical.blockHash.toLowerCase() !==
      transaction.blockHash?.toLowerCase() ||
    typeof canonical.blockNumber !== "bigint" ||
    canonical.blockNumber < 0n ||
    canonical.blockNumber !== receipt.blockNumber ||
    canonical.blockNumber !== transaction.blockNumber ||
    !isAddress(transaction.from, { strict: false }) ||
    transaction.from.toLowerCase() !== canonical.from?.toLowerCase() ||
    transaction.to?.toLowerCase() !== canonical.to?.toLowerCase() ||
    !Number.isSafeInteger(transaction.transactionIndex) ||
    transaction.transactionIndex! < 0 ||
    transaction.transactionIndex !== canonical.transactionIndex ||
    canonical.status !== receipt.status ||
    (canonical.status !== "success" && canonical.status !== "reverted")
  )
    throw pending();

  let status: "success" | "failed" =
    canonical.status === "success" ? "success" : "failed";
  if (record.safe) {
    if (
      !Array.isArray(canonical.logs) ||
      canonical.logs.some(
        (log) =>
          log.removed !== false ||
          log.transactionHash?.toLowerCase() !== hash.toLowerCase() ||
          log.blockHash?.toLowerCase() !== canonical.blockHash.toLowerCase() ||
          log.blockNumber !== canonical.blockNumber ||
          log.transactionIndex !== canonical.transactionIndex,
      )
    )
      throw pending();
    const result = await readSafeAppExecution({
      client: { getTransaction: async () => transaction },
      receipt: canonical,
      safe: record.account,
      proposalHash: record.hash,
      calls,
      batch: proof?.batch,
    });
    // A reverted outer executor has not consumed the Safe proposal's nonce.
    if (result.status !== "success" && result.status !== "failed")
      throw pending();
    status = result.status;
  }
  const isCanonical = async () => {
    const block = await client.getBlock({ blockNumber: canonical.blockNumber });
    return (
      block.number === canonical.blockNumber &&
      block.hash?.toLowerCase() === canonical.blockHash.toLowerCase()
    );
  };
  if (status === "failed") {
    const finalized = await atCanonicalFinalizedBlock(
      client,
      async (number) =>
        number >= canonical.blockNumber && (await isCanonical()),
    );
    if (!finalized?.value) throw pending();
  } else if (!(await isCanonical())) throw pending();
  return status;
}

/**
 * Prove a stamped Safe call expired before execution. An advanced nonce, stale
 * service result, UI phase or local clock never releases a saved write.
 */
export async function verifyReviewedWriteExpiry(
  client: Pick<PublicClient, "getChainId" | "getBlock" | "request">,
  saved: ReviewedWriteRecoveryRecord,
  service?: SafeServiceOptions,
): Promise<true> {
  const record = recordOf(saved);
  const pending = () =>
    new Error(
      "The saved Safe proposal is not proven expired. Keep this action pending.",
    );
  if (
    !record.safe ||
    !record.hash ||
    (await client.getChainId()) !== record.chainId
  )
    throw pending();
  const proposal = await readSafeTransaction(
    record.chainId,
    record.account,
    record.hash,
    service,
  );
  if (
    !safeTransactionMatchesCall(proposal, {
      ...record.call,
      value: BigInt(record.call.value),
    })
  )
    throw pending();
  const proof = await atCanonicalFinalizedBlock(client, async (blockNumber) => {
    const block = await client.getBlock({ blockNumber });
    if (block.number !== blockNumber) return false;
    return (
      (await lookAtSafeProposal(
        { request: client.request, getBlock: async () => block },
        record.chainId,
        record.account,
        record.hash!,
        service,
      )) === "expired"
    );
  });
  if (!proof?.value) throw pending();
  return true;
}
