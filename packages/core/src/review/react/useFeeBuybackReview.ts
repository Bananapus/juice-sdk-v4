import { useEffect, useRef, useState } from "react";
import {
  createFeeBuybackReview,
  type FeeReviewCall,
  type FeeReviewContext,
  type FeeReviewState,
} from "../../v6/feeBuyback.js";

type FeeReview = ReturnType<typeof createFeeBuybackReview>;

/** A review dialog's fee return check; it starts over when `calls` changes. */
export function useFeeBuybackReview(
  calls: readonly FeeReviewCall[],
  context: FeeReviewContext,
): FeeReviewState & Pick<FeeReview, "confirm" | "retry" | "wait"> {
  const contextRef = useRef(context);
  contextRef.current = context;
  const review = useRef<FeeReview | null>(null);
  /** The state shown, with the review that made it: an action answers for that review only. */
  const [shown, setShown] = useState<{
    of: FeeReview | null;
    state: FeeReviewState;
  }>(() => {
    const first = createFeeBuybackReview(
      calls,
      () => undefined,
      () => undefined,
    );
    first.stop();
    return { of: null, state: first.getState() };
  });
  useEffect(() => {
    const current: FeeReview = createFeeBuybackReview(
      calls,
      (chainId, from) => contextRef.current(chainId, from),
      (state) => setShown({ of: current, state }),
    );
    review.current = current;
    setShown({ of: current, state: current.getState() });
    return () => {
      current.stop();
      review.current = null;
    };
  }, [calls]);
  const { of, state } = shown;
  /** The review this render showed, while it is still the hook's. */
  const live = () => (of && of === review.current ? of : null);
  return {
    ...state,
    confirm: async () =>
      !state.enabled || ((await live()?.confirm(state.result)) ?? false),
    retry: () => live()?.retry(),
    wait: () => live()?.wait(),
  };
}
