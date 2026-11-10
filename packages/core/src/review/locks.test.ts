import { IDBFactory } from "fake-indexeddb";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LockHandle } from "./locks.js";

/** A tab: its own copy of the module, sharing the origin's IndexedDB. */
async function tab() {
  delete (globalThis as Record<symbol, unknown>)[
    Symbol.for("nana-sdk:write-lock-queues")
  ];
  vi.resetModules();
  return (await import("./locks.js")) as typeof import("./locks.js");
}

/** No Web Locks; one IndexedDB (or none) shared by the tabs. */
function origin(indexedDB: IDBFactory | undefined = new IDBFactory()) {
  vi.stubGlobal("navigator", undefined);
  vi.stubGlobal("indexedDB", indexedDB);
  vi.spyOn(console, "info").mockImplementation(() => {});
}

function gate() {
  let open!: () => void;
  const opened = new Promise<void>((resolve) => (open = resolve));
  return { open, opened };
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("browserLocks fencing over an IndexedDB lease", () => {
  it("fences a tab whose lease lapsed while it was suspended", async () => {
    origin();
    // The tab's timers stall (no renewal runs) while its clock moves on.
    vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
    const [a, b] = [await tab(), await tab()];
    const inA = gate();
    const resumeA = gate();
    let lockA!: LockHandle;
    const seen: { held?: boolean; error?: unknown } = {};
    const holdingA = a.browserLocks().request("action", async (lock) => {
      lockA = lock!;
      expect(await lock!.held()).toBe(true);
      await lock!.assertHeld();
      inA.open();
      await resumeA.opened;
      seen.held = await lock!.held();
      seen.error = await lock!.assertHeld().catch((error: unknown) => error);
      return "A done";
    });
    await inA.opened;
    expect(lockA.signal.aborted).toBe(false);

    vi.setSystemTime(Date.now() + 16_000);
    const inB = gate();
    const releaseB = gate();
    let lockB!: LockHandle;
    const holdingB = b
      .browserLocks()
      .request("action", { mode: "exclusive" }, async (lock) => {
        lockB = lock!;
        await lock!.assertHeld();
        inB.open();
        await releaseB.opened;
        return lock!.held();
      });
    await inB.opened;

    resumeA.open();
    await expect(holdingA).resolves.toBe("A done");
    expect(seen.held).toBe(false);
    expect(seen.error).toBeInstanceOf(a.LockLostError);
    expect((seen.error as InstanceType<typeof a.LockLostError>).code).toBe(
      "LOCK_LOST",
    );
    expect(lockA.signal.aborted).toBe(true);
    // A's release left B's lease alone.
    expect(await lockB.held()).toBe(true);
    expect(lockB.signal.aborted).toBe(false);
    releaseB.open();
    await expect(holdingB).resolves.toBe(true);
    // Once B's work ended, its handle no longer holds.
    expect(await lockB.held()).toBe(false);
  });

  it("aborts the holder's signal when a renewal finds another owner", async () => {
    origin();
    vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
    const [a, b] = [await tab(), await tab()];
    const inA = gate();
    const resumeA = gate();
    let lockA!: LockHandle;
    const holdingA = a.browserLocks().request("action", async (lock) => {
      lockA = lock!;
      inA.open();
      await resumeA.opened;
    });
    await inA.opened;
    vi.setSystemTime(Date.now() + 16_000);
    const releaseB = gate();
    const inB = gate();
    const holdingB = b.browserLocks().request("action", async () => {
      inB.open();
      await releaseB.opened;
    });
    await inB.opened;
    // A's renewal timer finally fires: it must not take the lease back.
    vi.advanceTimersByTime(5_000);
    await vi.waitFor(() => expect(lockA.signal.aborted).toBe(true));
    resumeA.open();
    releaseB.open();
    await Promise.all([holdingA, holdingB]);
  });

  it("treats a lapsed lease nobody took as lost too", async () => {
    origin();
    vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
    const a = await tab();
    const resumeA = gate();
    const inA = gate();
    let lockA!: LockHandle;
    const holdingA = a.browserLocks().request("action", async (lock) => {
      lockA = lock!;
      inA.open();
      await resumeA.opened;
    });
    await inA.opened;
    vi.setSystemTime(Date.now() + 16_000);
    expect(await lockA.held()).toBe(false);
    vi.advanceTimersByTime(5_000);
    expect(await lockA.held()).toBe(false);
    resumeA.open();
    await holdingA;
  });

  it("keeps a renewed lease held through a long hold", async () => {
    origin();
    vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
    const a = await tab();
    const resumeA = gate();
    const inA = gate();
    let lockA!: LockHandle;
    const holdingA = a.browserLocks().request("action", async (lock) => {
      lockA = lock!;
      inA.open();
      await resumeA.opened;
    });
    await inA.opened;
    for (let i = 0; i < 6; i++) {
      vi.advanceTimersByTime(5_000);
      // Let the renewal's transaction land before the clock moves again.
      await vi.waitFor(async () => expect(await lockA.held()).toBe(true));
    }
    expect(lockA.signal.aborted).toBe(false);
    resumeA.open();
    await holdingA;
  });
});

describe("browserLocks request shapes", () => {
  it("takes (name, work) without options on the IndexedDB lease", async () => {
    origin();
    const locks = (await tab()).browserLocks();
    await expect(
      locks.request("action", async (lock) => {
        expect(lock).toMatchObject({ name: "action", mode: "exclusive" });
        return lock!.held();
      }),
    ).resolves.toBe(true);
  });

  it("takes (name, work) in the in-tab fallback, held only while running", async () => {
    origin(undefined);
    const locks = (await tab()).browserLocks();
    let kept!: LockHandle;
    await expect(
      locks.request("action", async (lock) => {
        kept = lock!;
        await lock!.assertHeld();
        return lock!.held();
      }),
    ).resolves.toBe(true);
    expect(await kept.held()).toBe(false);
    await expect(kept.assertHeld()).rejects.toMatchObject({
      code: "LOCK_LOST",
    });
  });

  it("wraps native Web Locks: always held, its own signal never aborts", async () => {
    const native = {
      request: vi.fn(
        async (
          name: string,
          options: LockOptions,
          work: (lock: Lock | null) => unknown,
        ) => work({ name, mode: options.mode ?? "exclusive" }),
      ),
    };
    vi.stubGlobal("navigator", { locks: native });
    const caller = new AbortController();
    const { browserLocks } = await tab();
    await expect(
      browserLocks().request("action", async (lock) => {
        await lock!.assertHeld();
        return [await lock!.held(), lock!.signal.aborted, lock!.mode];
      }),
    ).resolves.toEqual([true, false, "exclusive"]);
    let signal!: AbortSignal;
    await browserLocks().request(
      "action",
      { mode: "shared", signal: caller.signal },
      async (lock) => {
        signal = lock!.signal;
      },
    );
    expect(native.request).toHaveBeenLastCalledWith(
      "action",
      { mode: "shared", signal: caller.signal },
      expect.any(Function),
    );
    caller.abort();
    expect(signal.aborted).toBe(false);
  });

  it("hands null through when ifAvailable finds the lock taken", async () => {
    origin();
    const [a, b] = [await tab(), await tab()];
    const inA = gate();
    const releaseA = gate();
    const holding = a.browserLocks().request("action", async () => {
      inA.open();
      await releaseA.opened;
    });
    await inA.opened;
    await expect(
      b
        .browserLocks()
        .request("action", { ifAvailable: true }, async (lock) => lock),
    ).resolves.toBeNull();
    releaseA.open();
    await holding;
  });
});

describe("assertLocksHeld", () => {
  it("passes while every given lock is held, and skips none", async () => {
    const { assertLocksHeld, LockLostError } = await tab();
    const lock = (held: boolean) =>
      ({
        name: held ? "kept" : "lost",
        mode: "exclusive",
        signal: new AbortController().signal,
        held: async () => held,
        assertHeld: async () => {
          if (!held) throw new LockLostError(held ? "kept" : "lost");
        },
      }) as LockHandle;
    await expect(assertLocksHeld()).resolves.toBeUndefined();
    await expect(
      assertLocksHeld([lock(true), null, undefined]),
    ).resolves.toBeUndefined();
    await expect(
      assertLocksHeld([lock(true), lock(false)]),
    ).rejects.toMatchObject({ code: "LOCK_LOST", lock: "lost" });
  });
});
