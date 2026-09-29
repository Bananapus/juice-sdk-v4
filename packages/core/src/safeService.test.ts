import { afterEach, describe, expect, it, vi } from "vitest";
import {
  SAFE_NONCE_GUIDANCE,
  SAFE_PREFIX,
  SAFE_SERVICE_PREFIX,
  safeQueueUrl,
  safeServiceBase,
  swapDeadline,
  waitForSafeExecutionHash,
} from "./safe.js";

const SAFE = "0x1111111111111111111111111111111111111111" as const;
const PROPOSAL = `0x${"ab".repeat(32)}` as const;
const EXECUTION = `0x${"cd".repeat(32)}` as const;
const executed = (fields: Record<string, unknown>) => ({
  ok: true,
  json: async () => fields,
});

afterEach(() => {
  vi.unstubAllGlobals();
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
    );
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
});
