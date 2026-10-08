import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createJBCenterLimiter,
  createJBCenterRpcProvider,
  createPacedJBCenterLimiter,
} from "../jbcenter.js";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
});
afterEach(() => {
  vi.useRealTimers();
});

describe("RPC request admission pacing", () => {
  it("starts all four chains while earlier responses are unresolved", async () => {
    const releases: ((value: string) => void)[] = [];
    const starts: number[] = [];
    const limiter = createPacedJBCenterLimiter();
    const requests = [1, 10, 8453, 42161].map(() =>
      limiter.run(() => {
        starts.push(Date.now());
        return new Promise<string>((resolve) => releases.push(resolve));
      }),
    );
    await vi.advanceTimersByTimeAsync(375);
    expect(starts).toEqual([0, 125, 250, 375]);
    releases.reverse().forEach((release) => release("ok"));
    await expect(Promise.all(requests)).resolves.toEqual([
      "ok",
      "ok",
      "ok",
      "ok",
    ]);
  });

  it("removes aborted queued requests without sending them or delaying followers", async () => {
    const send = vi.fn(async () => "ok");
    const limiter = createPacedJBCenterLimiter();
    const controller = new AbortController();
    const first = limiter.run(send);
    const aborted = limiter.run(send, { signal: controller.signal });
    const assertion = expect(aborted).rejects.toThrow("Cancelled");
    const last = limiter.run(send);
    controller.abort(new Error("Cancelled"));
    await assertion;
    await vi.advanceTimersByTimeAsync(125);
    await Promise.all([first, last]);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("does not release a catch-up burst after timers are delayed", async () => {
    const starts: number[] = [];
    const limiter = createPacedJBCenterLimiter();
    const requests = [1, 2, 3].map(() =>
      limiter.run(async () => {
        starts.push(Date.now());
        return "ok";
      }),
    );
    await Promise.resolve();
    vi.setSystemTime(1000);
    await vi.advanceTimersByTimeAsync(125);
    expect(starts).toEqual([0, 1125]);
    await vi.advanceTimersByTimeAsync(125);
    await Promise.all(requests);
    expect(starts).toEqual([0, 1125, 1250]);
  });

  it("does not spend the RPC network timeout waiting for the shared cooldown", async () => {
    const send = vi
      .fn<typeof fetch>()
      .mockImplementation(async (_input, init) => {
        if (send.mock.calls.length === 1)
          return Response.json(
            {},
            { status: 429, headers: { "Retry-After": "60" } },
          );
        const { id } = JSON.parse(String(init?.body)) as { id: number };
        return Response.json({ jsonrpc: "2.0", id, result: "0x2a" });
      });
    const provider = createJBCenterRpcProvider(8453, {
      fetch: send,
      limiter: createPacedJBCenterLimiter(),
      timeoutMs: 15_000,
    });
    await expect(
      provider.request({ method: "eth_blockNumber" }),
    ).rejects.toHaveProperty("status", 429);
    const next = provider.request({ method: "eth_blockNumber" });
    let failure: unknown;
    void next.catch((error) => {
      failure = error;
    });
    await vi.advanceTimersByTimeAsync(59_999);
    expect(send).toHaveBeenCalledTimes(1);
    expect(failure).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1);
    await expect(next).resolves.toBe("0x2a");
  });

  it("still times out an admitted request and lets later chains progress", async () => {
    const starts: number[] = [];
    const send: typeof fetch = async (_input, init) => {
      starts.push(Date.now());
      return new Promise((_resolve, reject) => {
        init!.signal!.addEventListener("abort", () =>
          reject(init!.signal!.reason),
        );
      });
    };
    const limiter = createPacedJBCenterLimiter();
    const results = [1, 8453].map((chainId) =>
      createJBCenterRpcProvider(chainId, {
        fetch: send,
        limiter,
        timeoutMs: 15_000,
      })
        .request({ method: "eth_blockNumber" })
        .catch((error: unknown) => error),
    );
    await vi.advanceTimersByTimeAsync(125);
    expect(starts).toEqual([0, 125]);
    await vi.advanceTimersByTimeAsync(15_000);
    expect(await Promise.all(results)).toMatchObject([
      { name: "JBCenterTimeoutError" },
      { name: "JBCenterTimeoutError" },
    ]);
  });

  it("combines finite concurrency and spacing without losing either constraint", async () => {
    const limiter = createJBCenterLimiter({ slots: 1, startIntervalMs: 125 });
    let release!: (value: string) => void;
    const first = limiter.run(
      () =>
        new Promise<string>((resolve) => {
          release = resolve;
        }),
    );
    const next = vi.fn(async () => "next");
    const second = limiter.run(next);
    await vi.advanceTimersByTimeAsync(1000);
    expect(next).not.toHaveBeenCalled();
    release("first");
    await expect(Promise.all([first, second])).resolves.toEqual([
      "first",
      "next",
    ]);
  });

  it.each([-1, 1.5, Number.NaN, Infinity, 2 ** 31, "125"])(
    "rejects invalid start interval %s",
    (startIntervalMs) => {
      expect(() =>
        createJBCenterLimiter({
          slots: 1,
          startIntervalMs: startIntervalMs as number,
        }),
      ).toThrow("startIntervalMs must be a whole number from 0 to 2147483647");
    },
  );
});
