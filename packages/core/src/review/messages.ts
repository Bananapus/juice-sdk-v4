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

/** The review's line while held writes last only until this tab closes or reloads. */
export const WRITE_HOLD_IN_TAB_LINE =
  "This browser can't remember pending transactions. Check your wallet before repeating one.";

/** A held write whose saved hash is still pending: no exit, the wallet ends it. */
export const WRITE_HOLD_PENDING_LINE =
  "Still pending in your wallet. Speed it up or cancel it there.";

/** A write that reverted onchain, held until that is final so a retry can't double it. */
export const WRITE_HOLD_REVERTED_LINE =
  "This transaction failed onchain. You can try again in a few minutes.";

/** A held write the chain can't check (saved with no nonce to look at). The exit is offered. */
export const WRITE_HOLD_UNCHECKED_LINE =
  "This transaction can't be checked onchain. Check your wallet before sending again.";

/** A send stopped before the wallet because the account's nonce couldn't be read. */
export const WRITE_HOLD_NONCE_LINE =
  "Couldn't read your account from the network, so nothing was sent. Try again in a moment.";

/** The warning on the exit of a held write that has a hash. */
export const WRITE_HOLD_HASHED_EXIT_LINE =
  "If that transaction is still in your wallet, sending again can run it twice.";

/** A held Safe write whose nonce another Safe transaction used. The exit is offered. */
export const WRITE_HOLD_SAFE_REPLACED_LINE =
  "Another Safe transaction used this nonce. Check your Safe, then send again.";

/** A held write the app's effect read shows done. Nothing is released on that alone; the exit is offered. */
export const WRITE_HOLD_LOOKS_DONE_LINE =
  "This looks done. Check your wallet, then continue.";

/** A held Safe write whose follower ended without proof. The exit is offered. */
export const WRITE_HOLD_SAFE_UNPROVEN_LINE =
  "This Safe transaction couldn't be confirmed here. Check your Safe, then send again.";
