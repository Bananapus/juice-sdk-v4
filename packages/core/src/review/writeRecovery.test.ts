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
import { IDBDatabase, IDBFactory } from "fake-indexeddb";
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
  parseReviewedWriteRecoveryRecord,
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
/** Saved records only: not the call's latest-reservation or settlement keys. */
const records = (values: Map<string, string>) =>
  [...values].filter(([key]) => !/:(latest|settled)$/.test(key));
/** When the wallet returned a hash. */
const AT = expect.stringMatching(/^\d+$/);
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
      const [[key]] = records(options.values);
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
    const known = current.read()!;
    expect(known).toEqual({ ...reserved, hash: PROPOSAL, submittedAt: AT });
    expect(createBrowserWriteRecovery(input, options).read()).toEqual(known);
    expect(JSON.parse(records(options.values)[0][1])).toEqual(reserved);
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
      expect(current.read()).toEqual({
        ...reserved,
        hash: PROPOSAL,
        submittedAt: AT,
      });
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
    expect(current.read()).toEqual({
      ...reserved,
      hash: PROPOSAL,
      submittedAt: AT,
    });
    expect(JSON.parse(records(options.values)[0][1])).toEqual(reserved);
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

  it("settles an immediate execution whose outer transaction reverted as failed, only at finality and only to the Safe", async () => {
    const run = safeChain();
    run.receipt.status = "reverted";
    run.receipt.logs = [];
    const record = { ...saved, safe: true, hash: HASH };
    run.client.getBlock.mockResolvedValueOnce({
      hash: BLOCK,
      number: 6n,
      timestamp: 100n,
    });
    await expect(
      verifyReviewedWriteReceipt(run.client, record, run.receipt),
    ).rejects.toThrow("pending");
    await expect(
      verifyReviewedWriteReceipt(run.client, record, run.receipt),
    ).resolves.toBe("failed");
    // A reverted executor of a proposal has not consumed its nonce: still held.
    await expect(
      verifyReviewedWriteReceipt(
        run.client,
        { ...record, hash: PROPOSAL },
        run.receipt,
      ),
    ).rejects.toThrow("pending");
    // A reverted transaction to another contract is not the Safe's execution.
    run.transaction.to = WRAPPER;
    run.receipt.to = WRAPPER;
    await expect(
      verifyReviewedWriteReceipt(run.client, record, run.receipt),
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

  it("authenticates a canonical Safe failure before finality only when asked", async () => {
    const run = safeChain(true);
    const record = { ...saved, safe: true, hash: PROPOSAL };
    run.client.getBlock.mockRejectedValueOnce(new Error("not finalized"));
    await expect(
      verifyReviewedWriteReceipt(run.client, record, run.receipt),
    ).rejects.toThrow("pending");
    const finalityReads = run.client.getBlock.mock.calls.length;
    await expect(
      verifyReviewedWriteReceipt(run.client, record, run.receipt, undefined, {
        finality: false,
      }),
    ).resolves.toBe("failed");
    // Still canonical: its block is read, but no finalized one.
    expect(
      run.client.getBlock.mock.calls
        .slice(finalityReads)
        .some(([args]) => args.blockTag === "finalized"),
    ).toBe(false);
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
    expect(records(options.values).map(([key]) => key)).toEqual([
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
    expect(records(options.values)).toHaveLength(2);
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
  type Tx = Record<string, unknown>;
  const exact = (hash: Hex): Tx => ({
    hash,
    from: ACCOUNT,
    nonce: 7,
    to: TARGET,
    input: input.call.data,
    value: 17n,
  });
  /** A wallet's cancel: a zero transfer to the account itself. */
  const cancel: Tx = {
    hash: SENT,
    from: ACCOUNT,
    nonce: 7,
    to: ACCOUNT,
    input: "0x",
    value: 0n,
  };
  /** A smart wallet or batcher contract running the reviewed call. */
  const wrapped = (hash: Hex): Tx => ({
    hash,
    from: ACCOUNT,
    nonce: 7,
    to: WRAPPER,
    input: "0x1234",
    value: 0n,
  });
  /**
   * The account's nonce reaches 8 at `crossing`; that block holds `tx`.
   * `known` answers getTransaction by hash; `code` answers getCode.
   */
  function nonceChain({
    crossing = 150n,
    finalized = 200n,
    tx = exact(SENT),
    canonical = BLOCK,
    shifted = false,
    chainId = 10,
    known = {} as Record<string, { nonce: number; blockNumber: bigint | null }>,
    code = { [WRAPPER.toLowerCase()]: "0x6080" } as Record<string, Hex>,
  } = {}) {
    return {
      getChainId: vi.fn(async () => chainId),
      getBlockNumber: vi.fn(async () => 100n),
      getTransaction: vi.fn(async ({ hash }: { hash: Hex }) => {
        const found = known[hash];
        if (!found)
          throw Object.assign(new Error("not found"), {
            name: "TransactionNotFoundError",
          });
        return { hash, from: ACCOUNT, ...found };
      }),
      getCode: vi.fn(
        async ({ address }: { address: Address }) =>
          code[address.toLowerCase()],
      ),
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
  const check = (client: unknown, record: ReviewedWriteRecoveryRecord) =>
    checkReviewedWrite(client as never, record);
  const pending = { status: "pending" };
  /** Another transaction used the nonce at a finalized block: still held, with its evidence. */
  const usedBy = { status: "pending", usedBy: SENT.toLowerCase() };

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

  it("adopts another hash only at the nonce its own transaction was sent at", async () => {
    const { record } = await reserved();
    // Codex: the exact call at the pre-wallet nonce, under a hash nobody returned.
    const client = nonceChain();
    await expect(check(client, record)).resolves.toEqual(pending);
    await expect(check(client, { ...record, hash: HASH })).resolves.toEqual(
      pending,
    );
    // Its own hash there is this transaction.
    await expect(
      check(nonceChain({ tx: exact(HASH) }), { ...record, hash: HASH }),
    ).resolves.toEqual({ status: "sent", hash: HASH });
    // At the authenticated sent nonce, a speed-up of the exact call is adopted.
    const bound = nonceChain();
    await expect(
      check(bound, { ...record, hash: HASH, sentNonce: "7" }),
    ).resolves.toEqual({ status: "sent", hash: SENT });
    // A binary search, not a scan of every block.
    expect(bound.getTransactionCount.mock.calls.length).toBeLessThan(12);
  });

  it("never calls a write replaced from a nonce sampled before the wallet opened", async () => {
    // The wallet may have sent it at a later nonce than the sample.
    const { record } = await reserved();
    for (const tx of [cancel, wrapped(SENT), { ...exact(SENT), value: 18n }])
      await expect(check(nonceChain({ tx }), record)).resolves.toEqual(usedBy);
    const hashed = { ...record, hash: HASH };
    await expect(check(nonceChain({ tx: cancel }), hashed)).resolves.toEqual(
      usedBy,
    );
  });

  it("tracks the saved hash wherever it ran, wallet wrappers included", async () => {
    const { record } = await reserved();
    const hashed = { ...record, hash: HASH };
    // The node knows it as mined: its receipt decides.
    await expect(
      check(
        nonceChain({
          tx: wrapped(HASH),
          known: { [HASH]: { nonce: 7, blockNumber: 150n } },
        }),
        hashed,
      ),
    ).resolves.toEqual({ status: "sent", hash: HASH });
    // The node dropped it from its index, but it is the transaction at the bound nonce.
    await expect(
      check(nonceChain({ tx: wrapped(HASH) }), { ...hashed, sentNonce: "7" }),
    ).resolves.toEqual({ status: "sent", hash: HASH });
  });

  it("never releases another transaction at the sent nonce on its own", async () => {
    const { record } = await reserved();
    const bound = { ...record, hash: HASH, sentNonce: "7" };
    // Even a cancel to an address with no code at block end: an EIP-7702
    // wallet can run code, pay and clear its delegation in the same block.
    // The user's exit (one tap) ends it.
    await expect(check(nonceChain({ tx: cancel }), bound)).resolves.toEqual(
      usedBy,
    );
    // A contract could run the reviewed call inside it.
    await expect(
      check(nonceChain({ tx: wrapped(SENT) }), bound),
    ).resolves.toEqual(usedBy);
    await expect(
      check(nonceChain({ tx: { ...cancel, to: null } }), bound),
    ).resolves.toEqual(usedBy);
    // A wallet speed-up: the exact call under a new hash.
    await expect(check(nonceChain(), bound)).resolves.toEqual({
      status: "sent",
      hash: SENT,
    });
  });

  it("applies no evidence from another chain", async () => {
    const { record } = await reserved();
    const bound = { ...record, hash: HASH, sentNonce: "7" };
    for (const [tx, saved] of [
      [exact(SENT), record],
      [cancel, bound],
    ] as const)
      await expect(
        check(nonceChain({ tx, chainId: 1 }), saved),
      ).resolves.toEqual(pending);
    const failing = nonceChain();
    failing.getChainId.mockRejectedValue(new Error("rpc down"));
    await expect(check(failing, record)).resolves.toEqual(pending);
  });

  it("holds while the nonce has not moved at a finalized block, or the proof is incomplete", async () => {
    const { record } = await reserved();
    for (const client of [
      nonceChain({ crossing: 300n }),
      nonceChain({ canonical: PROPOSAL }),
      nonceChain({ tx: { ...exact(SENT), from: WRAPPER } }),
      nonceChain({ tx: { ...exact(SENT), hash: "0x12" } }),
      nonceChain({ shifted: true }),
    ])
      await expect(check(client, record)).resolves.toEqual(pending);
    const failing = nonceChain();
    failing.getTransactionCount.mockRejectedValue(new Error("no archive"));
    await expect(check(failing, record)).resolves.toEqual(pending);
    const { record: bare } = await reserved(browser(), null);
    await expect(check(nonceChain(), bare)).resolves.toEqual(pending);
    await expect(
      check(nonceChain(), { ...record, safe: true }),
    ).resolves.toEqual(pending);
  });

  it("reports a visible effect without releasing, and ignores a failing effect read", async () => {
    const { record, journal } = await reserved();
    const client = nonceChain({ crossing: 300n });
    const effect = vi.fn(async () => true);
    await expect(
      checkReviewedWrite(client as never, record, { effect }),
    ).resolves.toEqual({ status: "pending", effect: true });
    // The effect reads the saved chain.
    expect(effect).toHaveBeenCalledWith(10);
    // Codex: the original is still pending in the mempool; nothing is released.
    await journal.withLock(async () => journal.submitted(HASH));
    await expect(
      journal.withLock(() =>
        journal.resolve(
          nonceChain({
            crossing: 300n,
            known: { [HASH]: { nonce: 7, blockNumber: null } },
          }) as never,
          { effect },
        ),
      ),
    ).resolves.toEqual({ status: "pending", effect: true });
    expect(journal.read()).toMatchObject({ hash: HASH });
    // A Safe write is guarded first: no effect is read for it.
    const safeEffect = vi.fn(async () => true);
    await expect(
      checkReviewedWrite(
        client as never,
        { ...record, safe: true },
        {
          effect: safeEffect,
        },
      ),
    ).resolves.toEqual(pending);
    expect(safeEffect).not.toHaveBeenCalled();
    await expect(
      checkReviewedWrite(client as never, record, {
        effect: async () => {
          throw new Error("rpc down");
        },
      }),
    ).resolves.toEqual(pending);
  });

  it("reads no effect through a client on another chain, and keeps the record", async () => {
    const { record, journal } = await reserved();
    const effect = vi.fn(async () => true);
    await expect(
      checkReviewedWrite(nonceChain({ chainId: 1 }) as never, record, {
        effect,
      }),
    ).resolves.toEqual(pending);
    await expect(
      journal.withLock(() =>
        journal.resolve(nonceChain({ chainId: 1 }) as never, { effect }),
      ),
    ).resolves.toEqual(pending);
    expect(effect).not.toHaveBeenCalled();
    expect(journal.read()).toEqual(record);
  });

  it("binds a sent nonce only from the saved hash's own transaction on the saved chain", async () => {
    const { journal } = await reserved();
    await journal.withLock(async () => journal.submitted(HASH));
    // Codex: the node answers for HASH with another transaction U.
    for (const answer of [
      { hash: SENT, nonce: 9, blockNumber: null },
      { hash: SENT, nonce: 9, blockNumber: 150n },
      { hash: HASH, chainId: 1, nonce: 9, blockNumber: 150n },
    ]) {
      await expect(
        journal.withLock(() =>
          journal.resolve(
            nonceChain({
              crossing: 300n,
              known: { [HASH]: answer } as never,
            }) as never,
          ),
        ),
      ).resolves.toEqual(pending);
      expect(journal.read()?.sentNonce).toBeUndefined();
    }
    // Its own transaction, on the saved chain, binds.
    await journal.withLock(() =>
      journal.resolve(
        nonceChain({
          crossing: 300n,
          known: {
            [HASH]: {
              hash: HASH.toUpperCase().replace("0X", "0x"),
              chainId: 10,
              nonce: 7,
              blockNumber: null,
            },
          } as never,
        }) as never,
      ),
    );
    expect(journal.read()?.sentNonce).toBe("7");
  });

  it("binds the sent nonce while the node knows the hash, then applies each finding", async () => {
    const replaced = await reserved();
    await expect(
      replaced.journal.resolve(nonceChain() as never),
    ).rejects.toThrow("browser lock");
    await replaced.journal.withLock(async () =>
      replaced.journal.submitted(HASH),
    );
    // Still in the mempool: nothing to decide, but its nonce is now bound.
    await expect(
      replaced.journal.withLock(() =>
        replaced.journal.resolve(
          nonceChain({
            crossing: 300n,
            known: { [HASH]: { nonce: 7, blockNumber: null } },
          }) as never,
        ),
      ),
    ).resolves.toEqual(pending);
    expect(replaced.journal.read()).toMatchObject({
      hash: HASH,
      sentNonce: "7",
    });
    // Then the wallet cancelled it: still held, until the user's exit.
    await expect(
      replaced.journal.withLock(() =>
        replaced.journal.resolve(nonceChain({ tx: cancel }) as never),
      ),
    ).resolves.toEqual(usedBy);
    expect(replaced.journal.read()?.sentNonce).toBe("7");

    const sent = await reserved();
    await sent.journal.withLock(async () => sent.journal.submitted(HASH));
    await sent.journal.withLock(() =>
      sent.journal.resolve(
        nonceChain({
          crossing: 300n,
          known: { [HASH]: { nonce: 7, blockNumber: null } },
        }) as never,
      ),
    );
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
    // An effect never releases on its own: the user's exit does.
    expect(ran.journal.read()).not.toBeNull();
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

  it("never lets a stale exit in one tab erase a newer write from another", async () => {
    const options = browser();
    const b = createBrowserWriteRecovery(input, options);
    const r = await b.withLock(async () => b.reserve());
    // Tab A read R before tab B released it and sent S.
    const staleR = options.values.get([...options.values.keys()][0])!;
    b.abandon(r, { checkedWallet: true });
    const s = await b.withLock(async () => {
      b.reserve();
      return b.submitted(HASH);
    });
    let stale = true;
    const tabA = {
      ...options.storage,
      getItem: (key: string) => {
        if (stale && options.values.get(key) === JSON.stringify(s)) {
          stale = false;
          return staleR;
        }
        return options.storage.getItem(key);
      },
    };
    const a = createBrowserWriteRecovery(input, { storage: tabA });
    a.abandon(r, { checkedWallet: true });
    expect(b.read()).toEqual(s);
    expect(createBrowserWriteRecovery(input, options).read()).toEqual(s);
    // S's own exit still works, and leaves nothing held.
    b.abandon(s, { checkedWallet: true });
    expect(b.read()).toBeNull();
    await b.withLock(async () => b.reserve());
  });

  it("ends a write whose returned hash only lives in memory", async () => {
    const options = browser();
    const journal = createBrowserWriteRecovery(input, options);
    const reservation = await journal.withLock(async () => journal.reserve());
    options.storage.setItem.mockImplementationOnce(() => {
      throw new Error("storage offline");
    });
    await journal.withLock(async () => {
      expect(() => journal.submitted(HASH)).toThrow(
        SubmittedWritePersistenceError,
      );
    });
    const shown = journal.read()!;
    expect(shown).toMatchObject({ id: reservation.id, hash: HASH });
    // Another reservation, or a conflicting hash, is still refused.
    for (const other of [
      { ...shown, id: "other" },
      { ...shown, hash: PROPOSAL },
    ])
      expect(() => journal.abandon(other, { checkedWallet: true })).toThrow(
        "changed",
      );
    journal.abandon(shown, { checkedWallet: true });
    expect(journal.read()).toBeNull();
    expect(createBrowserWriteRecovery(input, options).read()).toBeNull();
  });
});

describe("tabs without Web Locks", () => {
  /** A tab: its own copy of the module, sharing the origin's storage and IndexedDB. */
  async function tab() {
    // Each tab has its own globals; copies of the module in one tab share them.
    delete (globalThis as Record<symbol, unknown>)[
      Symbol.for("nana-sdk:write-lock-queues")
    ];
    vi.resetModules();
    return (await import(
      "./writeRecovery.js"
    )) as typeof import("./writeRecovery.js");
  }
  function origin() {
    const shared = browser();
    vi.stubGlobal("navigator", undefined);
    vi.stubGlobal("indexedDB", new IDBFactory());
    vi.spyOn(console, "info").mockImplementation(() => {});
    return shared.storage;
  }

  it("lets only one tab hold an action, and the other reserve after it", async () => {
    const storage = origin();
    const [first, second] = [await tab(), await tab()];
    const a = first.createBrowserWriteRecovery(input, { storage });
    const b = second.createBrowserWriteRecovery(input, { storage });
    let release!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));
    const holding = a.withLock(async () => {
      a.reserve();
      await held;
    });
    await vi.waitFor(() => expect(a.read()).not.toBeNull());
    await expect(b.withLock(async () => b.reserve())).rejects.toThrow(
      "another tab",
    );
    const queued = b.withLock(async () => b.reserve(), true);
    release();
    await holding;
    await expect(queued).rejects.toThrow("still unresolved");
  });

  it("takes over a lease its tab stopped renewing", async () => {
    const storage = origin();
    const [first, second] = [await tab(), await tab()];
    const a = first.createBrowserWriteRecovery(input, { storage });
    const b = second.createBrowserWriteRecovery(input, { storage });
    let release!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));
    let entered!: () => void;
    const inside = new Promise<void>((resolve) => (entered = resolve));
    const holding = a.withLock(() => {
      entered();
      return held;
    });
    // The first tab holds its lease before the clock moves.
    await inside;
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now + 60_000);
    await expect(b.withLock(async () => "taken")).resolves.toBe("taken");
    release();
    await holding;
  });

  it("keeps the user's exit when the lease can't be taken, and blocks new sends", async () => {
    const storage = origin();
    const module = await tab();
    const journal = module.createBrowserWriteRecovery(input, { storage });
    const record = await journal.withLock(async () => journal.reserve());
    const transaction = vi
      .spyOn(IDBDatabase.prototype, "transaction")
      .mockImplementation(() => {
        throw new Error("IndexedDB transaction failed");
      });
    await expect(
      journal.withLock(async () => journal.reserve()),
    ).rejects.toThrow("IndexedDB transaction failed");
    expect(() =>
      journal.abandon(
        { ...record, id: "other" },
        {
          checkedWallet: true,
        },
      ),
    ).toThrow("changed");
    expect(() => journal.abandon(record, {} as never)).toThrow(
      "checked their wallet",
    );
    journal.abandon(record, { checkedWallet: true });
    expect(journal.read()).toBeNull();
    await expect(
      journal.withLock(async () => journal.reserve()),
    ).rejects.toThrow("IndexedDB transaction failed");
    transaction.mockRestore();
  });

  it("falls back to a lock within the tab when IndexedDB is unavailable too", async () => {
    const storage = origin();
    vi.stubGlobal("indexedDB", undefined);
    const module = await tab();
    const journal = module.createBrowserWriteRecovery(input, { storage });
    await expect(journal.withLock(async () => "ran")).resolves.toBe("ran");
  });
});

describe("a Safe write's candidate executions", () => {
  it("keeps valid, distinct hashes only, with no cap, on a Safe write, and drops a disproven one", async () => {
    const options = browser();
    const journal = createBrowserWriteRecovery(
      { ...input, safe: true },
      options,
    );
    await journal.withLock(async () => {
      let record = journal.reserve();
      record = journal.submitted(PROPOSAL, record);
      expect(() => journal.candidate(record, HASH)).not.toThrow();
      record = journal.read()!;
      expect(record.candidates).toEqual([HASH]);
      expect(journal.candidate(record, HASH)).toEqual(record);
      expect(journal.candidate(record, "0x12" as Hex)).toEqual(record);
      for (let i = 1; i < 70; i += 1)
        record = journal.candidate(
          record,
          `0x${i.toString(16).padStart(64, "0")}` as Hex,
        );
      // No cap: candidates come only from the app's own wallet replies.
      expect(record.candidates).toHaveLength(70);
      record = journal.disproven(record, HASH);
      expect(record.candidates).toHaveLength(69);
      expect(journal.disproven(record, HASH)).toEqual(record);
      for (const hash of record.candidates!)
        record = journal.disproven(record, hash);
      expect(record.candidates).toBeUndefined();
    });
    const ordinaryJournal = createBrowserWriteRecovery(input, browser());
    await ordinaryJournal.withLock(async () => {
      const record = ordinaryJournal.submitted(HASH, ordinaryJournal.reserve());
      expect(
        ordinaryJournal.candidate(record, PROPOSAL).candidates,
      ).toBeUndefined();
    });
    for (const bad of [{ candidates: "0x" }, { candidates: ["0x12"] }])
      expect(() =>
        parseReviewedWriteRecoveryRecord({ ...saved, ...bad }),
      ).toThrow("Invalid saved write recovery record");
  });
});

describe("an attempt's generation", () => {
  it("keeps the last record, released, when its latest marker can't be committed", async () => {
    const options = browser();
    const journal = createBrowserWriteRecovery(input, options);
    const first = await journal.withLock(async () => journal.reserve());
    const write = options.storage.setItem.getMockImplementation()!;
    options.storage.setItem.mockImplementation((k: string, v: string) => {
      if (k.endsWith(":latest")) throw new Error("QuotaExceededError");
      write(k, v);
    });
    const second = await journal.withLock(async () => {
      journal.clear(first);
      return journal.reserve();
    });
    // Codex: settle B while its marker can't be saved.
    await journal.withLock(async () => journal.clear(second));
    expect(journal.read()).toBeNull();
    expect(journal.latestReservation()).toBe(second.id);
    // With the marker committed, the record goes.
    options.storage.setItem.mockImplementation(write);
    const third = await journal.withLock(async () => journal.reserve());
    await journal.withLock(async () => journal.clear(third));
    expect(journal.latestReservation()).toBe(third.id);
    expect(
      [...options.values.keys()].filter(
        (k) => !/:(latest|released:.*)$/.test(k),
      ),
    ).toEqual([]);
  });
});

describe("a write's saved settlement", () => {
  it("is read only for the call's latest reservation, exactly, and ignored when malformed", async () => {
    const options = browser();
    const journal = createBrowserWriteRecovery(input, options);
    expect(journal.settled()).toBeUndefined();
    const first = await journal.withLock(async () => journal.reserve());
    expect(() =>
      journal.markSettled(first, { result: "success", hash: HASH }),
    ).toThrow("browser lock");
    await journal.withLock(async () => {
      journal.clear(first);
      journal.markSettled(first, {
        result: "failed",
        hash: HASH.toUpperCase().replace("0X", "0x") as Hex,
      });
    });
    expect(journal.settled()).toEqual({ result: "failed", hash: HASH });
    const [key] = [...options.values.keys()].filter((k) =>
      k.endsWith(":settled"),
    );
    const saved = options.values.get(key)!;
    expect(JSON.parse(saved)).toMatchObject({
      id: first.id,
      at: expect.any(Number),
    });
    for (const bad of [
      "{",
      JSON.stringify({ id: first.id, result: "ran", hash: HASH }),
      JSON.stringify({ id: first.id, result: "success", hash: "0x12" }),
      JSON.stringify({ result: "success", hash: HASH }),
    ]) {
      options.values.set(key, bad);
      expect(journal.settled()).toBeUndefined();
    }
    options.values.set(key, saved);
    // A failed save keeps the one already there, and never throws.
    options.storage.setItem.mockImplementationOnce(() => {
      throw new Error("full");
    });
    await journal.withLock(async () =>
      journal.markSettled(first, { result: "success", hash: HASH }),
    );
    expect(journal.settled()).toEqual({ result: "failed", hash: HASH });
    // A new reservation is the latest: the old settlement reads as none,
    // even though it was never removed.
    await journal.withLock(async () => journal.reserve());
    expect(options.values.get(key)).toBe(saved);
    await journal.withLock(async () => journal.rejected());
    expect(journal.read()).toBeNull();
    expect(journal.settled()).toBeUndefined();
  });

  it("drops the old settlement when the latest reservation can't be saved", async () => {
    const options = browser();
    const journal = createBrowserWriteRecovery(input, options);
    const first = await journal.withLock(async () => journal.reserve());
    await journal.withLock(async () => {
      journal.clear(first);
      journal.markSettled(first, { result: "success", hash: HASH });
    });
    const write = options.storage.setItem.getMockImplementation()!;
    options.storage.setItem.mockImplementation((k: string, v: string) => {
      if (k.endsWith(":latest")) throw new Error("refused");
      write(k, v);
    });
    await journal.withLock(async () => journal.reserve());
    expect(journal.settled()).toBeUndefined();
    // Neither saved nor removed: the reservation still goes ahead.
    options.storage.removeItem.mockImplementationOnce(() => {
      throw new Error("refused");
    });
    const other = createBrowserWriteRecovery(
      { ...input, call: { ...input.call, value: 1n } },
      options,
    );
    await expect(
      other.withLock(async () => other.reserve()),
    ).resolves.toMatchObject({ version: 1 });
  });
});

describe("a record saved before its hash had a clock", () => {
  it("saves when it was first seen, once, and only on a hashed record", async () => {
    const options = browser();
    const journal = createBrowserWriteRecovery(input, options);
    await journal.withLock(async () => {
      const reserved = journal.reserve();
      expect(() => journal.firstSeen(reserved)).not.toThrow();
      expect(journal.firstSeen(reserved)).toEqual(reserved);
      const [key] = options.values.keys();
      options.values.set(key, JSON.stringify({ ...reserved, hash: HASH }));
      const legacy = journal.read()!;
      const seen = journal.firstSeen(legacy);
      expect(seen).toEqual({ ...legacy, firstSeenAt: AT });
      expect(journal.read()).toEqual(seen);
      expect(journal.firstSeen(seen)).toEqual(seen);
      // A stale snapshot changes nothing.
      expect(journal.firstSeen({ ...legacy, id: "other" })).toEqual(seen);
      // A failed save keeps the record as it was.
      options.storage.setItem.mockImplementationOnce(() => {
        throw new Error("full");
      });
      options.values.set(key, JSON.stringify(legacy));
      expect(journal.firstSeen(legacy)).toEqual(legacy);
    });
    expect(() => journal.firstSeen(saved)).toThrow("browser lock");
    expect(() =>
      parseReviewedWriteRecoveryRecord({ ...saved, firstSeenAt: "soon" }),
    ).toThrow("Invalid saved write recovery record");
    expect(() =>
      parseReviewedWriteRecoveryRecord({ ...saved, sentFrom: "0x12" }),
    ).toThrow("Invalid saved write recovery record");
    expect(() =>
      parseReviewedWriteRecoveryRecord({ ...saved, replaced: false }),
    ).toThrow("Invalid saved write recovery record");
    expect(() =>
      parseReviewedWriteRecoveryRecord({ ...saved, unproven: false }),
    ).toThrow("Invalid saved write recovery record");
    expect(() =>
      parseReviewedWriteRecoveryRecord({ ...saved, vanishedAt: "later" }),
    ).toThrow("Invalid saved write recovery record");
    expect(() =>
      parseReviewedWriteRecoveryRecord({ ...saved, minedAt: "soon" }),
    ).toThrow("Invalid saved write recovery record");
    for (const candidateMinedAt of [
      "x",
      null,
      { "0x12": "1" },
      { [HASH]: "soon" },
    ])
      expect(() =>
        parseReviewedWriteRecoveryRecord({ ...saved, candidateMinedAt }),
      ).toThrow("Invalid saved write recovery record");
  });
});

describe("a write the chain proved ran", () => {
  it("keeps its execution evidence, refuses the exit and rejects malformed evidence", async () => {
    const options = browser();
    const journal = createBrowserWriteRecovery(
      { ...input, safe: true },
      options,
    );
    const reserved = await journal.withLock(async () => journal.reserve());
    expect(() => journal.executed(reserved)).toThrow("browser lock");
    await journal.withLock(async () => {
      // Nothing proven runs without a hash to name it.
      expect(() => journal.executed(reserved)).toThrow("changed");
      const sent = journal.submitted(PROPOSAL);
      expect(() => journal.executed(sent, "0x12" as Hex)).toThrow(
        "Invalid execution",
      );
      expect(() => journal.executed({ ...sent, id: "other" })).toThrow(
        "changed",
      );
      expect(() => journal.executed({ ...sent, hash: HASH })).toThrow(
        "changed",
      );
      const ran = journal.executed(
        sent,
        HASH.toUpperCase().replace("0X", "0x") as Hex,
      );
      expect(ran).toMatchObject({ executed: true, executionHash: HASH });
      // Later evidence without a hash keeps the one already saved.
      expect(journal.executed(ran)).toEqual(ran);
      expect(journal.read()).toEqual(ran);
    });
    expect(() =>
      journal.abandon(journal.read()!, { checkedWallet: true }),
    ).toThrow("ran onchain");
    for (const bad of [
      { executed: false },
      { executionHash: HASH },
      { executed: true, executionHash: "0x12" },
    ])
      expect(() =>
        parseReviewedWriteRecoveryRecord({ ...saved, ...bad }),
      ).toThrow("Invalid saved write recovery record");
  });
});
