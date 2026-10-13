import {
  encodeAbiParameters,
  encodeEventTopics,
  encodeFunctionData,
  keccak256,
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
  browserLocks,
  checkReviewedWrite,
  createBrowserWriteRecovery,
  readReviewedWriteNonce,
  readBrowserWriteRecovery,
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

const legacyInput = input;
function ordinaryRecovery(namespace?: string) {
  const input = {
    ...legacyInput,
    ...(namespace === undefined ? {} : { namespace }),
  };
  it("keeps a lost wallet reply durable through new instances; only a namespace holds a changed amount/quote", async () => {
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
      // Without a namespace, a hold covers only its exact call.
      if (namespace === undefined && changed !== input) {
        expect(reloaded.read()).toBeNull();
        continue;
      }
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
  });

  it("falls back to a per-tab lock without Web Locks, with one console note", async () => {
    const options = browser();
    vi.stubGlobal("navigator", undefined);
    const note = vi.spyOn(console, "info").mockImplementation(() => {});
    const first = createBrowserWriteRecovery(input, {
      storage: options.storage,
    });
    const second = createBrowserWriteRecovery(input, {
      storage: options.storage,
    });
    const order: string[] = [];
    await first.withLock(async () => {
      await expect(
        second.withLock(async () => second.reserve()),
      ).rejects.toThrow("another tab");
      const queued = second.withLock(async () => {
        order.push("second");
      }, true);
      first.reserve();
      order.push("first");
      await Promise.resolve();
      expect(order).toEqual(["first"]);
      void queued;
    });
    await second.withLock(async () => {}, true);
    expect(order).toEqual(["first", "second"]);
    await expect(second.withLock(async () => second.reserve())).rejects.toThrow(
      "still unresolved",
    );
    expect(note.mock.calls.length).toBeLessThanOrEqual(1);
    note.mockRestore();
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

  it("preserves the current returned hash when an older attempt repairs through unreadable storage", async () => {
    const options = browser();
    const older = createBrowserWriteRecovery(input, options);
    const previous = await older.withLock(async () => {
      older.reserve();
      const submitted = older.submitted(HASH);
      older.clear(submitted);
      return submitted;
    });
    const current = createBrowserWriteRecovery(input, options);
    const reserved = await current.withLock(async () => {
      const record = current.reserve();
      options.storage.setItem.mockImplementationOnce(() => {
        throw new Error("write unavailable");
      });
      expect(() => current.submitted(PROPOSAL)).toThrow(
        SubmittedWritePersistenceError,
      );
      return record;
    });
    options.storage.getItem.mockImplementationOnce(() => {
      throw new Error("read unavailable");
    });
    await expect(
      older.withLock(async () => older.submitted(HASH, previous)),
    ).rejects.toThrow(SubmittedWritePersistenceError);
    const known = { ...reserved, hash: PROPOSAL };
    expect(current.read()).toEqual(known);
    expect(createBrowserWriteRecovery(input, options).read()).toEqual(known);
    expect(JSON.parse([...options.values.values()][0])).toEqual(reserved);
    await current.withLock(async () => {
      current.submitted(PROPOSAL, known);
      current.clear(known);
    });
  });

  it("drops a proven-stale cached reply before a new reservation loses its storage read", async () => {
    const options = browser();
    const older = createBrowserWriteRecovery(input, options);
    const previous = await older.withLock(async () => {
      const record = older.reserve();
      options.storage.setItem.mockImplementationOnce(() => {
        throw new Error("write unavailable");
      });
      expect(() => older.submitted(HASH)).toThrow(
        SubmittedWritePersistenceError,
      );
      return record;
    });
    // Another tab shares durable values but has its own Storage identity/cache.
    const otherTab = createBrowserWriteRecovery(input, {
      ...options,
      storage: { ...options.storage },
    });
    await otherTab.withLock(async () => {
      otherTab.clear(otherTab.submitted(HASH, previous));
    });
    const current = createBrowserWriteRecovery(input, options);
    await current.withLock(async () => {
      const reserved = current.reserve();
      options.storage.getItem.mockImplementationOnce(() => {
        throw new Error("read unavailable");
      });
      expect(() => current.submitted(PROPOSAL)).toThrow(
        SubmittedWritePersistenceError,
      );
      expect(current.read()).toEqual({ ...reserved, hash: PROPOSAL });
    });
  });

  it("lets exact raw ownership replace a stale cached reply when the current hash write fails", async () => {
    const options = browser();
    const older = createBrowserWriteRecovery(input, options);
    const previous = await older.withLock(async () => {
      older.reserve();
      const submitted = older.submitted(HASH);
      older.clear(submitted);
      return submitted;
    });
    const current = createBrowserWriteRecovery(input, options);
    const reserved = await current.withLock(async () => current.reserve());
    options.storage.getItem.mockImplementationOnce(() => {
      throw new Error("read unavailable");
    });
    await expect(
      older.withLock(async () => older.submitted(HASH, previous)),
    ).rejects.toThrow(SubmittedWritePersistenceError);
    await current.withLock(async () => {
      options.storage.setItem.mockImplementationOnce(() => {
        throw new Error("write unavailable");
      });
      expect(() => current.submitted(PROPOSAL)).toThrow(
        SubmittedWritePersistenceError,
      );
    });
    expect(current.read()).toEqual({ ...reserved, hash: PROPOSAL });
    expect(JSON.parse([...options.values.values()][0])).toEqual(reserved);
  });

  it("cleans only its own partial pre-wallet marker after readback failure", async () => {
    for (const persistent of [false, true]) {
      const options = browser();
      const journal = createBrowserWriteRecovery(input, options);
      const wallet = vi.fn();
      const stored = options.storage.getItem.getMockImplementation()!;
      let reads = 0;
      // Reads of this call's own key: absent, then the readback fails.
      options.storage.getItem.mockImplementation((key: string) => {
        if (key.endsWith(":0xaabbccdd")) return null;
        reads += 1;
        if (reads === 1) return null;
        if (reads === 2) throw new Error("readback failed");
        if (persistent) throw new Error("storage blocked");
        return stored(key);
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

  it("isolates chain/account/target/exact call and rejects invalid reviewed inputs", async () => {
    const options = browser();
    const first = createBrowserWriteRecovery(input, options);
    await first.withLock(async () => first.reserve());
    for (const changed of [
      { ...input, chainId: 1 },
      { ...input, account: WRAPPER },
      { ...input, call: { ...input.call, to: WRAPPER } },
      { ...input, call: { ...input.call, data: "0x11223344" as Hex } },
      { ...input, call: { ...input.call, data: "0xaabbccdd0002" as Hex } },
      { ...input, call: { ...input.call, value: 18n } },
    ])
      expect(createBrowserWriteRecovery(changed, options).read()).toEqual(
        namespace !== undefined &&
          changed.chainId === input.chainId &&
          changed.account === input.account
          ? first.read()
          : null,
      );
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
}
describe.each([undefined, "defifa:pay:27"])(
  "ordinary write recovery (%s)",
  ordinaryRecovery,
);

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

describe("stable action namespace and read-only opener", () => {
  const namespace = "defifa:pay:27";
  const scoped = { ...input, namespace };
  const lookup = { chainId: input.chainId, account: input.account, namespace };
  it("keys an ordinary write by its exact call, with the record shape unchanged", async () => {
    const options = browser();
    const journal = createBrowserWriteRecovery(input, options);
    const reserved = await journal.withLock(async () => journal.reserve());
    expect([...options.values.keys()]).toEqual([
      `nana-sdk:reviewed-write:v2:10:${ACCOUNT}:${TARGET}:17:${keccak256(input.call.data)}`,
    ]);
    expect(reserved).not.toHaveProperty("namespace");
  });

  it("still honors a record saved under the old selector key, for its exact call only", async () => {
    const options = browser();
    const legacy = `nana-sdk:reviewed-write:v1:10:${ACCOUNT}:${TARGET}:0xaabbccdd`;
    options.values.set(legacy, JSON.stringify(saved));
    const journal = createBrowserWriteRecovery(input, options);
    expect(journal.read()).toEqual(saved);
    await expect(
      journal.withLock(async () => journal.reserve()),
    ).rejects.toThrow("still unresolved");
    const other = createBrowserWriteRecovery(
      { ...input, call: { ...input.call, value: 18n } },
      options,
    );
    expect(other.read()).toBeNull();
    await other.withLock(async () => other.reserve());
    await journal.withLock(async () => journal.clear(saved));
    expect(options.values.has(legacy)).toBe(false);
    expect(journal.read()).toBeNull();
    // An unreadable old record names no call, so it holds none.
    options.values.set(legacy, "{");
    expect(journal.read()).toBeNull();
  });
  it("allows independent projects on the same terminal and selector without replacing either", async () => {
    const options = browser();
    const a = createBrowserWriteRecovery(scoped, options);
    const b = createBrowserWriteRecovery(
      { ...scoped, namespace: "defifa:pay:28" },
      options,
    );
    await a.withLock(async () => {
      a.reserve();
      await b.withLock(async () => b.reserve());
    });
    expect(options.values.size).toBe(2);
    expect(readBrowserWriteRecovery(lookup, options)?.namespace).toBe(
      namespace,
    );
    expect(
      readBrowserWriteRecovery(
        { ...lookup, namespace: "defifa:pay:28" },
        options,
      )?.namespace,
    ).toBe("defifa:pay:28");
  });
  it("finds and blocks an earlier action despite terminal, selector, amount and Safe-mode changes", async () => {
    const options = browser();
    const old = createBrowserWriteRecovery(scoped, options);
    const original = await old.withLock(async () => old.reserve());
    const changed = createBrowserWriteRecovery(
      {
        ...scoped,
        safe: true,
        call: { to: WRAPPER, data: "0x11223344", value: 99n },
      },
      options,
    );
    expect(changed.read()).toEqual(original);
    await expect(
      changed.withLock(async () => changed.reserve()),
    ).rejects.toThrow("still unresolved");
    expect(readBrowserWriteRecovery(lookup, options)).toEqual(original);
    expect(
      sameReviewedWrite(original, {
        ...scoped,
        call: { ...scoped.call, to: WRAPPER },
      }),
    ).toBe(false);
  });
  it("opens original evidence before fresh phase or quote preparation without mutating storage", async () => {
    const options = browser();
    const journal = createBrowserWriteRecovery(scoped, options);
    const original = await journal.withLock(async () => journal.reserve());
    options.storage.setItem.mockClear();
    options.storage.removeItem.mockClear();
    const freshPreparation = vi.fn(() => {
      throw new Error("Entry is now closed");
    });
    const pending = readBrowserWriteRecovery(lookup, options);
    if (!pending) freshPreparation();
    expect(pending).toEqual(original);
    expect(freshPreparation).not.toHaveBeenCalled();
    expect(options.storage.setItem).not.toHaveBeenCalled();
    expect(options.storage.removeItem).not.toHaveBeenCalled();
  });
  it("does not widen Safe adopted-call target or selector authority", async () => {
    const options = browser();
    const journal = createBrowserWriteRecovery(
      { ...scoped, safe: true },
      options,
    );
    await journal.withLock(async () => {
      for (const call of [
        { ...input.call, to: WRAPPER },
        { ...input.call, data: "0x11223344" as Hex },
      ])
        expect(() => journal.reserve(call)).toThrow("different recovery scope");
      const actual = journal.reserve({
        ...input.call,
        value: 19n,
        data: "0xaabbccdd9999",
      });
      expect(actual.namespace).toBe(namespace);
      expect(actual.call.value).toBe("19");
    });
  });
  it("shares unpersisted submitted hash evidence with the opener and retains exact repair ownership", async () => {
    const options = browser();
    const journal = createBrowserWriteRecovery(scoped, options);
    await journal.withLock(async () => {
      journal.reserve();
      options.storage.setItem.mockImplementationOnce(() => {
        throw new Error("Quota");
      });
      expect(() => journal.submitted(HASH)).toThrow(
        SubmittedWritePersistenceError,
      );
    });
    const known = readBrowserWriteRecovery(lookup, options)!;
    expect(known.hash).toBe(HASH);
    const reloaded = createBrowserWriteRecovery(
      { ...known, call: known.call },
      options,
    );
    await reloaded.withLock(async () => {
      expect(reloaded.submitted(HASH, known)).toEqual(known);
      reloaded.clear(known);
    });
    expect(readBrowserWriteRecovery(lookup, options)).toBeNull();
  });
  it("rejects invalid scope and namespace before touching storage", () => {
    const options = browser();
    for (const namespace of [
      "",
      "a".repeat(129),
      "Defifa:pay:27",
      " space",
      "../?",
      "x\n",
      null,
      42,
      undefined,
    ]) {
      if (namespace !== undefined)
        expect(() =>
          createBrowserWriteRecovery(
            { ...input, namespace } as typeof scoped,
            options,
          ),
        ).toThrow();
      expect(() =>
        readBrowserWriteRecovery(
          { ...lookup, namespace } as typeof lookup,
          options,
        ),
      ).toThrow();
    }
    for (const patch of [
      { chainId: 0 },
      { chainId: 1.5 },
      { account: "invalid" },
    ])
      expect(() =>
        readBrowserWriteRecovery(
          { ...lookup, ...patch } as typeof lookup,
          options,
        ),
      ).toThrow();
    expect(options.storage.getItem).not.toHaveBeenCalled();
  });
  it("rejects corrupt or foreign namespace records without overwriting saved evidence", async () => {
    const options = browser();
    const journal = createBrowserWriteRecovery(scoped, options);
    const original = await journal.withLock(async () => journal.reserve());
    const [key] = options.values.keys();
    for (const raw of [
      "{",
      JSON.stringify({ ...original, namespace: "defifa:pay:28" }),
      JSON.stringify({ ...original, namespace: "Invalid" }),
    ]) {
      options.values.set(key, raw);
      expect(() => readBrowserWriteRecovery(lookup, options)).toThrow();
      await expect(
        journal.withLock(async () => journal.reserve()),
      ).rejects.toThrow();
      expect(options.values.get(key)).toBe(raw);
    }
  });
});

describe("releasing a write with no confirmed result", () => {
  const SENT = `0x${"dd".repeat(32)}` as Hex;
  const evidence = { nonce: 7, blockNumber: 100n };
  /** The account's nonce reaches 8 at `crossing`; that block holds `tx`. */
  function nonceChain({
    crossing = 150n,
    finalized = 200n,
    tx = {
      hash: SENT,
      from: ACCOUNT,
      nonce: 7,
      to: TARGET,
      input: input.call.data,
      value: 17n,
    } as Record<string, unknown>,
    canonical = BLOCK,
    shifted = false,
  } = {}) {
    return {
      getBlockNumber: vi.fn(async () => 100n),
      getTransactionCount: vi.fn(
        async (args: { blockNumber?: bigint; blockTag?: string }) =>
          args.blockTag === "pending"
            ? 7
            : args.blockNumber! >= crossing
              ? 8
              : 7,
      ),
      getBlock: vi.fn(
        async (args: {
          blockTag?: string;
          blockNumber?: bigint;
          includeTransactions?: boolean;
        }) =>
          args.blockTag === "finalized"
            ? { number: finalized, hash: BLOCK, timestamp: 1n }
            : args.includeTransactions
              ? {
                  number: shifted ? 0n : args.blockNumber,
                  hash: BLOCK,
                  transactions: args.blockNumber === crossing ? [tx] : [],
                }
              : { number: args.blockNumber, hash: canonical },
      ),
    };
  }
  async function reserved(
    options = browser(),
    at: typeof evidence | null = evidence,
  ) {
    const journal = createBrowserWriteRecovery(input, options);
    const record = await journal.withLock(async () =>
      journal.reserve(undefined, at ?? undefined),
    );
    return { journal, record, options };
  }

  it("records the account's next nonce and the block it was read at", async () => {
    const client = nonceChain();
    await expect(
      readReviewedWriteNonce(client as never, ACCOUNT),
    ).resolves.toEqual(evidence);
    const { record, journal } = await reserved();
    expect(record).toMatchObject({ nonce: "7", fromBlock: "100" });
    expect(journal.read()).toEqual(record);
    await expect(
      reserved(browser(), { nonce: -1, blockNumber: 1n }),
    ).rejects.toThrow("Invalid");
  });

  it("finds the exact call at its nonce and returns the hash to track", async () => {
    const { record } = await reserved();
    const client = nonceChain();
    await expect(checkReviewedWrite(client as never, record)).resolves.toEqual({
      status: "sent",
      hash: SENT,
    });
    // A binary search, not a scan of every block.
    expect(client.getTransactionCount.mock.calls.length).toBeLessThan(12);
  });

  it("releases when another transaction used the nonce", async () => {
    const { record } = await reserved();
    for (const tx of [
      {
        hash: SENT,
        from: ACCOUNT,
        nonce: 7,
        to: WRAPPER,
        input: input.call.data,
        value: 17n,
      },
      {
        hash: SENT,
        from: ACCOUNT,
        nonce: 7,
        to: TARGET,
        input: input.call.data,
        value: 18n,
      },
      {
        hash: SENT,
        from: ACCOUNT,
        nonce: 7,
        to: TARGET,
        input: "0xaabbccdd0002",
        value: 17n,
      },
    ])
      await expect(
        checkReviewedWrite(nonceChain({ tx }) as never, record),
      ).resolves.toEqual({ status: "replaced" });
  });

  it("holds while the nonce has not moved at a finalized block, or the proof is incomplete", async () => {
    const { record } = await reserved();
    for (const client of [
      nonceChain({ crossing: 300n }),
      nonceChain({ canonical: PROPOSAL }),
      nonceChain({ tx: { hash: SENT, from: WRAPPER, nonce: 7 } }),
      nonceChain({ tx: { hash: "0x12", from: ACCOUNT, nonce: 7 } }),
      nonceChain({ shifted: true }),
    ])
      await expect(
        checkReviewedWrite(client as never, record),
      ).resolves.toEqual({ status: "pending" });
    const failing = nonceChain();
    failing.getTransactionCount.mockRejectedValue(new Error("no archive"));
    await expect(checkReviewedWrite(failing as never, record)).resolves.toEqual(
      { status: "pending" },
    );
    const { record: bare } = await reserved(browser(), null);
    await expect(
      checkReviewedWrite(nonceChain() as never, bare),
    ).resolves.toEqual({ status: "pending" });
    await expect(
      checkReviewedWrite(nonceChain() as never, { ...record, safe: true }),
    ).resolves.toEqual({ status: "pending" });
  });

  it("releases once the call's effect is visible, and ignores a failing effect read", async () => {
    const { record } = await reserved();
    const client = nonceChain({ crossing: 300n });
    await expect(
      checkReviewedWrite(client as never, record, { effect: async () => true }),
    ).resolves.toEqual({ status: "ran" });
    await expect(
      checkReviewedWrite(client as never, record, {
        effect: async () => {
          throw new Error("rpc down");
        },
      }),
    ).resolves.toEqual({ status: "pending" });
  });

  it("applies each finding to the saved write under the lock", async () => {
    const replaced = await reserved();
    await expect(
      replaced.journal.resolve(nonceChain() as never),
    ).rejects.toThrow("browser lock");
    await expect(
      replaced.journal.withLock(() =>
        replaced.journal.resolve(
          nonceChain({
            tx: {
              hash: SENT,
              from: ACCOUNT,
              nonce: 7,
              to: WRAPPER,
              input: "0x",
              value: 0n,
            },
          }) as never,
        ),
      ),
    ).resolves.toEqual({ status: "replaced" });
    expect(replaced.journal.read()).toBeNull();

    const sent = await reserved();
    await sent.journal.withLock(async () => sent.journal.submitted(HASH));
    // The wallet sped it up: the same call landed at its nonce under a new hash.
    await expect(
      sent.journal.withLock(() => sent.journal.resolve(nonceChain() as never)),
    ).resolves.toEqual({ status: "sent", hash: SENT });
    expect(sent.journal.read()?.hash).toBe(SENT);

    const ran = await reserved();
    await ran.journal.withLock(() =>
      ran.journal.resolve(nonceChain({ crossing: 300n }) as never, {
        effect: async () => true,
      }),
    );
    expect(ran.journal.read()).toBeNull();
  });

  it("resolves nothing when nothing is saved, and prefers native Web Locks", async () => {
    const journal = createBrowserWriteRecovery(input, browser());
    await expect(
      journal.withLock(() => journal.resolve(nonceChain() as never)),
    ).resolves.toBeNull();
    const locks = browser().locks;
    vi.stubGlobal("navigator", { locks });
    expect(browserLocks()).toBe(locks);
  });

  it("lets the user end a held write only after confirming they checked their wallet", async () => {
    const { journal, record } = await reserved();
    await journal.withLock(async () => {
      expect(() => journal.abandon(record, {} as never)).toThrow(
        "checked their wallet",
      );
      expect(journal.read()).toEqual(record);
      journal.abandon(record, { checkedWallet: true });
    });
    expect(journal.read()).toBeNull();
  });
});
