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
  SAFE_PROPOSAL_EXECUTED_LINE,
  WRITE_HOLD_HASHED_EXIT_LINE,
  WRITE_HOLD_IN_TAB_LINE,
  WRITE_HOLD_NONCE_LINE,
  WRITE_HOLD_PENDING_LINE,
  WRITE_HOLD_UNCHECKED_LINE,
  WRITE_HOLD_REVERTED_LINE,
} from "./messages.js";
import {
  createWriteHold,
  WriteHeldError,
  WriteHoldBusyError,
  WriteHoldNonceError,
  type WriteHoldClient,
  type WriteHoldGate,
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
    expect(first.memory.size).toBe(0);
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
    expect([...browser.values.keys()]).toHaveLength(1);
    chain.txs.push(sent(HASH, { block: 95n }));
    await expect(
      handle.onReceipt(receiptOf(chain.txs[0]), client),
    ).resolves.toEqual({
      status: "clear",
      settled: { result: "success", hash: HASH },
    });
    expect(handle.peek()).toEqual({ status: "clear" });
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
    ).resolves.toEqual({ released: true, state: { status: "clear" } });
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
    chain.txs.push(sent(HASH, { block: 105n }));
    chain.head = 120n;
    chain.finalized = 110n;
    client.getTransactionReceipt.mockRejectedValueOnce(new Error("busy"));
    await expect(tabB.hold.open(ordinary).state(client)).resolves.toMatchObject(
      {
        status: "pending-known-hash",
        record: {
          id: (staleA as { record: { id: string } }).record.id,
          hash: HASH,
        },
      },
    );
    client.getTransactionReceipt.mockRejectedValue(new Error("busy"));
    const result = await tabA.hold
      .open(ordinary)
      .exit(staleA, { checkedWallet: true }, client);
    expect(result).toMatchObject({
      released: false,
      state: { status: "pending-known-hash", hash: HASH },
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
    // A node that can't answer proves nothing, however long it has been.
    vi.setSystemTime(1_000_000 + 31 * 60_000);
    client.getTransaction.mockRejectedValueOnce(new Error("timeout"));
    client.getTransaction.mockRejectedValueOnce(new Error("timeout"));
    await expect(handle.state(client)).resolves.toMatchObject({
      status: "pending-known-hash",
    });
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
    // It was sent after all, and confirms as the user takes the exit.
    chain.txs.push(sent(HASH, { block: 105n }));
    chain.head = 120n;
    chain.finalized = 110n;
    const [exit, receipt] = await Promise.all([
      handle.exit(shown, { checkedWallet: true }, client),
      handle.onReceipt(receiptOf(chain.txs[0]), client),
    ]);
    expect(exit).toEqual({
      released: false,
      state: { status: "clear", settled: { result: "success", hash: HASH } },
    });
    expect(receipt).toEqual({ status: "clear" });
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
      settled: { result: "success", hash: HASH },
    });
    await expect(handle.state(client)).resolves.toEqual({ status: "clear" });
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
    expect(handle.peek()).toEqual({ status: "clear" });
    await expect(handle.state(client)).resolves.toEqual({ status: "clear" });
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

  it("ends a write its effect read shows ran, and reads nothing on another chain", async () => {
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
    await expect(handle.state(client)).resolves.toMatchObject({
      status: "held-no-hash",
    });
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
    ).resolves.toEqual({ status: "clear" });
    await expect(
      handle.send(
        client,
        wallet(async () => {
          throw new Error("reply lost");
        }).send,
      ),
    ).rejects.toThrow();
    await expect(
      handle.state(client, { effect: async () => true }),
    ).resolves.toEqual({ status: "clear", settled: { result: "ran" } });
  });

  it("tracks the exact call found at its nonce and settles on its receipt", async () => {
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
    chain.txs.push(sent(HASH, { block: 105n }));
    chain.head = 120n;
    chain.finalized = 110n;
    // Found, but its receipt isn't readable yet.
    client.getTransactionReceipt.mockRejectedValueOnce(new Error("busy"));
    await expect(handle.state(client)).resolves.toMatchObject({
      status: "pending-known-hash",
      hash: HASH,
    });
    // A receipt that doesn't verify keeps it held.
    client.getTransactionReceipt.mockResolvedValueOnce({
      transactionHash: HASH,
      status: "success",
    } as never);
    await expect(handle.state(client)).resolves.toMatchObject({
      status: "pending-known-hash",
    });
    await expect(handle.state(client)).resolves.toEqual({
      status: "clear",
      settled: { result: "success", hash: HASH },
    });
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
    expect(browser.values.size).toBe(1);
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
    await expect(handle.state(client)).resolves.toEqual({ status: "clear" });
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
    await expect(
      handle.exit(
        { status: "held-no-hash" } as WriteHoldState,
        { checkedWallet: true },
        client,
      ),
    ).resolves.toEqual({ released: false, state: { status: "clear" } });
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
    return { hold, queue, browser };
  }

  it.each([
    [SUCCESS, "success"],
    [FAILURE, "failed"],
  ] as const)(
    "settles from the canonical %s log's receipt while Safe's service is stale",
    async (topic, result) => {
      const { hold, queue } = safeSetup();
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
      await expect(handle.state(fixture.client)).resolves.toEqual({
        status: "clear",
        settled: { result, hash: EXECUTION },
      });
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
      settled: { result: "success", hash: EXECUTION },
    });
    hold.dispose();
  });

  it("follows a named execution whose receipt the node doesn't have yet", async () => {
    vi.useFakeTimers();
    const { hold, queue } = safeSetup();
    const fixture = fakeChain();
    const handle = hold.open(safeCall());
    await handle.send(fixture.client, async (gate) => {
      await gate.beforeSend();
      gate.afterSubmit(queue.hash);
    });
    executes(fixture, queue.hash, SUCCESS);
    fixture.chain.hidden.add(EXECUTION.toLowerCase());
    await expect(handle.state(fixture.client)).resolves.toMatchObject({
      status: "ran-executed",
      executionHash: EXECUTION,
    });
    fixture.chain.hidden.clear();
    const seen: WriteHoldState[] = [];
    handle.subscribe((state) => seen.push(state));
    await vi.advanceTimersByTimeAsync(1_000);
    expect(seen[seen.length - 1]).toMatchObject({ status: "clear" });
    // A receipt that doesn't verify keeps an execution held.
    const again = safeSetup();
    const other = again.hold.open(safeCall());
    const second = fakeChain();
    await other.send(second.client, async (gate) => {
      await gate.beforeSend();
      gate.afterSubmit(again.queue.hash);
    });
    executes(second, again.queue.hash, SUCCESS);
    second.chain.hidden.add(EXECUTION.toLowerCase());
    await other.state(second.client);
    await expect(
      other.onReceipt(
        { transactionHash: EXECUTION, status: "success" } as never,
        second.client,
      ),
    ).resolves.toMatchObject({ status: "ran-executed" });
    again.hold.dispose();
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
        await expect(handle.state(fixture.client)).resolves.toEqual({
          status: "clear",
          settled: { result: "replaced" },
        });
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

  it("settles from what a replacement at the executor's nonce did, before calling it replaced", async () => {
    const SAFE_TX = `0x${"5a".repeat(32)}` as Hex;
    for (const [kind, expected] of [
      [
        "the same execution, succeeding",
        { status: "clear", settled: { result: "success", hash: OTHER } },
      ],
      [
        "the same execution, failing",
        { status: "clear", settled: { result: "failed", hash: OTHER } },
      ],
      ["a wrapper running a Safe execution", { status: "ran-executed" }],
      [
        "a reverted transaction",
        { status: "clear", settled: { result: "replaced" } },
      ],
      ["an unreadable receipt", { status: "ran-executed" }],
      ["a receipt off the canonical chain", { status: "ran-executed" }],
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
      await expect(handle.state(fixture.client)).resolves.toMatchObject(
        expected,
      );
      if (expected.status === "ran-executed") {
        // Unproven: the explicit exit after 30 minutes.
        vi.setSystemTime(1_000_000 + 31 * 60_000);
        await expect(handle.state(fixture.client)).resolves.toMatchObject({
          status: "held-unchecked",
          exit: true,
        });
      }
      hold.dispose();
      vi.useRealTimers();
    }
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
      executes(fixture, queue.hash, SUCCESS);
      fixture.chain.hidden.add(EXECUTION.toLowerCase());
      await expect(handle.state(fixture.client)).resolves.toMatchObject({
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
      await expect(handle.state(fixture.client)).resolves.toEqual(
        replacement === "replaced"
          ? { status: "clear", settled: { result: "replaced" } }
          : { status: "clear", settled: { result: "failed", hash: second } },
      );
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

  it("releases a proposal another transaction replaced", async () => {
    const { hold, queue } = safeSetup();
    const fixture = fakeChain();
    const handle = hold.open(safeCall());
    await handle.send(fixture.client, async (gate) => {
      await gate.beforeSend();
      gate.afterSubmit(queue.hash);
    });
    executes(fixture, OTHER, SUCCESS);
    await expect(handle.state(fixture.client)).resolves.toEqual({
      status: "clear",
      settled: { result: "replaced" },
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
      status: "clear",
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
      status: "clear",
      settled: { result: "success", hash: EXECUTION },
    });
  });
});
