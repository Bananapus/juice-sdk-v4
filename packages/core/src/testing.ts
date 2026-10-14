/**
 * Test-only resets, so nothing leaks from one test into the next. Never
 * import this entry from production code: it drops this tab's holds.
 */
import { TAB } from "./review/tabState.js";

const tab = globalThis as Record<symbol, unknown>;

/** Drop this tab's write lock queues and held-write memory. */
export function resetWriteRecoveryForTests(): void {
  (tab[TAB.queues] as Map<string, unknown> | undefined)?.clear();
  delete tab[TAB.memory];
  delete tab[TAB.seen];
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
