import { describe, expect, test, vi } from "vitest";
import {
  createReviewQueue,
  type ReviewQueueScope,
} from "./reviewDialogQueue.js";

type Result = boolean | number | null;
const review = {
  declined: false as Result,
  approves: (r: Result) => r === true,
};
const funding = {
  declined: null as Result,
  approves: (r: Result) => typeof r === "number",
};
const scope = (
  identity: string,
  verify = () => Promise.resolve(true),
): ReviewQueueScope => ({
  identity,
  verify,
});
const deferred = () => {
  let resolve!: (value: boolean) => void;
  const promise = new Promise<boolean>((r) => (resolve = r));
  return { promise, resolve };
};

describe("createReviewQueue", () => {
  test("opens one dialog at a time, in request order", async () => {
    const queue = createReviewQueue<string, Result>();
    const listener = vi.fn();
    queue.subscribe(listener);
    const first = queue.request("a", review);
    const second = queue.request("b", funding);
    expect(queue.getState()).toEqual({
      active: { id: 1, payload: "a" },
      checking: false,
      queued: 1,
    });
    await queue.finish(1, true);
    expect(await first).toBe(true);
    expect(queue.getState().active).toEqual({ id: 2, payload: "b" });
    await queue.finish(2, 7);
    expect(await second).toBe(7);
    expect(queue.getState()).toEqual({
      active: null,
      checking: false,
      queued: 0,
    });
    expect(listener).toHaveBeenCalledTimes(4);
  });

  test("ignores a stale id and declines a non-approving answer", async () => {
    const queue = createReviewQueue<string, Result>();
    const answer = queue.request("a", review);
    await queue.finish(9, true);
    expect(queue.getState().active?.id).toBe(1);
    await queue.finish(1, false);
    expect(await answer).toBe(false);
  });

  test("declines at once while blocked or already aborted", async () => {
    const queue = createReviewQueue<string, Result>();
    queue.setContext({ blocked: true });
    expect(await queue.request("a", review)).toBe(false);
    queue.setContext({});
    const signal = AbortSignal.abort();
    expect(await queue.request("b", { ...funding, signal })).toBeNull();
    expect(queue.getState().active).toBeNull();
  });

  test("an abort closes the active dialog or drops a queued one", async () => {
    const queue = createReviewQueue<string, Result>();
    const one = new AbortController();
    const two = new AbortController();
    const first = queue.request("a", { ...review, signal: one.signal });
    const second = queue.request("b", { ...funding, signal: two.signal });
    const third = queue.request("c", review);
    two.abort();
    expect(await second).toBeNull();
    expect(queue.getState().queued).toBe(1);
    one.abort();
    expect(await first).toBe(false);
    expect(queue.getState().active?.payload).toBe("c");
    queue.cancel(42);
    queue.cancel(3);
    expect(await third).toBe(false);
  });

  test("a scope change cancels other scopes' requests and advances; unscoped ones stay", async () => {
    const queue = createReviewQueue<string, Result>();
    queue.setContext({ scope: scope("p1") });
    const active = queue.request("a", review);
    queue.setContext({ scope: scope("p1") });
    expect(queue.getState().active?.payload).toBe("a");
    queue.setContext({});
    expect(await active).toBe(false);
    const unscoped = queue.request("b", funding);
    queue.setContext({ scope: scope("p1") });
    const queued = queue.request("c", review);
    const next = queue.request("d", review);
    queue.setContext({ scope: scope("p2") });
    expect(await queued).toBe(false);
    expect(await next).toBe(false);
    expect(queue.getState()).toEqual({
      active: { id: 2, payload: "b" },
      checking: false,
      queued: 0,
    });
    await queue.finish(2, 2);
    expect(await unscoped).toBe(2);
  });

  test("an account change cancels the other account's requests, ignoring case", async () => {
    const queue = createReviewQueue<string, Result>();
    queue.setContext({ account: "0xAB" });
    const mine = queue.request("a", review);
    queue.setContext({ account: "0xab" });
    expect(queue.getState().active?.payload).toBe("a");
    queue.setContext({ account: "0xcd" });
    expect(await mine).toBe(false);
  });

  test("an approval re-proves its scope and declines when the proof fails", async () => {
    const queue = createReviewQueue<string, Result>();
    queue.setContext({ scope: scope("p1", () => Promise.resolve(false)) });
    const failed = queue.request("a", review);
    await queue.finish(1, true);
    expect(await failed).toBe(false);
    queue.setContext({
      scope: scope("p1", () => Promise.reject(new Error("rpc"))),
    });
    const thrown = queue.request("b", review);
    await queue.finish(2, true);
    expect(await thrown).toBe(false);
  });

  test("shows the check and lets a cancellation during it win", async () => {
    const queue = createReviewQueue<string, Result>();
    const proof = deferred();
    queue.setContext({ scope: scope("p1", () => proof.promise) });
    const answer = queue.request("a", review);
    const finishing = queue.finish(1, true);
    expect(queue.getState().checking).toBe(true);
    queue.setContext({ scope: scope("p2") });
    expect(await answer).toBe(false);
    proof.resolve(true);
    await finishing;
    expect(queue.getState()).toEqual({
      active: null,
      checking: false,
      queued: 0,
    });
  });

  test("declines when the account changes during the proof, and approves when nothing did", async () => {
    const queue = createReviewQueue<string, Result>();
    const proof = deferred();
    const p1 = scope("p1", () => proof.promise);
    queue.setContext({ scope: p1, account: "0x1" });
    const answer = queue.request("a", funding);
    const finishing = queue.finish(1, 5);
    queue.setContext({ scope: p1, account: "0x1" });
    proof.resolve(true);
    await finishing;
    expect(await answer).toBe(5);
  });

  test("an unscoped approval resolves without a proof", async () => {
    const queue = createReviewQueue<string, Result>();
    queue.setContext({ account: "0x1" });
    const answer = queue.request("a", review);
    await queue.finish(1, true);
    expect(await answer).toBe(true);
  });

  test("cancelAll declines everything and unsubscribe stops updates", async () => {
    const queue = createReviewQueue<string, Result>();
    const listener = vi.fn();
    const unsubscribe = queue.subscribe(listener);
    const first = queue.request("a", review);
    const second = queue.request("b", funding);
    unsubscribe();
    queue.cancelAll();
    expect(await first).toBe(false);
    expect(await second).toBeNull();
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
