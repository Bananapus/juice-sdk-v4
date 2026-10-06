/** The longest delay setTimeout holds (about 24.8 days): a longer one fires at once. */
const MAX_TIMER_MS = 2_147_483_647;

/**
 * Waits `ms`, at most {@link MAX_TIMER_MS}, or rejects with `aborted()` once
 * `signal` aborts: at once when it already has.
 */
export function pause(
  ms: number,
  signal: AbortSignal | undefined,
  aborted: () => unknown,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    function onAbort() {
      clearTimeout(timer);
      reject(aborted());
    }
    const timer = setTimeout(
      () => {
        signal?.removeEventListener("abort", onAbort);
        resolve();
      },
      Math.min(ms, MAX_TIMER_MS),
    );
    signal?.addEventListener("abort", onAbort, { once: true });
    if (signal?.aborted) onAbort();
  });
}
