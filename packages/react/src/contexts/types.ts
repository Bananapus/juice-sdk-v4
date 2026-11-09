export interface AsyncData<T> {
  isLoading: boolean;
  data: T | undefined | null;
  /**
   * The read that failed, its own or one it waited on. With `data` empty and
   * `isLoading` false, null means "none" and an error means "unknown".
   */
  error?: Error | null;
}

const AsyncDataNone: AsyncData<any> = {
  isLoading: false,
  data: undefined,
  error: null,
};

export { AsyncDataNone };

/**
 * A read that waits on another: while the upstream loads, it loads too (a
 * disabled read otherwise says `isLoading: false, data: undefined`, "none"),
 * and an upstream failure is its failure.
 */
export function dependentAsyncData<
  Q extends { isLoading: boolean; error?: Error | null },
>(
  query: Q,
  upstream: { isLoading: boolean; error?: Error | null },
): Q & { isLoading: boolean; error: Error | null } {
  return {
    ...query,
    isLoading: Boolean(query.isLoading || upstream.isLoading),
    error: query.error ?? upstream.error ?? null,
  };
}
