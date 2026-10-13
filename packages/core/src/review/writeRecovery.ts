import {
  isAddress,
  keccak256,
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
import {
  atCanonicalFinalizedBlock,
  type RelayrFinalizedClient,
} from "./relayr.js";

export type ReviewedWriteRecoveryInput = {
  chainId: number;
  account: Address;
  safe: boolean;
  /** Stable action/project scope, never a per-click ID or calldata fingerprint. */
  namespace?: string;
  call: { to: Address; data: Hex; value?: bigint | string };
};

export type ReviewedWriteRecoveryRecord = Omit<
  ReviewedWriteRecoveryInput,
  "call"
> & {
  version: 1;
  id: string;
  call: { to: Address; data: Hex; value: string };
  /** The identity returned by the wallet, or the exact call found at its nonce. */
  hash?: Hex;
  /** The account's next nonce when the wallet opened, as a decimal string. */
  nonce?: string;
  /** The block that nonce was read at, as a decimal string. */
  fromBlock?: string;
};

/** The account's next nonce and the block it was read at, from {@link readReviewedWriteNonce}. */
export type ReviewedWriteNonceEvidence = {
  nonce: number | bigint;
  blockNumber: bigint;
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

function normalizedIdentity(
  input: Pick<ReviewedWriteRecoveryInput, "chainId" | "account">,
) {
  if (
    !Number.isSafeInteger(input?.chainId) ||
    input.chainId <= 0 ||
    !isAddress(input?.account, { strict: false })
  )
    throw new Error("Invalid reviewed write recovery evidence.");
  return {
    chainId: input.chainId,
    account: input.account.toLowerCase() as Address,
  };
}

function normalized(
  input: ReviewedWriteRecoveryInput,
): ReviewedWriteRecoveryInput & {
  call: ReviewedWriteRecoveryRecord["call"];
} {
  const value = uint256(input?.call?.value ?? 0n);
  const namespace = namespaceOf(input?.namespace);
  if (
    typeof input?.safe !== "boolean" ||
    !isAddress(input?.call?.to, { strict: false }) ||
    !isHexBytes(input?.call?.data) ||
    value === null
  )
    throw new Error("Invalid reviewed write recovery evidence.");
  return {
    ...normalizedIdentity(input),
    safe: input.safe,
    ...(namespace === undefined ? {} : { namespace }),
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
    (record.hash !== undefined && !isBytes32(record.hash)) ||
    !optionalDecimal(record.nonce) ||
    !optionalDecimal(record.fromBlock)
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
    ...(record.nonce === undefined ? {} : { nonce: record.nonce }),
    ...(record.fromBlock === undefined ? {} : { fromBlock: record.fromBlock }),
  };
}

function optionalDecimal(value: unknown): boolean {
  return (
    value === undefined ||
    (typeof value === "string" && /^(0|[1-9]\d*)$/.test(value))
  );
}

/** Validate an existing domain journal's recovered record with the shared storage rules. */
export { recordOf as parseReviewedWriteRecoveryRecord };

/**
 * An ordinary write holds only its exact call: a changed amount or quote is a
 * different call. A namespace holds a whole action instead.
 */
function callScope(input: ReviewedWriteRecoveryInput): string {
  return `nana-sdk:reviewed-write:v2:${input.chainId}:${input.account}:${input.call.to}:${input.call.value ?? 0}:${keccak256(input.call.data)}`;
}

/** Before 2.30, an ordinary write held its target and selector. Read only, for its exact call. */
function legacyScope(input: ReviewedWriteRecoveryInput): string {
  return `nana-sdk:reviewed-write:v1:${input.chainId}:${input.account}:${input.call.to}:${input.call.data.slice(0, 10)}`;
}

function namespaceOf(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (
    typeof value !== "string" ||
    !/^[a-z0-9][a-z0-9:._/-]{0,127}$/.test(value)
  )
    throw new Error("Invalid write recovery namespace.");
  return value;
}

function namespaceScope(input: {
  chainId: number;
  account: Address;
  namespace: string;
}): string {
  return `nana-sdk:reviewed-write:v1:namespace:${input.chainId}:${input.account}:${input.namespace}`;
}

function scope(input: ReviewedWriteRecoveryInput): string {
  return input.namespace === undefined
    ? callScope(input)
    : namespaceScope({ ...input, namespace: input.namespace });
}

function recoveryStorage(store?: RecoveryStorage): RecoveryStorage {
  const result = store ?? globalThis.localStorage;
  if (!result) throw new Error("Write recovery storage is unavailable.");
  return result;
}

export type ReviewedWriteRecoveryScope = Pick<
  ReviewedWriteRecoveryInput,
  "chainId" | "account"
> & { namespace: string };

/**
 * Open the original namespaced action before fresh quotation or phase checks.
 * No call is invented to locate evidence. Legacy actions retain factory.read().
 * A namespace must stay stable across amount, target and quote changes.
 */
export function readBrowserWriteRecovery(
  input: ReviewedWriteRecoveryScope,
  options: { storage?: RecoveryStorage } = {},
): ReviewedWriteRecoveryRecord | null {
  const identity = normalizedIdentity(input);
  const namespace = namespaceOf(input?.namespace);
  if (namespace === undefined)
    throw new Error("Provide a write recovery namespace.");
  return readRecovery(
    recoveryStorage(options.storage),
    namespaceScope({ ...identity, namespace }),
  );
}

function readStored(
  raw: string | null,
  key: string,
  scopeOf = scope,
): ReviewedWriteRecoveryRecord | null {
  if (raw === null) return null;
  const record = recordOf(JSON.parse(raw));
  if (scopeOf(record) !== key)
    throw new Error("Saved write recovery scope does not match.");
  return record;
}
function readRecovery(
  store: RecoveryStorage,
  key: string,
  raw = store.getItem(key),
  scopeOf = scope,
): ReviewedWriteRecoveryRecord | null {
  const record = readStored(raw, key, scopeOf);
  const memory = unpersistedSubmissions.get(store)?.get(key);
  if (
    !record ||
    !memory ||
    JSON.stringify({ ...record, hash: undefined }) !==
      JSON.stringify({ ...memory, hash: undefined }) ||
    (record.hash && record.hash !== memory.hash)
  ) {
    // A readable durable snapshot also proves whether cached evidence is stale.
    unpersistedSubmissions.get(store)?.delete(key);
    return record;
  }
  if (record.hash) unpersistedSubmissions.get(store)?.delete(key);
  return recordOf(memory);
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

// Without Web Locks, writes in this tab still run one at a time per action.
const tabQueues = new Map<string, Promise<void>>();
let tabLocksNoted = false;
const tabLocks = {
  async request<T>(
    name: string,
    options: LockOptions,
    work: (lock: Lock | null) => Promise<T>,
  ): Promise<T> {
    const held = tabQueues.get(name);
    if (held && options.ifAvailable) return work(null);
    let release!: () => void;
    const mine = new Promise<void>((resolve) => (release = resolve));
    const queue = (held ?? Promise.resolve()).then(() => mine);
    tabQueues.set(name, queue);
    await held;
    try {
      return await work({ name, mode: "exclusive" } as Lock);
    } finally {
      release();
      if (tabQueues.get(name) === queue) tabQueues.delete(name);
    }
  },
} as RecoveryLocks;

/**
 * The browser's Web Locks, or, where a browser or wallet webview has none, a
 * lock within this tab, with a one-time console note. Never refuses.
 */
export function browserLocks(): RecoveryLocks {
  const native = globalThis.navigator?.locks;
  if (native) return native;
  if (!tabLocksNoted) {
    tabLocksNoted = true;
    console.info(
      "Web Locks are unavailable, so wallet writes are coordinated within this tab only.",
    );
  }
  return tabLocks;
}

/**
 * One ordinary-write reservation per exact call (account, chain, target,
 * value and calldata) by default, or per account/chain/explicit stable
 * namespace when provided. Use the existing domain journal instead when an
 * action already has one. A hold ends on proof ({@link checkReviewedWrite} via
 * `resolve`) or when the user confirms they checked their wallet (`abandon`).
 *
 * Every mutation must run inside withLock, including receipt-based clearing.
 * Storage is mandatory before opening a wallet; without Web Locks the lock
 * holds within the tab ({@link browserLocks}).
 */
export function createBrowserWriteRecovery(
  input: ReviewedWriteRecoveryInput,
  options: { storage?: RecoveryStorage; locks?: RecoveryLocks } = {},
) {
  const reviewed = normalized(input);
  const key = scope(reviewed);
  const legacyKey =
    reviewed.namespace === undefined ? legacyScope(reviewed) : undefined;
  let owned: ReviewedWriteRecoveryRecord | undefined;
  let locked = false;
  let lastStorage: RecoveryStorage | undefined;

  /** An adopted call (a reused Safe proposal) is kept under its reviewed call's key. */
  function keyOf(record: ReviewedWriteRecoveryInput): string {
    return record.namespace === undefined &&
      legacyKey !== undefined &&
      legacyScope(record) === legacyKey
      ? key
      : scope(record);
  }
  /**
   * Where this call's record lives, with its raw value: its own key, or an
   * exact match saved under the old key. Reads its own key exactly once.
   */
  function locate(store: RecoveryStorage): { at: string; raw: string | null } {
    const raw = store.getItem(key);
    if (raw !== null || !legacyKey) return { at: key, raw };
    try {
      const old = store.getItem(legacyKey);
      const legacy = readStored(old, legacyKey, legacyScope);
      if (legacy && sameReviewedWrite(legacy, reviewed))
        return { at: legacyKey, raw: old };
    } catch {
      // An unreadable old record names no call, so it holds none.
    }
    return { at: key, raw };
  }
  function scopeAt(at: string) {
    return at === key ? keyOf : legacyScope;
  }
  function storage(): RecoveryStorage {
    const store = recoveryStorage(options.storage);
    lastStorage = store;
    return store;
  }
  function rememberSubmission(
    record: ReviewedWriteRecoveryRecord,
    at: string,
    verifiedReservation = false,
  ) {
    if (!lastStorage) return;
    let pending = unpersistedSubmissions.get(lastStorage);
    const previous = pending?.get(at);
    // An unreadable stale callback cannot replace another attempt's only hash.
    if (
      previous &&
      !verifiedReservation &&
      JSON.stringify(previous) !== JSON.stringify(record)
    )
      return;
    if (!pending)
      unpersistedSubmissions.set(lastStorage, (pending = new Map()));
    pending.set(at, recordOf(record));
  }
  function requireLock() {
    if (!locked)
      throw new Error("Write recovery changes require the browser lock.");
  }
  function read(): ReviewedWriteRecoveryRecord | null {
    const store = storage();
    const { at, raw } = locate(store);
    return readRecovery(store, at, raw, scopeAt(at));
  }
  function persist(record: ReviewedWriteRecoveryRecord, at: string) {
    const raw = JSON.stringify(record);
    const store = storage();
    store.setItem(at, raw);
    if (store.getItem(at) !== raw)
      throw new Error("Write recovery storage did not retain the action.");
  }
  function clear(expected: ReviewedWriteRecoveryRecord): void {
    requireLock();
    // A volatile returned hash is useful for tracking, but is not a successful
    // durable commit. submitted(hash, record) must retry that commit first.
    const store = storage();
    const { at, raw } = locate(store);
    const current = readStored(raw, at, scopeAt(at));
    if (!current) return;
    if (JSON.stringify(current) !== JSON.stringify(recordOf(expected))) {
      throw new Error(
        "Write recovery changed. Keep the current action pending.",
      );
    }
    store.removeItem(at);
    if (store.getItem(at) !== null)
      throw new Error("Write recovery storage did not clear the action.");
    unpersistedSubmissions.get(store)?.delete(at);
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
  /** `replace`: the exact call was found at its nonce under another hash, as after a wallet speed-up. */
  function record(
    hash: Hex,
    expected: ReviewedWriteRecoveryRecord | undefined,
    replace: boolean,
  ): ReviewedWriteRecoveryRecord {
    requireLock();
    if (!isBytes32(hash))
      throw new Error("The wallet returned an invalid transaction identity.");
    const previous = expected && recordOf(expected);
    const submittedHash = hash.toLowerCase() as Hex;
    if (
      !previous ||
      keyOf(previous) !== key ||
      (!replace && previous.hash && previous.hash !== submittedHash)
    ) {
      throw new Error("Write recovery changed before submission was recorded.");
    }
    const submitted = { ...previous, hash: submittedHash };
    let raw: string | null;
    let at = key;
    try {
      ({ at, raw } = locate(storage()));
    } catch (cause) {
      owned = submitted;
      rememberSubmission(submitted, at);
      throw new SubmittedWritePersistenceError(submitted, cause);
    }
    const current = readStored(raw, at, scopeAt(at));
    if (
      !current ||
      JSON.stringify({ ...current, hash: undefined }) !==
        JSON.stringify({ ...previous, hash: undefined }) ||
      (!replace && current.hash && current.hash !== submittedHash)
    ) {
      throw new Error("Write recovery changed before submission was recorded.");
    }
    owned = recordOf(submitted);
    if (current.hash !== submittedHash) {
      try {
        persist(submitted, at);
      } catch (cause) {
        rememberSubmission(submitted, at, true);
        throw new SubmittedWritePersistenceError(submitted, cause);
      }
    }
    if (lastStorage) unpersistedSubmissions.get(lastStorage)?.delete(at);
    return submitted;
  }

  return {
    read,
    /**
     * Save the attempt before the wallet opens. `evidence`, the account's next
     * nonce from {@link readReviewedWriteNonce}, lets `resolve` release it
     * on proof from the chain.
     */
    reserve(
      actualCall?: ReviewedWriteRecoveryInput["call"],
      evidence?: ReviewedWriteNonceEvidence,
    ): ReviewedWriteRecoveryRecord {
      requireLock();
      // A reused Safe proposal may have a different, already verified deadline.
      // Retain its actual call, without widening the unresolved-action scope.
      const actual = actualCall
        ? normalized({ ...reviewed, call: actualCall })
        : reviewed;
      if (legacyScope(actual) !== legacyScope(reviewed))
        throw new Error("The adopted write has a different recovery scope.");
      const nonce = evidence && uint256(evidence.nonce);
      const fromBlock = evidence && uint256(evidence.blockNumber);
      if (evidence && (nonce === null || fromBlock === null))
        throw new Error("Invalid write recovery nonce evidence.");
      if (read())
        throw new Error(
          "An earlier wallet write is still unresolved. Check it before trying again.",
        );
      const record: ReviewedWriteRecoveryRecord = {
        version: 1,
        id: globalThis.crypto.randomUUID(),
        ...actual,
        ...(evidence
          ? { nonce: nonce!.toString(), fromBlock: fromBlock!.toString() }
          : {}),
      };
      owned = recordOf(record);
      try {
        persist(record, key);
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
      return record(hash, expected, false);
    },
    rejected,
    clear,
    /**
     * Check the saved write against the chain ({@link checkReviewedWrite}) and
     * apply the finding: `sent` records the hash to track, `replaced` and
     * `ran` release it. Null when nothing is saved.
     */
    async resolve(
      client: ReviewedWriteNonceClient,
      checkOptions?: { effect?: () => Promise<boolean> },
    ): Promise<ReviewedWriteCheck | null> {
      requireLock();
      const saved = read();
      if (!saved) return null;
      const check = await checkReviewedWrite(client, saved, checkOptions);
      if (check.status === "sent") {
        if (check.hash !== saved.hash) record(check.hash, saved, true);
      } else if (check.status !== "pending") clear(saved);
      return check;
    },
    /** The user confirmed they checked their wallet; release the write. */
    abandon(
      expected: ReviewedWriteRecoveryRecord,
      acknowledgement: { checkedWallet: true },
    ): void {
      requireLock();
      if (acknowledgement?.checkedWallet !== true)
        throw new Error(
          "Release a held write only after the user confirms they checked their wallet.",
        );
      clear(expected);
    },
    async withLock<T>(work: () => Promise<T>, wait = false): Promise<T> {
      const locks = options.locks ?? browserLocks();
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

/** What the chain shows of a write with no confirmed result. */
export type ReviewedWriteCheck =
  /** Nothing proven yet. */
  | { status: "pending" }
  /** The exact call is at its nonce under `hash`: track that receipt. */
  | { status: "sent"; hash: Hex }
  /** Another transaction used its nonce, so it can never run. */
  | { status: "replaced" }
  /** The app's effect read shows the call took effect. */
  | { status: "ran" };

/** The reads {@link checkReviewedWrite} makes; a viem PublicClient satisfies it. */
export type ReviewedWriteNonceClient = Pick<
  PublicClient,
  "getBlock" | "getTransactionCount"
>;

/** The account's next nonce, counting its pending transactions, and the block it was read at. Read it right before `reserve`. */
export async function readReviewedWriteNonce(
  client: Pick<PublicClient, "getBlockNumber" | "getTransactionCount">,
  account: Address,
): Promise<ReviewedWriteNonceEvidence> {
  const blockNumber = await client.getBlockNumber();
  const nonce = await client.getTransactionCount({
    address: account,
    blockTag: "pending",
  });
  return { nonce, blockNumber };
}

/**
 * What the chain shows of a saved ordinary write, at a canonical finalized
 * block. Once the account's nonce is past the one saved at reserve, the block
 * where it moved holds the transaction that used it: the exact call (`sent`,
 * with its hash, even after a wallet speed-up) or another one (`replaced`).
 * `effect`, the app's read of the call's result, ends it as `ran` when true.
 * Anything unread, a Safe write or a record without nonce evidence stays
 * `pending`.
 */
export async function checkReviewedWrite(
  client: ReviewedWriteNonceClient,
  saved: ReviewedWriteRecoveryRecord,
  { effect }: { effect?: () => Promise<boolean> } = {},
): Promise<ReviewedWriteCheck> {
  const record = recordOf(saved);
  const pending = { status: "pending" } as const;
  if (effect && (await effect().catch(() => false))) return { status: "ran" };
  if (
    record.safe ||
    record.nonce === undefined ||
    record.fromBlock === undefined
  )
    return pending;
  const nonce = BigInt(record.nonce);
  const count = async (blockNumber: bigint) =>
    BigInt(
      await client.getTransactionCount({
        address: record.account,
        blockNumber,
      }),
    );
  const proof = await atCanonicalFinalizedBlock(
    client as Pick<RelayrFinalizedClient, "getBlock">,
    async (finalized): Promise<ReviewedWriteCheck | null> => {
      let low = BigInt(record.fromBlock!);
      let high = finalized;
      if (
        high <= low ||
        (await count(high)) <= nonce ||
        (await count(low)) > nonce
      )
        return null;
      while (high - low > 1n) {
        const middle = (low + high) / 2n;
        if ((await count(middle)) > nonce) high = middle;
        else low = middle;
      }
      const block = await client.getBlock({
        blockNumber: high,
        includeTransactions: true,
      });
      const used =
        block.number === high
          ? block.transactions.find(
              (tx) =>
                tx.from?.toLowerCase() === record.account &&
                BigInt(tx.nonce) === nonce,
            )
          : undefined;
      if (!used || !isBytes32(used.hash)) return null;
      return used.to?.toLowerCase() === record.call.to &&
        used.input?.toLowerCase() === record.call.data &&
        BigInt(used.value ?? 0) === BigInt(record.call.value)
        ? { status: "sent", hash: used.hash.toLowerCase() as Hex }
        : { status: "replaced" };
    },
  );
  return proof?.value ?? pending;
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
