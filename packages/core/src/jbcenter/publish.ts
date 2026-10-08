import { keccak256, toBytes, type Address, type Hex } from "viem";
import type {
  JBCenterClient,
  JBCenterIntent,
  JBCenterIntentInput,
  JBCenterJsonObject,
  JBCenterRequestOptions,
} from "../jbcenter.js";

/**
 * Key order and the casing of addresses and calldata are JB Center's to
 * choose; the values are not. Sorting keys and lowercasing hex long enough to
 * be an address or calldata puts both sides in one form so the comparison
 * reads values only. Shorter hex-looking text is a value like any other and is
 * compared as written. For hashing, retain string case: Center hashes exact
 * canonical JSON, including lexicographic order for integer-looking keys.
 */
function canonical(value: unknown, lowercaseHex = true): string {
  if (
    typeof value === "string" &&
    lowercaseHex &&
    /^0x[0-9a-fA-F]{40,}$/u.test(value)
  ) {
    return JSON.stringify(value.toLowerCase());
  }
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value))
    return `[${value.map((item) => canonical(item, lowercaseHex)).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .map(
      (key) =>
        `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key], lowercaseHex)}`,
    )
    .join(",")}}`;
}

/**
 * The shape JB Center normalizes an envelope into before it hashes: unique
 * chain ids in ascending order, deployment calls in the same order, and
 * `format` and `deploymentVersion` without surrounding space.
 */
function normalized<TJb extends JBCenterJsonObject>(
  envelope: JBCenterIntentInput<TJb>,
): JBCenterIntentInput<TJb> {
  return {
    ...envelope,
    format: envelope.format.trim(),
    deploymentVersion: envelope.deploymentVersion.trim(),
    chainIds: [...new Set(envelope.chainIds)].sort((a, b) => a - b),
    deploymentCalls: [...envelope.deploymentCalls].sort(
      (a, b) => a.chainId - b.chainId,
    ),
  };
}

/** A copy of its own, so what is checked is what is published even if the
 * caller keeps writing to its object while the signer is open. */
function snapshot<TJb extends JBCenterJsonObject>(
  envelope: JBCenterIntentInput<TJb>,
): JBCenterIntentInput<TJb> {
  return JSON.parse(JSON.stringify(envelope)) as JBCenterIntentInput<TJb>;
}

/** JB Center's own signing message, word for word. */
function centerSigningMessage(contentHash: Hex): string {
  return `Juice Central project intent\nVersion: 1\nContent hash: ${contentHash}`;
}

/** The casing of the hash JB Center echoes is its to choose; every other
 * character of the message is not. */
function withLowercaseHash(message: string, contentHash: Hex): string {
  const at = message.toLowerCase().indexOf(contentHash);
  if (at === -1) return message;
  return `${message.slice(0, at)}${contentHash}${message.slice(at + contentHash.length)}`;
}

/** JB Center prepared something other than the intent the caller built. */
export class JBCenterIntentMismatchError extends Error {
  constructor(
    readonly reason: "envelope" | "message" | "contentHash" | "publication",
  ) {
    super(
      {
        envelope:
          "JB Center prepared a different intent than the one built here",
        message:
          "JB Center's prepared message is not Center's signing message for that content hash",
        contentHash:
          "JB Center's content hash does not match the prepared intent",
        publication:
          "JB Center returned a different published intent; the publication could not be verified",
      }[reason],
    );
    this.name = "JBCenterIntentMismatchError";
  }
}

export type PublishSignedIntentOptions = {
  /** The address whose signature `sign` returns. */
  publisher: Address;
  /**
   * The whole message the publisher may be asked to sign for a content hash.
   * Defaults to JB Center's own signing message.
   */
  expectMessage?: (contentHash: Hex) => string;
  request?: JBCenterRequestOptions;
};

/**
 * Publish an intent, signing only JB Center's prepared message and only once
 * it has been checked: the prepared envelope must carry the same values as
 * the intent built here, and the message must be the whole signing message
 * for the locally computed content hash of that exact envelope. The same
 * snapshot is published, and the returned publication must name its hash.
 * `sign` is the caller's own signer; this package never reaches a wallet itself.
 */
export async function publishSignedIntent<TJb extends JBCenterJsonObject>(
  client: JBCenterClient,
  intent: JBCenterIntentInput<TJb>,
  sign: (message: string) => Promise<Hex>,
  options: PublishSignedIntentOptions,
): Promise<JBCenterIntent<TJb>> {
  const checked = snapshot(normalized(intent));
  const prepared = await client.prepareIntent(checked, options.request);
  const envelope = snapshot(prepared.envelope);
  if (canonical(normalized(envelope)) !== canonical(checked)) {
    throw new JBCenterIntentMismatchError("envelope");
  }
  const contentHash = keccak256(toBytes(canonical(envelope, false)));
  if (prepared.contentHash.toLowerCase() !== contentHash) {
    throw new JBCenterIntentMismatchError("contentHash");
  }
  const expected = (options.expectMessage ?? centerSigningMessage)(contentHash);
  if (
    withLowercaseHash(prepared.message, contentHash) !==
    withLowercaseHash(expected, contentHash)
  ) {
    throw new JBCenterIntentMismatchError("message");
  }
  const signature = await sign(prepared.message);
  const published = await client.publishIntent(
    { ...envelope, publisher: options.publisher, signature },
    options.request,
  );
  if (published.contentHash.toLowerCase() !== contentHash) {
    throw new JBCenterIntentMismatchError("publication");
  }
  return published;
}
