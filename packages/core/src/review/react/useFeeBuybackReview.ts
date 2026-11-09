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
  const [state, setState] = useState<FeeReviewState>(() => {
    const first = createFeeBuybackReview(
      calls,
      () => undefined,
      () => undefined,
    );
    first.stop();
    return first.getState();
  });
  useEffect(() => {
    const current = createFeeBuybackReview(
      calls,
      (chainId, from) => contextRef.current(chainId, from),
      setState,
    );
    review.current = current;
    setState(current.getState());
    return () => {
      current.stop();
      review.current = null;
    };
  }, [calls]);
  return {
    ...state,
    confirm: async () =>
      review.current ? review.current.confirm() : !state.enabled,
    retry: () => review.current?.retry(),
    wait: () => review.current?.wait(),
  };
}
