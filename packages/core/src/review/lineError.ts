import type { Hex, TransactionReceipt } from "viem";
import { WRITE_HOLD_REVERTED_LINE } from "./messages.js";

/**
 * An error with its own one-line message, which `errorLine` shows: the
 * SDK's, or a site's own refusal (thrown from `reverify`, `assertWriteState`
 * or `beforeWallet`, say). Any other error's text never reaches the UI.
 */
export class ReviewLineError extends Error {}

/**
 * An SDK error shown by its fixed `line`, never its text (which can quote a
 * service). The line lives on the error's class, so it loads with the code
 * that throws it.
 */
export abstract class ReviewFixedLineError extends Error {
  abstract readonly line: string;
}

/**
 * A step's transaction was mined and reverted: nothing of it to resume, and
 * the action can be reviewed again. `receipt` is the mined receipt, so a
 * site can close its own record of the attempt.
 */
export class ReviewedCallRevertedError extends ReviewLineError {
  readonly name = "ReviewedCallRevertedError";

  constructor(
    /** The step's index in the whole action. */
    readonly step: number,
    readonly hash: Hex,
    readonly receipt: TransactionReceipt,
  ) {
    super(WRITE_HOLD_REVERTED_LINE);
  }
}
