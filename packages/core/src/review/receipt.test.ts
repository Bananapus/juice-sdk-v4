import type { Hex, PublicClient, TransactionReceipt } from "viem";
import { describe, expect, it, vi } from "vitest";
import { errorLine } from "./transaction-message.js";
import {
  heldReceipt,
  isTransactionReceiptUnavailableError,
  TRANSACTION_TRACKING_UNAVAILABLE_LINE,
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
      message: TRANSACTION_TRACKING_UNAVAILABLE_LINE,
    });
    expect(tracked.getTransactionReceipt).toHaveBeenCalledTimes(2);
  });

  it("keeps the watcher's error out of a serialized error", async () => {
    // viem's RPC errors carry the request URL, which can hold an API key.
    const watcherError = new Error(
      "HTTP request failed. URL: https://rpc.example/v1/SECRETKEY",
    );
    const tracked = client({
      waitForTransactionReceipt: vi.fn().mockRejectedValue(watcherError),
      getTransactionReceipt: vi.fn().mockRejectedValue(new Error("down")),
    });
    const error = (await waitForTrackedReceipt(tracked, HASH, {
      attempts: 1,
      intervalMs: 0,
    }).catch(
      (reason: unknown) => reason,
    )) as TransactionReceiptUnavailableError;
    expect(error.cause).toBe(watcherError);
    expect(Object.keys(error)).not.toContain("cause");
    expect(Object.getOwnPropertyDescriptor(error, "cause")).toMatchObject({
      enumerable: false,
      writable: true,
      configurable: true,
    });
    const serialized = JSON.stringify(error);
    expect(serialized).not.toContain("SECRETKEY");
    expect(JSON.parse(serialized)).toEqual({
      name: "TransactionReceiptUnavailableError",
      hash: HASH,
      chainId: 8453,
    });
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
      TRANSACTION_TRACKING_UNAVAILABLE_LINE,
    );

    // A caller's unchecked hash stays a field, never the shown line.
    const raw = "0xhttps://wallet.example/SECRET\nraw second line" as Hex;
    const untracked = await waitForTrackedReceipt(
      client({
        waitForTransactionReceipt: vi.fn().mockRejectedValue(new Error("down")),
        getTransactionReceipt: vi.fn().mockRejectedValue(new Error("down")),
      }),
      raw,
      { attempts: 1, intervalMs: 0 },
    ).catch((reason: unknown) => reason);
    expect(untracked).toMatchObject({ hash: raw });
    expect(errorLine(untracked)).toBe(TRANSACTION_TRACKING_UNAVAILABLE_LINE);
    expect(new TransactionReceiptUnavailableError(HASH).cause).toBeUndefined();
    expect(isTransactionReceiptUnavailableError(new Error("other"))).toBe(
      false,
    );
  });
});

describe("heldReceipt", () => {
  const verified = `0x${"0b".repeat(32)}` as Hex;
  const other = `0x${"0c".repeat(32)}` as Hex;
  const at = (blockHash: Hex) =>
    ({ ...receipt, blockHash }) as unknown as TransactionReceipt;
  const reads = (blockHash: Hex) => ({
    getTransactionReceipt: vi.fn(async () => at(blockHash)),
  });

  it("keeps a seen receipt only in the block the hold verified, else reads it", async () => {
    const seen = at(verified);
    const node = reads(verified);
    await expect(
      heldReceipt({ hash: HASH, blockHash: verified }, node, seen),
    ).resolves.toBe(seen);
    expect(node.getTransactionReceipt).not.toHaveBeenCalled();
    await expect(
      heldReceipt({ hash: HASH, blockHash: verified }, node, at(other)),
    ).resolves.toMatchObject({ blockHash: verified });
    // A hold with no block (a log proved it) reads the hash's receipt.
    await expect(heldReceipt({ hash: HASH }, node, seen)).resolves.not.toBe(
      seen,
    );
  });

  it("refuses a read in another block than the one the hold verified", async () => {
    await expect(
      heldReceipt({ hash: HASH, blockHash: verified }, reads(other)),
    ).rejects.toThrow("no longer in the block its hold verified");
  });
});
