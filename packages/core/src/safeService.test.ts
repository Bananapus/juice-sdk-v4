import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isSafeWalletPeer,
  SAFE_NONCE_GUIDANCE,
  SAFE_PREFIX,
  SAFE_SERVICE_PREFIX,
  safeQueueUrl,
  safeServiceBase,
  swapDeadline,
  waitForSafeExecutionHash,
} from "./safeService.js";

const SAFE = "0x1111111111111111111111111111111111111111" as const;
const PROPOSAL = `0x${"ab".repeat(32)}` as const;
const EXECUTION = `0x${"cd".repeat(32)}` as const;
const executed = (fields: Record<string, unknown>) => ({
  ok: true,
  json: async () => fields,
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("Safe transaction service boundaries", () => {
  it("links the queue and explains the authoritative nonce selector", () => {
    expect(SAFE_NONCE_GUIDANCE).toMatch(/next available/i);
    expect(SAFE_NONCE_GUIDANCE).toMatch(/queued nonces/i);
    expect(safeQueueUrl(8453, SAFE)).toBe(
      `https://app.safe.global/transactions/queue?safe=base:${SAFE}`,
    );
    expect(safeQueueUrl(999, SAFE)).toBeNull();
  });

  it("gives swaps 20 minutes for EOAs and 30 days for Safe signature collection", () => {
    const nowMs = 1_700_000_000_000;
    const nowSec = 1_700_000_000;
    expect(swapDeadline(false, nowMs)).toBe(BigInt(nowSec + 20 * 60));
    expect(swapDeadline(true, nowMs)).toBe(BigInt(nowSec + 30 * 24 * 60 * 60));
    expect(swapDeadline(false) > BigInt(nowSec)).toBe(true);
  });

  it("keeps the app-URL map wider than the hosted-service map", () => {
    expect(Object.keys(SAFE_PREFIX).map(Number).sort()).toEqual(
      [1, 10, 8453, 42161, 11155111, 11155420, 84532, 421614].sort(),
    );
    expect(Object.keys(SAFE_SERVICE_PREFIX).map(Number).sort()).toEqual(
      [1, 10, 8453, 42161, 11155111, 84532].sort(),
    );
    expect(safeServiceBase(11155420)).toBeNull();
    expect(safeServiceBase(421614)).toBeNull();
    expect(safeServiceBase(84532)).toBe(
      "https://api.safe.global/tx-service/basesep",
    );
  });

  it("honors a local service override and ignores an unreadable one", () => {
    let stored: string | null = JSON.stringify({ 10: "https://safe.test/" });
    vi.stubGlobal("localStorage", { getItem: () => stored });
    expect(safeServiceBase(10)).toBe("https://safe.test");
    expect(safeServiceBase(8453)).toBe(
      "https://api.safe.global/tx-service/base",
    );
    stored = "{";
    expect(safeServiceBase(10)).toBe("https://api.safe.global/tx-service/oeth");
  });

  it("resolves a proposal to the mined execution hash from the hosted service", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        executed({
          isExecuted: true,
          isSuccessful: true,
          transactionHash: EXECUTION,
        }),
      ),
    );
    await expect(waitForSafeExecutionHash(8453, PROPOSAL)).resolves.toBe(
      EXECUTION,
    );
    expect(fetch).toHaveBeenCalledWith(
      `https://api.safe.global/tx-service/base/api/v1/multisig-transactions/${PROPOSAL}/`,
      { headers: { accept: "application/json" } },
    );
  });

  it("polls as every service call does: with the local API key and the caller's signal", async () => {
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => (key === "jb-safe-api-key" ? "secret" : null),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        executed({
          isExecuted: true,
          isSuccessful: true,
          transactionHash: EXECUTION,
        }),
      ),
    );
    const signal = new AbortController().signal;
    await expect(
      waitForSafeExecutionHash(8453, PROPOSAL, { signal }),
    ).resolves.toBe(EXECUTION);
    expect(fetch).toHaveBeenCalledWith(
      `https://api.safe.global/tx-service/base/api/v1/multisig-transactions/${PROPOSAL}/`,
      {
        headers: { accept: "application/json", authorization: "Bearer secret" },
        signal,
      },
    );
  });

  it("ends a poll in flight when the signal aborts", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_input: unknown, init?: RequestInit) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () =>
              reject(init.signal?.reason),
            );
          }),
      ),
    );
    const page = new AbortController();
    const waiting = waitForSafeExecutionHash(8453, PROPOSAL, {
      pollingIntervalMs: 60_000,
      signal: page.signal,
    });
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    page.abort();
    await expect(
      Promise.race([
        waiting,
        new Promise((_resolve, reject) =>
          setTimeout(() => reject(new Error("Still waiting.")), 500),
        ),
      ]),
    ).rejects.toMatchObject({ name: "AbortError" });
  });

  it("after a 429, waits the longer of the poll interval and its Retry-After before polling again", async () => {
    vi.useFakeTimers();
    const limited = (headers: Record<string, string> = {}) =>
      new Response("busy", { status: 429, headers });
    const responses = [
      limited({ "retry-after": "20" }),
      limited({ "retry-after": "2" }),
      limited(),
      limited({ "retry-after": "soon" }),
      new Response(
        JSON.stringify({
          isExecuted: true,
          isSuccessful: true,
          transactionHash: EXECUTION,
        }),
      ),
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => responses.shift()!),
    );
    const waiting = waitForSafeExecutionHash(8453, PROPOSAL, {
      pollingIntervalMs: 5_000,
    });
    // Each 429 is one request: the poll does not retry it on its own.
    for (const [elapsed, polls] of [
      [0, 1],
      [19_999, 1],
      [1, 2],
      [4_999, 2],
      [1, 3],
      [5_000, 4],
      [5_000, 5],
    ]) {
      await vi.advanceTimersByTimeAsync(elapsed);
      expect(fetch).toHaveBeenCalledTimes(polls);
    }
    await expect(waiting).resolves.toBe(EXECUTION);
  });

  it("fails at once on chains without a hosted service", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(waitForSafeExecutionHash(11155420, PROPOSAL)).rejects.toThrow(
      /does not host a transaction service/i,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("treats sustained 404s as terminal", async () => {
    const fetchMock = vi.fn(async () => ({ ok: false, status: 404 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      waitForSafeExecutionHash(8453, PROPOSAL, { pollingIntervalMs: 1 }),
    ).rejects.toThrow(/no record of this proposal/i);
    expect(fetchMock).toHaveBeenCalledTimes(12);
  });

  it("rides out 404s, outages and pending proposals until execution", async () => {
    const responses: Array<() => unknown> = [
      () => ({ ok: false, status: 404 }),
      () => {
        throw new TypeError("network down");
      },
      () => ({ ok: false, status: 503 }),
      () => executed({ isExecuted: false }),
      () =>
        executed({
          isExecuted: true,
          isSuccessful: true,
          transactionHash: EXECUTION,
        }),
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => responses.shift()!()),
    );
    await expect(
      waitForSafeExecutionHash(8453, PROPOSAL, {
        pollingIntervalMs: 1,
        signal: new AbortController().signal,
      }),
    ).resolves.toBe(EXECUTION);
  });

  it("reports an executed proposal whose onchain transaction failed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => executed({ isExecuted: true, isSuccessful: false })),
    );
    await expect(waitForSafeExecutionHash(8453, PROPOSAL)).rejects.toThrow(
      /onchain transaction failed/i,
    );
  });

  it("refuses a malformed proposal hash, and a malformed execution hash from the service", async () => {
    await expect(
      waitForSafeExecutionHash(8453, "0x1234" as typeof PROPOSAL),
    ).rejects.toThrow("Invalid Safe proposal hash: 0x1234.");
    for (const transactionHash of ["0x1234", `0x${"zz".repeat(32)}`, 7]) {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () =>
          executed({ isExecuted: true, isSuccessful: true, transactionHash }),
        ),
      );
      await expect(waitForSafeExecutionHash(8453, PROPOSAL)).rejects.toThrow(
        `reported ${PROPOSAL} executed in a malformed transaction hash: ${transactionHash}.`,
      );
    }
  });

  it("stops when aborted before, during or between polls", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => executed({ isExecuted: false })),
    );
    await expect(
      waitForSafeExecutionHash(8453, PROPOSAL, {
        signal: AbortSignal.abort(),
      }),
    ).rejects.toMatchObject({ name: "AbortError" });

    const between = new AbortController();
    const waiting = waitForSafeExecutionHash(8453, PROPOSAL, {
      pollingIntervalMs: 60_000,
      signal: between.signal,
    });
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    between.abort();
    await expect(waiting).rejects.toMatchObject({ name: "AbortError" });

    const during = new AbortController();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        during.abort();
        return { ok: false, status: 503 };
      }),
    );
    await expect(
      waitForSafeExecutionHash(8453, PROPOSAL, {
        pollingIntervalMs: 60_000,
        signal: during.signal,
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
  });

  it("returns a hash the chain already knows as the execution, without the service", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const getTransaction = vi.fn(async () => ({ hash: EXECUTION }));
    await expect(
      waitForSafeExecutionHash(8453, EXECUTION, {
        client: { getTransaction },
      }),
    ).resolves.toBe(EXECUTION);
    expect(getTransaction).toHaveBeenCalledWith({ hash: EXECUTION });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("asks the service when the chain does not know the hash", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        executed({
          isExecuted: true,
          isSuccessful: true,
          transactionHash: EXECUTION,
        }),
      ),
    );
    await expect(
      waitForSafeExecutionHash(8453, PROPOSAL, {
        client: {
          getTransaction: async () => {
            throw new Error("Transaction not found");
          },
        },
      }),
    ).resolves.toBe(EXECUTION);
  });

  it("tracks an executed hash on a chain without a hosted service, and gives up on a proposal", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    let seen = 0;
    const later = {
      getTransaction: async () => {
        seen += 1;
        if (seen < 3) throw new Error("Transaction not found");
        return {};
      },
    };
    await expect(
      waitForSafeExecutionHash(11155420, EXECUTION, {
        pollingIntervalMs: 1,
        client: later,
      }),
    ).resolves.toBe(EXECUTION);
    const never = vi.fn(async () => {
      throw new Error("Transaction not found");
    });
    await expect(
      waitForSafeExecutionHash(11155420, PROPOSAL, {
        pollingIntervalMs: 1,
        client: { getTransaction: never },
      }),
    ).rejects.toThrow(/does not host a transaction service/i);
    expect(never).toHaveBeenCalledTimes(12);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("recognizes Safe{Wallet} as a WalletConnect peer, and only it", () => {
    expect(isSafeWalletPeer("https://app.safe.global")).toBe(true);
    expect(isSafeWalletPeer("https://app.safe.global/home")).toBe(true);
    expect(isSafeWalletPeer("https://www.safepal.com")).toBe(false);
    expect(isSafeWalletPeer("https://app.safe.global.evil.example")).toBe(
      false,
    );
    expect(isSafeWalletPeer("not a url")).toBe(false);
    expect(isSafeWalletPeer(undefined)).toBe(false);
  });
});
