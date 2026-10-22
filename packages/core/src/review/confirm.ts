import type { Hex } from "viem";
import type { ReviewModel } from "./model.js";
import {
  currentReviewHandler,
  TransactionReviewCancelledError,
} from "./reviewQueue.js";

export { registerReviewHandler } from "./reviewQueue.js";

/**
 * Proof that the person confirmed one review. Core mints it for one prompt and
 * one model; the review handler returns it to confirm. It is opaque: no
 * public function accepts one, so the only way to send is to answer core's
 * prompt.
 */
export type ReviewConfirmation = {
  readonly __reviewConfirmation: unique symbol;
};

/** The review-time simulation: it runs while the review is open. */
export type ReviewSimulation =
  | { status: "passed" }
  | { status: "failed"; message: string }
  | { status: "unavailable"; message: string };

export type ReviewPrompt = {
  model: ReviewModel;
  /** Settles while the review is open; confirm never waits on it. */
  simulation: Promise<ReviewSimulation>;
  /** `model` with token reads and the simulation's warning; the same id. */
  enriched: Promise<ReviewModel>;
  /** Minted for this prompt and `model` only; return it to confirm. */
  confirmation: ReviewConfirmation;
};

/** Every confirmation core minted: the model id it is for, and whether its prompt has ended. */
const minted = new WeakMap<object, { id: Hex; used: boolean }>();

const NOT_CONFIRMED =
  "This review was not confirmed here. Nothing was sent; review it again.";

/**
 * Asks the registered review handler to confirm `model`, and resolves only
 * when it returns the confirmation minted for this prompt. Null cancels with
 * {@link TransactionReviewCancelledError}. Anything else (`true`, a forged
 * object, a confirmation from another prompt or model, or one already used)
 * is refused. A review-time simulation that already reported a revert refuses
 * too; one still pending is left to the simulation that runs before the
 * wallet opens. The confirmation is spent whatever the outcome.
 */
export async function promptReview(
  model: ReviewModel,
  simulation: Promise<ReviewSimulation>,
  enriched: Promise<ReviewModel>,
): Promise<void> {
  const handler = currentReviewHandler();
  if (!handler) {
    throw new Error(
      "Transaction review is unavailable. Reload the page before continuing.",
    );
  }
  let simulated: ReviewSimulation | undefined;
  void simulation.then((result) => {
    simulated = result;
  });
  const confirmation = Object.freeze(Object.create(null)) as ReviewConfirmation;
  const entry = { id: model.id, used: false };
  minted.set(confirmation, entry);
  try {
    const answer: unknown = await handler({
      model,
      simulation,
      enriched,
      confirmation,
    });
    if (answer === null) throw new TransactionReviewCancelledError();
    const returned =
      typeof answer === "object" ? minted.get(answer) : undefined;
    if (returned !== entry || entry.used || entry.id !== model.id) {
      throw new Error(NOT_CONFIRMED);
    }
  } finally {
    entry.used = true;
  }
  if (simulated?.status === "failed") throw new Error(simulated.message);
}
