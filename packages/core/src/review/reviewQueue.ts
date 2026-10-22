"use client";

import { ReviewLineError } from "./lineError.js";
import type { ReviewConfirmation, ReviewPrompt } from "./confirm.js";

/**
 * The review queue: the handlers the app's review UI registers and the calls
 * that wait on them. Apart from the prompt builders and call encoding in
 * `./transactionReview.ts` (which re-exports it), so a page that only
 * registers its review UI loads neither. One module holds the handlers, so
 * every importer shares one queue.
 */

export type FundingChainOption = {
  chainId: number;
  /** The chain and its quoted cost, from `fundingChainLabel`. */
  label: string;
};

type FundingChainSelectionHandler = (
  options: readonly FundingChainOption[],
  /** The option to preselect, or null when the person must pick one of several. */
  initialChainId: number | null,
) => Promise<number | null>;

type ReviewHandler = (
  prompt: ReviewPrompt,
) => Promise<ReviewConfirmation | null>;

/** The handlers that answer core's prompts with the confirmation core minted (`./confirm.ts`). */
const reviewHandlers: ReviewHandler[] = [];

const fundingChainSelectionHandlers: FundingChainSelectionHandler[] = [];

/** The person closed a review or a funding-chain choice. Nothing was sent; apps need not show an error. */
export class TransactionReviewCancelledError extends ReviewLineError {
  constructor(message = "Review closed. Nothing was sent.") {
    super(message);
    this.name = "TransactionReviewCancelledError";
  }
}

export function registerFundingChainSelectionHandler(
  handler: FundingChainSelectionHandler,
): () => void {
  fundingChainSelectionHandlers.push(handler);
  return () => {
    const index = fundingChainSelectionHandlers.lastIndexOf(handler);
    if (index >= 0) fundingChainSelectionHandlers.splice(index, 1);
  };
}

/**
 * Asks where to pay a relay fee. The connected chain is preselected when it is
 * quoted, and so is a lone quote; otherwise the person picks. The exact payment
 * still gets its own review.
 */
export async function requireFundingChainSelection(
  options: readonly FundingChainOption[],
  preferredChainId?: number,
): Promise<number> {
  const snapshot = options.map((option) => ({ ...option }));
  const chainIds = new Set(snapshot.map((option) => option.chainId));
  if (
    !snapshot.length ||
    chainIds.size !== snapshot.length ||
    snapshot.some(
      (option) =>
        !Number.isSafeInteger(option.chainId) ||
        option.chainId <= 0 ||
        !option.label.trim(),
    )
  ) {
    throw new ReviewLineError(
      "No valid funding chain choices are available. Request a new quote.",
    );
  }
  const handler =
    fundingChainSelectionHandlers[fundingChainSelectionHandlers.length - 1];
  if (!handler) {
    throw new ReviewLineError(
      "Funding chain selection is unavailable. Reload the page before continuing.",
    );
  }
  const initialChainId =
    preferredChainId !== undefined && chainIds.has(preferredChainId)
      ? preferredChainId
      : snapshot.length === 1
        ? snapshot[0].chainId
        : null;
  const selected = await handler(snapshot, initialChainId);
  if (selected === null) {
    throw new TransactionReviewCancelledError(
      "Funding chain selection cancelled. Nothing was sent.",
    );
  }
  if (!chainIds.has(selected)) {
    throw new ReviewLineError(
      "The selected funding chain is not available in this quote.",
    );
  }
  return selected;
}

/**
 * Registers the review UI that answers {@link ReviewPrompt}s: it returns the
 * prompt's `confirmation` to confirm, or null to cancel. The latest
 * registration answers.
 */
export function registerReviewHandler(handler: ReviewHandler): () => void {
  reviewHandlers.push(handler);
  return () => {
    const index = reviewHandlers.lastIndexOf(handler);
    if (index >= 0) reviewHandlers.splice(index, 1);
  };
}

/** The handler that answers the next prompt, if one is registered. */
export function currentReviewHandler(): ReviewHandler | undefined {
  return reviewHandlers[reviewHandlers.length - 1];
}
