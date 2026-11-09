import { TAB } from "./tabState.js";

/** The Web Locks the SDK's holds take: `navigator.locks`, or its fallback ({@link browserLocks}). */
export type BrowserLocks = Pick<LockManager, "request">;
type RecoveryLocks = BrowserLocks;
const TAB_QUEUES = TAB.queues;

// Without Web Locks, writes in this tab still run one at a time per action,
// across every copy of this module loaded in the tab.
const tabQueues = ((
  globalThis as { [TAB_QUEUES]?: Map<string, Promise<void>> }
)[TAB_QUEUES] ??= new Map<string, Promise<void>>());
let tabLocksNoted = false;
const tabLocks = {
  async request<T>(
    name: string,
    options: LockOptions,
    work: (lock: Lock | null) => Promise<T>,
  ): Promise<T> {
    const held = tabQueues.get(name);
    if (held && options.ifAvailable) return work(null);
    let release!: () => void;
    const mine = new Promise<void>((resolve) => (release = resolve));
    const queue = (held ?? Promise.resolve()).then(() => mine);
    tabQueues.set(name, queue);
    await held;
    try {
      return await work({ name, mode: "exclusive" } as Lock);
    } finally {
      release();
      if (tabQueues.get(name) === queue) tabQueues.delete(name);
    }
  },
} as RecoveryLocks;

// Without Web Locks, tabs share an IndexedDB lease per action. A readwrite
// transaction is atomic across the origin's tabs, so claiming a lease is a
// compare-and-set. The holder renews it while it works; a tab that closed or
// froze loses it once it lapses.
const LEASE_DB = "nana-sdk-write-locks";
const LEASE_STORE = "leases";
const LEASE_MS = 15_000;
const LEASE_RENEW_MS = 5_000;
const LEASE_POLL_MS = 50;
type Lease = { owner: string; expires: number };

function leaseTransaction<T>(
  db: IDBDatabase,
  run: (store: IDBObjectStore, done: (value: T) => void) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(LEASE_STORE, "readwrite");
    let result: T;
    run(transaction.objectStore(LEASE_STORE), (value) => (result = value));
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = transaction.onabort = () => reject(transaction.error);
  });
}

/** Take or renew `name`'s lease for `owner`; false while another tab holds it. */
function claimLease(db: IDBDatabase, name: string, owner: string) {
  return leaseTransaction<boolean>(db, (store, done) => {
    done(false);
    const read = store.get(name);
    read.onsuccess = () => {
      const lease = read.result as Lease | undefined;
      const now = Date.now();
      if (lease && lease.owner !== owner && lease.expires > now) return;
      store.put({ owner, expires: now + LEASE_MS } satisfies Lease, name);
      done(true);
    };
  });
}

function dropLease(db: IDBDatabase, name: string, owner: string) {
  return leaseTransaction<void>(db, (store) => {
    const read = store.get(name);
    read.onsuccess = () => {
      if ((read.result as Lease | undefined)?.owner === owner)
        store.delete(name);
    };
  });
}

function leaseLocks(factory: IDBFactory): RecoveryLocks {
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
    request: <T>(
      name: string,
      options: LockOptions,
      work: (lock: Lock | null) => Promise<T>,
    ): Promise<T> =>
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
        const renew = setInterval(
          () => void claimLease(db, name, owner).catch(() => {}),
          LEASE_RENEW_MS,
        );
        try {
          return await work(tabLock);
        } finally {
          clearInterval(renew);
          await dropLease(db, name, owner).catch(() => {});
        }
      }) as Promise<T>,
  } as RecoveryLocks;
}

let fallbackLocks: RecoveryLocks | undefined;

/**
 * The browser's Web Locks. Where a browser or wallet webview has none, an
 * IndexedDB lease shared by the origin's tabs (one transaction, no visible
 * delay; it waits only while another tab holds the action), with a one-time
 * console note. With neither, a lock within this tab. Never refuses.
 */
export function browserLocks(): BrowserLocks {
  const native = globalThis.navigator?.locks;
  if (native) return native;
  if (!tabLocksNoted) {
    tabLocksNoted = true;
    console.info(
      globalThis.indexedDB
        ? "Web Locks are unavailable, so wallet writes are coordinated across tabs through IndexedDB."
        : "Web Locks are unavailable, so wallet writes are coordinated within this tab only.",
    );
  }
  if (!globalThis.indexedDB) return tabLocks;
  return (fallbackLocks ??= leaseLocks(globalThis.indexedDB));
}
