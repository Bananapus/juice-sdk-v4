import {
  HttpRequestError,
  createPublicClient,
  custom,
  fallback,
  http,
  type Chain,
} from "viem";
import { arbitrum, base, mainnet, optimism } from "viem/chains";
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  JBCenterRequestError,
  createJBCenterRpcProvider,
  type JBCenterRpcProvider,
} from "../jbcenter.js";
import {
  JBCENTER_MAX_RATE_LIMIT_PAUSE_MS,
  createJBCenterLimiter,
  errorChain,
  isRateLimited,
  retryAfterOf,
  type JBCenterLimiter,
} from "./rateLimit.js";

afterEach(() => {
  vi.useRealTimers();
});

/** What the limiter says when a request it is starting asks it for another slot. */
const NESTED =
  "A request this JB Center limiter was starting asked it for another slot. Give the limiter to JB Center's provider or wrap one transport with it, not both, and wrap only once.";

/** How a promise has settled so far. */
function watch<T>(promise: Promise<T>) {
  const state: {
    outcome: "pending" | "resolved" | "rejected";
    value?: unknown;
  } = { outcome: "pending" };
  promise.then(
    (value) => Object.assign(state, { outcome: "resolved", value }),
    (error: unknown) =>
      Object.assign(state, { outcome: "rejected", value: error }),
  );
  return state;
}

/** The TypeError a failure wraps, wherever viem put it. */
function typeErrorIn(error: unknown): TypeError | undefined {
  return errorChain(error).find(
    (link): link is TypeError => link instanceof TypeError,
  );
}

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
    const chain = errorChain(outer);
    expect(chain).toHaveLength(3);
    expect(chain[0]).toBe(outer);
    expect(chain[1]).toBe(middle);
    expect(chain[2]).toBe(inner);

    const loop: { cause?: unknown } = {};
    loop.cause = loop;
    expect(errorChain(loop)).toHaveLength(8);
    expect(
      errorChain(Object.assign(new Error("text cause"), { cause: "busy" })),
    ).toHaveLength(1);
    for (const notAnObject of [null, undefined, "busy", 429]) {
      expect(errorChain(notAnObject)).toEqual([]);
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

  test("refuses at once a request that one of its own requests asks for while it starts, and keeps its slot free", async () => {
    const limiter = createJBCenterLimiter({ slots: 1 });
    let inner: Promise<string> | undefined;
    const outer = watch(
      limiter.run(() => {
        inner = limiter.run(async () => "never");
        return inner;
      }),
    );
    const innerState = watch(inner!);
    await vi.waitFor(() => expect(outer.outcome).toBe("rejected"), {
      timeout: 500,
    });
    expect(innerState.outcome).toBe("rejected");
    expect(innerState.value).toEqual(new TypeError(NESTED));
    expect(outer.value).toBe(innerState.value);

    // The refused request took no slot, and the one that asked frees its own.
    const next = pending();
    void limiter.run(next.send);
    await ticks();
    expect(next.sent).toBe(true);
    next.resolve("ok");
  });

  test("refuses only what a request asks for while it starts: one made after it has started waits its turn", async () => {
    const limiter = createJBCenterLimiter({ slots: 2 });
    const answer = limiter.run(async () => {
      await Promise.resolve();
      return limiter.run(async () => "after an await");
    });
    await expect(answer).resolves.toBe("after an await");
    await expect(
      limiter.run(() => Promise.reject(new Error("rpc down"))),
    ).rejects.toThrow("rpc down");
    expect(await limiter.run(async () => "next")).toBe("next");
  });

  test("refuses a slot count that is not a positive whole number", () => {
    for (const slots of [0, -1, 1.5, Number.NaN, "2"]) {
      expect(() => createJBCenterLimiter({ slots: slots as number })).toThrow(
        new TypeError("slots must be a positive safe integer or Infinity"),
      );
    }
  });
});

function jsonResponse(value: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  return new Response(JSON.stringify(value), { ...init, headers });
}

/** Center's answer to one JSON-RPC request. */
function answered(id: number, result: unknown): Response {
  return jsonResponse({ jsonrpc: "2.0", id, result });
}

/** Center's refusal of the rest of its minute. */
function refusal(retryAfter: string): Response {
  return jsonResponse(
    { error: { code: "rate_limit", message: "Request limit exceeded" } },
    { status: 429, headers: { "retry-after": retryAfter } },
  );
}

/** What one fetch asks Center for: the chain from its path, and the JSON-RPC request. */
function asked(input: RequestInfo | URL, init: RequestInit | undefined) {
  const url = String(input);
  const chain = url.slice(url.lastIndexOf("/") + 1);
  const { id, method, params } = JSON.parse(String(init?.body)) as {
    id: number;
    method: string;
    params?: unknown[];
  };
  return {
    chainId: Number(chain),
    id,
    method,
    params,
    what: `${chain} ${method}`,
  };
}

type CenterFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

const CHAINS: Record<number, Chain> = {
  1: mainnet,
  10: optimism,
  8453: base,
  42161: arbitrum,
};

/** A chain's reader as an app builds it: viem over JB Center's provider, retrying once. */
function reader(chainId: number, fetch: CenterFetch, limiter: JBCenterLimiter) {
  return createPublicClient({
    chain: CHAINS[chainId],
    transport: custom(createJBCenterRpcProvider(chainId, { fetch, limiter }), {
      retryCount: 1,
    }),
  });
}

/** JB Center's provider for a chain, sharing the page's limiter. */
function provider(
  chainId: number,
  fetch: CenterFetch,
  limiter: JBCenterLimiter,
): JBCenterRpcProvider {
  return createJBCenterRpcProvider(chainId, { fetch, limiter });
}

const LOGS = {
  method: "eth_getLogs",
  params: [{ fromBlock: "0x1", toBlock: "0x1f4" }],
};

describe("a JB Center limiter shared by a page's readers", () => {
  test("sends every chain's requests through it: two in flight at once, the next as one answers", async () => {
    const limiter = createJBCenterLimiter({ slots: 2 });
    const answers: (() => void)[] = [];
    const sent: string[] = [];
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const { id, what } = asked(input, init);
        sent.push(what);
        await new Promise<void>((resolve) => answers.push(resolve));
        return answered(id, "0x64");
      },
    );
    // Three chains' heads, and a request with its own signal.
    const reads = [8453, 10, 1].map((chainId) =>
      reader(chainId, fetchMock, limiter).getBlockNumber({ cacheTime: 0 }),
    );
    const scan = provider(8453, fetchMock, limiter).request(
      { method: "eth_chainId" },
      { signal: new AbortController().signal },
    );
    await vi.waitFor(() => expect(sent).toHaveLength(2));
    await ticks(20);
    expect(sent).toEqual(["8453 eth_blockNumber", "10 eth_blockNumber"]);

    answers.shift()!();
    await vi.waitFor(() => expect(sent).toHaveLength(3));
    expect(sent[2]).toBe("1 eth_blockNumber");
    while (sent.length < 4 || answers.length) {
      answers.shift()?.();
      await ticks();
    }
    await expect(Promise.all(reads)).resolves.toEqual([100n, 100n, 100n]);
    await expect(scan).resolves.toBe("0x64");
    expect(sent[3]).toBe("8453 eth_chainId");
  });

  test("shares its slots between JB Center's provider and a viem transport it wraps", async () => {
    const limiter = createJBCenterLimiter({ slots: 2 });
    const answers: (() => void)[] = [];
    const sent: string[] = [];
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const { id, what } = asked(input, init);
        sent.push(what);
        await new Promise<void>((resolve) => answers.push(resolve));
        return answered(id, "0x64");
      },
    );
    const overHttp = createPublicClient({
      chain: optimism,
      transport: limiter.transport(
        http("https://juicebox.center/v1/rpc/10", {
          fetchFn: fetchMock,
          retryCount: 0,
        }),
      ),
    });
    const reads = [
      overHttp.getBlockNumber({ cacheTime: 0 }),
      reader(8453, fetchMock, limiter).getBlockNumber({ cacheTime: 0 }),
      reader(1, fetchMock, limiter).getBlockNumber({ cacheTime: 0 }),
    ];
    await vi.waitFor(() => expect(sent).toHaveLength(2));
    await ticks(20);
    // The two hold both slots; viem's http transport reaches fetch a few
    // ticks after the provider does, so the order they arrive in is not theirs.
    expect([...sent].sort()).toEqual([
      "10 eth_blockNumber",
      "8453 eth_blockNumber",
    ]);
    while (sent.length < 3 || answers.length) {
      answers.shift()?.();
      await ticks();
    }
    await expect(Promise.all(reads)).resolves.toEqual([100n, 100n, 100n]);
    expect(sent[2]).toBe("1 eth_blockNumber");
  });

  test("frees the slots of a page's requests the moment the page is left, so the next request goes at once", async () => {
    const limiter = createJBCenterLimiter({ slots: 2 });
    const sent: string[] = [];
    const stopped: string[] = [];
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const { id, method, what } = asked(input, init);
        sent.push(what);
        if (method !== "eth_getLogs") return answered(id, "0x64");
        // Center holds a scan's answer until the request is stopped.
        return new Promise<Response>((_resolve, reject) =>
          init!.signal!.addEventListener("abort", () => {
            stopped.push(what);
            reject(init!.signal!.reason);
          }),
        );
      },
    );
    const page = new AbortController();
    const scans = [8453, 10].map((chainId) =>
      provider(chainId, fetchMock, limiter)
        .request(LOGS, { signal: page.signal })
        .catch((error: unknown) => error),
    );
    const head = reader(1, fetchMock, limiter).getBlockNumber({ cacheTime: 0 });
    await vi.waitFor(() => expect(sent).toHaveLength(2));
    await ticks(20);
    expect(sent).toEqual(["8453 eth_getLogs", "10 eth_getLogs"]);

    const reason = new Error("left the page");
    page.abort(reason);
    await expect(head).resolves.toBe(100n);
    expect(sent).toEqual([
      "8453 eth_getLogs",
      "10 eth_getLogs",
      "1 eth_blockNumber",
    ]);
    expect(stopped).toEqual(["8453 eth_getLogs", "10 eth_getLogs"]);
    expect(await Promise.all(scans)).toEqual([reason, reason]);
  });

  test("never sends what a page that is left was still waiting to send", async () => {
    const limiter = createJBCenterLimiter({ slots: 2 });
    const answers: (() => void)[] = [];
    const sent: string[] = [];
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const { id, what } = asked(input, init);
        sent.push(what);
        await new Promise<void>((resolve) => answers.push(resolve));
        return answered(id, "0x64");
      },
    );
    // Another page's reads hold both slots.
    const others = [10, 1].map((chainId) =>
      reader(chainId, fetchMock, limiter).getBlockNumber({ cacheTime: 0 }),
    );
    await vi.waitFor(() => expect(sent).toHaveLength(2));

    // The page's head, its pinned block and a read wait for a slot.
    const page = new AbortController();
    const pageProvider = provider(8453, fetchMock, limiter);
    const reads = [
      { method: "eth_blockNumber" },
      { method: "eth_getBlockByNumber", params: ["0x64", false] },
      {
        method: "eth_call",
        params: [{ to: `0x${"a".repeat(40)}`, data: "0x18160ddd" }, "0x64"],
      },
    ].map((request) =>
      pageProvider
        .request(request, { signal: page.signal })
        .catch((error: unknown) => error),
    );
    await ticks(20);
    const reason = new Error("left the page");
    page.abort(reason);
    while (answers.length) answers.shift()!();

    await expect(Promise.all(others)).resolves.toEqual([100n, 100n]);
    expect(await Promise.all(reads)).toEqual([reason, reason, reason]);
    await ticks(20);
    expect(sent).toEqual(["10 eth_blockNumber", "1 eth_blockNumber"]);
  });

  test("lets go of its slot while a read waits out a node behind the head, and takes one again to ask once more", async () => {
    vi.useFakeTimers();
    const limiter = createJBCenterLimiter({ slots: 2 });
    const answers: (() => void)[] = [];
    const sent: string[] = [];
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const { id, what } = asked(input, init);
        sent.push(what);
        // The node that answers first has not imported the pinned block yet.
        if (sent.length === 1) {
          return jsonResponse({
            jsonrpc: "2.0",
            id,
            error: { code: -32001, message: "Requested resource not found" },
          });
        }
        await new Promise<void>((resolve) => answers.push(resolve));
        return answered(id, "0x64");
      },
    );
    const pinned = provider(8453, fetchMock, limiter).request({
      method: "eth_call",
      params: [{ to: `0x${"a".repeat(40)}`, data: "0x" }, "0x64"],
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(sent).toEqual(["8453 eth_call"]);

    // While it waits to ask again, both slots are the other readers'.
    const heads = [10, 1].map((chainId) =>
      reader(chainId, fetchMock, limiter).getBlockNumber({ cacheTime: 0 }),
    );
    await vi.advanceTimersByTimeAsync(0);
    expect(sent).toEqual([
      "8453 eth_call",
      "10 eth_blockNumber",
      "1 eth_blockNumber",
    ]);

    // Its next try waits for a slot like any other request.
    await vi.advanceTimersByTimeAsync(1_000);
    expect(sent).toHaveLength(3);
    answers.shift()!();
    await vi.advanceTimersByTimeAsync(0);
    expect(sent[3]).toBe("8453 eth_call");
    while (answers.length) answers.shift()!();
    await expect(Promise.all([pinned, ...heads])).resolves.toEqual([
      "0x64",
      100n,
      100n,
    ]);
  });

  test("frees a slot when a try times out, so two reads Center never answers hold the rest for one timeout at most", async () => {
    vi.useFakeTimers();
    const limiter = createJBCenterLimiter({ slots: 2 });
    const sent: string[] = [];
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const { id, method, what } = asked(input, init);
        sent.push(what);
        if (method !== "eth_getLogs") return answered(id, "0x64");
        // Center never answers the page's scans.
        return new Promise<Response>((_resolve, reject) =>
          init!.signal!.addEventListener("abort", () =>
            reject(init!.signal!.reason),
          ),
        );
      },
    );
    const scans = [8453, 10].map((chainId) =>
      provider(chainId, fetchMock, limiter)
        .request(LOGS)
        .catch((error: unknown) => error),
    );
    const review = provider(8453, fetchMock, limiter).request({
      method: "eth_blockNumber",
    });
    await vi.advanceTimersByTimeAsync(14_999);
    expect(sent).toEqual(["8453 eth_getLogs", "10 eth_getLogs"]);

    await vi.advanceTimersByTimeAsync(1);
    expect(sent[2]).toBe("8453 eth_blockNumber");
    await expect(review).resolves.toBe("0x64");
    expect(await Promise.all(scans)).toMatchObject([
      { name: "JBCenterTimeoutError" },
      { name: "JBCenterTimeoutError" },
    ]);
  });

  test("sends nothing while a Retry-After runs, viem's retry of the refused request and a request whose page is left included", async () => {
    vi.useFakeTimers();
    const limiter = createJBCenterLimiter({ slots: 2 });
    const sent: { at: number; what: string }[] = [];
    const start = Date.now();
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const { id, what } = asked(input, init);
        sent.push({ at: Date.now() - start, what });
        // Center refuses the first request, and the rest of its minute.
        return sent.length === 1 ? refusal("60") : answered(id, "0x64");
      },
    );
    const refusedRead = reader(8453, fetchMock, limiter).getBlockNumber({
      cacheTime: 0,
    });
    await vi.advanceTimersByTimeAsync(0);
    const other = reader(10, fetchMock, limiter).getBlockNumber({
      cacheTime: 0,
    });
    const page = new AbortController();
    const reason = new Error("left the page");
    const left = provider(1, fetchMock, limiter)
      .request({ method: "eth_chainId" }, { signal: page.signal })
      .catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(30_000);
    page.abort(reason);
    await vi.advanceTimersByTimeAsync(29_999);
    expect(sent.map(({ what }) => what)).toEqual(["8453 eth_blockNumber"]);

    // When the minute is over, the refused request is asked again and the
    // other goes, and both are answered. The page that was left sent nothing.
    await vi.advanceTimersByTimeAsync(1);
    await expect(Promise.all([refusedRead, other])).resolves.toEqual([
      100n,
      100n,
    ]);
    expect(await left).toBe(reason);
    expect(
      sent
        .slice(1)
        .map(({ what }) => what)
        .sort(),
    ).toEqual(["10 eth_blockNumber", "8453 eth_blockNumber"]);
    expect(sent.slice(1).every(({ at }) => at >= 60_000)).toBe(true);
  });

  test("pauses every request through it after a 429 a wrapped http transport hands back, for its Retry-After header", async () => {
    vi.useFakeTimers();
    const limiter = createJBCenterLimiter({ slots: 2 });
    const sent: { at: number; what: string }[] = [];
    const start = Date.now();
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const { id, what } = asked(input, init);
        sent.push({ at: Date.now() - start, what });
        return sent.length === 1 ? refusal("2") : answered(id, "0x64");
      },
    );
    const overHttp = createPublicClient({
      chain: base,
      transport: limiter.transport(
        http("https://juicebox.center/v1/rpc/8453", {
          fetchFn: fetchMock,
          retryCount: 1,
        }),
      ),
    });
    const refusedRead = overHttp.getBlockNumber({ cacheTime: 0 });
    await vi.advanceTimersByTimeAsync(0);
    const other = reader(10, fetchMock, limiter).getBlockNumber({
      cacheTime: 0,
    });
    await vi.advanceTimersByTimeAsync(1_999);
    expect(sent.map(({ what }) => what)).toEqual(["8453 eth_blockNumber"]);

    await vi.advanceTimersByTimeAsync(1);
    await expect(Promise.all([refusedRead, other])).resolves.toEqual([
      100n,
      100n,
    ]);
    expect(sent).toHaveLength(3);
    expect(sent.slice(1).every(({ at }) => at >= 2_000)).toBe(true);
  });

  test("wraps a transport without changing it, and lets a request waiting for a slot leave when the signal viem passes aborts", async () => {
    const limiter = createJBCenterLimiter({ slots: 1 });
    const answers: (() => void)[] = [];
    const sent: string[] = [];
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const { id, what } = asked(input, init);
        sent.push(what);
        await new Promise<void>((resolve) => answers.push(resolve));
        return answered(id, "0x64");
      },
    );
    const original = http("https://juicebox.center/v1/rpc/8453", {
      fetchFn: fetchMock,
      retryCount: 0,
    });
    const plain = original({ chain: base });
    const wrapped = limiter.transport(original)({ chain: base });
    const { request: _plainRequest, ...plainConfig } = plain.config;
    const { request: _wrappedRequest, ...wrappedConfig } = wrapped.config;
    expect(wrappedConfig).toEqual(plainConfig);
    expect(wrapped.value).toEqual(plain.value);

    const busy = wrapped.request({ method: "eth_blockNumber" });
    await vi.waitFor(() => expect(sent).toHaveLength(1));
    // viem 2.55 hands each try the read's signal.
    const page = new AbortController();
    const reason = new Error("left the page");
    const leaving = wrapped.config.request({ method: "eth_chainId" }, {
      signal: page.signal,
    } as never);
    page.abort(reason);
    await expect(leaving).rejects.toBe(reason);
    answers.shift()!();
    await expect(busy).resolves.toBe("0x64");
    expect(sent).toEqual(["8453 eth_blockNumber"]);
  });

  test("refuses at once, sending nothing, a transport it wraps that already sends through it: around the provider, inside a fallback, or wrapped twice", async () => {
    const shapes = {
      "around the provider": (fetch: CenterFetch, limiter: JBCenterLimiter) =>
        limiter.transport(
          custom(provider(8453, fetch, limiter), { retryCount: 0 }),
        ),
      "inside a fallback": (fetch: CenterFetch, limiter: JBCenterLimiter) =>
        limiter.transport(
          fallback(
            [custom(provider(8453, fetch, limiter), { retryCount: 0 })],
            { retryCount: 0 },
          ),
        ),
      "wrapped twice": (fetch: CenterFetch, limiter: JBCenterLimiter) =>
        limiter.transport(
          limiter.transport(
            http("https://juicebox.center/v1/rpc/8453", {
              fetchFn: fetch,
              retryCount: 0,
            }),
          ),
        ),
    };
    for (const [shape, build] of Object.entries(shapes)) {
      for (const slots of [1, 2]) {
        const limiter = createJBCenterLimiter({ slots });
        const fetchMock = vi.fn(
          async (input: RequestInfo | URL, init?: RequestInit) =>
            answered(asked(input, init).id, "0x64"),
        );
        const client = createPublicClient({
          chain: base,
          transport: build(fetchMock, limiter),
        });
        const reads = Array.from({ length: slots + 1 }, () =>
          watch(client.request({ method: "eth_blockNumber" })),
        );
        await vi.waitFor(
          () =>
            expect(
              reads.map(({ outcome }) => outcome),
              `${shape} with ${slots} slots`,
            ).toEqual(reads.map(() => "rejected")),
          { timeout: 500 },
        );
        for (const read of reads) {
          expect(typeErrorIn(read.value)?.message).toBe(NESTED);
        }
        expect(
          fetchMock,
          `${shape} with ${slots} slots`,
        ).not.toHaveBeenCalled();
      }
    }
  });

  test("keeps serving a page's other readers after it refuses a doubled one", async () => {
    const limiter = createJBCenterLimiter({ slots: 2 });
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) =>
        answered(asked(input, init).id, "0x64"),
    );
    const doubled = createPublicClient({
      chain: base,
      transport: limiter.transport(
        custom(provider(8453, fetchMock, limiter), { retryCount: 0 }),
      ),
    });
    const refusedReads = [0, 1, 2].map(() =>
      watch(doubled.request({ method: "eth_blockNumber" })),
    );
    await vi.waitFor(
      () =>
        expect(refusedReads.map(({ outcome }) => outcome)).toEqual([
          "rejected",
          "rejected",
          "rejected",
        ]),
      { timeout: 500 },
    );

    await expect(
      reader(10, fetchMock, limiter).getBlockNumber({ cacheTime: 0 }),
    ).resolves.toBe(100n);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("keeps two in flight at most under load: four chains' reads at once, a 429 and a page left", async () => {
    vi.useFakeTimers();
    const limiter = createJBCenterLimiter({ slots: 2 });
    // Center answers each request after 100 to 500 ms, the same for every
    // run, and refuses the 30th for 2 s.
    let seed = 7;
    const latency = () =>
      100 + ((seed = (seed * 48_271) % 2_147_483_647) % 401);
    const origin = Date.now();
    const sent: {
      at: number;
      chainId: number;
      method: string;
      from?: string;
    }[] = [];
    let open = 0;
    let most = 0;
    let refusedAt = -1;
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const { chainId, id, method, params } = asked(input, init);
        sent.push({
          at: Date.now() - origin,
          chainId,
          method,
          from:
            method === "eth_getLogs"
              ? (params![0] as { fromBlock: string }).fromBlock
              : undefined,
        });
        open += 1;
        most = Math.max(most, open);
        try {
          await new Promise((resolve) => setTimeout(resolve, latency()));
          if (sent.length === 30) {
            refusedAt = Date.now() - origin;
            return refusal("2");
          }
          return answered(id, method === "eth_getLogs" ? [] : "0x64");
        } finally {
          open -= 1;
        }
      },
    );
    // Each chain asks for 12 windows of 500 blocks, taking turns; Base's are a
    // page that is left after 3 s.
    const page = new AbortController();
    const reason = new Error("left the page");
    const chains = [1, 10, 8453, 42161];
    const readers = new Map(
      chains.map((chainId) => [chainId, reader(chainId, fetchMock, limiter)]),
    );
    const pageProvider = provider(8453, fetchMock, limiter);
    const windows: { chainId: number; answer: Promise<unknown> }[] = [];
    for (let window = 0; window < 12; window += 1) {
      for (const chainId of chains) {
        const filter = {
          fromBlock: `0x${(1_000 + window * 500).toString(16)}` as const,
          toBlock: `0x${(1_499 + window * 500).toString(16)}` as const,
        };
        windows.push({
          chainId,
          answer:
            chainId === 8453
              ? pageProvider
                  .request(
                    { method: "eth_getLogs", params: [filter] },
                    { signal: page.signal },
                  )
                  .catch((error: unknown) => error)
              : readers
                  .get(chainId)!
                  .request({ method: "eth_getLogs", params: [filter] }),
        });
      }
    }
    const heads = chains.map((chainId) =>
      readers.get(chainId)!.getBlockNumber({ cacheTime: 0 }),
    );
    await vi.advanceTimersByTimeAsync(3_000);
    page.abort(reason);
    const abortedAt = Date.now() - origin;
    await vi.advanceTimersByTimeAsync(60_000);

    await expect(Promise.all(heads)).resolves.toEqual([100n, 100n, 100n, 100n]);
    for (const { chainId, answer } of windows) {
      if (chainId !== 8453) await expect(answer).resolves.toEqual([]);
    }
    const pageAnswers = await Promise.all(
      windows
        .filter(({ chainId }) => chainId === 8453)
        .map(({ answer }) => answer),
    );
    expect(pageAnswers).toContain(reason);
    expect(
      pageAnswers.every((answer) => Array.isArray(answer) || answer === reason),
    ).toBe(true);
    expect(most).toBe(2);
    // Nothing starts while the refusal's Retry-After runs, and no request of
    // the page that was left starts once it is.
    expect(refusedAt).toBeGreaterThan(0);
    expect(
      sent.filter(({ at }) => at > refusedAt && at < refusedAt + 2_000),
    ).toEqual([]);
    expect(
      sent.filter(
        ({ chainId, method, at }) =>
          chainId === 8453 && method === "eth_getLogs" && at > abortedAt,
      ),
    ).toEqual([]);
    // Every window of the other chains was asked for.
    for (const chainId of [1, 10, 42161]) {
      const asked = sent
        .filter(
          (request) =>
            request.chainId === chainId && request.method === "eth_getLogs",
        )
        .map(({ from }) => from);
      expect(new Set(asked).size).toBe(12);
    }
  });
});
