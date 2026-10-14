import { resetWriteHoldsForTests } from "../testing.js";
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
  SAFE_EXEC_ABI,
  SAFE_PROPOSAL_AWAITING,
  safeProposalFor,
} from "../safeService.js";
import { uniswapV4Deployment } from "../v6/uniswapV4Deployments.js";
import { submitReviewedContractWrite } from "./contractWrite.js";
import {
  HELD_SUCCESS_LINE,
  SAFE_PROPOSAL_EXECUTED_LINE,
  WRITE_HOLD_HASHED_EXIT_LINE,
  WRITE_HOLD_IN_TAB_LINE,
  WRITE_HOLD_LOOKS_DONE_LINE,
  WRITE_HOLD_MINED_LINE,
  WRITE_HOLD_NONCE_LINE,
  WRITE_HOLD_PENDING_LINE,
  WRITE_HOLD_UNCHECKED_LINE,
  WRITE_HOLD_REVERTED_LINE,
  WRITE_HOLD_SAFE_REPLACED_LINE,
  WRITE_HOLD_SAFE_UNPROVEN_LINE,
  WRITE_HOLD_STALE_REVIEW_LINE,
  writeHeldMessage,
} from "./messages.js";
import { launchIntent } from "./intents.js";
import { createHeldWriteView } from "./heldWrite.js";
import { intent, writeIntentKey } from "./writeIntent.js";
import {
  createWriteHold,
  WriteHeldError,
  WriteHoldBusyError,
  WriteHoldNonceError,
  WriteHoldStaleReviewError,
  type WriteHoldClient,
  type WriteHoldGate,
  type WriteHeldState,
  type WriteHoldState,
} from "./writeHold.js";
import {
  createBrowserWriteRecovery,
  createHeldWriteStorage,
  type HeldWriteStorage,
  type ReviewedWriteRecoveryInput,
} from "./writeRecovery.js";

const ACCOUNT = "0x1111111111111111111111111111111111111111" as Address;
const TARGET = "0x2222222222222222222222222222222222222222" as Address;
const SAFE = "0x4444444444444444444444444444444444444444" as Address;
const RELAYER = "0x5555555555555555555555555555555555555555" as Address;
const HASH = `0x${"aa".repeat(32)}` as Hex;
const OTHER = `0x${"bb".repeat(32)}` as Hex;
const EXECUTION = `0x${"e1".repeat(32)}` as Hex;
const DATA = "0xaabbccdd0001" as Hex;
const ordinary: ReviewedWriteRecoveryInput = {
  chainId: 10,
  account: ACCOUNT,
  safe: false,
  call: { to: TARGET, data: DATA, value: 17n },
};

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete (globalThis as Record<symbol, unknown>)[
    Symbol.for("nana-sdk:held-writes")
  ];
});

/** The origin's storage, which a test can refuse to read or write. */
function origin() {
  const values = new Map<string, string>();
  const state = { read: true, write: true, drop: false };
  const storage = {
    get length() {
      if (!state.read) throw new Error("SecurityError");
      return values.size;
    },
    key: (index: number) => [...values.keys()][index] ?? null,
    getItem: (key: string) => {
      if (!state.read) throw new Error("SecurityError");
      return values.get(key) ?? null;
    },
    setItem: (key: string, value: string) => {
      if (!state.write) throw new Error("QuotaExceededError");
      if (!state.drop) values.set(key, value);
    },
    removeItem: (key: string) => {
      if (!state.write) throw new Error("QuotaExceededError");
      values.delete(key);
    },
  };
  return { values, state, storage };
}

/** Web Locks with queueing and ifAvailable, shared by everything given it. */
function lockManager() {
  const held = new Set<string>();
  const queues = new Map<string, Promise<void>>();
  return {
    async request<T>(
      name: string,
      options: LockOptions,
      work: (lock: Lock | null) => Promise<T>,
    ): Promise<T> {
      if (options.ifAvailable && held.has(name)) return work(null);
      while (held.has(name)) await queues.get(name);
      held.add(name);
      let done!: () => void;
      queues.set(name, new Promise<void>((resolve) => (done = resolve)));
      try {
        return await work({ name, mode: "exclusive" });
      } finally {
        held.delete(name);
        done();
      }
    },
  } as Pick<LockManager, "request">;
}

type Tx = {
  hash: Hex;
  from: Address;
  nonce: number;
  to: Address | null;
  input: Hex;
  value: bigint;
  block?: bigint;
  status?: "success" | "reverted";
  logs?: { address: Address; topics: Hex[]; data: Hex }[];
};

const word = (value: bigint) => `0x${value.toString(16).padStart(64, "0")}`;
const pad = (n: bigint) => `0x${n.toString(16).padStart(64, "0")}` as Hex;
const notFound = (name: string) =>
  Object.assign(new Error("not found"), { name });

/**
 * A chain: the account's transactions after its first 7, a Safe whose nonce
 * moves from 5 to 6 at `safeCrossing`, and a node that may not know some
 * hashes (`hidden`, a lagging node) or may have reorganized a block.
 */
function fakeChain() {
  const chain = {
    chainId: 10,
    head: 100n,
    finalized: 90n,
    txs: [] as Tx[],
    hidden: new Set<string>(),
    reorged: new Map<bigint, Hex>(),
    safeCrossing: undefined as bigint | undefined,
    safeLogs: [] as unknown[],
    time: (n: bigint) => 1_000n + n,
  };
  const blockHash = (n: bigint) => chain.reorged.get(n) ?? pad(n + 1n);
  const known = (hash: Hex) =>
    chain.hidden.has(hash.toLowerCase())
      ? undefined
      : chain.txs.find((tx) => tx.hash.toLowerCase() === hash.toLowerCase());
  const asTx = (tx: Tx) => ({
    hash: tx.hash,
    chainId: 10,
    from: tx.from,
    to: tx.to,
    input: tx.input,
    value: tx.value,
    nonce: tx.nonce,
    blockHash: tx.block === undefined ? null : blockHash(tx.block),
    blockNumber: tx.block ?? null,
    transactionIndex: tx.block === undefined ? null : 0,
  });
  const safeNonce = (n: bigint) =>
    chain.safeCrossing !== undefined && n >= chain.safeCrossing ? 6n : 5n;
  const client = {
    getChainId: vi.fn(async () => chain.chainId),
    getBlockNumber: vi.fn(async () => chain.head),
    getTransactionCount: vi.fn(
      async (args: {
        address: Address;
        blockNumber?: bigint;
        blockTag?: string;
      }) =>
        7 +
        chain.txs.filter(
          (tx) =>
            tx.from.toLowerCase() === args.address.toLowerCase() &&
            (args.blockTag === "pending" ||
              (tx.block !== undefined && tx.block <= args.blockNumber!)),
        ).length,
    ),
    getTransaction: vi.fn(async ({ hash }: { hash: Hex }) => {
      const tx = known(hash);
      if (!tx) throw notFound("TransactionNotFoundError");
      return asTx(tx);
    }),
    getTransactionReceipt: vi.fn(async ({ hash }: { hash: Hex }) => {
      const tx = known(hash);
      if (!tx || tx.block === undefined)
        throw notFound("TransactionReceiptNotFoundError");
      return receiptOf(tx);
    }),
    getBlock: vi.fn(
      async (
        args: {
          blockTag?: string;
          blockNumber?: bigint;
          includeTransactions?: boolean;
        } = {},
      ) => {
        const number =
          args.blockTag === "finalized"
            ? chain.finalized
            : (args.blockNumber ?? chain.head);
        return {
          number,
          hash: blockHash(number),
          timestamp: chain.time(number),
          transactions: args.includeTransactions
            ? chain.txs.filter((tx) => tx.block === number).map(asTx)
            : [],
        };
      },
    ),
    request: vi.fn(
      async ({ method, params }: { method: string; params: unknown[] }) => {
        if (method === "eth_call") {
          const at = params[1] as string;
          return word(safeNonce(at === "latest" ? chain.head : BigInt(at)));
        }
        if (method === "eth_getBlockByNumber") {
          const n =
            params[0] === "finalized"
              ? chain.finalized
              : BigInt(params[0] as string);
          return { number: `0x${n.toString(16)}`, hash: blockHash(n) };
        }
        if (method === "eth_getLogs") {
          const filter = params[0] as { fromBlock: string };
          return BigInt(filter.fromBlock) === chain.safeCrossing
            ? chain.safeLogs
            : [];
        }
        throw new Error(`unexpected ${method}`);
      },
    ),
  };
  function receiptOf(tx: Tx): TransactionReceipt {
    return {
      transactionHash: tx.hash,
      blockHash: blockHash(tx.block!),
      blockNumber: tx.block!,
      transactionIndex: 0,
      from: tx.from,
      to: tx.to,
      status: tx.status ?? "success",
      logs: (tx.logs ?? []).map((log, logIndex) => ({
        ...log,
        transactionHash: tx.hash,
        blockHash: blockHash(tx.block!),
        blockNumber: tx.block!,
        transactionIndex: 0,
        logIndex,
        removed: false,
      })),
    } as unknown as TransactionReceipt;
  }
  return {
    chain,
    client: client as unknown as WriteHoldClient & typeof client,
    receiptOf,
  };
}

const sent = (hash: Hex, extra: Partial<Tx> = {}): Tx => ({
  hash,
  from: ACCOUNT,
  nonce: 7,
  to: TARGET,
  input: DATA,
  value: 17n,
  ...extra,
});

/** A wallet boundary: `reply` is what the wallet does once opened. */
function wallet(reply: () => Promise<Hex>) {
  const write = vi.fn(reply);
  const send = (gate: WriteHoldGate) =>
    submitReviewedContractWrite({
      request: { chainId: 10 },
      expectedAccount: ACCOUNT,
      currentAccount: () => ACCOUNT,
      review: async () => {},
      switchChain: async () => {},
      simulate: async () => ({}),
      beforeWrite: () => gate.beforeSend(),
      onBeforeWriteAborted: () => gate.onRejected(),
      onWriteRejected: () => gate.onRejected(),
      onWriteSubmitted: (hash: Hex) => gate.afterSubmit(hash),
      write,
    });
  return { write, send };
}

/** A wallet whose reply is lost after it may have sent. */
const lostReply = () =>
  wallet(async () => {
    throw new Error("reply lost");
  });

function setup(
  options: {
    storage?: HeldWriteStorage;
    memory?: Map<string, string>;
    browser?: ReturnType<typeof origin>;
    locks?: Pick<LockManager, "request">;
  } = {},
) {
  const browser = options.browser ?? origin();
  const memory = options.memory ?? new Map<string, string>();
  const storage =
    options.storage ??
    createHeldWriteStorage({ durable: () => browser.storage, memory });
  const locks = options.locks ?? lockManager();
  const hold = createWriteHold({
    storage,
    locks,
    settle: { intervalMs: 1_000, attempts: 3 },
  });
  return { hold, browser, memory, storage, locks };
}

describe("memory-only mode", () => {
  it("carries the storage-refused line on the review and on every held state", async () => {
    const browser = origin();
    browser.state.write = false;
    const { hold } = setup({ browser });
    const { client } = fakeChain();
    expect(hold.reviewLine()).toBe(WRITE_HOLD_IN_TAB_LINE);
    const handle = hold.open(ordinary);
    const heard: WriteHoldState[] = [];
    handle.subscribe((state) => heard.push(state));
    await expect(handle.send(client, lostReply().send)).rejects.toThrow();
    for (const state of [
      handle.peek(),
      await handle.state(client),
      ...heard.filter((state) => state.status !== "clear"),
    ])
      expect(state).toMatchObject({ notice: WRITE_HOLD_IN_TAB_LINE });
    // With shared storage, no notice.
    browser.state.write = true;
    expect(handle.peek()).not.toHaveProperty("notice");
  });

  it("refreshes the notice on a replayed state", async () => {
    const browser = origin();
    const { hold } = setup({ browser });
    const { client } = fakeChain();
    const handle = hold.open(ordinary);
    await expect(handle.send(client, lostReply().send)).rejects.toThrow();
    await handle.state(client);
    // Storage is refused after the state was emitted.
    browser.state.write = false;
    const late = vi.fn();
    hold.open(ordinary).subscribe(late);
    expect(late.mock.calls[0][0]).toMatchObject({
      notice: WRITE_HOLD_IN_TAB_LINE,
    });
    browser.state.write = true;
    const later = vi.fn();
    hold.open(ordinary).subscribe(later);
    expect(later.mock.calls[0][0]).not.toHaveProperty("notice");
  });

  it("puts the notice on the state a final reserve refuses with", async () => {
    const browser = origin();
    browser.state.write = false;
    const memory = new Map<string, string>();
    const locks = lockManager();
    const intentTab = setup({ browser, memory, locks });
    const exactTab = setup({ browser, memory, locks });
    const { client } = fakeChain();
    const key = writeIntentKey("pay", { projectId: 4n });
    const handle = intentTab.hold.open(
      {
        ...ordinary,
        call: { ...ordinary.call, data: "0xaabbccdd0002" as Hex },
        namespace: key,
      },
      { legacy: [{ call: ordinary.call }] },
    );
    const refused = await handle
      .send(client, async (gate) => {
        await expect(
          exactTab.hold.open(ordinary).send(client, lostReply().send),
        ).rejects.toThrow();
        await gate.beforeSend();
      })
      .catch((e) => e);
    expect(refused).toBeInstanceOf(WriteHeldError);
    expect(refused.state).toMatchObject({ notice: WRITE_HOLD_IN_TAB_LINE });
  });
});

describe("write hold storage", () => {
  it("keeps holds in the tab's memory while storage is refused, with the review's line", () => {
    const browser = origin();
    const { hold } = setup({ browser });
    expect(hold.durable()).toBe(true);
    expect(hold.reviewLine()).toBeNull();
    expect(browser.values.size).toBe(0);
    browser.state.write = false;
    expect(hold.durable()).toBe(false);
    expect(hold.reviewLine()).toBe(WRITE_HOLD_IN_TAB_LINE);
    // A browser that silently keeps nothing is not durable either.
    Object.assign(browser.state, { write: true, drop: true });
    expect(hold.durable()).toBe(false);
    const none = createHeldWriteStorage({
      durable: () => undefined,
      memory: new Map(),
    });
    expect(none.durable()).toBe(false);
    none.setItem("k", "v");
    expect(none.getItem("k")).toBe("v");
    none.removeItem("k");
    expect(none.getItem("k")).toBeNull();
  });

  it("defaults to localStorage and one memory per tab shared by module copies", async () => {
    const browser = origin();
    vi.stubGlobal("localStorage", browser.storage);
    const first = createHeldWriteStorage();
    first.setItem("k", "v");
    expect(browser.values.get("k")).toBe("v");
    browser.state.write = false;
    first.setItem("m", "kept");
    vi.resetModules();
    const copy = (await import(
      "./writeRecovery.js"
    )) as typeof import("./writeRecovery.js");
    expect(copy.createHeldWriteStorage().getItem("m")).toBe("kept");
    // A probe it can't remove names no write.
    browser.state.write = true;
    const sticky = {
      ...browser.storage,
      removeItem: () => {
        throw new Error("refused");
      },
    };
    expect(
      createHeldWriteStorage({
        durable: () => sticky,
        memory: new Map(),
      }).durable(),
    ).toBe(true);
  });

  it("moves a memory hold into storage once storage can be written, so a reload still holds it", async () => {
    const browser = origin();
    browser.state.write = false;
    const first = setup({ browser });
    const lost = wallet(async () => {
      throw new Error("reply lost");
    });
    const { client } = fakeChain();
    await expect(
      first.hold.open(ordinary).send(client, lost.send),
    ).rejects.toThrow("reply lost");
    expect(browser.values.size).toBe(0);
    // Storage comes back: the next read in this tab moves the hold there.
    browser.state.write = true;
    expect(first.hold.open(ordinary).peek().status).toBe("held-no-hash");
    expect(
      [...first.memory.keys()].filter((k) => !k.endsWith(":latest")),
    ).toEqual([]);
    // A reload (a new tab memory) still sees it, and refuses a second send.
    const reloaded = setup({ browser });
    const again = wallet(async () => HASH);
    await expect(
      reloaded.hold.open(ordinary).send(client, again.send),
    ).rejects.toBeInstanceOf(WriteHeldError);
    expect(lost.write).toHaveBeenCalledOnce();
    expect(again.write).not.toHaveBeenCalled();
  });

  it("still holds what this tab saw once storage can't be read", async () => {
    const browser = origin();
    const { hold } = setup({ browser });
    const { client } = fakeChain();
    const lost = wallet(async () => {
      throw new Error("reply lost");
    });
    await expect(hold.open(ordinary).send(client, lost.send)).rejects.toThrow();
    browser.state.read = false;
    expect(hold.open(ordinary).peek().status).toBe("held-no-hash");
    await expect(
      hold.open(ordinary).send(client, wallet(async () => HASH).send),
    ).rejects.toBeInstanceOf(WriteHeldError);
    // A key this tab never saw reads as empty.
    const storage = createHeldWriteStorage({
      durable: () => browser.storage,
      memory: new Map(),
    });
    expect(storage.getItem("never")).toBeNull();
    // Nothing can be removed while storage can't be read or written.
    browser.state.write = false;
    storage.removeItem("never");
  });

  it("shares what the tab last read from storage across controllers and module copies", async () => {
    const browser = origin();
    const { client } = fakeChain();
    const first = createWriteHold({
      storage: createHeldWriteStorage({ durable: () => browser.storage }),
      locks: lockManager(),
    });
    await expect(
      first.open(ordinary).send(
        client,
        wallet(async () => {
          throw new Error("reply lost");
        }).send,
      ),
    ).rejects.toThrow();
    // Another tab releases a different call: its deletion is seen here too.
    const other = { ...ordinary, call: { ...ordinary.call, value: 1n } };
    await first.open(other).send(client, wallet(async () => HASH).send);
    browser.values.delete(
      [...browser.values.keys()].find((key) => key.includes(":1:"))!,
    );
    expect(first.open(other).peek().status).toBe("clear");
    browser.state.read = false;
    vi.resetModules();
    const copy = (await import(
      "./writeHold.js"
    )) as typeof import("./writeHold.js");
    const recovery = (await import(
      "./writeRecovery.js"
    )) as typeof import("./writeRecovery.js");
    const second = copy.createWriteHold({
      storage: recovery.createHeldWriteStorage({
        durable: () => browser.storage,
      }),
      locks: lockManager(),
    });
    const again = wallet(async () => OTHER);
    await expect(
      second.open(ordinary).send(client, again.send),
    ).rejects.toMatchObject({ name: "WriteHeldError" });
    expect(again.write).not.toHaveBeenCalled();
    expect(second.open(other).peek().status).toBe("clear");
  });

  it("holds a live record saved in storage first, then the one kept in memory", () => {
    const browser = origin();
    const memory = new Map<string, string>();
    const storage = createHeldWriteStorage({
      durable: () => browser.storage,
      memory,
    });
    const a = JSON.stringify({ id: "a" });
    const b = JSON.stringify({ id: "b" });
    browser.values.set("k", a);
    memory.set("k", b);
    expect(storage.getItem("k")).toBe(a);
    // Its release marker lets the memory record move in.
    browser.values.set("k:released:a", "1");
    expect(storage.getItem("k")).toBe(b);
    expect(memory.has("k")).toBe(false);
    expect(browser.values.get("k")).toBe(b);
    // A record with no ID can't be released by marker: it is held first.
    browser.values.set("j", "not json");
    memory.set("j", b);
    expect(storage.getItem("j")).toBe("not json");
    browser.values.set("i", JSON.stringify({}));
    memory.set("i", b);
    expect(storage.getItem("i")).toBe(JSON.stringify({}));
    // The same value in both is one record.
    memory.set("k", b);
    expect(storage.getItem("k")).toBe(b);
    expect(memory.has("k")).toBe(false);
  });

  it("prefers newer evidence of the same record kept in memory, and removes only the record shown", () => {
    const browser = origin();
    const memory = new Map<string, string>();
    const storage = createHeldWriteStorage({
      durable: () => browser.storage,
      memory,
    });
    const reserved = JSON.stringify({ id: "a" });
    const hashed = JSON.stringify({ id: "a", hash: HASH });
    storage.setItem("k", reserved);
    browser.state.write = false;
    storage.setItem("k", hashed);
    expect(memory.get("k")).toBe(hashed);
    expect(storage.getItem("k")).toBe(hashed);
    browser.state.write = true;
    storage.setItem("k", hashed);
    expect(memory.has("k")).toBe(false);
    // Another live record in storage is removed first; memory's waits.
    const other = JSON.stringify({ id: "z" });
    memory.set("k", other);
    storage.setItem("k", JSON.stringify({ id: "a", hash: OTHER }));
    expect(memory.get("k")).toBe(other);
    storage.removeItem("k");
    expect(storage.getItem("k")).toBe(other);
    expect(browser.values.get("k")).toBe(other);
    // A memory record shown over a released one is removed from both.
    browser.state.write = false;
    memory.set("m", other);
    storage.removeItem("m");
    expect(storage.getItem("m")).toBeNull();
    browser.state.write = true;
    browser.values.set("n", reserved);
    browser.values.set("n:released:a", "1");
    memory.set("n", other);
    browser.state.write = false;
    storage.removeItem("n");
    expect(memory.has("n")).toBe(false);
    expect(browser.values.get("n")).toBe(reserved);
  });
});

describe("a held write", () => {
  it("replays no older settlement after another controller's newer attempt ended", async () => {
    const browser = origin();
    const first = setup({ browser });
    const second = setup({ browser, locks: first.locks });
    const { chain, client, receiptOf } = fakeChain();
    await first.hold.open(ordinary).send(client, wallet(async () => HASH).send);
    chain.txs.push(sent(HASH, { block: 95n }));
    await first.hold.open(ordinary).onReceipt(receiptOf(chain.txs[0]), client);
    // Codex: B reserves and exits a newer attempt in another controller.
    const b = second.hold.open(ordinary);
    await expect(b.send(client, lostReply().send)).rejects.toThrow();
    await b.exit(await b.state(client), { checkedWallet: true }, client);
    expect(first.hold.open(ordinary).peek()).toEqual({
      status: "clear",
      reservation: expect.any(String),
    });
    const late = vi.fn();
    first.hold.open(ordinary).subscribe(late);
    expect(late).toHaveBeenCalledWith({
      status: "clear",
      reservation: expect.any(String),
    });
  });

  it("replays nothing stale once another controller reserved the call", async () => {
    const browser = origin();
    const first = setup({ browser });
    const second = setup({ browser, locks: first.locks });
    const { client } = fakeChain();
    await expect(first.hold.open(ordinary).state(client)).resolves.toEqual({
      checked: true,
      status: "clear",
    });
    await second.hold
      .open(ordinary)
      .send(client, wallet(async () => HASH).send);
    const late = vi.fn();
    first.hold.open(ordinary).subscribe(late);
    expect(late).toHaveBeenCalledOnce();
    expect(late.mock.calls[0][0]).toMatchObject({
      status: "pending-known-hash",
      hash: HASH,
    });
    expect(first.hold.open(ordinary).peek()).toMatchObject({
      status: "pending-known-hash",
    });
  });

  it("replays a clear, with its settlement, while the call is still clear", async () => {
    const { hold } = setup();
    const { client } = fakeChain();
    await hold.open(ordinary).state(client);
    const late = vi.fn();
    hold.open(ordinary).subscribe(late);
    expect(late).toHaveBeenCalledWith({ status: "clear" });
  });

  it("never attaches a hash the reservation's own evidence contradicts", async () => {
    const { hold } = setup();
    const { chain, client } = fakeChain();
    // Codex: the identical call mined earlier, at nonce 7 and block 80.
    chain.txs.push(sent(HASH, { block: 80n }));
    const handle = hold.open(ordinary);
    await expect(handle.send(client, lostReply().send)).rejects.toThrow();
    expect(handle.peek()).toMatchObject({
      status: "held-no-hash",
      record: { nonce: "8", fromBlock: "100" },
    });
    await expect(handle.attachHash(client, HASH)).resolves.toMatchObject({
      status: "held-no-hash",
    });
    // At a nonce the reservation's next nonce rules out, even pending.
    chain.txs.push({ ...sent(OTHER), nonce: 6 });
    await expect(handle.attachHash(client, OTHER)).resolves.toMatchObject({
      status: "held-no-hash",
    });
    // Codex: a node that names no chain, through a client on another chain.
    const THIRD = `0x${"3d".repeat(32)}` as Hex;
    chain.txs.push({ ...sent(THIRD), nonce: 8 });
    const lookup = client.getTransaction.getMockImplementation()!;
    client.getTransaction.mockImplementation(
      async (args) =>
        ({ ...(await lookup(args)), chainId: undefined }) as never,
    );
    chain.chainId = 11;
    await expect(handle.attachHash(client, THIRD)).resolves.toMatchObject({
      status: "held-no-hash",
    });
    chain.chainId = 10;
    // Mined before the reservation, at an allowed nonce: still not this attempt.
    client.getTransaction.mockImplementation(lookup);
    const FOURTH = `0x${"4d".repeat(32)}` as Hex;
    chain.txs.push({ ...sent(FOURTH), nonce: 8, block: 90n });
    await expect(handle.attachHash(client, FOURTH)).resolves.toMatchObject({
      status: "held-no-hash",
    });
    client.getTransaction.mockImplementation(
      async (args) =>
        ({ ...(await lookup(args)), chainId: undefined }) as never,
    );
    await expect(handle.attachHash(client, THIRD)).resolves.toMatchObject({
      status: "pending-known-hash",
      hash: THIRD,
    });
  });

  it("never attaches to a record saved with no nonce evidence: it keeps its exit", async () => {
    const { hold, storage, locks } = setup();
    const { chain, client } = fakeChain();
    const legacy = createBrowserWriteRecovery(ordinary, { storage, locks });
    await legacy.withLock(async () => legacy.reserve());
    // Codex: an identical historical transaction can't be told from this attempt.
    chain.txs.push(sent(HASH, { block: 40n }));
    await expect(
      hold.open(ordinary).attachHash(client, HASH),
    ).resolves.toMatchObject({
      status: "held-no-hash",
      exit: true,
      line: WRITE_HOLD_UNCHECKED_LINE,
    });
  });

  it("attaches a hash kept only in memory when saving it fails, and accepts a node that names no chain", async () => {
    const browser = origin();
    const base = createHeldWriteStorage({
      durable: () => browser.storage,
      memory: new Map(),
    });
    let fail = false;
    const flaky: HeldWriteStorage = {
      ...base,
      setItem: (key, value) => {
        if (fail) throw new Error("full");
        base.setItem(key, value);
      },
    };
    const { hold } = setup({ storage: flaky });
    const { chain, client } = fakeChain();
    const handle = hold.open(ordinary);
    await expect(handle.send(client, lostReply().send)).rejects.toThrow();
    chain.txs.push(sent(HASH));
    const lookup = client.getTransaction.getMockImplementation()!;
    client.getTransaction.mockImplementationOnce(
      async (args) =>
        ({ ...(await lookup(args)), chainId: undefined }) as never,
    );
    fail = true;
    await expect(handle.attachHash(client, HASH)).resolves.toMatchObject({
      status: "pending-known-hash",
      hash: HASH,
    });
  });

  it("keys replay by the canonical scope, so a namespace never meets an exact call", async () => {
    const { hold } = setup();
    const { client } = fakeChain();
    await hold.open(ordinary).send(client, wallet(async () => HASH).send);
    // Codex: a namespace spelled like the exact call's key.
    const namespaced = {
      ...ordinary,
      call: { ...ordinary.call, value: 1n },
      namespace: `${TARGET}:17:${DATA}`.toLowerCase(),
    };
    const late = vi.fn();
    hold.open(namespaced).subscribe(late);
    expect(late).not.toHaveBeenCalled();
  });

  it("attaches an authenticated hash to the reservation and follows it", async () => {
    const { hold } = setup();
    const { chain, client } = fakeChain();
    const handle = hold.open(ordinary);
    await expect(handle.send(client, lostReply().send)).rejects.toThrow();
    const reserved = handle.peek() as WriteHeldState;
    // Nothing the chain can't authenticate is attached.
    await expect(handle.attachHash(client, HASH)).resolves.toMatchObject({
      status: "held-no-hash",
    });
    chain.txs.push({ ...sent(OTHER), value: 18n });
    await expect(handle.attachHash(client, OTHER)).resolves.toMatchObject({
      status: "held-no-hash",
    });
    await expect(
      handle.attachHash(client, "0x12" as Hex),
    ).resolves.toMatchObject({ status: "held-no-hash" });
    // The exact call from the account, pending: followed, with no exit.
    chain.txs.push(sent(HASH));
    const attached = await handle.attachHash(client, HASH);
    expect(attached).toMatchObject({
      status: "pending-known-hash",
      hash: HASH,
      exit: false,
      record: { id: reserved.record.id, hash: HASH },
    });
    // Another hash can't replace it.
    await expect(handle.attachHash(client, OTHER)).resolves.toMatchObject({
      record: { hash: HASH },
    });
    // Its receipt settles it.
    chain.txs[1].block = 95n;
    await expect(handle.state(client)).resolves.toEqual({
      checked: true,
      status: "clear",
      reservation: expect.any(String),
      settled: { result: "success", hash: HASH },
    });
    // With nothing held, or a Safe write, nothing is attached.
    await expect(handle.attachHash(client, HASH)).resolves.toMatchObject({
      status: "clear",
    });
  });

  it("offers an exit only through the gate: peek() and replays never do", async () => {
    const { hold } = setup();
    const { client } = fakeChain();
    const handle = hold.open(ordinary);
    await expect(handle.send(client, lostReply().send)).rejects.toThrow();
    // Read from storage alone, the exit isn't offered: the status and line stay.
    expect(handle.peek()).toMatchObject({
      status: "held-no-hash",
      exit: false,
      line: expect.any(String),
    });
    const gated = await handle.state(client);
    expect(gated).toMatchObject({ status: "held-no-hash", exit: true });
    // A late subscriber hears the state, never its exit.
    const late = vi.fn();
    hold.open(ordinary).subscribe(late);
    expect(late).toHaveBeenCalledOnce();
    expect(late.mock.calls[0][0]).toMatchObject({
      status: "held-no-hash",
      exit: false,
    });
    // Every emitted state that didn't pass the gate carries no exit either.
    const second = setup();
    const other = second.hold.open(ordinary);
    const seen: WriteHoldState[] = [];
    other.subscribe((state) => seen.push(state));
    await expect(other.send(client, lostReply().send)).rejects.toThrow();
    expect(
      seen.filter((state) => state.status !== "clear" && state.exit),
    ).toEqual([]);
    // The exit taken through the gate still releases.
    await expect(
      handle.exit(gated, { checkedWallet: true }, client),
    ).resolves.toMatchObject({ released: true });
  });

  it("replays the latest state to a subscriber that arrives late", async () => {
    const { hold } = setup();
    const { client } = fakeChain();
    const handle = hold.open(ordinary);
    const early = vi.fn();
    handle.subscribe(early);
    expect(early).not.toHaveBeenCalled();
    await handle.send(client, wallet(async () => HASH).send);
    const late = vi.fn();
    hold.open(ordinary).subscribe(late);
    expect(late).toHaveBeenCalledOnce();
    expect(late.mock.calls[0][0]).toMatchObject({
      status: "pending-known-hash",
      hash: HASH,
    });
  });

  it("reserves before the wallet, saves its hash and releases on a verified success at once", async () => {
    const { hold, browser } = setup();
    const { chain, client, receiptOf } = fakeChain();
    const handle = hold.open(ordinary);
    const seen: string[] = [];
    const stop = handle.subscribe((state) => seen.push(state.status));
    const { write, send } = wallet(async () => {
      expect(handle.peek().status).toBe("held-no-hash");
      return HASH;
    });
    await expect(handle.send(client, send)).resolves.toBe(HASH);
    const held = handle.peek();
    expect(held).toMatchObject({
      status: "pending-known-hash",
      hash: HASH,
      exit: false,
      line: WRITE_HOLD_PENDING_LINE,
      record: { nonce: "7", fromBlock: "100" },
    });
    expect(
      [...browser.values.keys()].filter((k) => !k.endsWith(":latest")),
    ).toHaveLength(1);
    chain.txs.push(sent(HASH, { block: 95n }));
    await expect(
      handle.onReceipt(receiptOf(chain.txs[0]), client),
    ).resolves.toEqual({
      status: "clear",
      reservation: expect.any(String),
      settled: { result: "success", hash: HASH },
    });
    expect(handle.peek()).toEqual({
      status: "clear",
      reservation: expect.any(String),
      settled: { result: "success", hash: HASH },
    });
    expect(seen).toEqual([
      "clear",
      "held-no-hash",
      "pending-known-hash",
      "clear",
    ]);
    stop();
    // A repeat after a seen success is a new action.
    await handle.send(client, wallet(async () => OTHER).send);
    expect(write).toHaveBeenCalledOnce();
  });

  it("refuses a held call before the review opens, and says how it is held", async () => {
    const { hold } = setup();
    const { client } = fakeChain();
    const handle = hold.open(ordinary);
    await handle.send(client, wallet(async () => HASH).send);
    const again = wallet(async () => OTHER);
    const refused = await handle.send(client, again.send).catch((e) => e);
    expect(refused).toBeInstanceOf(WriteHeldError);
    expect(refused.state.status).toBe("pending-known-hash");
    expect(refused.message).toBe(WRITE_HOLD_PENDING_LINE);
    expect(again.write).not.toHaveBeenCalled();
  });

  it("releases on an explicit rejection, and never reserves twice from two flows", async () => {
    const { hold } = setup();
    const { client } = fakeChain();
    const rejected = wallet(async () => {
      throw Object.assign(new Error("denied"), { code: 4001 });
    });
    await expect(
      hold.open(ordinary).send(client, rejected.send),
    ).rejects.toThrow("denied");
    expect(hold.open(ordinary).peek().status).toBe("clear");

    let open!: () => void;
    const first = wallet(
      () => new Promise<Hex>((resolve) => (open = () => resolve(HASH))),
    );
    const second = wallet(async () => OTHER);
    const a = hold.open(ordinary).send(client, first.send);
    await vi.waitFor(() => expect(first.write).toHaveBeenCalled());
    await expect(
      hold.open(ordinary).send(client, second.send),
    ).rejects.toBeInstanceOf(WriteHoldBusyError);
    // While one flow sends, another's state() reads the saved record only.
    await expect(hold.open(ordinary).state(client)).resolves.toMatchObject({
      status: "held-no-hash",
    });
    open();
    await a;
    await expect(
      hold.open(ordinary).send(client, second.send),
    ).rejects.toBeInstanceOf(WriteHeldError);
    expect(second.write).not.toHaveBeenCalled();
  });

  it("is shared by two module copies on one storage, and by their tab memory", async () => {
    for (const refused of [false, true]) {
      const browser = origin();
      browser.state.write = !refused;
      const locks = lockManager();
      const copies = [];
      for (let i = 0; i < 2; i += 1) {
        vi.resetModules();
        const writeHold = (await import(
          "./writeHold.js"
        )) as typeof import("./writeHold.js");
        const recovery = (await import(
          "./writeRecovery.js"
        )) as typeof import("./writeRecovery.js");
        copies.push(
          writeHold.createWriteHold({
            storage: recovery.createHeldWriteStorage({
              durable: () => browser.storage,
            }),
            locks,
          }),
        );
      }
      const { client } = fakeChain();
      const lost = wallet(async () => {
        throw new Error("reply lost");
      });
      await expect(
        copies[0].open(ordinary).send(client, lost.send),
      ).rejects.toThrow();
      const again = wallet(async () => HASH);
      const refusedSend = await copies[1]
        .open(ordinary)
        .send(client, again.send)
        .catch((e) => e);
      expect(refusedSend.name).toBe("WriteHeldError");
      expect(again.write).not.toHaveBeenCalled();
      delete (globalThis as Record<symbol, unknown>)[
        Symbol.for("nana-sdk:held-writes")
      ];
    }
  });

  it("offers the exit only without a known hash, rechecks it and releases exactly the snapshot", async () => {
    const { hold } = setup();
    const { client } = fakeChain();
    const handle = hold.open(ordinary);
    await expect(
      handle.send(
        client,
        wallet(async () => {
          throw new Error("reply lost");
        }).send,
      ),
    ).rejects.toThrow();
    const shown = await handle.state(client);
    expect(shown).toMatchObject({ status: "held-no-hash", exit: true });
    await expect(handle.exit(shown, {} as never, client)).rejects.toThrow(
      "checked their wallet",
    );
    await expect(
      handle.exit({ status: "clear" }, { checkedWallet: true }, client),
    ).resolves.toMatchObject({
      released: false,
      state: { status: "held-no-hash" },
    });
    await expect(
      handle.exit(shown, { checkedWallet: true }, client),
    ).resolves.toEqual({
      released: true,
      state: {
        checked: true,
        status: "clear",
        reservation: expect.any(String),
      },
    });
    const again = wallet(async () => HASH);
    await handle.send(client, again.send);
    expect(again.write).toHaveBeenCalledOnce();
  });

  it.each([
    ["two tabs on the browser's storage", false],
    ["two flows on one tab's memory", true],
  ])(
    "refuses a stale exit after another released it and sent again: %s",
    async (_, refused) => {
      const browser = origin();
      browser.state.write = !refused;
      const tabA = setup({ browser });
      const tabB = setup({
        browser,
        locks: tabA.locks,
        ...(refused ? { storage: tabA.storage } : {}),
      });
      const { client } = fakeChain();
      await expect(
        tabA.hold.open(ordinary).send(
          client,
          wallet(async () => {
            throw new Error("reply lost");
          }).send,
        ),
      ).rejects.toThrow();
      const staleA = await tabA.hold.open(ordinary).state(client);
      const shownB = await tabB.hold.open(ordinary).state(client);
      await tabB.hold
        .open(ordinary)
        .exit(shownB, { checkedWallet: true }, client);
      await tabB.hold
        .open(ordinary)
        .send(client, wallet(async () => HASH).send);
      const result = await tabA.hold
        .open(ordinary)
        .exit(staleA, { checkedWallet: true }, client);
      expect(result).toMatchObject({
        released: false,
        state: { status: "pending-known-hash", hash: HASH },
      });
      expect(tabA.hold.open(ordinary).peek().status).toBe("pending-known-hash");
    },
  );

  it("refuses a stale exit once another tab found the same attempt's hash", async () => {
    const browser = origin();
    const tabA = setup({ browser });
    const tabB = setup({ browser, locks: tabA.locks });
    const { chain, client } = fakeChain();
    await expect(
      tabA.hold.open(ordinary).send(
        client,
        wallet(async () => {
          throw new Error("reply lost");
        }).send,
      ),
    ).rejects.toThrow();
    const staleA = await tabA.hold.open(ordinary).state(client);
    // The wallet's late reply reaches tab B, which saves it on the same attempt.
    const late = createBrowserWriteRecovery(ordinary, {
      storage: tabB.storage,
      locks: tabB.locks,
    });
    await late.withLock(async () =>
      late.submitted(HASH, (staleA as WriteHeldState).record),
    );
    chain.txs.push(sent(HASH));
    await expect(tabB.hold.open(ordinary).state(client)).resolves.toMatchObject(
      {
        status: "pending-known-hash",
        record: {
          id: (staleA as { record: { id: string } }).record.id,
          hash: HASH,
        },
      },
    );
    const result = await tabA.hold
      .open(ordinary)
      .exit(staleA, { checkedWallet: true }, client);
    expect(result).toMatchObject({
      released: false,
      state: { status: "pending-known-hash", hash: HASH },
    });
  });

  it("offers the warned exit 30 minutes after submission when every transaction read fails", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(1_000_000);
    const { hold } = setup();
    const { client } = fakeChain();
    const handle = hold.open(ordinary);
    await handle.send(client, wallet(async () => HASH).send);
    client.getTransaction.mockRejectedValue(new Error("timeout"));
    client.getTransactionReceipt.mockRejectedValue(new Error("timeout"));
    await expect(handle.state(client)).resolves.toMatchObject({
      status: "pending-known-hash",
      exit: false,
    });
    vi.setSystemTime(1_000_000 + 31 * 60_000);
    const unchecked = await handle.state(client);
    expect(unchecked).toMatchObject({
      status: "held-unchecked",
      hash: HASH,
      exit: true,
      warning: WRITE_HOLD_HASHED_EXIT_LINE,
    });
    await expect(
      handle.exit(unchecked, { checkedWallet: true }, client),
    ).resolves.toMatchObject({ released: true });
    vi.useRealTimers();
  });

  it("restarts the unknown-read clock on positive pending evidence", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(1_000_000);
    const { hold } = setup();
    const { chain, client } = fakeChain();
    const handle = hold.open(ordinary);
    await handle.send(client, wallet(async () => HASH).send);
    chain.txs.push(sent(HASH));
    vi.setSystemTime(1_000_000 + 20 * 60_000);
    await handle.state(client);
    client.getTransaction.mockRejectedValue(new Error("timeout"));
    vi.setSystemTime(1_000_000 + 31 * 60_000);
    await expect(handle.state(client)).resolves.toMatchObject({
      status: "pending-known-hash",
      exit: false,
    });
    vi.setSystemTime(1_000_000 + 51 * 60_000);
    await expect(handle.state(client)).resolves.toMatchObject({
      status: "held-unchecked",
      exit: true,
    });
    vi.useRealTimers();
  });

  it("times a record saved before its clock existed from when it was first read", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(1_000_000);
    const { hold, browser } = setup();
    const { client } = fakeChain();
    const handle = hold.open(ordinary);
    await handle.send(client, wallet(async () => HASH).send);
    const [key] = [...browser.values.keys()].filter(
      (k) => !k.endsWith(":latest"),
    );
    const { submittedAt: _, ...legacy } = JSON.parse(browser.values.get(key)!);
    browser.values.set(key, JSON.stringify(legacy));
    client.getTransaction.mockRejectedValue(new Error("timeout"));
    vi.setSystemTime(1_000_000 + 10 * 60_000);
    await expect(handle.state(client)).resolves.toMatchObject({
      status: "pending-known-hash",
    });
    vi.setSystemTime(1_000_000 + 41 * 60_000);
    await expect(handle.state(client)).resolves.toMatchObject({
      status: "held-unchecked",
    });
    vi.useRealTimers();
  });

  describe("a mined hash whose receipt can't be read", () => {
    async function mined(path: "attached" | "returned", settles: boolean) {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(1_000_000);
      const { hold } = setup();
      const { chain, client } = fakeChain();
      const handle = hold.open(ordinary);
      if (path === "attached") {
        await expect(handle.send(client, lostReply().send)).rejects.toThrow();
      } else await handle.send(client, wallet(async () => HASH).send);
      chain.txs.push(sent(HASH, { block: 105n }));
      chain.head = 120n;
      const receipts = client.getTransactionReceipt.getMockImplementation()!;
      client.getTransactionReceipt.mockImplementation(async (args) => {
        if (args.hash === HASH) throw new Error("timeout");
        return receipts(args);
      });
      const first =
        path === "attached"
          ? await handle.attachHash(client, HASH)
          : await handle.state(client);
      // Mined: it may have run, so no exit yet, and no "speed it up".
      expect(first).toMatchObject({
        status: "pending-known-hash",
        hash: HASH,
        exit: false,
        line: WRITE_HOLD_MINED_LINE,
      });
      vi.setSystemTime(1_000_000 + 29 * 60_000);
      await expect(handle.state(client)).resolves.toMatchObject({
        status: "pending-known-hash",
        exit: false,
      });
      if (path === "returned" && !settles) {
        // Codex: once the clock is saved, read failures can't stop it.
        const lookup = client.getTransaction.getMockImplementation()!;
        client.getTransaction.mockImplementation(async (args) => {
          if (args.hash === HASH) throw new Error("timeout");
          return lookup(args);
        });
      }
      if (settles) {
        client.getTransactionReceipt.mockImplementation(receipts);
        await expect(handle.state(client)).resolves.toEqual({
          checked: true,
          status: "clear",
          reservation: expect.any(String),
          settled: { result: "success", hash: HASH },
        });
      } else {
        vi.setSystemTime(1_000_000 + 31 * 60_000);
        const unchecked = await handle.state(client);
        expect(unchecked).toMatchObject({
          status: "held-unchecked",
          hash: HASH,
          exit: true,
          warning: WRITE_HOLD_HASHED_EXIT_LINE,
        });
        await expect(
          handle.exit(unchecked, { checkedWallet: true }, client),
        ).resolves.toMatchObject({ released: true });
      }
      vi.useRealTimers();
    }

    it("restarts the clock when a mined replacement is adopted after a reorg", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(1_000_000);
      const { hold } = setup();
      const { chain, client } = fakeChain();
      const handle = hold.open(ordinary);
      await handle.send(client, wallet(async () => HASH).send);
      chain.txs.push(sent(HASH, { block: 105n }));
      chain.head = 120n;
      chain.finalized = 90n;
      const receipts = client.getTransactionReceipt.getMockImplementation()!;
      client.getTransactionReceipt.mockImplementation(async (args) => {
        if (args.hash === HASH || args.hash === OTHER)
          throw new Error("timeout");
        return receipts(args);
      });
      await expect(handle.state(client)).resolves.toMatchObject({
        status: "pending-known-hash",
        record: { minedAt: "1000000", sentNonce: "7" },
      });
      // Codex: a reorg drops it; a speed-up of the same call is mined instead.
      vi.setSystemTime(1_000_000 + 29 * 60_000);
      chain.txs.length = 0;
      chain.txs.push(sent(OTHER, { block: 106n }));
      chain.finalized = 110n;
      await expect(handle.state(client)).resolves.toMatchObject({
        status: "pending-known-hash",
        hash: OTHER,
        exit: false,
      });
      // Its own 30 minutes, not the original's: no exit yet.
      vi.setSystemTime(1_000_000 + 31 * 60_000);
      await expect(handle.state(client)).resolves.toMatchObject({
        status: "pending-known-hash",
        hash: OTHER,
        exit: false,
        line: WRITE_HOLD_MINED_LINE,
      });
      vi.useRealTimers();
    });

    it.each([
      ["attached", false],
      ["attached", true],
      ["returned", false],
      ["returned", true],
    ] as const)(
      "%s hash: the warned exit only after 30 minutes, unless its receipt settles it first (%s)",
      async (path, settles) => mined(path, settles),
    );
  });

  describe("a seen hash that vanished from the node", () => {
    async function seenThenGone(browser = origin()) {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(1_000_000);
      const ctx = setup({ browser });
      const fixture = fakeChain();
      const handle = ctx.hold.open(ordinary);
      await handle.send(fixture.client, wallet(async () => HASH).send);
      fixture.chain.txs.push(sent(HASH));
      await expect(handle.state(fixture.client)).resolves.toMatchObject({
        status: "pending-known-hash",
        record: { sentNonce: "7" },
      });
      // The wallet dropped it: the node no longer knows it, and its nonce is unused.
      fixture.chain.hidden.add(HASH);
      return { ...ctx, ...fixture, handle };
    }

    it("offers the exit once the node hasn't known it for 30 minutes, through a reload", async () => {
      const browser = origin();
      const { handle, client, locks } = await seenThenGone(browser);
      await expect(handle.state(client)).resolves.toMatchObject({
        status: "pending-known-hash",
        exit: false,
        record: { vanishedAt: "1000000" },
      });
      vi.setSystemTime(1_000_000 + 29 * 60_000);
      const reloaded = createWriteHold({
        storage: createHeldWriteStorage({
          durable: () => browser.storage,
          memory: new Map(),
        }),
        locks,
      }).open(ordinary);
      await expect(reloaded.state(client)).resolves.toMatchObject({
        status: "pending-known-hash",
        record: { vanishedAt: "1000000" },
      });
      vi.setSystemTime(1_000_000 + 31 * 60_000);
      const unchecked = await reloaded.state(client);
      expect(unchecked).toMatchObject({
        status: "held-unchecked",
        hash: HASH,
        exit: true,
        line: WRITE_HOLD_UNCHECKED_LINE,
        warning: WRITE_HOLD_HASHED_EXIT_LINE,
      });
      await expect(
        reloaded.exit(unchecked, { checkedWallet: true }, client),
      ).resolves.toMatchObject({ released: true });
      vi.useRealTimers();
    });

    it("follows it again if it reappears, and restarts the clock", async () => {
      const { handle, client, chain } = await seenThenGone();
      await handle.state(client);
      vi.setSystemTime(1_000_000 + 31 * 60_000);
      const unchecked = await handle.state(client);
      expect(unchecked.status).toBe("held-unchecked");
      // It reappears as the user takes the exit: it is followed, not released.
      chain.hidden.clear();
      const exit = await handle.exit(
        unchecked,
        { checkedWallet: true },
        client,
      );
      expect(exit).toMatchObject({
        released: false,
        state: { status: "pending-known-hash" },
      });
      expect((exit.state as WriteHeldState).record.vanishedAt).toBeUndefined();
      // Gone again: a new 30 minutes.
      chain.hidden.add(HASH);
      await expect(handle.state(client)).resolves.toMatchObject({
        status: "pending-known-hash",
        record: { vanishedAt: String(1_000_000 + 31 * 60_000) },
      });
      vi.useRealTimers();
    });

    it("restarts the clock when it reappears mined with no readable receipt", async () => {
      const { handle, client, chain } = await seenThenGone();
      await handle.state(client);
      vi.setSystemTime(1_000_000 + 31 * 60_000);
      // It mines, but its receipt can't be read yet.
      chain.hidden.clear();
      chain.txs[0].block = 101n;
      client.getTransactionReceipt.mockRejectedValueOnce(new Error("busy"));
      const mined = await handle.state(client);
      expect(mined).toMatchObject({
        status: "pending-known-hash",
        exit: false,
      });
      expect((mined as WriteHeldState).record.vanishedAt).toBeUndefined();
      // A reorg drops it again: a new 30 minutes, no exit at once.
      chain.txs[0].block = undefined;
      chain.hidden.add(HASH);
      await expect(handle.state(client)).resolves.toMatchObject({
        status: "pending-known-hash",
        exit: false,
        record: { vanishedAt: String(1_000_000 + 31 * 60_000) },
      });
      vi.useRealTimers();
    });

    it("offers only the warned exit, 30 minutes after it was last seen pending, when its nonce can't be proven", async () => {
      const { handle, client, chain } = await seenThenGone();
      // A node that can't answer starts no clock.
      client.getTransaction.mockRejectedValue(new Error("timeout"));
      await handle.state(client);
      expect(
        (handle.peek() as WriteHeldState).record.vanishedAt,
      ).toBeUndefined();
      client.getTransaction.mockReset();
      client.getTransaction.mockImplementation(async ({ hash }) => {
        const tx = chain.hidden.has(hash)
          ? undefined
          : chain.txs.find((t) => t.hash === hash);
        if (!tx)
          throw Object.assign(new Error("not found"), {
            name: "TransactionNotFoundError",
          });
        return {
          ...tx,
          chainId: 10,
          blockHash: null,
          blockNumber: null,
          transactionIndex: null,
        } as never;
      });
      await handle.state(client);
      // Not found, and the finalized block can't be read: no exit yet.
      vi.setSystemTime(1_000_000 + 29 * 60_000);
      const blocks = client.getBlock.getMockImplementation()!;
      client.getBlock.mockImplementation(async (args = {}) => {
        if (args.blockTag === "finalized") throw new Error("unsupported");
        return blocks(args);
      });
      await expect(handle.state(client)).resolves.toMatchObject({
        status: "pending-known-hash",
        exit: false,
      });
      // Codex: another transaction used the nonce, but the history behind it
      // can't be read. 30 minutes after it was last seen pending: the warned
      // exit, never a release on its own.
      client.getBlock.mockImplementation(async (args = {}) => {
        if (args.includeTransactions) throw new Error("history unavailable");
        return blocks(args);
      });
      chain.txs.push({ ...sent(OTHER), block: 105n });
      chain.head = 120n;
      chain.finalized = 110n;
      vi.setSystemTime(1_000_000 + 31 * 60_000);
      await expect(handle.state(client)).resolves.toMatchObject({
        status: "held-unchecked",
        exit: true,
        warning: WRITE_HOLD_HASHED_EXIT_LINE,
      });
      expect(handle.peek().status).not.toBe("clear");
      vi.useRealTimers();
    });
  });

  it("keeps a known pending hash held with no exit, even through a lagging node", async () => {
    const { hold } = setup();
    const { chain, client } = fakeChain();
    const handle = hold.open(ordinary);
    await handle.send(client, wallet(async () => HASH).send);
    chain.txs.push(sent(HASH));
    const pending = await handle.state(client);
    expect(pending).toMatchObject({
      status: "pending-known-hash",
      exit: false,
    });
    expect(pending.status !== "clear" && pending.record.sentNonce).toBe("7");
    // A node answer that can't be read decides nothing.
    client.getTransaction.mockResolvedValueOnce({ from: ACCOUNT } as never);
    await expect(handle.state(client)).resolves.toMatchObject({
      status: "pending-known-hash",
    });
    // The node loses it, and its nonce isn't past at a finalized block.
    chain.hidden.add(HASH);
    for (let look = 0; look < 2; look += 1)
      await expect(handle.state(client)).resolves.toMatchObject({
        status: "pending-known-hash",
      });
    await expect(
      handle.exit(
        { ...pending, exit: true } as WriteHoldState,
        { checkedWallet: true },
        client,
      ),
    ).resolves.toMatchObject({ released: false });
    expect(handle.peek().status).toBe("pending-known-hash");
  });

  it("resolves a canonical cancellation even while a node still reports the original hash pending", async () => {
    const { hold } = setup();
    const { chain, client } = fakeChain();
    const handle = hold.open(ordinary);
    await handle.send(client, wallet(async () => HASH).send);
    chain.txs.push(sent(HASH));
    await expect(handle.state(client)).resolves.toMatchObject({
      status: "pending-known-hash",
      record: { sentNonce: "7" },
    });
    // Codex: a finalized cancel used nonce 7; the node keeps HASH pending.
    chain.txs.push({
      ...sent(OTHER),
      to: ACCOUNT,
      input: "0x",
      value: 0n,
      block: 105n,
    });
    chain.head = 120n;
    chain.finalized = 110n;
    const dropped = await handle.state(client);
    expect(dropped).toMatchObject({
      status: "dropped-proven",
      hash: HASH,
      usedBy: OTHER,
      exit: true,
    });
    await expect(
      handle.exit(dropped, { checkedWallet: true }, client),
    ).resolves.toMatchObject({ released: true });
  });

  it("lets a canonical cancellation win over an effect read that looks done", async () => {
    const { hold } = setup();
    const { chain, client } = fakeChain();
    const handle = hold.open(ordinary);
    await handle.send(client, wallet(async () => HASH).send);
    chain.txs.push(sent(HASH));
    await handle.state(client);
    chain.txs.push({
      ...sent(OTHER),
      to: ACCOUNT,
      input: "0x",
      value: 0n,
      block: 105n,
    });
    chain.head = 120n;
    chain.finalized = 110n;
    await expect(
      handle.state(client, { effect: async () => true }),
    ).resolves.toMatchObject({
      status: "dropped-proven",
      usedBy: OTHER,
      exit: true,
    });
  });

  it("calls a hash dropped only once a finalized block shows another transaction used its nonce", async () => {
    const { hold } = setup();
    const { chain, client } = fakeChain();
    const handle = hold.open(ordinary);
    await handle.send(client, wallet(async () => HASH).send);
    chain.txs.push(sent(HASH));
    await handle.state(client);
    // The wallet cancelled it: another transaction took nonce 7.
    chain.txs.splice(0, 1, {
      ...sent(OTHER),
      to: ACCOUNT,
      input: "0x",
      value: 0n,
      block: 105n,
    });
    chain.head = 120n;
    await expect(handle.state(client)).resolves.toMatchObject({
      status: "pending-known-hash",
    });
    chain.finalized = 110n;
    const dropped = await handle.state(client);
    expect(dropped).toMatchObject({
      status: "dropped-proven",
      hash: HASH,
      usedBy: OTHER,
      exit: true,
      warning: WRITE_HOLD_HASHED_EXIT_LINE,
    });
    await expect(
      handle.exit(dropped, { checkedWallet: true }, client),
    ).resolves.toMatchObject({ released: true });
  });

  it("offers the exit for a hash the network still hasn't seen 30 minutes after the wallet returned it", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(1_000_000);
    const { hold } = setup();
    const { chain, client } = fakeChain();
    const handle = hold.open(ordinary);
    await handle.send(client, wallet(async () => HASH).send);
    expect(handle.peek()).toMatchObject({
      record: { submittedAt: "1000000" },
    });
    vi.setSystemTime(1_000_000 + 29 * 60_000);
    await expect(handle.state(client)).resolves.toMatchObject({
      status: "pending-known-hash",
      exit: false,
    });
    // Unknown or not found is not pending: 30 minutes on, the warned exit.
    vi.setSystemTime(1_000_000 + 31 * 60_000);
    client.getTransaction.mockRejectedValueOnce(new Error("timeout"));
    client.getTransaction.mockRejectedValueOnce(new Error("timeout"));
    const unchecked = await handle.state(client);
    expect(unchecked).toMatchObject({
      status: "held-unchecked",
      hash: HASH,
      exit: true,
      line: WRITE_HOLD_UNCHECKED_LINE,
      warning: WRITE_HOLD_HASHED_EXIT_LINE,
    });
    // It shows up later: it is followed as usual, and the old exit is refused.
    chain.txs.push(sent(HASH));
    await expect(handle.state(client)).resolves.toMatchObject({
      status: "pending-known-hash",
      record: { sentNonce: "7" },
    });
    await expect(
      handle.exit(unchecked, { checkedWallet: true }, client),
    ).resolves.toMatchObject({ released: false });
    // A record saved before the clock existed starts it the first time it is read.
    const { storage, locks, browser } = setup();
    const legacy = createBrowserWriteRecovery(ordinary, { storage, locks });
    await legacy.withLock(async () => {
      const reserved = legacy.reserve(undefined, {
        nonce: 7,
        blockNumber: 100n,
      });
      const [key] = browser.values.keys();
      browser.values.set(key, JSON.stringify({ ...reserved, hash: OTHER }));
    });
    const firstRead = Date.now();
    await expect(
      createWriteHold({ storage, locks })
        .open(ordinary)
        .state(fakeChain().client),
    ).resolves.toMatchObject({
      status: "pending-known-hash",
      hash: OTHER,
      record: { firstSeenAt: String(firstRead) },
    });
    // A reload keeps that first sighting; a later read never moves it.
    vi.setSystemTime(firstRead + 29 * 60_000);
    const reloaded = createWriteHold({
      storage: createHeldWriteStorage({
        durable: () => browser.storage,
        memory: new Map(),
      }),
      locks,
    }).open(ordinary);
    await expect(reloaded.state(fakeChain().client)).resolves.toMatchObject({
      status: "pending-known-hash",
      record: { firstSeenAt: String(firstRead) },
    });
    vi.setSystemTime(firstRead + 31 * 60_000);
    const legacyUnchecked = await reloaded.state(fakeChain().client);
    expect(legacyUnchecked).toMatchObject({
      status: "held-unchecked",
      hash: OTHER,
      line: WRITE_HOLD_UNCHECKED_LINE,
    });
    await expect(
      reloaded.exit(
        legacyUnchecked,
        { checkedWallet: true },
        fakeChain().client,
      ),
    ).resolves.toMatchObject({ released: true });
    // Never broadcast: the exit releases it.
    const second = setup();
    const lost = second.hold.open(ordinary);
    await lost.send(fakeChain().client, wallet(async () => OTHER).send);
    vi.setSystemTime(Date.now() + 31 * 60_000);
    const never = await lost.state(fakeChain().client);
    expect(never).toMatchObject({ status: "held-unchecked", hash: OTHER });
    await expect(
      lost.exit(never, { checkedWallet: true }, fakeChain().client),
    ).resolves.toMatchObject({ released: true });
  });

  it("proves a drop only from the nonce the hash was sent at, never the pre-wallet hint", async () => {
    const { hold } = setup();
    const { chain, client } = fakeChain();
    const handle = hold.open(ordinary);
    // The node never knew the hash, so no sent nonce was bound.
    await handle.send(client, wallet(async () => HASH).send);
    chain.txs.push({
      ...sent(OTHER),
      to: ACCOUNT,
      input: "0x",
      value: 0n,
      block: 105n,
    });
    chain.head = 120n;
    chain.finalized = 110n;
    const state = await handle.state(client);
    expect(state).toMatchObject({ status: "pending-known-hash", exit: false });
    expect(state.status !== "clear" && state.record.sentNonce).toBeUndefined();
  });

  it("stays pending with no exit when the history behind a drop can't be read", async () => {
    const { hold } = setup();
    const { chain, client } = fakeChain();
    const handle = hold.open(ordinary);
    await handle.send(client, wallet(async () => HASH).send);
    chain.txs.push(sent(HASH));
    await handle.state(client);
    // A speed-up of the same call may have run at that nonce.
    chain.txs.splice(0, 1, { ...sent(OTHER), block: 105n });
    chain.head = 120n;
    chain.finalized = 110n;
    const history = client.getBlock.getMockImplementation()!;
    client.getBlock.mockImplementation(async (args = {}) => {
      if (args.includeTransactions) throw new Error("history unavailable");
      return history(args);
    });
    await expect(handle.state(client)).resolves.toMatchObject({
      status: "pending-known-hash",
      exit: false,
    });
    // With the history, the exact call there is the write: it is tracked.
    client.getBlock.mockImplementation(history);
    client.getTransactionReceipt.mockRejectedValueOnce(new Error("busy"));
    await expect(handle.state(client)).resolves.toMatchObject({
      status: "pending-known-hash",
      hash: OTHER,
    });
  });

  it("adopts a mined speed-up of the same call, and drops only for a different call", async () => {
    for (const [replacement, status] of [
      [{}, "pending-known-hash"],
      [{ value: 18n }, "dropped-proven"],
      [{ input: "0xaabbccdd0002" as Hex }, "dropped-proven"],
      [{ to: ACCOUNT }, "dropped-proven"],
    ] as const) {
      const { hold } = setup();
      const { chain, client } = fakeChain();
      const handle = hold.open(ordinary);
      await handle.send(client, wallet(async () => HASH).send);
      chain.txs.push(sent(HASH));
      await handle.state(client);
      chain.txs.splice(0, 1, { ...sent(OTHER), ...replacement, block: 105n });
      chain.head = 120n;
      chain.finalized = 110n;
      // The speed-up's receipt isn't readable yet: it is tracked by its hash.
      client.getTransactionReceipt.mockRejectedValueOnce(new Error("busy"));
      await expect(handle.state(client)).resolves.toMatchObject(
        status === "pending-known-hash"
          ? { status, hash: OTHER, exit: false }
          : { status, hash: HASH, usedBy: OTHER, exit: true },
      );
    }
  });

  it("repairs a saved record without nonce evidence once the node knows its hash", async () => {
    const { hold, storage, locks } = setup();
    const { chain, client } = fakeChain();
    const old = createBrowserWriteRecovery(ordinary, { storage, locks });
    await old.withLock(async () => {
      // A nonce with no block to search from is no evidence either.
      old.reserve();
      old.submitted(HASH);
    });
    const handle = hold.open(ordinary);
    // Unseen, it may still be on its way: the exit waits 30 minutes.
    await expect(handle.state(client)).resolves.toMatchObject({
      status: "pending-known-hash",
      exit: false,
    });
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now + 30 * 60_000);
    await expect(handle.state(client)).resolves.toMatchObject({
      status: "held-unchecked",
      exit: true,
    });
    // The RPC recovers and knows it: the nonce it was sent at is bound.
    chain.txs.push(sent(HASH));
    await expect(handle.state(client)).resolves.toMatchObject({
      status: "pending-known-hash",
      exit: false,
      record: { sentNonce: "7" },
    });
    // Then a different transaction takes that nonce: provably dropped.
    chain.txs.splice(0, 1, {
      ...sent(OTHER),
      to: ACCOUNT,
      input: "0x",
      value: 0n,
      block: 105n,
    });
    chain.head = 120n;
    chain.finalized = 110n;
    await expect(handle.state(client)).resolves.toMatchObject({
      status: "dropped-proven",
    });
    // A hashless record with a nonce but no block gets the honest line.
    const partial = setup();
    const raw = createBrowserWriteRecovery(ordinary, {
      storage: partial.storage,
      locks: partial.locks,
    });
    await raw.withLock(async () => {
      const reserved = raw.reserve(undefined, { nonce: 7, blockNumber: 100n });
      const [key] = partial.browser.values.keys();
      const { fromBlock: _, ...noBlock } = reserved;
      partial.browser.values.set(key, JSON.stringify(noBlock));
    });
    await expect(
      partial.hold.open(ordinary).state(fakeChain().client),
    ).resolves.toMatchObject({
      status: "held-no-hash",
      exit: true,
      line: WRITE_HOLD_UNCHECKED_LINE,
    });
  });

  it("needs the account's nonce before the wallet opens, with one retry", async () => {
    const { hold } = setup();
    const { client } = fakeChain();
    const handle = hold.open(ordinary);
    client.getBlockNumber
      .mockRejectedValueOnce(new Error("rate limited"))
      .mockRejectedValueOnce(new Error("rate limited"));
    const refused = wallet(async () => HASH);
    const error = await handle.send(client, refused.send).catch((e) => e);
    expect(error).toBeInstanceOf(WriteHoldNonceError);
    expect(error.message).toBe(WRITE_HOLD_NONCE_LINE);
    expect(refused.write).not.toHaveBeenCalled();
    expect(handle.peek()).toEqual({ status: "clear" });
    client.getBlockNumber.mockRejectedValueOnce(new Error("rate limited"));
    const retried = wallet(async () => HASH);
    await handle.send(client, retried.send);
    expect(retried.write).toHaveBeenCalledOnce();
    expect(handle.peek()).toMatchObject({ record: { nonce: "7" } });
  });

  it("gives records saved without a nonce the exit, with a line that says why", async () => {
    const { hold, storage, locks } = setup();
    const { client } = fakeChain();
    const old = createBrowserWriteRecovery(ordinary, { storage, locks });
    await old.withLock(async () => old.reserve());
    const handle = hold.open(ordinary);
    const hashless = await handle.state(client);
    expect(hashless).toMatchObject({
      status: "held-no-hash",
      exit: true,
      line: WRITE_HOLD_UNCHECKED_LINE,
    });
    await old.withLock(async () => old.submitted(HASH));
    // A node that can't answer proves nothing.
    client.getTransaction.mockRejectedValueOnce(new Error("timeout"));
    client.getTransaction.mockRejectedValueOnce(new Error("timeout"));
    await expect(handle.state(client)).resolves.toMatchObject({
      status: "pending-known-hash",
    });
    // Nor does a node that learns of it only after the check.
    client.getTransaction.mockRejectedValueOnce(new Error("timeout"));
    client.getTransaction.mockResolvedValueOnce({
      ...sent(HASH),
      blockNumber: null,
    } as never);
    await expect(handle.state(client)).resolves.toMatchObject({
      status: "pending-known-hash",
    });
    // Still unseen 30 minutes after it was sent.
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now + 30 * 60_000);
    const unchecked = await handle.state(client);
    expect(unchecked).toMatchObject({
      status: "held-unchecked",
      hash: HASH,
      exit: true,
      line: WRITE_HOLD_UNCHECKED_LINE,
    });
    // The stale hashless snapshot no longer releases it; the current one does.
    await expect(
      handle.exit(hashless, { checkedWallet: true }, client),
    ).resolves.toMatchObject({ released: false });
    await expect(
      handle.exit(unchecked, { checkedWallet: true }, client),
    ).resolves.toMatchObject({ released: true });
  });

  it("lets a confirmation that lands during the exit win", async () => {
    const { hold } = setup();
    const { chain, client, receiptOf } = fakeChain();
    const handle = hold.open(ordinary);
    await handle.send(client, wallet(async () => HASH).send);
    chain.txs.push(sent(HASH));
    chain.hidden.add(HASH);
    // The app's effect read says it looks done: the exit, at once.
    const shown = await handle.state(client, { effect: async () => true });
    expect(shown).toMatchObject({ status: "looks-done", exit: true });
    // It confirms as the user takes the exit.
    chain.hidden.clear();
    chain.txs[0].block = 105n;
    chain.head = 120n;
    chain.finalized = 110n;
    const [exit, receipt] = await Promise.all([
      handle.exit(shown, { checkedWallet: true }, client),
      handle.onReceipt(receiptOf(chain.txs[0]), client),
    ]);
    expect(exit).toEqual({
      released: false,
      state: {
        checked: true,
        status: "clear",
        reservation: expect.any(String),
        settled: { result: "success", hash: HASH },
      },
    });
    expect(receipt).toEqual({
      status: "clear",
      reservation: expect.any(String),
    });
  });

  it("strands no confirmation behind a pending resolve", async () => {
    const { hold } = setup();
    const { chain, client, receiptOf } = fakeChain();
    const handle = hold.open(ordinary);
    await handle.send(client, wallet(async () => HASH).send);
    chain.txs.push(sent(HASH));
    // A slow node: the pending answer arrives after the receipt lands.
    let answer!: () => void;
    client.getTransaction.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          answer = () =>
            resolve({
              ...sent(HASH),
              blockNumber: null,
              blockHash: null,
            } as never);
        }),
    );
    const looking = handle.state(client);
    await vi.waitFor(() => expect(answer).toBeTypeOf("function"));
    chain.txs[0].block = 101n;
    const landed = handle.onReceipt(receiptOf(chain.txs[0]), client);
    answer();
    await expect(looking).resolves.toMatchObject({
      status: "pending-known-hash",
    });
    await expect(landed).resolves.toEqual({
      status: "clear",
      reservation: expect.any(String),
      settled: { result: "success", hash: HASH },
    });
    await expect(handle.state(client)).resolves.toEqual({
      checked: true,
      status: "clear",
      reservation: expect.any(String),
      settled: { result: "success", hash: HASH },
    });
  });

  it("holds a revert until it is final, through a reorg, and never offers a resend", async () => {
    vi.useFakeTimers();
    const { hold } = setup();
    const { chain, client, receiptOf } = fakeChain();
    const handle = hold.open(ordinary);
    const seen: WriteHoldState[] = [];
    handle.subscribe((state) => seen.push(state));
    await handle.send(client, wallet(async () => HASH).send);
    chain.txs.push(sent(HASH, { block: 95n, status: "reverted" }));
    const reverted = await handle.onReceipt(receiptOf(chain.txs[0]), client);
    expect(reverted).toMatchObject({
      status: "ran-executed",
      executionHash: HASH,
      result: "failed",
      exit: false,
      line: WRITE_HOLD_REVERTED_LINE,
    });
    await expect(
      handle.send(client, wallet(async () => OTHER).send),
    ).rejects.toBeInstanceOf(WriteHeldError);
    // A reorg drops that block; the same transaction lands again, successfully.
    chain.reorged.set(95n, OTHER);
    chain.txs[0] = sent(HASH, { block: 97n });
    await vi.advanceTimersByTimeAsync(1_000);
    expect(seen[seen.length - 1]).toEqual({
      status: "clear",
      reservation: expect.any(String),
      settled: { result: "success", hash: HASH },
    });
    // Only one send ever went out.
    expect(handle.peek().status).toBe("clear");
  });

  it("releases a revert once a finalized block includes it", async () => {
    vi.useFakeTimers();
    const { hold } = setup();
    const { chain, client, receiptOf } = fakeChain();
    const handle = hold.open(ordinary);
    await handle.send(client, wallet(async () => HASH).send);
    chain.txs.push(sent(HASH, { block: 95n, status: "reverted" }));
    await handle.onReceipt(receiptOf(chain.txs[0]), client);
    // A reload looks again and still holds it.
    await expect(handle.state(client)).resolves.toMatchObject({
      status: "ran-executed",
    });
    chain.head = 120n;
    chain.finalized = 96n;
    await vi.advanceTimersByTimeAsync(1_000);
    const failed = {
      status: "clear",
      reservation: expect.any(String),
      settled: { result: "failed", hash: HASH },
    };
    expect(handle.peek()).toEqual(failed);
    await expect(handle.state(client)).resolves.toEqual({
      ...failed,
      checked: true,
    });
  });

  it("stops looking after its attempts, and a later state() looks again", async () => {
    vi.useFakeTimers();
    const { hold } = setup();
    const { chain, client, receiptOf } = fakeChain();
    const handle = hold.open(ordinary);
    await handle.send(client, wallet(async () => HASH).send);
    chain.txs.push(sent(HASH, { block: 95n, status: "reverted" }));
    await handle.onReceipt(receiptOf(chain.txs[0]), client);
    const reads = () => client.getTransactionReceipt.mock.calls.length;
    const before = reads();
    await vi.advanceTimersByTimeAsync(10_000);
    const looked = reads();
    expect(looked).toBeGreaterThan(before);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(reads()).toBe(looked);
    await expect(handle.state(client)).resolves.toMatchObject({
      status: "ran-executed",
    });
    expect(reads()).toBeGreaterThan(looked);
    hold.dispose();
  });

  it("never releases on an effect read alone: it changes the line and offers the exit", async () => {
    const { hold, storage } = setup();
    const { chain, client } = fakeChain();
    const handle = hold.open(ordinary);
    await expect(
      handle.send(
        client,
        wallet(async () => {
          throw new Error("reply lost");
        }).send,
      ),
    ).rejects.toThrow();
    chain.chainId = 1;
    await expect(
      handle.state(client, { effect: async () => true }),
    ).resolves.toMatchObject({ status: "held-no-hash" });
    chain.chainId = 10;
    // Released elsewhere while the chain is asked: nothing is held.
    const elsewhere = createBrowserWriteRecovery(ordinary, { storage });
    const shown = elsewhere.read()!;
    await expect(
      handle.state(client, {
        effect: async () => {
          elsewhere.abandon(shown, { checkedWallet: true });
          return false;
        },
      }),
    ).resolves.toEqual({
      checked: true,
      status: "clear",
      reservation: expect.any(String),
    });
    await expect(
      handle.send(
        client,
        wallet(async () => {
          throw new Error("reply lost");
        }).send,
      ),
    ).rejects.toThrow();
    const done = await handle.state(client, { effect: async () => true });
    expect(done).toMatchObject({
      status: "looks-done",
      exit: true,
      line: WRITE_HOLD_LOOKS_DONE_LINE,
    });
    expect(handle.peek().status).toBe("held-no-hash");
    // Codex: the original still pending in the mempool, with its hash. A
    // known pending hash gates every exit: the effect changes nothing.
    const second = setup();
    const pendingHold = second.hold.open(ordinary);
    await pendingHold.send(client, wallet(async () => HASH).send);
    chain.txs.push(sent(HASH));
    await expect(
      pendingHold.state(client, { effect: async () => true }),
    ).resolves.toMatchObject({ status: "pending-known-hash", exit: false });
    // The node lost it: the effect offers the exit, with the warning.
    chain.hidden.add(HASH);
    const looks = await pendingHold.state(client, { effect: async () => true });
    expect(looks).toMatchObject({
      status: "looks-done",
      hash: HASH,
      exit: true,
      warning: WRITE_HOLD_HASHED_EXIT_LINE,
    });
    expect(pendingHold.peek().status).toBe("pending-known-hash");
    // The exit is the user's, and it releases.
    await expect(
      handle.exit(done, { checkedWallet: true }, client),
    ).resolves.toMatchObject({ released: true });
  });

  it("never adopts a hash found at the pre-wallet nonce for a lost reply", async () => {
    const { hold } = setup();
    const { chain, client } = fakeChain();
    const handle = hold.open(ordinary);
    await expect(
      handle.send(
        client,
        wallet(async () => {
          throw new Error("reply lost");
        }).send,
      ),
    ).rejects.toThrow();
    // Codex: the exact call there, under a hash the wallet never returned.
    chain.txs.push(sent(HASH, { block: 105n }));
    chain.head = 120n;
    chain.finalized = 110n;
    const shown = await handle.state(client);
    expect(shown).toMatchObject({ status: "held-no-hash", exit: true });
    expect((shown as { record: { hash?: Hex } }).record.hash).toBeUndefined();
  });

  it("ignores another transaction's receipt, and receipts with nothing held", async () => {
    const { hold } = setup();
    const { chain, client, receiptOf } = fakeChain();
    const handle = hold.open(ordinary);
    chain.txs.push(sent(OTHER, { block: 95n }));
    await expect(
      handle.onReceipt(receiptOf(chain.txs[0]), client),
    ).resolves.toEqual({ status: "clear" });
    await handle.send(client, wallet(async () => HASH).send);
    await expect(
      handle.onReceipt(receiptOf(chain.txs[0]), client),
    ).resolves.toMatchObject({ status: "pending-known-hash" });
    await expect(handle.onExecuted(client, EXECUTION)).resolves.toMatchObject({
      status: "pending-known-hash",
    });
  });

  it("follows other tabs' changes while subscribed", async () => {
    const listeners: ((event: { key: string | null }) => void)[] = [];
    vi.stubGlobal("addEventListener", (_: string, listener: never) =>
      listeners.push(listener),
    );
    const removed = vi.fn();
    vi.stubGlobal("removeEventListener", removed);
    const browser = origin();
    const { hold } = setup({ browser });
    const other = setup({ browser });
    const { client } = fakeChain();
    const seen: string[] = [];
    const stop = hold
      .open(ordinary)
      .subscribe((state) => seen.push(state.status));
    const second = hold.open(ordinary).subscribe(() => {});
    expect(listeners).toHaveLength(1);
    await other.hold.open(ordinary).send(client, wallet(async () => HASH).send);
    listeners[0]({ key: "unrelated" });
    expect(seen).toEqual([]);
    listeners[0]({ key: null });
    listeners[0]({ key: "nana-sdk:reviewed-write:v2:x" });
    expect(seen).toEqual(["pending-known-hash", "pending-known-hash"]);
    // An unreadable record shows at its next state().
    browser.values.set([...browser.values.keys()][0], "{");
    listeners[0]({ key: null });
    expect(seen).toHaveLength(2);
    stop();
    second();
    hold.dispose();
    expect(removed).toHaveBeenCalledOnce();
    hold.dispose();
    // Keyed by namespace when there is one, and a call without value is 0.
    hold.open({ ...ordinary, namespace: "defifa:pay:27" }).subscribe(() => {});
    hold
      .open({ ...ordinary, call: { to: TARGET, data: DATA } })
      .subscribe(() => {});
  });

  it("uses the browser's storage and Web Locks by default", async () => {
    const browser = origin();
    vi.stubGlobal("localStorage", browser.storage);
    vi.stubGlobal("navigator", { locks: lockManager() });
    const { client } = fakeChain();
    const hold = createWriteHold();
    expect(hold.durable()).toBe(true);
    await hold.open(ordinary).send(client, wallet(async () => HASH).send);
    expect(
      [...browser.values.keys()].filter((k) => !k.endsWith(":latest")),
    ).toHaveLength(1);
    await expect(hold.open(ordinary).state(client)).resolves.toMatchObject({
      status: "pending-known-hash",
    });
  });

  it("keeps the hold and rethrows when the boundary is misused or storage fails", async () => {
    const { hold } = setup();
    const { client } = fakeChain();
    const handle = hold.open(ordinary);
    await expect(
      handle.send(client, async (gate) => gate.afterSubmit(HASH)),
    ).rejects.toThrow("Hold the write before the wallet opens.");
    // Reserving fails for a reason other than a hold: the error itself.
    const broken = setup({
      storage: Object.assign(
        createHeldWriteStorage({ durable: () => undefined, memory: new Map() }),
        {
          setItem: () => {
            throw new Error("full");
          },
        },
      ),
    });
    const write = vi.fn();
    await expect(
      broken.hold.open(ordinary).send(client, async (gate) => {
        await gate.beforeSend();
        write();
      }),
    ).rejects.toThrow("full");
    expect(write).not.toHaveBeenCalled();
    // A hold that appears between the check and the reservation refuses it.
    const raced = setup();
    await expect(
      raced.hold.open(ordinary).send(client, async (gate) => {
        // A writer that skipped the shared lock reserves first.
        const other = createBrowserWriteRecovery(ordinary, {
          storage: raced.storage,
          locks: {
            request: (
              _n: string,
              _o: LockOptions,
              work: (lock: Lock) => unknown,
            ) => work({} as Lock),
          } as never,
        });
        await other.withLock(async () => other.reserve());
        await gate.beforeSend();
      }),
    ).rejects.toBeInstanceOf(WriteHeldError);
  });

  it("keeps a returned hash in memory when saving it fails", async () => {
    const browser = origin();
    let saves = 0;
    const storage = createHeldWriteStorage({
      durable: () => browser.storage,
      memory: new Map(),
    });
    const flaky: HeldWriteStorage = {
      ...storage,
      getItem: (key) => {
        if (saves > 0) throw new Error("gone");
        return storage.getItem(key);
      },
      setItem: (key, value) => {
        storage.setItem(key, value);
      },
    };
    const { hold } = setup({ storage: flaky });
    const { client } = fakeChain();
    const handle = hold.open(ordinary);
    await handle.send(client, async (gate) => {
      await gate.beforeSend();
      saves += 1;
      gate.afterSubmit(HASH);
    });
    saves = 0;
    // The returned hash is still what this tab holds.
    expect(handle.peek()).toMatchObject({
      status: "pending-known-hash",
      hash: HASH,
    });
    await expect(
      handle.send(client, async (gate) => {
        await gate.beforeSend();
        gate.afterSubmit("0x12" as Hex);
      }),
    ).rejects.toBeInstanceOf(WriteHeldError);
    const fresh = setup();
    await expect(
      fresh.hold.open(ordinary).send(client, async (gate) => {
        await gate.beforeSend();
        gate.afterSubmit("0x12" as Hex);
      }),
    ).rejects.toThrow("invalid transaction identity");
  });

  it("falls back to the saved record when the lock can't be taken", async () => {
    const failing = {
      request: async () => {
        throw new Error("locks unavailable");
      },
    } as unknown as Pick<LockManager, "request">;
    const { hold } = setup({ locks: failing });
    const { client, receiptOf, chain } = fakeChain();
    const handle = hold.open(ordinary);
    // Contended: the saved record, not a chain answer.
    await expect(handle.state(client)).resolves.toEqual({
      checked: false,
      status: "clear",
    });
    await expect(
      handle.send(client, wallet(async () => HASH).send),
    ).rejects.toBeInstanceOf(WriteHoldBusyError);
    chain.txs.push(sent(HASH, { block: 95n }));
    await expect(
      handle.onReceipt(receiptOf(chain.txs[0]), client),
    ).resolves.toEqual({ status: "clear" });
    await expect(handle.onExecuted(client)).resolves.toEqual({
      status: "clear",
    });
    await expect(handle.attachHash(client, HASH)).resolves.toEqual({
      status: "clear",
    });
    await expect(
      handle.attachSafeNonce(client, { safeTxHash: HASH, nonce: 5 }),
    ).resolves.toEqual({ status: "clear" });
    await expect(
      handle.exit(
        { status: "held-no-hash" } as WriteHoldState,
        { checkedWallet: true },
        client,
      ),
    ).resolves.toEqual({
      released: false,
      state: { status: "clear", checked: false },
    });
  });

  it("keeps the hold when releasing it fails", async () => {
    const browser = origin();
    const { hold } = setup({ browser });
    const { chain, client, receiptOf } = fakeChain();
    const handle = hold.open(ordinary);
    await handle.send(client, wallet(async () => HASH).send);
    chain.txs.push(sent(HASH, { block: 95n }));
    browser.state.write = false;
    browser.state.read = false;
    await expect(
      handle.onReceipt(receiptOf(chain.txs[0]), client),
    ).resolves.toMatchObject({ status: "pending-known-hash" });
  });

  it("refuses an exit whose release fails or whose record changed in between", async () => {
    const { hold, browser } = setup();
    const { client } = fakeChain();
    const handle = hold.open(ordinary);
    await expect(
      handle.send(
        client,
        wallet(async () => {
          throw new Error("reply lost");
        }).send,
      ),
    ).rejects.toThrow();
    const shown = await handle.state(client);
    // A release marker that can't be saved anywhere leaves it held.
    const base = createHeldWriteStorage({
      durable: () => browser.storage,
      memory: new Map(),
    });
    const refusing = setup({
      storage: {
        ...base,
        setItem: (key, value) => {
          if (key.includes(":released:")) throw new Error("full");
          base.setItem(key, value);
        },
      },
    });
    await expect(
      refusing.hold.open(ordinary).exit(shown, { checkedWallet: true }, client),
    ).resolves.toMatchObject({
      released: false,
      state: { status: "held-no-hash" },
    });
    // A snapshot from another attempt is refused.
    await expect(
      handle.exit(
        {
          ...shown,
          record: { ...(shown as { record: object }).record, id: "other" },
        } as WriteHoldState,
        { checkedWallet: true },
        client,
      ),
    ).resolves.toMatchObject({ released: false });
    expect(handle.peek().status).toBe("held-no-hash");
  });
});

describe("a write held under an intent", () => {
  const regenerated = { ...ordinary.call, data: "0xaabbccdd0002" as Hex };
  const key = writeIntentKey("pay", {
    projectId: 4n,
    memo: "ABC",
    token: intent.address(TARGET),
  });
  const intentCall = { ...ordinary, call: regenerated, namespace: key };

  /** An earlier version's exact-call hold, then this version's intent handle. */
  async function delegated() {
    const browser = origin();
    const old = setup({ browser });
    const { chain, client, receiptOf } = fakeChain();
    await expect(
      old.hold.open(ordinary).send(client, lostReply().send),
    ).rejects.toThrow();
    const legacy = old.hold.open(ordinary).peek() as WriteHeldState;
    const next = setup({ browser, locks: old.locks });
    const handle = next.hold.open(intentCall, {
      legacy: [{ call: ordinary.call }],
    });
    return { browser, old, next, chain, client, receiptOf, legacy, handle };
  }

  it("is the legacy hold while it is unresolved: state() shows it and send() refuses with it", async () => {
    const { handle, client, legacy, old } = await delegated();
    await expect(
      handle.attachSafeNonce(client, { safeTxHash: HASH, nonce: 5 }),
    ).resolves.toMatchObject({ reservation: legacy.record.id });
    const shown = await handle.state(client);
    expect(shown).toMatchObject({
      status: "held-no-hash",
      exit: true,
      reservation: legacy.record.id,
      record: { id: legacy.record.id },
    });
    expect(handle.peek()).toMatchObject({
      status: "held-no-hash",
      exit: false,
      reservation: legacy.record.id,
    });
    const retry = wallet(async () => HASH);
    const refused = await handle.send(client, retry.send).catch((e) => e);
    expect(refused).toBeInstanceOf(WriteHeldError);
    expect(refused.state).toMatchObject({ reservation: legacy.record.id });
    expect(retry.write).not.toHaveBeenCalled();
    // Nothing moved: the original exact-call handle still holds it (Codex 4).
    const again = wallet(async () => HASH);
    await expect(
      old.hold.open(ordinary).send(client, again.send),
    ).rejects.toBeInstanceOf(WriteHeldError);
    expect(again.write).not.toHaveBeenCalled();
  });

  it("exits through the legacy hold's own exit, in place (Codex 6)", async () => {
    const { handle, client, old } = await delegated();
    const shown = await handle.state(client);
    await expect(
      handle.exit(shown, { checkedWallet: true }, client),
    ).resolves.toMatchObject({ released: true });
    expect(old.hold.open(ordinary).peek().status).toBe("clear");
    const retry = wallet(async () => HASH);
    await handle.send(client, retry.send);
    expect(retry.write).toHaveBeenCalledOnce();
    expect(handle.peek()).toMatchObject({
      status: "pending-known-hash",
      record: { namespace: key },
    });
  });

  it("never lets the intent's own settlement skip a legacy hold (Codex 5)", async () => {
    const browser = origin();
    const old = setup({ browser });
    const next = setup({ browser, locks: old.locks });
    const { chain, client, receiptOf } = fakeChain();
    const handle = next.hold.open(intentCall, {
      legacy: [{ call: ordinary.call }],
    });
    // The intent sends first. A new exact-call handle sees the mirror and refuses.
    await handle.send(client, wallet(async () => HASH).send);
    await expect(
      old.hold.open(ordinary).send(client, lostReply().send),
    ).rejects.toBeInstanceOf(WriteHeldError);
    // An older version exits the mirror, its explicit choice, and holds its own.
    const older = createBrowserWriteRecovery(ordinary, {
      storage: old.storage,
    });
    older.abandon(older.read()!, { checkedWallet: true });
    await older.withLock(async () => older.reserve());
    // The intent's own write settles.
    chain.txs.push({ ...sent(HASH), input: regenerated.data, block: 95n });
    await handle.onReceipt(receiptOf(chain.txs[0]), client);
    const retry = wallet(async () => OTHER);
    await expect(handle.send(client, retry.send)).rejects.toBeInstanceOf(
      WriteHeldError,
    );
    expect(retry.write).not.toHaveBeenCalled();
  });

  it("checks a legacy namespace too, deduplicated and never its own", async () => {
    const browser = origin();
    const old = setup({ browser });
    const { chain, client } = fakeChain();
    await old.hold
      .open({ ...ordinary, namespace: "jbm:pay:4" })
      .send(client, wallet(async () => HASH).send);
    chain.txs.push(sent(HASH));
    const next = setup({ browser, locks: old.locks });
    const handle = next.hold.open(intentCall, {
      legacy: ["jbm:pay:4", "jbm:pay:4", key, { call: regenerated }],
    });
    await expect(handle.state(client)).resolves.toMatchObject({
      status: "pending-known-hash",
      hash: HASH,
      exit: false,
      record: { namespace: "jbm:pay:4" },
    });
    // An exact-call hold takes no legacy keys.
    expect(
      next.hold
        .open({ ...ordinary, call: regenerated }, { legacy: ["jbm:pay:4"] })
        .peek(),
    ).toEqual({ status: "clear" });
  });

  it("follows the legacy hold's evidence through the intent handle", async () => {
    const { handle, client, chain, receiptOf, legacy } = await delegated();
    // The legacy write's hash turns up: attach it, and its receipt settles it.
    chain.txs.push(sent(HASH));
    await expect(handle.attachHash(client, HASH)).resolves.toMatchObject({
      status: "pending-known-hash",
      reservation: legacy.record.id,
    });
    chain.txs[0].block = 101n;
    await expect(
      handle.onReceipt(receiptOf(chain.txs[0]), client),
    ).resolves.toMatchObject({
      status: "clear",
      settled: { result: "success", hash: HASH },
      reservation: legacy.record.id,
    });
    await expect(handle.onUnproven(client)).resolves.toMatchObject({
      status: "clear",
    });
    await expect(handle.onExecuted(client)).resolves.toMatchObject({
      status: "clear",
    });
  });

  it("rechecks the legacy keys right before reserving, and routes every method to the hold in charge", async () => {
    const browser = origin();
    const old = setup({ browser });
    const next = setup({ browser, locks: old.locks });
    const { chain, client, receiptOf } = fakeChain();
    const handle = next.hold.open(intentCall, {
      legacy: [{ call: ordinary.call }],
    });
    // A legacy hold appears while the review is open: the reserve refuses.
    const write = vi.fn();
    const refused = await handle
      .send(client, async (gate) => {
        await expect(
          old.hold.open(ordinary).send(client, lostReply().send),
        ).rejects.toThrow();
        await gate.beforeSend();
        write();
      })
      .catch((e) => e);
    expect(refused).toBeInstanceOf(WriteHeldError);
    expect(write).not.toHaveBeenCalled();
    // While delegated, an exit of another snapshot or a clear one releases nothing.
    const legacy = await handle.state(client);
    for (const snapshot of [
      { status: "clear" } as WriteHoldState,
      {
        ...legacy,
        record: { ...(legacy as WriteHeldState).record, id: "x" },
      } as WriteHoldState,
    ])
      await expect(
        handle.exit(snapshot, { checkedWallet: true }, client),
      ).resolves.toMatchObject({
        released: false,
        state: { reservation: legacy.reservation },
      });
    await expect(handle.onUnproven(client)).resolves.toMatchObject({
      reservation: legacy.reservation,
    });
    await expect(handle.onExecuted(client)).resolves.toMatchObject({
      reservation: legacy.reservation,
    });
    await handle.exit(legacy, { checkedWallet: true }, client);
    // With the legacy keys clear, the intent's own record answers.
    await handle.send(client, wallet(async () => HASH).send);
    chain.txs.push({ ...sent(HASH), input: regenerated.data });
    await expect(handle.attachHash(client, HASH)).resolves.toMatchObject({
      status: "pending-known-hash",
      record: { namespace: key },
    });
    chain.txs[0].block = 95n;
    await expect(
      handle.onReceipt(receiptOf(chain.txs[0]), client),
    ).resolves.toMatchObject({
      status: "clear",
      settled: { result: "success" },
    });
    await expect(handle.state(client)).resolves.toMatchObject({
      status: "clear",
      settled: { result: "success", hash: HASH },
    });
    await expect(
      handle.exit({ status: "clear" }, { checkedWallet: true }, client),
    ).resolves.toMatchObject({ released: false });
  });

  describe("excludes the exact-call writer", () => {
    function pair() {
      const browser = origin();
      const locks = lockManager();
      const intentTab = setup({ browser, locks });
      const exactTab = setup({ browser, locks });
      const handle = intentTab.hold.open(intentCall, {
        legacy: [{ call: ordinary.call }],
      });
      const exact = exactTab.hold.open(ordinary);
      return { browser, locks, intentTab, exactTab, handle, exact };
    }

    it("Codex (a): never reserves after the exact call reserved during its nonce read", async () => {
      const { handle, exact } = pair();
      const { client } = fakeChain();
      let resume!: () => void;
      const gate = new Promise<void>((resolve) => (resume = resolve));
      const block = client.getBlockNumber.getMockImplementation()!;
      client.getBlockNumber.mockImplementationOnce(async () => {
        await gate;
        return block();
      });
      const intentWrite = wallet(async () => HASH);
      const sending = handle.send(client, intentWrite.send).catch((e) => e);
      await vi.waitFor(() => expect(client.getBlockNumber).toHaveBeenCalled());
      const exactWrite = wallet(async () => OTHER);
      const exactSent = exact.send(client, exactWrite.send).catch((e) => e);
      resume();
      const [one, two] = await Promise.all([sending, exactSent]);
      // Exactly one of them reached the wallet.
      expect(
        intentWrite.write.mock.calls.length +
          exactWrite.write.mock.calls.length,
      ).toBe(1);
      expect([one, two].some((r) => r instanceof Error)).toBe(true);
    });

    it("Codex (b): the exact-call handle can't send once the intent sent", async () => {
      const { handle, exact } = pair();
      const { client } = fakeChain();
      await handle.send(client, wallet(async () => HASH).send);
      const again = wallet(async () => OTHER);
      const refused = await exact.send(client, again.send).catch((e) => e);
      expect(refused).toBeInstanceOf(WriteHeldError);
      expect(refused.state).toMatchObject({
        status: "pending-known-hash",
        record: { namespace: key },
      });
      expect(again.write).not.toHaveBeenCalled();
    });

    it("leaves a held mirror for an old exact-call reader while the intent holds", async () => {
      const { handle, intentTab } = pair();
      const { client } = fakeChain();
      await handle.send(client, wallet(async () => HASH).send);
      // The previous SDK reads only its exact-call key.
      const old = createBrowserWriteRecovery(ordinary, {
        storage: intentTab.storage,
        locks: intentTab.locks,
      });
      const mirror = old.read();
      expect(mirror).toMatchObject({
        id: (handle.peek() as WriteHeldState).record.id,
        mirrorOf: key,
      });
      await expect(old.withLock(async () => old.reserve())).rejects.toThrow(
        "still unresolved",
      );
    });

    it("delegates an exact-call exit on a mirror to the intent, and clears the mirror", async () => {
      const { handle, exact, intentTab } = pair();
      const { client } = fakeChain();
      await expect(handle.send(client, lostReply().send)).rejects.toThrow();
      const shown = await exact.state(client);
      expect(shown).toMatchObject({
        status: "held-no-hash",
        exit: true,
        record: { namespace: key },
      });
      await expect(
        exact.exit(shown, { checkedWallet: true }, client),
      ).resolves.toMatchObject({ released: true });
      expect(handle.peek().status).toBe("clear");
      expect(
        createBrowserWriteRecovery(ordinary, {
          storage: intentTab.storage,
        }).read(),
      ).toBeNull();
      await exact.send(client, wallet(async () => OTHER).send);
    });

    it("clears the mirror when the intent settles, and when it exits", async () => {
      const { handle, intentTab } = pair();
      const { chain, client, receiptOf } = fakeChain();
      const mirrorAt = () =>
        createBrowserWriteRecovery(ordinary, {
          storage: intentTab.storage,
        }).read();
      await handle.send(client, wallet(async () => HASH).send);
      expect(mirrorAt()).toMatchObject({ mirrorOf: key });
      chain.txs.push({ ...sent(HASH), input: regenerated.data, block: 95n });
      await expect(
        handle.onReceipt(receiptOf(chain.txs[0]), client),
      ).resolves.toMatchObject({ status: "clear" });
      expect(mirrorAt()).toBeNull();
      await expect(handle.send(client, lostReply().send)).rejects.toThrow();
      expect(mirrorAt()).toMatchObject({ mirrorOf: key });
      const shown = await handle.state(client);
      await handle.exit(shown, { checkedWallet: true }, client);
      expect(mirrorAt()).toBeNull();
    });

    it("shows the intent through the exact-call handle, and drops a mirror its intent left behind", async () => {
      const { handle, exact, intentTab } = pair();
      const { client } = fakeChain();
      await expect(handle.send(client, lostReply().send)).rejects.toThrow();
      expect(exact.peek()).toMatchObject({
        status: "held-no-hash",
        record: { namespace: key },
      });
      // A stale snapshot's exit releases nothing, and the mirror stays.
      const shown = await exact.state(client);
      await expect(
        exact.exit(
          {
            ...shown,
            record: { ...(shown as WriteHeldState).record, id: "x" },
          } as WriteHoldState,
          { checkedWallet: true },
          client,
        ),
      ).resolves.toMatchObject({ released: false });
      const mirrorAt = () =>
        createBrowserWriteRecovery(ordinary, {
          storage: intentTab.storage,
        }).read();
      expect(mirrorAt()).toMatchObject({ mirrorOf: key });
      // The intent ends without its handle cleaning up (another version).
      const intentJournal = createBrowserWriteRecovery(intentCall, {
        storage: intentTab.storage,
      });
      intentJournal.abandon(intentJournal.read()!, { checkedWallet: true });
      await expect(exact.state(client)).resolves.toMatchObject({
        status: "clear",
      });
      expect(mirrorAt()).toBeNull();
      // With no mirror, the exact-call handle is itself.
      await expect(
        exact.exit({ status: "clear" }, { checkedWallet: true }, client),
      ).resolves.toMatchObject({ released: false });
      await exact.send(client, wallet(async () => OTHER).send);
    });

    it("aborts the unsent reservation when a mirror can't be saved in the hold's own store", async () => {
      const browser = origin();
      const base = createHeldWriteStorage({
        durable: () => browser.storage,
        memory: new Map(),
      });
      const storage: HeldWriteStorage = {
        ...base,
        setItem: (k, v) => {
          if (k.startsWith("nana-sdk:reviewed-write:v2:"))
            throw new Error("full");
          base.setItem(k, v);
        },
      };
      const { hold } = setup({ storage, browser });
      const { client } = fakeChain();
      const handle = hold.open(intentCall, {
        legacy: [{ call: ordinary.call }],
      });
      const write = wallet(async () => HASH);
      await expect(handle.send(client, write.send)).rejects.toThrow("full");
      expect(write.write).not.toHaveBeenCalled();
      expect(handle.peek().status).toBe("clear");
    });

    it("undoes its partial mirrors when a later one can't be saved", async () => {
      for (const removal of ["works", "refused"] as const) {
        const browser = origin();
        const base = createHeldWriteStorage({
          durable: () => browser.storage,
          memory: new Map(),
        });
        const storage: HeldWriteStorage = {
          ...base,
          setItem: (k, v) => {
            if (k.startsWith("nana-sdk:reviewed-write:v2:"))
              throw new Error("full");
            base.setItem(k, v);
          },
          removeItem: (k) => {
            if (removal === "refused" && k.includes(":namespace:"))
              throw new Error("refused");
            base.removeItem(k);
          },
        };
        const { hold } = setup({ storage, browser });
        const { client } = fakeChain();
        const write = wallet(async () => HASH);
        const failed = await hold
          .open(intentCall, {
            legacy: ["jbm:pay:4", { call: ordinary.call }],
          })
          .send(client, write.send)
          .catch((e) => e);
        // Undone, the error itself; where the undo is refused too, the unsent
        // reservation stays held, with its explicit exit.
        if (removal === "works") expect(failed.message).toBe("full");
        else expect(failed).toBeInstanceOf(WriteHeldError);
        expect(write.write).not.toHaveBeenCalled();
        const namespaced = createBrowserWriteRecovery(
          { ...ordinary, namespace: "jbm:pay:4" },
          { storage },
        ).read();
        if (removal === "works") expect(namespaced).toBeNull();
        else expect(namespaced).toMatchObject({ mirrorOf: key });
      }
    });

    it("sends once and mirrors to the tab's memory while durable storage is refused", async () => {
      const browser = origin();
      browser.state.write = false;
      const memory = new Map<string, string>();
      const locks = lockManager();
      const intentTab = setup({ browser, memory, locks });
      const exactTab = setup({ browser, memory, locks });
      const { client } = fakeChain();
      const write = wallet(async () => HASH);
      await intentTab.hold
        .open(intentCall, { legacy: [{ call: ordinary.call }] })
        .send(client, write.send);
      expect(write.write).toHaveBeenCalledOnce();
      expect(browser.values.size).toBe(0);
      const again = wallet(async () => OTHER);
      await expect(
        exactTab.hold.open(ordinary).send(client, again.send),
      ).rejects.toBeInstanceOf(WriteHeldError);
      expect(again.write).not.toHaveBeenCalled();
    });

    it("never deadlocks the intent and the exact call reserving in crossed order", async () => {
      const { handle, exact } = pair();
      const { client } = fakeChain();
      const writes = [wallet(async () => HASH), wallet(async () => OTHER)];
      const results = await Promise.all([
        handle.send(client, writes[0].send).catch((e) => e),
        exact.send(client, writes[1].send).catch((e) => e),
      ]);
      expect(
        writes[0].write.mock.calls.length + writes[1].write.mock.calls.length,
      ).toBe(1);
      // Resolved within the retries: the loser is held, never busy.
      const errors = results.filter((r) => r instanceof Error);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toBeInstanceOf(WriteHeldError);
    });

    it("refuses as busy only after its retries run out", async () => {
      const { handle, exact } = pair();
      const { client } = fakeChain();
      let finish!: () => void;
      const holding = exact.send(
        client,
        () => new Promise<void>((resolve) => (finish = resolve)),
      );
      await vi.waitFor(() => expect(finish).toBeTypeOf("function"));
      const started = Date.now();
      const refused = await handle
        .send(client, wallet(async () => HASH).send)
        .catch((e) => e);
      expect(refused).toBeInstanceOf(WriteHoldBusyError);
      expect(Date.now() - started).toBeGreaterThanOrEqual(1_500);
      finish();
      await holding;
    });

    it("reports an adoption it couldn't make while another writer held a lock as unread", async () => {
      const { handle, exact } = pair();
      const { client } = fakeChain();
      let finish!: () => void;
      const holding = exact.send(
        client,
        () => new Promise<void>((resolve) => (finish = resolve)),
      );
      await vi.waitFor(() => expect(finish).toBeTypeOf("function"));
      await expect(
        handle.adopt({ status: "clear" }, { nonce: 7, fromBlock: 90n }),
      ).resolves.toMatchObject({ status: "clear", declined: "unreadable" });
      finish();
      await holding;
    });
  });

  it("refuses a second send of the intent: held once reserved, busy while the first holds its locks", async () => {
    const { hold } = setup();
    const { client } = fakeChain();
    const handle = hold.open(intentCall, { legacy: [{ call: ordinary.call }] });
    let finish!: () => void;
    const first = handle.send(client, async (gate) => {
      await gate.beforeSend();
      await new Promise<void>((resolve) => (finish = resolve));
    });
    await vi.waitFor(() => expect(finish).toBeTypeOf("function"));
    await expect(
      handle.send(client, wallet(async () => HASH).send),
    ).rejects.toBeInstanceOf(WriteHoldBusyError);
    finish();
    await first;
    await expect(
      handle.send(client, wallet(async () => HASH).send),
    ).rejects.toBeInstanceOf(WriteHeldError);
  });

  it("never settles a stale mirror it can't remove, read through the exact-call key", async () => {
    const browser = origin();
    const base = createHeldWriteStorage({
      durable: () => browser.storage,
      memory: new Map(),
    });
    let refuse = false;
    const storage: HeldWriteStorage = {
      ...base,
      removeItem: (k) => {
        if (refuse && k.startsWith("nana-sdk:reviewed-write:v2:"))
          throw new Error("refused");
        base.removeItem(k);
      },
    };
    const { hold } = setup({ storage, browser });
    const { chain, client } = fakeChain();
    const handle = hold.open(intentCall, { legacy: [{ call: ordinary.call }] });
    await expect(handle.send(client, lostReply().send)).rejects.toThrow();
    refuse = true;
    // The intent ends elsewhere; its mirror can't be removed.
    const intentJournal = createBrowserWriteRecovery(intentCall, { storage });
    intentJournal.abandon(intentJournal.read()!, { checkedWallet: true });
    chain.txs.push(sent(HASH, { block: 105n }));
    chain.head = 120n;
    chain.finalized = 110n;
    await expect(hold.open(ordinary).state(client)).resolves.toMatchObject({
      status: "held-no-hash",
      record: { mirrorOf: key },
    });
    expect(
      createBrowserWriteRecovery(ordinary, { storage }).read()?.hash,
    ).toBeUndefined();
  });

  it("Codex: a review that went stale while another tab's attempt settled must be reviewed again", async () => {
    const browser = origin();
    const locks = lockManager();
    const tabA = setup({ browser, locks });
    const tabB = setup({ browser, locks });
    const { chain, client, receiptOf } = fakeChain();
    const a = tabA.hold.open(intentCall, { legacy: [{ call: ordinary.call }] });
    const b = tabB.hold.open(intentCall, { legacy: [{ call: ordinary.call }] });
    let resume!: () => void;
    const reviewing = new Promise<void>((resolve) => (resume = resolve));
    const staleWrite = vi.fn();
    let inReview = false;
    const stale = a
      .send(client, async (gate) => {
        inReview = true;
        await reviewing;
        await gate.beforeSend();
        staleWrite();
      })
      .catch((e) => e);
    // Meanwhile, tab B sends the same intent and it settles.
    await vi.waitFor(() => expect(inReview).toBe(true));
    await b.send(client, wallet(async () => HASH).send);
    chain.txs.push({ ...sent(HASH), input: regenerated.data, block: 95n });
    await b.onReceipt(receiptOf(chain.txs[0]), client);
    resume();
    const refused = await stale;
    expect(refused).toBeInstanceOf(WriteHoldStaleReviewError);
    expect(refused.message).toBe(WRITE_HOLD_STALE_REVIEW_LINE);
    expect(refused.settled).toEqual({ result: "success", hash: HASH });
    expect(staleWrite).not.toHaveBeenCalled();
    // A fresh review sends normally: a deliberate repeat is never blocked.
    const again = wallet(async () => OTHER);
    await a.send(client, again.send);
    expect(again.write).toHaveBeenCalledOnce();
  });

  it("Codex: an exit never waits behind another tab's wallet prompt", async () => {
    const browser = origin();
    const locks = lockManager();
    const tabA = setup({ browser, locks });
    const tabB = setup({ browser, locks });
    const { client } = fakeChain();
    const a = tabA.hold.open(intentCall, { legacy: [{ call: ordinary.call }] });
    const b = tabB.hold.open(intentCall, { legacy: [{ call: ordinary.call }] });
    await expect(a.send(client, lostReply().send)).rejects.toThrow();
    const kept = await b.state(client);
    await a.exit(await a.state(client), { checkedWallet: true }, client);
    // Tab A opens another wallet prompt and waits there.
    let answer!: () => void;
    const prompt = a.send(client, async (gate) => {
      await gate.beforeSend();
      await new Promise<void>((resolve) => (answer = resolve));
    });
    await vi.waitFor(() => expect(answer).toBeTypeOf("function"));
    const started = Date.now();
    const ended = await b.exit(kept, { checkedWallet: true }, client);
    expect(Date.now() - started).toBeLessThan(500);
    expect(ended.released).toBe(false);
    expect(ended.state).toMatchObject({ exit: false });
    answer();
    await prompt;
  });

  it("crossed intents in two tabs: one sends within the retries, the other is held, never both busy", async () => {
    for (let run = 0; run < 20; run += 1) {
      const browser = origin();
      const locks = lockManager();
      const a = setup({ browser, locks });
      const b = setup({ browser, locks });
      const { client } = fakeChain();
      const one = a.hold.open(
        { ...ordinary, namespace: "intent:a:1" },
        { legacy: ["intent:b:1"] },
      );
      const two = b.hold.open(
        { ...ordinary, namespace: "intent:b:1" },
        { legacy: ["intent:a:1"] },
      );
      const writes = [lostReply(), lostReply()];
      const results = await Promise.all([
        one.send(client, writes[0].send).catch((e) => e),
        two.send(client, writes[1].send).catch((e) => e),
      ]);
      expect(
        writes[0].write.mock.calls.length + writes[1].write.mock.calls.length,
      ).toBe(1);
      expect(results.filter((r) => r instanceof WriteHeldError)).toHaveLength(
        1,
      );
      expect(results.some((r) => r instanceof WriteHoldBusyError)).toBe(false);
    }
  }, 20_000);

  it("Codex H1/H2: never settles a foreign mirror with an unrelated mined hash", async () => {
    const browser = origin();
    const locks = lockManager();
    const tabA = setup({ browser, locks });
    const tabB = setup({ browser, locks });
    const { chain, client } = fakeChain();
    const H1 = `0x${"a1".repeat(32)}` as Hex;
    const H2 = `0x${"a2".repeat(32)}` as Hex;
    const intentA = tabA.hold.open(
      { ...intentCall, namespace: writeIntentKey("pay", { who: "a" }) },
      { legacy: [{ call: ordinary.call }] },
    );
    const intentB = tabB.hold.open(
      { ...intentCall, namespace: writeIntentKey("pay", { who: "b" }) },
      { legacy: [{ call: ordinary.call }] },
    );
    // A reserves with nonce evidence 7 and submits H1 at nonce 8, pending.
    await intentA.send(client, wallet(async () => H1).send);
    chain.txs.push({ ...sent(H1), input: regenerated.data, nonce: 8 });
    // An identical exact call H2 mined at nonce 7 after the reservation.
    chain.txs.push(sent(H2, { block: 105n }));
    chain.head = 120n;
    const mirrorAt = () =>
      createBrowserWriteRecovery(ordinary, { storage: tabA.storage }).read();
    expect(mirrorAt()).toMatchObject({ mirrorOf: expect.any(String) });
    // B tries to attach H2 to A's hashless mirror: it acts on A instead.
    await expect(intentB.attachHash(client, H2)).resolves.toMatchObject({
      status: "pending-known-hash",
      hash: H1,
    });
    expect(mirrorAt()?.hash).toBeUndefined();
    const second = wallet(async () => OTHER);
    await expect(intentB.send(client, second.send)).rejects.toBeInstanceOf(
      WriteHeldError,
    );
    expect(second.write).not.toHaveBeenCalled();
    // A mirror never takes a hash or settles, read directly either.
    const direct = createWriteHold({ storage: tabA.storage, locks });
    const exactHandle = direct.open(ordinary);
    await expect(exactHandle.attachHash(client, H2)).resolves.toMatchObject({
      status: "pending-known-hash",
      hash: H1,
    });
    expect(mirrorAt()?.hash).toBeUndefined();
  });
});

describe("a held write's reservation identity", () => {
  it("names the reservation that ended even when its latest marker was refused (Codex 7)", async () => {
    const browser = origin();
    const { hold } = setup({ browser });
    const { client } = fakeChain();
    const handle = hold.open(ordinary);
    await expect(handle.send(client, lostReply().send)).rejects.toThrow();
    const first = await handle.state(client);
    await handle.exit(first, { checkedWallet: true }, client);
    const write = browser.storage.setItem;
    browser.storage.setItem = (k: string, v: string) => {
      if (k.endsWith(":latest")) throw new Error("QuotaExceededError");
      write(k, v);
    };
    await expect(handle.send(client, lostReply().send)).rejects.toThrow();
    const second = (await handle.state(client)) as WriteHeldState;
    expect(second.reservation).not.toBe((first as WriteHeldState).reservation);
    const ended = await handle.exit(second, { checkedWallet: true }, client);
    expect(ended.state).toEqual({
      checked: true,
      status: "clear",
      reservation: second.reservation,
    });
    expect(handle.peek()).toEqual({
      status: "clear",
      reservation: second.reservation,
    });
  });

  it("replays by reservation, so a late subscriber never hears an older clear (Codex 8)", async () => {
    const browser = origin();
    const first = setup({ browser });
    const second = setup({ browser, locks: first.locks });
    const { client } = fakeChain();
    const a = first.hold.open(ordinary);
    await expect(a.send(client, lostReply().send)).rejects.toThrow();
    const old = await a.state(client);
    await a.exit(old, { checkedWallet: true }, client);
    // Another controller reserves and exits a newer attempt.
    const b = second.hold.open(ordinary);
    await expect(b.send(client, lostReply().send)).rejects.toThrow();
    const newer = (await b.state(client)) as WriteHeldState;
    await b.exit(newer, { checkedWallet: true }, client);
    const late = vi.fn();
    first.hold.open(ordinary).subscribe(late);
    expect(late).toHaveBeenCalledWith({
      status: "clear",
      reservation: newer.reservation,
    });
  });

  it("is on every emitted, subscribed and returned state", async () => {
    const { hold } = setup();
    const { client } = fakeChain();
    const handle = hold.open(ordinary);
    const heard: WriteHoldState[] = [];
    handle.subscribe((state) => heard.push(state));
    await expect(handle.send(client, lostReply().send)).rejects.toThrow();
    const id = (handle.peek() as WriteHeldState).record.id;
    expect(handle.peek()).toMatchObject({ reservation: id });
    const shown = await handle.state(client);
    expect(shown).toMatchObject({ reservation: id });
    expect(heard.length).toBeGreaterThan(0);
    for (const state of heard.filter((state) => state.status !== "clear"))
      expect(state.reservation).toBe(id);
    const late = vi.fn();
    hold.open(ordinary).subscribe(late);
    expect(late.mock.calls[0][0]).toMatchObject({ reservation: id });
    const refused = await handle.send(client, lostReply().send).catch((e) => e);
    expect(refused.state).toMatchObject({ reservation: id });
    // A clear names the reservation it ended.
    const ended = await handle.exit(shown, { checkedWallet: true }, client);
    expect(ended.state).toEqual({
      checked: true,
      status: "clear",
      reservation: id,
    });
    expect(handle.peek()).toEqual({ status: "clear", reservation: id });
    // Nothing reserved yet: no reservation to name.
    expect(
      hold.open({ ...ordinary, call: { ...ordinary.call, value: 3n } }).peek(),
    ).toEqual({ status: "clear" });
  });
});

describe("a held write's settlement", () => {
  const success = {
    status: "clear",
    reservation: expect.any(String),
    settled: { result: "success", hash: HASH },
  };

  it("is read by another controller on the same storage, as after a reload or in another tab", async () => {
    const browser = origin();
    const first = setup({ browser });
    const { chain, client, receiptOf } = fakeChain();
    await first.hold.open(ordinary).send(client, wallet(async () => HASH).send);
    chain.txs.push(sent(HASH, { block: 95n }));
    await expect(
      first.hold.open(ordinary).onReceipt(receiptOf(chain.txs[0]), client),
    ).resolves.toEqual(success);
    // The same controller keeps saying so.
    expect(first.hold.open(ordinary).peek()).toEqual(success);
    const second = setup({ browser, locks: first.locks });
    expect(second.hold.open(ordinary).peek()).toEqual(success);
    await expect(second.hold.open(ordinary).state(client)).resolves.toEqual({
      ...success,
      checked: true,
    });
    // Another call on the same account has none.
    await expect(
      second.hold
        .open({ ...ordinary, call: { ...ordinary.call, value: 1n } })
        .state(client),
    ).resolves.toEqual({ status: "clear", checked: true });
  });

  it("is never produced by the user's exit", async () => {
    const browser = origin();
    const { hold, locks } = setup({ browser });
    const { client } = fakeChain();
    const handle = hold.open(ordinary);
    await expect(
      handle.send(
        client,
        wallet(async () => {
          throw new Error("reply lost");
        }).send,
      ),
    ).rejects.toThrow();
    const shown = await handle.state(client);
    await expect(
      handle.exit(shown, { checkedWallet: true }, client),
    ).resolves.toEqual({
      released: true,
      state: {
        checked: true,
        status: "clear",
        reservation: expect.any(String),
      },
    });
    await expect(handle.state(client)).resolves.toEqual({
      status: "clear",
      reservation: expect.any(String),
      checked: true,
    });
    expect(setup({ browser, locks }).hold.open(ordinary).peek()).toEqual({
      status: "clear",
      reservation: expect.any(String),
    });
  });

  it("is replaced once a new write on the call is reserved", async () => {
    const { hold } = setup();
    const { chain, client, receiptOf } = fakeChain();
    const handle = hold.open(ordinary);
    await handle.send(client, wallet(async () => HASH).send);
    chain.txs.push(sent(HASH, { block: 95n }));
    await handle.onReceipt(receiptOf(chain.txs[0]), client);
    expect(handle.peek()).toEqual(success);
    // A deliberate repeat: its reservation replaces the old settlement.
    await expect(
      handle.send(
        client,
        wallet(async () => {
          throw new Error("reply lost");
        }).send,
      ),
    ).rejects.toThrow();
    const shown = await handle.state(client);
    expect(shown.status).toBe("held-no-hash");
    await handle.exit(shown, { checkedWallet: true }, client);
    await expect(handle.state(client)).resolves.toEqual({
      checked: true,
      status: "clear",
      reservation: expect.any(String),
    });
  });

  it("never brings an older settlement back after a newer reservation's exit, even when its removal was refused", async () => {
    const browser = origin();
    const { hold, locks } = setup({ browser });
    const { chain, client, receiptOf } = fakeChain();
    const handle = hold.open(ordinary);
    await handle.send(client, wallet(async () => HASH).send);
    chain.txs.push(sent(HASH, { block: 95n }));
    await handle.onReceipt(receiptOf(chain.txs[0]), client);
    expect(handle.peek()).toEqual(success);
    // Codex: the old settlement can't be removed when B is reserved.
    const remove = browser.storage.removeItem;
    browser.storage.removeItem = (key: string) => {
      if (key.endsWith(":settled")) throw new Error("refused");
      remove(key);
    };
    await expect(handle.send(client, lostReply().send)).rejects.toThrow();
    const shown = await handle.state(client);
    await expect(
      handle.exit(shown, { checkedWallet: true }, client),
    ).resolves.toEqual({
      released: true,
      state: {
        checked: true,
        status: "clear",
        reservation: expect.any(String),
      },
    });
    expect(handle.peek()).toEqual({
      status: "clear",
      reservation: expect.any(String),
    });
    await expect(handle.state(client)).resolves.toEqual({
      status: "clear",
      reservation: expect.any(String),
      checked: true,
    });
    // After a reload too.
    const reloaded = setup({ browser, locks }).hold.open(ordinary);
    expect(reloaded.peek()).toEqual({
      status: "clear",
      reservation: expect.any(String),
    });
    await expect(reloaded.state(client)).resolves.toEqual({
      status: "clear",
      reservation: expect.any(String),
      checked: true,
    });
  });

  it("never lets a tab's older settlement kept in memory replace another tab's newer one", async () => {
    const browser = origin();
    // Codex: tab A's settlement save falls back to its memory.
    let refuseSettled = true;
    const durable = {
      getItem: (key: string) => browser.storage.getItem(key),
      setItem: (key: string, value: string) => {
        if (refuseSettled && key.endsWith(":settled"))
          throw new Error("QuotaExceededError");
        browser.storage.setItem(key, value);
      },
      removeItem: (key: string) => browser.storage.removeItem(key),
    };
    const memoryA = new Map<string, string>();
    const tabA = setup({
      storage: createHeldWriteStorage({
        durable: () => durable,
        memory: memoryA,
      }),
    });
    const tabB = setup({ browser, locks: tabA.locks });
    const { chain, client, receiptOf } = fakeChain();
    await tabA.hold.open(ordinary).send(client, wallet(async () => HASH).send);
    chain.txs.push(sent(HASH, { block: 95n }));
    await tabA.hold.open(ordinary).onReceipt(receiptOf(chain.txs[0]), client);
    expect([...memoryA.keys()].some((key) => key.endsWith(":settled"))).toBe(
      true,
    );
    // Tab B reserves and settles B.
    refuseSettled = false;
    await tabB.hold.open(ordinary).send(client, wallet(async () => OTHER).send);
    chain.txs.push(sent(OTHER, { nonce: 8, block: 96n }));
    const settledB = {
      status: "clear",
      reservation: expect.any(String),
      settled: { result: "success", hash: OTHER },
    };
    await expect(
      tabB.hold.open(ordinary).onReceipt(receiptOf(chain.txs[1]), client),
    ).resolves.toEqual(settledB);
    // Tab A's writes recover: its read must not replace B's settlement.
    expect(tabA.hold.open(ordinary).peek()).toEqual(settledB);
    await expect(tabB.hold.open(ordinary).state(client)).resolves.toEqual({
      ...settledB,
      checked: true,
    });
    expect(tabB.hold.open(ordinary).peek()).toEqual(settledB);
  });

  it("brings no old settlement back after a wallet rejection when neither invalidation could be saved", async () => {
    const browser = origin();
    const { hold, locks } = setup({ browser });
    const { chain, client, receiptOf } = fakeChain();
    const handle = hold.open(ordinary);
    await handle.send(client, wallet(async () => HASH).send);
    chain.txs.push(sent(HASH, { block: 95n }));
    await handle.onReceipt(receiptOf(chain.txs[0]), client);
    // Codex: the latest marker and the old settlement's removal both refused.
    const write = browser.storage.setItem;
    browser.storage.setItem = (key: string, value: string) => {
      if (key.endsWith(":latest")) throw new Error("QuotaExceededError");
      write(key, value);
    };
    const remove = browser.storage.removeItem;
    browser.storage.removeItem = (key: string) => {
      if (key.endsWith(":settled")) throw new Error("refused");
      remove(key);
    };
    const rejected = wallet(async () => {
      throw Object.assign(new Error("denied"), { code: 4001 });
    });
    await expect(handle.send(client, rejected.send)).rejects.toThrow("denied");
    expect(handle.peek()).toEqual({
      status: "clear",
      reservation: expect.any(String),
    });
    await expect(handle.state(client)).resolves.toEqual({
      checked: true,
      status: "clear",
      reservation: expect.any(String),
    });
    const reloaded = setup({ browser, locks }).hold.open(ordinary);
    expect(reloaded.peek()).toEqual({
      status: "clear",
      reservation: expect.any(String),
    });
    // And a later send goes out normally.
    const again = wallet(async () => OTHER);
    await reloaded.send(client, again.send);
    expect(again.write).toHaveBeenCalledOnce();
  });

  it("brings no old settlement back when the newer reservation's marker can't be saved", async () => {
    const browser = origin();
    const { hold, locks } = setup({ browser });
    const { chain, client, receiptOf } = fakeChain();
    const handle = hold.open(ordinary);
    await handle.send(client, wallet(async () => HASH).send);
    chain.txs.push(sent(HASH, { block: 95n }));
    await handle.onReceipt(receiptOf(chain.txs[0]), client);
    // Codex: the durable latest-reservation write is refused for B.
    const write = browser.storage.setItem;
    browser.storage.setItem = (key: string, value: string) => {
      if (key.endsWith(":latest")) throw new Error("QuotaExceededError");
      write(key, value);
    };
    await expect(handle.send(client, lostReply().send)).rejects.toThrow();
    const shown = await handle.state(client);
    await handle.exit(shown, { checkedWallet: true }, client);
    expect(handle.peek()).toEqual({
      status: "clear",
      reservation: expect.any(String),
    });
    await expect(handle.state(client)).resolves.toEqual({
      checked: true,
      status: "clear",
      reservation: expect.any(String),
    });
    const reloaded = setup({ browser, locks }).hold.open(ordinary);
    expect(reloaded.peek()).toEqual({
      status: "clear",
      reservation: expect.any(String),
    });
  });

  it("brings no old settlement back after an exit and a reload", async () => {
    const browser = origin();
    const { hold, locks } = setup({ browser });
    const { chain, client, receiptOf } = fakeChain();
    const handle = hold.open(ordinary);
    await handle.send(client, wallet(async () => HASH).send);
    chain.txs.push(sent(HASH, { block: 95n }));
    await handle.onReceipt(receiptOf(chain.txs[0]), client);
    await expect(handle.send(client, lostReply().send)).rejects.toThrow();
    const shown = await handle.state(client);
    await handle.exit(shown, { checkedWallet: true }, client);
    for (let reload = 0; reload < 2; reload += 1) {
      const again = setup({ browser, locks }).hold.open(ordinary);
      expect(again.peek()).toEqual({
        status: "clear",
        reservation: expect.any(String),
      });
      await expect(again.state(client)).resolves.toEqual({
        checked: true,
        status: "clear",
        reservation: expect.any(String),
      });
    }
  });

  it("holds within the tab while storage is refused", async () => {
    const browser = origin();
    browser.state.write = false;
    const memory = new Map<string, string>();
    const first = setup({ browser, memory });
    const { chain, client, receiptOf } = fakeChain();
    await first.hold.open(ordinary).send(client, wallet(async () => HASH).send);
    chain.txs.push(sent(HASH, { block: 95n }));
    await first.hold.open(ordinary).onReceipt(receiptOf(chain.txs[0]), client);
    expect(browser.values.size).toBe(0);
    // Another controller in the same tab reads it from the tab's memory.
    const second = setup({ browser, memory, locks: first.locks });
    expect(second.hold.open(ordinary).peek()).toEqual(success);
  });
});

describe("a held Safe proposal", () => {
  const SUCCESS = encodeEventTopics({
    abi: parseAbi(["event ExecutionSuccess(bytes32 txHash, uint256 payment)"]),
  })[0];
  const FAILURE = encodeEventTopics({
    abi: parseAbi(["event ExecutionFailure(bytes32 txHash, uint256 payment)"]),
  })[0];
  const safeCall = (call = ordinary.call): ReviewedWriteRecoveryInput => ({
    chainId: 10,
    account: SAFE,
    safe: true,
    call,
  });
  /** Safe's service, with the proposal at nonce 5; `record` overrides its fields. */
  function service(call = ordinary.call, record: Record<string, unknown> = {}) {
    const tx = safeProposalFor({ ...call, value: BigInt(call.value ?? 0) }, 5);
    const hash = canonicalSafeTxHash(10, SAFE, tx);
    const answer = {
      current: {
        ...tx,
        safe: SAFE,
        safeTxHash: hash,
        isExecuted: false,
        ...record,
      },
    };
    return {
      hash,
      answer,
      options: {
        fetch: vi.fn(async () => new Response(JSON.stringify(answer.current))),
      },
    };
  }
  const execInput = (call = ordinary.call) =>
    encodeFunctionData({
      abi: SAFE_EXEC_ABI,
      functionName: "execTransaction",
      args: [
        call.to,
        BigInt(call.value ?? 0),
        call.data,
        0,
        0n,
        0n,
        0n,
        zeroAddress,
        zeroAddress,
        "0x",
      ],
    });
  const event = (txHash: Hex, topic: Hex) => ({
    address: SAFE,
    topics: [topic],
    data: encodeAbiParameters(
      [{ type: "bytes32" }, { type: "uint256" }],
      [txHash, 0n],
    ),
  });
  /** The Safe ran `proposal` in EXECUTION at block 95, its nonce moving there. */
  function executes(
    fixture: ReturnType<typeof fakeChain>,
    proposal: Hex,
    topic: Hex,
    { named = true, block = 95n, hash = EXECUTION } = {},
  ) {
    const log = event(proposal, topic);
    fixture.chain.txs.push({
      hash,
      from: RELAYER,
      nonce: 0,
      to: SAFE,
      input: execInput(),
      value: 0n,
      block,
      logs: [log],
    });
    fixture.chain.safeCrossing = block;
    fixture.chain.head = 120n;
    fixture.chain.finalized = 110n;
    fixture.chain.safeLogs = [
      {
        ...log,
        removed: false,
        blockNumber: `0x${block.toString(16)}`,
        blockHash: pad(block + 1n),
        ...(named ? { transactionHash: hash } : {}),
      },
    ];
  }
  function safeSetup(browser = origin()) {
    const memory = new Map<string, string>();
    const storage = createHeldWriteStorage({
      durable: () => browser.storage,
      memory,
    });
    const queue = service();
    const hold = createWriteHold({
      storage,
      locks: lockManager(),
      safeService: queue.options,
      settle: { intervalMs: 1_000, attempts: 3 },
    });
    return { hold, queue, browser, storage };
  }

  it("holds a proposal while Safe's service returns it unexecuted, and bounds the wait once it doesn't (ruling)", async () => {
    const { hold, queue } = safeSetup();
    const fixture = fakeChain();
    const handle = hold.open(safeCall());
    await handle.send(fixture.client, async (gate) => {
      await gate.beforeSend();
      gate.afterSubmit(queue.hash);
    });
    await handle.state(fixture.client);
    expect((handle.peek() as WriteHeldState).record.safeNonce).toBe("5");
    // Two hours on, the service still returns it unexecuted: truly pending.
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now + 2 * 3_600_000);
    await expect(handle.state(fixture.client)).resolves.toMatchObject({
      exit: false,
    });
    // Then the service can't find it, though the Safe's nonce still waits:
    // a waiting nonce shows only that nothing ran there, so the clock runs.
    queue.options.fetch.mockResolvedValue(new Response("", { status: 404 }));
    vi.spyOn(Date, "now").mockReturnValue(now + 2 * 3_600_000 + 29 * 60_000);
    await expect(handle.state(fixture.client)).resolves.toMatchObject({
      exit: false,
    });
    vi.spyOn(Date, "now").mockReturnValue(now + 2 * 3_600_000 + 31 * 60_000);
    await expect(handle.state(fixture.client)).resolves.toMatchObject({
      status: "held-unchecked",
      exit: true,
      warning: WRITE_HOLD_HASHED_EXIT_LINE,
    });
  });

  it("bounds a saved-nonce proposal's wait when not even the chain's id can be read", async () => {
    const { hold, queue } = safeSetup();
    const fixture = fakeChain();
    const handle = hold.open(safeCall());
    await handle.send(fixture.client, async (gate) => {
      await gate.beforeSend();
      gate.afterSubmit(queue.hash);
    });
    await handle.state(fixture.client);
    queue.options.fetch.mockRejectedValue(new Error("offline"));
    fixture.client.getChainId.mockRejectedValue(new Error("rpc"));
    fixture.client.request.mockRejectedValue(new Error("rpc"));
    fixture.client.getTransactionReceipt.mockRejectedValue(new Error("rpc"));
    fixture.client.getTransaction.mockRejectedValue(new Error("rpc"));
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now + 29 * 60_000);
    await expect(handle.state(fixture.client)).resolves.toMatchObject({
      exit: false,
    });
    vi.spyOn(Date, "now").mockReturnValue(now + 31 * 60_000);
    const late = await handle.state(fixture.client);
    expect(late).toMatchObject({ status: "held-unchecked", exit: true });
    // Still only the user's explicit exit ends it.
    expect(handle.peek().status).not.toBe("clear");
  });

  it("keeps a held proposal, unreleased, when Safe's service never answers", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const { hold, queue } = safeSetup();
    const fixture = fakeChain();
    const handle = hold.open(safeCall());
    await handle.send(fixture.client, async (gate) => {
      await gate.beforeSend();
      gate.afterSubmit(queue.hash);
    });
    // The service hangs, whatever signal it is given.
    queue.options.fetch.mockImplementation(() => new Promise(() => {}));
    const read = handle.state(fixture.client);
    await vi.advanceTimersByTimeAsync(8_000 * 4);
    await expect(read).resolves.toMatchObject({
      status: "pending-known-hash",
      hash: queue.hash,
      checked: true,
    });
    vi.useRealTimers();
  });

  it("keeps a held proposal when Safe's service sends its headers but never its body", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const { hold, queue } = safeSetup();
    const fixture = fakeChain();
    const handle = hold.open(safeCall());
    await handle.send(fixture.client, async (gate) => {
      await gate.beforeSend();
      gate.afterSubmit(queue.hash);
    });
    queue.options.fetch.mockImplementation(
      async () =>
        new Response(new ReadableStream({ start() {} }), { status: 200 }),
    );
    const read = handle.state(fixture.client);
    await vi.advanceTimersByTimeAsync(8_000 * 4);
    await expect(read).resolves.toMatchObject({
      status: "pending-known-hash",
      hash: queue.hash,
      checked: true,
    });
    // Never authenticated by the service: the usual exit after 30 minutes.
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now + 31 * 60_000);
    const later = handle.state(fixture.client);
    await vi.advanceTimersByTimeAsync(8_000 * 4);
    await expect(later).resolves.toMatchObject({ exit: true, checked: true });
    vi.useRealTimers();
  });

  it("bounds Safe-service reads made with the browser's own fetch", async () => {
    const { queue } = safeSetup();
    vi.stubGlobal("fetch", queue.options.fetch);
    const browser = origin();
    const hold = createWriteHold({
      storage: createHeldWriteStorage({
        durable: () => browser.storage,
        memory: new Map(),
      }),
      locks: lockManager(),
    });
    const fixture = fakeChain();
    const handle = hold.open(safeCall());
    await handle.adopt(
      { status: "clear" },
      { safe: { safeTxHash: queue.hash } },
      fixture.client,
    );
    expect(queue.options.fetch).toHaveBeenCalled();
    expect((handle.peek() as WriteHeldState).record.safeNonce).toBe("5");
  });

  it("attaches an adopted proposal's Safe nonce only when it hashes to its safeTxHash", async () => {
    const { hold, queue } = safeSetup();
    const fixture = fakeChain();
    const handle = hold.open(safeCall());
    // Safe's service is unreachable: the hash alone proves the nonce.
    queue.options.fetch.mockRejectedValue(new Error("offline"));
    await handle.adopt(
      { status: "clear" },
      { safe: { safeTxHash: queue.hash } },
      fixture.client,
    );
    const nonceOf = () => (handle.peek() as WriteHeldState).record.safeNonce;
    const attach = (safeTxHash: Hex, nonce: number) =>
      handle.attachSafeNonce(fixture.client, { safeTxHash, nonce });
    await expect(attach(queue.hash, 6)).resolves.toMatchObject({
      status: "pending-known-hash",
    });
    expect(nonceOf()).toBeUndefined();
    await attach(OTHER, 5);
    expect(nonceOf()).toBeUndefined();
    await attach(queue.hash, 5);
    expect(nonceOf()).toBe("5");
    // Once known, it is never replaced.
    await attach(queue.hash, 5);
    expect(nonceOf()).toBe("5");
    // Under an intent, the same.
    const other = safeSetup();
    other.queue.options.fetch.mockRejectedValue(new Error("offline"));
    const intentHandle = other.hold.open({
      ...safeCall(),
      namespace: writeIntentKey("pay", { projectId: 4n }),
    });
    await intentHandle.adopt(
      { status: "clear" },
      { safe: { safeTxHash: other.queue.hash } },
      fixture.client,
    );
    await intentHandle.attachSafeNonce(fixture.client, {
      safeTxHash: other.queue.hash,
      nonce: 5,
    });
    expect((intentHandle.peek() as WriteHeldState).record.safeNonce).toBe("5");
    // An ordinary hold has no Safe nonce to attach.
    const plain = setup().hold.open(ordinary);
    await expect(
      plain.attachSafeNonce(fixture.client, {
        safeTxHash: queue.hash,
        nonce: 5,
      }),
    ).resolves.toMatchObject({ status: "clear" });
  });

  it("adopts a previous deploy's Safe proposal by its safeTxHash, only for this exact call", async () => {
    const { hold, queue } = safeSetup();
    const fixture = fakeChain();
    const handle = hold.open(safeCall());
    await expect(
      handle.adopt(
        { status: "clear" },
        { safe: { safeTxHash: queue.hash } },
        fixture.client,
      ),
    ).resolves.toMatchObject({
      status: "pending-known-hash",
      hash: queue.hash,
    });
    // A proposal of another call is refused.
    const other = safeSetup();
    const changed = other.hold.open(
      safeCall({ ...ordinary.call, data: "0xaabbccdd0009" }),
    );
    await expect(
      changed.adopt(
        { status: "clear" },
        { safe: { safeTxHash: other.queue.hash } },
        fixture.client,
      ),
    ).resolves.toMatchObject({ status: "clear" });
    expect(changed.peek().status).toBe("clear");
  });

  it.each([
    [SUCCESS, "success"],
    [FAILURE, "failed"],
  ] as const)(
    "settles from the canonical %s log's receipt while Safe's service is stale",
    async (topic, result) => {
      const browser = origin();
      const { hold, queue } = safeSetup(browser);
      const fixture = fakeChain();
      const handle = hold.open(safeCall());
      await handle.send(fixture.client, async (gate) => {
        await gate.beforeSend();
        gate.afterSubmit(queue.hash);
      });
      await expect(handle.state(fixture.client)).resolves.toMatchObject({
        status: "pending-known-hash",
        hash: queue.hash,
        line: SAFE_PROPOSAL_AWAITING,
      });
      executes(fixture, queue.hash, topic);
      // The service still lists it unexecuted.
      const settled = {
        status: "clear",
        reservation: expect.any(String),
        settled: { result, hash: EXECUTION },
      };
      await expect(handle.state(fixture.client)).resolves.toEqual({
        ...settled,
        checked: true,
      });
      // Another tab learns the same settlement.
      expect(safeSetup(browser).hold.open(safeCall()).peek()).toEqual(settled);
      // Either way it ended: the next proposal is a new action.
      await handle.send(fixture.client, async (gate) => {
        await gate.beforeSend();
      });
    },
  );

  it("keeps an execution it can't name through reload and Done, with no exit, until its receipt settles it", async () => {
    vi.useFakeTimers();
    const browser = origin();
    const { hold, queue } = safeSetup(browser);
    const fixture = fakeChain();
    const handle = hold.open(safeCall());
    await handle.send(fixture.client, async (gate) => {
      await gate.beforeSend();
      gate.afterSubmit(queue.hash);
    });
    executes(fixture, queue.hash, SUCCESS, { named: false });
    fixture.chain.hidden.add(EXECUTION.toLowerCase());
    const ran = await handle.state(fixture.client);
    expect(ran).toMatchObject({
      status: "ran-executed",
      exit: false,
      line: SAFE_PROPOSAL_EXECUTED_LINE,
      record: { executed: true },
    });
    // A reload: a new controller, a new tab memory, the same browser.
    const reloaded = safeSetup(browser).hold.open(safeCall());
    expect(reloaded.peek().status).toBe("ran-executed");
    await expect(
      reloaded.exit(
        { ...ran, exit: true } as WriteHoldState,
        { checkedWallet: true },
        fixture.client,
      ),
    ).resolves.toMatchObject({ released: false });
    expect(() =>
      createBrowserWriteRecovery(safeCall(), {
        storage: createHeldWriteStorage({
          durable: () => browser.storage,
          memory: new Map(),
        }),
      }).abandon((ran as Extract<WriteHoldState, { record: unknown }>).record, {
        checkedWallet: true,
      }),
    ).toThrow("ran onchain");
    await expect(
      reloaded.send(fixture.client, async () => {}),
    ).rejects.toBeInstanceOf(WriteHeldError);
    // The app learns the execution's hash; its receipt settles it.
    fixture.chain.hidden.clear();
    await expect(
      reloaded.onExecuted(fixture.client, EXECUTION),
    ).resolves.toEqual({
      status: "clear",
      reservation: expect.any(String),
      settled: { result: "success", hash: EXECUTION },
    });
    hold.dispose();
  });

  it("settles a named execution from its canonical log while its receipt is missing, and holds on an unverified receipt", async () => {
    const { hold, queue } = safeSetup();
    const fixture = fakeChain();
    const handle = hold.open(safeCall());
    await handle.send(fixture.client, async (gate) => {
      await gate.beforeSend();
      gate.afterSubmit(queue.hash);
    });
    executes(fixture, queue.hash, SUCCESS);
    fixture.chain.hidden.add(EXECUTION.toLowerCase());
    await expect(handle.state(fixture.client)).resolves.toEqual({
      checked: true,
      status: "clear",
      reservation: expect.any(String),
      settled: { result: "success", hash: EXECUTION },
    });
    // With no readable proof, a receipt that doesn't verify settles nothing.
    const again = safeSetup();
    const other = again.hold.open(safeCall());
    const second = fakeChain();
    await other.send(second.client, async (gate) => {
      await gate.beforeSend();
      gate.afterSubmit(again.queue.hash);
    });
    executes(second, again.queue.hash, SUCCESS);
    second.chain.safeLogs = {} as never;
    second.chain.hidden.add(EXECUTION.toLowerCase());
    await other.state(second.client);
    await expect(
      other.onReceipt(
        { transactionHash: EXECUTION, status: "success" } as never,
        second.client,
      ),
    ).resolves.toMatchObject({ status: "pending-known-hash" });
    again.hold.dispose();
    hold.dispose();
  });

  it("keeps following a saved execution whose receipt can't be verified yet", async () => {
    vi.useFakeTimers();
    const { hold, queue } = safeSetup();
    const fixture = fakeChain();
    const handle = hold.open(safeCall());
    await handle.send(fixture.client, async (gate) => {
      await gate.beforeSend();
      gate.afterSubmit(queue.hash);
    });
    executes(fixture, queue.hash, FAILURE);
    fixture.chain.finalized = 90n;
    await handle.onReceipt(
      fixture.receiptOf(fixture.chain.txs[0]),
      fixture.client,
    );
    // Its transaction can't be read, nor its history: still held, no exit.
    fixture.chain.safeLogs = {} as never;
    const lookup = fixture.client.getTransaction.getMockImplementation()!;
    fixture.client.getTransaction.mockImplementation(async (args) => {
      if (args.hash === EXECUTION) throw new Error("timeout");
      return lookup(args);
    });
    await expect(handle.state(fixture.client)).resolves.toMatchObject({
      status: "ran-executed",
      exit: false,
    });
    hold.dispose();
  });

  it("serializes Safe sends: two flows never both propose", async () => {
    const { hold, queue } = safeSetup();
    const fixture = fakeChain();
    let propose!: () => void;
    const proposals = vi.fn();
    const first = hold.open(safeCall()).send(fixture.client, async (gate) => {
      // Safe's queue is read while the call is already reserved under the lock.
      await new Promise<void>((resolve) => (propose = resolve));
      await gate.beforeSend();
      proposals();
      gate.afterSubmit(queue.hash);
    });
    await vi.waitFor(() => expect(propose).toBeTypeOf("function"));
    await expect(
      hold.open(safeCall()).send(fixture.client, async (gate) => {
        await gate.beforeSend();
        proposals();
      }),
    ).rejects.toBeInstanceOf(WriteHoldBusyError);
    propose();
    await first;
    await expect(
      hold.open(safeCall()).send(fixture.client, async (gate) => {
        await gate.beforeSend();
        proposals();
      }),
    ).rejects.toBeInstanceOf(WriteHeldError);
    expect(proposals).toHaveBeenCalledOnce();
  });

  it("releases a direct execution reorganized away once a finalized cancel used its executor's nonce", async () => {
    for (const history of ["readable", "unreadable", "unsent"] as const) {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(1_000_000);
      const browser = origin();
      const { hold, queue } = safeSetup(browser);
      queue.options.fetch.mockImplementation(
        async () => new Response("not found", { status: 404 }),
      );
      const fixture = fakeChain();
      const handle = hold.open(safeCall());
      await handle.send(fixture.client, async (gate) => {
        await gate.beforeSend();
        gate.afterSubmit(EXECUTION);
      });
      // The owner executed it at once; its outer transaction reverted, not final yet.
      fixture.chain.txs.push({
        hash: EXECUTION,
        from: ACCOUNT,
        nonce: 7,
        to: SAFE,
        input: execInput(),
        value: 0n,
        block: 95n,
        status: "reverted",
      });
      fixture.chain.head = 100n;
      fixture.chain.finalized = 90n;
      await expect(handle.state(fixture.client)).resolves.toMatchObject({
        status: "ran-executed",
        record: {
          executed: true,
          executionHash: EXECUTION,
          sentNonce: "7",
          sentFrom: ACCOUNT,
        },
      });
      if (history === "unsent") {
        // A record saved before who sent it was kept: no replacement can be proven.
        const [key] = browser.values.keys();
        const { sentFrom: _, ...legacy } = JSON.parse(browser.values.get(key)!);
        browser.values.set(key, JSON.stringify(legacy));
      }
      // A reorg removes it, and a finalized cancel uses the executor's nonce.
      fixture.chain.txs.length = 0;
      fixture.chain.reorged.set(95n, OTHER);
      fixture.chain.txs.push({
        hash: OTHER,
        from: ACCOUNT,
        nonce: 7,
        to: ACCOUNT,
        input: "0x",
        value: 0n,
        block: 97n,
      });
      fixture.chain.head = 120n;
      fixture.chain.finalized = 110n;
      if (history === "readable") {
        // Never released on its own: the explicit exit, at once.
        const replaced = await handle.state(fixture.client);
        expect(replaced).toMatchObject({
          status: "safe-replaced",
          exit: true,
          line: WRITE_HOLD_SAFE_REPLACED_LINE,
          warning: WRITE_HOLD_HASHED_EXIT_LINE,
        });
        await expect(
          handle.exit(replaced, { checkedWallet: true }, fixture.client),
        ).resolves.toMatchObject({ released: true });
      } else {
        const blocks = fixture.client.getBlock.getMockImplementation()!;
        fixture.client.getBlock.mockImplementation(async (args = {}) => {
          if (args.includeTransactions) throw new Error("history unavailable");
          return blocks(args);
        });
        await expect(handle.state(fixture.client)).resolves.toMatchObject({
          status: "ran-executed",
          exit: false,
        });
        vi.setSystemTime(1_000_000 + 31 * 60_000);
        const unchecked = await handle.state(fixture.client);
        expect(unchecked).toMatchObject({
          status: "held-unchecked",
          exit: true,
          line: WRITE_HOLD_UNCHECKED_LINE,
          warning: WRITE_HOLD_HASHED_EXIT_LINE,
        });
        await expect(
          handle.exit(unchecked, { checkedWallet: true }, fixture.client),
        ).resolves.toMatchObject({ released: true });
      }
      hold.dispose();
      vi.useRealTimers();
    }
  });

  it("never settles or releases a direct execution from another transaction at its nonce", async () => {
    const SAFE_TX = `0x${"5a".repeat(32)}` as Hex;
    const exitAtOnce = {
      status: "safe-replaced",
      exit: true,
      line: WRITE_HOLD_SAFE_REPLACED_LINE,
      warning: WRITE_HOLD_HASHED_EXIT_LINE,
    };
    for (const [kind, expected] of [
      // Codex: identical Safe execution calldata in the replacement.
      ["the same execution, succeeding", exitAtOnce],
      ["the same execution, failing", exitAtOnce],
      ["a wrapper running a Safe execution", exitAtOnce],
      ["a reverted transaction", exitAtOnce],
      ["an unreadable receipt", exitAtOnce],
      ["a receipt off the canonical chain", exitAtOnce],
    ] as const) {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(1_000_000);
      const { hold, queue } = safeSetup();
      queue.options.fetch.mockImplementation(
        async () => new Response("not found", { status: 404 }),
      );
      const fixture = fakeChain();
      const handle = hold.open(safeCall());
      await handle.send(fixture.client, async (gate) => {
        await gate.beforeSend();
        gate.afterSubmit(EXECUTION);
      });
      fixture.chain.txs.push({
        hash: EXECUTION,
        from: ACCOUNT,
        nonce: 7,
        to: SAFE,
        input: execInput(),
        value: 0n,
        block: 95n,
        status: "reverted",
      });
      fixture.chain.head = 100n;
      fixture.chain.finalized = 90n;
      await expect(handle.state(fixture.client)).resolves.toMatchObject({
        status: "ran-executed",
        record: { sentFrom: ACCOUNT },
      });
      fixture.chain.txs.length = 0;
      fixture.chain.reorged.set(95n, EXECUTION);
      const wrapped = kind.startsWith("a wrapper");
      fixture.chain.txs.push({
        hash: OTHER,
        from: ACCOUNT,
        nonce: 7,
        to: wrapped ? RELAYER : SAFE,
        input: wrapped ? "0x1234" : execInput(),
        value: 0n,
        block: 97n,
        status: kind === "a reverted transaction" ? "reverted" : "success",
        logs:
          kind === "a reverted transaction"
            ? []
            : [event(SAFE_TX, kind.endsWith("failing") ? FAILURE : SUCCESS)],
      });
      fixture.chain.head = 120n;
      fixture.chain.finalized = 110n;
      if (kind === "an unreadable receipt")
        fixture.client.getTransactionReceipt.mockRejectedValue(
          new Error("busy"),
        );
      if (kind === "a receipt off the canonical chain") {
        const receipts =
          fixture.client.getTransactionReceipt.getMockImplementation()!;
        fixture.client.getTransactionReceipt.mockImplementation(
          async (args) => ({
            ...(await receipts(args)),
            blockHash: OTHER,
          }),
        );
      }
      const shown = await handle.state(fixture.client);
      expect(shown).toMatchObject(expected);
      expect(handle.peek().status).toBe("safe-replaced");
      await expect(
        handle.exit(shown, { checkedWallet: true }, fixture.client),
      ).resolves.toMatchObject({ released: true });
      hold.dispose();
      vi.useRealTimers();
    }
  });

  it("never saves an execution returned at once that ran another call", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(1_000_000);
    const browser = origin();
    const { hold, queue } = safeSetup(browser);
    queue.options.fetch.mockImplementation(
      async () => new Response("not found", { status: 404 }),
    );
    const fixture = fakeChain();
    const handle = hold.open(safeCall());
    await handle.send(fixture.client, async (gate) => {
      await gate.beforeSend();
      gate.afterSubmit(EXECUTION);
    });
    // Sticky: the hash is a Safe execution, but of a different call.
    const otherCall = { to: TARGET, data: "0xdeadbeef" as Hex, value: 0n };
    fixture.chain.txs.push({
      hash: EXECUTION,
      from: ACCOUNT,
      nonce: 7,
      to: SAFE,
      input: execInput(otherCall),
      value: 0n,
      block: 95n,
      logs: [event(`0x${"5c".repeat(32)}` as Hex, SUCCESS)],
    });
    fixture.chain.head = 120n;
    fixture.chain.finalized = 110n;
    const first = await handle.state(fixture.client);
    expect(first).toMatchObject({ status: "pending-known-hash", exit: false });
    expect((first as WriteHeldState).record.executed).toBeUndefined();
    // 65 minutes later, after a remount: the warned exit, nothing marked executed.
    vi.setSystemTime(1_000_000 + 65 * 60_000);
    const remounted = safeSetup(browser);
    remounted.queue.options.fetch.mockImplementation(
      async () => new Response("not found", { status: 404 }),
    );
    const again = remounted.hold.open(safeCall());
    const shown = await again.state(fixture.client);
    expect(shown).toMatchObject({
      status: "held-unchecked",
      exit: true,
      warning: WRITE_HOLD_HASHED_EXIT_LINE,
    });
    expect((shown as WriteHeldState).record.executed).toBeUndefined();
    // The app's follower can still end it as unproven, with the exit.
    const unproven = await again.onUnproven(fixture.client);
    expect(unproven).toMatchObject({ status: "safe-unproven", exit: true });
    await expect(
      again.exit(unproven, { checkedWallet: true }, fixture.client),
    ).resolves.toMatchObject({ released: true });
    hold.dispose();
    remounted.hold.dispose();
    vi.useRealTimers();
  });

  it("settles an execution returned at once whose outer transaction reverted as failed, once final", async () => {
    vi.useFakeTimers();
    const { hold } = safeSetup();
    const fixture = fakeChain();
    const handle = hold.open(safeCall());
    await handle.send(fixture.client, async (gate) => {
      await gate.beforeSend();
      gate.afterSubmit(EXECUTION);
    });
    // Nothing ran on the Safe: the outer transaction reverted, with no logs.
    fixture.chain.txs.push({
      hash: EXECUTION,
      from: ACCOUNT,
      nonce: 0,
      to: SAFE,
      input: execInput(),
      value: 0n,
      block: 95n,
      status: "reverted",
    });
    fixture.chain.head = 120n;
    fixture.chain.finalized = 94n;
    const held = await handle.state(fixture.client);
    expect(held).toMatchObject({
      status: "ran-executed",
      executionHash: EXECUTION,
      exit: false,
    });
    // The node loses its receipt for a while: still held.
    fixture.chain.hidden.add(EXECUTION.toLowerCase());
    await expect(handle.state(fixture.client)).resolves.toMatchObject({
      status: "ran-executed",
      exit: false,
    });
    fixture.chain.hidden.clear();
    await expect(
      handle.exit(
        { ...held, exit: true } as WriteHoldState,
        { checkedWallet: true },
        fixture.client,
      ),
    ).resolves.toMatchObject({ released: false });
    const seen: WriteHoldState[] = [];
    handle.subscribe((state) => seen.push(state));
    fixture.chain.finalized = 96n;
    await vi.advanceTimersByTimeAsync(1_000);
    expect(seen[seen.length - 1]).toEqual({
      status: "clear",
      reservation: expect.any(String),
      settled: { result: "failed", hash: EXECUTION },
    });
    // A retry is allowed.
    const retry = vi.fn();
    await handle.send(fixture.client, async (gate) => {
      await gate.beforeSend();
      retry();
    });
    expect(retry).toHaveBeenCalledOnce();
    hold.dispose();
  });

  it("holds an execution returned at once that failed until the failure is final", async () => {
    vi.useFakeTimers();
    const { hold } = safeSetup();
    const fixture = fakeChain();
    const handle = hold.open(safeCall());
    await handle.send(fixture.client, async (gate) => {
      await gate.beforeSend();
      gate.afterSubmit(EXECUTION);
    });
    executes(fixture, OTHER, FAILURE);
    fixture.chain.finalized = 94n;
    const held = await handle.state(fixture.client);
    expect(held).toMatchObject({
      status: "ran-executed",
      executionHash: EXECUTION,
      exit: false,
    });
    await expect(
      handle.exit(
        { ...held, exit: true } as WriteHoldState,
        { checkedWallet: true },
        fixture.client,
      ),
    ).resolves.toMatchObject({ released: false });
    const seen: WriteHoldState[] = [];
    handle.subscribe((state) => seen.push(state));
    fixture.chain.finalized = 96n;
    await vi.advanceTimersByTimeAsync(1_000);
    expect(seen[seen.length - 1]).toEqual({
      status: "clear",
      reservation: expect.any(String),
      settled: { result: "failed", hash: EXECUTION },
    });
    hold.dispose();
  });

  it("saves the proposal's authenticated nonce, then settles from the canonical log while Safe's service is down", async () => {
    const { hold, queue } = safeSetup();
    const fixture = fakeChain();
    const handle = hold.open(safeCall());
    await handle.send(fixture.client, async (gate) => {
      await gate.beforeSend();
      gate.afterSubmit(queue.hash);
    });
    await expect(handle.state(fixture.client)).resolves.toMatchObject({
      status: "pending-known-hash",
      record: { safeNonce: "5" },
    });
    queue.options.fetch.mockImplementation(
      async () => new Response("not found", { status: 404 }),
    );
    // The app learned it ran, with no execution named.
    executes(fixture, queue.hash, SUCCESS);
    await expect(handle.onExecuted(fixture.client)).resolves.toEqual({
      status: "clear",
      reservation: expect.any(String),
      settled: { result: "success", hash: EXECUTION },
    });
  });

  it("takes an authenticated proposal from the reply, and ignores one that isn't it", async () => {
    const { hold, queue } = safeSetup();
    const fixture = fakeChain();
    queue.options.fetch.mockImplementation(
      async () => new Response("not found", { status: 404 }),
    );
    const proposal = safeProposalFor({ ...ordinary.call, value: 17n }, 5);
    const handle = hold.open(safeCall());
    await handle.send(fixture.client, async (gate) => {
      await gate.beforeSend();
      gate.afterSubmit(
        queue.hash,
        safeProposalFor({ ...ordinary.call, value: 17n }, 6),
      );
    });
    expect(handle.peek()).toMatchObject({ record: { hash: queue.hash } });
    expect(
      (handle.peek() as { record: { safeNonce?: string } }).record.safeNonce,
    ).toBeUndefined();
    const second = safeSetup().hold.open(safeCall());
    await second.send(fixture.client, async (gate) => {
      await gate.beforeSend();
      gate.afterSubmit(queue.hash, proposal);
    });
    expect(second.peek()).toMatchObject({ record: { safeNonce: "5" } });
  });

  it("offers the exit, with the honest line, for a proposal Safe's service never authenticates", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(1_000_000);
    const { hold, queue } = safeSetup();
    const fixture = fakeChain();
    queue.options.fetch.mockImplementation(
      async () => new Response("not found", { status: 404 }),
    );
    const handle = hold.open(safeCall());
    await handle.send(fixture.client, async (gate) => {
      await gate.beforeSend();
      gate.afterSubmit(queue.hash);
    });
    await expect(handle.state(fixture.client)).resolves.toMatchObject({
      status: "pending-known-hash",
      exit: false,
    });
    vi.setSystemTime(1_000_000 + 31 * 60_000);
    const unchecked = await handle.state(fixture.client);
    expect(unchecked).toMatchObject({
      status: "held-unchecked",
      hash: queue.hash,
      exit: true,
      line: WRITE_HOLD_UNCHECKED_LINE,
      warning: WRITE_HOLD_HASHED_EXIT_LINE,
    });
    await expect(
      handle.exit(unchecked, { checkedWallet: true }, fixture.client),
    ).resolves.toMatchObject({ released: true });
  });

  it("starts the clock of a Safe proposal saved before it existed", async () => {
    const browser = origin();
    const { hold, queue } = safeSetup(browser);
    const fixture = fakeChain();
    queue.options.fetch.mockImplementation(
      async () => new Response("not found", { status: 404 }),
    );
    const handle = hold.open(safeCall());
    await handle.send(fixture.client, async (gate) => {
      await gate.beforeSend();
      gate.afterSubmit(queue.hash);
    });
    const [key] = browser.values.keys();
    const { submittedAt: _, ...legacy } = JSON.parse(browser.values.get(key)!);
    browser.values.set(key, JSON.stringify(legacy));
    await expect(handle.state(fixture.client)).resolves.toMatchObject({
      status: "pending-known-hash",
      record: { firstSeenAt: expect.stringMatching(/^\d+$/) },
    });
  });

  it("rechecks a saved execution whose block was reorganized away", async () => {
    for (const replacement of ["replaced", "failed"] as const) {
      const { hold, queue } = safeSetup();
      const fixture = fakeChain();
      const handle = hold.open(safeCall());
      await handle.send(fixture.client, async (gate) => {
        await gate.beforeSend();
        gate.afterSubmit(queue.hash);
      });
      // A failure seen before it is final is saved as executed.
      executes(fixture, queue.hash, FAILURE);
      fixture.chain.finalized = 90n;
      await expect(
        handle.onReceipt(
          fixture.receiptOf(fixture.chain.txs[0]),
          fixture.client,
        ),
      ).resolves.toMatchObject({
        status: "ran-executed",
        executionHash: EXECUTION,
      });
      // Block 95 is orphaned; the nonce passed at 97 instead.
      fixture.chain.txs.length = 0;
      fixture.chain.hidden.clear();
      fixture.chain.reorged.set(95n, OTHER);
      const second = `0x${"e2".repeat(32)}` as Hex;
      if (replacement === "replaced")
        executes(fixture, OTHER, SUCCESS, { block: 97n, hash: second });
      else executes(fixture, queue.hash, FAILURE, { block: 97n, hash: second });
      // Its own canonical log settles it; another proposal's only offers the exit.
      if (replacement === "replaced")
        await expect(handle.state(fixture.client)).resolves.toMatchObject({
          status: "safe-replaced",
          exit: true,
          line: WRITE_HOLD_SAFE_REPLACED_LINE,
          warning: WRITE_HOLD_HASHED_EXIT_LINE,
        });
      else
        await expect(handle.state(fixture.client)).resolves.toEqual({
          checked: true,
          status: "clear",
          reservation: expect.any(String),
          settled: { result: "failed", hash: second },
        });
      hold.dispose();
    }
  });

  it("never saves a proof from a log outside the canonical block where the nonce passed", async () => {
    const { hold, queue } = safeSetup();
    const fixture = fakeChain();
    const handle = hold.open(safeCall());
    await handle.send(fixture.client, async (gate) => {
      await gate.beforeSend();
      gate.afterSubmit(queue.hash);
    });
    executes(fixture, queue.hash, SUCCESS);
    fixture.chain.safeLogs = [
      { ...(fixture.chain.safeLogs[0] as object), blockHash: OTHER },
    ];
    const state = await handle.state(fixture.client);
    expect(state).toMatchObject({ status: "pending-known-hash" });
    expect(
      (state as { record: { executed?: true } }).record.executed,
    ).toBeUndefined();
  });

  it.each([
    ["another proposal", `0x${"0d".repeat(32)}`],
    // Codex: a module ran the call while another transaction took the nonce.
    ["a module execution of the call", `0x${"0e".repeat(32)}`],
    // Codex: the same call proposed again with a different safeTxGas.
    ["the same call with a different safeTxGas", `0x${"0f".repeat(32)}`],
  ] as const)(
    "never releases a proposal whose nonce %s used: the explicit exit, at once",
    async (_, other) => {
      const { hold, queue } = safeSetup();
      const fixture = fakeChain();
      const handle = hold.open(safeCall());
      await handle.send(fixture.client, async (gate) => {
        await gate.beforeSend();
        gate.afterSubmit(queue.hash);
      });
      executes(fixture, other as Hex, SUCCESS);
      const replaced = await handle.state(fixture.client);
      expect(replaced).toMatchObject({
        status: "safe-replaced",
        exit: true,
        line: WRITE_HOLD_SAFE_REPLACED_LINE,
        warning: WRITE_HOLD_HASHED_EXIT_LINE,
      });
      await expect(
        handle.send(fixture.client, async () => {}),
      ).rejects.toBeInstanceOf(WriteHeldError);
      await expect(
        handle.exit(replaced, { checkedWallet: true }, fixture.client),
      ).resolves.toMatchObject({ released: true });
    },
  );

  describe("whose follower ends without proof", () => {
    it("lets the service listing this proposal unexecuted again override its unproven end", async () => {
      const { hold, queue } = safeSetup();
      const fixture = fakeChain();
      const handle = hold.open(safeCall());
      await handle.send(fixture.client, async (gate) => {
        await gate.beforeSend();
        gate.afterSubmit(queue.hash);
      });
      // The service lost it: unproven, with its exit.
      queue.options.fetch.mockResolvedValue(new Response("", { status: 404 }));
      const view = createHeldWriteView(handle, {
        client: fixture.client,
        follow: false,
      });
      const stop = view.start();
      await handle.onUnproven(fixture.client, queue.hash);
      await view.check();
      expect(view.get()).toMatchObject({ phase: "held", exit: true });
      // It lists this exact proposal unexecuted again: truly pending.
      queue.options.fetch.mockImplementation(
        async () => new Response(JSON.stringify(queue.answer.current)),
      );
      const now = Date.now();
      vi.spyOn(Date, "now").mockReturnValue(now + 60 * 60_000);
      await view.check();
      expect(view.get()).toMatchObject({
        exit: false,
        state: { checked: true },
      });
      expect((handle.peek() as WriteHeldState).record).toMatchObject({
        pendingSeenAt: String(now + 60 * 60_000),
      });
      expect((handle.peek() as WriteHeldState).record.unproven).toBeUndefined();
      stop();
    });

    const unprovenState = {
      status: "safe-unproven",
      exit: true,
      line: WRITE_HOLD_SAFE_UNPROVEN_LINE,
      warning: WRITE_HOLD_HASHED_EXIT_LINE,
    };
    async function proposed(browser = origin()) {
      const setup = safeSetup(browser);
      const fixture = fakeChain();
      const handle = setup.hold.open(safeCall());
      await handle.send(fixture.client, async (gate) => {
        await gate.beforeSend();
        gate.afterSubmit(setup.queue.hash);
      });
      return { ...setup, fixture, handle };
    }
    /** Safe's service answers it has no such proposal. */
    const lost = (queue: ReturnType<typeof service>) =>
      queue.options.fetch.mockImplementation(
        async () => new Response("", { status: 404 }),
      );

    it("keeps a reported execution's unseen window through failing reads, then offers the exit", async () => {
      const { handle, fixture, queue } = await proposed();
      // The service has lost it: its follower ends unproven.
      lost(queue);
      const candidate = `0x${"c4".repeat(32)}` as Hex;
      await handle.onExecuted(fixture.client, candidate);
      // Every read of that hash fails before the chain ever showed it.
      const read = fixture.client.getTransaction.getMockImplementation()!;
      fixture.client.getTransaction.mockImplementation(async (args) => {
        if (args.hash.toLowerCase() === candidate)
          throw new Error("request timed out");
        return read(args);
      });
      const unproven = await handle.onUnproven(fixture.client);
      expect(unproven).toMatchObject({
        status: "pending-known-hash",
        hash: candidate,
        exit: false,
        line: writeHeldMessage(),
      });
      const now = Date.now();
      vi.spyOn(Date, "now").mockReturnValue(now + 29 * 60_000);
      const early = await handle.state(fixture.client);
      expect(early).toMatchObject({ exit: false });
      // The exit is refused inside the window, even from an older snapshot.
      await expect(
        handle.exit(unproven, { checkedWallet: true }, fixture.client),
      ).resolves.toMatchObject({ released: false });
      vi.spyOn(Date, "now").mockReturnValue(now + 31 * 60_000);
      const late = await handle.state(fixture.client);
      expect(late).toMatchObject(unprovenState);
      await expect(
        handle.exit(late, { checkedWallet: true }, fixture.client),
      ).resolves.toMatchObject({ released: true });
    });

    it("refuses the exit while the returned hash is a known pending transaction, then settles it", async () => {
      const { hold } = safeSetup();
      const fixture = fakeChain();
      const handle = hold.open(safeCall());
      // The wallet returned an execution hash at once.
      await handle.send(fixture.client, async (gate) => {
        await gate.beforeSend();
        gate.afterSubmit(EXECUTION);
      });
      const unproven = await handle.onUnproven(fixture.client);
      expect(unproven).toMatchObject(unprovenState);
      // Codex: that hash then shows up pending in the mempool.
      fixture.chain.txs.push({
        hash: EXECUTION,
        from: ACCOUNT,
        nonce: 7,
        to: SAFE,
        input: execInput(),
        value: 0n,
        logs: [event(`0x${"5d".repeat(32)}` as Hex, SUCCESS)],
      });
      await expect(handle.state(fixture.client)).resolves.toMatchObject({
        status: "pending-known-hash",
        hash: EXECUTION,
        exit: false,
        line: WRITE_HOLD_PENDING_LINE,
      });
      await expect(
        handle.exit(unproven, { checkedWallet: true }, fixture.client),
      ).resolves.toMatchObject({
        released: false,
        state: { status: "pending-known-hash", exit: false },
      });
      await expect(
        handle.send(fixture.client, async () => {}),
      ).rejects.toBeInstanceOf(WriteHeldError);
      // It mines and verifies: settled.
      fixture.chain.txs[0].block = 95n;
      fixture.chain.head = 120n;
      fixture.chain.finalized = 110n;
      await expect(handle.state(fixture.client)).resolves.toEqual({
        checked: true,
        status: "clear",
        reservation: expect.any(String),
        settled: { result: "success", hash: EXECUTION },
      });
    });

    it("offers no exit, even replaced, while a candidate hash is pending", async () => {
      const { handle, fixture, queue } = await proposed();
      const CAND = `0x${"c1".repeat(32)}` as Hex;
      fixture.chain.txs.push({
        hash: CAND,
        from: RELAYER,
        nonce: 0,
        to: SAFE,
        input: execInput(),
        value: 0n,
      });
      await handle.onExecuted(fixture.client, CAND);
      // Codex: another Safe transaction used the nonce.
      executes(fixture, OTHER, SUCCESS);
      const shown = await handle.state(fixture.client);
      expect(shown).toMatchObject({
        status: "pending-known-hash",
        hash: CAND,
        exit: false,
      });
      // Even an exit from the replaced snapshot rechecks it first.
      await expect(
        handle.exit(
          { ...shown, status: "safe-replaced", exit: true } as WriteHoldState,
          { checkedWallet: true },
          fixture.client,
        ),
      ).resolves.toMatchObject({ released: false });
      // Once the candidate is gone, the replaced exit returns.
      fixture.chain.hidden.add(CAND);
      await expect(handle.state(fixture.client)).resolves.toMatchObject({
        status: "safe-replaced",
        exit: true,
      });
      void queue;
    });

    it("settles from a real execution reported after many unresolved candidates", async () => {
      const { handle, fixture, queue } = await proposed();
      for (let i = 1; i <= 70; i += 1)
        await handle.onExecuted(
          fixture.client,
          `0x${i.toString(16).padStart(64, "0")}` as Hex,
        );
      // Unresolved candidates are never dropped: no cap.
      expect((handle.peek() as WriteHeldState).record.candidates).toHaveLength(
        70,
      );
      // Codex: the proposal's nonce is saved, but history logs can't be read.
      await handle.state(fixture.client);
      executes(fixture, queue.hash, SUCCESS);
      fixture.chain.safeLogs = {} as never;
      await expect(
        handle.onExecuted(fixture.client, EXECUTION),
      ).resolves.toEqual({
        status: "clear",
        reservation: expect.any(String),
        settled: { result: "success", hash: EXECUTION },
      });
    });

    it("keeps a candidate whose verification can't be read, and settles once it can", async () => {
      for (const reported of ["before", "after"] as const) {
        const { handle, fixture, queue } = await proposed();
        const CAND = `0x${"c4".repeat(32)}` as Hex;
        fixture.chain.txs.push({
          hash: CAND,
          from: RELAYER,
          nonce: 0,
          to: SAFE,
          input: execInput(),
          value: 0n,
          ...(reported === "after"
            ? { block: 95n, logs: [event(queue.hash, SUCCESS)] }
            : {}),
        });
        fixture.chain.head = 120n;
        fixture.chain.finalized = 110n;
        if (reported === "before")
          await handle.onExecuted(fixture.client, CAND);
        fixture.chain.txs[0].block = 95n;
        fixture.chain.txs[0].logs = [event(queue.hash, SUCCESS)];
        // Codex: its receipt is there, but the transaction read fails.
        const lookup = fixture.client.getTransaction.getMockImplementation()!;
        fixture.client.getTransaction.mockImplementation(async (args) => {
          if (args.hash === CAND) throw new Error("timeout");
          return lookup(args);
        });
        if (reported === "after") await handle.onExecuted(fixture.client, CAND);
        else await handle.state(fixture.client);
        expect((handle.peek() as WriteHeldState).record.candidates).toEqual([
          CAND,
        ]);
        fixture.client.getTransaction.mockImplementation(lookup);
        await expect(handle.state(fixture.client)).resolves.toEqual({
          checked: true,
          status: "clear",
          reservation: expect.any(String),
          settled: { result: "success", hash: CAND },
        });
      }
    });

    it("holds a mined candidate whose receipt can't be read for 30 minutes, then offers the exit", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(1_000_000);
      const { handle, fixture, queue } = await proposed();
      // The service has lost it: its follower ends unproven.
      lost(queue);
      const CAND = `0x${"c5".repeat(32)}` as Hex;
      fixture.chain.txs.push({
        hash: CAND,
        from: RELAYER,
        nonce: 0,
        to: SAFE,
        input: execInput(),
        value: 0n,
        block: 95n,
      });
      fixture.chain.head = 120n;
      fixture.chain.finalized = 110n;
      const receipts =
        fixture.client.getTransactionReceipt.getMockImplementation()!;
      fixture.client.getTransactionReceipt.mockImplementation(async (args) => {
        if (args.hash === CAND) throw new Error("timeout");
        return receipts(args);
      });
      await handle.onExecuted(fixture.client, CAND);
      // Codex: mined, it may have run; its history can't be read either.
      const held = await handle.onUnproven(fixture.client, queue.hash);
      expect(held).toMatchObject({
        status: "pending-known-hash",
        hash: CAND,
        exit: false,
        line: WRITE_HOLD_MINED_LINE,
      });
      await expect(
        handle.exit(
          { ...held, status: "safe-unproven", exit: true } as WriteHoldState,
          { checkedWallet: true },
          fixture.client,
        ),
      ).resolves.toMatchObject({ released: false });
      // The clock holds through read failures.
      vi.setSystemTime(1_000_000 + 31 * 60_000);
      const lookup = fixture.client.getTransaction.getMockImplementation()!;
      fixture.client.getTransaction.mockImplementation(async (args) => {
        if (args.hash === CAND) throw new Error("timeout");
        return lookup(args);
      });
      const shown = await handle.state(fixture.client);
      expect(shown).toMatchObject({ status: "safe-unproven", exit: true });
      await expect(
        handle.exit(shown, { checkedWallet: true }, fixture.client),
      ).resolves.toMatchObject({ released: true });
      vi.useRealTimers();
    });

    it("settles from the finalized log when a readable receipt can't be verified", async () => {
      const { handle, fixture, queue } = await proposed();
      executes(fixture, queue.hash, SUCCESS);
      // Codex: the execution's transaction lookup times out.
      const lookup = fixture.client.getTransaction.getMockImplementation()!;
      fixture.client.getTransaction.mockImplementation(async (args) => {
        if (args.hash === EXECUTION) throw new Error("timeout");
        return lookup(args);
      });
      await expect(handle.state(fixture.client)).resolves.toEqual({
        checked: true,
        status: "clear",
        reservation: expect.any(String),
        settled: { result: "success", hash: EXECUTION },
      });
    });

    it("settles a canonical execution from its Safe log when its receipt can't be read", async () => {
      for (const topic of [SUCCESS, FAILURE]) {
        const { handle, fixture, queue } = await proposed();
        executes(fixture, queue.hash, topic);
        // Codex: the execution is known, but its receipt stays unreadable.
        fixture.chain.hidden.add(EXECUTION.toLowerCase());
        await expect(handle.state(fixture.client)).resolves.toEqual({
          checked: true,
          status: "clear",
          reservation: expect.any(String),
          settled: {
            result: topic === SUCCESS ? "success" : "failed",
            hash: EXECUTION,
          },
        });
      }
    });

    it("drops a candidate only on canonical proof it isn't this proposal's execution", async () => {
      const { handle, fixture, queue } = await proposed();
      const hashes = [1, 2, 3].map(
        (i) => `0x${i.toString(16).repeat(64)}` as Hex,
      );
      const [, offChain, layout14] = hashes;
      for (const hash of hashes)
        fixture.chain.txs.push({
          hash,
          from: RELAYER,
          nonce: 0,
          to: SAFE,
          input: execInput(),
          value: 0n,
        });
      for (const hash of hashes) await handle.onExecuted(fixture.client, hash);
      Object.assign(fixture.chain.txs[0], { block: 95n, status: "reverted" });
      Object.assign(fixture.chain.txs[1], { block: 96n, logs: [] });
      // The Safe 1.4 layout: the safeTxHash indexed.
      Object.assign(fixture.chain.txs[2], {
        block: 97n,
        logs: [
          {
            address: SAFE,
            topics: [SUCCESS, queue.hash],
            data: pad(0n),
          },
        ],
      });
      fixture.chain.head = 120n;
      fixture.chain.finalized = 110n;
      const receipts =
        fixture.client.getTransactionReceipt.getMockImplementation()!;
      fixture.client.getTransactionReceipt.mockImplementation(async (args) => {
        const receipt = await receipts(args);
        return args.hash === offChain
          ? { ...receipt, blockHash: OTHER }
          : receipt;
      });
      const lookup = fixture.client.getTransaction.getMockImplementation()!;
      fixture.client.getTransaction.mockImplementation(async (args) => {
        if (args.hash === layout14) throw new Error("timeout");
        return lookup(args);
      });
      await handle.state(fixture.client);
      // The reverted one is disproven; the off-chain receipt and the unread
      // execution prove nothing either way.
      expect((handle.peek() as WriteHeldState).record.candidates).toEqual([
        offChain,
        layout14,
      ]);
    });

    it("settles from a candidate once it mines as this proposal's execution", async () => {
      const { handle, fixture, queue } = await proposed();
      const CAND = `0x${"c3".repeat(32)}` as Hex;
      fixture.chain.txs.push({
        hash: CAND,
        from: RELAYER,
        nonce: 0,
        to: SAFE,
        input: execInput(),
        value: 0n,
      });
      await handle.onExecuted(fixture.client, CAND);
      fixture.chain.txs[0].block = 95n;
      fixture.chain.txs[0].logs = [event(queue.hash, SUCCESS)];
      fixture.chain.head = 120n;
      fixture.chain.finalized = 110n;
      await expect(handle.state(fixture.client)).resolves.toEqual({
        checked: true,
        status: "clear",
        reservation: expect.any(String),
        settled: { result: "success", hash: CAND },
      });
    });

    it("prunes a candidate once it mined as something else", async () => {
      const { handle, fixture } = await proposed();
      const CAND = `0x${"c2".repeat(32)}` as Hex;
      fixture.chain.txs.push({
        hash: CAND,
        from: RELAYER,
        nonce: 0,
        to: SAFE,
        input: execInput({ to: TARGET, data: "0xdeadbeef" as Hex, value: 0n }),
        value: 0n,
      });
      await handle.onExecuted(fixture.client, CAND);
      expect((handle.peek() as WriteHeldState).record.candidates).toEqual([
        CAND,
      ]);
      fixture.chain.txs[0].block = 95n;
      fixture.chain.txs[0].logs = [
        event(`0x${"5f".repeat(32)}` as Hex, SUCCESS),
      ];
      fixture.chain.head = 120n;
      fixture.chain.finalized = 110n;
      await handle.state(fixture.client);
      expect((handle.peek() as WriteHeldState).record.candidates ?? []).toEqual(
        [],
      );
      // A mined candidate reported later is never stored.
      await handle.onExecuted(fixture.client, CAND);
      expect((handle.peek() as WriteHeldState).record.candidates ?? []).toEqual(
        [],
      );
    });

    it("keeps an unauthenticated execution hash as a candidate only, so the exit stays reachable", async () => {
      const browser = origin();
      const { handle, fixture, queue } = await proposed(browser);
      // The service has lost it: its follower ends unproven.
      lost(queue);
      // Codex: the hash ran different calldata.
      fixture.chain.txs.push({
        hash: EXECUTION,
        from: ACCOUNT,
        nonce: 7,
        to: SAFE,
        input: execInput({ to: TARGET, data: "0xdeadbeef" as Hex, value: 0n }),
        value: 0n,
        block: 95n,
        logs: [event(`0x${"5e".repeat(32)}` as Hex, SUCCESS)],
      });
      fixture.chain.head = 120n;
      fixture.chain.finalized = 110n;
      // A hash the node doesn't know yet stays a candidate too.
      await handle.onExecuted(fixture.client, OTHER);
      const reported = await handle.onExecuted(fixture.client, EXECUTION);
      expect(reported).toMatchObject({
        status: "pending-known-hash",
        hash: queue.hash,
        // A mined hash is checked on arrival: this one proved to be another call.
        record: { candidates: [OTHER] },
      });
      expect((reported as WriteHeldState).record.executed).toBeUndefined();
      const unproven = await handle.onUnproven(fixture.client, queue.hash);
      expect(unproven).toMatchObject(unprovenState);
      // After a reload too.
      const reloadedSetup = safeSetup(browser);
      lost(reloadedSetup.queue);
      const reloaded = reloadedSetup.hold.open(safeCall());
      expect(reloaded.peek()).toMatchObject({ ...unprovenState, exit: false });
      const shown = await reloaded.state(fixture.client);
      expect(shown).toMatchObject(unprovenState);
      await expect(
        reloaded.exit(shown, { checkedWallet: true }, fixture.client),
      ).resolves.toMatchObject({ released: true });
    });

    describe("every method with a client goes through the one gate", () => {
      /** Replaced, while a candidate is still pending: state() offers no exit. */
      async function replacedWithPendingCandidate() {
        const ctx = await proposed();
        const CAND = `0x${"c6".repeat(32)}` as Hex;
        ctx.fixture.chain.txs.push({
          hash: CAND,
          from: RELAYER,
          nonce: 0,
          to: SAFE,
          input: execInput(),
          value: 0n,
        });
        await ctx.handle.onExecuted(ctx.fixture.client, CAND);
        executes(ctx.fixture, OTHER, SUCCESS);
        // A stored replacement, as if seen before the candidate.
        const raw = createBrowserWriteRecovery(safeCall(), {
          storage: ctx.storage,
          locks: {
            request: (
              _n: string,
              _o: LockOptions,
              work: (l: Lock) => unknown,
            ) => work({} as Lock),
          } as never,
        });
        await raw.withLock(async () => raw.replacedOnChain(raw.read()!));
        return { ...ctx, CAND };
      }
      const unrelated = (
        ctx: Awaited<ReturnType<typeof replacedWithPendingCandidate>>,
      ) =>
        ctx.fixture.receiptOf({
          ...sent(`0x${"77".repeat(32)}` as Hex),
          block: 95n,
        });

      it("exit releases only what the gate offers", async () => {
        for (const candidate of ["pending", "gone"] as const) {
          const ctx = await replacedWithPendingCandidate();
          if (candidate === "gone") ctx.fixture.chain.hidden.add(ctx.CAND);
          const shown = await ctx.handle.state(ctx.fixture.client);
          const ended = await ctx.handle.exit(
            { ...shown, exit: true } as WriteHoldState,
            { checkedWallet: true },
            ctx.fixture.client,
          );
          expect(ended.released).toBe(candidate === "gone");
          if (!ended.released)
            expect(ended.state).toMatchObject({ exit: false });
        }
      });

      it("Codex: an unrelated receipt never reports a replaced hold's exit while a candidate is pending", async () => {
        const ctx = await replacedWithPendingCandidate();
        const viaReceipt = await ctx.handle.onReceipt(
          unrelated(ctx),
          ctx.fixture.client,
        );
        expect(viaReceipt).toMatchObject({
          status: "pending-known-hash",
          exit: false,
        });
        await expect(
          ctx.handle.state(ctx.fixture.client),
        ).resolves.toMatchObject({
          exit: false,
        });
      });

      it.each([
        [
          "onReceipt",
          (ctx: Awaited<ReturnType<typeof replacedWithPendingCandidate>>) =>
            ctx.handle.onReceipt(unrelated(ctx), ctx.fixture.client),
        ],
        [
          "onUnproven",
          (ctx: Awaited<ReturnType<typeof replacedWithPendingCandidate>>) =>
            ctx.handle.onUnproven(ctx.fixture.client),
        ],
        [
          "onExecuted",
          (ctx: Awaited<ReturnType<typeof replacedWithPendingCandidate>>) =>
            ctx.handle.onExecuted(ctx.fixture.client),
        ],
        [
          "attachHash",
          (ctx: Awaited<ReturnType<typeof replacedWithPendingCandidate>>) =>
            ctx.handle.attachHash(ctx.fixture.client, HASH),
        ],
        [
          "send",
          async (
            ctx: Awaited<ReturnType<typeof replacedWithPendingCandidate>>,
          ) =>
            (
              await ctx.handle
                .send(ctx.fixture.client, async () => {})
                .catch((e) => e)
            ).state as WriteHoldState,
        ],
      ] as const)(
        "%s offers an exit only when state() would, with the candidate pending and then gone",
        async (_, call) => {
          for (const candidate of ["pending", "gone"] as const) {
            const ctx = await replacedWithPendingCandidate();
            if (candidate === "gone") ctx.fixture.chain.hidden.add(ctx.CAND);
            const gated = await ctx.handle.state(ctx.fixture.client);
            const got = await call(ctx);
            const exitOf = (state: WriteHoldState) =>
              state.status !== "clear" && state.exit;
            expect(exitOf(got)).toBe(exitOf(gated));
            expect(exitOf(gated)).toBe(candidate === "gone");
          }
        },
      );
    });

    it("offers the unproven exit through state(), never through peek()", async () => {
      const { handle, fixture, queue } = await proposed();
      // The service has lost it: its follower ends unproven.
      lost(queue);
      await handle.onUnproven(fixture.client, queue.hash);
      expect(handle.peek()).toMatchObject({
        status: "safe-unproven",
        exit: false,
        line: WRITE_HOLD_SAFE_UNPROVEN_LINE,
      });
      await expect(handle.state(fixture.client)).resolves.toMatchObject({
        status: "safe-unproven",
        exit: true,
      });
    });

    it("offers the exit at once, durably through a reload", async () => {
      const browser = origin();
      const { handle, fixture, queue } = await proposed(browser);
      // The service has lost it: its follower ends unproven.
      lost(queue);
      const ended = await handle.onUnproven(fixture.client, queue.hash);
      expect(ended).toMatchObject({
        ...unprovenState,
        hash: queue.hash,
        record: { unproven: true },
      });
      // A reload: a new controller and tab memory, the same browser.
      const reloadedSetup = safeSetup(browser);
      lost(reloadedSetup.queue);
      const reloaded = reloadedSetup.hold.open(safeCall());
      expect(reloaded.peek()).toMatchObject({ ...unprovenState, exit: false });
      const shown = await reloaded.state(fixture.client);
      expect(shown).toMatchObject(unprovenState);
      await expect(
        reloaded.send(fixture.client, async () => {}),
      ).rejects.toBeInstanceOf(WriteHeldError);
      // A stale snapshot is refused; the one shown releases.
      await expect(
        reloaded.exit(
          {
            ...shown,
            record: { ...(shown as WriteHeldState).record, id: "other" },
          } as WriteHoldState,
          { checkedWallet: true },
          fixture.client,
        ),
      ).resolves.toMatchObject({ released: false });
      await expect(
        reloaded.exit(shown, { checkedWallet: true }, fixture.client),
      ).resolves.toEqual({
        released: true,
        state: {
          checked: true,
          status: "clear",
          reservation: expect.any(String),
        },
      });
      const again = vi.fn();
      await reloaded.send(fixture.client, async (gate) => {
        await gate.beforeSend();
        again();
      });
      expect(again).toHaveBeenCalledOnce();
    });

    it("lets authenticated evidence that arrives later settle it", async () => {
      for (const topic of [SUCCESS, FAILURE]) {
        const { handle, fixture, queue } = await proposed();
        await handle.onUnproven(fixture.client);
        executes(fixture, queue.hash, topic);
        await expect(handle.state(fixture.client)).resolves.toEqual({
          checked: true,
          status: "clear",
          reservation: expect.any(String),
          settled: {
            result: topic === SUCCESS ? "success" : "failed",
            hash: EXECUTION,
          },
        });
      }
      // Evidence already in hand when the follower gives up wins at once.
      const { handle, fixture, queue } = await proposed();
      executes(fixture, queue.hash, SUCCESS);
      await expect(handle.onUnproven(fixture.client)).resolves.toEqual({
        status: "clear",
        reservation: expect.any(String),
        settled: { result: "success", hash: EXECUTION },
      });
    });

    it("saves an authenticated execution before it is final, so an earlier unproven snapshot can't exit", async () => {
      const { handle, fixture, queue, hold } = await proposed();
      // The service has lost it: its follower ends unproven.
      lost(queue);
      const unproven = await handle.onUnproven(fixture.client, queue.hash);
      expect(unproven.status).toBe("safe-unproven");
      // Codex: the execution lands at block 95 while the finalized block is 90.
      executes(fixture, queue.hash, FAILURE);
      fixture.chain.finalized = 90n;
      const receipt = fixture.receiptOf(fixture.chain.txs[0]);
      await expect(
        handle.onReceipt(receipt, fixture.client),
      ).resolves.toMatchObject({
        status: "ran-executed",
        executionHash: EXECUTION,
        exit: false,
        record: { executed: true, executionHash: EXECUTION },
      });
      await expect(
        handle.exit(unproven, { checkedWallet: true }, fixture.client),
      ).resolves.toMatchObject({
        released: false,
        state: { status: "ran-executed" },
      });
      await expect(
        handle.send(fixture.client, async () => {}),
      ).rejects.toBeInstanceOf(WriteHeldError);
      // At finality it settles as failed.
      fixture.chain.finalized = 110n;
      await expect(handle.state(fixture.client)).resolves.toEqual({
        checked: true,
        status: "clear",
        reservation: expect.any(String),
        settled: { result: "failed", hash: EXECUTION },
      });
      hold.dispose();
    });

    it("keeps a proven execution or replacement as it is", async () => {
      const ran = await proposed();
      executes(ran.fixture, ran.queue.hash, SUCCESS, { named: false });
      ran.fixture.chain.hidden.add(EXECUTION.toLowerCase());
      await ran.handle.state(ran.fixture.client);
      await expect(
        ran.handle.onUnproven(ran.fixture.client),
      ).resolves.toMatchObject({ status: "ran-executed", exit: false });
      ran.hold.dispose();
      const replaced = await proposed();
      executes(replaced.fixture, OTHER, SUCCESS);
      await replaced.handle.state(replaced.fixture.client);
      await expect(
        replaced.handle.onUnproven(replaced.fixture.client),
      ).resolves.toMatchObject({ status: "safe-replaced" });
    });

    it("ignores another proposal, an ordinary write, nothing held and a busy lock", async () => {
      const { handle, fixture, queue } = await proposed();
      // The service has lost it: its follower ends unproven.
      lost(queue);
      await expect(
        handle.onUnproven(fixture.client, OTHER),
      ).resolves.toMatchObject({
        status: "pending-known-hash",
        hash: queue.hash,
      });
      // The proposal's hash in any case still names it.
      await expect(
        handle.onUnproven(
          fixture.client,
          queue.hash.toUpperCase().replace("0X", "0x") as Hex,
        ),
      ).resolves.toMatchObject({ status: "safe-unproven" });
      const plain = safeSetup().hold;
      await expect(
        plain.open(safeCall()).onUnproven(fixture.client),
      ).resolves.toEqual({ status: "clear" });
      const ordinaryHold = plain.open(ordinary);
      await ordinaryHold.send(fixture.client, wallet(async () => HASH).send);
      await expect(
        ordinaryHold.onUnproven(fixture.client),
      ).resolves.toMatchObject({ status: "pending-known-hash" });
      const busy = createWriteHold({
        storage: createHeldWriteStorage({
          durable: () => origin().storage,
          memory: new Map(),
        }),
        locks: {
          request: async () => {
            throw new Error("locks unavailable");
          },
        } as never,
      });
      await expect(
        busy.open(safeCall()).onUnproven(fixture.client),
      ).resolves.toEqual({ status: "clear" });
    });
  });

  it("releases a stamped proposal only once its expiry is proven at a finalized block", async () => {
    const router = uniswapV4Deployment(10)!.universalRouter!;
    const deadline = 1_095n;
    const call = {
      to: router,
      data: `0x3593564c${encodeAbiParameters(
        [{ type: "bytes" }, { type: "bytes[]" }, { type: "uint256" }],
        ["0x01", ["0x00"], deadline],
      ).slice(2)}` as Hex,
      value: 0n,
    };
    const queue = service(call);
    const browser = origin();
    const hold = createWriteHold({
      storage: createHeldWriteStorage({
        durable: () => browser.storage,
        memory: new Map(),
      }),
      locks: lockManager(),
      safeService: queue.options,
    });
    const fixture = fakeChain();
    const handle = hold.open(safeCall(call));
    await handle.send(fixture.client, async (gate) => {
      await gate.beforeSend();
      gate.afterSubmit(queue.hash);
    });
    // The latest block is past its deadline; the finalized block isn't yet.
    await expect(handle.state(fixture.client)).resolves.toMatchObject({
      status: "pending-known-hash",
    });
    fixture.chain.finalized = 96n;
    await expect(handle.state(fixture.client)).resolves.toEqual({
      checked: true,
      status: "clear",
      reservation: expect.any(String),
      settled: { result: "expired" },
    });
  });

  it("settles an execution the wallet returned at once, and offers the exit without a reply", async () => {
    const { hold } = safeSetup();
    const fixture = fakeChain();
    const handle = hold.open(safeCall());
    await expect(
      handle.send(fixture.client, async (gate) => {
        await gate.beforeSend();
        throw new Error("reply lost");
      }),
    ).rejects.toThrow();
    await expect(handle.state(fixture.client)).resolves.toMatchObject({
      status: "held-no-hash",
      exit: true,
    });
    const shown = await handle.state(fixture.client);
    await handle.exit(shown, { checkedWallet: true }, fixture.client);
    await handle.send(fixture.client, async (gate) => {
      await gate.beforeSend();
      gate.afterSubmit(EXECUTION);
    });
    executes(fixture, OTHER, SUCCESS);
    await expect(handle.state(fixture.client)).resolves.toEqual({
      checked: true,
      status: "clear",
      reservation: expect.any(String),
      settled: { result: "success", hash: EXECUTION },
    });
  });
});

describe("a write held under an intent, found by a legacy match", () => {
  const OTHER_ACCOUNT = "0x3333333333333333333333333333333333333333" as Address;
  /** A cash-out whose minimum is quoted again on every retry. */
  const cashOut = (minimum: number, account = ACCOUNT) => ({
    ...ordinary,
    account,
    call: {
      to: TARGET,
      data: `0xaabbccdd${minimum.toString(16).padStart(4, "0")}` as Hex,
      value: 0n,
    },
  });
  const key = writeIntentKey("cash-out", { projectId: 4n });
  const match = (selector: Hex = "0xaabbccdd") => ({
    match: { to: TARGET, selector },
  });

  /** An earlier version's exact-call hold for `saved`, its lost reply held. */
  async function heldBefore(saved = cashOut(1)) {
    const browser = origin();
    const old = setup({ browser });
    const { client } = fakeChain();
    await expect(
      old.hold.open(saved).send(client, lostReply().send),
    ).rejects.toThrow();
    const held = old.hold.open(saved).peek() as WriteHeldState;
    const next = setup({ browser, locks: old.locks });
    return { browser, old, next, client, held };
  }

  it("lets two intents through one target and selector send side by side", async () => {
    const { hold } = setup();
    const { client } = fakeChain();
    const projectA = writeIntentKey("pay", { projectId: 1n });
    const projectB = writeIntentKey("pay", { projectId: 2n });
    // A pays project A (its reply lost: held), mirrored at its exact call.
    const a = hold.open(
      { ...cashOut(1), namespace: projectA },
      { legacy: [match()] },
    );
    await expect(a.send(client, lostReply().send)).rejects.toThrow();
    expect(a.peek().status).not.toBe("clear");
    // B pays project B through the same terminal and selector.
    const b = hold.open(
      { ...cashOut(2), namespace: projectB },
      { legacy: [match()] },
    );
    await expect(b.state(client)).resolves.toMatchObject({ status: "clear" });
    const retry = wallet(async () => HASH);
    await b.send(client, retry.send);
    expect(retry.write).toHaveBeenCalledOnce();
    // And A, still held by its own namespace, isn't blocked by B's mirror.
    const again = hold.open(
      { ...cashOut(1), namespace: projectA },
      { legacy: [match()] },
    );
    const shown = await again.state(client);
    expect(shown).toMatchObject({
      status: "held-no-hash",
      record: { namespace: projectA },
    });
    await expect(
      again.exit(shown, { checkedWallet: true }, client),
    ).resolves.toMatchObject({ released: true });
  });

  it("lets two intents that both matched one old hold send side by side once it ends", async () => {
    const { next, client } = await heldBefore(cashOut(1));
    const projectA = writeIntentKey("pay", { projectId: 1n });
    const projectB = writeIntentKey("pay", { projectId: 2n });
    const a = next.hold.open(
      { ...cashOut(2), namespace: projectA },
      { legacy: [match()] },
    );
    const b = next.hold.open(
      { ...cashOut(3), namespace: projectB },
      { legacy: [match()] },
    );
    // The old hold ends by its explicit exit, through A.
    const shown = await a.state(client);
    await a.exit(shown, { checkedWallet: true }, client);
    // A sends (reply lost: held under A).
    await expect(a.send(client, lostReply().send)).rejects.toThrow();
    // B, which matched the same old hold, isn't held by A's write.
    await expect(b.state(client)).resolves.toMatchObject({ status: "clear" });
    const retry = wallet(async () => HASH);
    await b.send(client, retry.send);
    expect(retry.write).toHaveBeenCalledOnce();
  });

  it("skips another held intent's mirror at a matched key", async () => {
    const { next, client } = await heldBefore(cashOut(1));
    const b = next.hold.open(
      { ...cashOut(3), namespace: writeIntentKey("pay", { projectId: 2n }) },
      { legacy: [match()] },
    );
    const shown = await b.state(client);
    await b.exit(shown, { checkedWallet: true }, client);
    // Intent A names that old call as its own legacy key, as an older
    // version did: it sends, held, and mirrors itself there.
    const a = next.hold.open(
      { ...cashOut(2), namespace: writeIntentKey("pay", { projectId: 1n }) },
      { legacy: [{ call: cashOut(1).call }] },
    );
    await expect(a.send(client, lostReply().send)).rejects.toThrow();
    expect(next.hold.open(cashOut(1)).peek().status).not.toBe("clear");
    await expect(b.state(client)).resolves.toMatchObject({ status: "clear" });
    const retry = wallet(async () => HASH);
    await b.send(client, retry.send);
    expect(retry.write).toHaveBeenCalledOnce();
  });

  it("still holds a real pre-intent exact call through the match, and never its own mirror", async () => {
    const { next, client, held } = await heldBefore(cashOut(1));
    const intentCall = { ...cashOut(2), namespace: key };
    const handle = next.hold.open(intentCall, { legacy: [match()] });
    await expect(handle.state(client)).resolves.toMatchObject({
      reservation: held.record.id,
    });
    // Once released, the intent sends; its own mirror never holds it.
    const shown = await handle.state(client);
    await handle.exit(shown, { checkedWallet: true }, client);
    await handle.send(client, wallet(async () => HASH).send);
    const reopened = next.hold.open(intentCall, { legacy: [match()] });
    await expect(reopened.state(client)).resolves.toMatchObject({
      status: "pending-known-hash",
      record: { namespace: key },
    });
  });

  it("refuses a retry quoted with a new minimum until the old hold's explicit exit", async () => {
    const { next, client, held } = await heldBefore(cashOut(1));
    const handle = next.hold.open(
      { ...cashOut(2), namespace: key },
      { legacy: [match()] },
    );
    const shown = await handle.state(client);
    expect(shown).toMatchObject({
      status: "held-no-hash",
      reservation: held.record.id,
    });
    const retry = wallet(async () => HASH);
    await expect(handle.send(client, retry.send)).rejects.toBeInstanceOf(
      WriteHeldError,
    );
    expect(retry.write).not.toHaveBeenCalled();
    await expect(
      handle.exit(shown, { checkedWallet: true }, client),
    ).resolves.toMatchObject({ released: true });
    await handle.send(client, retry.send);
    expect(retry.write).toHaveBeenCalledOnce();
  });

  it("is not blocked by another selector, another account or chain, or another intent's mirror", async () => {
    const { next, client } = await heldBefore(cashOut(1, OTHER_ACCOUNT));
    // Another account's hold at the same target and selector.
    const mine = wallet(async () => HASH);
    await next.hold
      .open({ ...cashOut(2), namespace: key }, { legacy: [match()] })
      .send(client, mine.send);
    expect(mine.write).toHaveBeenCalledOnce();
    // Its own hold under another selector.
    const other = await heldBefore(cashOut(1));
    const elsewhere = wallet(async () => HASH);
    await other.next.hold
      .open(
        { ...cashOut(2), namespace: key },
        { legacy: [match("0x11223344")] },
      )
      .send(other.client, elsewhere.send);
    expect(elsewhere.write).toHaveBeenCalledOnce();
    // Another chain: the same account, target and selector on chain 1.
    const chain = await heldBefore({ ...cashOut(1), chainId: 1 });
    const there = wallet(async () => HASH);
    await chain.next.hold
      .open({ ...cashOut(2), namespace: key }, { legacy: [match()] })
      .send(chain.client, there.send);
    expect(there.write).toHaveBeenCalledOnce();
    // Another intent's mirror is found by its own namespace, not the match.
    const browser = origin();
    const first = setup({ browser });
    const { client: c } = fakeChain();
    await first.hold
      .open(
        {
          ...cashOut(1),
          namespace: writeIntentKey("cash-out", { projectId: 5n }),
        },
        { legacy: [{ call: cashOut(1).call }] },
      )
      .send(c, wallet(async () => OTHER).send);
    const second = setup({ browser, locks: first.locks });
    const free = wallet(async () => HASH);
    await second.hold
      .open({ ...cashOut(2), namespace: key }, { legacy: [match()] })
      .send(c, free.send);
    expect(free.write).toHaveBeenCalledOnce();
  });

  it("checks again at the final reserve, for a matching hold saved after it opened", async () => {
    const browser = origin();
    const next = setup({ browser });
    const { client } = fakeChain();
    const handle = next.hold.open(
      { ...cashOut(2), namespace: key },
      { legacy: [match()] },
    );
    expect(handle.peek().status).toBe("clear");
    // An older version, in another tab, holds its own exact call.
    const old = setup({ browser, locks: next.locks });
    await expect(
      old.hold.open(cashOut(1)).send(client, lostReply().send),
    ).rejects.toThrow();
    // Found on the next read: state() and exit() reach it.
    const shown = await handle.state(client);
    expect(shown).toMatchObject({ status: "held-no-hash", exit: true });
    const retry = wallet(async () => HASH);
    await expect(handle.send(client, retry.send)).rejects.toBeInstanceOf(
      WriteHeldError,
    );
    expect(retry.write).not.toHaveBeenCalled();
    await expect(
      handle.exit(shown, { checkedWallet: true }, client),
    ).resolves.toMatchObject({ released: true });
    await handle.send(client, retry.send);
    expect(retry.write).toHaveBeenCalledOnce();
  });

  it("refuses a matching hold saved during the review at the final reserve, then reaches it", async () => {
    const browser = origin();
    const next = setup({ browser });
    const old = setup({ browser, locks: next.locks });
    const { client } = fakeChain();
    const handle = next.hold.open(
      { ...cashOut(2), namespace: key },
      { legacy: [match()] },
    );
    const opened = vi.fn();
    const refused = await handle
      .send(client, async (gate) => {
        // While the review is open, an older version holds its own call.
        await expect(
          old.hold.open(cashOut(1)).send(client, lostReply().send),
        ).rejects.toThrow();
        await gate.beforeSend();
        opened();
      })
      .catch((e) => e);
    expect(refused).toBeInstanceOf(WriteHeldError);
    expect(opened).not.toHaveBeenCalled();
    const held = old.hold.open(cashOut(1)).peek() as WriteHeldState;
    const shown = await handle.state(client);
    expect(shown).toMatchObject({
      status: "held-no-hash",
      reservation: held.record.id,
    });
    await expect(
      handle.exit(shown, { checkedWallet: true }, client),
    ).resolves.toMatchObject({ released: true });
  });

  it("mirrors an adopted intent write at every legacy key, so an older version sees it held", async () => {
    const browser = origin();
    const next = setup({ browser });
    const { client } = fakeChain();
    const handle = next.hold.open(
      { ...cashOut(2), namespace: key },
      { legacy: [{ call: cashOut(1).call }] },
    );
    await expect(
      handle.adopt(await handle.state(client), { nonce: 7, fromBlock: 90n }),
    ).resolves.toMatchObject({ status: "held-no-hash" });
    const old = setup({ browser, locks: next.locks });
    const retry = wallet(async () => HASH);
    await expect(
      old.hold.open(cashOut(1)).send(client, retry.send),
    ).rejects.toBeInstanceOf(WriteHeldError);
    expect(retry.write).not.toHaveBeenCalled();
  });

  it("settles an adopted mined hash under an intent, and adopts nothing once another reservation came", async () => {
    const browser = origin();
    const next = setup({ browser });
    const { chain, client } = fakeChain();
    const intentCall = { ...cashOut(2), namespace: key };
    chain.txs.push({
      ...sent(HASH),
      input: intentCall.call.data,
      value: 0n,
      block: 95n,
    });
    const handle = next.hold.open(intentCall, {
      legacy: [{ call: cashOut(1).call }],
    });
    const snapshot = await handle.state(client);
    await expect(
      handle.adopt(snapshot, { hash: HASH }, client),
    ).resolves.toMatchObject({
      status: "clear",
      settled: { result: "success", hash: HASH },
    });
    // The settled reservation is newer than that read: nothing is adopted.
    await expect(
      handle.adopt(snapshot, { nonce: 7, fromBlock: 90n }),
    ).resolves.toMatchObject({ status: "clear", settled: { hash: HASH } });
    // An older version's exact handle is clear again: its mirror went.
    expect(next.hold.open(cashOut(1)).peek().status).toBe("clear");
  });

  it("adopts nothing under an intent when another tab reserves while the hash is checked", async () => {
    const browser = origin();
    const next = setup({ browser });
    const other = setup({ browser, locks: next.locks });
    const { chain, client } = fakeChain();
    const intentCall = { ...cashOut(2), namespace: key };
    chain.txs.push({ ...sent(HASH), input: intentCall.call.data, value: 0n });
    const handle = next.hold.open(intentCall, {
      legacy: [{ call: cashOut(1).call }],
    });
    const snapshot = await handle.state(client);
    const read = client.getTransaction.getMockImplementation()!;
    client.getTransaction.mockImplementationOnce(async (args) => {
      // Another tab sends the intent meanwhile, and its reply is lost.
      await expect(
        other.hold
          .open(intentCall, { legacy: [{ call: cashOut(1).call }] })
          .send(client, lostReply().send),
      ).rejects.toThrow();
      return read(args);
    });
    const shown = await handle.adopt(snapshot, { hash: HASH }, client);
    expect(shown).toMatchObject({ status: "held-no-hash" });
    expect((shown as WriteHeldState).record.hash).toBeUndefined();
  });

  it("still finds a matching hold this tab saw once the browser's storage goes away", async () => {
    const browser = origin();
    let available = true;
    const memory = new Map<string, string>();
    const storage = createHeldWriteStorage({
      durable: () => (available ? browser.storage : undefined),
      memory,
    });
    const tab = setup({ storage });
    const { client } = fakeChain();
    const first = lostReply();
    await expect(
      tab.hold.open(cashOut(1)).send(client, first.send),
    ).rejects.toThrow();
    // The browser's storage stops answering; this tab still holds what it saw.
    available = false;
    const retry = wallet(async () => HASH);
    await expect(
      tab.hold
        .open({ ...cashOut(2), namespace: key }, { legacy: [match()] })
        .send(client, retry.send),
    ).rejects.toBeInstanceOf(WriteHeldError);
    expect(first.write.mock.calls.length + retry.write.mock.calls.length).toBe(
      1,
    );
  });

  it("finds a reused Safe proposal saved under its reviewed call's key, and exits it through the intent", async () => {
    const browser = origin();
    const next = setup({ browser });
    const { client } = fakeChain();
    // An older version reviewed one deadline and reused a proposal with
    // another: its record keeps the actual call under the reviewed key.
    const reviewed = { ...cashOut(1), safe: true };
    const old = createBrowserWriteRecovery(reviewed, {
      storage: next.storage,
      locks: next.locks,
    });
    const saved = await old.withLock(async () => old.reserve(cashOut(3).call));
    expect(saved.call.data).toBe(cashOut(3).call.data.toLowerCase());
    const handle = next.hold.open(
      { ...cashOut(2), safe: true, namespace: key },
      { legacy: [match()] },
    );
    const shown = await handle.state(client);
    expect(shown).toMatchObject({
      status: "held-no-hash",
      exit: true,
      reservation: saved.id,
    });
    const retry = wallet(async () => HASH);
    await expect(
      handle.send(client, async (gate) => {
        await gate.beforeSend();
        retry.write();
      }),
    ).rejects.toBeInstanceOf(WriteHeldError);
    expect(retry.write).not.toHaveBeenCalled();
    await expect(
      handle.exit(shown, { checkedWallet: true }, client),
    ).resolves.toMatchObject({ released: true });
    expect(old.read()).toBeNull();
    await handle.send(client, async (gate) => {
      await gate.beforeSend();
      retry.write();
    });
    expect(retry.write).toHaveBeenCalledOnce();
  });

  it("refuses a malformed match", () => {
    const { hold } = setup();
    for (const bad of [
      { to: "0x12" as Address, selector: "0xaabbccdd" as Hex },
      { to: TARGET, selector: "0xaabb" as Hex },
    ])
      expect(() =>
        hold.open(
          { ...cashOut(2), namespace: key },
          { legacy: [{ match: bad }] },
        ),
      ).toThrow("Invalid write hold match.");
  });
});

describe("resetting write holds between tests", () => {
  it("stops every controller's followers and drops the tab's lock queues and memory", async () => {
    // Earlier tests' controllers are stopped first.
    resetWriteHoldsForTests();
    vi.stubGlobal("addEventListener", vi.fn());
    const removed = vi.fn();
    vi.stubGlobal("removeEventListener", removed);
    const tab = globalThis as Record<symbol, unknown>;
    const memory = new Map([["nana-sdk:reviewed-write:v1:kept", "{}"]]);
    tab[Symbol.for("nana-sdk:held-writes")] = memory;
    const { hold } = setup();
    hold.open(ordinary).subscribe(() => {});
    const queues = tab[Symbol.for("nana-sdk:write-lock-queues")] as Map<
      string,
      unknown
    >;
    queues.set("stuck", Promise.resolve());
    resetWriteHoldsForTests();
    expect(removed).toHaveBeenCalledOnce();
    expect(queues.size).toBe(0);
    // Cleared in place: a controller made before the reset shares it.
    expect(tab[Symbol.for("nana-sdk:held-writes")]).toBe(memory);
    expect(memory.size).toBe(0);
    // A disposed controller is let go: a second reset stops nothing again.
    resetWriteHoldsForTests();
    expect(removed).toHaveBeenCalledOnce();
  });
});

describe("resetting a controller made before the reset", () => {
  it("leaves nothing held in the shared tab memory for a module-scoped controller", async () => {
    resetWriteHoldsForTests();
    // A controller made once, at module scope, on the tab's own memory,
    // with the browser's storage refused.
    const browser = origin();
    browser.state.write = false;
    browser.state.read = false;
    const hold = createWriteHold({
      storage: createHeldWriteStorage({ durable: () => browser.storage }),
      locks: lockManager(),
    });
    const { client } = fakeChain();
    await expect(
      hold.open(ordinary).send(client, lostReply().send),
    ).rejects.toThrow();
    expect(hold.open(ordinary).peek().status).not.toBe("clear");
    resetWriteHoldsForTests();
    expect(hold.open(ordinary).peek().status).toBe("clear");
    const retry = wallet(async () => HASH);
    await hold.open(ordinary).send(client, retry.send);
    expect(retry.write).toHaveBeenCalledOnce();
    resetWriteHoldsForTests();
  });
});

describe("an intent's send that never reaches the wallet", () => {
  const key = writeIntentKey("pay", { projectId: 4n });
  const intentCall = { ...ordinary, namespace: key };

  it("leaves no mirror when it is reset during the review, and the next send works", async () => {
    const { hold } = setup();
    const { client } = fakeChain();
    const handle = hold.open(intentCall);
    const reset = new Error("reset");
    await expect(
      handle.send(client, async (gate) => {
        await gate.beforeSend();
        // The app resets while the review is open: nothing was sent.
        gate.onRejected();
        throw reset;
      }),
    ).rejects.toBe(reset);
    expect(handle.peek().status).toBe("clear");
    expect(hold.open(ordinary).peek().status).toBe("clear");
    const exact = wallet(async () => HASH);
    await hold.open(ordinary).send(client, exact.send);
    expect(exact.write).toHaveBeenCalledOnce();
  });

  it("leaves no mirror after a wallet rejection, and keeps it once the wallet may have sent", async () => {
    const { hold, storage } = setup();
    const mirror = () =>
      createBrowserWriteRecovery(ordinary, { storage }).read();
    const { client } = fakeChain();
    const handle = hold.open(intentCall);
    const rejected = wallet(async () => {
      throw Object.assign(new Error("User rejected the request."), {
        code: 4001,
      });
    });
    await expect(handle.send(client, rejected.send)).rejects.toThrow();
    expect(mirror()).toBeNull();
    expect(hold.open(ordinary).peek().status).toBe("clear");
    // The wallet opened and its reply was lost: the mirror holds.
    await expect(handle.send(client, lostReply().send)).rejects.toThrow();
    expect(mirror()).toMatchObject({ mirrorOf: key });
    expect(hold.open(ordinary).peek().status).toBe("held-no-hash");
  });
});

describe("a launch held under its shared intent", () => {
  it("refuses a retry whose config holds a number where the first held a bigint", async () => {
    const { hold } = setup();
    const { client } = fakeChain();
    // Each review regenerates its calldata (a new salt or deadline).
    const launch = (reserved: number | bigint, data: Hex) =>
      hold.open({
        ...ordinary,
        call: { ...ordinary.call, data },
        namespace: launchIntent({
          chainId: 10,
          account: ACCOUNT,
          config: { name: "Banny", reserved },
        }),
      });
    await expect(
      launch(1000, "0xaabbccdd0001").send(client, lostReply().send),
    ).rejects.toThrow();
    const retry = wallet(async () => HASH);
    await expect(
      launch(1000n, "0xaabbccdd0002").send(client, retry.send),
    ).rejects.toBeInstanceOf(WriteHeldError);
    expect(retry.write).not.toHaveBeenCalled();
  });
});

describe("acknowledging a success that settled while away", () => {
  it("marks the saved settlement acknowledged for every reader, and only that one", async () => {
    const browser = origin();
    const { hold } = setup({ browser });
    const { chain, client, receiptOf } = fakeChain();
    const handle = hold.open(ordinary);
    await handle.send(client, wallet(async () => HASH).send);
    chain.txs.push(sent(HASH, { block: 95n }));
    const settled = await handle.onReceipt(receiptOf(chain.txs[0]), client);
    expect(settled).toMatchObject({
      settled: { result: "success", hash: HASH },
    });
    // Another hash names nothing to acknowledge.
    await expect(
      handle.acknowledge({ result: "success", hash: OTHER }),
    ).resolves.toMatchObject({ settled: { hash: HASH } });
    // Acknowledged, never wiped: every reader still sees the success.
    const acknowledged = {
      status: "clear",
      reservation: expect.any(String),
      settled: { result: "success", hash: HASH, acknowledged: true },
    };
    await expect(
      handle.acknowledge({ result: "success", hash: HASH }),
    ).resolves.toEqual(acknowledged);
    expect(setup({ browser }).hold.open(ordinary).peek()).toEqual(acknowledged);
    // The next reservation replaces it, as any settlement.
    await expect(handle.send(client, lostReply().send)).rejects.toThrow();
    expect(handle.peek().status).not.toBe("clear");
    // Without the lock, nothing is forgotten: the saved record is shown.
    const unlocked = setup({
      locks: {
        request: async () => {
          throw new Error("locks unavailable");
        },
      } as never,
    });
    await expect(
      unlocked.hold
        .open(ordinary)
        .acknowledge({ result: "success", hash: HASH }),
    ).resolves.toMatchObject({ status: "clear" });
  });
});

describe("a legacy hold's success, through its intent", () => {
  it("passes the intent's own settlement to its subscribers as it is", async () => {
    const { hold } = setup();
    const { chain, client, receiptOf } = fakeChain();
    const handle = hold.open(
      { ...ordinary, namespace: writeIntentKey("pay", { projectId: 7n }) },
      { legacy: [{ call: ordinary.call }] },
    );
    const heard: WriteHoldState[] = [];
    const stop = handle.subscribe((state) => heard.push(state));
    await handle.send(client, wallet(async () => HASH).send);
    chain.txs.push(sent(HASH, { block: 95n }));
    await handle.onReceipt(receiptOf(chain.txs[0]), client);
    expect(heard[heard.length - 1]).toMatchObject({
      status: "clear",
      settled: { result: "success", hash: HASH },
    });
    stop();
  });

  it("blocks a fresh load on a legacy success reserved after the intent's own attempt, never on an older one", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(1_000_000);
    const browser = origin();
    const old = setup({ browser });
    const next = setup({ browser, locks: old.locks });
    const { chain, client, receiptOf } = fakeChain();
    const key = writeIntentKey("pay", { projectId: 4n });
    const open = () =>
      next.hold.open(
        {
          ...ordinary,
          call: { ...ordinary.call, data: "0xaabbccdd0002" as Hex },
          namespace: key,
        },
        { legacy: [{ call: ordinary.call }] },
      );
    // An older version's write that settled before the intent ever reserved.
    await old.hold.open(ordinary).send(client, wallet(async () => OTHER).send);
    chain.txs.push(sent(OTHER, { block: 95n }));
    await old.hold.open(ordinary).onReceipt(receiptOf(chain.txs[0]), client);
    vi.setSystemTime(2_000_000);
    // The intent reserves; the wallet rejects it.
    await expect(
      open().send(client, async (gate) => {
        await gate.beforeSend();
        gate.onRejected();
        throw new Error("rejected");
      }),
    ).rejects.toThrow("rejected");
    // The older settlement stays unannounced.
    const before = createHeldWriteView(open(), { client, follow: false });
    await before.check();
    expect(before.get().phase).toBe("clear");
    // Later, with every page closed, the older version sends again and it settles.
    vi.setSystemTime(3_000_000);
    await old.hold.open(ordinary).send(client, wallet(async () => HASH).send);
    chain.txs.push(sent(HASH, { block: 96n, nonce: 8 }));
    await old.hold.open(ordinary).onReceipt(receiptOf(chain.txs[1]), client);
    // A fresh load sees a success it never told: blocked until acknowledged.
    const view = createHeldWriteView(open(), { client, follow: false });
    await view.check();
    expect(view.get()).toMatchObject({
      phase: "succeeded",
      settled: { hash: HASH },
    });
    const retry = wallet(async () => OTHER);
    await expect(view.send(retry.send)).rejects.toThrow();
    expect(retry.write).not.toHaveBeenCalled();
    await view.acknowledge();
    await view.send(retry.send);
    expect(retry.write).toHaveBeenCalledOnce();
  });

  it("lets a newer legacy success win over the intent's own older settlement, in reads and subscriptions", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(1_000_000);
    const browser = origin();
    const old = setup({ browser });
    const next = setup({ browser, locks: old.locks });
    const { chain, client, receiptOf } = fakeChain();
    chain.head = 120n;
    chain.finalized = 110n;
    const key = writeIntentKey("pay", { projectId: 4n });
    const intentCall = {
      ...ordinary,
      call: { ...ordinary.call, data: "0xaabbccdd0002" as Hex },
      namespace: key,
    };
    const open = () =>
      next.hold.open(intentCall, { legacy: [{ call: ordinary.call }] });
    // The intent's own write reverted, final: its settlement is a failure.
    const own = open();
    await own.send(client, wallet(async () => OTHER).send);
    chain.txs.push({
      ...sent(OTHER, { block: 100n, status: "reverted" }),
      input: intentCall.call.data,
    });
    await own.onReceipt(receiptOf(chain.txs[0]), client);
    expect(own.peek()).toMatchObject({ settled: { result: "failed" } });
    // Later, an older version's exact call succeeds.
    vi.setSystemTime(2_000_000);
    await old.hold.open(ordinary).send(client, wallet(async () => HASH).send);
    chain.txs.push(sent(HASH, { block: 101n, nonce: 8 }));
    await old.hold.open(ordinary).onReceipt(receiptOf(chain.txs[1]), client);
    // A fresh view: the newer success, blocked until acknowledged.
    const view = createHeldWriteView(open(), { client, follow: false });
    const stop = view.start();
    await vi.waitFor(() =>
      expect(view.get()).toMatchObject({
        phase: "succeeded",
        settled: { hash: HASH },
      }),
    );
    // The intent's own key speaks: still the newer success.
    const heard: WriteHoldState[] = [];
    const stopHearing = open().subscribe((state) => heard.push(state));
    await next.hold.open(intentCall).state(client);
    expect(heard[heard.length - 1]).toMatchObject({ settled: { hash: HASH } });
    stopHearing();
    await expect(view.send(wallet(async () => OTHER).send)).rejects.toThrow();
    stop();
  });

  it.each([false, true])(
    "lets an unacknowledged legacy success win over another legacy key's failure (swapped %s)",
    async (swapped) => {
      const browser = origin();
      const old = setup({ browser });
      const next = setup({ browser, locks: old.locks });
      const { chain, client, receiptOf } = fakeChain();
      chain.head = 120n;
      chain.finalized = 110n;
      const callA = { ...ordinary.call, data: "0xaabbccdd00a1" as Hex };
      const callB = { ...ordinary.call, data: "0xaabbccdd00b2" as Hex };
      const [failing, succeeding] = swapped ? [callB, callA] : [callA, callB];
      // One earlier write reverted, final; another succeeded.
      await old.hold
        .open({ ...ordinary, call: failing })
        .send(client, async (gate) => {
          await gate.beforeSend();
          gate.afterSubmit(OTHER);
          return OTHER;
        });
      chain.txs.push({
        ...sent(OTHER, { block: 100n, status: "reverted" }),
        input: failing.data,
      });
      await old.hold
        .open({ ...ordinary, call: failing })
        .onReceipt(receiptOf(chain.txs[0]), client);
      await old.hold
        .open({ ...ordinary, call: succeeding })
        .send(client, async (gate) => {
          await gate.beforeSend();
          gate.afterSubmit(HASH);
          return HASH;
        });
      chain.txs.push({
        ...sent(HASH, { block: 101n, nonce: 8 }),
        input: succeeding.data,
      });
      await old.hold
        .open({ ...ordinary, call: succeeding })
        .onReceipt(receiptOf(chain.txs[1]), client);
      const handle = next.hold.open(
        {
          ...ordinary,
          call: { ...ordinary.call, data: "0xaabbccdd0002" as Hex },
          namespace: writeIntentKey("pay", { projectId: 4n }),
        },
        { legacy: [{ call: callA }, { call: callB }] },
      );
      const view = createHeldWriteView(handle, { client, follow: false });
      const stop = view.start();
      await vi.waitFor(() =>
        expect(view.get()).toMatchObject({
          phase: "succeeded",
          settled: { hash: HASH },
        }),
      );
      await view.acknowledge();
      expect(
        old.hold.open({ ...ordinary, call: succeeding }).peek(),
      ).toMatchObject({
        settled: { acknowledged: true },
      });
      stop();
    },
  );

  /** Two legacy keys, A and B, of an intent that never reserved, and a started view. */
  function twoKeys() {
    const browser = origin();
    const old = setup({ browser });
    const next = setup({ browser, locks: old.locks });
    const fixture = fakeChain();
    fixture.chain.head = 120n;
    fixture.chain.finalized = 110n;
    const calls = {
      A: { ...ordinary.call, data: "0xaabbccdd00a1" as Hex },
      B: { ...ordinary.call, data: "0xaabbccdd00b2" as Hex },
    };
    const hashes = {
      A: `0x${"a1".repeat(32)}` as Hex,
      B: `0x${"b2".repeat(32)}` as Hex,
    };
    let block = 100n;
    let nonce = 7;
    const legacyOf = (key: "A" | "B") =>
      old.hold.open({ ...ordinary, call: calls[key] });
    /** The older version sends `key`'s call. */
    const send = (key: "A" | "B") =>
      legacyOf(key).send(fixture.client, async (gate) => {
        await gate.beforeSend();
        gate.afterSubmit(hashes[key]);
        return hashes[key];
      });
    /** `key`'s transaction mines, final, with `result`. */
    const settle = async (key: "A" | "B", result: "success" | "failed") => {
      fixture.chain.txs.push({
        ...sent(hashes[key], {
          block: block++,
          nonce: nonce++,
          ...(result === "failed" ? { status: "reverted" as const } : {}),
        }),
        input: calls[key].data,
      });
      await legacyOf(key).onReceipt(
        fixture.receiptOf(fixture.chain.txs[fixture.chain.txs.length - 1]),
        fixture.client,
      );
    };
    const intentHandle = () =>
      next.hold.open(
        {
          ...ordinary,
          call: { ...ordinary.call, data: "0xaabbccdd0002" as Hex },
          namespace: writeIntentKey("pay", { projectId: 4n }),
        },
        { legacy: [{ call: calls.A }, { call: calls.B }] },
      );
    /** Another writer holds `key`'s lock until the returned release. */
    const lockKey = async (key: "A" | "B") => {
      let release!: () => void;
      const holding = legacyOf(key)
        .send(
          fixture.client,
          () => new Promise<void>((resolve) => (release = resolve)),
        )
        .catch(() => undefined);
      await vi.waitFor(() => expect(release).toBeTypeOf("function"));
      return async () => {
        release();
        await holding;
      };
    };
    /** `key`'s call sent with its wallet reply lost: held, no hash. */
    const lose = (key: "A" | "B") =>
      legacyOf(key)
        .send(fixture.client, lostReply().send)
        .catch(() => undefined);
    /** Whether `key`'s saved settlement is an unacknowledged success. */
    const unacknowledged = (key: "A" | "B") => {
      const now = legacyOf(key).peek();
      return (
        now.status === "clear" &&
        now.settled?.result === "success" &&
        !("acknowledged" in now.settled && now.settled.acknowledged)
      );
    };
    return {
      fixture,
      hashes,
      send,
      settle,
      intentHandle,
      lockKey,
      lose,
      unacknowledged,
    };
  }

  it("lets a later legacy success replace a retained failure, and gates the send on it (Codex :417)", async () => {
    const keys = twoKeys();
    await keys.send("A");
    const settled = vi.fn();
    const view = createHeldWriteView(keys.intentHandle(), {
      client: keys.fixture.client,
      follow: false,
      onSettled: settled,
    });
    const stop = view.start();
    await vi.waitFor(() => expect(view.get().phase).toBe("confirming"));
    await keys.settle("A", "failed");
    await view.check();
    await vi.waitFor(() => expect(settled).toHaveBeenCalledOnce());
    expect(view.get()).toMatchObject({
      phase: "settled",
      settled: { result: "failed" },
    });
    // Between this view's reads, B is sent and succeeds.
    await keys.send("B");
    await keys.settle("B", "success");
    await view.check();
    expect(view.get()).toMatchObject({
      phase: "succeeded",
      settled: { hash: keys.hashes.B },
    });
    const retry = wallet(async () => OTHER);
    await expect(view.send(retry.send)).rejects.toThrow();
    expect(retry.write).not.toHaveBeenCalled();
    stop();
  });

  it("delivers the settlement it saw held, though another key has a success (Codex :1896)", async () => {
    const keys = twoKeys();
    await keys.send("B");
    await keys.settle("B", "success");
    await keys.send("A");
    const settled = vi.fn();
    const view = createHeldWriteView(keys.intentHandle(), {
      client: keys.fixture.client,
      follow: false,
      onSettled: settled,
    });
    const stop = view.start();
    await vi.waitFor(() => expect(view.get().phase).toBe("confirming"));
    await keys.settle("A", "failed");
    await view.check();
    await vi.waitFor(() => expect(settled).toHaveBeenCalledOnce());
    expect(settled).toHaveBeenCalledWith(
      { result: "failed", hash: keys.hashes.A },
      expect.anything(),
    );
    // Then B's unacknowledged success shows, and gates the send.
    await vi.waitFor(() =>
      expect(view.get()).toMatchObject({
        phase: "succeeded",
        settled: { hash: keys.hashes.B },
      }),
    );
    await expect(view.send(wallet(async () => OTHER).send)).rejects.toThrow();
    stop();
  });

  it("finds another success past one whose acknowledgement waits on a lock (Codex 1)", async () => {
    const keys = twoKeys();
    await keys.send("A");
    const view = createHeldWriteView(keys.intentHandle(), {
      client: keys.fixture.client,
      follow: false,
      onSettled: vi.fn(),
    });
    const stop = view.start();
    await vi.waitFor(() => expect(view.get().phase).toBe("confirming"));
    await keys.settle("A", "success");
    // A's acknowledgement will wait for A's lock.
    const release = await keys.lockKey("A");
    await view.check();
    await vi.waitFor(() => expect(view.get().phase).toBe("settled"));
    // B succeeds between this view's reads.
    await keys.send("B");
    await keys.settle("B", "success");
    await view.check();
    expect(view.get()).toMatchObject({
      phase: "succeeded",
      settled: { hash: keys.hashes.B },
    });
    const retry = wallet(async () => OTHER);
    await expect(view.send(retry.send)).rejects.toThrow();
    expect(retry.write).not.toHaveBeenCalled();
    await release();
    stop();
  });

  it("keeps a newer hold and its exit when an acknowledgement completes (Codex 2)", async () => {
    const keys = twoKeys();
    await keys.send("A");
    await keys.settle("A", "success");
    const view = createHeldWriteView(keys.intentHandle(), {
      client: keys.fixture.client,
      follow: false,
    });
    const stop = view.start();
    await vi.waitFor(() => expect(view.get().phase).toBe("succeeded"));
    // "Send it again", its acknowledgement waiting on A's lock.
    const release = await keys.lockKey("A");
    const acknowledged = view.acknowledge();
    // Meanwhile B is held, its reply lost: the exit at once.
    await keys.lose("B");
    await view.check();
    expect(view.get()).toMatchObject({ phase: "held", exit: true });
    await release();
    await acknowledged;
    expect(view.get()).toMatchObject({ phase: "held", exit: true });
    expect(view.get().state).not.toBeNull();
    stop();
  });

  it("delivers a reservation it saw held after another becomes the one shown (Codex 3)", async () => {
    const keys = twoKeys();
    await keys.send("A");
    const settled = vi.fn();
    const view = createHeldWriteView(keys.intentHandle(), {
      client: keys.fixture.client,
      follow: false,
      onSettled: settled,
    });
    const stop = view.start();
    await vi.waitFor(() => expect(view.get().phase).toBe("confirming"));
    // B is held too, before A settles; then A fails.
    await keys.send("B");
    await keys.settle("A", "failed");
    await view.check();
    await vi.waitFor(() => expect(settled).toHaveBeenCalledOnce());
    expect(settled).toHaveBeenCalledWith(
      { result: "failed", hash: keys.hashes.A },
      expect.anything(),
    );
    await keys.settle("B", "failed");
    await view.check();
    await vi.waitFor(() => expect(settled).toHaveBeenCalledTimes(2));
    stop();
  });

  it("holds the gate through overlapping holds and acknowledgement contention, whatever the order", async () => {
    let seed = 7;
    const random = () =>
      (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
    for (let run = 0; run < 16; run += 1) {
      const keys = twoKeys();
      const told = new Set<string>();
      const view = createHeldWriteView(keys.intentHandle(), {
        client: keys.fixture.client,
        follow: false,
        onSettled: (settled) => {
          if ("hash" in settled) told.add(settled.hash.toLowerCase());
        },
      });
      const stop = view.start();
      // Both keys sent before either settles, in a random order, so their
      // holds overlap; then each settles, in a random order.
      const sends: ("A" | "B")[] = random() < 0.5 ? ["A", "B"] : ["B", "A"];
      const settles: ("A" | "B")[] = random() < 0.5 ? ["A", "B"] : ["B", "A"];
      for (const key of sends) {
        await keys.send(key);
        if (random() < 0.5) await view.check();
      }
      const releases: (() => Promise<void>)[] = [];
      for (const key of settles) {
        await keys.settle(key, random() < 0.5 ? "success" : "failed");
        // Sometimes another writer holds a key's lock: acknowledgements wait.
        if (random() < 0.5 && releases.length === 0)
          releases.push(await keys.lockKey(key));
        await view.check();
        await new Promise((resolve) => setTimeout(resolve, 0));
        // The gate holds while any saved success is unacknowledged and was
        // never told to the app by this view.
        const owed = (["A", "B"] as const).some(
          (each) =>
            keys.unacknowledged(each) &&
            !told.has(keys.hashes[each].toLowerCase()),
        );
        if (owed) {
          const retry = wallet(async () => OTHER);
          await expect(view.send(retry.send)).rejects.toThrow();
          expect({ run, key, written: retry.write.mock.calls.length }).toEqual({
            run,
            key,
            written: 0,
          });
          // A hold still shown comes first; with none, "Send it again".
          if (view.get().state?.status === "clear")
            expect(view.get().phase).toBe("succeeded");
        }
        if (random() < 0.5) await releases.shift()?.();
      }
      for (const release of releases) await release();
      stop();
    }
  });

  it("holds the gate whenever any success is unacknowledged, whatever the order of events", async () => {
    // A small seeded generator: the same sequences every run.
    let seed = 42;
    const random = () =>
      (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
    for (let run = 0; run < 12; run += 1) {
      const keys = twoKeys();
      const view = createHeldWriteView(keys.intentHandle(), {
        client: keys.fixture.client,
        follow: false,
      });
      const order: ("A" | "B")[] = random() < 0.5 ? ["A", "B"] : ["B", "A"];
      let anySuccess = false;
      for (const key of order) {
        await keys.send(key);
        // Sometimes the view reads it held first (and then sees it settle live).
        const watched = random() < 0.5;
        if (watched) await view.check();
        const result = random() < 0.5 ? "success" : "failed";
        await keys.settle(key, result);
        await view.check();
        await new Promise((resolve) => setTimeout(resolve, 0));
        // A success this view saw settle live is told and acknowledged;
        // one it never saw held stays unacknowledged.
        if (result === "success" && !watched) anySuccess = true;
        const retry = wallet(async () => OTHER);
        const sent = await view.send(retry.send).then(
          () => true,
          () => false,
        );
        expect({ run, key, watched, result, sent }).toMatchObject({
          sent: !anySuccess,
        });
        if (sent) break; // a send changes the intent's history: one per run
      }
    }
  });

  it("gates on the intent's own unacknowledged success, and never on a held record", async () => {
    const { hold } = setup();
    const { chain, client, receiptOf } = fakeChain();
    const handle = hold.open(
      { ...ordinary, namespace: writeIntentKey("pay", { projectId: 8n }) },
      { legacy: [{ call: ordinary.call }] },
    );
    await expect(handle.send(client, lostReply().send)).rejects.toThrow();
    expect(handle.unacknowledgedSuccess()).toBeUndefined();
    await handle.exit(
      await handle.state(client),
      { checkedWallet: true },
      client,
    );
    await handle.send(client, wallet(async () => HASH).send);
    chain.txs.push(sent(HASH, { block: 95n, nonce: 7 }));
    await handle.onReceipt(receiptOf(chain.txs[0]), client);
    expect(handle.unacknowledgedSuccess()).toMatchObject({
      result: "success",
      hash: HASH,
    });
    expect(handle.settlementOf("no-such-reservation")).toBeUndefined();
  });

  it("blocks on a legacy reservation made at the same moment as the intent's", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(5_000_000);
    const browser = origin();
    const old = setup({ browser });
    const next = setup({ browser, locks: old.locks });
    const { chain, client, receiptOf } = fakeChain();
    const key = writeIntentKey("pay", { projectId: 4n });
    const open = () =>
      next.hold.open(
        {
          ...ordinary,
          call: { ...ordinary.call, data: "0xaabbccdd0002" as Hex },
          namespace: key,
        },
        { legacy: [{ call: ordinary.call }] },
      );
    await expect(
      open().send(client, async (gate) => {
        await gate.beforeSend();
        gate.onRejected();
        throw new Error("rejected");
      }),
    ).rejects.toThrow("rejected");
    // The same millisecond: order unproven.
    await old.hold.open(ordinary).send(client, wallet(async () => HASH).send);
    chain.txs.push(sent(HASH, { block: 95n }));
    await old.hold.open(ordinary).onReceipt(receiptOf(chain.txs[0]), client);
    const view = createHeldWriteView(open(), { client, follow: false });
    const stop = view.start();
    await vi.waitFor(() => expect(view.get().phase).toBe("succeeded"));
    stop();
  });

  it("orders by the settlement's time, and blocks when times can't be compared", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(1_000_000);
    const browser = origin();
    const old = setup({ browser });
    const next = setup({ browser, locks: old.locks });
    const { chain, client, receiptOf } = fakeChain();
    const key = writeIntentKey("pay", { projectId: 4n });
    const open = () =>
      next.hold.open(
        {
          ...ordinary,
          call: { ...ordinary.call, data: "0xaabbccdd0002" as Hex },
          namespace: key,
        },
        { legacy: [{ call: ordinary.call }] },
      );
    await expect(
      open().send(client, async (gate) => {
        await gate.beforeSend();
        gate.onRejected();
        throw new Error("rejected");
      }),
    ).rejects.toThrow("rejected");
    vi.setSystemTime(2_000_000);
    await old.hold.open(ordinary).send(client, wallet(async () => HASH).send);
    chain.txs.push(sent(HASH, { block: 95n }));
    await old.hold.open(ordinary).onReceipt(receiptOf(chain.txs[0]), client);
    /** Latest markers as an earlier version saved them: no time. */
    const untimed = (scope: (key: string) => boolean) => {
      for (const [stored, value] of browser.values)
        if (stored.endsWith(":latest") && scope(stored))
          browser.values.set(
            stored,
            JSON.stringify({ id: JSON.parse(value).id }),
          );
    };
    // The legacy marker has no time: its settlement's time orders it.
    untimed((stored) => !stored.includes("namespace"));
    const view = createHeldWriteView(open(), { client, follow: false });
    await view.check();
    expect(view.get().phase).toBe("succeeded");
    // Neither side has a time: blocked.
    untimed(() => true);
    const blind = createHeldWriteView(open(), { client, follow: false });
    await blind.check();
    expect(blind.get().phase).toBe("succeeded");
  });

  it("keeps the success of a legacy hold it saw held, though the intent reserved before", async () => {
    const browser = origin();
    const old = setup({ browser });
    const next = setup({ browser, locks: old.locks });
    const { chain, client, receiptOf } = fakeChain();
    const key = writeIntentKey("pay", { projectId: 4n });
    const intentCall = {
      ...ordinary,
      call: { ...ordinary.call, data: "0xaabbccdd0002" as Hex },
      namespace: key,
    };
    const open = () =>
      next.hold.open(intentCall, { legacy: [{ call: ordinary.call }] });
    // The intent once reserved, and the wallet rejected it.
    await expect(
      open().send(client, async (gate) => {
        await gate.beforeSend();
        gate.onRejected();
        throw new Error("rejected");
      }),
    ).rejects.toThrow("rejected");
    // Then an older version sends its exact call.
    await old.hold.open(ordinary).send(client, wallet(async () => HASH).send);
    const settled = vi.fn();
    const released = vi.fn();
    const view = createHeldWriteView(open(), {
      client,
      follow: false,
      onSettled: settled,
      onReleased: released,
    });
    const stop = view.start();
    await vi.waitFor(() => expect(view.get().phase).toBe("confirming"));
    chain.txs.push(sent(HASH, { block: 95n }));
    await old.hold.open(ordinary).onReceipt(receiptOf(chain.txs[0]), client);
    await view.check();
    await vi.waitFor(() => expect(settled).toHaveBeenCalledOnce());
    expect(view.get().phase).toBe("settled");
    expect(released).not.toHaveBeenCalled();
    stop();
    // An unrelated old settlement, never seen held, stays unannounced here.
    const fresh = createHeldWriteView(open(), {
      client,
      follow: false,
      onSettled: settled,
    });
    await fresh.check();
    expect(fresh.get().phase).toBe("clear");
    expect(settled).toHaveBeenCalledOnce();
  });

  it("reaches a started, subscribed view as the success, never a release", async () => {
    const browser = origin();
    const old = setup({ browser });
    const { chain, client, receiptOf } = fakeChain();
    await old.hold.open(ordinary).send(client, wallet(async () => HASH).send);
    const next = setup({ browser, locks: old.locks });
    const key = writeIntentKey("pay", { projectId: 4n });
    const handle = next.hold.open(
      {
        ...ordinary,
        call: { ...ordinary.call, data: "0xaabbccdd0002" as Hex },
        namespace: key,
      },
      { legacy: [{ call: ordinary.call }] },
    );
    const settled = vi.fn();
    const released = vi.fn();
    const view = createHeldWriteView(handle, {
      client,
      follow: false,
      onSettled: settled,
      onReleased: released,
    });
    const stop = view.start();
    await vi.waitFor(() => expect(view.get().phase).toBe("confirming"));
    // The intent's own key speaks (another handle reads it): still the legacy hold.
    const heard: WriteHoldState[] = [];
    const stopHearing = handle.subscribe((state) => heard.push(state));
    await next.hold
      .open({
        ...ordinary,
        call: { ...ordinary.call, data: "0xaabbccdd0002" as Hex },
        namespace: key,
      })
      .state(client);
    expect(heard[heard.length - 1]).toMatchObject({
      status: "pending-known-hash",
    });
    stopHearing();
    chain.txs.push(sent(HASH, { block: 95n }));
    await old.hold.open(ordinary).onReceipt(receiptOf(chain.txs[0]), client);
    await view.check();
    await vi.waitFor(() => expect(settled).toHaveBeenCalledOnce());
    expect(view.get().phase).toBe("settled");
    expect(released).not.toHaveBeenCalled();
    stop();
  });

  it("is the intent's settlement: delivered once, never a release, and blocks until acknowledged", async () => {
    const browser = origin();
    const old = setup({ browser });
    const { chain, client, receiptOf } = fakeChain();
    // An earlier version's exact-call write, sent.
    await old.hold.open(ordinary).send(client, wallet(async () => HASH).send);
    const next = setup({ browser, locks: old.locks });
    const key = writeIntentKey("pay", { projectId: 4n });
    const intentCall = {
      ...ordinary,
      call: { ...ordinary.call, data: "0xaabbccdd0002" as Hex },
      namespace: key,
    };
    const open = () =>
      next.hold.open(intentCall, { legacy: [{ call: ordinary.call }] });
    const settled = vi.fn();
    const released = vi.fn();
    const view = createHeldWriteView(open(), {
      client,
      follow: false,
      onSettled: settled,
      onReleased: released,
    });
    await view.check();
    expect(view.get().phase).toBe("confirming");
    // The earlier write mines and settles.
    chain.txs.push(sent(HASH, { block: 95n }));
    await old.hold.open(ordinary).onReceipt(receiptOf(chain.txs[0]), client);
    await view.check();
    await vi.waitFor(() => expect(settled).toHaveBeenCalledOnce());
    expect(view.get()).toMatchObject({
      phase: "settled",
      line: HELD_SUCCESS_LINE,
    });
    expect(released).not.toHaveBeenCalled();
    // Seen settling, it was acknowledged: a reload blocks nothing.
    await vi.waitFor(async () =>
      expect((await open().state(client)).status).toBe("clear"),
    );
    const reloaded = createHeldWriteView(open(), { client, follow: false });
    await reloaded.check();
    expect(reloaded.get().phase).toBe("clear");
  });

  it("blocks a fresh view of the intent until the user acknowledges it", async () => {
    const browser = origin();
    const old = setup({ browser });
    const { chain, client, receiptOf } = fakeChain();
    await old.hold.open(ordinary).send(client, wallet(async () => HASH).send);
    chain.txs.push(sent(HASH, { block: 95n }));
    await old.hold.open(ordinary).onReceipt(receiptOf(chain.txs[0]), client);
    const next = setup({ browser, locks: old.locks });
    const key = writeIntentKey("pay", { projectId: 4n });
    const handle = next.hold.open(
      {
        ...ordinary,
        call: { ...ordinary.call, data: "0xaabbccdd0002" as Hex },
        namespace: key,
      },
      { legacy: [{ call: ordinary.call }] },
    );
    const view = createHeldWriteView(handle, { client, follow: false });
    await view.check();
    expect(view.get().phase).toBe("succeeded");
    expect(handle.peek()).toMatchObject({ settled: { hash: HASH } });
    // Another hash acknowledges nothing of it.
    await handle.acknowledge({ result: "success", hash: OTHER });
    expect(old.hold.open(ordinary).peek()).toMatchObject({
      settled: { hash: HASH },
    });
    expect(old.hold.open(ordinary).peek()).not.toMatchObject({
      settled: { acknowledged: true },
    });
    const retry = wallet(async () => OTHER);
    await expect(view.send(retry.send)).rejects.toThrow();
    expect(retry.write).not.toHaveBeenCalled();
    await view.acknowledge();
    expect(old.hold.open(ordinary).peek()).toMatchObject({
      settled: { acknowledged: true },
    });
    await view.send(retry.send);
    expect(retry.write).toHaveBeenCalledOnce();
  });
});

describe("two tabs viewing one write that succeeds", () => {
  it("shows the success in the tab that didn't see it settle, never a release", async () => {
    const browser = origin();
    const tabA = setup({ browser });
    const tabB = setup({ browser, locks: tabA.locks });
    const { chain, client, receiptOf } = fakeChain();
    const a = tabA.hold.open(ordinary);
    await a.send(client, wallet(async () => HASH).send);
    const settledB = vi.fn();
    const releasedB = vi.fn();
    const viewA = createHeldWriteView(a, { client, follow: false });
    const viewB = createHeldWriteView(tabB.hold.open(ordinary), {
      client,
      follow: false,
      onSettled: settledB,
      onReleased: releasedB,
    });
    await viewA.check();
    await viewB.check();
    expect(viewB.get().phase).toBe("confirming");
    // It mines; tab A sees it settle live, and acknowledges it.
    chain.txs.push(sent(HASH, { block: 95n }));
    await a.onReceipt(receiptOf(chain.txs[0]), client);
    await viewA.check();
    expect(viewA.get().phase).toBe("settled");
    await vi.waitFor(() =>
      expect(tabA.hold.open(ordinary).peek()).toMatchObject({
        settled: { acknowledged: true },
      }),
    );
    await viewB.check();
    await vi.waitFor(() => expect(settledB).toHaveBeenCalledOnce());
    expect(viewB.get()).toMatchObject({
      phase: "settled",
      line: HELD_SUCCESS_LINE,
    });
    expect(releasedB).not.toHaveBeenCalled();
    // A reload in either tab blocks nothing.
    const reloaded = createHeldWriteView(
      setup({ browser }).hold.open(ordinary),
      {
        client,
        follow: false,
      },
    );
    await reloaded.check();
    expect(reloaded.get().phase).toBe("clear");
  });
});

describe("listing every held write for an account", () => {
  it("lists exact-call and intent holds once each, never a mirror, another account's or a released one", async () => {
    const { hold } = setup();
    const { client } = fakeChain();
    const OTHER_ACCOUNT =
      "0x3333333333333333333333333333333333333333" as Address;
    const key = writeIntentKey("pay", { projectId: 4n });
    // An exact-call hold.
    await expect(
      hold.open(ordinary).send(client, lostReply().send),
    ).rejects.toThrow();
    // An intent hold, mirrored at its own exact call.
    const intentCall = {
      ...ordinary,
      call: { ...ordinary.call, data: "0xaabbccdd0002" as Hex },
      namespace: key,
    };
    await expect(
      hold
        .open(intentCall, { legacy: [{ call: intentCall.call }] })
        .send(client, lostReply().send),
    ).rejects.toThrow();
    // Another account's, and one released by its exit.
    await expect(
      hold
        .open({ ...ordinary, account: OTHER_ACCOUNT })
        .send(client, lostReply().send),
    ).rejects.toThrow();
    const released = hold.open({
      ...ordinary,
      call: { ...ordinary.call, value: 3n },
    });
    await expect(released.send(client, lostReply().send)).rejects.toThrow();
    await released.exit(
      await released.state(client),
      { checkedWallet: true },
      client,
    );
    const listed = hold.list({ account: ACCOUNT, chainId: 10 });
    expect(listed.map(({ record }) => record.namespace ?? null).sort()).toEqual(
      [key, null].sort(),
    );
    expect(hold.list({ account: ACCOUNT, chainId: 1 })).toEqual([]);
    // Each handle is the gated hold: its exit releases it.
    for (const { handle } of listed) {
      const state = await handle.state(client);
      expect(state).toMatchObject({ status: "held-no-hash", exit: true });
      await expect(
        handle.exit(state, { checkedWallet: true }, client),
      ).resolves.toMatchObject({ released: true });
    }
    expect(hold.list({ account: ACCOUNT, chainId: 10 })).toEqual([]);
  });
});

describe("adopting a previous deploy's hashless write", () => {
  it("keeps another tab's settlement made after the app's read, and creates no hold", async () => {
    const browser = origin();
    const app = setup({ browser });
    const other = setup({ browser, locks: app.locks });
    const { chain, client, receiptOf } = fakeChain();
    const handle = app.hold.open(ordinary);
    const snapshot = await handle.state(client);
    expect(snapshot.status).toBe("clear");
    // Another tab sends the write, and it settles.
    const elsewhere = other.hold.open(ordinary);
    await elsewhere.send(client, wallet(async () => HASH).send);
    chain.txs.push({ ...sent(HASH), block: 95n });
    const settled = await elsewhere.onReceipt(receiptOf(chain.txs[0]), client);
    expect(settled).toMatchObject({ status: "clear", settled: { hash: HASH } });
    const adopted = await handle.adopt(snapshot, { nonce: 7, fromBlock: 90n });
    expect(adopted).toEqual(settled);
    expect(handle.peek()).toEqual(settled);
  });

  it("holds once with its evidence, however often it is adopted, and never over a hold", async () => {
    const { hold } = setup();
    const { client } = fakeChain();
    const handle = hold.open(ordinary);
    const snapshot = await handle.state(client);
    const first = await handle.adopt(snapshot, {
      sentNonce: 7n,
      fromBlock: 90n,
      submittedAt: 1_700_000_000_000,
    });
    expect(first).toMatchObject({
      status: "held-no-hash",
      record: { nonce: "7", fromBlock: "90", submittedAt: "1700000000000" },
    });
    const again = await handle.adopt(snapshot, { nonce: 8, fromBlock: 91n });
    expect(again).toEqual(first);
    // Without nonce evidence, it is held for the user's check.
    const bare = hold.open({
      ...ordinary,
      call: { ...ordinary.call, data: "0xaabbccdd0002" },
    });
    await expect(
      bare.adopt(await bare.state(client), { nonce: 7 }),
    ).resolves.toMatchObject({
      status: "held-no-hash",
      line: WRITE_HOLD_UNCHECKED_LINE,
    });
    const retry = wallet(async () => HASH);
    await expect(handle.send(client, retry.send)).rejects.toBeInstanceOf(
      WriteHeldError,
    );
    expect(retry.write).not.toHaveBeenCalled();
  });

  it("adopts under an intent once its legacy keys are clear, and shows the state when the lock can't be taken", async () => {
    const { hold } = setup();
    const { client } = fakeChain();
    const handle = hold.open(
      { ...ordinary, namespace: writeIntentKey("pay", { projectId: 4n }) },
      { legacy: [{ call: ordinary.call }] },
    );
    await expect(
      handle.adopt(await handle.state(client)),
    ).resolves.toMatchObject({ status: "held-no-hash" });
    const unlocked = setup({
      locks: {
        request: async () => {
          throw new Error("locks unavailable");
        },
      } as never,
    });
    const refused = unlocked.hold.open(ordinary);
    await expect(refused.adopt({ status: "clear" })).resolves.toMatchObject({
      status: "clear",
    });
  });

  it("adopts nothing where a legacy hold or an intent's mirror already holds it", async () => {
    const browser = origin();
    const old = setup({ browser });
    const { client } = fakeChain();
    await expect(
      old.hold.open(ordinary).send(client, lostReply().send),
    ).rejects.toThrow();
    const held = old.hold.open(ordinary).peek() as WriteHeldState;
    const next = setup({ browser, locks: old.locks });
    const key = writeIntentKey("pay", { projectId: 4n });
    const intentHandle = next.hold.open(
      {
        ...ordinary,
        call: { ...ordinary.call, data: "0xaabbccdd0002" },
        namespace: key,
      },
      { legacy: [{ call: ordinary.call }] },
    );
    await expect(
      intentHandle.adopt({ status: "clear" }, { nonce: 7, fromBlock: 90n }),
    ).resolves.toMatchObject({ reservation: held.record.id });
    // The intent sends elsewhere; its mirror's exact handle adopts nothing.
    const fresh = setup();
    const mirrored = fresh.hold.open(
      { ...ordinary, namespace: key },
      { legacy: [{ call: ordinary.call }] },
    );
    await mirrored.send(client, wallet(async () => HASH).send);
    const exact = fresh.hold.open(ordinary);
    const shown = await exact.adopt({ status: "clear" });
    expect(shown).toMatchObject({
      status: "pending-known-hash",
      record: { namespace: key },
    });
  });
});

describe("adopting a previous deploy's hashed write", () => {
  it("says why it adopted nothing: a hash proven to be another write, or a chain it couldn't read", async () => {
    const { hold } = setup();
    const { chain, client } = fakeChain();
    chain.txs.push(sent(HASH, { input: "0xaabbccdd0009" as Hex }));
    const handle = hold.open(ordinary);
    await expect(
      handle.adopt({ status: "clear" }, { hash: HASH }, client),
    ).resolves.toMatchObject({ status: "clear", declined: "refused" });
    client.getChainId.mockRejectedValueOnce(new Error("rpc"));
    await expect(
      handle.adopt({ status: "clear" }, { hash: OTHER }, client),
    ).resolves.toMatchObject({ status: "clear", declined: "unreadable" });
    // A client on another chain can't check this chain's transaction.
    client.getChainId.mockResolvedValueOnce(1);
    await expect(
      handle.adopt({ status: "clear" }, { hash: OTHER }, client),
    ).resolves.toMatchObject({ status: "clear", declined: "unreadable" });
    await expect(
      handle.adopt({ status: "clear" }, { hash: OTHER }),
    ).resolves.toMatchObject({ status: "clear", declined: "unreadable" });
    await expect(
      handle.adopt({ status: "clear" }, { hash: "0x12" as Hex }, client),
    ).resolves.toMatchObject({ status: "clear", declined: "refused" });
    // Under an intent, the same.
    const intent = hold.open(
      { ...ordinary, namespace: writeIntentKey("pay", { projectId: 9n }) },
      { legacy: [{ call: ordinary.call }] },
    );
    await expect(
      intent.adopt({ status: "clear" }, { hash: HASH }, client),
    ).resolves.toMatchObject({ status: "clear", declined: "refused" });
  });

  it("gives a dropped hash the warned exit 30 minutes after it was sent, never before", async () => {
    vi.useFakeTimers({ now: 10_000_000, toFake: ["Date"] });
    const { hold } = setup();
    const { client } = fakeChain();
    const handle = hold.open(ordinary);
    const adopted = await handle.adopt(
      await handle.state(client),
      { hash: HASH, submittedAt: Date.now() - 20 * 60_000 },
      client,
    );
    expect(adopted).toMatchObject({
      status: "pending-known-hash",
      hash: HASH,
      exit: false,
    });
    vi.setSystemTime(Date.now() + 10 * 60_000);
    await expect(handle.state(client)).resolves.toMatchObject({
      status: "held-unchecked",
      exit: true,
    });
    // Unknown submission time: the clock starts at adoption.
    const other = hold.open({
      ...ordinary,
      call: { ...ordinary.call, data: "0xaabbccdd0002" },
    });
    await other.adopt(await other.state(client), { hash: OTHER }, client);
    vi.setSystemTime(Date.now() + 29 * 60_000);
    await expect(other.state(client)).resolves.toMatchObject({ exit: false });
    vi.setSystemTime(Date.now() + 2 * 60_000);
    await expect(other.state(client)).resolves.toMatchObject({ exit: true });
  });

  it("holds a pending hash with no exit, and settles a mined one on its verified receipt", async () => {
    const { hold } = setup();
    const { chain, client } = fakeChain();
    chain.txs.push(sent(HASH));
    const handle = hold.open(ordinary);
    const snapshot = await handle.state(client);
    await expect(
      handle.adopt(snapshot, { hash: HASH, submittedAt: 0 }, client),
    ).resolves.toMatchObject({ status: "pending-known-hash", exit: false });
    chain.txs[0].block = 95n;
    await expect(handle.state(client)).resolves.toMatchObject({
      status: "clear",
      settled: { result: "success", hash: HASH },
    });
    const mined = setup();
    const at = mined.hold.open(ordinary);
    await expect(
      at.adopt(await at.state(client), { hash: HASH }, client),
    ).resolves.toMatchObject({
      status: "clear",
      settled: { result: "success", hash: HASH },
    });
  });

  it("refuses a hash that is another call, another sender or another chain, and adopts nothing", async () => {
    for (const wrong of [
      { input: "0xaabbccdd0009" as Hex },
      { from: RELAYER },
      { to: SAFE },
      { value: 18n },
    ]) {
      const { hold } = setup();
      const { chain, client } = fakeChain();
      chain.txs.push(sent(HASH, wrong));
      const handle = hold.open(ordinary);
      const { checked: _, ...snapshot } = await handle.state(client);
      await expect(
        handle.adopt(snapshot, { hash: HASH }, client),
      ).resolves.toEqual({ ...snapshot, declined: "refused" });
      expect(handle.peek().status).toBe("clear");
    }
    const { hold } = setup();
    const { chain, client } = fakeChain();
    chain.chainId = 1;
    const handle = hold.open(ordinary);
    await expect(
      handle.adopt({ status: "clear" }, { hash: HASH }, client),
    ).resolves.toMatchObject({ status: "clear" });
    expect(handle.peek().status).toBe("clear");
  });
});

describe("whether a state was checked on the chain", () => {
  it("marks a contended state() unchecked, with no chain read, and a gated one checked", async () => {
    const browser = origin();
    const writer = setup({ browser });
    const { client } = fakeChain();
    await expect(
      writer.hold.open(ordinary).send(client, lostReply().send),
    ).rejects.toThrow();
    const gated = await writer.hold.open(ordinary).state(client);
    expect(gated).toMatchObject({
      status: "held-no-hash",
      exit: true,
      checked: true,
    });
    // Another tab holds the call's lock: only the saved record, its exit hidden.
    const busy = setup({
      browser,
      locks: {
        request: async (
          _name: string,
          _options: unknown,
          work: (lock: null) => Promise<unknown>,
        ) => work(null),
      } as never,
    });
    const reads = Object.values(client).filter(
      (read) => typeof read === "function" && "mock" in read,
    ) as ReturnType<typeof vi.fn>[];
    for (const read of reads) read.mockClear();
    const contended = await busy.hold.open(ordinary).state(client);
    expect(contended).toMatchObject({
      status: "held-no-hash",
      exit: false,
      checked: false,
    });
    expect(reads.every((read) => read.mock.calls.length === 0)).toBe(true);
    const ended = await busy.hold
      .open(ordinary)
      .exit(gated, { checkedWallet: true }, client);
    expect(ended).toMatchObject({ released: false, state: { checked: false } });
  });

  it("adopts a pending hash for a call with no value", async () => {
    const { hold } = setup();
    const { chain, client } = fakeChain();
    chain.txs.push(sent(HASH, { value: 0n }));
    const handle = hold.open({
      ...ordinary,
      call: { to: TARGET, data: DATA },
    });
    await expect(
      handle.adopt(await handle.state(client), { hash: HASH }, client),
    ).resolves.toMatchObject({ status: "pending-known-hash", hash: HASH });
  });
});
