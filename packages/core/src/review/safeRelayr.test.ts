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
  RelayrProofUnavailableError,
  type RelayrBundleRequest,
  type RelayrReleaseClient,
  type RelayrTransactionRecord,
} from "./relayr.js";
import {
  createSafeRelayrController,
  canReplaceSafeRelayrQuote,
  requireSafeRelayrExecution,
  SafeRelayrRecoveryError,
  safeRelayrPreconditions,
  safeRelayrReservationKey,
  sameSafeRelayrIntents,
  verifySafeRelayrLanding,
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
const NEXT_BUNDLE = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
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

function payment(bundleUuid = BUNDLE) {
  return {
    chain: 1,
    amount: "100",
    target: RELAYR_PAYMENT_ADDRESS,
    token: RELAYR_NATIVE_TOKEN,
    calldata:
      `${RELAYR_PAYMENT_SELECTOR}${bundleUuid.replaceAll("-", "").padEnd(64, "0")}${BigInt(DEADLINE).toString(16).padStart(64, "0")}` as Hex,
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
  let bundleUuid = BUNDLE;
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
        bundle_uuid: bundleUuid,
        payment_info: [payment(bundleUuid)],
        tx_uuids: IDS.slice(0, records.length),
        transactions: records,
      });
    }
    order.push("get");
    return json({
      bundle_uuid: bundleUuid,
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
    async ({
      session,
      payment: quotedPayment,
      beforeSend,
      onSending,
      onSent,
    }) => {
      await beforeSend();
      await onSending();
      const sent = sentRelayrPayment(
        relayrPaymentDetails(quotedPayment, {
          bundleUuid: session.bundleUuid!,
          destinationChainIds: session.executions.map(
            ({ entry }) => entry.chain,
          ),
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
  const onProgress = vi.fn<NonNullable<SafeRelayrOptions["onProgress"]>>();
  let id = 0;
  let clientFor: SafeRelayrOptions["clientFor"] = () =>
    client as unknown as RelayrReleaseClient;
  const controllerOptions: SafeRelayrOptions = {
    store,
    fetch: fetchRelayr,
    clientFor: (chainId) => clientFor(chainId),
    currentAccount: () => account,
    revalidate,
    review,
    sendPayment,
    afterVerified,
    onProgress,
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
    setClientFor: (read: SafeRelayrOptions["clientFor"]) => {
      clientFor = read;
    },
    sessions,
    store,
    order,
    fetchRelayr,
    client,
    revalidate,
    review,
    sendPayment,
    afterVerified,
    onProgress,
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
    setBundleUuid: (value: string) => {
      bundleUuid = value;
    },
    onPost: (value: () => Promise<void>) => {
      onPost = value;
    },
  };
}

function mineSafe(
  h: ReturnType<typeof harness>,
  call: SafeRelayrExecution,
  hash: Hex,
) {
  h.mined({
    hash,
    chain: call.entry.chain,
    target: call.safe,
    data: call.entry.data,
    value: 0n,
    logs: [
      {
        address: call.safe,
        topics: encodeEventTopics({
          abi: SAFE_EXEC_ABI,
          eventName: "ExecutionSuccess",
          args: { txHash: call.safeTxHash },
        }),
        data: encodeAbiParameters([{ type: "uint256" }], [0n]),
      },
    ],
  });
}

function destinationRecords(
  calls: SafeRelayrExecution[],
  hashes: (Hex | undefined)[],
) {
  return calls.map((call, index) => ({
    tx_uuid: IDS[index],
    request: call.entry,
    status: hashes[index]
      ? { state: "Success", data: { hash: hashes[index] } }
      : { state: "Pending" },
  }));
}

beforeEach(() => {
  vi.spyOn(Date, "now").mockReturnValue(NOW * 1000);
});

describe("Safe Relayr recovery without a complete quote", () => {
  function orphan(
    h: ReturnType<typeof harness>,
    overrides: Partial<SafeRelayrSession> = {},
  ) {
    const session: SafeRelayrSession = {
      id: h.firstSessionId,
      account: ACCOUNT,
      executions: [execution()],
      state: "publishing",
      paymentStatus: "unfunded",
      payments: [],
      createdAt: NOW,
      context: { legacyJournal: "retained" },
      ...overrides,
    };
    h.sessions.set(session.id, session);
    return session;
  }

  function nonceClient(h: ReturnType<typeof harness>, nonce: bigint) {
    const request = vi.fn(async () =>
      encodeAbiParameters([{ type: "uint256" }], [nonce]),
    );
    h.setClientFor(
      () => ({ ...h.client, request }) as unknown as RelayrReleaseClient,
    );
    return request;
  }

  it("rechecks the current proposal before retiring an unused old quote attempt", async () => {
    const h = harness();
    const session = orphan(h);
    const request = nonceClient(h, 18n);
    h.revalidate.mockRejectedValueOnce(new Error("Current Safe nonce changed"));
    await expect(
      h.controller.prepare({
        account: ACCOUNT,
        executions: session.executions,
      }),
    ).rejects.toThrow("Current Safe nonce changed");
    expect(h.sessions.get(session.id)?.state).toBe("publishing");
    expect(request).not.toHaveBeenCalled();
    expect(h.revalidate).toHaveBeenCalledOnce();
    expect(h.review).not.toHaveBeenCalled();
    expect(h.fetchRelayr).not.toHaveBeenCalled();
    expect(h.sendPayment).not.toHaveBeenCalled();
  });

  it.each(["missing quote and UUID", "missing quote", "missing UUID"])(
    "releases an unfunded %s only after every Safe nonce is finalized and consumed",
    async (missing) => {
      const h = harness();
      const calls = [execution(), execution(10)];
      let session: SafeRelayrSession;
      if (missing === "missing UUID") {
        const ready = await h.controller.prepare({
          account: ACCOUNT,
          executions: calls,
        });
        session = h.sessions.get(ready.session.id)!;
        delete session.bundleUuid;
        h.revalidate.mockClear();
        h.review.mockClear();
        h.fetchRelayr.mockClear();
      } else {
        session = orphan(h, {
          executions: calls,
          ...(missing === "missing quote" ? { bundleUuid: BUNDLE } : {}),
        });
        if (missing === "missing quote")
          h.setRecords(
            calls.map((call, index) => ({
              tx_uuid: IDS[index],
              request: call.entry,
              status: { state: "Pending" },
            })),
          );
      }
      const request = nonceClient(h, 18n);
      const checked = await h.controller.check({
        account: ACCOUNT,
        sessionId: session.id,
      });
      expect(checked.state).toBe("released");
      expect(checked.session.releaseReason).toBe("safe-nonces-consumed");
      expect(checked.session.paymentStatus).toBe("unfunded");
      expect(checked.recovery).toMatchObject({
        reason: "safe-nonces-consumed",
        checks: calls.map(({ entry, safe, nonce }) => ({
          chainId: entry.chain,
          safe,
          nonce,
          currentNonce: "18",
          state: "consumed",
        })),
      });
      expect(request).toHaveBeenCalledTimes(2);
      expect(request).toHaveBeenCalledWith({
        method: "eth_call",
        params: [{ to: SAFE, data: "0xaffed0e0", gas: "0x186a0" }, "0x7b"],
      });
      expect(h.client.getBlock).toHaveBeenCalledWith({ blockTag: "finalized" });
      expect(h.client.getBlock).toHaveBeenCalledWith({ blockNumber: 123n });
      if (missing === "missing quote")
        expect(h.fetchRelayr).toHaveBeenCalledTimes(1);
      else expect(h.fetchRelayr).not.toHaveBeenCalled();
      expect(h.review).not.toHaveBeenCalled();
      expect(h.sendPayment).not.toHaveBeenCalled();
      expect(h.afterVerified).not.toHaveBeenCalled();
      expect(h.sessions.get(session.id)?.executions).toEqual(calls);
    },
  );

  it.each(["unpaid", "paid", "unknown", "running"])(
    "classifies a synthetic quote with no payment options while Relayr is %s",
    async (remote) => {
      const h = harness();
      const ready = await h.controller.prepare({
        account: ACCOUNT,
        executions: [execution()],
      });
      const saved = h.sessions.get(ready.session.id)!;
      saved.quote!.payment_info = [];
      const originalCalls = structuredClone(saved.executions);
      h.setPaymentReceived(
        remote === "paid" ? true : remote === "unknown" ? undefined : false,
      );
      if (remote === "running")
        h.setRecords([
          {
            tx_uuid: IDS[0],
            request: saved.executions[0].entry,
            status: { state: "Running" },
          },
        ]);
      h.review.mockClear();
      const request = nonceClient(h, 18n);
      const checked = await h.controller.check({
        account: ACCOUNT,
        sessionId: saved.id,
      });
      expect(checked.state).toBe(remote === "unpaid" ? "released" : "pending");
      expect(checked.recovery?.reason).toBe(
        remote === "unpaid" ? "safe-nonces-consumed" : "funding-unresolved",
      );
      expect(checked.session.executions).toEqual(originalCalls);
      expect(checked.session.paymentStatus).toBe("unfunded");
      expect(checked.session.releaseReason).toBe(
        remote === "unpaid" ? "safe-nonces-consumed" : undefined,
      );
      expect(request).toHaveBeenCalledTimes(
        remote === "paid" || remote === "running" ? 0 : 1,
      );
      expect(h.review).not.toHaveBeenCalled();
      expect(h.sendPayment).not.toHaveBeenCalled();
      expect(h.afterVerified).not.toHaveBeenCalled();
    },
  );

  it.each([
    { method: "prepare", available: true },
    { method: "prepare", available: false },
    { method: "fund", available: true },
    { method: "fund", available: false },
  ] as const)(
    "returns recovery evidence directly from $method when nonce availability is $available",
    async ({ method, available }) => {
      const h = harness();
      const session = orphan(h, { paymentStatus: "sending" });
      const request = nonceClient(h, 17n);
      if (!available)
        request.mockRejectedValueOnce(new Error("RPC unavailable"));
      const operation =
        method === "prepare"
          ? h.controller.prepare({
              account: ACCOUNT,
              executions: [execution()],
            })
          : h.controller.fund({
              account: ACCOUNT,
              sessionId: session.id,
              paymentChainId: 1,
            });
      const error = await operation.catch((cause: unknown) => cause);
      expect(error).toBeInstanceOf(SafeRelayrRecoveryError);
      if (!(error instanceof SafeRelayrRecoveryError))
        throw new Error("Expected typed recovery");
      expect(error.recovery?.reason).toBe(
        available ? "safe-nonces-live" : "safe-nonces-unavailable",
      );
      expect(error.message).toBe(error.recovery?.message);
      expect(error.session.id).toBe(session.id);
      expect(request).toHaveBeenCalledTimes(1);
      expect(h.fetchRelayr).not.toHaveBeenCalled();
      expect(h.review).not.toHaveBeenCalled();
      expect(h.sendPayment).not.toHaveBeenCalled();
    },
  );

  it.each([17n, 16n])(
    "keeps same or lower finalized nonce %s reserved with an explicit live explanation",
    async (nonce) => {
      const h = harness();
      const session = orphan(h);
      nonceClient(h, nonce);
      const checked = await h.controller.check({
        account: ACCOUNT,
        sessionId: session.id,
      });
      expect(checked.state).toBe("pending");
      expect(checked.recovery).toMatchObject({
        reason: "safe-nonces-live",
        checks: [
          {
            chainId: 1,
            safe: SAFE,
            nonce: 17,
            currentNonce: nonce.toString(),
            state: "live",
          },
        ],
      });
      expect(checked.recovery?.message).toBeTruthy();
      expect(h.sessions.get(session.id)?.releaseReason).toBeUndefined();
      session.paymentStatus = "sending";
      await expect(
        h.controller.prepare({ account: ACCOUNT, executions: [execution()] }),
      ).rejects.toBeInstanceOf(SafeRelayrRecoveryError);
      expect(h.fetchRelayr).not.toHaveBeenCalled();
      expect(h.sendPayment).not.toHaveBeenCalled();
    },
  );

  it("keeps a partly consumed multichain reservation intact", async () => {
    const h = harness();
    const session = orphan(h, { executions: [execution(), execution(10)] });
    h.setClientFor(
      (chainId) =>
        ({
          ...h.client,
          request: vi.fn(async () =>
            encodeAbiParameters(
              [{ type: "uint256" }],
              [chainId === 1 ? 18n : 17n],
            ),
          ),
        }) as unknown as RelayrReleaseClient,
    );
    const checked = await h.controller.check({
      account: ACCOUNT,
      sessionId: session.id,
    });
    expect(checked.state).toBe("pending");
    expect(checked.recovery).toMatchObject({
      reason: "safe-nonces-mixed",
      checks: [
        { chainId: 1, state: "consumed" },
        { chainId: 10, state: "live" },
      ],
    });
    expect(h.sessions.get(session.id)?.state).toBe("publishing");
    expect(h.afterVerified).not.toHaveBeenCalled();
  });

  it("starts every independent finalized nonce check before any returns", async () => {
    const h = harness();
    const calls = [1, 10, 8453, 42161].map((chainId) => execution(chainId));
    const session = orphan(h, { executions: calls });
    const started = deferred();
    const gate = deferred();
    const requests = calls.map(() =>
      vi.fn(async () => {
        if (requests.every((request) => request.mock.calls.length === 1))
          started.resolve();
        await gate.promise;
        return encodeAbiParameters([{ type: "uint256" }], [18n]);
      }),
    );
    h.setClientFor(
      (chainId) =>
        ({
          ...h.client,
          request:
            requests[calls.findIndex(({ entry }) => entry.chain === chainId)],
        }) as unknown as RelayrReleaseClient,
    );
    const checking = h.controller.check({
      account: ACCOUNT,
      sessionId: session.id,
    });
    await started.promise;
    expect(requests.every((request) => request.mock.calls.length === 1)).toBe(
      true,
    );
    expect(h.sessions.get(session.id)?.state).toBe("publishing");
    gate.resolve();
    expect((await checking).state).toBe("released");
  });

  it.each([
    "no raw request",
    "missing client",
    "throwing client",
    "read failure",
    "malformed nonce",
    "reorg",
    "unavailable finalized block",
  ])("reports unavailable proof for %s without releasing", async (failure) => {
    const h = harness();
    const session = orphan(h);
    const request = nonceClient(h, 18n);
    if (failure === "no raw request")
      h.setClientFor(() => h.client as unknown as RelayrReleaseClient);
    if (failure === "missing client") h.setClientFor(() => undefined);
    if (failure === "throwing client")
      h.setClientFor(() => {
        throw new Error("unsupported chain");
      });
    if (failure === "read failure")
      request.mockRejectedValueOnce(new Error("RPC unavailable"));
    if (failure === "malformed nonce") request.mockResolvedValueOnce("0x01");
    if (failure === "reorg") h.setCanonicalHash(WRONG_BLOCK);
    if (failure === "unavailable finalized block")
      h.client.getBlock.mockRejectedValueOnce(
        new Error("finalized unsupported"),
      );
    const checked = await h.controller.check({
      account: ACCOUNT,
      sessionId: session.id,
    });
    expect(checked.state).toBe("pending");
    expect(checked.recovery).toMatchObject({
      reason: "safe-nonces-unavailable",
      checks: [{ chainId: 1, safe: SAFE, nonce: 17, state: "unavailable" }],
    });
    expect(h.sessions.get(session.id)?.state).toBe("publishing");
    expect(h.sendPayment).not.toHaveBeenCalled();
    expect(h.afterVerified).not.toHaveBeenCalled();
  });

  it.each([
    "empty executions",
    "wildcard reservation",
    "uncovered reservation",
    "invalid hash",
    "duplicate nonce",
  ])("does not infer release from incomplete identity: %s", async (missing) => {
    const h = harness();
    const session = orphan(h);
    if (missing === "empty executions") session.executions = [];
    if (missing === "wildcard reservation")
      session.reservationKeys = [`1:${SAFE}:*`];
    if (missing === "uncovered reservation")
      session.reservationKeys = [`10:${SAFE}:17`];
    if (missing === "invalid hash") session.executions[0].safeTxHash = HASH;
    if (missing === "duplicate nonce") session.executions.push(execution());
    const request = nonceClient(h, 18n);
    const checked = await h.controller.check({
      account: ACCOUNT,
      sessionId: session.id,
    });
    expect(checked.state).toBe("pending");
    expect(checked.recovery?.reason).toBe("missing-execution-proof");
    expect(h.sessions.get(session.id)?.state).toBe("publishing");
    expect(request).not.toHaveBeenCalled();
    expect(h.afterVerified).not.toHaveBeenCalled();
  });

  it("accepts exact legacy reservation keys when every nonce proof covers them", async () => {
    const h = harness();
    const session = orphan(h, {
      reservationKeys: [safeRelayrReservationKey(execution())],
    });
    nonceClient(h, 18n);
    expect(
      (await h.controller.check({ account: ACCOUNT, sessionId: session.id }))
        .state,
    ).toBe("released");
  });

  it.each([
    "sending",
    "submitted",
    "confirmed",
    "reverted",
    "expired",
  ] as const)(
    "keeps consumed nonces reserved while funding is %s",
    async (paymentStatus) => {
      const h = harness();
      const session = orphan(h, { paymentStatus });
      nonceClient(h, 18n);
      const checked = await h.controller.check({
        account: ACCOUNT,
        sessionId: session.id,
      });
      expect(checked.state).toBe("pending");
      expect(checked.recovery?.reason).toBe("funding-unresolved");
      expect(checked.session.paymentStatus).toBe(paymentStatus);
      expect(h.sessions.get(session.id)?.context).toEqual({
        legacyJournal: "retained",
      });
      expect(h.afterVerified).not.toHaveBeenCalled();
    },
  );

  it.each(["known payment", "malformed history"])(
    "retains consumed nonces with an unfunded label but %s",
    async (history) => {
      const h = harness();
      const sent = sentRelayrPayment(
        relayrPaymentDetails(payment(), {
          bundleUuid: BUNDLE,
          destinationChainIds: [1],
          nowSeconds: NOW,
        }),
        HASH,
      );
      const session = orphan(h, {
        payments:
          history === "known payment"
            ? [sent]
            : (null as unknown as SafeRelayrSession["payments"]),
      });
      nonceClient(h, 18n);
      const checked = await h.controller.check({
        account: ACCOUNT,
        sessionId: session.id,
      });
      expect(checked.state).toBe("pending");
      expect(checked.recovery?.reason).toBe("funding-unresolved");
      expect(checked.session.payments).toEqual(session.payments);
      expect(h.afterVerified).not.toHaveBeenCalled();
      expect(h.sendPayment).not.toHaveBeenCalled();
    },
  );
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

describe("unused Safe quote replacement eligibility", () => {
  const quoteOnly = (): SafeRelayrSession => ({
    id: "quote-only",
    account: ACCOUNT,
    executions: [execution()],
    state: "active",
    paymentStatus: "unfunded",
    payments: [],
    createdAt: NOW,
  });

  it.each(["active", "publishing"] as const)(
    "allows an unfunded %s attempt with valid empty payment history",
    (state) => {
      expect(canReplaceSafeRelayrQuote({ ...quoteOnly(), state })).toBe(true);
      expect(
        canReplaceSafeRelayrQuote({
          ...quoteOnly(),
          state,
          fundingObserved: false,
          reservationKeys: [safeRelayrReservationKey(execution())],
        }),
      ).toBe(true);
    },
  );

  it.each([
    { state: "released" },
    { state: "complete" },
    { state: "unexpected" },
    { paymentStatus: "sending" },
    { paymentStatus: "submitted" },
    { paymentStatus: "confirmed" },
    { paymentStatus: "reverted" },
    { paymentStatus: "expired" },
    { paymentStatus: null },
    { payments: null },
    { payments: undefined },
    { payments: {} },
    { payments: [null] },
    { fundingObserved: true },
    { fundingObserved: null },
    { fundingObserved: "false" },
    { executions: [] },
    { executions: [{ ...execution(), safeTxHash: HASH }] },
    { reservationKeys: [`1:${SAFE}:*`] },
    { reservationKeys: [`10:${SAFE}:17`] },
    { reservationKeys: null },
  ])("refuses malformed, incomplete or funded evidence %o", (patch) => {
    expect(
      canReplaceSafeRelayrQuote({
        ...quoteOnly(),
        ...patch,
      } as unknown as SafeRelayrSession),
    ).toBe(false);
  });

  it.each(
    [
      undefined,
      [],
      [{}],
      [{ status: {} }],
      [{ status: { state: "Pending" } }],
      [{ status: { state: "pending" } }],
      [{ status: { state: "Pending", data: null } }],
    ].map((records) => ({ records })),
  )(
    "allows untouched quote records without execution evidence %o",
    ({ records }) => {
      const session = quoteOnly();
      expect(
        canReplaceSafeRelayrQuote({ ...session, records } as SafeRelayrSession),
      ).toBe(true);
      expect(
        canReplaceSafeRelayrQuote({
          ...session,
          quote: { transactions: records },
        } as unknown as SafeRelayrSession),
      ).toBe(true);
    },
  );

  it.each(
    [
      null,
      {},
      "invalid",
      [null],
      [1],
      [[]],
      [{ status: null }],
      [{ status: [] }],
      [{ status: "Pending" }],
      [{ status: { state: "Pending", data: [] } }],
      [{ status: { state: "Pending", data: "invalid" } }],
      [{ status: { state: "Pending", data: { transaction: null } } }],
      [{ status: { state: "Pending", data: { transaction: [] } } }],
      [{ status: { state: "Pending", data: { transaction: "invalid" } } }],
      [{ status: { state: "Running" } }],
      [{ status: { state: "Success" } }],
      [{ status: { state: "Failed" } }],
      [{ status: { state: "Unknown" } }],
      [{ status: { state: null } }],
      [{ status: { state: "Pending", data: { hash: HASH } } }],
      [{ status: { state: "Pending", data: { hash: null } } }],
      [{ status: { data: { transaction: { hash: HASH } } } }],
    ].map((records) => ({ records })),
  )(
    "preserves records with observed execution or malformed status %o",
    ({ records }) => {
      const session = quoteOnly();
      expect(
        canReplaceSafeRelayrQuote({
          ...session,
          records,
        } as unknown as SafeRelayrSession),
      ).toBe(false);
      expect(
        canReplaceSafeRelayrQuote({
          ...session,
          quote: { transactions: records },
        } as unknown as SafeRelayrSession),
      ).toBe(false);
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

  it("replaces a lost quote response with the current calls and funds only after explicit approval", async () => {
    const h = harness();
    h.onPost(async () => {
      throw new Error("response lost");
    });
    await expect(
      h.controller.prepare({ account: ACCOUNT, executions: [execution()] }),
    ).rejects.toThrow("response lost");
    expect(h.sessions.get(h.firstSessionId)?.state).toBe("publishing");
    const old = structuredClone(h.sessions.get(h.firstSessionId)!);
    h.onPost(async () => undefined);
    h.setBundleUuid(NEXT_BUNDLE);
    const calls = [execution(1, { signatures: "0x112233" }), execution(10)];
    const ready = await h.controller.prepare({
      account: ACCOUNT,
      executions: calls,
    });
    expect(ready.resumed).toBe(false);
    expect(ready.session.executions).toEqual(calls);
    expect(ready.session.bundleUuid).toBe(NEXT_BUNDLE);
    expect(h.sessions.get(old.id)).toEqual({
      ...old,
      state: "released",
      releaseReason: "quote-replaced",
    });
    expect(
      h.fetchRelayr.mock.calls.every(([, init]) => init?.method === "POST"),
    ).toBe(true);
    expect(h.fetchRelayr).toHaveBeenCalledTimes(2);
    expect(h.sendPayment).not.toHaveBeenCalled();
    await h.controller.fund({
      account: ACCOUNT,
      sessionId: ready.session.id,
      paymentChainId: 1,
    });
    expect(h.sendPayment).toHaveBeenCalledOnce();
    expect(h.sessions.get(ready.session.id)?.payments[0].bundleUuid).toBe(
      NEXT_BUNDLE,
    );
    expect(h.sessions.get(old.id)?.payments).toEqual([]);
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
    h.sessions.get(ready.session.id)!.paymentStatus = "sending";
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

  it("reviews and quotes the current calldata across all chains after confirmations change", async () => {
    const h = harness();
    const original = [1, 10, 8453, 42161].map((chain) => execution(chain));
    const first = await h.controller.prepare({
      account: ACCOUNT,
      executions: original,
    });
    h.revalidate.mockClear();
    h.review.mockClear();
    h.setBundleUuid(NEXT_BUNDLE);
    const current = [...original]
      .reverse()
      .map(({ entry }) =>
        execution(entry.chain, { signatures: "0x111122223333" }),
      );
    const second = await h.controller.prepare({
      account: ACCOUNT,
      executions: current,
    });
    expect(second.resumed).toBe(false);
    expect(second.session.id).not.toBe(first.session.id);
    expect(second.session.bundleUuid).toBe(NEXT_BUNDLE);
    expect(second.session.executions).toEqual(current);
    expect(h.sessions.get(first.session.id)?.releaseReason).toBe(
      "quote-replaced",
    );
    expect(h.sessions.get(first.session.id)?.executions).toEqual(original);
    expect(h.revalidate.mock.calls.map(([call]) => call)).toEqual(current);
    expect(h.review).toHaveBeenCalledWith(current, { resumed: false });
    expect(
      h.fetchRelayr.mock.calls.filter(([, init]) => init?.method === "POST"),
    ).toHaveLength(2);
    expect(h.sendPayment).not.toHaveBeenCalled();
  });

  it.each(["subset", "superset", "changed intent", "different account"])(
    "replaces an unfunded quote for the current %s selection",
    async (kind) => {
      const h = harness();
      const original =
        kind === "subset"
          ? [1, 10, 8453, 42161].map((chain) => execution(chain))
          : [execution()];
      const first = await h.controller.prepare({
        account: ACCOUNT,
        executions: original,
      });
      if (kind === "different account")
        h.sessions.get(first.session.id)!.account = OTHER;
      h.setBundleUuid(NEXT_BUNDLE);
      const next =
        kind === "subset"
          ? original.slice(0, 3)
          : kind === "superset"
            ? [execution(), execution(10)]
            : [
                execution(
                  1,
                  kind === "changed intent"
                    ? { data: "0xffff" }
                    : { signatures: "0x1122" },
                ),
              ];
      const ready = await h.controller.prepare({
        account: ACCOUNT,
        executions: next,
      });
      expect(ready.session.executions).toEqual(next);
      expect(ready.session.bundleUuid).toBe(NEXT_BUNDLE);
      expect(h.sessions.get(first.session.id)?.releaseReason).toBe(
        "quote-replaced",
      );
      expect(h.sendPayment).not.toHaveBeenCalled();
      expect(
        h.fetchRelayr.mock.calls.filter(([, init]) => init?.method === "POST"),
      ).toHaveLength(2);
    },
  );

  it("keeps the old quote and metadata intact when review of its replacement is cancelled", async () => {
    const h = harness();
    const first = await h.controller.prepare({
      account: ACCOUNT,
      executions: [execution()],
    });
    h.sessions.get(first.session.id)!.context = { legacyJournal: "original" };
    const old = structuredClone(h.sessions.get(first.session.id)!);
    h.review.mockRejectedValueOnce(new Error("Review cancelled"));
    await expect(
      h.controller.prepare({
        account: ACCOUNT,
        executions: [execution(), execution(10)],
      }),
    ).rejects.toThrow("Review cancelled");
    expect(h.sessions.get(first.session.id)).toEqual(old);
    expect(h.sessions.size).toBe(1);
    expect(
      h.fetchRelayr.mock.calls.filter(([, init]) => init?.method === "POST"),
    ).toHaveLength(1);
    expect(h.sendPayment).not.toHaveBeenCalled();
  });

  it("rereads funding evidence after replacement review before retiring the old quote", async () => {
    const h = harness();
    const first = await h.controller.prepare({
      account: ACCOUNT,
      executions: [execution()],
    });
    h.review.mockImplementationOnce(async () => {
      h.sessions.get(first.session.id)!.paymentStatus = "sending";
    });
    await expect(
      h.controller.prepare({
        account: ACCOUNT,
        executions: [execution(), execution(10)],
      }),
    ).rejects.toBeInstanceOf(SafeRelayrRecoveryError);
    expect(h.sessions.get(first.session.id)).toMatchObject({
      state: "active",
      paymentStatus: "sending",
      payments: [],
    });
    expect(h.sessions.size).toBe(1);
    expect(
      h.fetchRelayr.mock.calls.filter(([, init]) => init?.method === "POST"),
    ).toHaveLength(1);
  });

  it("refuses funding the retired quote from a stale controller", async () => {
    const h = harness();
    const oldController = h.recreateController();
    const first = await oldController.prepare({
      account: ACCOUNT,
      executions: [execution()],
    });
    h.setBundleUuid(NEXT_BUNDLE);
    const second = await h.controller.prepare({
      account: ACCOUNT,
      executions: [execution(), execution(10)],
    });
    await expect(
      oldController.fund({
        account: ACCOUNT,
        sessionId: first.session.id,
        paymentChainId: 1,
      }),
    ).rejects.toBeInstanceOf(SafeRelayrRecoveryError);
    expect(h.sendPayment).not.toHaveBeenCalled();
    await h.controller.fund({
      account: ACCOUNT,
      sessionId: second.session.id,
      paymentChainId: 1,
    });
    expect(h.sendPayment).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        session: expect.objectContaining({
          id: second.session.id,
          bundleUuid: NEXT_BUNDLE,
        }),
      }),
    );
  });

  it("retires every eligible overlapping quote while preserving unrelated quote history", async () => {
    const h = harness();
    const first = await h.controller.prepare({
      account: ACCOUNT,
      executions: [execution()],
    });
    const original = h.sessions.get(first.session.id)!;
    h.sessions.set("overlapping-legacy", {
      ...structuredClone(original),
      id: "overlapping-legacy",
      context: { keep: "overlapping" },
    });
    const unrelated = {
      ...structuredClone(original),
      id: "unrelated-legacy",
      executions: [execution(8453)],
      context: { keep: "unrelated" },
    };
    h.sessions.set(unrelated.id, unrelated);
    h.setBundleUuid(NEXT_BUNDLE);
    await h.controller.prepare({
      account: ACCOUNT,
      executions: [execution(), execution(10)],
    });
    expect(h.sessions.get(first.session.id)?.releaseReason).toBe(
      "quote-replaced",
    );
    expect(h.sessions.get("overlapping-legacy")).toMatchObject({
      state: "released",
      releaseReason: "quote-replaced",
      context: { keep: "overlapping" },
    });
    expect(h.sessions.get(unrelated.id)).toEqual(unrelated);
  });

  it.each([false, true])(
    "reuses original calldata after a proven payment revert with prior observed funding %s",
    async (fundingObserved) => {
      const h = harness();
      const original = execution();
      const first = await h.controller.prepare({
        account: ACCOUNT,
        executions: [original],
      });
      await h.controller.fund({
        account: ACCOUNT,
        sessionId: first.session.id,
        paymentChainId: 1,
      });
      h.mined({ status: "reverted" });
      h.sessions.get(first.session.id)!.fundingObserved = fundingObserved;
      h.revalidate.mockClear();
      h.review.mockClear();
      const retry = await h.controller.prepare({
        account: ACCOUNT,
        executions: [execution(1, { signatures: "0x11223344" })],
      });
      expect(retry.resumed).toBe(true);
      expect(retry.session.id).toBe(first.session.id);
      expect(retry.session.executions).toEqual([original]);
      expect(retry.session.payments).toHaveLength(1);
      expect(h.revalidate).toHaveBeenCalledExactlyOnceWith(original, ACCOUNT);
      expect(h.review).toHaveBeenCalledExactlyOnceWith([original], {
        resumed: true,
      });
      expect(
        h.fetchRelayr.mock.calls.filter(([, init]) => init?.method === "POST"),
      ).toHaveLength(1);
      expect(h.sendPayment).toHaveBeenCalledOnce();
    },
  );

  it("retire an eligible disjoint quote only for a journal with one session slot", async () => {
    const h = harness();
    h.store.scope = "single-session";
    const first = await h.controller.prepare({
      account: ACCOUNT,
      executions: [execution()],
    });
    h.setBundleUuid(NEXT_BUNDLE);
    const next = await h.controller.prepare({
      account: ACCOUNT,
      executions: [execution(10)],
    });
    expect(next.session.executions).toEqual([execution(10)]);
    expect(h.sessions.get(first.session.id)?.releaseReason).toBe(
      "quote-replaced",
    );
  });

  it("keeps a funded disjoint selection in a journal with only one session slot", async () => {
    const h = harness();
    h.store.scope = "single-session";
    const first = await h.controller.prepare({
      account: ACCOUNT,
      executions: [execution()],
    });
    h.sessions.get(first.session.id)!.paymentStatus = "sending";
    h.review.mockClear();
    await expect(
      h.controller.prepare({ account: ACCOUNT, executions: [execution(10)] }),
    ).rejects.toBeInstanceOf(SafeRelayrRecoveryError);
    expect(h.sessions.get(first.session.id)).toMatchObject({
      state: "active",
      paymentStatus: "sending",
    });
    expect(h.sessions.size).toBe(1);
    expect(h.review).not.toHaveBeenCalled();
  });

  it.each(["funded", "running", "malformed records"])(
    "preserves %s evidence even if a later Relayr read says unpaid and pending",
    async (observed) => {
      const h = harness();
      const ready = await h.controller.prepare({
        account: ACCOUNT,
        executions: [execution()],
      });
      if (observed === "funded") h.setPaymentReceived(true);
      if (observed === "running")
        h.setRecords([
          {
            tx_uuid: IDS[0],
            request: execution().entry,
            status: { state: "Running" },
          },
        ]);
      if (observed === "malformed records")
        h.setRecords("malformed" as unknown as RelayrTransactionRecord[]);
      const checked = h.controller.check({
        account: ACCOUNT,
        sessionId: ready.session.id,
      });
      if (observed === "malformed records")
        await expect(checked).rejects.toThrow();
      else expect((await checked).state).toBe("pending");
      expect(h.sessions.get(ready.session.id)?.fundingObserved).toBe(true);
      h.setPaymentReceived(false);
      h.setRecords([
        {
          tx_uuid: IDS[0],
          request: execution().entry,
          status: { state: "Pending" },
        },
      ]);
      expect(canReplaceSafeRelayrQuote(h.sessions.get(ready.session.id)!)).toBe(
        false,
      );
      await expect(
        h.controller.prepare({
          account: ACCOUNT,
          executions: [execution(), execution(10)],
        }),
      ).rejects.toBeInstanceOf(SafeRelayrRecoveryError);
      expect(
        h.fetchRelayr.mock.calls.filter(([, init]) => init?.method === "POST"),
      ).toHaveLength(1);
      expect(h.sendPayment).not.toHaveBeenCalled();
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
    saved.paymentStatus = "sending";
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

  it("shows final payment checking only after the nested review resolves", async () => {
    const h = harness();
    const ready = await h.controller.prepare({
      account: ACCOUNT,
      executions: [execution()],
    });
    const reviewEntered = deferred(),
      accepted = deferred(),
      checking = deferred(),
      checked = deferred();
    const adapter = h.sendPayment.getMockImplementation()!;
    h.sendPayment.mockImplementationOnce(async (options) => {
      reviewEntered.resolve();
      await accepted.promise;
      return adapter(options);
    });
    h.revalidate.mockImplementationOnce(async () => {
      checking.resolve();
      await checked.promise;
    });
    h.onProgress.mockClear();
    const funded = h.controller.fund({
      account: ACCOUNT,
      sessionId: ready.session.id,
      paymentChainId: 1,
    });
    await reviewEntered.promise;
    expect(h.onProgress.mock.calls.slice(-1)[0][0]).toMatchObject({
      type: "phase",
      phase: "payment-review",
    });
    accepted.resolve();
    await checking.promise;
    expect(h.onProgress.mock.calls.slice(-1)[0][0]).toMatchObject({
      type: "phase",
      phase: "payment-checking",
    });
    expect(h.order).not.toContain("save:active:sending");
    checked.resolve();
    await funded;
    expect(h.sendPayment).toHaveBeenCalledOnce();
  });

  it.each(["complete", "funding-confirmed"])(
    "recovers a saved adapter proof error through fresh %s evidence",
    async (outcome) => {
      const h = harness();
      const calls = [execution(), execution(10)];
      const hashes = [BLOCK, WRONG_BLOCK];
      const ready = await h.controller.prepare({
        account: ACCOUNT,
        executions: calls,
      });
      const adapter = h.sendPayment.getMockImplementation()!;
      h.sendPayment.mockImplementationOnce(async (options) => {
        await adapter(options);
        h.setRecords(destinationRecords(calls, hashes));
        mineSafe(h, calls[1], hashes[1]);
        if (outcome === "complete") mineSafe(h, calls[0], hashes[0]);
        else h.mined();
        throw new Error("Wallet adapter proof unavailable");
      });
      const recovered = await h.controller.fund({
        account: ACCOUNT,
        sessionId: ready.session.id,
        paymentChainId: 1,
      });
      expect(recovered.state).toBe(
        outcome === "complete" ? "complete" : "pending",
      );
      if (outcome === "funding-confirmed")
        expect(recovered.session.paymentStatus).toBe("confirmed");
      expect(recovered.session.payments[0].hash).toBe(HASH);
      expect(recovered.session.records).toEqual(
        destinationRecords(calls, hashes),
      );
      expect(
        h.onProgress.mock.calls.some(
          ([event]) =>
            event.type === "execution" &&
            event.index === 1 &&
            event.status === "executed",
        ),
      ).toBe(true);
      expect(h.sendPayment).toHaveBeenCalledOnce();
      expect(
        h.fetchRelayr.mock.calls.filter(([, init]) => init?.method === "POST"),
      ).toHaveLength(1);
      await expect(
        h.controller.fund({
          account: ACCOUNT,
          sessionId: ready.session.id,
          paymentChainId: 1,
        }),
      ).rejects.toBeInstanceOf(SafeRelayrRecoveryError);
      expect(h.sendPayment).toHaveBeenCalledOnce();
    },
  );

  it("keeps the original adapter diagnostic and new partial evidence when funding is unresolved", async () => {
    const h = harness();
    const calls = [execution(), execution(10)];
    const hashes = [BLOCK, WRONG_BLOCK];
    const ready = await h.controller.prepare({
      account: ACCOUNT,
      executions: calls,
    });
    const adapter = h.sendPayment.getMockImplementation()!;
    h.sendPayment.mockImplementationOnce(async (options) => {
      await adapter(options);
      h.setPaymentReceived(true);
      h.setRecords(destinationRecords(calls, hashes));
      mineSafe(h, calls[1], hashes[1]);
      throw new Error("Original funding diagnostic");
    });
    await expect(
      h.controller.fund({
        account: ACCOUNT,
        sessionId: ready.session.id,
        paymentChainId: 1,
      }),
    ).rejects.toMatchObject({
      message: "Original funding diagnostic",
      session: {
        fundingObserved: true,
        paymentStatus: "submitted",
        payments: [expect.objectContaining({ hash: HASH })],
        records: destinationRecords(calls, hashes),
      },
    });
    expect(
      h.onProgress.mock.calls.some(
        ([event]) =>
          event.type === "execution" &&
          event.index === 1 &&
          event.status === "executed",
      ),
    ).toBe(true);
    expect(h.sendPayment).toHaveBeenCalledOnce();
  });

  it("keeps the original adapter diagnostic if post-submission inspection fails", async () => {
    const h = harness();
    const ready = await h.controller.prepare({
      account: ACCOUNT,
      executions: [execution()],
    });
    const adapter = h.sendPayment.getMockImplementation()!;
    h.sendPayment.mockImplementationOnce(async (options) => {
      await adapter(options);
      h.fetchRelayr.mockRejectedValueOnce(new Error("Inspection failed"));
      throw new Error("Original funding diagnostic");
    });
    await expect(
      h.controller.fund({
        account: ACCOUNT,
        sessionId: ready.session.id,
        paymentChainId: 1,
      }),
    ).rejects.toMatchObject({
      message: "Original funding diagnostic",
      session: { payments: [expect.objectContaining({ hash: HASH })] },
    });
  });

  it.each(["ready", "released"])(
    "never returns %s as a successful send recovery",
    async (outcome) => {
      const h = harness();
      const ready = await h.controller.prepare({
        account: ACCOUNT,
        executions: [execution()],
      });
      const adapter = h.sendPayment.getMockImplementation()!;
      h.sendPayment.mockImplementationOnce(async (options) => {
        await adapter(options);
        h.mined({ status: "reverted" });
        if (outcome === "released") {
          h.setTimestamp(BigInt(DEADLINE + 1));
          vi.mocked(Date.now).mockReturnValue((DEADLINE + 60) * 1_000);
        }
        throw new Error("Original funding diagnostic");
      });
      await expect(
        h.controller.fund({
          account: ACCOUNT,
          sessionId: ready.session.id,
          paymentChainId: 1,
        }),
      ).rejects.toMatchObject({
        message: "Original funding diagnostic",
        session: { state: outcome === "released" ? "released" : "active" },
      });
    },
  );

  it.each(["first", "replacement"])(
    "never masks failed %s hash persistence with receipt success",
    async (attempt) => {
      const h = harness();
      const ready = await h.controller.prepare({
        account: ACCOUNT,
        executions: [execution()],
      });
      const save = vi.mocked(h.store.save).getMockImplementation()!;
      let submitted = 0;
      vi.mocked(h.store.save).mockImplementation(async (session) => {
        if (
          session.paymentStatus === "submitted" &&
          ++submitted === (attempt === "first" ? 1 : 2)
        )
          throw new Error("Payment save failed");
        await save(session);
      });
      const adapter = h.sendPayment.getMockImplementation()!;
      h.sendPayment.mockImplementationOnce(async (options) => {
        const sent = await adapter(options);
        await options.onSent([
          ...sent.payments,
          { ...sent.payments[0], hash: WRONG_BLOCK },
        ]);
        return sent;
      });
      h.mined();
      await expect(
        h.controller.fund({
          account: ACCOUNT,
          sessionId: ready.session.id,
          paymentChainId: 1,
        }),
      ).rejects.toThrow("Payment save failed");
      expect(h.client.getTransaction).not.toHaveBeenCalled();
      expect(h.sessions.get(ready.session.id)?.payments).toHaveLength(
        attempt === "first" ? 0 : 1,
      );
      expect(h.sendPayment).toHaveBeenCalledOnce();
    },
  );

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

  it.each(["all succeed", "last lacks Safe proof"])(
    "passes each canonical receipt to its app guard after that Safe proof: %s",
    async (outcome) => {
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
          logs:
            index === calls.length - 1 && outcome === "last lacks Safe proof"
              ? []
              : [
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
      const checked = h.controller.check({
        account: ACCOUNT,
        sessionId: ready.session.id,
      });
      if (outcome === "all succeed") {
        expect((await checked).state).toBe("complete");
        expect(h.afterVerified.mock.calls.map(([call]) => call)).toEqual(calls);
        calls.forEach((call, index) =>
          expect(h.afterVerified).toHaveBeenNthCalledWith(index + 1, call, {
            txUuid: IDS[index],
            chainId: call.entry.chain,
            receipt: expect.objectContaining({
              transactionHash: hashes[index],
              blockHash: BLOCK,
              status: "success",
            }),
          }),
        );
      } else {
        await expect(checked).rejects.toThrow();
        expect(h.afterVerified).toHaveBeenCalledOnce();
        expect(h.afterVerified.mock.calls[0][0]).toEqual(calls[0]);
        expect(h.sessions.get(ready.session.id)?.state).toBe("active");
      }
      expect(h.sendPayment).not.toHaveBeenCalled();
    },
  );

  it.each([
    "missing event",
    "wrong hash",
    "failure event",
    "reverted receipt",
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
        status: outcome === "reverted receipt" ? "reverted" : "success",
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
        expect(h.afterVerified).toHaveBeenCalledWith(
          call,
          expect.objectContaining({
            txUuid: IDS[0],
            chainId: call.entry.chain,
            receipt: expect.objectContaining({
              transactionHash: HASH,
              blockHash: BLOCK,
              status: "success",
            }),
          }),
        );
      } else if (outcome === "noncanonical") {
        expect((await checked).state).toBe("pending");
        expect(h.sessions.get(ready.session.id)?.state).toBe("active");
        expect(h.afterVerified).not.toHaveBeenCalled();
      } else {
        await expect(checked).rejects.toThrow();
        expect(h.sessions.get(ready.session.id)?.state).toBe("active");
        expect(h.afterVerified).not.toHaveBeenCalled();
      }
      expect(h.sendPayment).not.toHaveBeenCalled();
    },
  );
});

describe("standalone Safe Relayr landing proof", () => {
  async function landed() {
    const h = harness();
    const executions = [execution(), execution(10)];
    const hashes = [HASH, WRONG_BLOCK];
    const ready = await h.controller.prepare({ account: ACCOUNT, executions });
    executions.forEach((call, index) => mineSafe(h, call, hashes[index]));
    return {
      h,
      executions,
      bindings: ready.session.quote!.expectedTransactions,
      records: destinationRecords(executions, hashes),
    };
  }

  it("proves the exact saved calls and returns ordered canonical Safe receipts", async () => {
    const { h, ...proof } = await landed();
    const verified = await verifySafeRelayrLanding(
      () => h.client as unknown as RelayrReleaseClient,
      {
        ...proof,
        records: [...proof.records].reverse(),
      },
    );
    expect(
      verified.map(({ txUuid, chainId, receipt }) => [
        txUuid,
        chainId,
        receipt.transactionHash,
      ]),
    ).toEqual([
      [IDS[0], 1, HASH],
      [IDS[1], 10, WRONG_BLOCK],
    ]);
    expect(h.sendPayment).not.toHaveBeenCalled();
  });

  it.each(["missing binding", "different call"])(
    "refuses a %s before reading any transaction",
    async (kind) => {
      const { h, ...proof } = await landed();
      if (kind === "missing binding") proof.bindings.pop();
      else proof.bindings[0].entry.data = "0xffff";
      await expect(
        verifySafeRelayrLanding(
          () => h.client as unknown as RelayrReleaseClient,
          proof,
        ),
      ).rejects.toThrow("bindings do not match");
      expect(h.client.getTransaction).not.toHaveBeenCalled();
      expect(h.client.getTransactionReceipt).not.toHaveBeenCalled();
    },
  );

  it("retains the typed unavailable proof for callers without treating it as success", async () => {
    const { h, ...proof } = await landed();
    h.client.getTransactionReceipt.mockRejectedValueOnce(new Error("RPC lag"));
    await expect(
      verifySafeRelayrLanding(
        () => h.client as unknown as RelayrReleaseClient,
        proof,
      ),
    ).rejects.toBeInstanceOf(RelayrProofUnavailableError);
    expect(h.sendPayment).not.toHaveBeenCalled();
  });
});

describe("Safe Relayr live progress", () => {
  it.each(["duplicate", "malformed"])(
    "reports %s destination hashes as a failed proof without losing funding evidence",
    async (kind) => {
      const h = harness();
      const calls = [execution(), execution(10)];
      const ready = await h.controller.prepare({
        account: ACCOUNT,
        executions: calls,
      });
      h.setPaymentReceived(true);
      h.setRecords(
        destinationRecords(calls, [
          HASH,
          kind === "duplicate" ? HASH : "0x1234",
        ]),
      );
      const error = await h.controller
        .check({ account: ACCOUNT, sessionId: ready.session.id })
        .catch((error) => error);
      expect(error).toBeInstanceOf(SafeRelayrRecoveryError);
      expect(error.session.fundingObserved).toBe(true);
      expect(h.sessions.get(ready.session.id)?.records).toEqual(
        error.session.records,
      );
      const failed = h.onProgress.mock.calls.flatMap(([event]) =>
        event.type === "execution" && event.status === "failed"
          ? [event.index]
          : [],
      );
      expect(failed).toEqual([0, 1]);
      expect(h.client.getTransaction).not.toHaveBeenCalled();
      expect(h.sendPayment).not.toHaveBeenCalled();
    },
  );

  it("continues other chains when a destination's RPC client is unavailable", async () => {
    const h = harness();
    const calls = [execution(), execution(10)];
    const ready = await h.controller.prepare({
      account: ACCOUNT,
      executions: calls,
    });
    mineSafe(h, calls[0], HASH);
    h.setRecords(destinationRecords(calls, [HASH, WRONG_BLOCK]));
    h.setClientFor((chainId) =>
      chainId === 1 ? (h.client as unknown as RelayrReleaseClient) : undefined,
    );
    const checked = await h.controller.check({
      account: ACCOUNT,
      sessionId: ready.session.id,
    });
    expect(checked.state).toBe("pending");
    expect(
      h.onProgress.mock.calls.some(
        ([event]) =>
          event.type === "execution" &&
          event.index === 1 &&
          event.status === "confirming" &&
          event.message?.includes("connection"),
      ),
    ).toBe(true);
    expect(
      h.onProgress.mock.calls.some(
        ([event]) =>
          event.type === "execution" &&
          event.index === 0 &&
          event.status === "executed",
      ),
    ).toBe(true);
    expect(canReplaceSafeRelayrQuote(checked.session)).toBe(false);
    expect(h.sendPayment).not.toHaveBeenCalled();
  });

  it("persists a legacy execution observation before a later pending response can overwrite it", async () => {
    const h = harness();
    const ready = await h.controller.prepare({
      account: ACCOUNT,
      executions: [execution()],
    });
    h.sessions.get(ready.session.id)!.records = [
      {
        tx_uuid: IDS[0],
        request: execution().entry,
        status: { state: "Running" },
      },
    ];
    const checked = await h.controller.check({
      account: ACCOUNT,
      sessionId: ready.session.id,
    });
    expect(checked.state).toBe("pending");
    expect(checked.session.records![0].status?.state).toBe("Pending");
    expect(checked.session.fundingObserved).toBe(true);
    expect(h.sessions.get(ready.session.id)?.fundingObserved).toBe(true);
    expect(canReplaceSafeRelayrQuote(checked.session)).toBe(false);
  });

  it.each(["check", "fund"] as const)(
    "keeps newly observed funding in the %s recovery error after invalid returned bindings",
    async (method) => {
      const h = harness();
      const ready = await h.controller.prepare({
        account: ACCOUNT,
        executions: [execution()],
      });
      h.setPaymentReceived(true);
      h.setRecords([
        {
          tx_uuid: IDS[1],
          request: execution().entry,
          status: { state: "Running" },
        },
      ]);
      const failed =
        method === "check"
          ? h.controller.check({
              account: ACCOUNT,
              sessionId: ready.session.id,
            })
          : h.controller.fund({
              account: ACCOUNT,
              sessionId: ready.session.id,
              paymentChainId: 1,
            });
      const error = await failed.catch((error) => error);
      expect(error).toBeInstanceOf(SafeRelayrRecoveryError);
      expect(error.session.fundingObserved).toBe(true);
      expect(error.session).toEqual(h.sessions.get(ready.session.id));
      expect(canReplaceSafeRelayrQuote(error.session)).toBe(false);
      expect(h.sendPayment).not.toHaveBeenCalled();
    },
  );

  it("shows hashless reported failures while requiring a later exact receipt before success", async () => {
    const h = harness();
    const call = execution();
    const ready = await h.controller.prepare({
      account: ACCOUNT,
      executions: [call],
    });
    h.setRecords([
      { tx_uuid: IDS[0], request: call.entry, status: { state: "Failed" } },
    ]);
    expect(
      (
        await h.controller.check({
          account: ACCOUNT,
          sessionId: ready.session.id,
        })
      ).state,
    ).toBe("pending");
    expect(
      h.onProgress.mock.calls.some(
        ([event]) =>
          event.type === "execution" &&
          event.status === "failed" &&
          event.hash === undefined,
      ),
    ).toBe(true);
    expect(h.afterVerified).not.toHaveBeenCalled();
    mineSafe(h, call, HASH);
    h.setRecords([
      {
        tx_uuid: IDS[0],
        request: call.entry,
        status: { state: "Failed", data: { hash: HASH } },
      },
    ]);
    expect(
      (
        await h.controller.check({
          account: ACCOUNT,
          sessionId: ready.session.id,
        })
      ).state,
    ).toBe("complete");
    expect(
      h.onProgress.mock.calls.some(
        ([event]) =>
          event.type === "execution" &&
          event.status === "executed" &&
          event.hash === HASH,
      ),
    ).toBe(true);
  });

  it("does not show an executing phase for released payment history", async () => {
    const h = harness();
    const ready = await h.controller.prepare({
      account: ACCOUNT,
      executions: [execution()],
    });
    h.sessions.get(ready.session.id)!.state = "released";
    h.sessions.get(ready.session.id)!.fundingObserved = true;
    h.onProgress.mockClear();
    expect(
      (
        await h.controller.check({
          account: ACCOUNT,
          sessionId: ready.session.id,
        })
      ).state,
    ).toBe("released");
    expect(h.onProgress).not.toHaveBeenCalled();
  });

  it("starts quoting only after accepted review and reports durable payment phases", async () => {
    const h = harness();
    const entered = deferred();
    const accepted = deferred();
    h.review.mockImplementationOnce(async () => {
      entered.resolve();
      await accepted.promise;
    });
    const prepared = h.controller.prepare({
      account: ACCOUNT,
      executions: [execution()],
    });
    await entered.promise;
    expect(
      h.onProgress.mock.calls.map(
        ([event]) => event.type === "phase" && event.phase,
      ),
    ).toEqual(["reviewing"]);
    expect(h.fetchRelayr).not.toHaveBeenCalled();
    accepted.resolve();
    const ready = await prepared;
    expect(h.onProgress.mock.calls.slice(-1)[0]?.[0]).toMatchObject({
      type: "phase",
      phase: "quoting",
    });
    h.onProgress.mockClear();
    await h.controller.fund({
      account: ACCOUNT,
      sessionId: ready.session.id,
      paymentChainId: 1,
    });
    const phases = h.onProgress.mock.calls.flatMap(([event]) =>
      event.type === "phase" ? [event.phase] : [],
    );
    expect(phases.indexOf("payment-review")).toBeLessThan(
      phases.indexOf("payment-submitting"),
    );
    expect(phases.indexOf("payment-submitting")).toBeLessThan(
      phases.indexOf("payment-confirming"),
    );
    const submitted = h.onProgress.mock.calls.find(
      ([event]) =>
        event.type === "phase" && event.phase === "payment-confirming",
    )![0];
    expect(submitted.session?.payments).toHaveLength(1);
    expect(h.sessions.get(ready.session.id)?.payments).toEqual(
      submitted.session?.payments,
    );
  });

  it.each(["sync", "async"])(
    "isolates %s observer failure and mutations from calls and funding",
    async (kind) => {
      const h = harness();
      const call = execution();
      h.onProgress.mockImplementation((event) => {
        if (event.session) event.session.executions[0].entry.data = "0xffff";
        if (kind === "async")
          return Promise.reject(new Error("display failed"));
        throw new Error("display failed");
      });
      const ready = await h.controller.prepare({
        account: ACCOUNT,
        executions: [call],
      });
      expect(ready.session.executions).toEqual([call]);
      const paid = await h.controller.fund({
        account: ACCOUNT,
        sessionId: ready.session.id,
        paymentChainId: 1,
      });
      expect(paid.session.payments).toHaveLength(1);
      expect(paid.session.executions).toEqual([call]);
      expect(h.sendPayment).toHaveBeenCalledOnce();
    },
  );

  it("reports each available chain before a slower chain finishes its receipt read", async () => {
    const h = harness();
    const calls = [
      execution(),
      execution(10),
      execution(8453),
      execution(42161),
    ];
    const hashes = [HASH, BLOCK, WRONG_BLOCK, `0x${"12".repeat(32)}` as Hex];
    const ready = await h.controller.prepare({
      account: ACCOUNT,
      executions: calls,
    });
    calls.forEach((call, index) => mineSafe(h, call, hashes[index]));
    h.setRecords(destinationRecords(calls, hashes));
    const slow = deferred();
    const faster = deferred();
    const read = h.client.getTransaction.getMockImplementation()!;
    h.client.getTransaction.mockImplementation(async (args) => {
      if (args.hash === hashes[0]) await slow.promise;
      return read(args);
    });
    h.onProgress.mockImplementation((event) => {
      if (
        event.type === "execution" &&
        event.index === 3 &&
        event.status === "executed"
      )
        faster.resolve();
    });
    const checked = h.controller.check({
      account: ACCOUNT,
      sessionId: ready.session.id,
    });
    await faster.promise;
    expect(
      h.afterVerified.mock.calls.map(([call]) => call.entry.chain),
    ).toEqual([10, 8453, 42161]);
    expect(
      h.onProgress.mock.calls.some(
        ([event]) =>
          event.type === "execution" &&
          event.index === 0 &&
          event.status === "executed",
      ),
    ).toBe(false);
    slow.resolve();
    expect((await checked).state).toBe("complete");
    expect(h.onProgress.mock.calls.slice(-1)[0]?.[0]).toMatchObject({
      type: "phase",
      phase: "complete",
    });
  });

  it("verifies a reported hash before every chain has one and does not regress an unchanged proven row", async () => {
    const h = harness();
    const calls = [execution(), execution(10)];
    const ready = await h.controller.prepare({
      account: ACCOUNT,
      executions: calls,
    });
    mineSafe(h, calls[0], HASH);
    h.setRecords(destinationRecords(calls, [HASH, undefined]));
    expect(
      (
        await h.controller.check({
          account: ACCOUNT,
          sessionId: ready.session.id,
        })
      ).state,
    ).toBe("pending");
    expect(
      h.onProgress.mock.calls.some(
        ([event]) =>
          event.type === "execution" &&
          event.index === 0 &&
          event.status === "executed" &&
          event.hash === HASH,
      ),
    ).toBe(true);
    h.onProgress.mockClear();
    expect(
      (
        await h.controller.check({
          account: ACCOUNT,
          sessionId: ready.session.id,
        })
      ).state,
    ).toBe("pending");
    expect(
      h.onProgress.mock.calls.filter(
        ([event]) => event.type === "execution" && event.index === 0,
      ),
    ).toHaveLength(0);
    expect(h.afterVerified).toHaveBeenCalledTimes(2);
    h.setCanonicalHash(WRONG_BLOCK);
    await h.controller.check({ account: ACCOUNT, sessionId: ready.session.id });
    expect(
      h.onProgress.mock.calls.some(
        ([event]) =>
          event.type === "execution" &&
          event.index === 0 &&
          event.status === "confirming",
      ),
    ).toBe(true);
    expect(h.sessions.get(ready.session.id)?.records).toEqual(
      destinationRecords(calls, [HASH, undefined]),
    );
    expect(h.sendPayment).not.toHaveBeenCalled();
  });

  it.each(["unavailable", "contradiction"])(
    "classifies the app postcondition as %s without skipping its proof",
    async (kind) => {
      const h = harness();
      const call = execution();
      const ready = await h.controller.prepare({
        account: ACCOUNT,
        executions: [call],
      });
      mineSafe(h, call, HASH);
      h.setRecords(destinationRecords([call], [HASH]));
      h.afterVerified.mockRejectedValueOnce(
        kind === "unavailable"
          ? new RelayrProofUnavailableError("Nonce RPC unavailable")
          : new Error("Safe nonce did not advance"),
      );
      const checked = h.controller.check({
        account: ACCOUNT,
        sessionId: ready.session.id,
      });
      if (kind === "unavailable") expect((await checked).state).toBe("pending");
      else
        await expect(checked).rejects.toBeInstanceOf(SafeRelayrRecoveryError);
      expect(h.onProgress.mock.calls.slice(-1)[0]?.[0]).toMatchObject({
        type: "execution",
        status: kind === "unavailable" ? "confirming" : "failed",
        hash: HASH,
      });
      expect(h.sessions.get(ready.session.id)?.state).toBe("active");
      expect(h.sendPayment).not.toHaveBeenCalled();
    },
  );
});

describe("Safe Relayr read-only progress polling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW * 1000);
  });

  it.each(["arrives", "timeout"])(
    "retains the paid bundle while a reported destination receipt %s",
    async (outcome) => {
      const h = harness();
      const calls = [
        execution(),
        execution(10),
        execution(8453),
        execution(42161),
      ];
      const hashes = [
        BLOCK,
        WRONG_BLOCK,
        `0x${"12".repeat(32)}` as Hex,
        `0x${"34".repeat(32)}` as Hex,
      ];
      const ready = await h.controller.prepare({
        account: ACCOUNT,
        executions: calls,
      });
      h.mined();
      const adapter = h.sendPayment.getMockImplementation()!;
      h.sendPayment.mockImplementationOnce(async (options) => {
        const paid = await adapter(options);
        h.setPaymentReceived(true);
        h.setRecords(destinationRecords(calls, hashes));
        calls
          .slice(1)
          .forEach((call, index) => mineSafe(h, call, hashes[index + 1]));
        return paid;
      });
      const paid = await h.controller.fund({
        account: ACCOUNT,
        sessionId: ready.session.id,
        paymentChainId: 1,
      });
      expect(paid.state).toBe("pending");
      expect(paid.session.paymentStatus).toBe("confirmed");
      expect(paid.session.payments).toHaveLength(1);
      expect(
        h.onProgress.mock.calls.some(
          ([event]) =>
            event.type === "execution" &&
            event.index === 0 &&
            event.status === "confirming",
        ),
      ).toBe(true);
      expect(
        h.onProgress.mock.calls.some(
          ([event]) =>
            event.type === "execution" &&
            event.index === 3 &&
            event.status === "executed",
        ),
      ).toBe(true);
      h.onProgress.mockClear();
      const first = deferred();
      const watched = h.controller.watch({
        account: ACCOUNT,
        sessionId: ready.session.id,
        intervalMs: 100,
        timeoutMs: 200,
        onUpdate: () => first.resolve(),
      });
      await first.promise;
      expect(h.onProgress.mock.calls[0][0]).toMatchObject({
        type: "phase",
        phase: "executing",
      });
      if (outcome === "arrives") mineSafe(h, calls[0], hashes[0]);
      await vi.advanceTimersByTimeAsync(200);
      const final = await watched;
      expect(final.state).toBe(outcome === "arrives" ? "complete" : "pending");
      expect(final.session.payments).toEqual(paid.session.payments);
      expect(h.sessions.get(ready.session.id)?.records).toEqual(
        destinationRecords(calls, hashes),
      );
      expect(h.sendPayment).toHaveBeenCalledOnce();
      expect(
        h.fetchRelayr.mock.calls.filter(([, init]) => init?.method === "POST"),
      ).toHaveLength(1);
      expect(canReplaceSafeRelayrQuote(final.session)).toBe(false);
      expect(vi.getTimerCount()).toBe(0);
    },
  );

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
    h.onProgress.mockClear();
    abort.abort();
    gate.resolve();
    await rejection;
    expect(onUpdate).not.toHaveBeenCalled();
    expect(h.onProgress).not.toHaveBeenCalled();
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
