import { ReviewLineError } from "./lineError.js";
import {
  decodeFunctionData,
  isAddress,
  numberToHex,
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
  isSafeExecTransaction,
  safeExecTransactionResult,
  SAFE_EXEC_ABI,
  safeProposalFor,
  safeTransactionMatchesCall,
  type SafeServiceOptions,
} from "../safeService.js";
import {
  MULTI_SEND_CALL_ONLY_DEPLOYMENTS,
  multiSendCallsOf,
  readAuthorityIdentity,
} from "../safe.js";
import { TAB } from "./tabState.js";
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
  /** The nonce the chain showed for `hash`'s own transaction: the nonce it was actually sent at. */
  sentNonce?: string;
  /**
   * The chain proved the write ran (a Safe proposal whose nonce its own
   * execution used). It is never offered a resend; its result settles it.
   */
  executed?: true;
  /** The transaction the proven execution ran in, when known. */
  executionHash?: Hex;
  /** When the wallet returned `hash`, in milliseconds since the epoch, as a decimal string. */
  submittedAt?: string;
  /**
   * For a hash saved before `submittedAt` existed: when this record was
   * first read with it, in milliseconds since the epoch, as a decimal string.
   */
  firstSeenAt?: string;
  /** A Safe proposal's nonce, from its authenticated record: proof of its end needs no Safe service. */
  safeNonce?: string;
  /** For a Safe execution the wallet returned at once: the account that sent it (its nonce is `sentNonce`). */
  sentFrom?: Address;
  /** Another Safe transaction used this Safe write's nonce: held for the user's exit, never released on its own. */
  replaced?: true;
  /**
   * This record mirrors the write held under this intent namespace (same
   * reservation id), so a reader of this key sees it held. It never settles
   * anything; the intent's own record does.
   */
  mirrorOf?: string;
  /** The app's Safe follower ended without proof: held for the user's exit, unless evidence settles it. */
  unproven?: true;
  /**
   * When the node first answered that the saved hash, already seen with its
   * sent nonce, is unknown, in milliseconds since the epoch, as a decimal
   * string. Cleared once it is seen again.
   */
  vanishedAt?: string;
  /** When a read last showed the saved hash pending, in milliseconds since the epoch, as a decimal string. */
  pendingSeenAt?: string;
  /**
   * Hashes an app reported as this Safe write's execution, not yet
   * authenticated: each settles it only once its receipt proves this Safe's
   * execution of the exact proposal or call.
   */
  candidates?: Hex[];
  /**
   * When the saved hash was first seen mined with its receipt unreadable, in
   * milliseconds since the epoch, as a decimal string. Cleared once it is
   * seen pending again.
   */
  minedAt?: string;
  /** The same clock for each candidate seen mined with its receipt unreadable, by hash. */
  candidateMinedAt?: Record<string, string>;
  /**
   * When each candidate was reported, by hash, in milliseconds since the
   * epoch, as a decimal string: its unseen window runs from it.
   */
  candidateSeenAt?: Record<string, string>;
};

/** How a held write ended, on authenticated evidence: its result and transaction. */
export type ReviewedWriteSettlement = {
  result: "success" | "failed";
  hash: Hex;
  /** The block of the receipt it was verified on; none when a log proved it. */
  blockHash?: Hex;
  /** A Safe's execution: its failure is the Safe's own, under an outer transaction that may succeed. */
  safe?: true;
  /**
   * The user saw it (or a view that saw it settle told the app): it blocks
   * nothing, but every reader still learns the result. One per call key,
   * replaced by the call's next reservation like any settlement.
   */
  acknowledged?: true;
};

/** The account's next nonce and the block it was read at, from {@link readReviewedWriteNonce}. */
export type ReviewedWriteNonceEvidence = {
  nonce: number | bigint;
  blockNumber: bigint;
};

type RecoveryStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
type RecoveryLocks = Pick<LockManager, "request">;
const TAB_MEMORY = TAB.memory;
const TAB_QUEUES = TAB.queues;
const TAB_SEEN = TAB.seen;
/** Per storage, settlement keys and hashes whose `onConfirmed` notice this tab claimed. */
const confirmedHere = new WeakMap<object, Set<string>>();
// A returned hash must survive a component remount even when its durable update
// failed. It is visible only while the exact durable reservation still exists.
const unpersistedSubmissions = new WeakMap<
  RecoveryStorage,
  Map<string, ReviewedWriteRecoveryRecord>
>();

/** The wallet returned this identity, but storing it failed. Keep it in memory and retry submitted(hash, record). */
export class SubmittedWritePersistenceError extends ReviewLineError {
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
    throw new ReviewLineError("Invalid reviewed write recovery evidence.");
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
    throw new ReviewLineError("Invalid reviewed write recovery evidence.");
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
    !optionalDecimal(record.fromBlock) ||
    !optionalDecimal(record.sentNonce) ||
    !optionalDecimal(record.submittedAt) ||
    !optionalDecimal(record.firstSeenAt) ||
    !optionalDecimal(record.safeNonce) ||
    !optionalDecimal(record.vanishedAt) ||
    !optionalDecimal(record.pendingSeenAt) ||
    !optionalDecimal(record.minedAt) ||
    !hashClocks(record.candidateMinedAt) ||
    !hashClocks(record.candidateSeenAt) ||
    (record.candidates !== undefined &&
      (!Array.isArray(record.candidates) ||
        !record.candidates.every(isBytes32))) ||
    (record.replaced !== undefined && record.replaced !== true) ||
    (record.mirrorOf !== undefined &&
      (typeof record.mirrorOf !== "string" ||
        !/^[a-z0-9][a-z0-9:._/-]{0,127}$/.test(record.mirrorOf))) ||
    (record.unproven !== undefined && record.unproven !== true) ||
    (record.sentFrom !== undefined &&
      !isAddress(record.sentFrom, { strict: false })) ||
    (record.executed !== undefined && record.executed !== true) ||
    (record.executionHash !== undefined &&
      (record.executed !== true || !isBytes32(record.executionHash)))
  )
    throw new ReviewLineError(
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
    ...(record.sentNonce === undefined ? {} : { sentNonce: record.sentNonce }),
    ...(record.submittedAt === undefined
      ? {}
      : { submittedAt: record.submittedAt }),
    ...(record.firstSeenAt === undefined
      ? {}
      : { firstSeenAt: record.firstSeenAt }),
    ...(record.safeNonce === undefined ? {} : { safeNonce: record.safeNonce }),
    ...(record.sentFrom === undefined
      ? {}
      : { sentFrom: record.sentFrom.toLowerCase() as Address }),
    ...(record.replaced ? { replaced: true as const } : {}),
    ...(record.mirrorOf === undefined ? {} : { mirrorOf: record.mirrorOf }),
    ...(record.unproven ? { unproven: true as const } : {}),
    ...(record.vanishedAt === undefined
      ? {}
      : { vanishedAt: record.vanishedAt }),
    ...(record.pendingSeenAt === undefined
      ? {}
      : { pendingSeenAt: record.pendingSeenAt }),
    ...(record.minedAt === undefined ? {} : { minedAt: record.minedAt }),
    ...(record.candidateMinedAt === undefined
      ? {}
      : { candidateMinedAt: { ...record.candidateMinedAt } }),
    ...(record.candidateSeenAt === undefined
      ? {}
      : { candidateSeenAt: { ...record.candidateSeenAt } }),
    ...(record.candidates === undefined
      ? {}
      : {
          candidates: record.candidates.map(
            (hash) => hash.toLowerCase() as Hex,
          ),
        }),
    ...(record.executed ? { executed: true as const } : {}),
    ...(record.executionHash === undefined
      ? {}
      : { executionHash: record.executionHash.toLowerCase() as Hex }),
  };
}

/** A clock per hash: bytes32 hashes to decimal times, or none. */
function hashClocks(value: unknown): boolean {
  return (
    value === undefined ||
    (typeof value === "object" &&
      value !== null &&
      Object.entries(value).every(
        ([hash, at]) => isBytes32(hash) && optionalDecimal(at),
      ))
  );
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
    throw new ReviewLineError("Invalid write recovery namespace.");
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
  if (!result)
    throw new ReviewLineError("Write recovery storage is unavailable.");
  return result;
}

/** Recovery storage that also says whether its records outlive this tab. */
export type HeldWriteStorage = RecoveryStorage & {
  /** Whether records are kept by the browser (shared by tabs, kept across reloads) right now. */
  durable(): boolean;
  /** Every key it holds, for {@link findReviewedWrites}; without it, none are found. */
  keys?(): string[];
  /** Whether the browser's storage itself holds `key`'s value now, not only this tab's memory. */
  durableAt?(key: string): boolean;
  /**
   * `key`'s value read fresh, throwing when the browser's storage is there
   * but its read fails (never a cached or memory stand-in for it): for a
   * decision that must not act on an unresolved read, like a retirement.
   */
  getItemStrict?(key: string): string | null;
};

/** Every key `store` holds: its own `keys()`, or Web Storage's `length` and `key()`. */
function storedKeys(store: unknown): string[] {
  const keyed = store as {
    keys?: () => string[];
    length?: number;
    key?: (index: number) => string | null;
  };
  if (typeof keyed?.keys === "function") return keyed.keys();
  if (typeof keyed?.length !== "number" || typeof keyed.key !== "function")
    return [];
  const keys: string[] = [];
  for (let index = 0; index < keyed.length; index += 1) {
    const key = keyed.key(index);
    if (key !== null) keys.push(key);
  }
  return keys;
}

const PROBE_KEY = "nana-sdk:reviewed-write:probe";

function idOf(raw: string): string | undefined {
  try {
    const id = (JSON.parse(raw) as { id?: unknown } | null)?.id;
    return typeof id === "string" ? id : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The browser's storage, shared by its tabs and kept across reloads, while it
 * can be written; this tab's memory while it can't (private browsing, a
 * sandboxed frame, some wallet webviews), so a write is held either way and
 * never refused. Every read looks at both. A record kept in memory moves into
 * the browser's storage as soon as it can be written there, after any other
 * live record saved at the same key ends. While the browser's storage can't
 * be read, what this tab last read or wrote there still holds.
 *
 * `memory` defaults to one map per tab, shared by every copy of this module
 * loaded there.
 */
export function createHeldWriteStorage(
  options: {
    durable?: () => RecoveryStorage | undefined;
    memory?: Map<string, string>;
  } = {},
): HeldWriteStorage {
  const durable =
    options.durable ??
    (() => globalThis.localStorage as RecoveryStorage | undefined);
  const tab = globalThis as { [TAB_MEMORY]?: Map<string, string> };
  const memory = options.memory ?? (tab[TAB_MEMORY] ??= new Map());
  /**
   * What this tab last saw in, or wrote to, durable storage (records,
   * releases and deletions), shared by every controller and copy of this
   * module using the same tab memory.
   */
  const registry = ((
    globalThis as {
      [TAB_SEEN]?: WeakMap<Map<string, string>, Map<string, string>>;
    }
  )[TAB_SEEN] ??= new WeakMap());
  let seen = registry.get(memory);
  if (!seen) registry.set(memory, (seen = new Map()));
  const read = (key: string): string | null | undefined => {
    try {
      const store = durable();
      if (!store) return undefined;
      const value = store.getItem(key);
      if (value === null) seen.delete(key);
      else seen.set(key, value);
      return value;
    } catch {
      return undefined;
    }
  };
  const write = (key: string, value: string): boolean => {
    try {
      const store = durable();
      if (!store) return false;
      store.setItem(key, value);
      if (store.getItem(key) !== value) return false;
      seen.set(key, value);
      return true;
    } catch {
      return false;
    }
  };
  const getItem = (key: string): string | null => {
    const saved = read(key);
    const kept = memory.get(key);
    if (saved === undefined) return kept ?? seen.get(key) ?? null;
    if (kept === undefined) return saved;
    if (saved === kept) {
      memory.delete(key);
      return saved;
    }
    const savedId = saved === null ? undefined : idOf(saved);
    // Another live record saved there first is held first; this one waits.
    if (
      saved !== null &&
      savedId !== idOf(kept) &&
      !(savedId !== undefined && getItem(releasedKey(key, savedId)) !== null)
    )
      return saved;
    if (write(key, kept)) memory.delete(key);
    return kept;
  };
  return {
    // This storage's tab memory: write holds over the same one share their subscribers.
    [TAB_MEMORY]: memory,
    getItem,
    setItem(key, value) {
      const kept = memory.get(key);
      if (write(key, value)) {
        if (kept === value || (kept && idOf(kept) === idOf(value)))
          memory.delete(key);
      } else memory.set(key, value);
    },
    removeItem(key) {
      const shown = getItem(key);
      if (shown !== null && memory.get(key) === shown) {
        memory.delete(key);
        if (read(key) !== shown) return;
      }
      try {
        durable()?.removeItem(key);
      } catch {
        /* The readback below decides. */
      }
      if (read(key) === null) seen.delete(key);
    },
    keys() {
      let saved: string[] = [];
      try {
        saved = storedKeys(durable());
      } catch {
        /* What this tab last saw still holds. */
      }
      // What this tab last saw too, as getItem() still shows it while the
      // browser's storage can't be read; a read of each drops what ended.
      return [...new Set([...saved, ...seen.keys(), ...memory.keys()])];
    },
    getItemStrict(key) {
      let store: RecoveryStorage | undefined;
      try {
        store = durable();
      } catch {
        /* No browser storage at all: this tab's memory is the store. */
      }
      if (!store) return memory.get(key) ?? null;
      const saved = store.getItem(key);
      return memory.get(key) ?? saved;
    },
    durableAt(key) {
      const saved = read(key);
      return !memory.has(key) && typeof saved === "string";
    },
    durable() {
      const probe = String(Date.now());
      if (!write(PROBE_KEY, probe)) return false;
      try {
        durable()!.removeItem(PROBE_KEY);
      } catch {
        /* A leftover probe names no write. */
      }
      seen.delete(PROBE_KEY);
      return true;
    },
  };
}

/**
 * Every exact-call write saved for `account` on `chainId` to `to` whose
 * calldata starts with `selector` (a 4-byte hex), with the key it was saved
 * under (a reused Safe proposal keeps its actual call under its reviewed
 * call's key, so the key is never rebuilt from the record), from `storage`:
 * holds saved before an intent key existed, under calldata a retry can't
 * rebuild. A mirror of an intent's write is never one: its intent is found
 * by its namespace. Unreadable and released records are skipped.
 */
export function findReviewedWrites(
  input: Pick<ReviewedWriteRecoveryInput, "chainId" | "account"> & {
    to: Address;
    selector: Hex;
  },
  options: { storage?: RecoveryStorage } = {},
): { key: string; record: ReviewedWriteRecoveryRecord }[] {
  const identity = normalizedIdentity(input);
  if (
    !isAddress(input.to, { strict: false }) ||
    !/^0x[0-9a-fA-F]{8}$/.test(input.selector)
  )
    throw new ReviewLineError("Invalid write hold match.");
  const to = input.to.toLowerCase();
  const selector = input.selector.toLowerCase();
  const store = recoveryStorage(options.storage);
  const prefix = `nana-sdk:reviewed-write:v2:${identity.chainId}:${identity.account}:${to}:`;
  const legacy = `nana-sdk:reviewed-write:v1:${identity.chainId}:${identity.account}:${to}:${selector}`;
  const found: { key: string; record: ReviewedWriteRecoveryRecord }[] = [];
  for (const key of storedKeys(store)) {
    const exact =
      key.startsWith(prefix) &&
      /^\d+:0x[0-9a-f]{64}$/.test(key.slice(prefix.length));
    if (!exact && key !== legacy) continue;
    try {
      // Its identity is checked against the match, not its full scope.
      const record = readStored(store.getItem(key), key, () => key, store);
      if (
        record &&
        record.namespace === undefined &&
        record.mirrorOf === undefined &&
        record.chainId === identity.chainId &&
        record.account === identity.account &&
        record.call.to === to &&
        record.call.data.slice(0, 10) === selector
      )
        found.push({ key, record });
    } catch {
      // An unreadable record names no call, so it holds none.
    }
  }
  return found;
}

/** `at`, when it is a key an exact call to `input`'s target by its account on its chain may be saved under. */
function foundAt(input: ReviewedWriteRecoveryInput, at: string): string {
  const prefix = `nana-sdk:reviewed-write:v2:${input.chainId}:${input.account}:${input.call.to}:`;
  if (
    input.namespace === undefined &&
    (at === legacyScope(input) ||
      (at.startsWith(prefix) &&
        /^\d+:0x[0-9a-f]{64}$/.test(at.slice(prefix.length))))
  )
    return at;
  throw new ReviewLineError("Invalid write recovery key.");
}

/**
 * Every unresolved write saved for `account` on `chainId`, with the key it
 * was saved under: held under an intent namespace, as an exact call, or under
 * the pre-2.30 selector key. A mirror is never one (its intent is listed by
 * its namespace), nor a released, unreadable or other-account record. For an
 * app-wide notice of everything held.
 */
export function listReviewedWrites(
  input: Pick<ReviewedWriteRecoveryInput, "chainId" | "account">,
  options: { storage?: RecoveryStorage } = {},
): { key: string; record: ReviewedWriteRecoveryRecord }[] {
  const { chainId, account } = normalizedIdentity(input);
  const store = recoveryStorage(options.storage);
  const listed: { key: string; record: ReviewedWriteRecoveryRecord }[] = [];
  for (const key of storedKeys(store)) {
    if (
      !key.startsWith("nana-sdk:reviewed-write:") ||
      !key.includes(`:${chainId}:${account}:`)
    )
      continue;
    try {
      const record = readStored(store.getItem(key), key, () => key, store);
      if (
        !record ||
        record.mirrorOf !== undefined ||
        record.chainId !== chainId ||
        record.account !== account
      )
        continue;
      const exactPrefix = `nana-sdk:reviewed-write:v2:${chainId}:${account}:${record.call.to}:`;
      const owned =
        record.namespace !== undefined
          ? key === scope(record)
          : key === legacyScope(record) ||
            (key.startsWith(exactPrefix) &&
              /^\d+:0x[0-9a-f]{64}$/.test(key.slice(exactPrefix.length)));
      if (owned) listed.push({ key, record });
    } catch {
      // An unreadable record names no call, so it holds none.
    }
  }
  return listed;
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
    throw new ReviewLineError("Provide a write recovery namespace.");
  return readRecovery(
    recoveryStorage(options.storage),
    namespaceScope({ ...identity, namespace }),
  );
}

/**
 * The key that marks the record `id` saved at `key` as released by the user.
 * An exit writes this instead of removing `key`, so it can never remove a
 * newer record another tab saved there.
 */
function releasedKey(key: string, id: string): string {
  return `${key}:released:${id}`;
}

/**
 * The key that marks the record `id` saved at `key` as ended by the user's
 * exit or as never sent, never by a settlement's cleanup: only it lets a
 * saved sequence send that step again.
 */
function exitedKey(key: string, id: string): string {
  return `${key}:exited:${id}`;
}

function readStored(
  raw: string | null,
  key: string,
  scopeOf = scope,
  store?: RecoveryStorage,
): ReviewedWriteRecoveryRecord | null {
  if (raw === null) return null;
  const record = recordOf(JSON.parse(raw));
  if (scopeOf(record) !== key)
    throw new ReviewLineError("Saved write recovery scope does not match.");
  if (store && store.getItem(releasedKey(key, record.id)) !== null) return null;
  return record;
}
function readRecovery(
  store: RecoveryStorage,
  key: string,
  raw = store.getItem(key),
  scopeOf = scope,
): ReviewedWriteRecoveryRecord | null {
  const record = readStored(raw, key, scopeOf, store);
  const memory = unpersistedSubmissions.get(store)?.get(key);
  if (
    !record ||
    !memory ||
    JSON.stringify({ ...record, hash: undefined, submittedAt: undefined }) !==
      JSON.stringify({ ...memory, hash: undefined, submittedAt: undefined }) ||
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

// Without Web Locks, writes in this tab still run one at a time per action,
// across every copy of this module loaded in the tab.
const tabQueues = ((
  globalThis as { [TAB_QUEUES]?: Map<string, Promise<void>> }
)[TAB_QUEUES] ??= new Map<string, Promise<void>>());
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

// Without Web Locks, tabs share an IndexedDB lease per action. A readwrite
// transaction is atomic across the origin's tabs, so claiming a lease is a
// compare-and-set. The holder renews it while it works; a tab that closed or
// froze loses it once it lapses.
const LEASE_DB = "nana-sdk-write-locks";
const LEASE_STORE = "leases";
const LEASE_MS = 15_000;
const LEASE_RENEW_MS = 5_000;
const LEASE_POLL_MS = 50;
type Lease = { owner: string; expires: number };

function leaseTransaction<T>(
  db: IDBDatabase,
  run: (store: IDBObjectStore, done: (value: T) => void) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(LEASE_STORE, "readwrite");
    let result: T;
    run(transaction.objectStore(LEASE_STORE), (value) => (result = value));
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = transaction.onabort = () => reject(transaction.error);
  });
}

/** Take or renew `name`'s lease for `owner`; false while another tab holds it. */
function claimLease(db: IDBDatabase, name: string, owner: string) {
  return leaseTransaction<boolean>(db, (store, done) => {
    done(false);
    const read = store.get(name);
    read.onsuccess = () => {
      const lease = read.result as Lease | undefined;
      const now = Date.now();
      if (lease && lease.owner !== owner && lease.expires > now) return;
      store.put({ owner, expires: now + LEASE_MS } satisfies Lease, name);
      done(true);
    };
  });
}

function dropLease(db: IDBDatabase, name: string, owner: string) {
  return leaseTransaction<void>(db, (store) => {
    const read = store.get(name);
    read.onsuccess = () => {
      if ((read.result as Lease | undefined)?.owner === owner)
        store.delete(name);
    };
  });
}

function leaseLocks(factory: IDBFactory): RecoveryLocks {
  let opened: Promise<IDBDatabase> | undefined;
  const database = () =>
    (opened ??= new Promise<IDBDatabase>((resolve, reject) => {
      const request = factory.open(LEASE_DB, 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore(LEASE_STORE);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }).catch((error) => {
      opened = undefined;
      throw error;
    }));
  return {
    request: <T>(
      name: string,
      options: LockOptions,
      work: (lock: Lock | null) => Promise<T>,
    ): Promise<T> =>
      tabLocks.request(name, options, async (tabLock) => {
        if (!tabLock) return work(null);
        let db: IDBDatabase;
        try {
          db = await database();
        } catch {
          // IndexedDB refused (as in some private windows): this tab only.
          return work(tabLock);
        }
        const owner = globalThis.crypto.randomUUID();
        while (!(await claimLease(db, name, owner))) {
          if (options.ifAvailable) return work(null);
          await new Promise((resolve) => setTimeout(resolve, LEASE_POLL_MS));
        }
        const renew = setInterval(
          () => void claimLease(db, name, owner).catch(() => {}),
          LEASE_RENEW_MS,
        );
        try {
          return await work(tabLock);
        } finally {
          clearInterval(renew);
          await dropLease(db, name, owner).catch(() => {});
        }
      }) as Promise<T>,
  } as RecoveryLocks;
}

let fallbackLocks: RecoveryLocks | undefined;

/**
 * The browser's Web Locks. Where a browser or wallet webview has none, an
 * IndexedDB lease shared by the origin's tabs (one transaction, no visible
 * delay; it waits only while another tab holds the action), with a one-time
 * console note. With neither, a lock within this tab. Never refuses.
 */
export function browserLocks(): RecoveryLocks {
  const native = globalThis.navigator?.locks;
  if (native) return native;
  if (!tabLocksNoted) {
    tabLocksNoted = true;
    console.info(
      globalThis.indexedDB
        ? "Web Locks are unavailable, so wallet writes are coordinated across tabs through IndexedDB."
        : "Web Locks are unavailable, so wallet writes are coordinated within this tab only.",
    );
  }
  if (!globalThis.indexedDB) return tabLocks;
  return (fallbackLocks ??= leaseLocks(globalThis.indexedDB));
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
 * is an IndexedDB lease across tabs ({@link browserLocks}).
 */
export function createBrowserWriteRecovery(
  input: ReviewedWriteRecoveryInput,
  options: {
    storage?: RecoveryStorage;
    locks?: RecoveryLocks;
    /**
     * For an exact call: the key {@link findReviewedWrites} found its record
     * under, which a reused Safe proposal doesn't share with its call.
     */
    at?: string;
  } = {},
) {
  const reviewed = normalized(input);
  const key =
    options.at === undefined ? scope(reviewed) : foundAt(reviewed, options.at);
  const settledKey = `${key}:settled`;
  const latestKey = `${key}:latest`;
  /** The last reservation dropped on a definite wallet rejection or an abort before the wallet opened. */
  const rejectedKey = `${key}:rejected`;
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
      const legacy = readStored(old, legacyKey, legacyScope, store);
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
      throw new ReviewLineError(
        "Write recovery changes require the browser lock.",
      );
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
      throw new ReviewLineError(
        "Write recovery storage did not retain the action.",
      );
  }
  function clear(expected: ReviewedWriteRecoveryRecord): void {
    requireLock();
    release(expected);
  }
  /** Remove exactly `expected`, refusing any other saved record. */
  function release(expected: ReviewedWriteRecoveryRecord): void {
    // A volatile returned hash is useful for tracking, but is not a successful
    // durable commit. submitted(hash, record) must retry that commit first.
    const store = storage();
    const { at, raw } = locate(store);
    const current = readStored(raw, at, scopeAt(at), store);
    if (!current) return;
    if (JSON.stringify(current) !== JSON.stringify(recordOf(expected))) {
      throw new ReviewLineError(
        "Write recovery changed. Keep the current action pending.",
      );
    }
    // The last record of an attempt goes only once its generation is the
    // committed latest marker; otherwise it stays, released, and carries it.
    if (!markedLatest(current.id)) {
      const marker = releasedKey(at, current.id);
      store.setItem(marker, "1");
      if (store.getItem(marker) !== "1")
        throw new ReviewLineError(
          "Write recovery storage did not clear the action.",
        );
      unpersistedSubmissions.get(store)?.delete(at);
      return;
    }
    store.removeItem(at);
    if (store.getItem(at) !== null)
      throw new ReviewLineError(
        "Write recovery storage did not clear the action.",
      );
    unpersistedSubmissions.get(store)?.delete(at);
  }
  /** Add `fields` to exactly `expected`, a hashed record `when` allows; extra evidence only. */
  function amend(
    expected: ReviewedWriteRecoveryRecord,
    when: (current: ReviewedWriteRecoveryRecord) => boolean,
    fields: Partial<ReviewedWriteRecoveryRecord>,
  ): ReviewedWriteRecoveryRecord {
    requireLock();
    const current = read();
    if (
      !current?.hash ||
      !when(current) ||
      JSON.stringify(current) !== JSON.stringify(recordOf(expected))
    )
      return current ?? recordOf(expected);
    const next = recordOf({ ...current, ...fields });
    try {
      persist(next, locate(storage()).at);
      return next;
    } catch {
      return current;
    }
  }
  function rejected(): void {
    requireLock();
    // A rejection callback from another attempt must never release this one.
    if (!owned || owned.hash) return;
    const current = read();
    if (current?.id === owned.id && current.hash) return;
    try {
      storage().setItem(exitedKey(locate(storage()).at, owned.id), "1");
    } catch {
      /* Unsaved, a sequence resumed over it asks for the user's check. */
    }
    // Removing the record must not uncover a settlement of an earlier
    // attempt: unless this reservation is the verified latest, it stays as
    // released instead, which still invalidates that settlement.
    if (markedLatest(owned.id)) clear(owned);
    else {
      const store = storage();
      const { at } = locate(store);
      store.setItem(releasedKey(at, owned.id), "1");
    }
    // Nothing was sent: kept so a saved attempt of it retires instead of asking for a check.
    try {
      storage().setItem(rejectedKey, JSON.stringify({ id: owned.id }));
    } catch {
      /* Unsaved, its saved attempt asks for the user's check. */
    }
    owned = undefined;
  }
  /** Save `id` as the call's latest reservation, verified by reading it back. */
  function markedLatest(id: string): boolean {
    // When it was reserved too, so another key's settlement can be ordered against it.
    const marker = JSON.stringify({ id, at: Date.now() });
    try {
      const store = storage();
      store.setItem(latestKey, marker);
      return store.getItem(latestKey) === marker;
    } catch {
      return false;
    }
  }
  /**
   * Save the nonce the chain showed for the saved hash. It is extra evidence:
   * a failed save keeps the record as it was.
   */
  function bind(
    saved: ReviewedWriteRecoveryRecord,
    sentNonce: string,
  ): ReviewedWriteRecoveryRecord {
    const bound = recordOf({ ...saved, sentNonce });
    try {
      const store = storage();
      const { at, raw } = locate(store);
      const current = readStored(raw, at, scopeAt(at));
      if (JSON.stringify(current) !== JSON.stringify(recordOf(saved)))
        return saved;
      persist(bound, at);
      return bound;
    } catch {
      return saved;
    }
  }
  /** `replace`: the exact call was found at its nonce under another hash, as after a wallet speed-up. */
  function record(
    hash: Hex,
    expected: ReviewedWriteRecoveryRecord | undefined,
    replace: boolean,
  ): ReviewedWriteRecoveryRecord {
    requireLock();
    if (!isBytes32(hash))
      throw new ReviewLineError(
        "The wallet returned an invalid transaction identity.",
      );
    const previous = expected && recordOf(expected);
    const submittedHash = hash.toLowerCase() as Hex;
    if (
      !previous ||
      keyOf(previous) !== key ||
      (!replace && previous.hash && previous.hash !== submittedHash)
    ) {
      throw new ReviewLineError(
        "Write recovery changed before submission was recorded.",
      );
    }
    // A hash the wallet returns now starts its clock; a speed-up found at its nonce keeps it.
    const submittedAt =
      replace || previous.hash === submittedHash
        ? previous.submittedAt
        : String(Date.now());
    const submitted = recordOf({
      ...previous,
      hash: submittedHash,
      ...(submittedAt === undefined ? {} : { submittedAt }),
      // A mined clock belongs to the hash it was seen for.
      ...(previous.hash === submittedHash ? {} : { minedAt: undefined }),
    });
    let raw: string | null;
    let at = key;
    try {
      ({ at, raw } = locate(storage()));
    } catch (cause) {
      owned = submitted;
      rememberSubmission(submitted, at);
      throw new SubmittedWritePersistenceError(submitted, cause);
    }
    // A record the user released keeps its marker: a late hash leaves it released.
    const current = readStored(raw, at, scopeAt(at));
    if (
      !current ||
      JSON.stringify({
        ...current,
        hash: undefined,
        submittedAt: undefined,
      }) !==
        JSON.stringify({
          ...previous,
          hash: undefined,
          submittedAt: undefined,
        }) ||
      (!replace && current.hash && current.hash !== submittedHash)
    ) {
      throw new ReviewLineError(
        "Write recovery changed before submission was recorded.",
      );
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
    /** The canonical recovery scope this call's records are saved under. */
    scopeKey: key,
    /**
     * Save the attempt before the wallet opens. `evidence`, the account's next
     * nonce from {@link readReviewedWriteNonce}, lets `resolve` release it
     * on proof from the chain. `adopted` is what a previous deploy saved of
     * a write it saw sent: its hash, and when it was sent.
     */
    reserve(
      actualCall?: ReviewedWriteRecoveryInput["call"],
      evidence?: ReviewedWriteNonceEvidence,
      adopted: { hash?: Hex; submittedAt?: string } = {},
    ): ReviewedWriteRecoveryRecord {
      requireLock();
      // A reused Safe proposal may have a different, already verified deadline.
      // Retain its actual call, without widening the unresolved-action scope.
      const actual = actualCall
        ? normalized({ ...reviewed, call: actualCall })
        : reviewed;
      if (legacyScope(actual) !== legacyScope(reviewed))
        throw new ReviewLineError(
          "The adopted write has a different recovery scope.",
        );
      const nonce = evidence && uint256(evidence.nonce);
      const fromBlock = evidence && uint256(evidence.blockNumber);
      if (evidence && (nonce === null || fromBlock === null))
        throw new ReviewLineError("Invalid write recovery nonce evidence.");
      const store = storage();
      const { at, raw } = locate(store);
      if (readRecovery(store, at, raw, scopeAt(at)))
        throw new ReviewLineError(
          "An earlier wallet write is still unresolved. Check it before trying again.",
        );
      // The record this one replaces, if the user released it: its marker goes too.
      let replaced: unknown;
      try {
        replaced = at === key && raw !== null ? JSON.parse(raw)?.id : undefined;
      } catch {
        /* An unreadable record leaves no marker to clean. */
      }
      const record: ReviewedWriteRecoveryRecord = {
        version: 1,
        id: globalThis.crypto.randomUUID(),
        ...actual,
        ...(evidence
          ? { nonce: nonce!.toString(), fromBlock: fromBlock!.toString() }
          : {}),
        ...(adopted.hash === undefined ? {} : { hash: adopted.hash }),
        ...(adopted.submittedAt === undefined
          ? {}
          : { submittedAt: adopted.submittedAt }),
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
      if (typeof replaced === "string" && replaced !== record.id)
        try {
          store.removeItem(releasedKey(key, replaced));
          store.removeItem(exitedKey(key, replaced));
        } catch {
          /* A leftover marker names only the old record. */
        }
      // This reservation is the call's latest: a settlement of an earlier one
      // is no longer read. Kept after a rejection or exit.
      // The marker is verified by reading it back; where an older one still
      // shows, the old settlement goes too. Either way the saved record
      // itself outranks any settlement of another attempt.
      if (!markedLatest(record.id))
        try {
          store.removeItem(settledKey);
        } catch {
          /* The saved record still outranks it. */
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
     * Hold this key with a mirror of `source`, the write reserved under the
     * intent namespace `of`: its id and nonce evidence, this key's call and
     * scope. Replaces only an earlier mirror of the same intent.
     */
    mirror(
      source: ReviewedWriteRecoveryRecord,
      of: string,
    ): ReviewedWriteRecoveryRecord {
      requireLock();
      const current = read();
      if (current && current.mirrorOf !== of)
        throw new ReviewLineError(
          "An earlier wallet write is still unresolved. Check it before trying again.",
        );
      const mirrored = recordOf({
        version: 1,
        id: source.id,
        ...reviewed,
        ...(source.nonce === undefined ? {} : { nonce: source.nonce }),
        ...(source.fromBlock === undefined
          ? {}
          : { fromBlock: source.fromBlock }),
        mirrorOf: of,
      });
      persist(mirrored, key);
      // Its generation stays readable after the mirror is removed.
      markedLatest(mirrored.id);
      return mirrored;
    },
    /**
     * When the call's latest reservation was made, in milliseconds since the
     * epoch, from its latest marker; undefined when unknown (none, or one an
     * earlier version saved without a time).
     */
    latestReservedAt(): number | undefined {
      try {
        const at = (
          JSON.parse(storage().getItem(latestKey) ?? "null") as {
            at?: unknown;
          } | null
        )?.at;
        return typeof at === "number" ? at : undefined;
      } catch {
        return undefined;
      }
    },
    /** When the call's saved settlement was saved, or undefined. */
    settledAt(): number | undefined {
      try {
        const at = (
          JSON.parse(storage().getItem(settledKey) ?? "null") as {
            at?: unknown;
          } | null
        )?.at;
        return typeof at === "number" ? at : undefined;
      } catch {
        return undefined;
      }
    },
    /** Whether the record `id` ended by the user's exit, or because nothing was sent. */
    released(id: string): boolean {
      try {
        const store = storage();
        return store.getItem(exitedKey(locate(store).at, id)) !== null;
      } catch {
        return false;
      }
    },
    /**
     * The call's latest reservation id: the record saved at the key (held,
     * or released by its exit), or else the saved latest marker.
     */
    latestReservation(): string | undefined {
      try {
        const store = storage();
        const raw = locate(store).raw;
        const id =
          (raw === null ? undefined : idOf(raw)) ??
          (
            JSON.parse(store.getItem(latestKey) ?? "null") as {
              id?: unknown;
            } | null
          )?.id;
        return typeof id === "string" ? id : undefined;
      } catch {
        return undefined;
      }
    },
    /**
     * Read this call's record, settlement and latest marker fresh, throwing
     * when any can't be read or parsed: what a decision that must not act on
     * an unresolved read (a retirement) checks before trusting read() and
     * settled(), which read an unreadable value as none.
     */
    assertReadable(): void {
      const store = storage() as HeldWriteStorage;
      const strict = (at: string) =>
        store.getItemStrict ? store.getItemStrict(at) : store.getItem(at);
      for (const at of [key, settledKey, latestKey, legacyKey]) {
        if (at === undefined) continue;
        const raw = strict(at);
        if (raw === null) continue;
        const id = (JSON.parse(raw) as { id?: unknown } | null)?.id;
        // A record's release marker decides whether it still holds.
        if ((at === key || at === legacyKey) && typeof id === "string")
          strict(releasedKey(at, id));
      }
    },
    /**
     * The reservation the SDK last dropped because nothing was sent (the
     * wallet refused, or the send aborted before it opened), if saved.
     */
    rejectedReservation(): string | undefined {
      try {
        const id = (
          JSON.parse(storage().getItem(rejectedKey) ?? "null") as {
            id?: unknown;
          } | null
        )?.id;
        return typeof id === "string" ? id : undefined;
      } catch {
        return undefined;
      }
    },
    /**
     * Save how the call's last write ended, on authenticated evidence (its
     * verified receipt or canonical execution), for any later reader: another
     * tab, a reload. The next reservation replaces it. Extra evidence: a
     * failed save keeps none.
     */
    markSettled(
      expected: ReviewedWriteRecoveryRecord,
      settlement: ReviewedWriteSettlement,
    ): void {
      requireLock();
      try {
        storage().setItem(
          settledKey,
          JSON.stringify({
            id: expected.id,
            result: settlement.result,
            hash: settlement.hash.toLowerCase(),
            ...(settlement.blockHash
              ? { blockHash: settlement.blockHash.toLowerCase() }
              : {}),
            ...(settlement.safe ? { safe: true } : {}),
            at: Date.now(),
          }),
        );
      } catch {
        /* Only the settling caller learns it. */
      }
    },
    /**
     * Mark the saved settlement `settled` names (its hash) acknowledged,
     * keeping its result and hash for every reader. Another settlement stays.
     */
    acknowledgeSettled(settled: ReviewedWriteSettlement): void {
      requireLock();
      const store = storage();
      try {
        const raw = store.getItem(settledKey);
        const saved = JSON.parse(raw ?? "null") as {
          hash?: unknown;
        } | null;
        if (saved?.hash === settled.hash.toLowerCase())
          store.setItem(
            settledKey,
            JSON.stringify({ ...saved, acknowledged: true }),
          );
      } catch {
        /* An unreadable settlement names none; a refused write keeps it unacknowledged. */
      }
    },
    /**
     * Claim the one `onConfirmed` notice of the settlement `settled` names
     * (its hash): true for the first claim in any tab, false after. The claim
     * is saved on the settlement; one this storage can't mark is claimed in
     * this tab's memory only.
     */
    claimConfirmedSettled(
      settled: Pick<ReviewedWriteSettlement, "hash">,
    ): boolean {
      requireLock();
      const store = storage();
      const hash = settled.hash.toLowerCase();
      const here = confirmedHere.get(store) ?? new Set<string>();
      confirmedHere.set(store, here);
      const claim = `${settledKey}:${hash}`;
      if (here.has(claim)) return false;
      here.add(claim);
      try {
        const saved = JSON.parse(store.getItem(settledKey) ?? "null") as {
          hash?: unknown;
          confirmed?: unknown;
        } | null;
        if (saved?.hash === hash) {
          if (saved.confirmed === true) return false;
          store.setItem(
            settledKey,
            JSON.stringify({ ...saved, confirmed: true }),
          );
        }
      } catch {
        /* Claimed in this tab's memory. */
      }
      return true;
    },
    /**
     * How the call's last write ended, if {@link markSettled} saved it for
     * the call's latest reservation; a settlement of an earlier one reads as
     * none, wherever it was kept.
     */
    settled(): ReviewedWriteSettlement | undefined {
      try {
        const store = storage();
        const latest = JSON.parse(store.getItem(latestKey) ?? "null") as {
          id?: unknown;
          at?: unknown;
        } | null;
        const saved = JSON.parse(store.getItem(settledKey) ?? "null") as {
          id?: unknown;
          result?: unknown;
          hash?: unknown;
          blockHash?: unknown;
          safe?: unknown;
          acknowledged?: unknown;
        } | null;
        // A record saved at the key (held, or released by the user's exit)
        // belongs to its own attempt; only none, or the settled one, lets the
        // settlement through.
        const { raw } = locate(store);
        return saved &&
          typeof saved.id === "string" &&
          saved.id === latest?.id &&
          (raw === null || idOf(raw) === saved.id) &&
          (saved.result === "success" || saved.result === "failed") &&
          isBytes32(saved.hash)
          ? {
              result: saved.result,
              hash: saved.hash as Hex,
              ...(isBytes32(saved.blockHash)
                ? { blockHash: saved.blockHash as Hex }
                : {}),
              ...(saved.safe === true ? { safe: true as const } : {}),
              // Saved before 2.39 (a latest marker with no time): the user
              // saw it then, so it reads as acknowledged.
              ...(saved.acknowledged === true || typeof latest.at !== "number"
                ? { acknowledged: true as const }
                : {}),
            }
          : undefined;
      } catch {
        return undefined;
      }
    },
    /**
     * Start the clock of a hash saved before `submittedAt` existed: save now
     * as its `firstSeenAt`, once. Extra evidence: a stale snapshot or a failed
     * save keeps the record as it was.
     */
    firstSeen(
      expected: ReviewedWriteRecoveryRecord,
    ): ReviewedWriteRecoveryRecord {
      return amend(
        expected,
        (current) =>
          current.submittedAt === undefined &&
          current.firstSeenAt === undefined,
        { firstSeenAt: String(Date.now()) },
      );
    },
    /**
     * Save who sent a Safe execution the wallet returned at once, and at which
     * nonce, from its authenticated transaction, once: its canonical
     * replacement can then be proven. Extra evidence only.
     */
    sentBy(
      expected: ReviewedWriteRecoveryRecord,
      from: Address,
      nonce: bigint,
    ): ReviewedWriteRecoveryRecord {
      return amend(
        expected,
        (current) => current.safe && current.sentFrom === undefined,
        { sentFrom: from, sentNonce: nonce.toString() },
      );
    },
    /**
     * Drop the proof that `expected` ran, once its execution is gone from the
     * chain: it is held again as an unproven write. Extra evidence only.
     */
    unexecuted(
      expected: ReviewedWriteRecoveryRecord,
    ): ReviewedWriteRecoveryRecord {
      return amend(expected, (current) => current.executed === true, {
        executed: undefined,
        executionHash: undefined,
      });
    },
    /**
     * Save that another Safe transaction used this Safe write's nonce. Any
     * saved execution goes: the user's exit, not the chain, ends it.
     */
    replacedOnChain(
      expected: ReviewedWriteRecoveryRecord,
    ): ReviewedWriteRecoveryRecord {
      return amend(expected, (current) => current.safe && !current.replaced, {
        executed: undefined,
        executionHash: undefined,
        replaced: true,
      });
    },
    /**
     * Note whether the node knows the saved hash (seen with its sent nonce)
     * right now: unknown starts the clock once; known clears it. Extra
     * evidence only.
     */
    vanished(
      expected: ReviewedWriteRecoveryRecord,
      gone: boolean,
    ): ReviewedWriteRecoveryRecord {
      return amend(
        expected,
        (current) =>
          current.sentNonce !== undefined &&
          (current.vanishedAt === undefined) === gone,
        { vanishedAt: gone ? String(Date.now()) : undefined },
      );
    },
    /**
     * Keep `hash` as a candidate execution of this Safe write, unproven.
     * No cap: candidates come only from the app's own wallet replies, bounded
     * by the user's actions; add one if an outside path ever reports them.
     * Extra evidence only: a failed save keeps the record as it was.
     */
    candidate(
      expected: ReviewedWriteRecoveryRecord,
      hash: Hex,
    ): ReviewedWriteRecoveryRecord {
      if (!isBytes32(hash)) return recordOf(expected);
      const wanted = hash.toLowerCase() as Hex;
      const known = recordOf(expected).candidates ?? [];
      return amend(
        expected,
        (current) => current.safe && !known.includes(wanted),
        {
          candidates: [...known, wanted],
          candidateSeenAt: {
            ...recordOf(expected).candidateSeenAt,
            [wanted]: String(Date.now()),
          },
        },
      );
    },
    /** Drop a candidate whose own receipt proved it isn't this write's execution. */
    disproven(
      expected: ReviewedWriteRecoveryRecord,
      hash: Hex,
    ): ReviewedWriteRecoveryRecord {
      const known = recordOf(expected).candidates ?? [];
      const rest = known.filter((candidate) => candidate !== hash);
      const { [hash]: _, ...seen } = recordOf(expected).candidateSeenAt ?? {};
      return amend(expected, () => rest.length !== known.length, {
        candidates: rest.length ? rest : undefined,
        candidateSeenAt: Object.keys(seen).length ? seen : undefined,
      });
    },
    /** Note that a read just showed the saved hash pending. Extra evidence only. */
    seenPending(
      expected: ReviewedWriteRecoveryRecord,
    ): ReviewedWriteRecoveryRecord {
      return amend(expected, () => true, {
        pendingSeenAt: String(Date.now()),
      });
    },
    /**
     * Note whether the saved hash is mined with its receipt unreadable right
     * now: mined starts the clock once; pending again clears it. Extra
     * evidence only.
     */
    mined(
      expected: ReviewedWriteRecoveryRecord,
      seen: boolean,
    ): ReviewedWriteRecoveryRecord {
      return amend(
        expected,
        (current) => (current.minedAt === undefined) === seen,
        { minedAt: seen ? String(Date.now()) : undefined },
      );
    },
    /** {@link mined}, for one candidate hash. */
    candidateMined(
      expected: ReviewedWriteRecoveryRecord,
      hash: Hex,
      seen: boolean,
    ): ReviewedWriteRecoveryRecord {
      const clocks = { ...recordOf(expected).candidateMinedAt };
      if (seen) clocks[hash] ??= String(Date.now());
      else delete clocks[hash];
      return amend(
        expected,
        (current) =>
          JSON.stringify(current.candidateMinedAt ?? {}) !==
          JSON.stringify(clocks),
        {
          candidateMinedAt: Object.keys(clocks).length ? clocks : undefined,
        },
      );
    },
    /**
     * Save that the app's follower of this Safe write ended without proof.
     * A proven execution or replacement keeps its own state.
     */
    unprovenEnd(
      expected: ReviewedWriteRecoveryRecord,
    ): ReviewedWriteRecoveryRecord {
      return amend(
        expected,
        (current) =>
          current.safe &&
          !current.executed &&
          !current.replaced &&
          !current.unproven,
        { unproven: true },
      );
    },
    /**
     * Safe's service lists the proposal unexecuted again: it is truly
     * pending, so an unproven end is undone and its unseen clock restarts.
     * Extra evidence: a stale snapshot keeps the record as it was.
     */
    listedAgain(
      expected: ReviewedWriteRecoveryRecord,
    ): ReviewedWriteRecoveryRecord {
      return amend(expected, (current) => current.safe && !current.executed, {
        unproven: undefined,
        pendingSeenAt: String(Date.now()),
      });
    },
    /**
     * Save a Safe proposal's nonce from its authenticated record, once. Extra
     * evidence: a stale snapshot or a failed save keeps the record as it was.
     */
    proposalNonce(
      expected: ReviewedWriteRecoveryRecord,
      nonce: bigint,
    ): ReviewedWriteRecoveryRecord {
      return amend(
        expected,
        (current) => current.safe && current.safeNonce === undefined,
        { safeNonce: nonce.toString() },
      );
    },
    /**
     * Save the chain's proof that `expected` ran, with the transaction it ran
     * in when known. From then on the user's exit refuses it: only its result
     * ({@link verifyReviewedWriteReceipt}) releases it.
     */
    executed(
      expected: ReviewedWriteRecoveryRecord,
      executionHash?: Hex,
    ): ReviewedWriteRecoveryRecord {
      requireLock();
      if (executionHash !== undefined && !isBytes32(executionHash))
        throw new ReviewLineError("Invalid execution transaction identity.");
      const store = storage();
      const { at, raw } = locate(store);
      const current = readRecovery(store, at, raw, scopeAt(at));
      const wanted = recordOf(expected);
      if (
        !current?.hash ||
        current.id !== wanted.id ||
        current.hash !== wanted.hash
      )
        throw new ReviewLineError(
          "Write recovery changed. Keep the current action pending.",
        );
      const next = recordOf({
        ...current,
        executed: true,
        ...((executionHash ?? current.executionHash)
          ? { executionHash: executionHash ?? current.executionHash }
          : {}),
      });
      persist(next, at);
      unpersistedSubmissions.get(store)?.delete(at);
      return next;
    },
    /**
     * Check the saved write against the chain ({@link checkReviewedWrite}) and
     * apply the finding: `sent` records the hash to track. Nothing here
     * releases a write; null when nothing is saved.
     */
    async resolve(
      client: ReviewedWriteNonceClient,
      checkOptions?: { effect?: (chainId: number) => Promise<boolean> },
    ): Promise<ReviewedWriteCheck | null> {
      requireLock();
      let saved = read();
      if (!saved) return null;
      const { check, sentNonce } = await inspectWrite(
        client,
        saved,
        checkOptions?.effect,
      );
      if (sentNonce !== undefined && saved.sentNonce !== sentNonce)
        saved = bind(saved, sentNonce);
      if (check.status === "sent" && check.hash !== saved.hash)
        record(check.hash, saved, true);
      return check;
    },
    /**
     * The user confirmed they checked their wallet; release the write. It
     * marks only the record `expected` names (by its ID) as released and never
     * removes the saved key, so a stale exit can't erase a newer write another
     * tab saved there. It needs no lock and still works when the cross-tab lock
     * can't be taken; new sends still need `withLock`. `expected` may be what
     * `read()` showed, including a returned hash kept only in memory.
     */
    abandon(
      expected: ReviewedWriteRecoveryRecord,
      acknowledgement: { checkedWallet: true },
    ): void {
      if (acknowledgement?.checkedWallet !== true)
        throw new ReviewLineError(
          "Release a held write only after the user confirms they checked their wallet.",
        );
      const wanted = JSON.stringify(recordOf(expected));
      const store = storage();
      const { at, raw } = locate(store);
      const durable = readStored(raw, at, scopeAt(at), store);
      if (!durable) return;
      if (durable.executed)
        throw new ReviewLineError(
          "This write ran onchain. Keep it held until its result is known.",
        );
      const shown = readRecovery(store, at, raw, scopeAt(at));
      if (
        JSON.stringify(durable) !== wanted &&
        JSON.stringify(shown) !== wanted
      )
        throw new ReviewLineError(
          "Write recovery changed. Keep the current action pending.",
        );
      const marker = releasedKey(at, durable.id);
      try {
        store.setItem(exitedKey(at, durable.id), "1");
      } catch {
        /* Unsaved, a sequence resumed over it asks for the user's check. */
      }
      store.setItem(marker, "1");
      if (store.getItem(marker) !== "1")
        throw new ReviewLineError(
          "Write recovery storage did not release the action.",
        );
      const memory = unpersistedSubmissions.get(store);
      if (memory?.get(at)?.id === durable.id) memory.delete(at);
      if (owned?.id === durable.id) owned = undefined;
    },
    async withLock<T>(work: () => Promise<T>, wait = false): Promise<T> {
      const locks = options.locks ?? browserLocks();
      return locks.request(
        key,
        { mode: "exclusive", ...(!wait && { ifAvailable: true }) },
        async (lock) => {
          if (!lock)
            throw new ReviewLineError(
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
  /**
   * Nothing proven yet. The user's exit (`abandon`) stays open. `usedBy`:
   * the node doesn't know the saved hash, and a canonical finalized block
   * shows this other transaction used the nonce the write was sent at, so
   * the saved hash can never run (a wrapper may still have run the call).
   */
  | {
      status: "pending";
      usedBy?: Hex;
      /** The app's effect read shows the call took effect. It releases nothing: the user's exit decides. */
      effect?: true;
    }
  /**
   * The saved hash is the transaction at its nonce, or the exact call is,
   * under another hash, at the nonce the saved hash was sent at (a wallet
   * speed-up): track that receipt.
   */
  | { status: "sent"; hash: Hex };

/** The reads {@link checkReviewedWrite} makes; a viem PublicClient satisfies it. */
export type ReviewedWriteNonceClient = Pick<
  PublicClient,
  "getBlock" | "getChainId" | "getTransaction" | "getTransactionCount"
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
 * What the chain shows of a saved ordinary write. Every read is on the
 * record's chain, at or below a canonical finalized block where it matters.
 *
 * - The saved hash, when the node knows it, is the transaction: `sent` once
 *   mined (its receipt decides, wallet wrappers included), `pending` while in
 *   the mempool. Its nonce is the nonce it was sent at (`sentNonce`).
 * - Otherwise, once the account's nonce is past the nonce to look at, the
 *   block where it moved holds the transaction that used it. The saved hash or
 *   the exact call there is `sent`. Any other transaction there may have run
 *   the call inside it (a wrapper, or an EIP-7702 wallet that ran code and
 *   cleared its delegation in the same block), so it stays `pending` and the
 *   user's exit (`abandon`) ends it.
 * - `effect`, the app's read of the call's result on the saved chain, ends it
 *   as `ran` when true. The client's chain is checked first.
 *
 * Anything else stays `pending`: a Safe write, a record without nonce
 * evidence, another chain, or a node without the history to answer.
 */
export async function checkReviewedWrite(
  client: ReviewedWriteNonceClient,
  saved: ReviewedWriteRecoveryRecord,
  { effect }: { effect?: (chainId: number) => Promise<boolean> } = {},
): Promise<ReviewedWriteCheck> {
  return (await inspectWrite(client, saved, effect)).check;
}

async function inspectWrite(
  client: ReviewedWriteNonceClient,
  saved: ReviewedWriteRecoveryRecord,
  effect: ((chainId: number) => Promise<boolean>) | undefined,
): Promise<{ check: ReviewedWriteCheck; sentNonce?: string }> {
  const record = recordOf(saved);
  // No proof, the app's effect read included, from another chain, and none
  // here for a Safe write.
  if (
    record.safe ||
    (await client.getChainId().catch(() => null)) !== record.chainId
  )
    return { check: { status: "pending" } };
  const found = await inspectOrdinary(client, record);
  if (
    found.check.status === "pending" &&
    effect &&
    (await effect(record.chainId).catch(() => false))
  )
    return { ...found, check: { ...found.check, effect: true } };
  return found;
}

async function inspectOrdinary(
  client: ReviewedWriteNonceClient,
  record: ReviewedWriteRecoveryRecord,
): Promise<{ check: ReviewedWriteCheck; sentNonce?: string }> {
  const pending = { check: { status: "pending" } as const };
  if (record.hash) {
    const sent = await client.getTransaction({ hash: record.hash }).then(
      (tx) => tx,
      (error: { name?: unknown } | null) =>
        error?.name === "TransactionNotFoundError" ? null : undefined,
    );
    if (sent === undefined) return pending;
    if (sent) {
      // Only the saved hash's own transaction, on the saved chain, is evidence.
      if (
        sent.from?.toLowerCase() !== record.account ||
        sent.hash?.toLowerCase() !== record.hash ||
        (sent.chainId !== undefined && sent.chainId !== record.chainId)
      )
        return pending;
      const sentNonce = BigInt(sent.nonce).toString();
      if (sent.blockNumber !== null && sent.blockNumber !== undefined)
        return { check: { status: "sent", hash: record.hash }, sentNonce };
      // A node may keep a dropped hash pending: a canonical finalized block
      // that shows its sent nonce used by another transaction still decides.
      return {
        check: await atNonce(
          client,
          record,
          BigInt(sentNonce),
          BigInt(record.fromBlock ?? "0"),
          true,
        ),
        sentNonce,
      };
    }
  }
  const bound = record.hash !== undefined && record.sentNonce !== undefined;
  const target = bound ? record.sentNonce : record.nonce;
  // The nonce a hash was sent at is authenticated by its own transaction, so
  // a record saved without a starting block searches from genesis instead.
  const from = record.fromBlock ?? (bound ? "0" : undefined);
  if (target === undefined || from === undefined) return pending;
  return {
    check: await atNonce(client, record, BigInt(target), BigInt(from), bound),
  };
}

/** What the transaction the account sent at `nonce` says of the saved write; `bound`: the saved hash's own sent nonce. */
async function atNonce(
  client: ReviewedWriteNonceClient,
  record: ReviewedWriteRecoveryRecord,
  nonce: bigint,
  fromBlock: bigint,
  bound: boolean,
): Promise<ReviewedWriteCheck> {
  const pending = { status: "pending" } as const;
  const used = await findTransactionAtNonce(
    client,
    record.account,
    nonce,
    fromBlock,
  );
  if (!used) return pending;
  if (used.hash === record.hash) return { status: "sent", hash: used.hash };
  const sameCall =
    used.to?.toLowerCase() === record.call.to &&
    used.input?.toLowerCase() === record.call.data &&
    BigInt(used.value ?? 0) === BigInt(record.call.value);
  // Another hash is adopted only at the nonce the saved hash's own
  // transaction was sent at; the pre-wallet nonce only locates the call.
  if (sameCall) return bound ? { status: "sent", hash: used.hash } : pending;
  // Another transaction at that nonce may have run the call inside it
  // (a wrapper, or an EIP-7702 wallet that ran code and then cleared its
  // delegation), so it proves nothing. The user's exit ends it.
  return { status: "pending", usedBy: used.hash };
}

/**
 * The transaction `account` sent at `nonce`, once the account's nonce is past
 * it at a canonical finalized block: a search of its nonce from `fromBlock`
 * finds the block where it moved. Null while that is unproven or the node
 * can't say (no history, a reorganized answer).
 */
export async function findTransactionAtNonce(
  client: Pick<ReviewedWriteNonceClient, "getBlock" | "getTransactionCount">,
  account: Address,
  nonce: bigint,
  fromBlock = 0n,
): Promise<{
  hash: Hex;
  to?: Address | null;
  input?: Hex;
  value?: bigint;
} | null> {
  const from = account.toLowerCase();
  const count = async (blockNumber: bigint) =>
    BigInt(await client.getTransactionCount({ address: account, blockNumber }));
  const proof = await atCanonicalFinalizedBlock(
    client as Pick<RelayrFinalizedClient, "getBlock">,
    async (finalized) => {
      let low = fromBlock;
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
                tx.from?.toLowerCase() === from && BigInt(tx.nonce) === nonce,
            )
          : undefined;
      if (!used || !isBytes32(used.hash)) return null;
      return { ...used, hash: used.hash.toLowerCase() as Hex };
    },
  );
  return proof?.value ?? null;
}

/** Minimal RPC reads; PublicClient instances for any chain satisfy this shape. */
export type ReviewedWriteReceiptClient = {
  getChainId(): Promise<number>;
  /** Reads a Safe's nonce when the write is a Safe's execTransaction. */
  request?: PublicClient["request"];
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
 * The calls a Safe hold's call encodes when it is a MultiSend batch (a
 * zero-value call to MultiSendCallOnly, which the Safe runs by DELEGATECALL),
 * normalized; null for any other call.
 */
function heldBatch(
  record: ReviewedWriteRecoveryRecord,
): ReviewedWriteRecoveryRecord["call"][] | null {
  const inner =
    record.safe && record.call.value === "0"
      ? multiSendCallsOf({ ...record.call, operation: 1 })
      : null;
  return inner && inner.map((call) => normalized({ ...record, call }).call);
}

/**
 * The MultiSend targets a held batch may run through: a Safe app folds the
 * same calls into its own version's MultiSendCallOnly, so any recognized
 * deployment carries exactly the held calldata.
 */
const BATCH_TARGETS = MULTI_SEND_CALL_ONLY_DEPLOYMENTS.map((to) =>
  to.toLowerCase(),
);

/** Whether `transaction` is the Safe's execTransaction of exactly the held batch: a recognized MultiSendCallOnly, its calldata, zero value and DELEGATECALL. */
function runsHeldBatch(
  transaction: { to?: Address | null; input?: Hex },
  record: ReviewedWriteRecoveryRecord,
): boolean {
  try {
    const { functionName, args } = decodeFunctionData({
      abi: SAFE_EXEC_ABI,
      data: transaction.input!,
    });
    if (functionName !== "execTransaction") return false;
    const [to, value, data, operation] = args;
    return (
      BATCH_TARGETS.includes(to.toLowerCase()) &&
      value === 0n &&
      data.toLowerCase() === record.call.data &&
      operation === 1
    );
  } catch {
    return false;
  }
}

/**
 * The Safe proposal of the held Safe write's call at `nonce`, as SDK writes
 * propose it (no refund): a batch hold's MultiSend by DELEGATECALL.
 */
export function heldSafeProposal(
  input: ReviewedWriteRecoveryInput,
  nonce: number,
): ReturnType<typeof safeProposalFor> {
  const record = normalized(input);
  return {
    ...safeProposalFor(
      { ...record.call, value: BigInt(record.call.value) },
      nonce,
    ),
    ...(heldBatch({ ...record, version: 1, id: "" }) ? { operation: 1 } : {}),
  };
}

/**
 * Whether Safe's `proposal` is exactly the held Safe write's call: a batch
 * hold's MultiSend by DELEGATECALL, any other call by CALL.
 */
export function safeProposalIsHeldCall(
  proposal: Parameters<typeof safeTransactionMatchesCall>[0],
  input: ReviewedWriteRecoveryInput,
): boolean {
  const record = normalized(input);
  const call = { ...record.call, value: BigInt(record.call.value) };
  return heldBatch({ ...record, version: 1, id: "" })
    ? BATCH_TARGETS.some((to) =>
        safeTransactionMatchesCall(proposal, {
          ...call,
          to: to as Address,
          operation: 1,
        }),
      )
    : safeTransactionMatchesCall(proposal, call);
}

/**
 * Authenticate the saved wallet identity, canonical inclusion and Safe effect.
 * Ordinary wallet wrappers are allowed: the wallet's returned hash binds their
 * execution. A wallet-returned Safe proposal hash authenticates its execution
 * event even through a wrapper; an immediate execution hash additionally needs
 * exact reviewed calldata. A failure releases only after finality by
 * default; `finality: false` authenticates a canonical failure before it is
 * final (the write hold passes it for direct writes).
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
  { finality = true }: { finality?: boolean } = {},
): Promise<"success" | "failed"> {
  const record = recordOf(saved);
  const pending = () =>
    new ReviewLineError(
      "The saved wallet write is not yet proven. Keep this action pending.",
    );
  // A batch hold's call is its MultiSend: its proof is the calls it encodes.
  const batch = heldBatch(record);
  let calls = batch ?? [record.call];
  if (proof) {
    if (
      !record.safe ||
      !Array.isArray(proof.calls) ||
      !proof.calls.length ||
      (proof.batch !== undefined && typeof proof.batch !== "boolean")
    )
      throw pending();
    const proven = proof.calls.map(
      (call) => normalized({ ...record, call }).call,
    );
    if (
      batch
        ? proof.batch !== true ||
          JSON.stringify(proven) !== JSON.stringify(batch)
        : JSON.stringify(proven[0]) !== JSON.stringify(record.call)
    )
      throw pending();
    calls = proven;
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
  // An execution the wallet returned at once whose own transaction reverted
  // ran nothing on the Safe: a failure, once final, when it was sent to it.
  const atOnceReverted =
    record.safe &&
    canonical.status === "reverted" &&
    hash.toLowerCase() === record.hash;
  if (atOnceReverted) {
    if (transaction.to?.toLowerCase() !== record.account) throw pending();
  } else if (record.safe) {
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
    // Run at once, a batch hold's execution must be its exact MultiSend by
    // DELEGATECALL: a direct CALL of a one-call batch's call is not it.
    if (
      batch &&
      hash.toLowerCase() === record.hash &&
      !runsHeldBatch(transaction, record)
    )
      throw pending();
    const result = await readSafeAppExecution({
      client: { getTransaction: async () => transaction },
      receipt: canonical,
      safe: record.account,
      proposalHash: record.hash,
      calls,
      batch: batch ? true : proof?.batch,
    });
    // A reverted outer executor has not consumed the Safe proposal's nonce.
    if (result.status !== "success" && result.status !== "failed")
      throw pending();
    status = result.status;
  } else if (status === "success" && isSafeExecTransaction(record.call.data)) {
    // A Safe's execTransaction succeeds only with the Safe's own
    // ExecutionSuccess for its exact hash: an ExecutionFailure, or no event
    // for it, is a failure whatever the receipt's status. A call that only
    // shares the selector, to anything but a Safe, is decided as any other.
    if (!client.request) throw pending();
    const { request } = client;
    const at = (blockNumber?: bigint) =>
      blockNumber === undefined ? "latest" : numberToHex(blockNumber);
    // Every read through the one `request` the receipt client has.
    const identity = await readAuthorityIdentity(
      {
        request,
        getCode: ({ address, blockNumber }) =>
          request({
            method: "eth_getCode",
            params: [address!, at(blockNumber)],
          }),
        getStorageAt: ({ address, slot, blockNumber }) =>
          request({
            method: "eth_getStorageAt",
            params: [address, slot, at(blockNumber)],
          }),
      } as Parameters<typeof readAuthorityIdentity>[0],
      record.call.to,
      { blockNumber: canonical.blockNumber },
    );
    if (!identity) throw pending();
    if (identity.kind === "safe") {
      const execution = await safeExecTransactionResult(
        { request: client.request },
        record.chainId,
        record.call.to,
        record.call.data,
        canonical,
      );
      if (execution?.status !== "success") status = "failed";
    }
  }
  const isCanonical = async () => {
    const block = await client.getBlock({ blockNumber: canonical.blockNumber });
    return (
      block.number === canonical.blockNumber &&
      block.hash?.toLowerCase() === canonical.blockHash.toLowerCase()
    );
  };
  if (status === "failed" && finality) {
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
    new ReviewLineError(
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
  if (!safeProposalIsHeldCall(proposal, record)) throw pending();
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
