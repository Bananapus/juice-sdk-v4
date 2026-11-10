import { TAB } from "./tabState.js";

/** Thrown by {@link LockHandle.assertHeld} once this tab no longer holds the lock. */
export class LockLostError extends Error {
  readonly name = "LockLostError";
  readonly code = "LOCK_LOST";
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
 * Any Web Locks manager (`navigator.locks`, a test's) handing a
 * {@link LockHandle}: a handle it hands already passes through; any other
 * lock is never lost while its work runs.
 */
export function fencedLocks(
  locks: AnyLocks | BrowserLocks | RawLocks,
): BrowserLocks {
  return {
    request<T>(
      name: string,
      options: LockOptions | LockWork<T>,
      work?: LockWork<T>,
    ) {
      const [opts, run] = shaped(options, work);
      return (locks as AnyLocks).request(name, opts, (lock) => {
        if (!lock) return run(null);
        if (isHandle(lock)) return run(lock);
        let running = true;
        return Promise.resolve(
          run(handle(lock.name, lock.mode, async () => running)),
        ).finally(() => (running = false));
      }) as Promise<Awaited<T>>;
    },
  } as BrowserLocks;
}

type RawWork<T> = (lock: LockHandle | null) => Promise<T>;
type RawLocks = {
  request<T>(name: string, options: LockOptions, work: RawWork<T>): Promise<T>;
};

const TAB_QUEUES = TAB.queues;

// Without Web Locks, writes in this tab still run one at a time per action,
// across every copy of this module loaded in the tab.
const tabQueues = ((
  globalThis as { [TAB_QUEUES]?: Map<string, Promise<void>> }
)[TAB_QUEUES] ??= new Map<string, Promise<void>>());
let tabLocksNoted = false;
const tabLocks: RawLocks = {
  async request<T>(
    name: string,
    options: LockOptions,
    work: RawWork<T>,
  ): Promise<T> {
    const held = tabQueues.get(name);
    if (held && options.ifAvailable) return work(null);
    let release!: () => void;
    const mine = new Promise<void>((resolve) => (release = resolve));
    const queue = (held ?? Promise.resolve()).then(() => mine);
    tabQueues.set(name, queue);
    await held;
    let running = true;
    try {
      return await work(handle(name, "exclusive", async () => running));
    } finally {
      running = false;
      release();
      if (tabQueues.get(name) === queue) tabQueues.delete(name);
    }
  },
};

// Without Web Locks, tabs share an IndexedDB lease per action. A readwrite
// transaction is atomic across the origin's tabs, so claiming a lease is a
// compare-and-set. Each acquisition has its own owner token. The holder
// renews it while it works, only while it is still its own and unexpired; a
// tab that closed or froze loses it once it lapses, and its handle then
// reads as lost.
const LEASE_DB = "nana-sdk-write-locks";
const LEASE_STORE = "leases";
const LEASE_MS = 15_000;
const LEASE_RENEW_MS = 5_000;
const LEASE_POLL_MS = 50;
type Lease = { owner: string; expires: number };

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

/** Whether `lease` is `owner`'s and unexpired. */
const owns = (lease: Lease | undefined, owner: string) =>
  lease?.owner === owner && lease.expires > Date.now();

/**
 * Take `name`'s lease for `owner` (`renew`: only extend it while still
 * `owner`'s); false while another tab holds it, or once a renewal finds it lost.
 */
function claimLease(
  db: IDBDatabase,
  name: string,
  owner: string,
  renew = false,
) {
  return leaseTransaction<boolean>(db, "readwrite", (store, done) => {
    done(false);
    const read = store.get(name);
    read.onsuccess = () => {
      const lease = read.result as Lease | undefined;
      const now = Date.now();
      if (renew ? !owns(lease, owner) : lease && lease.expires > now) return;
      store.put({ owner, expires: now + LEASE_MS } satisfies Lease, name);
      done(true);
    };
  });
}

function readLease(db: IDBDatabase, name: string) {
  return leaseTransaction<Lease | undefined>(db, "readonly", (store, done) => {
    const read = store.get(name);
    read.onsuccess = () => done(read.result as Lease | undefined);
  });
}

/** Drop `name`'s lease only while it is still `owner`'s. */
function dropLease(db: IDBDatabase, name: string, owner: string) {
  return leaseTransaction<void>(db, "readwrite", (store) => {
    const read = store.get(name);
    read.onsuccess = () => {
      if ((read.result as Lease | undefined)?.owner === owner)
        store.delete(name);
    };
  });
}

function leaseLocks(factory: IDBFactory): RawLocks {
  let opened: Promise<IDBDatabase> | undefined;
  const database = () =>
    (opened ??= new Promise<IDBDatabase>((resolve, reject) => {
      const request = factory.open(LEASE_DB, 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore(LEASE_STORE);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }).catch((error) => {
      opened = undefined;
      throw error;
    }));
  return {
    request: <T>(name: string, options: LockOptions, work: RawWork<T>) =>
      tabLocks.request(name, options, async (tabLock) => {
        if (!tabLock) return work(null);
        let db: IDBDatabase;
        try {
          db = await database();
        } catch {
          // IndexedDB refused (as in some private windows): this tab only.
          return work(tabLock);
        }
        const owner = globalThis.crypto.randomUUID();
        while (!(await claimLease(db, name, owner))) {
          if (options.ifAvailable) return work(null);
          await new Promise((resolve) => setTimeout(resolve, LEASE_POLL_MS));
        }
        const lost = new AbortController();
        let running = true;
        const held = async () => {
          if (!running || lost.signal.aborted) return false;
          // Never cached: a tab back from suspension reads what is there now.
          const mine = owns(
            await readLease(db, name).catch(() => undefined),
            owner,
          );
          if (!mine) lost.abort(new LockLostError(name));
          return mine && running;
        };
        const renew = setInterval(
          () =>
            void claimLease(db, name, owner, true)
              .then((kept) => kept || lost.abort(new LockLostError(name)))
              .catch(() => {}),
          LEASE_RENEW_MS,
        );
        try {
          return await work(handle(name, "exclusive", held, lost.signal));
        } finally {
          running = false;
          clearInterval(renew);
          await dropLease(db, name, owner).catch(() => {});
        }
      }),
  };
}

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
  return (leasedLocks ??= fencedLocks(leaseLocks(globalThis.indexedDB)));
}
