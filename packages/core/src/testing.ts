/**
 * Test-only resets and fixtures, so nothing leaks from one test into the next. Never
 * import this entry from production code: it drops this tab's holds.
 */
import { promptReview, type ReviewSimulation } from "./review/confirm.js";
import { buildReviewModel, type ReviewModel } from "./review/model.js";
import { TransactionReviewCancelledError } from "./review/reviewQueue.js";
import { TAB } from "./review/tabState.js";
import type { TransactionReviewRequest } from "./review/transactionReview.js";

/** One review request per decoder route, for each client's rendering tests. */
export { REVIEW_REQUESTS } from "./review/reviewRequests.js";

const tab = globalThis as Record<symbol, unknown>;

/**
 * Empty this tab's write lock queues and held-write memory in place, so a
 * controller made before the reset (at module scope) shares the empty ones.
 */
export function resetWriteRecoveryForTests(): void {
  (tab[TAB.queues] as Map<string, unknown> | undefined)?.clear();
  const memory = tab[TAB.memory] as Map<string, string> | undefined;
  if (!memory) return;
  // What each tab memory last saw in durable storage, by memory.
  (tab[TAB.seen] as WeakMap<object, Map<string, string>> | undefined)
    ?.get(memory)
    ?.clear();
  memory.clear();
}

/** Stop every write hold's followers and tab listeners, then {@link resetWriteRecoveryForTests}. */
export function resetWriteHoldsForTests(): void {
  for (const stop of [...((tab[TAB.holds] as Set<() => void>) ?? [])]) stop();
  resetWriteRecoveryForTests();
}

/** Stop every Safe Relayr watch (it rejects with an AbortError) and forget remembered reviews. */
export function resetSafeRelayrForTests(): void {
  for (const stop of [...((tab[TAB.watches] as Set<() => void>) ?? [])]) stop();
  (tab[TAB.reviews] as Set<unknown> | undefined)?.clear();
}

/**
 * Prompts the page's registered review handler (`registerReviewHandler`)
 * with the model core builds for `request`, exactly as a send does, so a test
 * drives the real dialog instead of mocking core. `model` is what the dialog
 * shows; `outcome` settles when it answers: "confirmed" with core's
 * confirmation, "cancelled" on close or abort. Any other answer rejects as
 * core rejects it. The simulation defaults to passed.
 */
export function promptReviewForTests(
  request: TransactionReviewRequest,
  options: {
    simulation?: ReviewSimulation | Promise<ReviewSimulation>;
    signal?: AbortSignal;
  } = {},
): { model: ReviewModel; outcome: Promise<"confirmed" | "cancelled"> } {
  const model = buildReviewModel(request);
  const outcome = promptReview(
    model,
    Promise.resolve(options.simulation ?? { status: "passed" }),
    Promise.resolve(model),
    options.signal,
  ).then(
    () => "confirmed" as const,
    (error: unknown) => {
      if (error instanceof TransactionReviewCancelledError)
        return "cancelled" as const;
      throw error;
    },
  );
  return { model, outcome };
}
