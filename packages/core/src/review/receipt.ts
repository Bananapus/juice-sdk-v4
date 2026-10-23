import { ReviewLineError } from "./lineError.js";
import type { Hex, PublicClient, TransactionReceipt } from "viem";

/** The line when a broadcast transaction's receipt can't be tracked. */
export const TRANSACTION_TRACKING_UNAVAILABLE_LINE =
  "This transaction was submitted, but its confirmation can't be tracked right now. Check it in your wallet and do not submit it again yet.";

/**
 * A transaction was broadcast, but neither the receipt watcher nor direct
 * receipt reads could confirm it. Its outcome is unknown, so the app must keep
 * treating it as submitted and must not offer to send it again.
 */
export class TransactionReceiptUnavailableError extends ReviewLineError {
  readonly name = "TransactionReceiptUnavailableError";
  /**
   * Why the receipt watcher gave up. Like a native error's cause it is not
   * enumerable, so serializing this error leaves out the RPC error (and any
   * key in its URL).
   */
  declare readonly cause: unknown;

  constructor(
    readonly hash: Hex,
    readonly chainId?: number,
    options: { cause?: unknown } = {},
  ) {
    // The hash and chain stay fields: a caller's hash is not validated here.
    super(TRANSACTION_TRACKING_UNAVAILABLE_LINE);
    Object.defineProperty(this, "cause", {
      value: options.cause,
      writable: true,
      enumerable: false,
      configurable: true,
    });
  }
}

export function isTransactionReceiptUnavailableError(
  error: unknown,
): error is TransactionReceiptUnavailableError {
  return error instanceof TransactionReceiptUnavailableError;
}

/**
 * The receipt of a broadcast transaction. A load-balanced RPC can drop viem's
 * receipt watcher even though the transaction is fine, so a rejected watch
 * falls back to direct receipt reads. When those fail too, the error keeps the
 * hash so the app can say the transaction was sent.
 */
export async function waitForTrackedReceipt(
  client: Pick<
    PublicClient,
    "chain" | "getTransactionReceipt" | "waitForTransactionReceipt"
  >,
  hash: Hex,
  options: { attempts?: number; intervalMs?: number } = {},
): Promise<TransactionReceipt> {
  try {
    return await client.waitForTransactionReceipt({ hash, timeout: 120_000 });
  } catch (cause) {
    const attempts = Math.max(1, options.attempts ?? 90);
    const intervalMs = Math.max(0, options.intervalMs ?? 2_000);
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        return await client.getTransactionReceipt({ hash });
      } catch {
        if (attempt + 1 < attempts) {
          await new Promise((resolve) => setTimeout(resolve, intervalMs));
        }
      }
    }
    throw new TransactionReceiptUnavailableError(hash, client.chain?.id, {
      cause,
    });
  }
}
