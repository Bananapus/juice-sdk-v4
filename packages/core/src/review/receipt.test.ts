import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Hex, PublicClient, TransactionReceipt } from "viem";
import { describe, expect, it, vi } from "vitest";
import { errorLine } from "./transaction-message.js";
import {
  heldBlock,
  heldReceipt,
  isTransactionReceiptUnavailableError,
  TRANSACTION_TRACKING_UNAVAILABLE_LINE,
  TransactionReceiptUnavailableError,
  waitForTrackedReceipt,
  tell,
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
  const at = (blockHash: Hex, status: "success" | "reverted" = "success") =>
    ({ ...receipt, blockHash, status }) as unknown as TransactionReceipt;
  /** A node whose receipt of HASH is in `blockHash`, block 12 being `canonical`, final through `final`. */
  const node = (
    blockHash: Hex,
    {
      canonical = blockHash,
      final = 20n,
      status = "success" as "success" | "reverted",
    } = {},
  ) =>
    ({
      getTransactionReceipt: vi.fn(async () => at(blockHash, status)),
      getBlock: vi.fn(
        async ({ blockNumber, blockHash: byHash }: Record<string, unknown>) =>
          byHash
            ? { number: 12n, hash: byHash }
            : blockNumber === undefined
              ? { number: final, hash: other }
              : { number: blockNumber, hash: canonical },
      ),
    }) as unknown as Parameters<typeof heldReceipt>[1] & {
      getTransactionReceipt: ReturnType<typeof vi.fn>;
    };
  const success = { result: "success" as const, hash: HASH };

  it("keeps a seen receipt in the block the hold verified, else reads it", async () => {
    const seen = at(verified);
    const chain = node(verified);
    await expect(
      heldReceipt({ ...success, blockHash: verified }, chain, seen),
    ).resolves.toBe(seen);
    expect(chain.getTransactionReceipt).not.toHaveBeenCalled();
    await expect(
      heldReceipt({ ...success, blockHash: verified }, chain, at(other)),
    ).resolves.toMatchObject({ blockHash: verified });
  });

  it("refuses a read in another block than the one the hold verified, or a success that reads reverted", async () => {
    await expect(
      heldReceipt({ ...success, blockHash: verified }, node(other)),
    ).rejects.toThrow("not the one its hold verified");
    await expect(
      heldReceipt(
        { ...success, blockHash: verified },
        node(verified, { status: "reverted" }),
      ),
    ).rejects.toThrow("not the one its hold verified");
    await expect(
      heldReceipt(
        { result: "failed", hash: HASH, blockHash: verified },
        node(verified, { status: "reverted" }),
      ),
    ).resolves.toMatchObject({ status: "reverted" });
  });

  it("with no block kept, takes only a receipt in a canonical, final block", async () => {
    await expect(heldReceipt(success, node(verified))).resolves.toMatchObject({
      blockHash: verified,
    });
    await expect(
      heldReceipt(success, node(verified, { canonical: other })),
    ).rejects.toThrow("not the one its hold verified");
    await expect(
      heldReceipt(success, node(verified, { final: 11n })),
    ).rejects.toThrow("not the one its hold verified");
  });

  it("finds the block a hold verified while it is canonical", async () => {
    await expect(
      heldBlock(
        { ...success, blockHash: verified },
        node(other, { canonical: verified }),
      ),
    ).resolves.toEqual({ blockNumber: 12n, blockHash: verified });
    await expect(
      heldBlock(
        { ...success, blockHash: verified },
        node(other, { canonical: other }),
      ),
    ).rejects.toThrow("not the one its hold verified");
    await expect(heldBlock(success, node(verified))).resolves.toEqual({
      blockNumber: 12n,
      blockHash: verified,
    });
  });
});

/** Per review module (tests and fixtures aside, comments stripped), how often `pattern` appears. */
function inSources(pattern: RegExp): Record<string, number> {
  const found: Record<string, number> = {};
  const dir = fileURLToPath(new URL(".", import.meta.url));
  for (const file of readdirSync(dir, { recursive: true, encoding: "utf8" })) {
    if (!/\.tsx?$/u.test(file) || /\.test\.|__fixtures__/u.test(file)) continue;
    const code = readFileSync(`${dir}${file}`, "utf8")
      .replace(/\/\*[\s\S]*?\*\//gu, "")
      .replace(/\/\/[^\n]*/gu, "");
    const matches = code.match(pattern);
    if (matches) found[file] = matches.length;
  }
  return found;
}

describe("every receipt a sent step is told by is its hold's", () => {
  /**
   * The modules that read a receipt themselves: receipt.ts (the watcher and
   * heldReceipt), and the verifiers whose reads are the authority itself,
   * the hold's and Relayr's proofs. Any other read, or another read in them,
   * goes through heldReceipt or is added here deliberately.
   */
  const READERS: Record<string, number> = {
    "receipt.ts": 6,
    "relayr.ts": 3,
    "writeHold.ts": 6,
    "writeRecovery.ts": 2,
  };

  it("leaves no other receipt read in the review modules", () => {
    expect(
      inSources(
        /\b(?:getTransactionReceipt|waitForTransactionReceipt|eth_getTransactionReceipt)\b/gu,
      ),
    ).toEqual(READERS);
  });
});

describe("tell", () => {
  it("calls a site's callback, logging one that throws or rejects, and never throws itself", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const failure = new Error("the site's callback failed");
    const told = vi.fn();
    expect(tell(told, 1, "a")).toBeUndefined();
    expect(told).toHaveBeenCalledWith(1, "a");
    expect(tell(undefined)).toBeUndefined();
    expect(
      tell(() => {
        throw failure;
      }),
    ).toBeUndefined();
    await expect(tell(async () => "done")).resolves.toBeUndefined();
    await expect(tell(() => Promise.reject(failure))).resolves.toBeUndefined();
    expect(logged).toHaveBeenCalledTimes(2);
    expect(logged.mock.calls.every(([, error]) => error === failure)).toBe(
      true,
    );
    logged.mockRestore();
  });
});
