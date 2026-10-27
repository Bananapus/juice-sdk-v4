import type { Hex, TransactionReceipt } from "viem";
import type { ReviewedCall } from "./send.js";
import { HELD_CONFIRMING_LINE, WRITE_HOLD_REVERTED_LINE } from "./messages.js";

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

  /** Its class's mark, which `errorLine` reads: the SDK's ESM and CommonJS copies each have their own class. */
  get reviewFixedLine(): true {
    return true;
  }
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

/** A wallet adapter's refusal before it called the wallet: proven unsent, so its step is released. */
export class WalletNotInvokedError extends ReviewLineError {
  readonly name = "WalletNotInvokedError";
}

/** A step mined whose receipt its hold has not verified yet: it stays held until the hold settles it. */
export class ReviewedReceiptUnverifiedError extends ReviewLineError {
  readonly name = "ReviewedReceiptUnverifiedError";

  constructor(
    readonly step: number,
    readonly hash: Hex,
    line: string = HELD_CONFIRMING_LINE,
    /**
     * The step's call and its hold reservation, which `completeReviewedStep`
     * reads, and the run's signatures when it signed any.
     */
    readonly held?: {
      call: ReviewedCall;
      reservation: string | undefined;
      signatures?: Hex[];
    },
  ) {
    super(line);
  }
}
