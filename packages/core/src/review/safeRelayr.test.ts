import {
  encodeAbiParameters,
  encodeEventTopics,
  encodeFunctionData,
  zeroAddress,
  type Address,
  type Hex,
} from "viem";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { canonicalSafeTxHash, SAFE_EXEC_ABI } from "../safeService.js";
import {
  RELAYR_NATIVE_TOKEN,
  RELAYR_PAYMENT_ADDRESS,
  RELAYR_PAYMENT_SELECTOR,
  relayrPaymentDetails,
  sentRelayrPayment,
  type RelayrBundleRequest,
  type RelayrReleaseClient,
  type RelayrTransactionRecord,
} from "./relayr.js";
import {
  createSafeRelayrController,
  requireSafeRelayrExecution,
  SafeRelayrRecoveryError,
  safeRelayrPreconditions,
  safeRelayrReservationKey,
  sameSafeRelayrIntents,
  type SafeRelayrExecution,
  type SafeRelayrOptions,
  type SafeRelayrSession,
  type SafeRelayrStore,
} from "./safeRelayr.js";

const ACCOUNT = "0x1111111111111111111111111111111111111111" as Address;
const OTHER = "0x2222222222222222222222222222222222222222" as Address;
const SAFE = "0x3333333333333333333333333333333333333333" as Address;
const TARGET = "0x4444444444444444444444444444444444444444" as Address;
const BUNDLE = "01234567-89ab-cdef-0123-456789abcdef";
const IDS = [
  "11111111-1111-1111-1111-111111111111",
  "22222222-2222-2222-2222-222222222222",
  "33333333-3333-3333-3333-333333333333",
  "44444444-4444-4444-4444-444444444444",
];
const HASH = `0x${"ab".repeat(32)}` as Hex;
const BLOCK = `0x${"cd".repeat(32)}` as Hex;
const WRONG_BLOCK = `0x${"ef".repeat(32)}` as Hex;
const NOW = 1_750_000_000;
const DEADLINE = NOW + 600;

function execution(
  chain = 1,
  {
    nonce = 17,
    data = "0x1234" as Hex,
    signatures = "0x11" as Hex,
    gasPrice = 0n,
    gasToken = zeroAddress as Address,
    refundReceiver = zeroAddress as Address,
  } = {},
): SafeRelayrExecution {
  const tx = {
    to: TARGET,
    value: 0n,
    data,
    operation: 0 as const,
    safeTxGas: 0n,
    baseGas: 0n,
    gasPrice,
    gasToken,
    refundReceiver,
    nonce,
  };
  return {
    safe: SAFE,
    safeTxHash: canonicalSafeTxHash(chain, SAFE, tx),
    nonce,
    entry: {
      chain,
      target: SAFE,
      value: "0",
      data: encodeFunctionData({
        abi: SAFE_EXEC_ABI,
        functionName: "execTransaction",
        args: [
          tx.to,
          tx.value,
          tx.data,
          tx.operation,
          tx.safeTxGas,
          tx.baseGas,
          tx.gasPrice,
          tx.gasToken,
          tx.refundReceiver,
          signatures,
        ],
      }),
    },
  };
}

function payment() {
  return {
    chain: 1,
    amount: "100",
    target: RELAYR_PAYMENT_ADDRESS,
    token: RELAYR_NATIVE_TOKEN,
    calldata:
      `${RELAYR_PAYMENT_SELECTOR}${BUNDLE.replaceAll("-", "").padEnd(64, "0")}${BigInt(DEADLINE).toString(16).padStart(64, "0")}` as Hex,
    payment_deadline: DEADLINE,
  };
}

function json(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
  });
}

function deferred<T = void>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

let harnessCount = 0;
function harness() {
  const prefix = `fixture-${++harnessCount}`;
  const sessions = new Map<string, SafeRelayrSession>();
  const order: string[] = [];
  const chainRows = new Map<
    Hex,
    {
      transaction: Record<string, unknown>;
      receipt: Record<string, unknown>;
    }
  >();
  let account: Address | undefined = ACCOUNT;
  let records: RelayrTransactionRecord[] = [];
  let paymentReceived: boolean | undefined = false;
  let timestamp = BigInt(NOW);
  let canonicalHash = BLOCK;
  let onPost: (() => Promise<void>) | undefined;
  const fetchRelayr = vi.fn<typeof fetch>(async (_url, init) => {
    if (init?.method === "POST") {
      order.push("post");
      await onPost?.();
      const request = JSON.parse(String(init.body)) as RelayrBundleRequest;
      records = request.transactions.map((entry, index) => ({
        tx_uuid: IDS[index],
        request: entry,
        status: { state: "Pending" },
      }));
      return json({
        bundle_uuid: BUNDLE,
        payment_info: [payment()],
        tx_uuids: IDS.slice(0, records.length),
        transactions: records,
      });
    }
    order.push("get");
    return json({
      bundle_uuid: BUNDLE,
      payment_received: paymentReceived,
      transactions: records,
    });
  });
  const store: SafeRelayrStore = {
    list: vi.fn(async () => structuredClone([...sessions.values()])),
    save: vi.fn(async (session) => {
      order.push(`save:${session.state}:${session.paymentStatus}`);
      sessions.set(session.id, structuredClone(session));
    }),
    withLock: vi.fn(async (_account, run) => run()),
  };
  const client = {
    getTransaction: vi.fn(async ({ hash }: { hash: Hex }) => {
      const row = chainRows.get(hash);
      if (!row) throw new Error("Transaction is not yet available");
      return row.transaction;
    }),
    getTransactionReceipt: vi.fn(async ({ hash }: { hash: Hex }) => {
      const row = chainRows.get(hash);
      if (!row) throw new Error("Receipt is not yet available");
      return row.receipt;
    }),
    getBlock: vi.fn(async ({ blockTag }: { blockTag?: string }) => ({
      number: 123n,
      timestamp,
      hash: blockTag === "finalized" ? BLOCK : canonicalHash,
    })),
  };
  const revalidate = vi.fn<SafeRelayrOptions["revalidate"]>(
    async () => undefined,
  );
  const review = vi.fn<SafeRelayrOptions["review"]>(async () => undefined);
  const sendPayment = vi.fn<SafeRelayrOptions["sendPayment"]>(
    async ({ beforeSend, onSending, onSent }) => {
      await beforeSend();
      await onSending();
      const sent = sentRelayrPayment(
        relayrPaymentDetails(payment(), {
          bundleUuid: BUNDLE,
          destinationChainIds: [1],
          nowSeconds: NOW,
        }),
        HASH,
      );
      await onSent([sent]);
      return { hash: HASH, payments: [sent] };
    },
  );
  const afterVerified = vi.fn<NonNullable<SafeRelayrOptions["afterVerified"]>>(
    async () => undefined,
  );
  let id = 0;
  const controllerOptions: SafeRelayrOptions = {
    store,
    fetch: fetchRelayr,
    clientFor: () => client as unknown as RelayrReleaseClient,
    currentAccount: () => account,
    revalidate,
    review,
    sendPayment,
    afterVerified,
    createId: () => `${prefix}-session-${++id}`,
  };
  const controller = createSafeRelayrController(controllerOptions);
  function mined({
    hash = HASH,
    chain = 1,
    target = RELAYR_PAYMENT_ADDRESS,
    data = payment().calldata,
    value = 100n,
    status = "success",
    logs = [] as unknown[],
  } = {}) {
    chainRows.set(hash, {
      transaction: {
        hash,
        chainId: chain,
        from: ACCOUNT,
        to: target,
        input: data,
        value,
        blockHash: BLOCK,
        blockNumber: 123n,
      },
      receipt: {
        transactionHash: hash,
        from: ACCOUNT,
        to: target,
        status,
        blockHash: BLOCK,
        blockNumber: 123n,
        logs,
      },
    });
  }
  return {
    controller,
    firstSessionId: `${prefix}-session-1`,
    recreateController: () => createSafeRelayrController(controllerOptions),
    sessions,
    store,
    order,
    fetchRelayr,
    client,
    revalidate,
    review,
    sendPayment,
    afterVerified,
    mined,
    setAccount: (value: Address | undefined) => {
      account = value;
    },
    setPaymentReceived: (value: boolean | undefined) => {
      paymentReceived = value;
    },
    setTimestamp: (value: bigint) => {
      timestamp = value;
    },
    setCanonicalHash: (value: Hex) => {
      canonicalHash = value;
    },
    setRecords: (value: RelayrTransactionRecord[]) => {
      records = value;
    },
    onPost: (value: () => Promise<void>) => {
      onPost = value;
    },
  };
}

beforeEach(() => {
  vi.spyOn(Date, "now").mockReturnValue(NOW * 1000);
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Safe Relayr execution identity", () => {
  it("authenticates signed fields while accepting changed confirmation bytes", () => {
    const old = execution();
    const confirmed = execution(1, { signatures: "0x112233" });
    expect(old.entry.data).not.toBe(confirmed.entry.data);
    expect(requireSafeRelayrExecution(confirmed).nonce).toBe(17n);
    expect(sameSafeRelayrIntents([old], [confirmed])).toBe(true);
    expect(safeRelayrReservationKey(old)).toBe(`1:${SAFE}:17`);
    expect(safeRelayrPreconditions(old)).toHaveLength(2);
    expect(safeRelayrPreconditions(old)[1].expected).toBe(old.safeTxHash);
    expect(() =>
      requireSafeRelayrExecution({ ...old, safeTxHash: HASH }),
    ).toThrow("reviewed transaction hash");
    expect(() =>
      requireSafeRelayrExecution({
        ...old,
        entry: { ...old.entry, target: OTHER },
      }),
    ).toThrow("does not match");
    expect(() =>
      requireSafeRelayrExecution({
        ...old,
        entry: { ...old.entry, value: "1" },
      }),
    ).toThrow("does not match");
  });

  it("matches complete unordered intent sets, never subsets or duplicate intents", () => {
    const one = execution();
    const two = execution(10);
    expect(sameSafeRelayrIntents([one, two], [two, one])).toBe(true);
    expect(sameSafeRelayrIntents([one, two], [one])).toBe(false);
    expect(sameSafeRelayrIntents([one], [one, two])).toBe(false);
    expect(sameSafeRelayrIntents([one, one], [one, one])).toBe(false);
    expect(sameSafeRelayrIntents([], [])).toBe(false);
  });

  it("refuses noncanonical calldata even when the decoded intent matches", () => {
    const call = execution();
    expect(() =>
      requireSafeRelayrExecution({
        ...call,
        entry: { ...call.entry, data: `${call.entry.data}00` },
      }),
    ).toThrow("not canonical");
  });

  it.each([{ gasPrice: 1n }, { gasToken: TARGET }, { refundReceiver: TARGET }])(
    "refuses a Safe execution that can reimburse its executor: %o",
    (refund) => {
      expect(() => requireSafeRelayrExecution(execution(1, refund))).toThrow(
        "must not reimburse",
      );
    },
  );
});

describe("Safe Relayr preparation and recovery", () => {
  it("persists publication before POST and never pays on preparation or checks", async () => {
    const h = harness();
    const ready = await h.controller.prepare({
      account: ACCOUNT,
      executions: [execution()],
    });
    expect(h.order).toEqual([
      "save:publishing:unfunded",
      "post",
      "save:active:unfunded",
    ]);
    expect(ready.state).toBe("ready");
    expect(ready.resumed).toBe(false);
    expect(h.review).toHaveBeenCalledWith([execution()], { resumed: false });
    expect(
      (
        await h.controller.check({
          account: ACCOUNT,
          sessionId: ready.session.id,
        })
      ).state,
    ).toBe("ready");
    expect(h.sendPayment).not.toHaveBeenCalled();
    expect(
      h.fetchRelayr.mock.calls.filter(([, init]) => init?.method === "POST"),
    ).toHaveLength(1);
  });

  it("retains a reservation when publication loses its response", async () => {
    const h = harness();
    h.onPost(async () => {
      throw new Error("response lost");
    });
    await expect(
      h.controller.prepare({ account: ACCOUNT, executions: [execution()] }),
    ).rejects.toThrow("response lost");
    expect(h.sessions.get(h.firstSessionId)?.state).toBe("publishing");
    await expect(
      h.controller.prepare({ account: ACCOUNT, executions: [execution()] }),
    ).rejects.toBeInstanceOf(SafeRelayrRecoveryError);
    expect(h.fetchRelayr).toHaveBeenCalledTimes(1);
    expect(h.sendPayment).not.toHaveBeenCalled();
  });

  it("retains an authenticated published quote with no payment options for recovery", async () => {
    const h = harness();
    h.fetchRelayr.mockImplementationOnce(async (_url, init) => {
      const request = JSON.parse(String(init?.body)) as RelayrBundleRequest;
      return json({
        bundle_uuid: BUNDLE,
        payment_info: [],
        tx_uuids: [IDS[0]],
        transactions: [
          {
            tx_uuid: IDS[0],
            request: request.transactions[0],
            status: { state: "Pending" },
          },
        ],
      });
    });
    await expect(
      h.controller.prepare({ account: ACCOUNT, executions: [execution()] }),
    ).rejects.toThrow("no payable option");
    const saved = h.sessions.get(h.firstSessionId)!;
    expect(saved.state).toBe("active");
    expect(saved.bundleUuid).toBe(BUNDLE);
    h.setRecords(saved.quote!.transactions);
    expect(
      (await h.controller.check({ account: ACCOUNT, sessionId: saved.id }))
        .state,
    ).toBe("pending");
    expect(h.sendPayment).not.toHaveBeenCalled();
  });

  it("reports a saved recovery session when Relayr omits its transaction inventory", async () => {
    const h = harness();
    const ready = await h.controller.prepare({
      account: ACCOUNT,
      executions: [execution()],
    });
    h.fetchRelayr.mockImplementationOnce(async () =>
      json({ bundle_uuid: BUNDLE, payment_received: false }),
    );
    await expect(
      h.controller.prepare({ account: ACCOUNT, executions: [execution()] }),
    ).rejects.toMatchObject({
      name: "SafeRelayrRecoveryError",
      session: { id: ready.session.id },
    });
    expect(h.sendPayment).not.toHaveBeenCalled();
  });

  it("never publishes when durable persistence fails", async () => {
    const h = harness();
    vi.mocked(h.store.save).mockRejectedValueOnce(
      new Error("storage unavailable"),
    );
    await expect(
      h.controller.prepare({ account: ACCOUNT, executions: [execution()] }),
    ).rejects.toThrow("storage unavailable");
    expect(h.fetchRelayr).not.toHaveBeenCalled();
  });

  it.each([{ executions: [] }, { executions: [execution(), execution()] }])(
    "rejects an empty or duplicate-nonce selection before review",
    async ({ executions }) => {
      const h = harness();
      await expect(
        h.controller.prepare({ account: ACCOUNT, executions }),
      ).rejects.toThrow();
      expect(h.review).not.toHaveBeenCalled();
      expect(h.fetchRelayr).not.toHaveBeenCalled();
    },
  );

  it("resumes the original frozen calldata across all chains after confirmations change", async () => {
    const h = harness();
    const original = [1, 10, 8453, 42161].map((chain) => execution(chain));
    const first = await h.controller.prepare({
      account: ACCOUNT,
      executions: original,
    });
    h.revalidate.mockClear();
    h.review.mockClear();
    const second = await h.controller.prepare({
      account: ACCOUNT,
      executions: [...original]
        .reverse()
        .map(({ entry }) =>
          execution(entry.chain, { signatures: "0x111122223333" }),
        ),
    });
    expect(second.resumed).toBe(true);
    expect(second.session.id).toBe(first.session.id);
    expect(second.session.executions).toEqual(original);
    expect(h.revalidate.mock.calls.map(([call]) => call)).toEqual(original);
    expect(h.review).toHaveBeenCalledWith(original, { resumed: true });
    expect(
      h.fetchRelayr.mock.calls.filter(([, init]) => init?.method === "POST"),
    ).toHaveLength(1);
    expect(h.sendPayment).not.toHaveBeenCalled();
  });

  it.each(["subset", "superset", "changed intent"])(
    "blocks an overlapping %s instead of publishing twice",
    async (kind) => {
      const h = harness();
      const original =
        kind === "subset" ? [execution(), execution(10)] : [execution()];
      await h.controller.prepare({ account: ACCOUNT, executions: original });
      const next =
        kind === "superset"
          ? [execution(), execution(10)]
          : [
              execution(
                1,
                kind === "changed intent"
                  ? { data: "0xffff" }
                  : { signatures: "0x1122" },
              ),
            ];
      await expect(
        h.controller.prepare({ account: ACCOUNT, executions: next }),
      ).rejects.toBeInstanceOf(SafeRelayrRecoveryError);
      expect(
        h.fetchRelayr.mock.calls.filter(([, init]) => init?.method === "POST"),
      ).toHaveLength(1);
    },
  );

  it("preserves legacy nonce reservations even without reconstructable calldata", async () => {
    const h = harness();
    h.sessions.set("legacy", {
      id: "legacy",
      account: ACCOUNT,
      executions: [],
      reservationKeys: [safeRelayrReservationKey(execution())],
      paymentStatus: "sending",
      payments: [],
      state: "active",
      createdAt: NOW,
    });
    await expect(
      h.controller.prepare({ account: ACCOUNT, executions: [execution()] }),
    ).rejects.toBeInstanceOf(SafeRelayrRecoveryError);
    expect(h.fetchRelayr).not.toHaveBeenCalled();
  });

  it("holds another account's legacy reservation for an unknown Safe nonce", async () => {
    const h = harness();
    h.sessions.set("legacy", {
      id: "legacy",
      account: OTHER,
      executions: [],
      reservationKeys: [`1:${SAFE}:*`],
      paymentStatus: "sending",
      payments: [],
      state: "active",
      createdAt: NOW,
    });
    await expect(
      h.controller.prepare({
        account: ACCOUNT,
        executions: [execution(1, { nonce: 19 })],
      }),
    ).rejects.toBeInstanceOf(SafeRelayrRecoveryError);
    expect(h.fetchRelayr).not.toHaveBeenCalled();
  });

  it("refuses a changed saved binding without making a new quote", async () => {
    const h = harness();
    const ready = await h.controller.prepare({
      account: ACCOUNT,
      executions: [execution()],
    });
    const saved = h.sessions.get(ready.session.id)!;
    saved.quote!.expectedTransactions[0].entry.data = execution(1, {
      signatures: "0x9988",
    }).entry.data;
    await expect(
      h.controller.prepare({ account: ACCOUNT, executions: [execution()] }),
    ).rejects.toBeInstanceOf(SafeRelayrRecoveryError);
    expect(
      h.fetchRelayr.mock.calls.filter(([, init]) => init?.method === "POST"),
    ).toHaveLength(1);
    expect(h.sendPayment).not.toHaveBeenCalled();
  });

  it.each(["unknown uuid", "wrong chain", "changed request", "missing record"])(
    "does not release or pay a bundle with %s",
    async (kind) => {
      const h = harness();
      const call = execution();
      const ready = await h.controller.prepare({
        account: ACCOUNT,
        executions: [call],
      });
      h.setRecords(
        kind === "missing record"
          ? []
          : [
              {
                tx_uuid: kind === "unknown uuid" ? IDS[1] : IDS[0],
                request: {
                  ...call.entry,
                  chain: kind === "wrong chain" ? 10 : 1,
                  data: kind === "changed request" ? "0xff" : call.entry.data,
                },
                status: { state: "Pending" },
              },
            ],
      );
      h.setTimestamp(BigInt(DEADLINE + 1));
      vi.mocked(Date.now).mockReturnValue((DEADLINE + 60) * 1000);
      await expect(
        h.controller.check({ account: ACCOUNT, sessionId: ready.session.id }),
      ).rejects.toThrow();
      expect(h.sessions.get(ready.session.id)?.state).toBe("active");
      expect(h.sendPayment).not.toHaveBeenCalled();
    },
  );

  it("starts every chain check before any earlier response returns", async () => {
    const h = harness();
    const gates = [deferred(), deferred(), deferred(), deferred()];
    const started = deferred();
    let calls = 0;
    h.revalidate.mockImplementation(async () => {
      const index = calls++;
      if (calls === gates.length) started.resolve();
      await gates[index].promise;
    });
    const onStatus = vi.fn();
    const pending = h.controller.prepare({
      account: ACCOUNT,
      executions: [1, 10, 8453, 42161].map((chain) => execution(chain)),
      onStatus,
    });
    await started.promise;
    expect(h.revalidate).toHaveBeenCalledTimes(4);
    expect(onStatus.mock.calls.map(([index, state]) => [index, state])).toEqual(
      [
        [0, "checking"],
        [1, "checking"],
        [2, "checking"],
        [3, "checking"],
      ],
    );
    expect(h.fetchRelayr).not.toHaveBeenCalled();
    gates.forEach((gate) => gate.resolve());
    await pending;
    expect(
      onStatus.mock.calls.filter(([, state]) => state === "ready"),
    ).toHaveLength(4);
  });

  it("drains all concurrent checks before returning a failure", async () => {
    const h = harness();
    const entered = deferred();
    const gate = deferred();
    const onStatus = vi.fn();
    h.revalidate.mockImplementation(async (call) => {
      if (call.entry.chain === 1) throw new Error("Safe policy changed");
      entered.resolve();
      await gate.promise;
    });
    let ended = false;
    const pending = h.controller.prepare({
      account: ACCOUNT,
      executions: [execution(), execution(10)],
      onStatus,
    });
    void pending.then(
      () => {
        ended = true;
      },
      () => {
        ended = true;
      },
    );
    const rejection = expect(pending).rejects.toThrow("Safe policy changed");
    await entered.promise;
    await Promise.resolve();
    expect(ended).toBe(false);
    gate.resolve();
    await rejection;
    expect(h.review).not.toHaveBeenCalled();
    expect(h.fetchRelayr).not.toHaveBeenCalled();
    expect(onStatus).toHaveBeenCalledWith(0, "failed", expect.any(Object));
    expect(onStatus).toHaveBeenCalledWith(1, "ready", expect.any(Object));
  });

  it.each(["calldata", "hash", "nonce", "context"])(
    "permits recheck context refresh but rejects frozen %s changes",
    async (field) => {
      const h = harness();
      const onStatus = vi.fn();
      h.revalidate.mockImplementation(async (call) => {
        if (field === "calldata")
          call.entry.data = execution(1, { signatures: "0x9988" }).entry.data;
        if (field === "hash") call.safeTxHash = HASH;
        if (field === "nonce") call.nonce = 18;
        if (field === "context") call.context = { livePolicy: "checked" };
      });
      const prepared = h.controller.prepare({
        account: ACCOUNT,
        executions: [execution()],
        onStatus,
      });
      if (field === "context") {
        expect((await prepared).session.executions[0].context).toEqual({
          livePolicy: "checked",
        });
      } else {
        await expect(prepared).rejects.toThrow("changed its frozen execution");
        expect(onStatus).toHaveBeenCalledWith(0, "failed", expect.any(Object));
        expect(h.fetchRelayr).not.toHaveBeenCalled();
        expect(h.review).not.toHaveBeenCalled();
      }
    },
  );

  it.each(["account", "cancel"])(
    "fences a late preparation after %s changes",
    async (change) => {
      const h = harness();
      const abort = new AbortController();
      const entered = deferred();
      const gate = deferred();
      h.review.mockImplementation(async () => {
        entered.resolve();
        await gate.promise;
      });
      const pending = h.controller.prepare({
        account: ACCOUNT,
        executions: [execution()],
        signal: abort.signal,
      });
      const rejection = expect(pending).rejects.toThrow();
      await entered.promise;
      if (change === "account") h.setAccount(OTHER);
      else abort.abort();
      gate.resolve();
      await rejection;
      expect(h.fetchRelayr).not.toHaveBeenCalled();
      expect(h.sessions.size).toBe(0);
    },
  );

  it("keeps a published quote durable when cancellation races the response", async () => {
    const h = harness();
    const abort = new AbortController();
    h.onPost(async () => {
      abort.abort();
    });
    await expect(
      h.controller.prepare({
        account: ACCOUNT,
        executions: [execution()],
        signal: abort.signal,
      }),
    ).rejects.toThrow();
    expect(h.sessions.get(h.firstSessionId)?.bundleUuid).toBe(BUNDLE);
    expect(h.sessions.get(h.firstSessionId)?.state).toBe("active");
    expect(h.sendPayment).not.toHaveBeenCalled();
  });

  it("releases an interrupted local reservation when cancellation precedes POST", async () => {
    const h = harness();
    const abort = new AbortController();
    const save = h.store.save;
    vi.mocked(h.store.save).mockImplementationOnce(async (session) => {
      h.sessions.set(session.id, structuredClone(session));
      abort.abort();
    });
    await expect(
      h.controller.prepare({
        account: ACCOUNT,
        executions: [execution()],
        signal: abort.signal,
      }),
    ).rejects.toThrow();
    expect(save).toHaveBeenCalledTimes(2);
    expect(h.sessions.get(h.firstSessionId)?.state).toBe("released");
    expect(h.fetchRelayr).not.toHaveBeenCalled();
  });

  it.each([true, undefined])(
    "does not reuse or fund a bundle whose payment status is %s",
    async (received) => {
      const h = harness();
      const ready = await h.controller.prepare({
        account: ACCOUNT,
        executions: [execution()],
      });
      h.setPaymentReceived(received);
      expect(
        (
          await h.controller.check({
            account: ACCOUNT,
            sessionId: ready.session.id,
          })
        ).state,
      ).toBe("pending");
      await expect(
        h.controller.fund({
          account: ACCOUNT,
          sessionId: ready.session.id,
          paymentChainId: 1,
        }),
      ).rejects.toBeInstanceOf(SafeRelayrRecoveryError);
      expect(h.sendPayment).not.toHaveBeenCalled();
    },
  );

  it("retains an expired bundle when Relayr reports it was paid", async () => {
    const h = harness();
    const ready = await h.controller.prepare({
      account: ACCOUNT,
      executions: [execution()],
    });
    vi.mocked(Date.now).mockReturnValue((DEADLINE + 60) * 1000);
    h.setTimestamp(BigInt(DEADLINE + 1));
    h.setPaymentReceived(true);
    expect(
      (
        await h.controller.check({
          account: ACCOUNT,
          sessionId: ready.session.id,
        })
      ).state,
    ).toBe("pending");
    expect(h.sessions.get(ready.session.id)?.state).toBe("active");
  });

  it("requires finalized canonical expiry and unpaid pending calls to release", async () => {
    const h = harness();
    const ready = await h.controller.prepare({
      account: ACCOUNT,
      executions: [execution()],
    });
    vi.mocked(Date.now).mockReturnValue((DEADLINE + 60) * 1000);
    expect(
      (
        await h.controller.check({
          account: ACCOUNT,
          sessionId: ready.session.id,
        })
      ).state,
    ).toBe("pending");
    h.setTimestamp(BigInt(DEADLINE + 1));
    h.setCanonicalHash(WRONG_BLOCK);
    expect(
      (
        await h.controller.check({
          account: ACCOUNT,
          sessionId: ready.session.id,
        })
      ).state,
    ).toBe("pending");
    h.setCanonicalHash(BLOCK);
    const released = await h.controller.check({
      account: ACCOUNT,
      sessionId: ready.session.id,
    });
    expect(released.state).toBe("released");
    expect(released.session.paymentStatus).toBe("expired");
    expect(h.sendPayment).not.toHaveBeenCalled();
  });
});

describe("Safe Relayr funding and canonical outcome", () => {
  it("refuses a legacy payment record naming a different bundle", async () => {
    const h = harness();
    const ready = await h.controller.prepare({
      account: ACCOUNT,
      executions: [execution()],
    });
    const saved = h.sessions.get(ready.session.id)!;
    saved.payments = [
      {
        ...sentRelayrPayment(
          relayrPaymentDetails(payment(), {
            bundleUuid: BUNDLE,
            destinationChainIds: [1],
            nowSeconds: NOW,
          }),
          HASH,
        ),
        bundleUuid: IDS[0],
      },
    ];
    await expect(
      h.controller.check({ account: ACCOUNT, sessionId: ready.session.id }),
    ).rejects.toThrow("belongs to another bundle");
    expect(h.sendPayment).not.toHaveBeenCalled();
  });

  it("requires the guarded payment adapter to finish checks before sending", async () => {
    const h = harness();
    const ready = await h.controller.prepare({
      account: ACCOUNT,
      executions: [execution()],
    });
    h.sendPayment.mockImplementationOnce(async ({ onSending }) => {
      await onSending();
      throw new Error("wallet must not be invoked");
    });
    await expect(
      h.controller.fund({
        account: ACCOUNT,
        sessionId: ready.session.id,
        paymentChainId: 1,
      }),
    ).rejects.toThrow("Recheck the Safe execution");
    expect(h.sessions.get(ready.session.id)?.paymentStatus).toBe("unfunded");
  });

  it("rejects a reported funding payment that differs from the selected option", async () => {
    const h = harness();
    const ready = await h.controller.prepare({
      account: ACCOUNT,
      executions: [execution()],
    });
    h.sendPayment.mockImplementationOnce(
      async ({ beforeSend, onSending, onSent }) => {
        await beforeSend();
        await onSending();
        await onSent([
          {
            ...sentRelayrPayment(
              relayrPaymentDetails(payment(), {
                bundleUuid: BUNDLE,
                destinationChainIds: [1],
                nowSeconds: NOW,
              }),
              HASH,
            ),
            amount: "101",
          },
        ]);
        throw new Error("must not accept mismatched funding");
      },
    );
    await expect(
      h.controller.fund({
        account: ACCOUNT,
        sessionId: ready.session.id,
        paymentChainId: 1,
      }),
    ).rejects.toThrow("differs from the selected");
    expect(h.sessions.get(ready.session.id)?.paymentStatus).toBe("sending");
  });

  it.each(["unknown", "another account"])(
    "refuses loading an %s session",
    async (kind) => {
      const h = harness();
      const ready = await h.controller.prepare({
        account: ACCOUNT,
        executions: [execution()],
      });
      if (kind === "another account")
        h.sessions.get(ready.session.id)!.account = OTHER;
      await expect(
        h.controller.fund({
          account: ACCOUNT,
          sessionId: kind === "unknown" ? "missing" : ready.session.id,
          paymentChainId: 1,
        }),
      ).rejects.toThrow("another account or is unavailable");
      expect(h.sendPayment).not.toHaveBeenCalled();
    },
  );

  it("refuses a funding chain absent from the saved quote", async () => {
    const h = harness();
    const ready = await h.controller.prepare({
      account: ACCOUNT,
      executions: [execution()],
    });
    await expect(
      h.controller.fund({
        account: ACCOUNT,
        sessionId: ready.session.id,
        paymentChainId: 10,
      }),
    ).rejects.toThrow("Choose a current payment option");
    expect(h.sendPayment).not.toHaveBeenCalled();
  });

  it("requires review when funding a restored session with no page review capability", async () => {
    const h = harness();
    const ready = await h.controller.prepare({
      account: ACCOUNT,
      executions: [execution()],
    });
    const restored = {
      ...h.sessions.get(ready.session.id)!,
      id: `${ready.session.id}-restored`,
    };
    h.sessions.clear();
    h.sessions.set(restored.id, restored);
    h.review.mockClear();
    const result = await h.controller.fund({
      account: ACCOUNT,
      sessionId: restored.id,
      paymentChainId: 1,
    });
    expect(result.state).toBe("pending");
    expect(h.review).toHaveBeenCalledExactlyOnceWith(restored.executions, {
      resumed: true,
    });
    expect(h.review.mock.invocationCallOrder[0]).toBeLessThan(
      h.sendPayment.mock.invocationCallOrder[0],
    );
  });

  it("shares a prepared review capability across controller instances on the same page", async () => {
    const h = harness();
    const ready = await h.controller.prepare({
      account: ACCOUNT,
      executions: [execution()],
    });
    h.review.mockClear();
    await h.recreateController().fund({
      account: ACCOUNT,
      sessionId: ready.session.id,
      paymentChainId: 1,
    });
    expect(h.review).not.toHaveBeenCalled();
    expect(h.sendPayment).toHaveBeenCalledTimes(1);
  });

  it.each(["account", "calldata"])(
    "requires a new review when a persisted %s changes",
    async (field) => {
      const h = harness();
      const ready = await h.controller.prepare({
        account: ACCOUNT,
        executions: [execution()],
      });
      const saved = h.sessions.get(ready.session.id)!;
      if (field === "account") {
        saved.account = OTHER;
        h.setAccount(OTHER);
      } else {
        saved.executions[0] = execution(1, { signatures: "0x9988" });
        saved.quote!.expectedTransactions[0].entry = {
          ...saved.executions[0].entry,
          virtual_nonce: 0,
        };
        h.setRecords([
          {
            tx_uuid: IDS[0],
            request: saved.quote!.expectedTransactions[0].entry,
            status: { state: "Pending" },
          },
        ]);
      }
      h.review.mockClear();
      await h.controller.fund({
        account: field === "account" ? OTHER : ACCOUNT,
        sessionId: saved.id,
        paymentChainId: 1,
      });
      expect(h.review).toHaveBeenCalledExactlyOnceWith(saved.executions, {
        resumed: true,
      });
    },
  );

  it("does not invoke the payment adapter after restored-call review is rejected", async () => {
    const h = harness();
    const ready = await h.controller.prepare({
      account: ACCOUNT,
      executions: [execution()],
    });
    const restored = {
      ...h.sessions.get(ready.session.id)!,
      id: `${ready.session.id}-restored`,
    };
    h.sessions.clear();
    h.sessions.set(restored.id, restored);
    h.review.mockRejectedValueOnce(new Error("Review cancelled"));
    await expect(
      h.controller.fund({
        account: ACCOUNT,
        sessionId: restored.id,
        paymentChainId: 1,
      }),
    ).rejects.toThrow("Review cancelled");
    expect(h.sendPayment).not.toHaveBeenCalled();
    expect(h.sessions.get(restored.id)?.paymentStatus).toBe("unfunded");
  });

  it("funds only after rechecking the original calldata and persists the payment", async () => {
    const h = harness();
    const ready = await h.controller.prepare({
      account: ACCOUNT,
      executions: [execution()],
    });
    h.revalidate.mockClear();
    const onStatus = vi.fn();
    const result = await h.controller.fund({
      account: ACCOUNT,
      sessionId: ready.session.id,
      paymentChainId: 1,
      onStatus,
    });
    expect(result.state).toBe("pending");
    expect(h.revalidate).toHaveBeenCalledWith(execution(), ACCOUNT);
    expect(onStatus.mock.calls.map(([index, state]) => [index, state])).toEqual(
      [
        [0, "rechecking"],
        [0, "ready"],
      ],
    );
    expect(result.session.payments[0].hash).toBe(HASH);
    expect(result.session.paymentStatus).toBe("submitted");
    expect(h.order).toContain("save:active:sending");
    expect(h.order).toContain("save:active:submitted");
  });

  it("stops before wallet submission when the quote expires during rechecks", async () => {
    const h = harness();
    const ready = await h.controller.prepare({
      account: ACCOUNT,
      executions: [execution()],
    });
    h.revalidate.mockImplementation(async () => {
      vi.mocked(Date.now).mockReturnValue((DEADLINE + 1) * 1000);
    });
    await expect(
      h.controller.fund({
        account: ACCOUNT,
        sessionId: ready.session.id,
        paymentChainId: 1,
      }),
    ).rejects.toThrow("expired");
    expect(h.sessions.get(ready.session.id)?.paymentStatus).toBe("unfunded");
    expect(h.order).not.toContain("save:active:sending");
    expect(h.sessions.get(ready.session.id)?.state).toBe("active");
  });

  it("rolls back a known unsent attempt if its quote expires during durable persistence", async () => {
    const h = harness();
    const ready = await h.controller.prepare({
      account: ACCOUNT,
      executions: [execution()],
    });
    vi.mocked(h.store.save).mockImplementation(async (session) => {
      h.sessions.set(session.id, structuredClone(session));
      if (session.paymentStatus === "sending")
        vi.mocked(Date.now).mockReturnValue((DEADLINE + 1) * 1000);
    });
    await expect(
      h.controller.fund({
        account: ACCOUNT,
        sessionId: ready.session.id,
        paymentChainId: 1,
      }),
    ).rejects.toThrow("expired");
    expect(h.sessions.get(ready.session.id)?.paymentStatus).toBe("unfunded");
    expect(h.sessions.get(ready.session.id)?.payments).toHaveLength(0);
    expect(h.sessions.get(ready.session.id)?.state).toBe("active");
  });

  it("keeps a no-hash wallet error pending even when the quote later expires", async () => {
    const h = harness();
    const ready = await h.controller.prepare({
      account: ACCOUNT,
      executions: [execution()],
    });
    h.sendPayment.mockImplementation(async ({ beforeSend, onSending }) => {
      await beforeSend();
      await onSending();
      throw new Error("wallet connection lost after broadcast");
    });
    await expect(
      h.controller.fund({
        account: ACCOUNT,
        sessionId: ready.session.id,
        paymentChainId: 1,
      }),
    ).rejects.toThrow("connection lost");
    h.setTimestamp(BigInt(DEADLINE + 1));
    vi.mocked(Date.now).mockReturnValue((DEADLINE + 60) * 1000);
    const checked = await h.controller.check({
      account: ACCOUNT,
      sessionId: ready.session.id,
    });
    expect(checked.state).toBe("pending");
    expect(checked.session.paymentStatus).toBe("sending");
    await expect(
      h.controller.fund({
        account: ACCOUNT,
        sessionId: ready.session.id,
        paymentChainId: 1,
      }),
    ).rejects.toBeInstanceOf(SafeRelayrRecoveryError);
    expect(h.sendPayment).toHaveBeenCalledTimes(1);
  });

  it("clears sending only for a definite wallet rejection without a known hash", async () => {
    const h = harness();
    const ready = await h.controller.prepare({
      account: ACCOUNT,
      executions: [execution()],
    });
    h.sendPayment.mockImplementationOnce(async ({ beforeSend, onSending }) => {
      await beforeSend();
      await onSending();
      throw Object.assign(new Error("User rejected request"), { code: 4001 });
    });
    await expect(
      h.controller.fund({
        account: ACCOUNT,
        sessionId: ready.session.id,
        paymentChainId: 1,
      }),
    ).rejects.toThrow("User rejected");
    expect(h.sessions.get(ready.session.id)?.paymentStatus).toBe("unfunded");
    expect(
      (
        await h.controller.check({
          account: ACCOUNT,
          sessionId: ready.session.id,
        })
      ).state,
    ).toBe("ready");
    await h.controller.fund({
      account: ACCOUNT,
      sessionId: ready.session.id,
      paymentChainId: 1,
    });
    expect(h.sendPayment).toHaveBeenCalledTimes(2);
  });

  it("does not clear a known payment hash after a rejection-shaped wallet error", async () => {
    const h = harness();
    const ready = await h.controller.prepare({
      account: ACCOUNT,
      executions: [execution()],
    });
    h.sendPayment.mockImplementationOnce(
      async ({ beforeSend, onSending, onSent }) => {
        await beforeSend();
        await onSending();
        await onSent([
          sentRelayrPayment(
            relayrPaymentDetails(payment(), {
              bundleUuid: BUNDLE,
              destinationChainIds: [1],
              nowSeconds: NOW,
            }),
            HASH,
          ),
        ]);
        throw Object.assign(new Error("Late provider rejection"), {
          code: 4001,
        });
      },
    );
    await expect(
      h.controller.fund({
        account: ACCOUNT,
        sessionId: ready.session.id,
        paymentChainId: 1,
      }),
    ).rejects.toThrow("Late provider");
    expect(h.sessions.get(ready.session.id)?.paymentStatus).toBe("submitted");
    expect(h.sessions.get(ready.session.id)?.payments).toHaveLength(1);
  });

  it("permits retry only after the prior payment canonically reverted and Relayr is unpaid", async () => {
    const h = harness();
    const ready = await h.controller.prepare({
      account: ACCOUNT,
      executions: [execution()],
    });
    await h.controller.fund({
      account: ACCOUNT,
      sessionId: ready.session.id,
      paymentChainId: 1,
    });
    h.mined({ status: "reverted" });
    h.setCanonicalHash(WRONG_BLOCK);
    expect(
      (
        await h.controller.check({
          account: ACCOUNT,
          sessionId: ready.session.id,
        })
      ).state,
    ).toBe("pending");
    h.setCanonicalHash(BLOCK);
    expect(
      (
        await h.controller.check({
          account: ACCOUNT,
          sessionId: ready.session.id,
        })
      ).state,
    ).toBe("ready");
    h.setPaymentReceived(true);
    expect(
      (
        await h.controller.check({
          account: ACCOUNT,
          sessionId: ready.session.id,
        })
      ).state,
    ).toBe("pending");
    await expect(
      h.controller.fund({
        account: ACCOUNT,
        sessionId: ready.session.id,
        paymentChainId: 1,
      }),
    ).rejects.toBeInstanceOf(SafeRelayrRecoveryError);
    expect(h.sendPayment).toHaveBeenCalledTimes(1);
  });

  it.each(["success", "unavailable", "reverted"])(
    "requires every known payment to revert; second payment is %s",
    async (status) => {
      const h = harness();
      const ready = await h.controller.prepare({
        account: ACCOUNT,
        executions: [execution()],
      });
      await h.controller.fund({
        account: ACCOUNT,
        sessionId: ready.session.id,
        paymentChainId: 1,
      });
      const saved = h.sessions.get(ready.session.id)!;
      saved.payments.push({ ...saved.payments[0], hash: WRONG_BLOCK });
      h.mined({ status: "reverted" });
      if (status !== "unavailable") h.mined({ hash: WRONG_BLOCK, status });
      const checked = await h.controller.check({
        account: ACCOUNT,
        sessionId: ready.session.id,
      });
      expect(checked.state).toBe(status === "reverted" ? "ready" : "pending");
      expect(checked.session.payments).toHaveLength(2);
      expect(h.sendPayment).toHaveBeenCalledTimes(1);
    },
  );

  it("releases an expired quote after proving its payments reverted and its deadline finalized", async () => {
    const h = harness();
    const ready = await h.controller.prepare({
      account: ACCOUNT,
      executions: [execution()],
    });
    await h.controller.fund({
      account: ACCOUNT,
      sessionId: ready.session.id,
      paymentChainId: 1,
    });
    h.mined({ status: "reverted" });
    vi.mocked(Date.now).mockReturnValue((DEADLINE + 60) * 1000);
    await expect(
      h.controller.check({ account: ACCOUNT, sessionId: ready.session.id }),
    ).rejects.toThrow("deadline final onchain");
    expect(h.sessions.get(ready.session.id)?.state).toBe("active");
    h.setTimestamp(BigInt(DEADLINE + 1));
    const checked = await h.controller.check({
      account: ACCOUNT,
      sessionId: ready.session.id,
    });
    expect(checked.state).toBe("released");
    expect(checked.session.payments).toHaveLength(1);
    expect(h.sendPayment).toHaveBeenCalledTimes(1);
  });

  it("keeps a retry without a returned hash pending despite a proven previous revert", async () => {
    const h = harness();
    const ready = await h.controller.prepare({
      account: ACCOUNT,
      executions: [execution()],
    });
    await h.controller.fund({
      account: ACCOUNT,
      sessionId: ready.session.id,
      paymentChainId: 1,
    });
    h.mined({ status: "reverted" });
    expect(
      (
        await h.controller.check({
          account: ACCOUNT,
          sessionId: ready.session.id,
        })
      ).state,
    ).toBe("ready");
    h.sendPayment.mockImplementationOnce(async ({ beforeSend, onSending }) => {
      await beforeSend();
      await onSending();
      throw new Error("retry broadcast response lost");
    });
    await expect(
      h.controller.fund({
        account: ACCOUNT,
        sessionId: ready.session.id,
        paymentChainId: 1,
      }),
    ).rejects.toThrow("response lost");
    const checked = await h.controller.check({
      account: ACCOUNT,
      sessionId: ready.session.id,
    });
    expect(checked.state).toBe("pending");
    expect(checked.session.paymentStatus).toBe("sending");
    expect(checked.session.payments).toHaveLength(1);
    await expect(
      h.controller.prepare({
        account: ACCOUNT,
        executions: [execution(1, { signatures: "0x112233" })],
      }),
    ).rejects.toBeInstanceOf(SafeRelayrRecoveryError);
    await expect(
      h.controller.fund({
        account: ACCOUNT,
        sessionId: ready.session.id,
        paymentChainId: 1,
      }),
    ).rejects.toBeInstanceOf(SafeRelayrRecoveryError);
    expect(h.sendPayment).toHaveBeenCalledTimes(2);
    expect(
      h.fetchRelayr.mock.calls.filter(([, init]) => init?.method === "POST"),
    ).toHaveLength(1);
  });

  it("refuses a retry callback that drops a previously known payment", async () => {
    const h = harness();
    const ready = await h.controller.prepare({
      account: ACCOUNT,
      executions: [execution()],
    });
    await h.controller.fund({
      account: ACCOUNT,
      sessionId: ready.session.id,
      paymentChainId: 1,
    });
    h.mined({ status: "reverted" });
    h.sendPayment.mockImplementationOnce(
      async ({ beforeSend, onSending, onSent }) => {
        await beforeSend();
        await onSending();
        const newPayment = sentRelayrPayment(
          relayrPaymentDetails(payment(), {
            bundleUuid: BUNDLE,
            destinationChainIds: [1],
            nowSeconds: NOW,
          }),
          WRONG_BLOCK,
        );
        await onSent([newPayment]);
        return { hash: WRONG_BLOCK, payments: [newPayment] };
      },
    );
    await expect(
      h.controller.fund({
        account: ACCOUNT,
        sessionId: ready.session.id,
        paymentChainId: 1,
      }),
    ).rejects.toThrow("retain every known payment");
    expect(
      h.sessions.get(ready.session.id)?.payments.map(({ hash }) => hash),
    ).toEqual([HASH]);
    expect(
      (
        await h.controller.check({
          account: ACCOUNT,
          sessionId: ready.session.id,
        })
      ).state,
    ).toBe("pending");
  });

  it("does not clear an ambiguous retry when the adapter returns only old payment hashes", async () => {
    const h = harness();
    const ready = await h.controller.prepare({
      account: ACCOUNT,
      executions: [execution()],
    });
    await h.controller.fund({
      account: ACCOUNT,
      sessionId: ready.session.id,
      paymentChainId: 1,
    });
    h.mined({ status: "reverted" });
    h.sendPayment.mockImplementationOnce(
      async ({ session, beforeSend, onSending, onSent }) => {
        await beforeSend();
        await onSending();
        await onSent(session.payments);
        return { hash: HASH, payments: session.payments };
      },
    );
    await expect(
      h.controller.fund({
        account: ACCOUNT,
        sessionId: ready.session.id,
        paymentChainId: 1,
      }),
    ).rejects.toThrow();
    expect(h.sessions.get(ready.session.id)?.paymentStatus).toBe("sending");
    expect(
      (
        await h.controller.check({
          account: ACCOUNT,
          sessionId: ready.session.id,
        })
      ).state,
    ).toBe("pending");
    expect(h.sendPayment).toHaveBeenCalledTimes(2);
  });

  it.each(["account", "cancel"])(
    "fences funding when %s changes after checks",
    async (change) => {
      const h = harness();
      const abort = new AbortController();
      const ready = await h.controller.prepare({
        account: ACCOUNT,
        executions: [execution()],
      });
      h.sendPayment.mockImplementationOnce(
        async ({ beforeSend, onSending }) => {
          await beforeSend();
          if (change === "account") h.setAccount(OTHER);
          else abort.abort();
          await onSending();
          throw new Error("wallet must never be invoked");
        },
      );
      await expect(
        h.controller.fund({
          account: ACCOUNT,
          sessionId: ready.session.id,
          paymentChainId: 1,
          signal: abort.signal,
        }),
      ).rejects.toThrow();
      expect(h.sessions.get(ready.session.id)?.paymentStatus).toBe("unfunded");
      expect(h.sessions.get(ready.session.id)?.payments).toHaveLength(0);
    },
  );

  it("does not claim a partial multichain execution completed", async () => {
    const h = harness();
    const calls = [execution(), execution(10)];
    const ready = await h.controller.prepare({
      account: ACCOUNT,
      executions: calls,
    });
    h.setPaymentReceived(true);
    h.setRecords(
      calls.map((call, index) => ({
        tx_uuid: IDS[index],
        request: { ...call.entry, virtual_nonce: 0 },
        status: index
          ? { state: "Pending" }
          : { state: "Success", data: { hash: HASH } },
      })),
    );
    expect(
      (
        await h.controller.check({
          account: ACCOUNT,
          sessionId: ready.session.id,
        })
      ).state,
    ).toBe("pending");
    expect(h.afterVerified).not.toHaveBeenCalled();
    expect(h.sendPayment).not.toHaveBeenCalled();
  });

  it("proves every chain in binding order even when Relayr returns records out of order", async () => {
    const h = harness();
    const calls = [execution(), execution(10)];
    const hashes = [HASH, WRONG_BLOCK];
    const ready = await h.controller.prepare({
      account: ACCOUNT,
      executions: calls,
    });
    calls.forEach((call, index) =>
      h.mined({
        hash: hashes[index],
        chain: call.entry.chain,
        target: SAFE,
        data: call.entry.data,
        value: 0n,
        logs: [
          {
            address: SAFE,
            topics: encodeEventTopics({
              abi: SAFE_EXEC_ABI,
              eventName: "ExecutionSuccess",
              args: { txHash: call.safeTxHash },
            }),
            data: encodeAbiParameters([{ type: "uint256" }], [0n]),
          },
        ],
      }),
    );
    h.setRecords(
      calls
        .map((call, index) => ({
          tx_uuid: IDS[index],
          request: { ...call.entry, virtual_nonce: 0 },
          status: { state: "Success", data: { hash: hashes[index] } },
        }))
        .reverse(),
    );
    expect(
      (
        await h.controller.check({
          account: ACCOUNT,
          sessionId: ready.session.id,
        })
      ).state,
    ).toBe("complete");
    expect(h.afterVerified.mock.calls.map(([call]) => call)).toEqual(calls);
    expect(h.sendPayment).not.toHaveBeenCalled();
  });

  it.each([
    "missing event",
    "wrong hash",
    "failure event",
    "wrong calldata",
    "noncanonical",
    "unexpected refund",
    "success",
  ])(
    "requires exact canonical destination and Safe success: %s",
    async (outcome) => {
      const h = harness();
      const call = execution();
      const ready = await h.controller.prepare({
        account: ACCOUNT,
        executions: [call],
      });
      const event = {
        address: SAFE,
        topics: encodeEventTopics({
          abi: SAFE_EXEC_ABI,
          eventName:
            outcome === "failure event"
              ? "ExecutionFailure"
              : "ExecutionSuccess",
          args: {
            txHash: outcome === "wrong hash" ? WRONG_BLOCK : call.safeTxHash,
          },
        }),
        data: encodeAbiParameters(
          [{ type: "uint256" }],
          [outcome === "unexpected refund" ? 1n : 0n],
        ),
      };
      h.mined({
        target: SAFE,
        data: outcome === "wrong calldata" ? "0xffff" : call.entry.data,
        value: 0n,
        logs: outcome === "missing event" ? [] : [event],
      });
      h.setRecords([
        {
          tx_uuid: IDS[0],
          request: { ...call.entry, virtual_nonce: 0 },
          status: { state: "Success", data: { hash: HASH } },
        },
      ]);
      if (outcome === "noncanonical") h.setCanonicalHash(WRONG_BLOCK);
      const checked = h.controller.check({
        account: ACCOUNT,
        sessionId: ready.session.id,
      });
      if (outcome === "success") {
        expect((await checked).state).toBe("complete");
        expect(h.afterVerified).toHaveBeenCalledWith(call);
      } else {
        await expect(checked).rejects.toThrow();
        expect(h.sessions.get(ready.session.id)?.state).toBe("active");
        expect(h.afterVerified).not.toHaveBeenCalled();
      }
      expect(h.sendPayment).not.toHaveBeenCalled();
    },
  );
});

describe("Safe Relayr read-only progress polling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW * 1000);
  });

  it("polls pending progress with no held store lock and returns pending at timeout", async () => {
    const h = harness();
    const ready = await h.controller.prepare({
      account: ACCOUNT,
      executions: [execution()],
    });
    h.sessions.get(ready.session.id)!.paymentStatus = "sending";
    let locked = false;
    vi.mocked(h.store.withLock).mockImplementation(async (_account, run) => {
      locked = true;
      try {
        return await run();
      } finally {
        locked = false;
      }
    });
    const first = deferred();
    const onUpdate = vi.fn(() => {
      expect(locked).toBe(false);
      first.resolve();
    });
    const watched = h.controller.watch({
      account: ACCOUNT,
      sessionId: ready.session.id,
      intervalMs: 250,
      timeoutMs: 700,
      onUpdate,
    });
    await first.promise;
    await vi.advanceTimersByTimeAsync(700);
    expect((await watched).state).toBe("pending");
    expect(onUpdate).toHaveBeenCalledTimes(4);
    expect(h.sendPayment).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["ready", "released", "complete"] as const)(
    "returns immediately when the saved state is %s",
    async (state) => {
      const h = harness();
      const ready = await h.controller.prepare({
        account: ACCOUNT,
        executions: [execution()],
      });
      if (state !== "ready") h.sessions.get(ready.session.id)!.state = state;
      const onUpdate = vi.fn();
      expect(
        (
          await h.controller.watch({
            account: ACCOUNT,
            sessionId: ready.session.id,
            onUpdate,
          })
        ).state,
      ).toBe(state);
      expect(onUpdate).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(0);
      expect(h.sendPayment).not.toHaveBeenCalled();
    },
  );

  it("stops polling as soon as all exact Safe executions prove completion", async () => {
    const h = harness();
    const call = execution();
    const ready = await h.controller.prepare({
      account: ACCOUNT,
      executions: [call],
    });
    h.setPaymentReceived(true);
    const first = deferred();
    const onUpdate = vi.fn(() => {
      first.resolve();
    });
    const watched = h.controller.watch({
      account: ACCOUNT,
      sessionId: ready.session.id,
      intervalMs: 100,
      onUpdate,
    });
    await first.promise;
    h.mined({
      target: SAFE,
      data: call.entry.data,
      value: 0n,
      logs: [
        {
          address: SAFE,
          topics: encodeEventTopics({
            abi: SAFE_EXEC_ABI,
            eventName: "ExecutionSuccess",
            args: { txHash: call.safeTxHash },
          }),
          data: encodeAbiParameters([{ type: "uint256" }], [0n]),
        },
      ],
    });
    h.setRecords([
      {
        tx_uuid: IDS[0],
        request: call.entry,
        status: { state: "Success", data: { hash: HASH } },
      },
    ]);
    await vi.advanceTimersByTimeAsync(100);
    expect((await watched).state).toBe("complete");
    expect(onUpdate.mock.calls).toHaveLength(2);
    expect(h.afterVerified).toHaveBeenCalledOnce();
    expect(h.sendPayment).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("cancels the pending timer and retains the existing bundle", async () => {
    const h = harness();
    const ready = await h.controller.prepare({
      account: ACCOUNT,
      executions: [execution()],
    });
    h.sessions.get(ready.session.id)!.paymentStatus = "sending";
    const abort = new AbortController();
    const first = deferred();
    const watched = h.controller.watch({
      account: ACCOUNT,
      sessionId: ready.session.id,
      signal: abort.signal,
      onUpdate: () => {
        first.resolve();
      },
    });
    const rejection = expect(watched).rejects.toThrow();
    await first.promise;
    await vi.advanceTimersByTimeAsync(0);
    expect(vi.getTimerCount()).toBe(1);
    abort.abort();
    await rejection;
    expect(vi.getTimerCount()).toBe(0);
    expect(h.sessions.get(ready.session.id)?.state).toBe("active");
    expect(h.sendPayment).not.toHaveBeenCalled();
  });

  it("suppresses late status callbacks after cancellation during a network read", async () => {
    const h = harness();
    const ready = await h.controller.prepare({
      account: ACCOUNT,
      executions: [execution()],
    });
    const entered = deferred();
    const gate = deferred();
    h.fetchRelayr.mockImplementationOnce(async () => {
      entered.resolve();
      await gate.promise;
      return json({
        bundle_uuid: BUNDLE,
        payment_received: true,
        transactions: ready.session.quote!.transactions,
      });
    });
    const abort = new AbortController();
    const onUpdate = vi.fn();
    const watched = h.controller.watch({
      account: ACCOUNT,
      sessionId: ready.session.id,
      signal: abort.signal,
      onUpdate,
    });
    const rejection = expect(watched).rejects.toThrow();
    await entered.promise;
    abort.abort();
    gate.resolve();
    await rejection;
    expect(onUpdate).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    expect(h.sendPayment).not.toHaveBeenCalled();
  });

  it.each([
    { intervalMs: 0 },
    { intervalMs: -1 },
    { intervalMs: Number.NaN },
    { timeoutMs: -1 },
    { timeoutMs: Number.POSITIVE_INFINITY },
  ])("rejects invalid polling bounds %j without reads", async (bounds) => {
    const h = harness();
    await expect(
      h.controller.watch({ account: ACCOUNT, sessionId: "unknown", ...bounds }),
    ).rejects.toThrow("positive interval");
    expect(h.store.list).not.toHaveBeenCalled();
    expect(h.fetchRelayr).not.toHaveBeenCalled();
  });
});
