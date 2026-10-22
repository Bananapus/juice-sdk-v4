import { isAddress, isHex, type Address, type Hex } from "viem";
import type { ReviewedCall } from "./send.js";
import {
  createHeldWriteStorage,
  browserLocks,
  listReviewedWrites,
  type HeldWriteStorage,
} from "./writeRecovery.js";

/**
 * A reviewed multi-step action saved once its review is confirmed, before
 * the first wallet call, and advanced as each step's receipt lands, so an
 * interrupted action resumes at its first incomplete step without sending a
 * completed one again.
 */
export type ReviewedSequenceRecord = {
  version: 1;
  id: string;
  account: Address;
  /** The site's action key, e.g. `payIntent(...)`. */
  scope: string;
  /** The last confirmed review's model. */
  modelId: Hex;
  calls: ReviewedCall[];
  /** Each completed step's transaction hash, in order: step `completed.length` is next. */
  completed: Hex[];
  /**
   * The step whose wallet call opened and whose receipt was not seen yet,
   * with its write hold's reservation: only that reservation's outcome
   * decides it.
   */
  sending?: { step: number; reservation: string };
  /** A Safe-connected step's proposal, waiting for its signers (`sending` names its reservation). */
  proposed?: { step: number; safeTxHash: Hex };
};

export const REVIEWED_SEQUENCE_HELD_LINE =
  "A step of this action is still pending. Nothing was discarded.";
export const REVIEWED_SEQUENCE_UNFINISHED_LINE =
  "An earlier run of this action is unfinished. Resume it or discard it.";
export const REVIEWED_SEQUENCE_MOVED_LINE =
  "This action moved on in another window. Nothing was sent; resume it again.";
export const REVIEWED_SEQUENCE_UNCERTAIN_LINE =
  "This step's outcome can't be confirmed here, so nothing was sent. Check your wallet's activity, then discard this action to start again.";

const PREFIX = "nana-sdk:sequence:";

type Options = { storage?: HeldWriteStorage };

function sequenceKey(scope: string, account: Address): string {
  if (!scope) throw new Error("Provide a sequence scope.");
  return `${PREFIX}${account.toLowerCase()}:${scope}`;
}

/**
 * JSON with every value tagged, so no saved argument can read as another
 * kind: a bigint is `{ n }`, every object `{ o }`.
 */
const encode = (value: unknown): unknown =>
  typeof value === "bigint"
    ? { n: value.toString() }
    : Array.isArray(value)
      ? value.map(encode)
      : value && typeof value === "object"
        ? {
            o: Object.fromEntries(
              Object.entries(value).map(([key, item]) => [key, encode(item)]),
            ),
          }
        : value;

const decode = (value: unknown): unknown =>
  Array.isArray(value)
    ? value.map(decode)
    : value && typeof value === "object"
      ? "n" in value
        ? BigInt(value.n as string)
        : Object.fromEntries(
            Object.entries((value as { o: object }).o).map(([key, item]) => [
              key,
              decode(item),
            ]),
          )
      : value;

const serialize = (record: ReviewedSequenceRecord) =>
  JSON.stringify(encode(record));

/** Run `work` under the sequence's lock across windows: every compare and change of its saved value. */
function locked<T>(key: string, work: () => T): Promise<T> {
  return browserLocks().request(key, { mode: "exclusive" }, async () =>
    work(),
  ) as Promise<T>;
}

function parse(raw: string | null, key: string): ReviewedSequenceRecord | null {
  if (raw === null) return null;
  try {
    const record = decode(JSON.parse(raw)) as ReviewedSequenceRecord;
    /** Only the next step can be in flight. */
    const step = (value: unknown) => value === record.completed.length;
    const valid =
      record.version === 1 &&
      typeof record.id === "string" &&
      isAddress(record.account, { strict: false }) &&
      typeof record.scope === "string" &&
      sequenceKey(record.scope, record.account) === key &&
      isHex(record.modelId) &&
      Array.isArray(record.calls) &&
      record.calls.length > 0 &&
      record.calls.every(
        (call) =>
          Number.isInteger(call?.chainId) &&
          isAddress(call.to, { strict: false }) &&
          isHex(call.data),
      ) &&
      Array.isArray(record.completed) &&
      record.completed.length < record.calls.length &&
      record.completed.every((hash) => isHex(hash)) &&
      (record.sending === undefined ||
        (step(record.sending.step) &&
          typeof record.sending.reservation === "string")) &&
      (record.proposed === undefined ||
        (step(record.proposed.step) &&
          record.sending?.step === record.proposed.step &&
          isHex(record.proposed.safeTxHash)));
    return valid ? record : null;
  } catch {
    return null;
  }
}

/** Whether anything of `record` was sent, or is in flight: only then is there a run to resume. */
const begun = (record: ReviewedSequenceRecord) =>
  record.completed.length > 0 || record.sending !== undefined;

/**
 * What is saved for `scope` and `account`: the raw value, which a run
 * passes back as `expected` to change it, and the unfinished sequence it
 * holds (one with a step sent or in flight), if any.
 */
export function readReviewedSequence(
  scope: string,
  account: Address,
  storage: HeldWriteStorage,
): { raw: string | null; record: ReviewedSequenceRecord | null } {
  const key = sequenceKey(scope, account);
  const raw = storage.getItem(key);
  const record = parse(raw, key);
  return { raw, record: record && begun(record) ? record : null };
}

/**
 * The unfinished sequence saved for `scope` and `account`: one with a step
 * sent or in flight. Null when none is (an unreadable one included).
 */
export function findReviewedSequence(
  scope: string,
  account: Address,
  options: Options = {},
): ReviewedSequenceRecord | null {
  return readReviewedSequence(
    scope,
    account,
    options.storage ?? createHeldWriteStorage(),
  ).record;
}

/**
 * Save `record` over exactly `expected`, the value this run last read or
 * wrote at its key, so another window's change since (a step it sent, or
 * the sequence it finished and removed) is never overwritten. Returns the
 * value written, the next `expected`.
 */
export function saveReviewedSequence(
  record: ReviewedSequenceRecord,
  storage: HeldWriteStorage,
  expected: string | null,
): Promise<string> {
  const key = sequenceKey(record.scope, record.account);
  return locked(key, () => {
    if (storage.getItem(key) !== expected)
      throw new Error(REVIEWED_SEQUENCE_MOVED_LINE);
    const raw = serialize(record);
    storage.setItem(key, raw);
    return raw;
  });
}

/** Remove `record` if its key still holds exactly `expected`. */
export function removeReviewedSequence(
  record: ReviewedSequenceRecord,
  storage: HeldWriteStorage,
  expected: string | null,
): Promise<void> {
  const key = sequenceKey(record.scope, record.account);
  return locked(key, () => {
    if (storage.getItem(key) !== expected)
      throw new Error(REVIEWED_SEQUENCE_MOVED_LINE);
    storage.removeItem(key);
  });
}

/**
 * Whether a remaining step of `record` has a write still held under the
 * write holds' storage: its intent (or a legacy one), or its exact call.
 */
function heldStep(
  record: ReviewedSequenceRecord,
  storage: HeldWriteStorage,
): boolean {
  return record.calls.some((call, step) => {
    if (step < record.completed.length) return false;
    const namespaces = [call.intent, ...(call.legacy ?? [])];
    return listReviewedWrites(
      { chainId: call.chainId, account: record.account },
      { storage },
    ).some(
      ({ record: held }) =>
        (held.namespace !== undefined && namespaces.includes(held.namespace)) ||
        (held.call.to.toLowerCase() === call.to.toLowerCase() &&
          held.call.data.toLowerCase() === call.data.toLowerCase() &&
          held.call.value === String(call.value ?? 0n)),
    );
  });
}

/**
 * Drop an unfinished sequence, so the action can be reviewed fresh. Refused
 * while any remaining step is held (sent, or proposed, and not yet settled):
 * its hold decides it first. Refused too when the saved sequence is no
 * longer `record` (another window moved it on).
 */
export function discardReviewedSequence(
  record: ReviewedSequenceRecord,
  options: Options = {},
): Promise<void> {
  const storage = options.storage ?? createHeldWriteStorage();
  return locked(sequenceKey(record.scope, record.account), () => {
    const saved = readReviewedSequence(
      record.scope,
      record.account,
      storage,
    ).record;
    if (!saved || serialize(saved) !== serialize(record))
      throw new Error(REVIEWED_SEQUENCE_MOVED_LINE);
    if (heldStep(saved, storage)) throw new Error(REVIEWED_SEQUENCE_HELD_LINE);
    storage.removeItem(sequenceKey(record.scope, record.account));
  });
}
