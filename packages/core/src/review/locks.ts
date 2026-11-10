import { ReviewFixedLineError } from "./lineError.js";
import { LOCK_LOST_LINE } from "./messages.js";
import { TAB } from "./tabState.js";

/**
 * Thrown by {@link LockHandle.assertHeld} once this tab no longer holds the
 * lock. Its message is for logs; `errorLine` shows {@link LOCK_LOST_LINE}.
 */
export class LockLostError extends ReviewFixedLineError {
  readonly name = "LockLostError";
  readonly code = "LOCK_LOST";
  get line(): string {
    return LOCK_LOST_LINE;
  }
  constructor(readonly lock: string) {
    super(`The "${lock}" lock was lost. Its work must stop before writing.`);
  }
}

/**
 * The lock {@link browserLocks} hands its work. Native Web Locks never lose
 * it. The IndexedDB lease can: a tab suspended past its lease (as while the
 * user is in a wallet app) may come back after another tab took it.
 *
 * Call `assertHeld()` immediately before every journal write and every wallet
 * submission inside the lock. It narrows the stale-holder window to the time
 * between the check and the write.
 */
export type LockHandle = {
  readonly name: string;
  readonly mode: LockMode;
  /** Aborted once the lock is known lost. Not the caller's request `signal`. */
  readonly signal: AbortSignal;
  /** A fresh read: whether this tab still holds the lock. */
  held(): Promise<boolean>;
  /** Throws {@link LockLostError} unless `held()`. */
  assertHeld(): Promise<void>;
};

/**
 * Throws {@link LockLostError} unless every given lock is still this tab's,
 * on a fresh read; `null` and `undefined` are skipped. One line before a
 * write under several locks: `await assertLocksHeld([a, b]); save()`.
 */
export async function assertLocksHeld(
  locks?: readonly (Pick<LockHandle, "assertHeld"> | null | undefined)[],
): Promise<void> {
  await Promise.all((locks ?? []).map((lock) => lock?.assertHeld()));
}

/** Whether `error` is a lock's {@link LockLostError} (by `code`, so any copy's counts). */
const isLockLost = (error: unknown) =>
  (error as { code?: unknown } | null)?.code === "LOCK_LOST";

/**
 * A fenced handle's way back, whatever the backend (native Web Locks, the
 * IndexedDB lease, this tab's queue): its kept outcomes wait until its work
 * ended, then each runs under the same lock requested afresh, the handle
 * reading as held again meanwhile.
 */
type Keeper = {
  name: string;
  /** This acquisition's stamp: who took the lock last ({@link stamps}). */
  owner: string;
  ended: boolean;
  kept: Set<Kept>;
  /** The lock requested afresh for a kept outcome, while it runs. */
  revived: LockHandle | null;
  /** Requests the lock afresh, queued behind any work or outcome under it. */
  request<T>(work: (lock: LockHandle | null) => Promise<T>): Promise<T>;
};
type Kept = {
  locks: readonly LockHandle[];
  later: () => unknown;
  /** `later` re-runs `write` as is: only under locks nobody took since. */
  untouched: boolean;
  keepers: Keeper[];
  /** Told once the outcome is never applied. */
  dropped?: () => unknown;
};

const keeperOf = (lock: LockHandle) =>
  (lock as { [TAB.keeper]?: Keeper })[TAB.keeper];

/**
 * Who took each lock last, origin-wide: every fenced acquisition stamps it
 * under the lock, so a kept outcome can tell nobody took it since.
 */
const stamps = (() => {
  const memory = ((globalThis as { [TAB.stamps]?: Map<string, string> })[
    TAB.stamps
  ] ??= new Map<string, string>());
  const key = (name: string) => `nana-sdk:lock-holder:${name}`;
  return {
    get(name: string): string | undefined {
      try {
        const saved = globalThis.localStorage?.getItem(key(name));
        if (saved != null) return saved;
      } catch {
        /* Unreadable: this tab's own memory. */
      }
      return memory.get(name);
    },
    set(name: string, owner: string) {
      memory.set(name, owner);
      try {
        globalThis.localStorage?.setItem(key(name), owner);
      } catch {
        // ponytail: in-tab memory only where storage is refused; another
        // tab's take then goes unseen, so a whole-record replay may land.
      }
    },
  };
})();

/**
 * `later()` under every lock requested afresh, one acquisition each, so
 * the backend serializes it with any other work or outcome under the same
 * name; any failure leaves things as they were, and `dropped` is told.
 */
async function reconcile(entry: Kept) {
  for (const keeper of entry.keepers) keeper.kept.delete(entry);
  const under = async (at: number): Promise<boolean> => {
    if (at === entry.keepers.length) {
      await assertLocksHeld(entry.locks);
      await entry.later();
      return true;
    }
    const keeper = entry.keepers[at];
    return keeper.request(async (fresh) => {
      if (!fresh) return false;
      if (entry.untouched && stamps.get(keeper.name) !== keeper.owner)
        return false;
      keeper.revived = fresh;
      try {
        return await under(at + 1);
      } finally {
        keeper.revived = null;
      }
    });
  };
  const applied = await under(0).catch(() => false);
  // Unreconciled, the record stays as the lost lock left it.
  if (!applied) await Promise.resolve(entry.dropped?.()).catch(() => {});
}

/**
 * Saves an outcome the work already has from outside (a wallet's hash, a
 * definite rejection) under `locks`: `write()` runs now, and resolves true.
 * Its own writes check the locks right before writing. Refused for a lost
 * lock (`LockLostError`), it resolves false and the outcome is kept: once
 * the work under every one of `locks` has ended, each lock is taken again
 * (the same handles read as held again) and, after a fresh check:
 *
 * - with `later`, it runs whenever the locks are free. `later` re-reads the
 *   saved record, matches this attempt by its identity (its attempt or
 *   reservation id, never the whole record) and merges the outcome into the
 *   latest record, so another tab's unrelated update meanwhile stays;
 * - without, `write()` runs again only if no other tab took the locks since,
 *   so it can't touch a newer attempt's record.
 *
 * If any lock can't be taken back, or the write fails, the record stays as
 * the lost lock left it, its recovery shows, and `dropped` is told (a claim
 * the outcome consumed is given back there, so it stays retryable).
 *
 * Any lock {@link fencedLocks} or {@link browserLocks} handed out is kept
 * this way: a native one once its work ended, a lease also once it lapsed.
 * Any other failure of `write` throws, as does a lost lock that isn't one.
 */
export async function keepOutcome(
  locks: readonly LockHandle[] | undefined,
  write: () => unknown,
  later?: () => unknown,
  dropped?: () => unknown,
): Promise<boolean> {
  try {
    await write();
    return true;
  } catch (error) {
    const keepers = (locks ?? []).map(keeperOf);
    if (
      !isLockLost(error) ||
      !keepers.length ||
      !keepers.every((keeper) => keeper)
    )
      throw error;
    const entry: Kept = {
      locks: locks!,
      later: later ?? write,
      untouched: !later,
      keepers: keepers as Keeper[],
      ...(dropped ? { dropped } : {}),
    };
    for (const keeper of entry.keepers) keeper.kept.add(entry);
    // Kept after its work already ended: reconciled now.
    if (entry.keepers.every((keeper) => keeper.ended)) await reconcile(entry);
    return false;
  }
}

/** What {@link BrowserLocks} runs under the lock: `null` when `ifAvailable` found it taken. */
export type LockWork<T> = (lock: LockHandle | null) => T | PromiseLike<T>;

/**
 * The Web Locks the SDK's holds take ({@link browserLocks}): `request` as on
 * `navigator.locks`, with or without options, handing a {@link LockHandle}.
 */
export type BrowserLocks = {
  request<T>(name: string, work: LockWork<T>): Promise<Awaited<T>>;
  request<T>(
    name: string,
    options: LockOptions,
    work: LockWork<T>,
  ): Promise<Awaited<T>>;
};

type AnyLocks = Pick<LockManager, "request">;

const NEVER = new AbortController().signal;

function handle(
  name: string,
  mode: LockMode,
  held: () => Promise<boolean>,
  signal = NEVER,
): LockHandle {
  return {
    name,
    mode,
    signal,
    held,
    async assertHeld() {
      if (!(await held())) throw new LockLostError(name);
    },
  };
}

function isHandle(lock: Lock | LockHandle): lock is LockHandle {
  return typeof (lock as LockHandle).assertHeld === "function";
}

/** `request`'s two shapes, as `navigator.locks` takes them. */
function shaped<T>(
  options: LockOptions | LockWork<T>,
  work: LockWork<T> | undefined,
): [LockOptions, LockWork<T>] {
  return typeof options === "function" ? [{}, options] : [options, work!];
}

/**
 * Any Web Locks manager (`navigator.locks`, a test's, the SDK's own) handing
 * a {@link LockHandle}: one it hands already is read through; any other
 * lock is never lost while its work runs. Each handle keeps the outcomes
 * {@link keepOutcome} refused for it, the same for every backend, and
 * stamps who took the lock last.
 */
export function fencedLocks(
  locks: AnyLocks | BrowserLocks | RawLocks,
): BrowserLocks {
  /** `locks.request`, its lock as a handle. */
  const acquire = <T>(
    name: string,
    options: LockOptions,
    work: (lock: LockHandle | null) => Promise<T>,
  ) =>
    (locks as AnyLocks).request(name, options, async (lock) => {
      if (!lock) return work(null);
      if (isHandle(lock)) return work(lock);
      let running = true;
      try {
        return await work(handle(lock.name, lock.mode, async () => running));
      } finally {
        running = false;
      }
    }) as Promise<T>;
  return {
    request<T>(
      name: string,
      options: LockOptions | LockWork<T>,
      work?: LockWork<T>,
    ) {
      const [opts, run] = shaped(options, work);
      let keeper: Keeper | undefined;
      return acquire(name, opts, async (inner) => {
        // Already fenced (a BrowserLocks passed in): its own keeper keeps.
        if (!inner || keeperOf(inner)) return run(inner);
        keeper = {
          name,
          owner: globalThis.crypto.randomUUID(),
          ended: false,
          kept: new Set(),
          revived: null,
          request: (again) => acquire(name, {}, again),
        };
        stamps.set(name, keeper.owner);
        const own = keeper;
        const lock = handle(
          name,
          inner.mode,
          () => (own.revived ? own.revived.held() : inner.held()),
          inner.signal,
        );
        Object.defineProperty(lock, TAB.keeper, { value: keeper });
        return run(lock);
      }).finally(async () => {
        if (!keeper) return;
        // Released: each kept outcome whose locks all ended queues for the
        // lock now, as any request would, and lands before this one resolves.
        keeper.ended = true;
        for (const entry of [...keeper.kept])
          if (entry.keepers.every((other) => other.ended))
            await reconcile(entry);
      }) as Promise<Awaited<T>>;
    },
  } as BrowserLocks;
}

type RawWork<T> = (lock: LockHandle | null) => Promise<T>;
export type RawLocks = {
  request<T>(name: string, options: LockOptions, work: RawWork<T>): Promise<T>;
};

const TAB_QUEUES = TAB.queues;

/** Writes one at a time per name within one tab, queued in `queues`. */
function tabLocksOn(queues: Map<string, Promise<void>>): RawLocks {
  return {
    async request<T>(
      name: string,
      options: LockOptions,
      work: RawWork<T>,
    ): Promise<T> {
      const held = queues.get(name);
      if (held && options.ifAvailable) return work(null);
      let release!: () => void;
      const mine = new Promise<void>((resolve) => (release = resolve));
      const queue = (held ?? Promise.resolve()).then(() => mine);
      queues.set(name, queue);
      await held;
      let running = true;
      try {
        return await work(handle(name, "exclusive", async () => running));
      } finally {
        running = false;
        release();
        if (queues.get(name) === queue) queues.delete(name);
      }
    },
  };
}

// Without Web Locks, writes in this tab still run one at a time per action,
// across every copy of this module loaded in the tab.
const tabLocks = tabLocksOn(
  ((globalThis as { [TAB_QUEUES]?: Map<string, Promise<void>> })[TAB_QUEUES] ??=
    new Map<string, Promise<void>>()),
);
let tabLocksNoted = false;

// Without Web Locks, tabs share an IndexedDB lease per action. A readwrite
// transaction is atomic across the origin's tabs, so claiming a lease is a
// compare-and-set. Each acquisition has its own owner token. The holder
// renews it while it works, only while it is still its own and unexpired; a
// tab that closed or froze loses it once it lapses, and its handle then
// reads as lost.
const LEASE_DB = "nana-sdk-write-locks";
const LEASE_STORE = "leases";
export const LEASE_MS = 15_000;
const LEASE_RENEW_MS = 5_000;
const LEASE_POLL_MS = 50;
type Lease = { owner: string; expires: number };
type Claim = "take" | "renew";

/** Where the origin's leases live: each call one atomic compare-and-set. */
export type LeaseStore = {
  claim(name: string, owner: string, claim: Claim): Promise<boolean>;
  read(name: string): Promise<Lease | undefined>;
  drop(name: string, owner: string): Promise<void>;
};

/**
 * The lease `owner` gets by `claim` over `lease`, or undefined while it
 * can't: `take` while nobody holds it; `renew` only while still `owner`'s
 * and unexpired.
 */
function claimed(
  lease: Lease | undefined,
  owner: string,
  claim: Claim,
  now: number,
): Lease | undefined {
  const refused =
    claim === "renew"
      ? !(lease?.owner === owner && lease.expires > now)
      : lease && lease.expires > now;
  return refused ? undefined : { owner, expires: now + LEASE_MS };
}

/**
 * Letting go of `lease` for `owner`: expired; another owner's stays.
 */
const dropped = (lease: Lease | undefined, owner: string) =>
  lease?.owner === owner ? { owner, expires: 0 } : undefined;

function leaseTransaction<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore, done: (value: T) => void) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(LEASE_STORE, mode);
    let result: T;
    run(transaction.objectStore(LEASE_STORE), (value) => (result = value));
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = transaction.onabort = () => reject(transaction.error);
  });
}

/** One read-and-write of `name`'s lease in a readwrite transaction. */
function changeLease<T>(
  db: IDBDatabase,
  name: string,
  change: (lease: Lease | undefined) => { next?: Lease; value: T },
) {
  return leaseTransaction<T>(db, "readwrite", (store, done) => {
    const read = store.get(name);
    read.onsuccess = () => {
      const { next, value } = change(read.result as Lease | undefined);
      if (next) store.put(next, name);
      done(value);
    };
  });
}

export function idbLeases(factory: IDBFactory, now: () => number) {
  let opened: Promise<LeaseStore> | undefined;
  return () =>
    (opened ??= new Promise<IDBDatabase>((resolve, reject) => {
      const request = factory.open(LEASE_DB, 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore(LEASE_STORE);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    })
      .then(
        (db): LeaseStore => ({
          claim: (name, owner, claim) =>
            changeLease(db, name, (lease) => {
              const next = claimed(lease, owner, claim, now());
              return { next, value: !!next };
            }),
          read: (name) =>
            leaseTransaction<Lease | undefined>(
              db,
              "readonly",
              (store, done) => {
                const read = store.get(name);
                read.onsuccess = () => done(read.result as Lease | undefined);
              },
            ),
          drop: (name, owner) =>
            changeLease(db, name, (lease) => ({
              next: dropped(lease, owner),
              value: undefined,
            })),
        }),
      )
      .catch((error) => {
        opened = undefined;
        throw error;
      }));
}

/**
 * The origin's leases in memory, for tests: each call answers a task later,
 * as IndexedDB's transactions do.
 */
export function memoryLeases(now: () => number): LeaseStore {
  const leases = new Map<string, Lease>();
  const later = () => new Promise((resolve) => setTimeout(resolve, 0));
  return {
    async claim(name, owner, claim) {
      await later();
      const next = claimed(leases.get(name), owner, claim, now());
      if (next) leases.set(name, next);
      return !!next;
    },
    async read(name) {
      await later();
      return leases.get(name);
    },
    async drop(name, owner) {
      await later();
      const next = dropped(leases.get(name), owner);
      if (next) leases.set(name, next);
    },
  };
}

/**
 * Locks over the origin's `leases`, one at a time per name within the tab
 * (`tab`), its clock `now`.
 */
export function leaseLocks(
  leases: () => Promise<LeaseStore>,
  tab: RawLocks = tabLocks,
  now: () => number = () => Date.now(),
): RawLocks {
  /** Whether `lease` is `owner`'s and unexpired. */
  const owns = (lease: Lease | undefined, owner: string) =>
    lease?.owner === owner && lease.expires > now();
  return {
    request: <T>(name: string, options: LockOptions, work: RawWork<T>) =>
      tab.request(name, options, async (tabLock) => {
        if (!tabLock) return work(null);
        let store: LeaseStore;
        try {
          store = await leases();
        } catch {
          // IndexedDB refused (as in some private windows): this tab only.
          return work(tabLock);
        }
        const owner = globalThis.crypto.randomUUID();
        while (!(await store.claim(name, owner, "take"))) {
          if (options.ifAvailable) return work(null);
          await new Promise((resolve) => setTimeout(resolve, LEASE_POLL_MS));
        }
        const lost = new AbortController();
        let running = true;
        const held = async () => {
          if (!running || lost.signal.aborted) return false;
          // Never cached: a tab back from suspension reads what is there now.
          const mine = owns(
            await store.read(name).catch(() => undefined),
            owner,
          );
          if (!mine && running) lost.abort(new LockLostError(name));
          return mine && running;
        };
        const renew = setInterval(
          () =>
            void store
              .claim(name, owner, "renew")
              .then((kept) => kept || lost.abort(new LockLostError(name)))
              .catch(() => {}),
          LEASE_RENEW_MS,
        );
        try {
          return await work(handle(name, "exclusive", held, lost.signal));
        } finally {
          running = false;
          clearInterval(renew);
          await store.drop(name, owner).catch(() => {});
        }
      }),
  };
}

export { tabLocksOn };

const inTabLocks = fencedLocks(tabLocks);
let leasedLocks: BrowserLocks | undefined;

/**
 * The browser's Web Locks. Where a browser or wallet webview has none, an
 * IndexedDB lease shared by the origin's tabs (one transaction, no visible
 * delay; it waits only while another tab holds the action), with a one-time
 * console note. With neither, a lock within this tab. Never refuses.
 *
 * `request(name, work)` or `request(name, options, work)`, as on
 * `navigator.locks`; `work` gets a {@link LockHandle}. Call its
 * `assertHeld()` immediately before every journal write and every wallet
 * submission inside the lock: a lease can lapse while the tab is suspended
 * (as while the user is in a wallet app) and pass to another tab. The check
 * narrows that window to the time between the check and the write.
 */
export function browserLocks(): BrowserLocks {
  const native = globalThis.navigator?.locks;
  if (native) return fencedLocks(native);
  if (!tabLocksNoted) {
    tabLocksNoted = true;
    console.info(
      globalThis.indexedDB
        ? "Web Locks are unavailable, so wallet writes are coordinated across tabs through IndexedDB."
        : "Web Locks are unavailable, so wallet writes are coordinated within this tab only.",
    );
  }
  if (!globalThis.indexedDB) return inTabLocks;
  return (leasedLocks ??= fencedLocks(
    leaseLocks(idbLeases(globalThis.indexedDB, () => Date.now())),
  ));
}
