/**
 * Where this tab's shared write state lives on `globalThis`, by symbol, so
 * every copy of the SDK loaded in the tab shares it, and the test-only entry
 * (`@bananapus/nana-sdk-core/testing`) can reset it without a production
 * export. Not part of the public surface.
 */
export const TAB = {
  /** Held writes kept in memory where storage is refused. */
  memory: Symbol.for("nana-sdk:held-writes"),
  /** Without Web Locks, one queue per action. */
  queues: Symbol.for("nana-sdk:write-lock-queues"),
  /** What each tab memory last saw in durable storage. */
  seen: Symbol.for("nana-sdk:held-writes-seen"),
  /** The stop of every write hold controller with a follower or listener running. */
  holds: Symbol.for("nana-sdk:write-hold-stops"),
  /** The stop of every running Safe Relayr watch. */
  watches: Symbol.for("nana-sdk:safe-relayr-watches"),
  /** Safe Relayr reviews remembered this session. */
  reviews: Symbol.for("nana-sdk:safe-relayr-reviews"),
} as const;

/** The tab's shared `T` at `key`, made by `make` the first time. */
export function tabShared<T>(key: symbol, make: () => T): T {
  const tab = globalThis as Record<symbol, unknown>;
  return (tab[key] ??= make()) as T;
}
