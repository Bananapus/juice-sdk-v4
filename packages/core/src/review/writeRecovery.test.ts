import {
  encodeAbiParameters,
  encodeEventTopics,
  encodeFunctionData,
  parseAbi,
  zeroAddress,
  type Address,
  type Hex,
  type TransactionReceipt,
} from "viem";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  canonicalSafeTxHash,
  safeProposalFor,
  SAFE_EXEC_ABI,
} from "../safeService.js";
import { uniswapV4Deployment } from "../v6/uniswapV4Deployments.js";
import { encodeMultiSend, MULTI_SEND_CALL_ONLY } from "../safe.js";
import { submitReviewedContractWrite } from "./contractWrite.js";
import {
  createBrowserWriteRecovery,
  sameReviewedWrite,
  SubmittedWritePersistenceError,
  verifyReviewedWriteExpiry,
  verifyReviewedWriteReceipt,
  type ReviewedWriteRecoveryInput,
  type ReviewedWriteRecoveryRecord,
} from "./writeRecovery.js";

const ACCOUNT = "0x1111111111111111111111111111111111111111" as Address;
const TARGET = "0x2222222222222222222222222222222222222222" as Address;
const WRAPPER = "0x3333333333333333333333333333333333333333" as Address;
const HASH = `0x${"aa".repeat(32)}` as Hex;
const PROPOSAL = `0x${"bb".repeat(32)}` as Hex;
const BLOCK = `0x${"cc".repeat(32)}` as Hex;
const input: ReviewedWriteRecoveryInput = {
  chainId: 10,
  account: ACCOUNT,
  safe: false,
  call: { to: TARGET, data: "0xaabbccdd0001", value: 17n },
};
const saved: ReviewedWriteRecoveryRecord = {
  ...input,
  version: 1,
  id: "reservation",
  call: { ...input.call, value: "17" },
  hash: HASH,
};

function browser() {
  const values = new Map<string, string>();
  const active = new Set<string>();
  const storage = {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      values.delete(key);
    }),
  };
  const locks = {
    request: async <T>(
      key: string,
      _options: LockOptions,
      work: (lock: Lock | null) => Promise<T>,
    ): Promise<T> => {
      if (active.has(key)) return work(null);
      active.add(key);
      try {
        return await work({ name: key, mode: "exclusive" });
      } finally {
        active.delete(key);
      }
    },
  } as Pick<LockManager, "request">;
  return { values, storage, locks };
}

afterEach(() => vi.unstubAllGlobals());

describe("ordinary write recovery", () => {
  it("keeps a lost wallet reply durable through new instances and changed amount/quote", async () => {
    const options = browser();
    const journal = createBrowserWriteRecovery(input, options);
    const write = vi.fn(async () => {
      throw new Error("reply lost after broadcast");
    });
    await expect(
      journal.withLock(async () =>
        submitReviewedContractWrite({
          request: { chainId: 10 },
          expectedAccount: ACCOUNT,
          currentAccount: () => ACCOUNT,
          review: async () => {},
          switchChain: async () => {},
          simulate: async () => ({}),
          beforeWrite: () => journal.reserve(),
          onWriteRejected: () => journal.rejected(),
          write,
        }),
      ),
    ).rejects.toThrow("reply lost");
    for (const changed of [
      input,
      {
        ...input,
        safe: true,
        call: { ...input.call, value: 99n, data: "0xaabbccddffff" as Hex },
      },
    ]) {
      const reloaded = createBrowserWriteRecovery(changed, options);
      expect(reloaded.read()).toEqual(journal.read());
      await expect(
        reloaded.withLock(async () => reloaded.reserve()),
      ).rejects.toThrow("still unresolved");
      expect(sameReviewedWrite(reloaded.read()!, changed)).toBe(
        changed === input,
      );
    }
    expect(write).toHaveBeenCalledOnce();
    expect(journal.read()?.call.value).toBe("17");
  });

  it("coordinates tabs and requires locks for every mutation", async () => {
    const options = browser();
    const first = createBrowserWriteRecovery(input, options);
    const second = createBrowserWriteRecovery(input, options);
    for (const mutate of [
      () => first.reserve(),
      () => first.submitted(HASH),
      () => first.rejected(),
      () => first.clear(saved),
    ]) {
      expect(mutate).toThrow("browser lock");
    }
    await first.withLock(async () => {
      await expect(
        second.withLock(async () => second.reserve()),
      ).rejects.toThrow("another tab");
      first.reserve();
    });
    await expect(second.withLock(async () => second.reserve())).rejects.toThrow(
      "still unresolved",
    );
    vi.stubGlobal("navigator", undefined);
    await expect(
      createBrowserWriteRecovery(input, { storage: options.storage }).withLock(
        async () => {},
      ),
    ).rejects.toThrow("coordinate");
  });

  it("fails closed on missing, throwing, silently dropping, malformed and foreign-scope storage", async () => {
    vi.stubGlobal("localStorage", undefined);
    expect(() => createBrowserWriteRecovery(input).read()).toThrow(
      "unavailable",
    );
    for (const broken of ["throw", "drop"] as const) {
      const options = browser();
      options.storage.setItem.mockImplementation(() => {
        if (broken === "throw") throw new Error("quota exceeded");
      });
      const journal = createBrowserWriteRecovery(input, options);
      const wallet = vi.fn();
      await expect(
        journal.withLock(async () => {
          journal.reserve();
          wallet();
        }),
      ).rejects.toThrow();
      expect(wallet).not.toHaveBeenCalled();
    }
    const options = browser();
    const journal = createBrowserWriteRecovery(input, options);
    await journal.withLock(async () => journal.reserve());
    const [key] = options.values.keys();
    for (const raw of [
      "{",
      "null",
      JSON.stringify({ ...saved, chainId: 1 }),
      JSON.stringify({ ...saved, call: { ...saved.call, value: "-1" } }),
      JSON.stringify({ ...saved, hash: "0x1234" }),
    ]) {
      options.values.set(key, raw);
      expect(() => journal.read()).toThrow();
      await expect(
        journal.withLock(async () => journal.reserve()),
      ).rejects.toThrow();
      expect(options.values.get(key)).toBe(raw);
    }
  });

  it("clears only this instance's unsubmitted reservation and compares replacement identity", async () => {
    const options = browser();
    const journal = createBrowserWriteRecovery(input, options);
    await journal.withLock(async () => {
      journal.rejected();
      journal.reserve();
      journal.rejected();
      expect(journal.read()).toBeNull();
      const reserved = journal.reserve();
      const [key] = options.values.keys();
      options.values.set(
        key,
        JSON.stringify({ ...reserved, id: "other-attempt" }),
      );
      expect(() => journal.rejected()).toThrow("changed");
      expect(() => journal.clear(reserved)).toThrow("changed");
      expect(journal.read()?.id).toBe("other-attempt");
    });
  });

  it("persists returned identity and survives a failed persistence reply without releasing the reservation", async () => {
    const options = browser();
    const journal = createBrowserWriteRecovery(input, options);
    await journal.withLock(async () => {
      journal.reserve();
      expect(() => journal.submitted("0x1234")).toThrow("invalid");
      const record = journal.submitted(HASH);
      journal.rejected();
      expect(createBrowserWriteRecovery(input, options).read()).toEqual(record);
      expect(() => journal.submitted(PROPOSAL)).toThrow("changed");
      options.storage.removeItem.mockImplementationOnce(() => {});
      expect(() => journal.clear(record)).toThrow("did not clear");
      journal.clear(record);
      expect(journal.read()).toBeNull();
      journal.reserve();
      options.storage.setItem.mockImplementationOnce(() => {
        throw new Error("storage offline");
      });
      expect(() => journal.submitted(HASH)).toThrow(
        SubmittedWritePersistenceError,
      );
      expect(journal.read()?.hash).toBe(HASH);
      expect(JSON.parse([...options.values.values()][0]).hash).toBeUndefined();
    });
    const reloaded = createBrowserWriteRecovery(input, options);
    await expect(
      reloaded.withLock(async () => reloaded.reserve()),
    ).rejects.toThrow("still unresolved");
  });

  it("retains the exact adopted call and refuses a different action scope", async () => {
    const options = browser();
    const journal = createBrowserWriteRecovery(
      { ...input, safe: true },
      options,
    );
    const actualCall = { ...input.call, data: "0xaabbccdd0002" as Hex };
    await journal.withLock(async () => {
      expect(() => journal.reserve({ ...actualCall, to: WRAPPER })).toThrow(
        "different recovery scope",
      );
      const actual = journal.reserve(actualCall);
      expect(actual.call.data).toBe(actualCall.data);
      expect(journal.read()?.call.data).toBe(actualCall.data);
    });
  });

  it("keeps a returned hash in memory after storage failure, retries it exactly and never relabels a conflicting record", async () => {
    for (const failure of ["read", "write", "readback"] as const) {
      const options = browser();
      const journal = createBrowserWriteRecovery(input, options);
      let known: ReviewedWriteRecoveryRecord | undefined;
      await journal.withLock(async () => {
        journal.reserve();
        if (failure === "write")
          options.storage.setItem.mockImplementationOnce(() => {
            throw new Error("quota");
          });
        else if (failure === "read")
          options.storage.getItem.mockImplementationOnce(() => {
            throw new Error("blocked");
          });
        else
          options.storage.getItem
            .mockImplementationOnce((key) => options.values.get(key) ?? null)
            .mockImplementationOnce(() => {
              throw new Error("readback lost");
            });
        try {
          journal.submitted(HASH);
        } catch (error) {
          expect(error).toBeInstanceOf(SubmittedWritePersistenceError);
          known = (error as SubmittedWritePersistenceError).record;
        }
        expect(known?.hash).toBe(HASH);
        journal.rejected();
        expect(journal.read()).not.toBeNull();
      });
      const reloaded = createBrowserWriteRecovery(input, options);
      expect(reloaded.read()).toEqual(known);
      await reloaded.withLock(async () => {
        if (failure !== "readback")
          expect(() => reloaded.clear(known!)).toThrow("changed");
        const retried = reloaded.submitted(HASH, known);
        expect(retried).toEqual(known);
        expect(reloaded.submitted(HASH, known)).toEqual(known);
        const [key] = options.values.keys();
        options.values.set(
          key,
          JSON.stringify({ ...known, id: "replacement" }),
        );
        expect(() => reloaded.submitted(HASH, known)).toThrow("changed");
        try {
          reloaded.submitted(HASH, known);
        } catch (error) {
          expect(error).not.toBeInstanceOf(SubmittedWritePersistenceError);
        }
      });
    }
  });

  it("cleans only its own partial pre-wallet marker after readback failure", async () => {
    for (const persistent of [false, true]) {
      const options = browser();
      const journal = createBrowserWriteRecovery(input, options);
      const wallet = vi.fn();
      if (persistent)
        options.storage.getItem.mockImplementation(() => {
          throw new Error("storage blocked");
        });
      options.storage.getItem
        .mockImplementationOnce(() => null)
        .mockImplementationOnce(() => {
          throw new Error("readback failed");
        });
      await expect(
        journal.withLock(async () => {
          journal.reserve();
          wallet();
        }),
      ).rejects.toThrow("readback failed");
      expect(wallet).not.toHaveBeenCalled();
      if (persistent) {
        expect(options.values.size).toBe(1);
        options.storage.getItem.mockImplementation(
          (key) => options.values.get(key) ?? null,
        );
        await journal.withLock(async () => journal.rejected());
      }
      expect(journal.read()).toBeNull();
    }
  });

  it("isolates chain/account/target/selector and rejects invalid reviewed inputs", async () => {
    const options = browser();
    const first = createBrowserWriteRecovery(input, options);
    await first.withLock(async () => first.reserve());
    for (const changed of [
      { ...input, chainId: 1 },
      { ...input, account: WRAPPER },
      { ...input, call: { ...input.call, to: WRAPPER } },
      { ...input, call: { ...input.call, data: "0x11223344" as Hex } },
    ])
      expect(createBrowserWriteRecovery(changed, options).read()).toBeNull();
    for (const changed of [
      { ...input, chainId: 0 },
      { ...input, account: "0x12" as Address },
      { ...input, call: { ...input.call, value: -1n } },
      { ...input, call: { ...input.call, data: "0x123" as Hex } },
    ])
      expect(() => createBrowserWriteRecovery(changed, options)).toThrow(
        "Invalid",
      );
  });
});

function chain() {
  const receipt = {
    transactionHash: HASH,
    blockHash: BLOCK,
    blockNumber: 7n,
    transactionIndex: 0,
    from: ACCOUNT,
    to: WRAPPER,
    status: "success",
    logs: [],
  } as unknown as TransactionReceipt;
  const transaction = {
    hash: HASH,
    chainId: 10,
    from: ACCOUNT,
    to: WRAPPER,
    input: "0x1234" as Hex,
    blockHash: BLOCK,
    blockNumber: 7n,
    transactionIndex: 0,
  };
  const client = {
    getChainId: vi.fn(async () => 10),
    getTransaction: vi.fn(async () => transaction),
    getTransactionReceipt: vi.fn(async () => receipt),
    getBlock: vi.fn(
      async (_args: { blockNumber?: bigint; blockTag?: "finalized" }) => ({
        hash: BLOCK,
        number: 7n,
        timestamp: 100n,
      }),
    ),
  };
  return { receipt, transaction, client };
}

function safeChain(failed = false) {
  const fixture = chain();
  fixture.transaction.to = ACCOUNT;
  fixture.receipt.to = ACCOUNT;
  fixture.transaction.input = encodeFunctionData({
    abi: SAFE_EXEC_ABI,
    functionName: "execTransaction",
    args: [
      TARGET,
      17n,
      input.call.data,
      0,
      0n,
      0n,
      0n,
      zeroAddress,
      zeroAddress,
      "0x",
    ],
  });
  fixture.receipt.logs = [
    {
      address: ACCOUNT,
      data: encodeAbiParameters(
        [{ type: "bytes32" }, { type: "uint256" }],
        [PROPOSAL, 0n],
      ),
      topics: [
        encodeEventTopics({
          abi: parseAbi([
            `event ${failed ? "ExecutionFailure" : "ExecutionSuccess"}(bytes32 txHash, uint256 payment)`,
          ]),
        })[0],
      ],
      transactionHash: HASH,
      blockHash: BLOCK,
      blockNumber: 7n,
      transactionIndex: 0,
      logIndex: 0,
      removed: false,
    },
  ];
  return fixture;
}

describe("reviewed receipt recovery proof", () => {
  it("accepts the recorded ordinary wallet hash through a wrapper, never an arbitrary historical match", async () => {
    const { client, receipt } = chain();
    await expect(
      verifyReviewedWriteReceipt(client, saved, receipt),
    ).resolves.toBe("success");
    expect(client.getTransactionReceipt).toHaveBeenCalledWith({ hash: HASH });
    await expect(
      verifyReviewedWriteReceipt(client, { ...saved, hash: PROPOSAL }, receipt),
    ).rejects.toThrow("pending");
    await expect(
      verifyReviewedWriteReceipt(
        client,
        { ...saved, hash: undefined },
        receipt,
      ),
    ).rejects.toThrow("pending");
  });

  it("refuses contradictory receipt, transaction, chain and canonical block evidence", async () => {
    for (const alter of [
      (run: ReturnType<typeof chain>) => {
        run.client.getChainId.mockResolvedValue(1);
      },
      (run: ReturnType<typeof chain>) => {
        run.transaction.chainId = 1;
      },
      (run: ReturnType<typeof chain>) => {
        run.transaction.hash = PROPOSAL;
      },
      (run: ReturnType<typeof chain>) => {
        run.transaction.blockHash = PROPOSAL;
      },
      (run: ReturnType<typeof chain>) => {
        run.transaction.blockNumber = 8n;
      },
      (run: ReturnType<typeof chain>) => {
        run.transaction.from = TARGET;
      },
      (run: ReturnType<typeof chain>) => {
        run.transaction.transactionIndex = 1;
      },
      (run: ReturnType<typeof chain>) => {
        run.client.getBlock.mockResolvedValue({
          hash: PROPOSAL,
          number: 7n,
          timestamp: 100n,
        });
      },
      (run: ReturnType<typeof chain>) => {
        run.client.getBlock.mockResolvedValue({
          hash: BLOCK,
          number: 8n,
          timestamp: 100n,
        });
      },
      (run: ReturnType<typeof chain>) => {
        run.client.getTransactionReceipt.mockResolvedValue({
          ...run.receipt,
          status: "reverted",
        });
      },
    ]) {
      const run = chain();
      alter(run);
      await expect(
        verifyReviewedWriteReceipt(run.client, saved, run.receipt),
      ).rejects.toThrow("pending");
    }
  });

  it("requires canonical finality before releasing a reverted ordinary write", async () => {
    const run = chain();
    run.receipt.status = "reverted";
    run.client.getBlock.mockResolvedValueOnce({
      hash: BLOCK,
      number: 6n,
      timestamp: 100n,
    });
    await expect(
      verifyReviewedWriteReceipt(run.client, saved, run.receipt),
    ).rejects.toThrow("pending");
    run.client.getBlock.mockRejectedValueOnce(
      new Error("finality unsupported"),
    );
    await expect(
      verifyReviewedWriteReceipt(run.client, saved, run.receipt),
    ).rejects.toThrow("pending");
    await expect(
      verifyReviewedWriteReceipt(run.client, saved, run.receipt),
    ).resolves.toBe("failed");
    expect(run.client.getBlock).toHaveBeenCalledWith({ blockTag: "finalized" });
    run.client.getBlock.mockResolvedValueOnce({
      hash: PROPOSAL,
      number: 7n,
      timestamp: 100n,
    });
    await expect(
      verifyReviewedWriteReceipt(run.client, saved, run.receipt),
    ).rejects.toThrow("pending");
  });

  it("proves exact Safe calls and events for both proposal and immediate-execution hashes", async () => {
    for (const hash of [PROPOSAL, HASH]) {
      const run = safeChain();
      const record = { ...saved, safe: true, hash };
      await expect(
        verifyReviewedWriteReceipt(run.client, record, run.receipt),
      ).resolves.toBe("success");
      if (hash === HASH)
        await expect(
          verifyReviewedWriteReceipt(
            run.client,
            { ...record, call: { ...record.call, value: "18" } },
            run.receipt,
          ),
        ).rejects.toThrow("pending");
      run.receipt.logs[0].removed = true;
      await expect(
        verifyReviewedWriteReceipt(run.client, record, run.receipt),
      ).rejects.toThrow("pending");
      run.receipt.logs[0].removed = false;
      run.receipt.logs[0].transactionHash = BLOCK;
      await expect(
        verifyReviewedWriteReceipt(run.client, record, run.receipt),
      ).rejects.toThrow("pending");
    }
  });

  it("settles only finalized Safe failure events, preserving reverted executors and missing events", async () => {
    const run = safeChain(true);
    const record = { ...saved, safe: true, hash: PROPOSAL };
    await expect(
      verifyReviewedWriteReceipt(run.client, record, run.receipt),
    ).resolves.toBe("failed");
    run.client.getBlock.mockRejectedValueOnce(new Error("not finalized"));
    await expect(
      verifyReviewedWriteReceipt(run.client, record, run.receipt),
    ).rejects.toThrow("pending");
    run.receipt.status = "reverted";
    await expect(
      verifyReviewedWriteReceipt(run.client, record, run.receipt),
    ).rejects.toThrow("pending");
    run.receipt.status = "success";
    run.receipt.logs = [];
    await expect(
      verifyReviewedWriteReceipt(run.client, record, run.receipt),
    ).rejects.toThrow("pending");
  });

  it("authenticates a known proposal through an executor wrapper without accepting another Safe event", async () => {
    const run = safeChain();
    run.transaction.to = WRAPPER;
    run.transaction.input = "0x1234";
    run.receipt.to = WRAPPER;
    await expect(
      verifyReviewedWriteReceipt(
        run.client,
        { ...saved, safe: true, hash: PROPOSAL },
        run.receipt,
      ),
    ).resolves.toBe("success");
    await expect(
      verifyReviewedWriteReceipt(
        run.client,
        { ...saved, safe: true, hash: BLOCK },
        run.receipt,
      ),
    ).rejects.toThrow("pending");
    await expect(
      verifyReviewedWriteReceipt(
        run.client,
        { ...saved, safe: true, hash: HASH },
        run.receipt,
      ),
    ).rejects.toThrow("pending");
  });

  it("proves the whole saved Safe batch for a domain journal's immediate execution", async () => {
    const run = safeChain();
    const record = { ...saved, safe: true };
    const calls = [
      { ...input.call, value: 17n },
      { to: WRAPPER, data: "0x11223344" as Hex, value: 2n },
    ];
    run.transaction.input = encodeFunctionData({
      abi: SAFE_EXEC_ABI,
      functionName: "execTransaction",
      args: [
        MULTI_SEND_CALL_ONLY,
        0n,
        encodeMultiSend(calls),
        1,
        0n,
        0n,
        0n,
        zeroAddress,
        zeroAddress,
        "0x",
      ],
    });
    await expect(
      verifyReviewedWriteReceipt(run.client, record, run.receipt, {
        calls,
        batch: true,
      }),
    ).resolves.toBe("success");
    for (const proof of [
      undefined,
      { calls, batch: false },
      { calls: [] },
      { calls: [...calls].reverse() },
      { calls: [calls[0], { ...calls[1], value: 3n }] },
    ]) {
      await expect(
        verifyReviewedWriteReceipt(run.client, record, run.receipt, proof),
      ).rejects.toThrow("pending");
    }
  });
});

describe("reviewed Safe expiry proof", () => {
  function expiring(target?: Address) {
    const call = {
      to: target ?? uniswapV4Deployment(10)!.universalRouter!,
      data: `0x3593564c${encodeAbiParameters([{ type: "bytes" }, { type: "bytes[]" }, { type: "uint256" }], ["0x01", ["0x00"], 99n]).slice(2)}` as Hex,
      value: 0n,
    };
    const proposal = {
      ...safeProposalFor(call, 5),
      safe: ACCOUNT,
      isExecuted: false,
    };
    const hash = canonicalSafeTxHash(10, ACCOUNT, proposal);
    const record: ReviewedWriteRecoveryRecord = {
      ...saved,
      safe: true,
      hash,
      call: { ...call, value: "0" },
    };
    const service = {
      fetch: vi.fn(async () => new Response(JSON.stringify(proposal))),
    };
    const client = {
      getChainId: vi.fn(async () => 10),
      getBlock: vi.fn(async (_args: unknown) => ({
        number: 7n,
        hash: BLOCK,
        timestamp: 100n,
      })),
      request: vi.fn(
        async (_args: unknown) => `0x${5n.toString(16).padStart(64, "0")}`,
      ),
    };
    const verify = () =>
      verifyReviewedWriteExpiry(
        client as unknown as Parameters<typeof verifyReviewedWriteExpiry>[0],
        record,
        service,
      );
    return { call, proposal, record, client, service, verify };
  }

  it("requires exact authenticated calldata, a guarded target and an unconsumed nonce at a canonical finalized block", async () => {
    const run = expiring();
    await expect(run.verify()).resolves.toBe(true);
    await expect(expiring(TARGET).verify()).rejects.toThrow("pending");
    expect(run.client.getBlock).toHaveBeenCalledWith({ blockTag: "finalized" });
    expect(run.client.request).toHaveBeenCalledWith(
      expect.objectContaining({ params: [expect.anything(), "0x7"] }),
    );
    for (const alter of [
      (fixture: ReturnType<typeof expiring>) => {
        fixture.record.call.value = "1";
      },
      (fixture: ReturnType<typeof expiring>) => {
        fixture.record.call.data = "0x3593564c00";
      },
      (fixture: ReturnType<typeof expiring>) => {
        fixture.client.getChainId.mockResolvedValue(1);
      },
      (fixture: ReturnType<typeof expiring>) => {
        fixture.client.getBlock.mockRejectedValue(new Error("no finality"));
      },
      (fixture: ReturnType<typeof expiring>) => {
        fixture.client.getBlock.mockResolvedValueOnce({
          number: 7n,
          hash: PROPOSAL,
          timestamp: 100n,
        });
      },
      (fixture: ReturnType<typeof expiring>) => {
        fixture.client.getBlock.mockResolvedValue({
          number: 7n,
          hash: BLOCK,
          timestamp: 99n,
        });
      },
      (fixture: ReturnType<typeof expiring>) => {
        fixture.proposal.isExecuted = true;
      },
      (fixture: ReturnType<typeof expiring>) => {
        fixture.client.request.mockResolvedValue(
          `0x${6n.toString(16).padStart(64, "0")}`,
        );
      },
    ]) {
      const fixture = expiring();
      alter(fixture);
      await expect(fixture.verify()).rejects.toThrow("pending");
    }
  });
});
