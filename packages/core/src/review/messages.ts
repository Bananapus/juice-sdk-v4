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

/** A write that reverted onchain, held until its block is shown canonical (a Safe failure, until final) so a retry can't double it. */
export const WRITE_HOLD_REVERTED_LINE =
  "This transaction failed onchain. You can try again in a few minutes.";

/** A Safe execution whose transaction landed while the Safe's own result is not proven yet. */
export const WRITE_HOLD_SAFE_UNCONFIRMED_LINE =
  "This transaction landed, but the Safe's own result is not confirmed yet. Check the Safe before trying again.";

/** A Safe execution whose transaction landed while the Safe's own call failed (ExecutionFailure). */
export const WRITE_HOLD_CALL_FAILED_LINE =
  "The Safe ran this transaction, but its call failed (ExecutionFailure). Nothing it was meant to do happened.";

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

/** A held write whose transaction is mined but whose result can't be read yet. No exit yet. */
export const WRITE_HOLD_MINED_LINE =
  "Your transaction is onchain, but its result can't be read yet.";

/** A send whose review went stale because another window's attempt of the same write ended meanwhile. */
export const WRITE_HOLD_STALE_REVIEW_LINE =
  "This was just sent from another window. Review it again to send another.";

/** The one line while a sent write, direct or through a Safe, is being confirmed. */
export const HELD_CONFIRMING_LINE = "Confirming your transaction.";

/** A held write the user released with their exit: they can send it again. */
export const HELD_RELEASED_LINE = "Released. You can send it again.";

/** A held write another window released: neutral, never a result. */
export const HELD_RELEASED_ELSEWHERE_LINE =
  "This was released in another window.";

/** The exit button where the review follows on its own. */
export const HELD_EXIT_LABEL = "I checked my wallet";

/** The exit button where only the hold is released (an app-wide notice). */
export const HELD_RELEASE_LABEL = "I checked my wallet. Release it";

/** A held write settled as failed on authenticated evidence: released, so the user can send again. */
export const HELD_FAILED_LINE =
  "This transaction failed onchain. Review it and try again.";

/** A held write settled with success on authenticated evidence. */
export const HELD_SUCCESS_LINE = "Your transaction went through.";

/** A held Safe proposal proven expired before it ran. */
export const HELD_EXPIRED_LINE = "Your Safe proposal expired before it ran.";

/** A success the hold settled while the user was away: shown until they say to send again. */
export const HELD_AWAY_SUCCESS_LINE = "This went through while you were away.";

/** The one action on a success settled while away: acknowledge it, then send. */
export const HELD_SEND_AGAIN_LABEL = "Send it again";

/** A saved attempt that can't be shown here: absence of evidence is never permission to send. */
export const SAVED_ATTEMPT_CHECK_LINE =
  "This transaction may already be in your wallet, and it cannot be confirmed from here.";

/** The warning under it. */
export const SAVED_ATTEMPT_CHECK_WARNING =
  "Check your wallet and the explorer first. Continuing can send it twice.";

/** The one check action's label: "I checked it. Review it again." or the flow's next step ("Create again"). */
export function checkedItLabel(next = "Review it again"): string {
  return `I checked it. ${next.replace(/\.+$/, "")}.`;
}

/** Under a retirement that lasts in this tab alone (`durable: false`). */
export const SAVED_ATTEMPT_TAB_ONLY_LINE = "This applies to this tab only.";

/** When the browser has storage but can't read it: the warned exit's line. */
export const SAVED_ATTEMPT_UNREADABLE_LINE =
  "This browser can't read its saved transactions. Check your wallet before sending again.";

/** The warned exit's label, offered only after a check action found storage unreadable. */
export const SAVED_ATTEMPT_CONTINUE_ANYWAY_LABEL =
  "I checked my wallet. Continue anyway";

/** The refusal when the connected account is not the one an action was built for. */
export const REVIEWED_ACCOUNT_CHANGED_LINE =
  "The connected account changed. Review again.";

/** The refusal when the app's send engine loader fails: a failed chunk load stays cached until a reload. */
export const REVIEWED_ENGINE_LOAD_LINE =
  "This page could not load the review. Nothing was sent; reload the page and try again.";

/** The refusal after a review whose simulation found the action would revert; the review showed why. */
export const REVIEWED_SIMULATION_FAILED_LINE =
  "This transaction would fail onchain. Nothing was sent; the review shows why.";
