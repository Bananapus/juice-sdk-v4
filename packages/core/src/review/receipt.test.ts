import type { Hex, PublicClient } from "viem";
import { describe, expect, it, vi } from "vitest";
import {
  isTransactionReceiptUnavailableError,
  TransactionReceiptUnavailableError,
  waitForTrackedReceipt,
} from "./receipt.js";

const HASH = `0x${"ab".repeat(32)}` as Hex;
const receipt = { status: "success", blockNumber: 12n, transactionHash: HASH };

function client(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    chain: { id: 8453 },
    waitForTransactionReceipt: vi
      .fn()
      .mockRejectedValue(new Error("Invalid RPC parameters")),
    getTransactionReceipt: vi.fn().mockResolvedValue(receipt),
    ...overrides,
  } as unknown as PublicClient & {
    waitForTransactionReceipt: ReturnType<typeof vi.fn>;
    getTransactionReceipt: ReturnType<typeof vi.fn>;
  };
}

describe("transaction receipt tracking", () => {
  it("returns the watcher's receipt when it resolves", async () => {
    const tracked = client({
      waitForTransactionReceipt: vi.fn().mockResolvedValue(receipt),
    });
    await expect(waitForTrackedReceipt(tracked, HASH)).resolves.toBe(receipt);
    expect(tracked.waitForTransactionReceipt).toHaveBeenCalledWith({
      hash: HASH,
      timeout: 120_000,
    });
    expect(tracked.getTransactionReceipt).not.toHaveBeenCalled();
  });

  it("falls back to a direct receipt read after the watcher rejects", async () => {
    const tracked = client();
    await expect(waitForTrackedReceipt(tracked, HASH)).resolves.toBe(receipt);
    expect(tracked.getTransactionReceipt).toHaveBeenCalledWith({ hash: HASH });
  });

  it("keeps reading until a lagging node has the receipt", async () => {
    const tracked = client({
      getTransactionReceipt: vi
        .fn()
        .mockRejectedValueOnce(new Error("TransactionReceiptNotFoundError"))
        .mockRejectedValueOnce(new Error("TransactionReceiptNotFoundError"))
        .mockResolvedValue(receipt),
    });
    await expect(
      waitForTrackedReceipt(tracked, HASH, { attempts: 3, intervalMs: 0 }),
    ).resolves.toBe(receipt);
    expect(tracked.getTransactionReceipt).toHaveBeenCalledTimes(3);
  });

  it("retains the submitted hash when every receipt source is unavailable", async () => {
    const watcherError = new Error("RPC unavailable");
    const tracked = client({
      waitForTransactionReceipt: vi.fn().mockRejectedValue(watcherError),
      getTransactionReceipt: vi
        .fn()
        .mockRejectedValue(new Error("RPC unavailable")),
    });
    const error = await waitForTrackedReceipt(tracked, HASH, {
      attempts: 2,
      intervalMs: 0,
    }).catch((reason: unknown) => reason);
    expect(isTransactionReceiptUnavailableError(error)).toBe(true);
    expect(error).toMatchObject({
      name: "TransactionReceiptUnavailableError",
      hash: HASH,
      chainId: 8453,
      cause: watcherError,
      message: `Transaction ${HASH} was submitted on chain 8453, but confirmation tracking is temporarily unavailable. Check this transaction and do not submit it again yet.`,
    });
    expect(tracked.getTransactionReceipt).toHaveBeenCalledTimes(2);
  });

  it("reads at least once, and says less when the client has no chain", async () => {
    const tracked = client({
      chain: undefined,
      getTransactionReceipt: vi.fn().mockRejectedValue(new Error("down")),
    });
    const error = await waitForTrackedReceipt(tracked, HASH, {
      attempts: 0,
      intervalMs: -1,
    }).catch((reason: unknown) => reason);
    expect(tracked.getTransactionReceipt).toHaveBeenCalledTimes(1);
    expect((error as Error).message).toBe(
      `Transaction ${HASH} was submitted, but confirmation tracking is temporarily unavailable. Check this transaction and do not submit it again yet.`,
    );
    expect(new TransactionReceiptUnavailableError(HASH).cause).toBeUndefined();
    expect(isTransactionReceiptUnavailableError(new Error("other"))).toBe(
      false,
    );
  });
});
