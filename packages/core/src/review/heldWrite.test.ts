import type { Address, Hex } from "viem";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createHeldWriteView,
  followHeldWrite,
  hidesShownExit,
  settledLine,
} from "./heldWrite.js";
import {
  HELD_CONFIRMING_LINE,
  HELD_EXPIRED_LINE,
  HELD_RELEASED_ELSEWHERE_LINE,
  HELD_RELEASED_LINE,
  HELD_SUCCESS_LINE,
  WRITE_HOLD_HASHED_EXIT_LINE,
  WRITE_HOLD_PENDING_LINE,
  WRITE_HOLD_REVERTED_LINE,
  WRITE_HOLD_SAFE_UNPROVEN_LINE,
} from "./messages.js";
import {
  WriteHeldError,
  type WriteHoldClient,
  type WriteHoldHandle,
  type WriteHoldState,
} from "./writeHold.js";
import type { ReviewedWriteRecoveryRecord } from "./writeRecovery.js";

const safeService = vi.hoisted(() => ({
  has: true,
  wait: vi.fn<(...args: unknown[]) => Promise<Hex>>(),
}));
vi.mock("../safeService.js", async (original) => ({
  ...(await original<typeof import("../safeService.js")>()),
  hasSafeService: () => safeService.has,
  waitForSafeExecutionHash: (...args: unknown[]) => safeService.wait(...args),
}));

const ACCOUNT = "0x1111111111111111111111111111111111111111" as Address;
const HASH = `0x${"aa".repeat(32)}` as Hex;
const EXECUTION = `0x${"e1".repeat(32)}` as Hex;

function record(
  extra: Partial<ReviewedWriteRecoveryRecord> = {},
): ReviewedWriteRecoveryRecord {
  return {
    version: 1,
    id: "r1",
    chainId: 10,
    account: ACCOUNT,
    safe: false,
    call: { to: ACCOUNT, data: "0x", value: "0" },
    ...extra,
  };
}
const pending = (
  extra: Partial<ReviewedWriteRecoveryRecord> = {},
  line = WRITE_HOLD_PENDING_LINE,
): WriteHoldState => ({
  status: "pending-known-hash",
  record: record({ hash: HASH, ...extra }),
  hash: HASH,
  exit: false,
  line,
  reservation: extra.id ?? "r1",
});
const unproven = (exit = true): WriteHoldState => ({
  status: "safe-unproven",
  record: record({ hash: HASH, safe: true }),
  hash: HASH,
  exit,
  line: WRITE_HOLD_SAFE_UNPROVEN_LINE,
  warning: WRITE_HOLD_HASHED_EXIT_LINE,
  reservation: "r1",
});
const clear = (
  extra: Partial<Extract<WriteHoldState, { status: "clear" }>> = {},
) => ({ status: "clear", reservation: "r1", ...extra }) as WriteHoldState;

/** A hold handle whose answers the test sets: `answer` is what state() returns. */
function fakeHandle(start: WriteHoldState = clear({ reservation: undefined })) {
  const listeners = new Set<(state: WriteHoldState) => void>();
  const fake = {
    answer: start,
    peeked: start,
    emit(state: WriteHoldState) {
      for (const listener of listeners) listener(state);
    },
  };
  const handle = {
    peek: vi.fn(() => fake.peeked),
    state: vi.fn(
      async () => ({ ...fake.answer, checked: true }) as WriteHoldState,
    ),
    subscribe: vi.fn((listener: (state: WriteHoldState) => void) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    }),
    exit: vi.fn(async () => ({
      released: true,
      state: clear({ reservation: "r1" }),
    })),
    send: vi.fn(async () => HASH),
    adopt: vi.fn(async () => fake.answer),
    onExecuted: vi.fn(async () => fake.answer),
    onUnproven: vi.fn(async () => fake.answer),
  };
  return { fake, handle: handle as unknown as WriteHoldHandle & typeof handle };
}
const client = {
  getTransactionReceipt: vi.fn(async ({ hash }: { hash: Hex }) => ({
    transactionHash: hash,
  })),
} as unknown as WriteHoldClient & {
  getTransactionReceipt: ReturnType<typeof vi.fn>;
};

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  safeService.has = true;
  safeService.wait.mockReset();
  safeService.wait.mockImplementation(() => new Promise(() => {}));
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("the shared copy and guards", () => {
  it("names each settlement in one line", () => {
    expect(settledLine({ result: "success", hash: HASH })).toBe(
      HELD_SUCCESS_LINE,
    );
    expect(settledLine({ result: "failed", hash: HASH })).toBe(
      WRITE_HOLD_REVERTED_LINE,
    );
    expect(settledLine({ result: "expired" })).toBe(HELD_EXPIRED_LINE);
  });

  it("lets only a checked answer remove an exit already shown", () => {
    const shown = unproven();
    expect(hidesShownExit(shown, pending())).toBe(true);
    expect(hidesShownExit(shown, { ...pending(), checked: false })).toBe(true);
    expect(hidesShownExit(shown, { ...pending(), checked: true })).toBe(false);
    expect(hidesShownExit(shown, clear())).toBe(false);
    expect(hidesShownExit(null, pending())).toBe(false);
    expect(hidesShownExit(pending(), unproven())).toBe(false);
  });
});

describe("following a held write", () => {
  it("follows a direct write until the hold clears, never ending on its own reads", async () => {
    const { fake, handle } = fakeHandle(pending());
    fake.answer = pending();
    const stop = new AbortController();
    const followed = followHeldWrite(handle, client, {
      signal: stop.signal,
      fastMs: 1,
    });
    await flush();
    expect(handle.state).toHaveBeenCalled();
    fake.answer = clear({ settled: { result: "success", hash: HASH } });
    await expect(followed).resolves.toMatchObject({ status: "clear" });
    expect(safeService.wait).not.toHaveBeenCalled();
  });

  it("hands a Safe proposal's execution to the hold, or its loss as unproven", async () => {
    const proposal = pending({ safe: true });
    const { fake, handle } = fakeHandle(proposal);
    fake.answer = proposal;
    safeService.wait.mockResolvedValueOnce(EXECUTION);
    let stop = new AbortController();
    const first = followHeldWrite(handle, client, {
      signal: stop.signal,
      fastMs: 1,
    });
    await flush();
    expect(handle.onExecuted).toHaveBeenCalledWith(client, EXECUTION);
    stop.abort();
    await expect(first).resolves.toBeNull();
    safeService.wait.mockRejectedValueOnce(new Error("lost"));
    stop = new AbortController();
    const second = followHeldWrite(handle, client, {
      signal: stop.signal,
      fastMs: 1,
    });
    await flush();
    expect(handle.onUnproven).toHaveBeenCalledWith(client, HASH);
    stop.abort();
    await second;
    // Aborted while waiting: not unproven.
    handle.onUnproven.mockClear();
    stop = new AbortController();
    safeService.wait.mockImplementationOnce(
      () =>
        new Promise((_, reject) =>
          stop.signal.addEventListener("abort", () =>
            reject(new Error("aborted")),
          ),
        ),
    );
    const third = followHeldWrite(handle, client, {
      signal: stop.signal,
      pollMs: 1,
    });
    stop.abort();
    await third;
    await flush();
    expect(handle.onUnproven).not.toHaveBeenCalled();
  });

  it("asks no service for an executed record, a chain without one, or a failing read", async () => {
    const { fake, handle } = fakeHandle(
      pending({ safe: true, executed: true }),
    );
    fake.answer = clear();
    await followHeldWrite(handle, client, {
      signal: new AbortController().signal,
    });
    safeService.has = false;
    fake.peeked = pending({ safe: true });
    await followHeldWrite(handle, client, {
      signal: new AbortController().signal,
    });
    expect(safeService.wait).not.toHaveBeenCalled();
    // A read that fails is asked again.
    handle.state.mockRejectedValueOnce(new Error("rpc"));
    await expect(
      followHeldWrite(handle, client, {
        signal: new AbortController().signal,
        fastMs: 1,
      }),
    ).resolves.toMatchObject({ status: "clear" });
  });
});

describe("one held write's view", () => {
  function started(
    start: WriteHoldState,
    options: Partial<Parameters<typeof createHeldWriteView>[1]> = {},
  ) {
    const { fake, handle } = fakeHandle(start);
    fake.answer = start;
    const view = createHeldWriteView(handle, {
      client,
      follow: false,
      ...options,
    });
    const stop = view.start();
    return { fake, handle, view, stop };
  }

  it("shows a fresh direct write as confirming, then the wallet's pending line after a while", async () => {
    const now = Date.now();
    const { view, fake, stop } = started(pending({ submittedAt: String(now) }));
    await flush();
    expect(view.get()).toMatchObject({
      phase: "confirming",
      line: HELD_CONFIRMING_LINE,
      exit: false,
    });
    fake.answer = pending({ submittedAt: String(now - 3 * 60_000) });
    await view.check();
    expect(view.get().line).toBe(WRITE_HOLD_PENDING_LINE);
    stop();
  });

  it("never goes back to awaiting once a Safe write is confirming (Sticky, revnet)", async () => {
    const { view, fake, stop } = started(pending({ safe: true }));
    await flush();
    expect(view.get().phase).toBe("awaiting");
    fake.answer = pending({ safe: true, candidates: [EXECUTION] });
    await view.check();
    expect(view.get()).toMatchObject({
      phase: "confirming",
      line: HELD_CONFIRMING_LINE,
    });
    // A later service answer shows it awaiting again: still confirming.
    fake.answer = pending({ safe: true });
    await view.check();
    expect(view.get()).toMatchObject({
      phase: "confirming",
      line: HELD_CONFIRMING_LINE,
    });
    // A restored execution is confirming from the start.
    const restored = started({
      status: "ran-executed",
      record: record({ hash: HASH, safe: true, executed: true }),
      exit: false,
      line: "ran",
      reservation: "r2",
    } as WriteHoldState);
    await flush();
    expect(restored.view.get()).toMatchObject({
      phase: "confirming",
      line: HELD_CONFIRMING_LINE,
    });
    stop();
    restored.stop();
  });

  it("keeps a shown exit through an unchecked read, and drops it on a checked one (revnet)", async () => {
    const { view, fake, handle, stop } = started(unproven());
    await flush();
    expect(view.get()).toMatchObject({
      phase: "held",
      exit: true,
      warning: WRITE_HOLD_HASHED_EXIT_LINE,
    });
    // A replayed held record without its exit, before any check, shows held.
    const replayed = started({
      status: "held-no-hash",
      record: record({ id: "r13" }),
      exit: false,
      line: "held",
      reservation: "r13",
    } as WriteHoldState);
    await flush();
    replayed.fake.emit({
      status: "held-no-hash",
      record: record({ id: "r13" }),
      exit: false,
      line: "held",
      reservation: "r13",
    } as WriteHoldState);
    expect(replayed.view.get()).toMatchObject({ phase: "held", line: "held" });
    replayed.stop();
    // An emission and a contended read carry no exit: the exit stays.
    fake.emit(pending());
    handle.state.mockResolvedValueOnce({ ...pending(), checked: false });
    await view.check();
    expect(view.get().exit).toBe(true);
    // The chain finds it pending: checked, the exit goes.
    fake.answer = pending();
    await view.check();
    expect(view.get()).toMatchObject({ phase: "confirming", exit: false });
    stop();
  });

  it("delivers a settlement once, with its receipt, only for what it saw held", async () => {
    const onSettled = vi.fn();
    const { view, fake, stop } = started(pending(), { onSettled });
    await flush();
    fake.answer = clear({ settled: { result: "success", hash: HASH } });
    await view.check();
    await view.check();
    await flush();
    expect(view.get()).toMatchObject({
      phase: "settled",
      line: HELD_SUCCESS_LINE,
    });
    expect(onSettled).toHaveBeenCalledOnce();
    expect(onSettled).toHaveBeenCalledWith(
      { result: "success", hash: HASH },
      { transactionHash: HASH },
    );
    // A settlement from an earlier visit is shown as clear, never delivered.
    const earlier = started(
      clear({ settled: { result: "success", hash: HASH } }),
      { onSettled },
    );
    await flush();
    expect(earlier.view.get()).toMatchObject({
      phase: "clear",
      settled: { hash: HASH },
    });
    expect(onSettled).toHaveBeenCalledOnce();
    // An expiry has no receipt; an unreadable receipt is null.
    const expired = started(pending({ id: "r3" }), { onSettled });
    await flush();
    expired.fake.answer = clear({
      reservation: "r3",
      settled: { result: "expired" },
    });
    await expired.view.check();
    await flush();
    expect(onSettled).toHaveBeenLastCalledWith({ result: "expired" }, null);
    const failed = started(pending({ id: "r4" }), { onSettled });
    await flush();
    client.getTransactionReceipt.mockRejectedValueOnce(new Error("rpc"));
    failed.fake.answer = clear({
      reservation: "r4",
      settled: { result: "failed", hash: HASH },
    });
    await failed.view.check();
    await flush();
    expect(onSettled).toHaveBeenLastCalledWith(
      { result: "failed", hash: HASH },
      null,
    );
    for (const s of [stop, earlier.stop, expired.stop, failed.stop]) s();
  });

  it("says released after the user's exit, never that it was sent again (jbm, revnet, Sticky)", async () => {
    const onReleased = vi.fn();
    const { view, handle, fake, stop } = started(unproven(), { onReleased });
    await flush();
    await expect(view.exit()).resolves.toBe(true);
    expect(handle.exit).toHaveBeenCalledWith(
      expect.objectContaining({ status: "safe-unproven" }),
      { checkedWallet: true },
      client,
    );
    expect(view.get()).toMatchObject({
      phase: "released",
      line: HELD_RELEASED_LINE,
      releasedBy: "user",
      exit: false,
    });
    expect(onReleased).toHaveBeenCalledWith("user");
    // Nothing to exit now.
    await expect(view.exit()).resolves.toBe(false);
    // A later plain clear keeps the released line.
    fake.answer = clear();
    await view.check();
    expect(view.get().phase).toBe("released");
    stop();
  });

  it("shows another window's release neutrally, never as a result (Sticky)", async () => {
    const onReleased = vi.fn();
    const onSettled = vi.fn();
    const { view, fake, stop } = started(unproven(), { onReleased, onSettled });
    await flush();
    fake.emit(clear());
    expect(view.get()).toMatchObject({
      phase: "released",
      line: HELD_RELEASED_ELSEWHERE_LINE,
      releasedBy: "other-tab",
    });
    expect(onReleased).toHaveBeenCalledWith("other-tab");
    expect(onSettled).not.toHaveBeenCalled();
    stop();
  });

  it("keeps the exit when the chain refuses it, and shows what the chain found", async () => {
    const { view, handle, stop } = started(unproven());
    await flush();
    handle.exit.mockResolvedValueOnce({
      released: false,
      state: { ...pending(), checked: true },
    });
    await expect(view.exit()).resolves.toBe(false);
    expect(view.get()).toMatchObject({ phase: "confirming", exit: false });
    stop();
  });

  it("starts over on another tab's new reservation", async () => {
    const { view, fake, stop } = started(unproven());
    await flush();
    fake.answer = pending({ id: "r9" });
    await view.check();
    expect(view.get().state?.reservation).toBe("r9");
    stop();
  });

  it("sends under the hold: a held write refuses with its checked state, a lost reply is checked", async () => {
    const { view, fake, handle, stop } = started(
      clear({ reservation: undefined }),
    );
    await flush();
    fake.peeked = pending();
    await expect(view.send(async () => HASH)).resolves.toBe(HASH);
    expect(view.get().phase).toBe("confirming");
    handle.send.mockRejectedValueOnce(
      new WriteHeldError({ ...unproven(), checked: true } as never),
    );
    await expect(view.send(async () => HASH)).rejects.toBeInstanceOf(
      WriteHeldError,
    );
    // The refusal's own evidence is shown, its exit included.
    expect(view.get()).toMatchObject({ exit: true, state: { checked: true } });
    handle.send.mockRejectedValueOnce(new Error("reply lost"));
    fake.answer = unproven();
    await expect(view.send(async () => HASH)).rejects.toThrow("reply lost");
    expect(view.get().exit).toBe(true);
    stop();
  });

  it("adopts a previous deploy's record before any send, and asks again after a failure", async () => {
    const onAdopted = vi.fn();
    const adopt = vi.fn(async () => ({ hash: HASH }));
    const { view, handle, fake, stop } = started(
      clear({ reservation: undefined }),
      {
        adopt,
        onAdopted,
      },
    );
    expect(view.get().adopting).toBe(true);
    handle.adopt.mockImplementationOnce(async () => (fake.answer = pending()));
    await view.send(async () => HASH).catch(() => undefined);
    expect(adopt).toHaveBeenCalledOnce();
    expect(handle.adopt).toHaveBeenCalledWith(
      expect.objectContaining({ status: "clear" }),
      { hash: HASH },
      client,
    );
    expect(onAdopted).toHaveBeenCalledWith(
      expect.objectContaining({ status: "pending-known-hash" }),
    );
    expect(view.get().adopting).toBe(false);
    stop();
    // Nothing saved, or already held: nothing adopted.
    const none = started(clear({ reservation: undefined }), {
      adopt: async () => null,
      onAdopted,
    });
    await flush();
    const held = started(unproven(), { adopt, onAdopted });
    await flush();
    expect(onAdopted).toHaveBeenCalledOnce();
    // A read that fails: the send refuses, and adoption runs again on the next.
    const failing = fakeHandle(clear({ reservation: undefined }));
    failing.handle.state.mockRejectedValueOnce(new Error("rpc"));
    const retry = createHeldWriteView(failing.handle, {
      client,
      follow: false,
      adopt,
    });
    await expect(retry.send(async () => HASH)).rejects.toThrow(
      "Saved transactions are still being checked",
    );
    await expect(retry.send(async () => HASH)).resolves.toBe(HASH);
    // An adoption the hold declined: nothing reported.
    const declined = fakeHandle(clear({ reservation: undefined }));
    const quiet = createHeldWriteView(declined.handle, {
      client,
      follow: false,
      adopt,
      onAdopted,
    });
    await quiet.send(async () => HASH);
    expect(onAdopted).toHaveBeenCalledOnce();
    none.stop();
    held.stop();
  });

  it("asks again on focus and every poll while held and visible, and stops", async () => {
    vi.useFakeTimers();
    const focus: (() => void)[] = [];
    vi.stubGlobal("addEventListener", (type: string, listener: () => void) => {
      if (type === "focus") focus.push(listener);
    });
    const removed = vi.fn();
    vi.stubGlobal("removeEventListener", removed);
    const { view, handle, stop } = started(unproven(), { pollMs: 1 });
    await vi.advanceTimersByTimeAsync(0);
    handle.state.mockClear();
    await vi.advanceTimersByTimeAsync(15_000);
    expect(handle.state).toHaveBeenCalledTimes(1);
    vi.stubGlobal("document", { visibilityState: "hidden" });
    await vi.advanceTimersByTimeAsync(15_000);
    expect(handle.state).toHaveBeenCalledTimes(1);
    focus[0]();
    expect(handle.state).toHaveBeenCalledTimes(2);
    stop();
    expect(removed).toHaveBeenCalledWith("focus", focus[0]);
    vi.unstubAllGlobals();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(handle.state).toHaveBeenCalledTimes(2);
    expect(view.get().phase).toBe("held");
  });

  it("shares one follower per reservation across views, and delivers its end", async () => {
    vi.useFakeTimers();
    const onSettled = vi.fn();
    const { fake, handle } = fakeHandle(pending());
    fake.answer = pending();
    const first = createHeldWriteView(handle, { client, onSettled });
    const second = createHeldWriteView(handle, { client });
    const stopFirst = first.start();
    const stopSecond = second.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(first.get().phase).toBe("confirming");
    fake.answer = clear({ settled: { result: "success", hash: HASH } });
    await vi.advanceTimersByTimeAsync(4_000);
    expect(first.get().phase).toBe("settled");
    expect(second.get().phase).toBe("settled");
    stopSecond();
    stopFirst();
    stopFirst();
    // A view that stops before its follower ends ignores the end.
    const late = fakeHandle(pending({ id: "r7" }));
    late.fake.answer = pending({ id: "r7" });
    const third = createHeldWriteView(late.handle, { client });
    const stopThird = third.start();
    await vi.advanceTimersByTimeAsync(0);
    stopThird();
    late.fake.answer = clear({
      reservation: "r7",
      settled: { result: "success", hash: HASH },
    });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(third.get().phase).toBe("confirming");
  });

  it("tells its subscribers, follows a hash once, slows its looks, and stops before adoption ends", async () => {
    vi.useFakeTimers();
    const { fake, handle } = fakeHandle(pending({ id: "r5" }));
    fake.answer = pending({ id: "r5" });
    const view = createHeldWriteView(handle, { client, pollMs: 15_000 });
    const heard = vi.fn();
    const unsubscribe = view.subscribe(heard);
    const stop = view.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(heard).toHaveBeenCalled();
    // The same reservation again: still one follower.
    await view.check();
    const reads = handle.state.mock.calls.length;
    // Fifteen quick looks, then one a poll apart.
    await vi.advanceTimersByTimeAsync(15 * 4_000);
    const quick = handle.state.mock.calls.length - reads;
    await vi.advanceTimersByTimeAsync(4_000);
    expect(handle.state.mock.calls.length - reads).toBe(quick);
    unsubscribe();
    stop();
    // Stopped while adoption still runs: no check after it.
    const slow = fakeHandle(clear({ reservation: undefined }));
    let finish!: (evidence: null) => void;
    const waiting = createHeldWriteView(slow.handle, {
      client,
      follow: false,
      adopt: () => new Promise((resolve) => (finish = resolve)),
    });
    const stopWaiting = waiting.start();
    await vi.advanceTimersByTimeAsync(0);
    stopWaiting();
    const before = slow.handle.state.mock.calls.length;
    finish(null);
    await vi.advanceTimersByTimeAsync(0);
    expect(slow.handle.state.mock.calls.length).toBe(before);
  });

  it("refuses the send while an adoption couldn't be read, and sends once it resolves (Codex 1)", async () => {
    const { fake, handle } = fakeHandle(clear({ reservation: undefined }));
    fake.answer = clear({ reservation: undefined });
    handle.adopt.mockResolvedValueOnce({
      ...clear({ reservation: undefined }),
      declined: "unreadable",
    } as unknown as WriteHoldState);
    const view = createHeldWriteView(handle, {
      client,
      follow: false,
      adopt: async () => ({ hash: HASH }),
    });
    await expect(view.send(async () => HASH)).rejects.toThrow(
      "Saved transactions are still being checked",
    );
    expect(handle.send).not.toHaveBeenCalled();
    // An authenticated refusal resolves it: the evidence is another write.
    handle.adopt.mockResolvedValueOnce({
      ...clear({ reservation: undefined }),
      declined: "refused",
    } as unknown as WriteHoldState);
    await expect(view.send(async () => HASH)).resolves.toBe(HASH);
  });

  it("keeps a shown exit when a send is refused by a contended read (Codex 2)", async () => {
    const { view, handle, stop } = started(unproven());
    await flush();
    handle.send.mockRejectedValueOnce(
      new WriteHeldError({ ...pending(), checked: false } as never),
    );
    await expect(view.send(async () => HASH)).rejects.toBeInstanceOf(
      WriteHeldError,
    );
    expect(view.get().exit).toBe(true);
    stop();
  });

  it("keeps following across a stop and an immediate start, as in StrictMode (Codex 3)", async () => {
    vi.useFakeTimers();
    const { fake, handle } = fakeHandle(pending({ id: "r8" }));
    fake.answer = pending({ id: "r8" });
    // The hold replays its latest state to a new subscriber at once.
    handle.subscribe.mockImplementation((listener) => {
      listener(fake.answer);
      return () => {};
    });
    const view = createHeldWriteView(handle, { client, pollMs: 60_000 });
    view.start()();
    const stop = view.start();
    await vi.advanceTimersByTimeAsync(0);
    const reads = handle.state.mock.calls.length;
    await vi.advanceTimersByTimeAsync(8_000);
    expect(handle.state.mock.calls.length).toBeGreaterThan(reads);
    stop();
    await vi.advanceTimersByTimeAsync(60_000);
  });

  it("ignores a read or a receipt that lands after it stopped (Codex 4)", async () => {
    const onSettled = vi.fn();
    const { fake, handle } = fakeHandle(pending({ id: "r10" }));
    fake.answer = pending({ id: "r10" });
    const view = createHeldWriteView(handle, {
      client,
      follow: false,
      onSettled,
    });
    const stop = view.start();
    await flush();
    let answer!: (state: WriteHoldState) => void;
    handle.state.mockImplementationOnce(
      () => new Promise<WriteHoldState>((resolve) => (answer = resolve)),
    );
    const late = view.check();
    stop();
    answer(
      clear({ reservation: "r10", settled: { result: "success", hash: HASH } }),
    );
    await late;
    await flush();
    expect(onSettled).not.toHaveBeenCalled();
    // A receipt still being read when it stops is not delivered either.
    const second = fakeHandle(pending({ id: "r11" }));
    second.fake.answer = pending({ id: "r11" });
    const other = createHeldWriteView(second.handle, {
      client,
      follow: false,
      onSettled,
    });
    const stopOther = other.start();
    await flush();
    let receipt!: (value: unknown) => void;
    client.getTransactionReceipt.mockImplementationOnce(
      () => new Promise((resolve) => (receipt = resolve)),
    );
    second.fake.answer = clear({
      reservation: "r11",
      settled: { result: "success", hash: HASH },
    });
    await other.check();
    stopOther();
    receipt({ transactionHash: HASH });
    await flush();
    expect(onSettled).not.toHaveBeenCalled();
  });

  it("keeps a reservation confirming across a new view of the same write (Codex 5)", async () => {
    const { fake, handle } = fakeHandle(
      pending({ id: "r12", safe: true, candidates: [EXECUTION] }),
    );
    fake.answer = pending({ id: "r12", safe: true, candidates: [EXECUTION] });
    const first = createHeldWriteView(handle, { client, follow: false });
    await first.check();
    expect(first.get().phase).toBe("confirming");
    // The candidate is disproven, and the app builds a new view (new calldata).
    fake.answer = pending({ id: "r12", safe: true });
    const next = createHeldWriteView(handle, { client, follow: false });
    await next.check();
    expect(next.get()).toMatchObject({
      phase: "confirming",
      line: HELD_CONFIRMING_LINE,
    });
  });
});
