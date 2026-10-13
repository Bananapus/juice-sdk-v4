/**
 * The lines a held or released action shows. Apps import these instead of
 * keeping copies. Each names the action, never the service behind it.
 * `action` is a noun such as "action", "launch" or "payment".
 */

/** Why a saved Relayr session can be discarded; the same union as `RelayrDiscardReason`. */
type DiscardReason = "ran" | "changed" | "expired";

/**
 * The line a session shows while one of its earlier signatures can still run:
 * until `until` (seconds), or, once the clock is past it, until a finalized
 * block is.
 */
export function relayrHeldMessage(
  until: number,
  {
    action = "action",
    nowMs = Date.now(),
    formatTime = (ms: number) => new Date(ms).toLocaleString(),
  }: {
    action?: string;
    nowMs?: number;
    formatTime?: (ms: number) => string;
  } = {},
): string {
  return until * 1_000 > nowMs
    ? `This ${action}'s earlier signature can still run until ${formatTime(until * 1_000)}. Try again after that.`
    : `This ${action}'s earlier signature may still run. Try again in a few minutes.`;
}

/**
 * The line a discardable session shows, and the error its action throws until
 * it is discarded. `paymentUnmatched`: its saved payment proved to be another
 * transaction, which matters once none of its requests ran.
 */
export function relayrDiscardLine(
  reason: DiscardReason,
  {
    action = "action",
    subject = "project",
    paymentUnmatched = false,
  }: { action?: string; subject?: string; paymentUnmatched?: boolean } = {},
): string {
  if (reason === "ran")
    return `This ${action}'s earlier signature may already have run. Check the ${subject}, then discard it to review it again.`;
  if (reason === "changed") return `The ${subject} changed since this review.`;
  return paymentUnmatched
    ? `The saved payment couldn't be matched to this ${action} and isn't refunded. Discard it to review it again.`
    : `This ${action}'s earlier signatures expired without running.`;
}

/** A wallet write with no confirmed result yet holds its exact call. */
export function writeHeldMessage(action = "transaction"): string {
  return `Your earlier ${action} hasn't confirmed yet. Check your wallet.`;
}

/** The button that ends a held write once the user checked their wallet. */
export const WRITE_EXIT_LABEL = "I checked my wallet. Send again";

/** What sending again does if the held write went through. */
export function writeExitMessage(
  call: { value?: bigint | string },
  action = "transaction",
): string {
  return BigInt(call.value ?? 0) > 0n
    ? `If your earlier ${action} went through, sending again pays twice.`
    : `If your earlier ${action} went through, sending again runs it twice.`;
}

/** A Safe proposal whose nonce another Safe transaction used. */
export const SAFE_PROPOSAL_REPLACED_LINE =
  "Another Safe transaction used this nonce. Propose it again to run it.";

/** A Safe proposal the chain shows executed. */
export const SAFE_PROPOSAL_EXECUTED_LINE = "Your Safe ran this transaction.";

/** A quote released after its payment failed and its deadline passed. */
export const RELAYR_PAYMENT_RELEASED_LINE =
  "Your payment didn't go through and its quote expired. Pay a new quote.";
