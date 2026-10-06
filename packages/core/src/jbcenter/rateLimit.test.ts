import { HttpRequestError } from "viem";
import { afterEach, describe, expect, test, vi } from "vitest";
import { JBCenterRequestError } from "../jbcenter.js";
import { failures, isRateLimited, retryAfterOf } from "./rateLimit.js";

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
