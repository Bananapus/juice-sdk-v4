import {
  encodeAbiParameters,
  encodeFunctionData,
  getAddress,
  toEventSelector,
  TransactionNotFoundError,
  TransactionReceiptNotFoundError,
  zeroAddress,
  type Address,
  type Hex,
} from "viem";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { encodeMultiSend, MULTI_SEND_CALL_ONLY_DEPLOYMENTS } from "./safe.js";
import { uniswapV4Deployment } from "./v6/uniswapV4Deployments.js";
import {
  atOnceExecution,
  canonicalSafeTxHash,
  chainAnswer,
  findPendingSafeAppProposal,
  heldCall,
  lookAtSafeProposal,
  readSafeAppExecution,
  reportedSafeExecution,
  requireSafeProposalSuccess,
  SAFE_EXEC_ABI,
  SAFE_PROPOSAL_AWAITING,
  SAFE_PROPOSAL_UNCONFIRMED,
  safeExecutionRunsCalls,
  safeProposalFor,
  safeTransactionRunsCalls,
  stampedDeadline,
  watchSafeProposal,
  type SafeAppCall,
} from "./safeService.js";

const HASH = `0x${"ab".repeat(32)}` as Hex;
const STAMPED_CHAIN = 10;
const TARGET = "0x3333333333333333333333333333333333333333" as Address;
const STAMPED_DEPLOYMENT = uniswapV4Deployment(STAMPED_CHAIN)!;
const STAMPED_SITES: readonly [
  string,
  (stamp: bigint, other?: bigint) => SafeAppCall,
][] = [
  [
    "Universal Router execute",
    (stamp, other = 0n) => ({
      to: STAMPED_DEPLOYMENT.universalRouter!,
      data: `0x3593564c${encodeAbiParameters([{ type: "bytes" }, { type: "bytes[]" }, { type: "uint256" }], ["0x01", [`0x${other.toString(16).padStart(2, "0")}`], stamp]).slice(2)}`,
    }),
  ],
  [
    "PositionManager modifyLiquidities",
    (stamp, other = 0n) => ({
      to: STAMPED_DEPLOYMENT.positionManager!,
      data: `0xdd46508f${encodeAbiParameters([{ type: "bytes" }, { type: "uint256" }], [`0x${other.toString(16).padStart(2, "0")}`, stamp]).slice(2)}`,
    }),
  ],
  [
    "Permit2 authorization",
    (stamp, other = 0n) => ({
      to: STAMPED_DEPLOYMENT.permit2,
      data: `0x87517c45${encodeAbiParameters([{ type: "address" }, { type: "address" }, { type: "uint160" }, { type: "uint48" }], [TARGET, TARGET, other + 1n, Number(stamp)]).slice(2)}`,
    }),
  ],
];
const revertsOnceStampPasses = (site: string) =>
  !site.includes("authorization");
/** Service proposals encode values in wei; app journals may persist them as decimal strings. */
const proposalFor = (call: SafeAppCall, nonce: number) =>
  safeProposalFor({ ...call, value: BigInt(call.value ?? 0n) }, nonce);
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("Safe app execution", () => {
  const SAFE = "0x1111111111111111111111111111111111111111" as Address;
  const OWNER = "0x2222222222222222222222222222222222222222" as Address;
  const TARGET = "0x5555555555555555555555555555555555555555" as Address;
  const OTHER = "0x6666666666666666666666666666666666666666" as Address;
  /** The execution's own transaction hash, which Safe{Wallet} returns when it executes at once. */
  const EXECUTION = `0x${"cd".repeat(32)}` as Hex;
  /** The safeTxHash the Safe's own event names. */
  const SAFE_TX = `0x${"ef".repeat(32)}` as Hex;
  const CALL = { to: TARGET, data: "0x1234" as Hex, value: 5n };
  const SECOND = { to: OTHER, data: "0x5678" as Hex, value: 0n };

  const receipt = (safeTxHash: Hex) => ({
    status: "success" as const,
    transactionHash: EXECUTION,
    logs: [
      {
        address: SAFE,
        topics: [
          toEventSelector("ExecutionSuccess(bytes32,uint256)"),
          safeTxHash,
        ],
        data: `0x${"00".repeat(32)}` as Hex,
      },
    ],
  });
  const execTransaction = (
    to: Address,
    value: bigint,
    data: Hex,
    operation: number,
  ) =>
    encodeFunctionData({
      abi: SAFE_EXEC_ABI,
      functionName: "execTransaction",
      args: [
        to,
        value,
        data,
        operation,
        0n,
        0n,
        0n,
        zeroAddress,
        zeroAddress,
        "0x",
      ],
    });
  /** A chain whose transaction EXECUTION calls `to` with `input`. */
  const chain = (input: Hex, to: Address | null = SAFE) => ({
    getTransaction: vi.fn(async () => ({ to, input, from: OWNER })),
  });
  const atOnce = (
    client: ReturnType<typeof chain>,
    calls: readonly (typeof CALL)[] = [CALL],
  ) =>
    readSafeAppExecution({
      client,
      receipt: receipt(SAFE_TX),
      safe: SAFE,
      proposalHash: EXECUTION,
      calls,
    });

  it("binds an execution Safe{Wallet} returned at once to exactly the reviewed call", async () => {
    const client = chain(execTransaction(TARGET, 5n, "0x1234", 0));
    await expect(atOnce(client)).resolves.toMatchObject({ status: "success" });
    expect(client.getTransaction).toHaveBeenCalledWith({ hash: EXECUTION });
  });

  it.each([
    ["other calldata", chain(execTransaction(TARGET, 5n, "0xdead", 0))],
    ["another value", chain(execTransaction(TARGET, 6n, "0x1234", 0))],
    ["another target", chain(execTransaction(OTHER, 5n, "0x1234", 0))],
    [
      "a DELEGATECALL of the call",
      chain(execTransaction(TARGET, 5n, "0x1234", 1)),
    ],
    [
      "a call to another contract",
      chain(execTransaction(TARGET, 5n, "0x1234", 0), OTHER),
    ],
    [
      "a contract creation",
      chain(execTransaction(TARGET, 5n, "0x1234", 0), null),
    ],
    ["something other than execTransaction", chain("0xd4d9bdcd" as Hex)],
  ])(
    "leaves an execution returned at once unproven when it ran %s",
    async (_, client) => {
      await expect(atOnce(client)).resolves.toMatchObject({
        status: "unproven",
      });
    },
  );

  it("leaves it unproven when the chain cannot show the execution", async () => {
    const client = {
      getTransaction: vi.fn(async () => {
        throw new Error("not found");
      }),
    };
    await expect(
      atOnce(client as unknown as ReturnType<typeof chain>),
    ).resolves.toMatchObject({ status: "unproven" });
  });

  // Safe{Wallet} batches a 1.4.1 Safe through MultiSendCallOnly 1.4.1, and a
  // 1.3.0 Safe through 1.3.0's canonical or EIP-155 deployment.
  it.each(MULTI_SEND_CALL_ONLY_DEPLOYMENTS)(
    "binds a batch to MultiSendCallOnly %s running exactly the reviewed calls, in order",
    async (multiSend) => {
      const batch = (calls: (typeof CALL)[], value = 0n) =>
        chain(execTransaction(multiSend, value, encodeMultiSend(calls), 1));
      await expect(
        atOnce(batch([CALL, SECOND]), [CALL, SECOND]),
      ).resolves.toMatchObject({ status: "success" });
      await expect(
        atOnce(batch([SECOND, CALL]), [CALL, SECOND]),
      ).resolves.toMatchObject({ status: "unproven" });
      await expect(
        atOnce(batch([CALL]), [CALL, SECOND]),
      ).resolves.toMatchObject({ status: "unproven" });
      await expect(
        atOnce(batch([CALL, SECOND], 1n), [CALL, SECOND]),
      ).resolves.toMatchObject({ status: "unproven" });
    },
  );

  it("leaves a batch DELEGATECALLed into any other contract unproven", async () => {
    const client = chain(
      execTransaction(OTHER, 0n, encodeMultiSend([CALL, SECOND]), 1),
    );
    await expect(atOnce(client, [CALL, SECOND])).resolves.toMatchObject({
      status: "unproven",
    });
  });

  it("reads a proposal executed later from the Safe's event for it, without the transaction", async () => {
    const client = chain("0x");
    await expect(
      readSafeAppExecution({
        client,
        receipt: receipt(SAFE_TX),
        safe: SAFE,
        proposalHash: SAFE_TX,
        calls: [CALL],
      }),
    ).resolves.toMatchObject({ status: "success" });
    expect(client.getTransaction).not.toHaveBeenCalled();
  });
});

/** These fixtures are already encoded calls. App tests exercise every builder's calls. */
const callOf = (call: SafeAppCall): SafeAppCall => call;

/** A send's stamp, and the stamp the same action takes when it is sent 30 days later. */
const NOW = 1_800_000_000n;
const LATER = NOW + 30n * 86_400n;

describe("the call a Safe proposal holds", () => {
  it.each(STAMPED_SITES)("is %s whatever its send-time stamp", (_, build) => {
    const first = callOf(build(NOW));
    const later = callOf(build(LATER));
    expect(later.data).not.toBe(first.data);
    expect(heldCall(later)).toEqual(heldCall(first));
  });

  it.each(STAMPED_SITES)("tells %s apart by any other field", (_, build) => {
    expect(heldCall(callOf(build(NOW, 1n)))).not.toEqual(
      heldCall(callOf(build(NOW))),
    );
  });

  it.each(STAMPED_SITES)(
    "names the deadline of %s only where the contract refuses the call once it passes",
    (site, build) => {
      expect(stampedDeadline(callOf(build(NOW)), STAMPED_CHAIN)).toBe(
        revertsOnceStampPasses(site) ? NOW : null,
      );
    },
  );

  it.each(STAMPED_SITES.slice(0, 2))(
    "requires the canonical %s target on the specified chain before trusting its deadline",
    (_, build) => {
      const call = build(NOW);
      expect(stampedDeadline(call)).toBeNull();
      expect(stampedDeadline(call, 999)).toBeNull();
      expect(stampedDeadline(call, 1)).toBeNull();
      expect(
        stampedDeadline({ ...call, to: TARGET }, STAMPED_CHAIN),
      ).toBeNull();
      expect(
        stampedDeadline({ ...call, to: getAddress(call.to) }, STAMPED_CHAIN),
      ).toBe(NOW);
    },
  );

  it("holds any other call, or a stamped call encoded any other way, exactly as sent", () => {
    const transfer = {
      to: "0x2222222222222222222222222222222222222222" as Address,
      data: "0xa9059cbb" as Hex,
      value: 0n,
    };
    expect(heldCall(transfer)).toEqual(transfer);
    expect(stampedDeadline(transfer)).toBeNull();
    const sale = callOf(STAMPED_SITES[0][1](NOW));
    const padded = { ...sale, data: `${sale.data}00` as Hex };
    expect(heldCall(padded)).toEqual(padded);
    expect(stampedDeadline(padded)).toBeNull();
  });
});

describe("the Safe's queue, asked before a proposal", () => {
  const SAFE = "0x1111111111111111111111111111111111111111" as Address;
  const word = (value: bigint) => `0x${value.toString(16).padStart(64, "0")}`;
  /** The chain, with the Safe at nonce 5 and its latest block at `timestamp`. */
  const chain = (timestamp = NOW) => ({
    request: vi.fn(async ({ method }: { method: string }) => {
      if (method !== "eth_call") throw new Error(`unexpected ${method}`);
      return word(5n);
    }),
    getBlock: vi.fn(async () => ({ number: 100n, timestamp })),
  });
  /** Safe's service, queueing `calls` from nonce 5 on. */
  const queue = (calls: SafeAppCall[]) => ({
    fetch: vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            next: null,
            results: calls.map((call, index) => {
              const tx = proposalFor(call, 5 + index);
              return {
                ...tx,
                safeTxHash: canonicalSafeTxHash(STAMPED_CHAIN, SAFE, tx),
              };
            }),
          }),
        ),
    ),
  });
  const lookup = (call: SafeAppCall, queued: SafeAppCall[], timestamp = NOW) =>
    findPendingSafeAppProposal(
      chain(timestamp) as never,
      STAMPED_CHAIN,
      SAFE,
      call,
      queue(queued),
    );

  it.each(STAMPED_SITES)(
    "finds %s queued with an older stamp",
    async (_, build) => {
      const queued = callOf(build(NOW + 600n));
      await expect(
        lookup(callOf(build(LATER)), [queued]),
      ).resolves.toMatchObject({
        tx: { nonce: 5 },
        proposalHash: canonicalSafeTxHash(
          STAMPED_CHAIN,
          SAFE,
          proposalFor(queued, 5),
        ),
        call: {
          ...queued,
          to: getAddress(queued.to),
          value: queued.value ?? 0n,
        },
      });
    },
  );

  it.each(STAMPED_SITES)(
    "passes over %s queued with a deadline the chain passed, only where it reverts",
    async (site, build) => {
      const passed = callOf(build(NOW - 1n));
      const live = callOf(build(NOW + 600n));
      const found = await lookup(callOf(build(LATER)), [passed, live]);
      expect(found?.call.data).toBe(
        revertsOnceStampPasses(site) ? live.data : passed.data,
      );
      // A deadline the latest block only reached may still run in the next block.
      await expect(
        lookup(callOf(build(LATER)), [callOf(build(NOW))]),
      ).resolves.not.toBeNull();
    },
  );

  it.each(STAMPED_SITES.slice(0, 2))(
    "keeps an arbitrary destination queued despite %s-shaped calldata with an old deadline",
    async (_, build) => {
      // An EOA can receive this value with any calldata; its last argument
      // does not cause a revert merely because a router would enforce it.
      const queued = { ...build(NOW - 1n), to: TARGET, value: 5n };
      await expect(lookup(queued, [queued])).resolves.not.toBeNull();
    },
  );

  it("keeps a deadline-bound proposal queued without a numbered block for the nonce read", async () => {
    const queued = STAMPED_SITES[0][1](NOW - 1n);
    await expect(
      findPendingSafeAppProposal(
        {
          ...chain(),
          getBlock: async () => ({ number: null, timestamp: NOW }),
        } as never,
        STAMPED_CHAIN,
        SAFE,
        queued,
        queue([queued]),
      ),
    ).resolves.not.toBeNull();
  });

  it("reads the queue as of one block: its time, and the Safe nonce in it", async () => {
    // The proposal executes, before its deadline, while the queue is being read;
    // the chain then moves past that deadline.
    const [, sale] = STAMPED_SITES[0];
    const queued = callOf(sale(NOW + 60n));
    let executed = false;
    const client = {
      request: vi.fn(async ({ method }: { method: string }) => {
        if (method !== "eth_call") throw new Error(`unexpected ${method}`);
        return word(executed ? 6n : 5n);
      }),
      getBlock: vi.fn(async () => ({
        number: 100n,
        timestamp: executed ? NOW + 120n : NOW,
      })),
    };
    const service = queue([queued]);
    service.fetch.mockImplementation(async () => {
      executed = true;
      const tx = proposalFor(queued, 5);
      return new Response(
        JSON.stringify({
          next: null,
          results: [
            { ...tx, safeTxHash: canonicalSafeTxHash(STAMPED_CHAIN, SAFE, tx) },
          ],
        }),
      );
    });
    // The proposal the queue listed is found, never passed over and proposed again.
    await expect(
      findPendingSafeAppProposal(
        client as never,
        STAMPED_CHAIN,
        SAFE,
        callOf(sale(LATER)),
        service,
      ),
    ).resolves.toMatchObject({ tx: { nonce: 5 } });
    expect(client.getBlock.mock.invocationCallOrder[0]).toBeLessThan(
      client.request.mock.invocationCallOrder[0],
    );
    expect(
      (client.request.mock.calls[0][0] as unknown as { params: unknown[] })
        .params[1],
    ).toBe("0x64");
  });

  it.each(STAMPED_SITES)(
    "never finds %s queued with any other field changed",
    async (_, build) => {
      await expect(
        lookup(callOf(build(LATER)), [callOf(build(NOW + 600n, 1n))]),
      ).resolves.toBeNull();
    },
  );
});

describe("a proposal awaiting its signers", () => {
  const SAFE = "0x1111111111111111111111111111111111111111" as Address;
  const word = (value: bigint) => `0x${value.toString(16).padStart(64, "0")}`;
  const [, sale] = STAMPED_SITES[0];
  const authorization = STAMPED_SITES.find(([site]) =>
    site.includes("authorization"),
  )![1];
  const chainState = { nonce: 5n, timestamp: NOW, failing: false };
  /** The chain: the Safe's nonce and the latest block (number 100) as `chainState` has them. */
  const chain = () => ({
    request: vi.fn(
      async ({ method }: { method: string; params: unknown[] }) => {
        if (method !== "eth_call" || chainState.failing)
          throw new Error("fetch failed");
        return word(chainState.nonce);
      },
    ),
    getBlock: vi.fn(async () => ({
      number: 100n,
      timestamp: chainState.timestamp,
    })),
  });
  /** Safe's service, with its record of `call` proposed at nonce 5. */
  const service = (call: SafeAppCall, record: Record<string, unknown> = {}) => {
    const tx = proposalFor(call, 5);
    const hash = canonicalSafeTxHash(STAMPED_CHAIN, SAFE, tx);
    return {
      hash,
      options: {
        fetch: vi.fn(
          async () =>
            new Response(
              JSON.stringify({
                ...tx,
                safe: SAFE,
                safeTxHash: hash,
                isExecuted: false,
                ...record,
              }),
            ),
        ),
      },
    };
  };
  const look = (
    call: SafeAppCall,
    record?: Record<string, unknown>,
    client = chain(),
  ) => {
    const { hash, options } = service(call, record);
    return lookAtSafeProposal(
      client as never,
      STAMPED_CHAIN,
      SAFE,
      hash,
      options,
    );
  };

  beforeEach(() => {
    Object.assign(chainState, { nonce: 5n, timestamp: NOW, failing: false });
  });

  it("is expired once the latest block passed its deadline with the Safe short of its nonce", async () => {
    const client = chain();
    await expect(look(callOf(sale(NOW - 1n)), undefined, client)).resolves.toBe(
      "expired",
    );
    // The nonce is the Safe's in the block whose time passed the deadline.
    expect(client.request.mock.calls[0][0].params[1]).toBe("0x64");
  });

  it("is live while the next block can still run it, and whatever a Permit2 expiration says", async () => {
    await expect(look(callOf(sale(NOW)))).resolves.toBe("live");
    await expect(look(callOf(authorization(NOW - 1n)))).resolves.toBe("live");
  });

  it.each(STAMPED_SITES.slice(0, 2))(
    "keeps an arbitrary destination live despite %s-shaped calldata with an old deadline",
    async (_, build) => {
      await expect(
        look({ ...build(NOW - 1n), to: TARGET, value: 5n }),
      ).resolves.toBe("live");
    },
  );

  it("keeps a deadline-bound proposal live without a numbered block for the nonce read", async () => {
    const client = {
      ...chain(),
      getBlock: async () => ({ number: null, timestamp: NOW }),
    };
    await expect(
      look(sale(NOW - 1n), undefined, client as never),
    ).resolves.toBe("live");
    expect(client.request).not.toHaveBeenCalled();
  });

  it("is passed once the Safe's nonce is past it with no execution of it listed", async () => {
    chainState.nonce = 6n;
    await expect(look(callOf(authorization(NOW + 600n)))).resolves.toBe(
      "passed",
    );
    await expect(look(callOf(sale(NOW - 1n)))).resolves.toBe("passed");
    await expect(
      look(callOf(sale(NOW + 600n)), {
        isExecuted: true,
        transactionHash: HASH,
      }),
    ).resolves.toBe("live");
  });

  it("is live when the chain or the service cannot answer", async () => {
    chainState.failing = true;
    await expect(look(callOf(sale(NOW - 1n)))).resolves.toBe("live");
    chainState.failing = false;
    const { hash } = service(callOf(sale(NOW - 1n)));
    const down = {
      fetch: vi.fn(async () => new Response("unavailable", { status: 503 })),
    };
    await expect(
      lookAtSafeProposal(chain() as never, STAMPED_CHAIN, SAFE, hash, down),
    ).resolves.toBe("live");
  });

  describe("watched", () => {
    const watch = (
      call: SafeAppCall,
      client = chain(),
      signal = new AbortController().signal,
    ) => {
      const { hash, options } = service(call);
      return watchSafeProposal(
        client as never,
        STAMPED_CHAIN,
        SAFE,
        hash,
        signal,
        options,
      );
    };

    it("ends expired at the first look, a minute in, that finds its deadline passed", async () => {
      vi.useFakeTimers();
      chainState.timestamp = NOW + 30n;
      let ended: string | undefined;
      void watch(callOf(sale(NOW + 60n))).then((end) => (ended = end));
      await vi.advanceTimersByTimeAsync(60_000);
      expect(ended).toBeUndefined();
      chainState.timestamp = NOW + 61n;
      await vi.advanceTimersByTimeAsync(60_000);
      expect(ended).toBe("expired");
    });

    it.each([
      ["a value transfer", { to: TARGET, data: "0x" as Hex, value: 5n }],
      ["a swap whose deadline has passed", callOf(sale(NOW - 1n))],
    ])(
      "keeps %s unresolved when its execution may be missing from the service",
      async (_, call) => {
        vi.useFakeTimers();
        // This proposal executed and consumed its nonce, but its authenticated
        // service record still says isExecuted=false. Time cannot distinguish
        // that indexing delay from a different proposal consuming the nonce.
        chainState.nonce = 6n;
        const client = chain();
        const controller = new AbortController();
        const ended = vi.fn();
        const watching = watch(call, client, controller.signal);
        void watching.then(ended, ended);

        await vi.advanceTimersByTimeAsync(31 * 60_000);
        expect(ended).not.toHaveBeenCalled();
        expect(client.request).toHaveBeenCalledTimes(31);
        controller.abort();
        await expect(watching).rejects.toThrow(/aborted/i);
      },
    );

    it.each(["unavailable", "reporting execution"])(
      "leaves execution to the receipt reader when the service becomes %s",
      async (state) => {
        vi.useFakeTimers();
        chainState.nonce = 6n;
        const client = chain();
        const controller = new AbortController();
        const call = callOf(authorization(NOW + 600n));
        const { hash, options } = service(call);
        const ended = vi.fn();
        const watching = watchSafeProposal(
          client as never,
          STAMPED_CHAIN,
          SAFE,
          hash,
          controller.signal,
          options,
        );
        void watching.then(ended, ended);
        await vi.advanceTimersByTimeAsync(10 * 60_000);
        options.fetch.mockImplementation(
          state === "unavailable"
            ? async () => new Response("unavailable", { status: 503 })
            : service(call, { isExecuted: true, transactionHash: HASH }).options
                .fetch,
        );
        await vi.advanceTimersByTimeAsync(21 * 60_000);
        expect(ended).not.toHaveBeenCalled();
        expect(client.request).toHaveBeenCalledTimes(31);
        controller.abort();
        await expect(watching).rejects.toThrow(/aborted/i);
      },
    );

    it("stops looking when its signal aborts", async () => {
      vi.useFakeTimers();
      const client = chain();
      const controller = new AbortController();
      const watching = watch(
        callOf(sale(NOW + 600n)),
        client,
        controller.signal,
      );
      const settled = expect(watching).rejects.toThrow(/aborted/i);
      await vi.advanceTimersByTimeAsync(60_000);
      controller.abort();
      await settled;
      await vi.advanceTimersByTimeAsync(10 * 60_000);
      expect(client.getBlock).toHaveBeenCalledTimes(1);
    });
  });
});

describe("an execution Safe{Wallet} returned at once", () => {
  it("is found when the node learns it within five looks, two seconds apart", async () => {
    vi.useFakeTimers();
    const client = {
      getTransaction: vi
        .fn()
        .mockRejectedValueOnce(new TransactionNotFoundError({ hash: HASH }))
        .mockRejectedValueOnce(new Error("fetch failed"))
        .mockResolvedValue({ hash: HASH }),
    };
    const found = atOnceExecution(client, HASH);
    await vi.advanceTimersByTimeAsync(4_000);
    await expect(found).resolves.toEqual({ hash: HASH });
    expect(client.getTransaction).toHaveBeenCalledTimes(3);
  });

  it("is taken as a proposal once five looks over eight seconds find no transaction", async () => {
    vi.useFakeTimers();
    const client = {
      getTransaction: vi
        .fn()
        .mockRejectedValue(new TransactionNotFoundError({ hash: HASH })),
    };
    let answer: unknown;
    void atOnceExecution(client, HASH).then((found) => (answer = found));
    await vi.advanceTimersByTimeAsync(7_999);
    expect(answer).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1);
    expect(answer).toBeNull();
    expect(client.getTransaction).toHaveBeenCalledTimes(5);
  });
});

describe("an execution Safe's service reports failed", () => {
  const SAFE = "0x1111111111111111111111111111111111111111" as Address;
  const FAILED = new Error(
    "Safe executed the proposal, but the onchain transaction failed.",
  );
  const call = {
    to: "0x2222222222222222222222222222222222222222" as Address,
    data: "0x1234" as Hex,
    value: 0n,
  };
  const tx = proposalFor(call, 5);
  const hash = canonicalSafeTxHash(STAMPED_CHAIN, SAFE, tx);
  const service = (record: Record<string, unknown>) => ({
    fetch: vi.fn(
      async () =>
        new Response(
          JSON.stringify({ ...tx, safe: SAFE, safeTxHash: hash, ...record }),
        ),
    ),
  });

  it("is the execution the service's authenticated record names, for its receipt to decide", async () => {
    const options = service({
      isExecuted: true,
      isSuccessful: false,
      transactionHash: HASH,
    });
    await expect(
      reportedSafeExecution(FAILED, STAMPED_CHAIN, SAFE, hash, options),
    ).resolves.toBe(HASH);
  });

  it("is unknown when the record names none, or cannot be read", async () => {
    await expect(
      reportedSafeExecution(
        FAILED,
        STAMPED_CHAIN,
        SAFE,
        hash,
        service({ isExecuted: true, transactionHash: null }),
      ),
    ).resolves.toBeNull();
    const down = {
      fetch: vi.fn(async () => new Response("", { status: 503 })),
    };
    await expect(
      reportedSafeExecution(FAILED, STAMPED_CHAIN, SAFE, hash, down),
    ).resolves.toBeNull();
  });

  it("is never read for any other error", async () => {
    const options = service({ isExecuted: true, transactionHash: HASH });
    await expect(
      reportedSafeExecution(
        new Error("Safe service unavailable"),
        STAMPED_CHAIN,
        SAFE,
        hash,
        options,
      ),
    ).resolves.toBeNull();
    expect(options.fetch).not.toHaveBeenCalled();
  });
});

describe("the chain's last word before a proposal ends unproven", () => {
  it("is what the chain shows", async () => {
    await expect(chainAnswer(async () => ({ hash: HASH }))).resolves.toEqual({
      hash: HASH,
    });
  });

  it("is none when the chain says it has none", async () => {
    await expect(
      chainAnswer(() =>
        Promise.reject(new TransactionNotFoundError({ hash: HASH })),
      ),
    ).resolves.toBeNull();
    await expect(
      chainAnswer(() =>
        Promise.reject(new TransactionReceiptNotFoundError({ hash: HASH })),
      ),
    ).resolves.toBeNull();
  });

  it("waits a minute and asks again when the node can't answer, as long as it takes", async () => {
    vi.useFakeTimers();
    const read = vi
      .fn()
      .mockRejectedValueOnce(new Error("fetch failed"))
      .mockRejectedValueOnce(new Error("HTTP 503"))
      .mockResolvedValue({ hash: HASH });
    let answer: unknown;
    void chainAnswer(read).then((found) => (answer = found));
    await vi.advanceTimersByTimeAsync(59_999);
    expect(read).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(60_001);
    expect(answer).toEqual({ hash: HASH });
    expect(read).toHaveBeenCalledTimes(3);
  });

  it("asks again on a not-found too, for something the chain already proved exists, saying so before it waits", async () => {
    vi.useFakeTimers();
    const read = vi
      .fn()
      .mockRejectedValueOnce(new TransactionNotFoundError({ hash: HASH }))
      .mockResolvedValue({ hash: HASH });
    const onRetry = vi.fn();
    let answer: unknown;
    void chainAnswer(read, { exists: true, onRetry }).then(
      (found) => (answer = found),
    );
    await vi.advanceTimersByTimeAsync(0);
    expect(onRetry).toHaveBeenCalledOnce();
    expect(answer).toBeUndefined();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(answer).toEqual({ hash: HASH });
  });
});

describe("reviewed Safe proposal boundaries", () => {
  const SAFE = "0x1111111111111111111111111111111111111111" as Address;
  const call = { to: TARGET, data: "0x1234" as Hex };
  const execution = (
    operation = 0,
    value = 0n,
    data: Hex = call.data,
    to = TARGET,
  ) => ({
    to: SAFE,
    input: encodeFunctionData({
      abi: SAFE_EXEC_ABI,
      functionName: "execTransaction",
      args: [
        to,
        value,
        data,
        operation,
        0n,
        0n,
        0n,
        zeroAddress,
        zeroAddress,
        "0x",
      ],
    }),
  });
  const receipt = (event = "ExecutionSuccess") => ({
    status: "success",
    transactionHash: HASH,
    logs: [
      {
        address: SAFE,
        topics: [toEventSelector(`${event}(bytes32,uint256)`), HASH],
        data: `0x${"00".repeat(32)}`,
      },
    ],
  });
  const client = { getTransaction: vi.fn(async () => execution()) };

  it("compares persisted decimal values, omitted zero values and explicit batch policy", () => {
    expect(
      safeTransactionRunsCalls(
        { ...call, value: 5n, operation: 0 },
        [{ ...call, value: "5" }],
        false,
      ),
    ).toBe(true);
    expect(safeExecutionRunsCalls(execution(), SAFE, [call])).toBe(true);
    expect(
      safeTransactionRunsCalls({ ...call, value: 0n, operation: 0 }, []),
    ).toBe(false);
    for (const to of MULTI_SEND_CALL_ONLY_DEPLOYMENTS) {
      const tx = { to, data: encodeMultiSend([call]), value: 0n, operation: 1 };
      expect(safeTransactionRunsCalls(tx, [call])).toBe(true);
      expect(safeTransactionRunsCalls(tx, [call], false)).toBe(false);
      expect(
        safeExecutionRunsCalls(
          execution(1, 0n, tx.data, to),
          SAFE,
          [call],
          false,
        ),
      ).toBe(false);
    }
  });

  it("refuses absent input and other Safe entry points", () => {
    expect(safeExecutionRunsCalls({ to: SAFE }, SAFE, [call])).toBe(false);
    expect(
      safeExecutionRunsCalls(
        {
          to: SAFE,
          input: encodeFunctionData({
            abi: SAFE_EXEC_ABI,
            functionName: "approveHash",
            args: [HASH],
          }),
        },
        SAFE,
        [call],
      ),
    ).toBe(false);
  });

  it("requires proof of success, distinguishing failed, reverted and unproven receipts", async () => {
    const proof = { client, safe: SAFE, proposalHash: HASH, calls: [call] };
    await expect(
      requireSafeProposalSuccess(
        { ...proof, receipt: receipt() },
        "Call failed",
      ),
    ).resolves.toBeUndefined();
    await expect(
      requireSafeProposalSuccess(
        { ...proof, receipt: receipt("ExecutionFailure") },
        "Call failed",
      ),
    ).rejects.toThrow("Call failed");
    await expect(
      requireSafeProposalSuccess(
        { ...proof, receipt: { ...receipt(), status: "reverted" } },
        "Call failed",
      ),
    ).rejects.toThrow("Call failed");
    await expect(
      requireSafeProposalSuccess(
        { ...proof, receipt: { ...receipt(), logs: [] } },
        "Call failed",
      ),
    ).rejects.toThrow(SAFE_PROPOSAL_UNCONFIRMED);
    expect(SAFE_PROPOSAL_AWAITING).toMatch(/other signers can approve/);
    await expect(
      readSafeAppExecution({
        ...proof,
        receipt: { status: "success", logs: receipt().logs },
      }),
    ).resolves.toMatchObject({ status: "success" });
  });

  it("leaves a failed event unproven when it cannot bind the call, and honors the batch policy", async () => {
    const tx = execution(
      1,
      0n,
      encodeMultiSend([call]),
      MULTI_SEND_CALL_ONLY_DEPLOYMENTS[0],
    );
    await expect(
      readSafeAppExecution({
        client: { getTransaction: async () => tx },
        receipt: receipt(),
        safe: SAFE,
        proposalHash: HASH,
        calls: [call],
        batch: false,
      }),
    ).resolves.toMatchObject({ status: "unproven" });
    await expect(
      readSafeAppExecution({
        client: { getTransaction: async () => execution(0, 1n) },
        receipt: receipt("ExecutionFailure"),
        safe: SAFE,
        proposalHash: HASH,
        calls: [call],
      }),
    ).resolves.toMatchObject({ status: "unproven" });
  });

  it("holds malformed stamped arguments exactly as sent", () => {
    const malformed = { ...call, data: "0x3593564c" as Hex };
    expect(heldCall(malformed)).toBe(malformed);
    expect(stampedDeadline(malformed)).toBeNull();
  });

  const word = (nonce: bigint) => `0x${nonce.toString(16).padStart(64, "0")}`;
  const chain = (result = word(5n), number: bigint | null = 100n) => ({
    request: vi.fn(async () => result),
    getBlock: async () => ({ number, timestamp: NOW }),
  });
  const service = (fields: Record<string, unknown> = {}) => {
    const tx = { ...proposalFor(call, 5), ...fields };
    const hash = canonicalSafeTxHash(STAMPED_CHAIN, SAFE, tx);
    const record = { ...tx, safe: SAFE, safeTxHash: hash };
    return {
      hash,
      record,
      options: {
        fetch: vi.fn(async () => new Response(JSON.stringify(record))),
      },
      queue: {
        fetch: vi.fn(
          async () =>
            new Response(JSON.stringify({ next: null, results: [record] })),
        ),
      },
    };
  };

  it("checks nonce read failures, malformed answers and unsafe numbers before reading the queue", async () => {
    const queued = service();
    for (const client of [
      chain("0x"),
      chain(word(BigInt(Number.MAX_SAFE_INTEGER) + 1n)),
      {
        ...chain(),
        request: vi.fn(async () => {
          throw new Error("unavailable");
        }),
      },
    ]) {
      await expect(
        findPendingSafeAppProposal(
          client as never,
          STAMPED_CHAIN,
          SAFE,
          call,
          queued.queue,
        ),
      ).rejects.toThrow("Could not read the Safe nonce.");
    }
    expect(queued.queue.fetch).not.toHaveBeenCalled();
  });

  it("uses latest when the block number is unavailable and compares omitted zero values", async () => {
    const queued = service();
    const client = chain(word(5n), null);
    await expect(
      findPendingSafeAppProposal(
        client as never,
        STAMPED_CHAIN,
        SAFE,
        { ...call, value: 0n },
        queued.queue,
      ),
    ).resolves.toMatchObject({ proposalHash: queued.hash });
    await expect(
      lookAtSafeProposal(
        client as never,
        STAMPED_CHAIN,
        SAFE,
        queued.hash,
        queued.options,
      ),
    ).resolves.toBe("live");
    expect(client.request).toHaveBeenCalledWith(
      expect.objectContaining({ params: [expect.any(Object), "latest"] }),
    );
  });

  it("keeps proposals with unreadable nonces or other operation/refund fields live, outside the app queue match", async () => {
    const plain = service();
    await expect(
      lookAtSafeProposal(
        chain("0x") as never,
        STAMPED_CHAIN,
        SAFE,
        plain.hash,
        plain.options,
      ),
    ).resolves.toBe("live");
    const other = service({ operation: 1 });
    await expect(
      lookAtSafeProposal(
        chain() as never,
        STAMPED_CHAIN,
        SAFE,
        other.hash,
        other.options,
      ),
    ).resolves.toBe("live");
    await expect(
      findPendingSafeAppProposal(
        chain() as never,
        STAMPED_CHAIN,
        SAFE,
        call,
        other.queue,
      ),
    ).resolves.toBeNull();
    const refund = service({ gasPrice: "1" });
    await expect(
      findPendingSafeAppProposal(
        chain() as never,
        STAMPED_CHAIN,
        SAFE,
        call,
        refund.queue,
      ),
    ).resolves.toBeNull();
  });

  it("fails queue authentication and keeps an unauthenticated proposal live", async () => {
    const queued = service();
    const foreign = { ...queued.record, safe: TARGET };
    const options = {
      fetch: vi.fn(async () => new Response(JSON.stringify(foreign))),
    };
    const queue = {
      fetch: vi.fn(
        async () =>
          new Response(JSON.stringify({ next: null, results: [foreign] })),
      ),
    };
    await expect(
      findPendingSafeAppProposal(
        chain() as never,
        STAMPED_CHAIN,
        SAFE,
        call,
        queue,
      ),
    ).rejects.toThrow(/cannot be trusted/);
    await expect(
      lookAtSafeProposal(
        chain() as never,
        STAMPED_CHAIN,
        SAFE,
        queued.hash,
        options,
      ),
    ).resolves.toBe("live");
  });

  it("ignores non-error service reports and malformed reported transaction hashes", async () => {
    const queued = service({ transactionHash: "0x12" });
    await expect(
      reportedSafeExecution(
        "executed the proposal but failed",
        STAMPED_CHAIN,
        SAFE,
        queued.hash,
        queued.options,
      ),
    ).resolves.toBeNull();
    expect(queued.options.fetch).not.toHaveBeenCalled();
    await expect(
      reportedSafeExecution(
        new Error("executed the proposal but failed"),
        STAMPED_CHAIN,
        SAFE,
        queued.hash,
        queued.options,
      ),
    ).resolves.toBeNull();
  });
});
