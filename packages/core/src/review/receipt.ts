import type { Hex, PublicClient, TransactionReceipt } from "viem";

/**
 * A transaction was broadcast, but neither the receipt watcher nor direct
 * receipt reads could confirm it. Its outcome is unknown, so the app must keep
 * treating it as submitted and must not offer to send it again.
 */
export class TransactionReceiptUnavailableError extends Error {
  readonly name = "TransactionReceiptUnavailableError";
  /** Why the receipt watcher gave up. */
  readonly cause: unknown;

  constructor(
    readonly hash: Hex,
    readonly chainId?: number,
    options: { cause?: unknown } = {},
  ) {
    super(
      `Transaction ${hash} was submitted${chainId ? ` on chain ${chainId}` : ""}, but confirmation tracking is temporarily unavailable. Check this transaction and do not submit it again yet.`,
    );
    this.cause = options.cause;
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
