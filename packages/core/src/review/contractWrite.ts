import type { Address } from "viem";

export type ReviewedWritePhase = "review" | "simulating" | "signing";

/**
 * Whether a wallet error proves that nothing was broadcast. Only an explicit
 * rejection does: EIP-1193 code 4001, or viem's `UserRejectedRequestError`,
 * anywhere in the first eight links of the error's `cause` chain. A timeout or
 * any other failure may still have sent the transaction, so it returns false
 * and the caller keeps its recovery lock.
 */
export function isDefiniteWalletRejection(error: unknown): boolean {
  let current = error;
  for (
    let depth = 0;
    depth < 8 && current && typeof current === "object";
    depth += 1
  ) {
    const item = current as { code?: unknown; name?: unknown; cause?: unknown };
    if (item.code === 4001 || item.name === "UserRejectedRequestError") {
      return true;
    }
    current = item.cause;
  }
  return false;
}

export type ReviewedContractWriteOptions<
  TRequest extends { chainId: number },
  TSimulated,
  THash,
> = {
  request: TRequest;
  expectedAccount: Address | undefined;
  review: (request: TRequest) => Promise<unknown>;
  switchChain: (chainId: number) => Promise<unknown>;
  currentAccount: () => Address | undefined;
  simulate: (request: TRequest) => Promise<TSimulated>;
  reverify?: (request: TRequest) => Promise<unknown>;
  /** Persist recovery intent after simulation, before a wallet can broadcast. */
  beforeWrite?: () => unknown | Promise<unknown>;
  /** Final synchronous app scope/chain/connection gate, after all awaits and the signing phase. */
  beforeSend?: () => void;
  /** The persisted intent was rejected by a final gate before write was invoked. */
  onBeforeWriteAborted?: () => unknown | Promise<unknown>;
  /** Clear that intent only when the wallet explicitly rejects the write. */
  onWriteRejected?: () => unknown | Promise<unknown>;
  write: (simulated: TSimulated) => Promise<THash>;
  onPhase?: (phase: ReviewedWritePhase) => void;
  /**
   * The refusal when the connected account is not `expectedAccount`; by
   * default "The connected account changed. Review again."
   */
  accountChangedError?: string;
  /**
   * An app-specific gate run before anything else, such as refusing writes while
   * the app is impersonating another account. It throws to stop the write.
   */
  guard?: () => void;
};

/**
 * Shared review-to-wallet boundary for direct contract writes.
 *
 * The exact request object accepted by review is also handed to simulation,
 * and only the simulation result reaches the wallet writer. The connected
 * account must be `expectedAccount`, the account the request was reviewed for,
 * before the review opens, after a chain switch and again immediately before
 * signing.
 */
export async function submitReviewedContractWrite<
  TRequest extends { chainId: number },
  TSimulated,
  THash,
>({
  request,
  expectedAccount,
  review,
  switchChain,
  currentAccount,
  simulate,
  reverify,
  beforeWrite,
  beforeSend,
  onBeforeWriteAborted,
  onWriteRejected,
  write,
  onPhase,
  accountChangedError = "The connected account changed. Review again.",
  guard,
}: ReviewedContractWriteOptions<TRequest, TSimulated, THash>): Promise<THash> {
  guard?.();
  if (!expectedAccount) throw new Error("Connect a wallet first.");
  assertExpectedAccount(currentAccount(), expectedAccount, accountChangedError);

  onPhase?.("review");
  await review(request);

  onPhase?.("simulating");
  await switchChain(request.chainId);
  assertExpectedAccount(currentAccount(), expectedAccount, accountChangedError);
  await reverify?.(request);
  assertExpectedAccount(currentAccount(), expectedAccount, accountChangedError);

  const simulated = await simulate(request);
  assertExpectedAccount(currentAccount(), expectedAccount, accountChangedError);

  if (beforeWrite) await beforeWrite();

  try {
    onPhase?.("signing");
    assertExpectedAccount(
      currentAccount(),
      expectedAccount,
      accountChangedError,
    );
    beforeSend?.();
  } catch (error) {
    // Strictly before the wallet writer: only a successfully persisted intent
    // may be cleared. Ambiguous write errors never enter this cleanup path.
    if (beforeWrite) await onBeforeWriteAborted?.();
    throw error;
  }
  // No await or caller callback may separate the final synchronous gates from write.
  try {
    return await write(simulated);
  } catch (error) {
    // The same-looking error from review/simulation never reaches this catch.
    // An RPC timeout or ambiguous submission must preserve the recovery lock.
    if (isDefiniteWalletRejection(error)) await onWriteRejected?.();
    throw error;
  }
}

function assertExpectedAccount(
  current: Address | undefined,
  expected: Address,
  message: string,
): void {
  if (!current || current.toLowerCase() !== expected.toLowerCase()) {
    throw new Error(message);
  }
}
