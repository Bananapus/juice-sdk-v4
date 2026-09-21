import type { Address, Hex } from "viem";
import type {
  JBCenterClient,
  JBCenterIntent,
  JBCenterIntentInput,
  JBCenterJsonObject,
  JBCenterRequestOptions,
} from "../jbcenter.js";

/**
 * Key order and the casing of addresses and calldata are JB Center's to
 * choose; the values are not. Sorting keys and lowercasing hex strings puts
 * both sides in one form so the comparison reads values only.
 */
function canonical(value: unknown): string {
  return JSON.stringify(value, (_key, item: unknown) => {
    if (typeof item === "string") {
      return /^0x[0-9a-fA-F]*$/u.test(item) ? item.toLowerCase() : item;
    }
    if (!item || typeof item !== "object" || Array.isArray(item)) return item;
    return Object.fromEntries(
      Object.entries(item as Record<string, unknown>).sort(([a], [b]) =>
        a < b ? -1 : 1,
      ),
    );
  });
}

/** JB Center prepared something other than the intent the caller built. */
export class JBCenterIntentMismatchError extends Error {
  constructor(readonly reason: "envelope" | "message") {
    super(
      reason === "envelope"
        ? "JB Center prepared a different intent than the one built here"
        : "JB Center's signing message does not carry the intent's content hash",
    );
    this.name = "JBCenterIntentMismatchError";
  }
}

export type PublishSignedIntentOptions = {
  /** The address whose signature `sign` returns. */
  publisher: Address;
  request?: JBCenterRequestOptions;
};

/**
 * Publish an intent, signing only JB Center's prepared message and only once
 * it has been checked: the prepared envelope must carry the same values as
 * the intent built here, and the message must commit to the content hash of
 * what is being signed. `sign` is the caller's own signer; this package never
 * reaches a wallet itself.
 */
export async function publishSignedIntent<TJb extends JBCenterJsonObject>(
  client: JBCenterClient,
  intent: JBCenterIntentInput<TJb>,
  sign: (message: string) => Promise<Hex>,
  options: PublishSignedIntentOptions,
): Promise<JBCenterIntent<TJb>> {
  const prepared = await client.prepareIntent(intent, options.request);
  if (canonical(prepared.envelope) !== canonical(intent)) {
    throw new JBCenterIntentMismatchError("envelope");
  }
  if (
    !prepared.message.toLowerCase().includes(prepared.contentHash.toLowerCase())
  ) {
    throw new JBCenterIntentMismatchError("message");
  }
  const signature = await sign(prepared.message);
  return client.publishIntent(
    { ...intent, publisher: options.publisher, signature },
    options.request,
  );
}
