import { getEventListeners } from "node:events";
import {
  createPublicClient,
  custom,
  HttpRequestError,
  RpcRequestError,
  TimeoutError,
  TransactionNotFoundError,
} from "viem";
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
/** How viem's chain client answers `getTransaction` for a hash the chain has no transaction for. */
const notFound = () => new TransactionNotFoundError({ hash: PROPOSAL });
/** A node that cannot be reached says nothing about a transaction. */
const unreachable = () =>
  new HttpRequestError({ url: "https://rpc.example", details: "fetch failed" });
/** The two ends of a look that settles when the test says so. */
type Look = {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
};
/** `promise`, or a rejection after `ms`, so a wait that never ends fails its test instead of hanging it. */
const within = <T>(promise: Promise<T>, ms = 500): Promise<T> =>
  Promise.race([
    promise,
    new Promise<never>((_resolve, reject) =>
      setTimeout(() => reject(new Error("Still waiting.")), ms),
    ),
  ]);
/**
 * A chain check that fails with `failure()` for `looks` looks and then knows
 * the hash, so a wait that should have ended by then resolves instead of
 * looping.
 */
const failingThenKnown = (failure: () => unknown, looks = 12) => {
  let seen = 0;
  return vi.fn(async () => {
    seen += 1;
    if (seen > looks) return {};
    throw failure();
  });
};

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

  it("keeps waiting through a Retry-After longer than one timer can hold, instead of polling again at once", async () => {
    for (const retryAfter of ["3000000", "Mon, 05 Oct 2099 12:00:00 GMT"]) {
      vi.stubGlobal(
        "fetch",
        vi.fn(
          async () =>
            new Response("busy", {
              status: 429,
              headers: { "retry-after": retryAfter },
            }),
        ),
      );
      const page = new AbortController();
      const waiting = waitForSafeExecutionHash(8453, PROPOSAL, {
        pollingIntervalMs: 1,
        signal: page.signal,
      }).catch((error: unknown) => error);
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(fetch).toHaveBeenCalledTimes(1);
      page.abort();
      expect(await waiting).toMatchObject({ name: "AbortError" });
    }
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

  it.each([
    ["does not know the hash", notFound],
    ["cannot answer", unreachable],
  ])("asks the service when the chain %s", async (_case, failure) => {
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
            throw failure();
          },
        },
      }),
    ).resolves.toBe(EXECUTION);
  });

  it.each([
    ["has no transaction with the hash", notFound],
    ["cannot answer", unreachable],
  ])(
    "leaves a chain with a hosted service to the service when its chain %s: twelve 404s from the service end the wait, whatever the chain says",
    async (_case, failure) => {
      const fetchMock = vi.fn(async () => ({ ok: false, status: 404 }));
      vi.stubGlobal("fetch", fetchMock);
      const getTransaction = vi.fn(async () => {
        throw failure();
      });
      await expect(
        waitForSafeExecutionHash(8453, PROPOSAL, {
          pollingIntervalMs: 1,
          client: { getTransaction },
        }),
      ).rejects.toThrow(/no record of this proposal/i);
      expect(fetchMock).toHaveBeenCalledTimes(12);
      expect(getTransaction).toHaveBeenCalledTimes(12);
    },
  );

  it("tracks an executed hash on a chain without a hosted service, and gives up on a proposal", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    let seen = 0;
    const later = {
      getTransaction: async () => {
        seen += 1;
        if (seen < 3) throw notFound();
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
      throw notFound();
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

  it("gives up after twelve not-found answers even when the failures between them are not", async () => {
    // Looks: not found x6, a node that cannot answer, not found x5 (eleven in all), two more
    // failures, then the twelfth not-found answer. A failed look neither counts nor starts over.
    const looks = [
      ...Array.from({ length: 6 }, () => notFound),
      unreachable,
      ...Array.from({ length: 5 }, () => notFound),
      unreachable,
      unreachable,
      notFound,
    ];
    const getTransaction = vi.fn(async () => {
      const next = looks.shift();
      // A wait that counted a failure would have ended already; one that started over keeps looking.
      if (!next) return {};
      throw next();
    });
    await expect(
      waitForSafeExecutionHash(11155420, PROPOSAL, {
        pollingIntervalMs: 1,
        client: { getTransaction },
      }),
    ).rejects.toThrow(/does not host a transaction service/i);
    expect(getTransaction).toHaveBeenCalledTimes(15);
  });

  it("keeps looking on a chain without a hosted service while its node cannot answer, until the signal aborts", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const getTransaction = vi.fn(async () => {
      throw unreachable();
    });
    const page = new AbortController();
    const outcome = waitForSafeExecutionHash(11155420, PROPOSAL, {
      client: { getTransaction },
      signal: page.signal,
    }).then(
      () => "resolved",
      (error: unknown) => error,
    );
    // Twelve looks are about a minute at the default 5 s. Five minutes in, the wait is still looking.
    await vi.advanceTimersByTimeAsync(5 * 60_000);
    expect(getTransaction).toHaveBeenCalledTimes(61);
    page.abort();
    expect(await outcome).toMatchObject({ name: "AbortError" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ["without a hosted service", 11155420],
    ["with a hosted service", 8453],
  ])(
    "ends at once when the signal aborts while a chain look is still in flight, on a chain %s",
    async (_case, chainId) => {
      // A look that never settles, as one over a transport with no timeout does.
      const getTransaction = vi.fn(() => new Promise<never>(() => undefined));
      const page = new AbortController();
      const waiting = waitForSafeExecutionHash(chainId, PROPOSAL, {
        client: { getTransaction },
        signal: page.signal,
      });
      await vi.waitFor(() => expect(getTransaction).toHaveBeenCalledTimes(1));
      page.abort();
      await expect(within(waiting)).rejects.toMatchObject({
        name: "AbortError",
      });
    },
  );

  it("ends at once when a chain look aborts the signal as it starts", async () => {
    const page = new AbortController();
    const getTransaction = vi.fn(() => {
      page.abort();
      return new Promise<never>(() => undefined);
    });
    await expect(
      within(
        waitForSafeExecutionHash(11155420, PROPOSAL, {
          client: { getTransaction },
          signal: page.signal,
        }),
      ),
    ).rejects.toMatchObject({ name: "AbortError" });
  });

  it.each([
    ["knows the hash", (look: Look) => look.resolve({})],
    ["fails", (look: Look) => look.reject(new Error("late failure"))],
    [
      // The look itself rejects only when it cannot read the failure's name.
      "fails with an error whose name cannot be read",
      (look: Look) =>
        look.reject(
          Object.defineProperty({}, "name", {
            get() {
              throw new Error("unreadable");
            },
          }),
        ),
    ],
  ])(
    "ignores what a look answers after the wait ended, when it %s",
    async (_case, answer) => {
      const unhandled = vi.fn();
      process.on("unhandledRejection", unhandled);
      try {
        const look = {} as Look;
        const getTransaction = vi.fn(
          () =>
            new Promise<unknown>((resolve, reject) => {
              Object.assign(look, { resolve, reject });
            }),
        );
        const page = new AbortController();
        const waiting = waitForSafeExecutionHash(11155420, PROPOSAL, {
          client: { getTransaction },
          signal: page.signal,
        });
        await vi.waitFor(() => expect(getTransaction).toHaveBeenCalledTimes(1));
        page.abort();
        await expect(within(waiting)).rejects.toMatchObject({
          name: "AbortError",
        });
        answer(look);
        // Give an unhandled rejection the time to surface.
        await new Promise((resolve) => setTimeout(resolve, 20));
        expect(unhandled).not.toHaveBeenCalled();
        expect(getTransaction).toHaveBeenCalledTimes(1);
      } finally {
        process.off("unhandledRejection", unhandled);
      }
    },
  );

  it("leaves no abort listener on the caller's signal once its looks are done", async () => {
    const page = new AbortController();
    await expect(
      waitForSafeExecutionHash(11155420, PROPOSAL, {
        pollingIntervalMs: 1,
        client: { getTransaction: failingThenKnown(notFound, 3) },
        signal: page.signal,
      }),
    ).resolves.toBe(PROPOSAL);
    expect(getEventListeners(page.signal, "abort")).toHaveLength(0);
  });

  it.each([
    ["a failed HTTP request", unreachable()],
    [
      "a timeout",
      new TimeoutError({
        body: { method: "eth_getTransactionByHash" },
        url: "https://rpc.example",
      }),
    ],
    [
      "a node's own error",
      new RpcRequestError({
        body: { method: "eth_getTransactionByHash" },
        error: { code: -32000, message: "transaction indexing is in progress" },
        url: "https://rpc.example",
      }),
    ],
    [
      "a plain error whose message says not found",
      new Error("Transaction not found"),
    ],
    ["a thrown string", "Transaction not found"],
    ["a thrown undefined", undefined],
    ["a thrown null", null],
  ])(
    "does not take %s for the chain having no such transaction",
    async (_what, failure) => {
      let looks = 0;
      const getTransaction = vi.fn(async () => {
        looks += 1;
        if (looks > 20) return {};
        throw failure;
      });
      await expect(
        waitForSafeExecutionHash(11155420, PROPOSAL, {
          pollingIntervalMs: 1,
          client: { getTransaction },
        }),
      ).resolves.toBe(PROPOSAL);
      expect(getTransaction).toHaveBeenCalledTimes(21);
    },
  );

  it("reads the answers of a real viem client: a hash its chain has no transaction for is a not-found, a node that fails is not", async () => {
    let calls = 0;
    // A node that fails for fifteen looks, then knows the hash.
    const flaky = createPublicClient({
      transport: custom(
        {
          request: async ({ method }: { method: string }) => {
            expect(method).toBe("eth_getTransactionByHash");
            calls += 1;
            if (calls <= 15) throw new Error("fetch failed");
            return { hash: PROPOSAL, type: "0x0" };
          },
        },
        { retryCount: 0 },
      ),
    });
    await expect(
      waitForSafeExecutionHash(11155420, PROPOSAL, {
        pollingIntervalMs: 1,
        client: flaky,
      }),
    ).resolves.toBe(PROPOSAL);
    expect(calls).toBe(16);

    // A node that answers null for every look: viem reads that as TransactionNotFoundError.
    const empty = vi.fn(async () => null);
    await expect(
      waitForSafeExecutionHash(11155420, PROPOSAL, {
        pollingIntervalMs: 1,
        client: createPublicClient({
          transport: custom({ request: empty }, { retryCount: 0 }),
        }),
      }),
    ).rejects.toThrow(/does not host a transaction service/i);
    expect(empty).toHaveBeenCalledTimes(12);
  });

  it("reads a not-found by its name, so another install of viem's error counts", async () => {
    // The app's viem and the SDK's can be different installs: their error classes never match under instanceof.
    const foreign = () =>
      Object.assign(new Error("Transaction could not be found."), {
        name: "TransactionNotFoundError",
      });
    expect(foreign() instanceof TransactionNotFoundError).toBe(false);
    const getTransaction = vi.fn(async () => {
      throw foreign();
    });
    await expect(
      waitForSafeExecutionHash(11155420, PROPOSAL, {
        pollingIntervalMs: 1,
        client: { getTransaction },
      }),
    ).rejects.toThrow(/does not host a transaction service/i);
    expect(getTransaction).toHaveBeenCalledTimes(12);
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
