import { isAddress, isHex, type Address, type Hex } from "viem";
import type { ReviewedCall } from "./send.js";
import {
  createHeldWriteStorage,
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
  /** The step whose wallet call opened and whose receipt was not seen yet: its hold decides it. */
  sending?: number;
  /** A Safe-connected step's proposal, waiting for its signers. */
  proposed?: { step: number; safeTxHash: Hex };
};

export const REVIEWED_SEQUENCE_HELD_LINE =
  "A step of this action is still pending. Nothing was discarded.";
export const REVIEWED_SEQUENCE_UNFINISHED_LINE =
  "An earlier run of this action is unfinished. Resume it or discard it.";
export const REVIEWED_SEQUENCE_MOVED_LINE =
  "This action moved on in another window. Nothing was sent; resume it again.";

const PREFIX = "nana-sdk:sequence:";

type Options = { storage?: HeldWriteStorage };

function sequenceKey(scope: string, account: Address): string {
  if (!scope) throw new Error("Provide a sequence scope.");
  return `${PREFIX}${account.toLowerCase()}:${scope}`;
}

const BIGINT = "$bigint";

function serialize(record: ReviewedSequenceRecord): string {
  return JSON.stringify(record, (_, value) =>
    typeof value === "bigint" ? { [BIGINT]: value.toString() } : value,
  );
}

function parse(raw: string | null, key: string): ReviewedSequenceRecord | null {
  if (raw === null) return null;
  try {
    const record = JSON.parse(raw, (_, value) =>
      value &&
      typeof value === "object" &&
      Object.keys(value).length === 1 &&
      typeof value[BIGINT] === "string"
        ? BigInt(value[BIGINT])
        : value,
    ) as ReviewedSequenceRecord;
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
      (record.sending === undefined || step(record.sending)) &&
      (record.proposed === undefined ||
        (step(record.proposed.step) && isHex(record.proposed.safeTxHash)));
    return valid ? record : null;
  } catch {
    return null;
  }
}

/** Whether anything of `record` was sent, or is in flight: only then is there a run to resume. */
const begun = (record: ReviewedSequenceRecord) =>
  record.completed.length > 0 ||
  record.sending !== undefined ||
  record.proposed !== undefined;

function read(
  record: Pick<ReviewedSequenceRecord, "scope" | "account">,
  storage: HeldWriteStorage,
): ReviewedSequenceRecord | null {
  const key = sequenceKey(record.scope, record.account);
  return parse(storage.getItem(key), key);
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
  const saved = read(
    { scope, account },
    options.storage ?? createHeldWriteStorage(),
  );
  return saved && begun(saved) ? saved : null;
}

/** Whether `saved` is another run's progress that `record` must not overwrite. */
const ahead = (
  saved: ReviewedSequenceRecord | null,
  record: ReviewedSequenceRecord,
) =>
  !!saved &&
  begun(saved) &&
  (saved.id !== record.id || saved.completed.length > record.completed.length);

/**
 * Save `record`, refusing to overwrite another run's progress: a different
 * sequence with a step sent, or more completed steps of this one.
 */
export function saveReviewedSequence(
  record: ReviewedSequenceRecord,
  storage: HeldWriteStorage,
): void {
  if (ahead(read(record, storage), record))
    throw new Error(REVIEWED_SEQUENCE_MOVED_LINE);
  storage.setItem(sequenceKey(record.scope, record.account), serialize(record));
}

/** Remove `record` if it is still the one saved at its key, and no further along. */
export function removeReviewedSequence(
  record: ReviewedSequenceRecord,
  storage: HeldWriteStorage,
): void {
  const saved = read(record, storage);
  if (saved?.id === record.id && !ahead(saved, record))
    storage.removeItem(sequenceKey(record.scope, record.account));
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
    ).some(({ record: held }) =>
      held.namespace !== undefined
        ? namespaces.includes(held.namespace)
        : !call.intent &&
          held.call.to.toLowerCase() === call.to.toLowerCase() &&
          held.call.data.toLowerCase() === call.data.toLowerCase() &&
          held.call.value === String(call.value ?? 0n),
    );
  });
}

/**
 * Drop an unfinished sequence, so the action can be reviewed fresh. Refused
 * while any remaining step is held (sent, or proposed, and not yet settled):
 * its hold decides it first.
 */
export function discardReviewedSequence(
  record: ReviewedSequenceRecord,
  options: Options = {},
): void {
  const storage = options.storage ?? createHeldWriteStorage();
  if (heldStep(record, storage)) throw new Error(REVIEWED_SEQUENCE_HELD_LINE);
  removeReviewedSequence(record, storage);
}
