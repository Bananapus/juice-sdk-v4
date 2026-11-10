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
/** No native locks; IndexedDB as given, or none at all for `null`. */
function origin(indexedDB: IDBFactory | null = new IDBFactory()) {
  vi.stubGlobal("navigator", undefined);
  vi.stubGlobal("indexedDB", indexedDB ?? undefined);
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
    origin(null);
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

describe("keepOutcome", () => {
  it("queues every kept outcome at teardown in the order kept, before any runs: one kept while the first is saved goes behind the second", async () => {
    const { lapsingLocksForTests } = await import("../testing.js");
    const m = await import("./locks.js");
    const lapsing = lapsingLocksForTests();
    const told: string[] = [];
    let confirm!: Promise<boolean>;
    const write =
      (name: string, lock: LockHandle, meanwhile?: () => void) => async () => {
        await lock.assertHeld();
        // An asynchronous save, during which the receipt recovers.
        meanwhile?.();
        await new Promise((resolve) => setTimeout(resolve, 20));
        await lock.assertHeld();
        told.push(name);
      };
    await lapsing.locks.request("site", async (lock) => {
      lapsing.lapse();
      // A Safe batch's two submissions, both refused for the lapsed lease.
      await expect(
        m.keepOutcome(
          [lock!],
          write("approval submitted", lock!, () => {
            confirm ??= m.keepOutcome([lock!], write("confirmed", lock!));
          }),
        ),
      ).resolves.toBe(false);
      await expect(
        m.keepOutcome([lock!], write("payment submitted", lock!)),
      ).resolves.toBe(false);
    });
    await confirm;
    expect(told).toEqual([
      "approval submitted",
      "payment submitted",
      "confirmed",
    ]);
  });

  it("keeps a save refused for a lapsed lease until every nested lock's work ended, then applies it only if none was taken since", async () => {
    origin();
    vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
    const [a, b] = [await tab(), await tab()];
    const saved: string[] = [];
    /** A's work under two nested leases; asleep in the wallet, both lapse, then `meanwhile` runs. */
    const run = (meanwhile: () => Promise<unknown>) =>
      a.browserLocks().request("outer", (outer) =>
        a.browserLocks().request("inner", async (inner) => {
          const locks = [outer!, inner!];
          vi.setSystemTime(Date.now() + 16_000);
          await meanwhile();
          const write = async () => {
            await a.assertLocksHeld(locks);
            saved.push(`${saved.length}`);
          };
          return a.keepOutcome(locks, write);
        }),
      );
    await expect(run(async () => {})).resolves.toBe(false);
    // Applied once both ended, under both taken back.
    expect(saved).toEqual(["0"]);
    await expect(
      run(() => b.browserLocks().request("inner", async () => {})),
    ).resolves.toBe(false);
    // Another tab took the inner lock meanwhile: never applied.
    expect(saved).toEqual(["0"]);
    // A lock it can't take back throws as it was.
    await expect(
      a.keepOutcome([{ ...a.browserLocks(), name: "x" } as never], () => {
        throw new a.LockLostError("x");
      }),
    ).rejects.toMatchObject({ code: "LOCK_LOST" });
  });

  it("applies a scoped outcome when the outer lease is still live and only the inner one lapsed", async () => {
    const m = await tab();
    let clock = 0;
    const now = () => clock;
    const leases = m.memoryLeases(now);
    const locks = m.fencedLocks(
      m.leaseLocks(async () => leases, m.tabLocksOn(new Map()), now),
    );
    const applied: string[] = [];
    const kept = await locks.request("outer", (outer) => {
      clock = 2_000;
      return locks.request("inner", async (inner) => {
        // The outer renews at 5 s; the tab sleeps before the inner does.
        const { owner } = (await leases.read("outer"))!;
        clock = 5_000;
        await leases.claim("outer", owner, "renew");
        // At 18 s: the outer holds until 20 s, the inner lapsed at 17 s.
        clock = 18_000;
        const write = async () => {
          await m.assertLocksHeld([outer!, inner!]);
          applied.push("now");
        };
        return m.keepOutcome([outer!, inner!], write, async () => {
          await m.assertLocksHeld([outer!, inner!]);
          applied.push("later");
        });
      });
    });
    expect(kept).toBe(false);
    expect(applied).toEqual(["later"]);
  });
});
