import { useEffect, useMemo, useRef, useState } from "react";
import {
  createFeeBuybackReview,
  type FeeReviewCall,
  type FeeReviewContext,
  type FeeReviewState,
} from "../../v6/feeBuyback.js";

type FeeReview = ReturnType<typeof createFeeBuybackReview>;

/** What `calls` show before their review starts: checking when one pays a fee. */
function unchecked(calls: readonly FeeReviewCall[]): FeeReviewState {
  const first = createFeeBuybackReview(
    calls,
    () => undefined,
    () => undefined,
  );
  first.stop();
  return first.getState();
}

/** A review dialog's fee return check; it starts over when `calls` changes. */
export function useFeeBuybackReview(
  calls: readonly FeeReviewCall[],
  context: FeeReviewContext,
): FeeReviewState & Pick<FeeReview, "confirm" | "retry" | "wait"> {
  const contextRef = useRef(context);
  contextRef.current = context;
  const review = useRef<FeeReview | null>(null);
  /** The calls last rendered: an action from an earlier render answers for nothing. */
  const rendered = useRef(calls);
  rendered.current = calls;
  /** The state shown, with the review that made it: an action answers for that review only. */
  const [shown, setShown] = useState<{
    of: FeeReview | null;
    calls: readonly FeeReviewCall[];
    state: FeeReviewState;
  }>(() => ({ of: null, calls, state: unchecked(calls) }));
  const fresh = useMemo(() => unchecked(calls), [calls]);
  useEffect(() => {
    const current: FeeReview = createFeeBuybackReview(
      calls,
      (chainId, from) => contextRef.current(chainId, from),
      (state) => setShown({ of: current, calls, state }),
    );
    review.current = current;
    setShown({ of: current, calls, state: current.getState() });
    return () => {
      current.stop();
      review.current = null;
    };
  }, [calls]);
  const { of } = shown;
  // Until these calls' review starts, they show as unchecked, never the earlier calls' result.
  const state = shown.calls === calls ? shown.state : fresh;
  /** These calls are the latest and their review has started. */
  const current = () => rendered.current === calls && shown.calls === calls;
  /** The review this render showed, while it is still the hook's. */
  const live = () => (of && of === review.current ? of : null);
  return {
    ...state,
    confirm: async () => {
      const shownReview = live();
      if (!current() || !shownReview) return false;
      const confirmed = await shownReview.confirm(state.result);
      // Replaced while confirming: the answer is for calls no longer shown
      // (a stopped review's own confirm already answers false).
      return confirmed && current();
    },
    retry: () => live()?.retry(),
    wait: () => live()?.wait(),
  };
}
