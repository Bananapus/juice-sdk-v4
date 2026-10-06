import { HttpRequestError } from "viem";
import { afterEach, describe, expect, test, vi } from "vitest";
import { JBCenterRequestError } from "../jbcenter.js";
import {
  JBCENTER_MAX_RATE_LIMIT_PAUSE_MS,
  createJBCenterLimiter,
  failures,
  isRateLimited,
  retryAfterOf,
} from "./rateLimit.js";

afterEach(() => {
  vi.useRealTimers();
});

/** Center's 429 as the SDK throws it and viem wraps it: the status and Retry-After on a cause. */
function refused(retryAfter?: number) {
  return Object.assign(new Error("An unknown RPC error occurred."), {
    code: -1,
    cause: new JBCenterRequestError(
      "Request limit exceeded",
      429,
      "rate_limit",
      undefined,
      retryAfter,
    ),
  });
}

/** Center's 429 as viem's http transport throws it: the status and the response headers. */
function refusedOverHttp(retryAfter?: string) {
  return new HttpRequestError({
    url: "https://juicebox.center/v1/rpc/8453",
    status: 429,
    headers: new Headers(
      retryAfter === undefined ? {} : { "retry-after": retryAfter },
    ),
  });
}

describe("a refusal read through viem's cause chain", () => {
  test("lists an error and what it wraps, outermost first, eight links at most", () => {
    const inner = { status: 429 };
    const middle = Object.assign(new Error("middle"), { cause: inner });
    const outer = Object.assign(new Error("outer"), { cause: middle });
    const chain = failures(outer);
    expect(chain).toHaveLength(3);
    expect(chain[0]).toBe(outer);
    expect(chain[1]).toBe(middle);
    expect(chain[2]).toBe(inner);

    const loop: { cause?: unknown } = {};
    loop.cause = loop;
    expect(failures(loop)).toHaveLength(8);
    expect(
      failures(Object.assign(new Error("text cause"), { cause: "busy" })),
    ).toHaveLength(1);
    for (const notAnObject of [null, undefined, "busy", 429]) {
      expect(failures(notAnObject)).toEqual([]);
    }
  });

  test("sees a 429 as an HTTP status or a JSON-RPC code, on the error or anything it wraps", () => {
    expect(isRateLimited(refused())).toBe(true);
    expect(isRateLimited(refusedOverHttp())).toBe(true);
    expect(isRateLimited({ code: 429 })).toBe(true);
    expect(isRateLimited({ cause: { cause: { status: 429 } } })).toBe(true);

    expect(isRateLimited({ status: 503 })).toBe(false);
    expect(isRateLimited({ code: "429" })).toBe(false);
    expect(isRateLimited({ status: "429" })).toBe(false);
    expect(isRateLimited(new Error("429 Too Many Requests"))).toBe(false);
    expect(isRateLimited(undefined)).toBe(false);
  });

  test("reads the wait the SDK put in retryAfter, in seconds, from the first link that has one", () => {
    expect(retryAfterOf(refused(60))).toBe(60);
    expect(retryAfterOf(refused(0))).toBe(0);
    expect(retryAfterOf(refused())).toBeUndefined();
    expect(retryAfterOf({ retryAfter: 5, cause: { retryAfter: 60 } })).toBe(5);
    expect(retryAfterOf({ retryAfter: "60", cause: { retryAfter: 30 } })).toBe(
      30,
    );
    expect(retryAfterOf({ retryAfter: Number.NaN })).toBeUndefined();
    expect(
      retryAfterOf({ retryAfter: Number.POSITIVE_INFINITY }),
    ).toBeUndefined();
    // Any finite number is read as it is; a wait of 0 or less holds nothing.
    expect(retryAfterOf({ retryAfter: -1 })).toBe(-1);
    expect(retryAfterOf({ retryAfter: 1.5 })).toBe(1.5);
    expect(retryAfterOf(undefined)).toBeUndefined();
  });

  test("reads a Retry-After header on viem's HTTP error as the SDK reads Center's, in whole seconds", () => {
    vi.useFakeTimers();
    // Monday 5 October 2026, 12:00:00.400 UTC.
    vi.setSystemTime(Date.UTC(2026, 9, 5, 12, 0, 0, 400));
    expect(retryAfterOf(refusedOverHttp("60"))).toBe(60);
    expect(retryAfterOf(refusedOverHttp("0"))).toBe(0);
    expect(retryAfterOf(refusedOverHttp("Mon, 05 Oct 2026 12:00:30 GMT"))).toBe(
      30,
    );
    expect(
      retryAfterOf(refusedOverHttp("Monday, 05-Oct-26 12:00:30 GMT")),
    ).toBe(30);
    for (const unreadable of ["", "soon", "1.5", "-1", "1e3"]) {
      expect(retryAfterOf(refusedOverHttp(unreadable))).toBeUndefined();
    }
    expect(retryAfterOf(refusedOverHttp())).toBeUndefined();
    // Only a Headers carries a header: a plain object is not read as one.
    expect(
      retryAfterOf({ status: 429, headers: { "retry-after": "60" } }),
    ).toBeUndefined();
    // A link's retryAfter comes before any header, wherever it sits.
    expect(
      retryAfterOf(Object.assign(refusedOverHttp("60"), { cause: refused(5) })),
    ).toBe(5);
  });
});

/** A request the test answers when it likes, and whether it was sent. */
function pending<T = string>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const answer = new Promise<T>((settle, fail) => {
    resolve = settle;
    reject = fail;
  });
  const request = {
    sent: false,
    resolve,
    reject,
    send: () => {
      request.sent = true;
      return answer;
    },
  };
  return request;
}

/** A request that runs until its signal aborts, then fails with the reason. */
function untilAborted(signal: AbortSignal) {
  const request = {
    sent: false,
    send: () => {
      request.sent = true;
      return new Promise<string>((_resolve, reject) =>
        signal.addEventListener("abort", () => reject(signal.reason), {
          once: true,
        }),
      );
    },
  };
  return request;
}

async function ticks(count = 5) {
  for (let at = 0; at < count; at += 1) await Promise.resolve();
}

describe("a JB Center limiter", () => {
  test("runs as many requests at once as it has slots, and starts the others in the order they came as one ends", async () => {
    const limiter = createJBCenterLimiter({ slots: 2 });
    const requests = Array.from({ length: 5 }, () => pending());
    const answers = requests.map((request) => limiter.run(request.send));
    await ticks();
    expect(requests.map((request) => request.sent)).toEqual([
      true,
      true,
      false,
      false,
      false,
    ]);

    requests[1].resolve("b");
    await ticks();
    expect(requests.map((request) => request.sent)).toEqual([
      true,
      true,
      true,
      false,
      false,
    ]);

    // A failure frees its slot as an answer does, and goes to its own caller.
    requests[0].reject(new Error("rpc down"));
    await expect(answers[0]).rejects.toThrow("rpc down");
    await ticks();
    expect(requests.map((request) => request.sent)).toEqual([
      true,
      true,
      true,
      true,
      false,
    ]);

    requests[2].resolve("c");
    await ticks();
    expect(requests[4].sent).toBe(true);
    requests[3].resolve("d");
    requests[4].resolve("e");
    expect(await Promise.all(answers.slice(1))).toEqual(["b", "c", "d", "e"]);
  });

  test("gives a request that throws before it returns a promise its failure, and goes on", async () => {
    const limiter = createJBCenterLimiter({ slots: 1 });
    const failure = new Error("bad arguments");
    await expect(
      limiter.run(() => {
        throw failure;
      }),
    ).rejects.toBe(failure);
    expect(await limiter.run(async () => "next")).toBe("next");
  });

  test("takes a request whose signal aborts while it waits out of the line at once, rejecting with the reason, and never sends it", async () => {
    const limiter = createJBCenterLimiter({ slots: 1 });
    const busy = pending();
    void limiter.run(busy.send);
    const page = new AbortController();
    const reason = new Error("left the page");
    const left = pending();
    const leaving = limiter.run(left.send, { signal: page.signal });
    const next = pending();
    const after = limiter.run(next.send);

    page.abort(reason);
    await expect(leaving).rejects.toBe(reason);
    busy.resolve("a");
    await ticks();
    expect(left.sent).toBe(false);
    expect(next.sent).toBe(true);
    next.resolve("next");
    expect(await after).toBe("next");
  });

  test("never sends a request whose signal has already aborted", async () => {
    const limiter = createJBCenterLimiter({ slots: 1 });
    const page = new AbortController();
    page.abort(new Error("gone"));
    const gone = pending();
    await expect(
      limiter.run(gone.send, { signal: page.signal }),
    ).rejects.toThrow("gone");
    await ticks();
    expect(gone.sent).toBe(false);
  });

  test("does not stop a request under way when its signal aborts: the request answers to its own signal", async () => {
    const limiter = createJBCenterLimiter({ slots: 1 });
    const page = new AbortController();
    const running = pending();
    const answer = limiter.run(running.send, { signal: page.signal });
    await ticks();
    page.abort(new Error("left the page"));
    running.resolve("finished");
    expect(await answer).toBe("finished");
  });

  test("starts nothing more until the Retry-After of a 429 has passed: every request in that minute would be refused", async () => {
    vi.useFakeTimers();
    const limiter = createJBCenterLimiter({ slots: 2 });
    const first = pending();
    const other = pending();
    const refusedAnswer = limiter.run(first.send);
    const inFlight = limiter.run(other.send);
    const waiting = [pending(), pending()];
    const later = waiting.map((request) => limiter.run(request.send));
    await ticks();

    first.reject(refused(60));
    await expect(refusedAnswer).rejects.toMatchObject({
      cause: { status: 429 },
    });
    // The request in flight when Center refused is not stopped, and its slot
    // frees, but nothing new starts.
    other.resolve("in flight");
    expect(await inFlight).toBe("in flight");
    await vi.advanceTimersByTimeAsync(59_999);
    expect(waiting.map((request) => request.sent)).toEqual([false, false]);

    await vi.advanceTimersByTimeAsync(1);
    expect(waiting.map((request) => request.sent)).toEqual([true, true]);
    for (const request of waiting) request.resolve("after the minute");
    expect(await Promise.all(later)).toEqual([
      "after the minute",
      "after the minute",
    ]);
  });

  test("holds its slots a minute at most, and not at all for a refusal that names no wait", async () => {
    vi.useFakeTimers();
    const limiter = createJBCenterLimiter({ slots: 2 });
    const long = pending();
    const refusedLong = limiter.run(long.send);
    long.reject(refused(600));
    await expect(refusedLong).rejects.toBeDefined();
    const held = pending();
    const heldAnswer = limiter.run(held.send);
    await vi.advanceTimersByTimeAsync(JBCENTER_MAX_RATE_LIMIT_PAUSE_MS - 1);
    expect(held.sent).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(held.sent).toBe(true);
    held.resolve("ok");
    await heldAnswer;

    // A 429 without a Retry-After (a node's JSON-RPC 429) is its caller's to
    // wait out: the line goes on.
    const bare = pending();
    const bareAnswer = limiter.run(bare.send);
    bare.reject(refused());
    await expect(bareAnswer).rejects.toBeDefined();
    const next = pending();
    void limiter.run(next.send);
    await ticks();
    expect(next.sent).toBe(true);
    next.resolve("ok");
    expect(JBCENTER_MAX_RATE_LIMIT_PAUSE_MS).toBe(60_000);
  });

  test("keeps the later end when a second refusal names a shorter wait", async () => {
    vi.useFakeTimers();
    const limiter = createJBCenterLimiter({ slots: 2 });
    const [first, second] = [pending(), pending()];
    const answers = Promise.allSettled([
      limiter.run(first.send),
      limiter.run(second.send),
    ]);
    await ticks();
    first.reject(refused(60));
    await vi.advanceTimersByTimeAsync(10_000);
    second.reject(refused(5));
    expect((await answers).map((answer) => answer.status)).toEqual([
      "rejected",
      "rejected",
    ]);
    const held = pending();
    void limiter.run(held.send);
    await vi.advanceTimersByTimeAsync(49_999);
    expect(held.sent).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(held.sent).toBe(true);
    held.resolve("ok");
  });

  test("waits out a later end when a second refusal names a longer wait", async () => {
    vi.useFakeTimers();
    const limiter = createJBCenterLimiter({ slots: 2 });
    const [first, second] = [pending(), pending()];
    const answers = Promise.allSettled([
      limiter.run(first.send),
      limiter.run(second.send),
    ]);
    await ticks();
    first.reject(refused(5));
    await vi.advanceTimersByTimeAsync(1_000);
    second.reject(refused(30));
    await answers;
    const held = pending();
    void limiter.run(held.send);
    await vi.advanceTimersByTimeAsync(29_999);
    expect(held.sent).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(held.sent).toBe(true);
    held.resolve("ok");
  });

  test("pauses for the Retry-After header of viem's HTTP error, and not for one it cannot read, a wait of 0 or a refusal that is not a 429", async () => {
    vi.useFakeTimers();
    const limiter = createJBCenterLimiter({ slots: 1 });
    for (const failure of [
      refusedOverHttp("soon"),
      refused(0),
      Object.assign(new Error("Service unavailable"), {
        status: 503,
        retryAfter: 60,
      }),
    ]) {
      const refusedRequest = pending();
      const answer = limiter.run(refusedRequest.send);
      refusedRequest.reject(failure);
      await expect(answer).rejects.toBe(failure);
      const next = pending();
      void limiter.run(next.send);
      await ticks();
      expect(next.sent).toBe(true);
      next.resolve("ok");
      await ticks();
    }

    const overHttp = pending();
    const overHttpAnswer = limiter.run(overHttp.send);
    overHttp.reject(refusedOverHttp("2"));
    await expect(overHttpAnswer).rejects.toBeInstanceOf(HttpRequestError);
    const held = pending();
    void limiter.run(held.send);
    await vi.advanceTimersByTimeAsync(1_999);
    expect(held.sent).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(held.sent).toBe(true);
    held.resolve("ok");
  });

  test("lets go of a slot exactly once whatever ends a request: an answer, a failure, a throw, or an abort before it starts, under way or during a pause", async () => {
    vi.useFakeTimers();
    const limiter = createJBCenterLimiter({ slots: 2 });

    // An answer, a failure and a throw.
    await limiter.run(async () => "answer");
    await expect(
      limiter.run(async () => Promise.reject(new Error("failure"))),
    ).rejects.toThrow("failure");
    await expect(
      limiter.run(() => {
        throw new Error("throw");
      }),
    ).rejects.toThrow("throw");

    // An abort before it starts, and one under way.
    const before = new AbortController();
    before.abort(new Error("before"));
    await expect(
      limiter.run(async () => "never", { signal: before.signal }),
    ).rejects.toThrow("before");
    const underWay = new AbortController();
    const running = untilAborted(underWay.signal);
    const runningAnswer = limiter.run(running.send, {
      signal: underWay.signal,
    });
    await ticks();
    expect(running.sent).toBe(true);
    underWay.abort(new Error("under way"));
    await expect(runningAnswer).rejects.toThrow("under way");

    // An abort while it waits out a refusal.
    const refusedRequest = pending();
    const refusedAnswer = limiter.run(refusedRequest.send);
    refusedRequest.reject(refused(10));
    await expect(refusedAnswer).rejects.toBeDefined();
    const duringPause = new AbortController();
    const waiter = pending();
    const waiterAnswer = limiter.run(waiter.send, {
      signal: duringPause.signal,
    });
    duringPause.abort(new Error("during the pause"));
    await expect(waiterAnswer).rejects.toThrow("during the pause");
    await vi.advanceTimersByTimeAsync(10_000);
    expect(waiter.sent).toBe(false);

    // Exactly two slots are left: two requests start, a third waits.
    const after = Array.from({ length: 3 }, () => pending());
    const afterAnswers = after.map((request) => limiter.run(request.send));
    await ticks();
    expect(after.map((request) => request.sent)).toEqual([true, true, false]);
    after[0].resolve("a");
    await ticks();
    expect(after[2].sent).toBe(true);
    after[1].resolve("b");
    after[2].resolve("c");
    expect(await Promise.all(afterAnswers)).toEqual(["a", "b", "c"]);
  });

  test("keeps each limiter's slots and pauses to itself", async () => {
    vi.useFakeTimers();
    const one = createJBCenterLimiter({ slots: 1 });
    const other = createJBCenterLimiter({ slots: 1 });
    const refusedRequest = pending();
    const refusedAnswer = one.run(refusedRequest.send);
    refusedRequest.reject(refused(60));
    await expect(refusedAnswer).rejects.toBeDefined();

    const elsewhere = pending();
    void other.run(elsewhere.send);
    const held = pending();
    void one.run(held.send);
    await ticks();
    expect(elsewhere.sent).toBe(true);
    expect(held.sent).toBe(false);
    elsewhere.resolve("ok");
    await vi.advanceTimersByTimeAsync(60_000);
    expect(held.sent).toBe(true);
    held.resolve("ok");
  });

  test("refuses a slot count that is not a positive whole number", () => {
    for (const slots of [
      0,
      -1,
      1.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      "2",
    ]) {
      expect(() => createJBCenterLimiter({ slots: slots as number })).toThrow(
        new TypeError("slots must be a positive safe integer"),
      );
    }
  });
});
