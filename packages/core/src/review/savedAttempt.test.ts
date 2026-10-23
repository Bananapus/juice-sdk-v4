import { type Address, type Hex, type TransactionReceipt } from "viem";
import { afterEach, describe, expect, it, vi } from "vitest";
import { submitReviewedContractWrite } from "./contractWrite.js";
import { launchIntent } from "./intents.js";
import {
  checkedItLabel,
  SAVED_ATTEMPT_CONTINUE_ANYWAY_LABEL,
  SAVED_ATTEMPT_TAB_ONLY_LINE,
  SAVED_ATTEMPT_UNREADABLE_LINE,
  SAVED_ATTEMPT_CHECK_LINE,
  SAVED_ATTEMPT_CHECK_WARNING,
} from "./messages.js";
import {
  createSavedAttemptRecovery,
  type SavedAttempt,
  type SavedAttemptProof,
  type SavedAttemptScope,
} from "./savedAttempt.js";
import { intent } from "./writeIntent.js";
import {
  createWriteHold,
  type WriteHold,
  type WriteHoldClient,
  type WriteHoldGate,
  type WriteHoldHandle,
  type WriteHoldState,
} from "./writeHold.js";
import { createHeldWriteStorage } from "./writeRecovery.js";

const ACCOUNT = "0x1111111111111111111111111111111111111111" as Address;
const TARGET = "0x2222222222222222222222222222222222222222" as Address;
const HASH = `0x${"aa".repeat(32)}` as Hex;
const OTHER = `0x${"bb".repeat(32)}` as Hex;
const THIRD = `0x${"cc".repeat(32)}` as Hex;
const DATA = "0xaabbccdd0001" as Hex;
const CALL = { to: TARGET, data: DATA, value: 17n };
const NAMESPACE = launchIntent({
  chainId: 10,
  account: ACCOUNT,
  config: { salt: intent.hex(`0x${"01".repeat(32)}`), projectUri: "ipfs://a" },
});
const LEGACY = "launch:legacy:1";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  delete (globalThis as Record<symbol, unknown>)[
    Symbol.for("nana-sdk:held-writes")
  ];
});

/** The origin's storage, which a test can refuse to read or write. */
function origin() {
  const values = new Map<string, string>();
  const state = { read: true, write: true };
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
      values.set(key, value);
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

/** One browser (storage and locks); each `load()` is a fresh page or tab on it. */
function browser() {
  const site = origin();
  const memory = new Map<string, string>();
  const locks = lockManager();
  /** A page load; `tab` is its tab memory (a new Map: another tab, with nothing cached). */
  const load = (tab = memory) => {
    const storage = createHeldWriteStorage({
      durable: () => site.storage,
      memory: tab,
    });
    const hold = createWriteHold({
      storage,
      locks,
      settle: { intervalMs: 1_000, attempts: 3 },
    });
    const recovery = createSavedAttemptRecovery({ hold, storage, locks });
    return { hold, storage, recovery };
  };
  return { site, memory, locks, load };
}

const proven = <T>(value: T): SavedAttemptProof<T> => ({
  result: "proven",
  value,
});

function attemptOf(
  authenticate: SavedAttempt<string>["authenticate"],
  extra: Partial<SavedAttempt<string>> = {},
): SavedAttempt<string> {
  return {
    chainId: 10,
    account: ACCOUNT,
    namespaces: [NAMESPACE],
    call: CALL,
    authenticate: vi.fn(authenticate),
    confirmRetirable: vi.fn(async () => true),
    ...extra,
  };
}

/** Send the attempt's call under its namespace hold; the wallet replies `hash` (or loses its reply). */
async function sendUnder(
  hold: WriteHold,
  client: WriteHoldClient,
  hash?: Hex,
  namespace = NAMESPACE,
) {
  const handle = hold.open({
    chainId: 10,
    account: ACCOUNT,
    safe: false,
    namespace,
    call: CALL,
  });
  const { send } = hash ? wallet(async () => hash) : lostReply();
  await handle.send(client, send).catch(() => undefined);
  return handle;
}

describe("the shared check copy", () => {
  it("is the one line, warning and 'I checked it. ...' label", () => {
    expect(SAVED_ATTEMPT_CHECK_LINE).toMatch(
      /Check your wallet before sending again/,
    );
    expect(SAVED_ATTEMPT_CHECK_WARNING).toMatch(/send it twice/);
    expect(checkedItLabel()).toBe("I checked it. Review it again.");
    expect(checkedItLabel("Create again")).toBe("I checked it. Create again.");
    expect(checkedItLabel("Launch again.")).toBe("I checked it. Launch again.");
  });
});

describe("none: only on the hold's proof that nothing was sent", () => {
  it("is none for an attempt never reserved that the app saved as unsent", async () => {
    const { recovery } = browser().load();
    const { client } = fakeChain();
    const attempt = attemptOf(async () => ({ result: "unknown" }), {
      saved: { started: false },
    });
    expect(await recovery.recover(attempt, client)).toEqual({ status: "none" });
    expect(attempt.authenticate).not.toHaveBeenCalled();
    expect(recovery.canDiscard(attempt)).toBe(true);
  });

  it("is check, not none, when holds last in this tab alone (nothing proves it)", async () => {
    const page = browser();
    page.site.state.write = false;
    const { recovery } = page.load();
    const { client } = fakeChain();
    const outcome = await recovery.recover(
      attemptOf(async () => ({ result: "unknown" })),
      client,
    );
    expect(outcome.status).toBe("check");
  });

  // jbm 1: a saved unresolved submission whose SDK record is absent was read as permission to send.
  it("is check when the app saved a started send the hold has no record of", async () => {
    const { recovery } = browser().load();
    const { client } = fakeChain();
    const attempt = attemptOf(async () => ({ result: "unknown" }), {
      saved: { started: true },
    });
    const outcome = await recovery.recover(attempt, client);
    expect(outcome).toMatchObject({
      status: "check",
      line: SAVED_ATTEMPT_CHECK_LINE,
      warning: SAVED_ATTEMPT_CHECK_WARNING,
      reason: "Its transaction could not be shown here.",
    });
    expect(attempt.authenticate).toHaveBeenCalledWith(undefined);
  });

  // C': the SDK's own drop of a rejected reservation retires the attempt.
  it("is none, retired, after the wallet refused (or the send aborted before it opened)", async () => {
    const page = browser();
    const { hold, recovery } = page.load();
    const { client } = fakeChain();
    const handle = hold.open({
      chainId: 10,
      account: ACCOUNT,
      safe: false,
      namespace: NAMESPACE,
      call: CALL,
    });
    await handle.send(client, async (gate) => {
      await gate.beforeSend();
      gate.onRejected();
    });
    expect(handle.peek().status).toBe("clear");
    const attempt = attemptOf(async () => ({ result: "not-this" }), {
      saved: { started: true },
    });
    expect(await page.load().recovery.recover(attempt, client)).toEqual({
      status: "none",
      retired: "rejected",
    });
    expect(attempt.authenticate).not.toHaveBeenCalled();
    expect(recovery.canDiscard(attempt)).toBe(true);
    // A saved hash says the wallet answered: never retired on a rejection.
    const hashed = await recovery.recover(
      attemptOf(async () => ({ result: "unknown" }), {
        call: undefined,
        saved: { hash: HASH },
      }),
      client,
    );
    expect(hashed.status).toBe("check");
  });

  it("is check when only one namespace's reservation was rejected", async () => {
    const { hold, recovery } = browser().load();
    const { client } = fakeChain();
    const handle = hold.open({
      chainId: 10,
      account: ACCOUNT,
      safe: false,
      namespace: NAMESPACE,
      call: CALL,
    });
    await handle.send(client, async (gate) => {
      await gate.beforeSend();
      gate.onRejected();
    });
    // The legacy namespace's reservation ended without a saved settlement (a lost one).
    const legacy = await sendUnder(hold, client, HASH, LEGACY);
    const now = legacy.peek();
    if (now.status === "clear") throw new Error("expected held");
    await legacy
      .exit(
        { ...now, exit: true } as WriteHoldState,
        { checkedWallet: true },
        client,
      )
      .catch(() => undefined);
    const outcome = await recovery.recover(
      attemptOf(async () => ({ result: "unknown" }), {
        namespaces: [NAMESPACE, LEGACY],
        saved: { started: true },
      }),
      client,
    );
    expect(["check", "held"]).toContain(outcome.status);
    expect(outcome.status).not.toBe("none");
  });

  it("is check after a rejection whose marker storage refused to save", async () => {
    const page = browser();
    const base = createHeldWriteStorage({
      durable: () => page.site.storage,
      memory: page.memory,
    });
    const storage = {
      ...base,
      setItem: (key: string, value: string) => {
        if (key.endsWith(":rejected")) throw new Error("QuotaExceededError");
        base.setItem(key, value);
      },
    };
    const hold = createWriteHold({ storage, locks: page.locks });
    const recovery = createSavedAttemptRecovery({
      hold,
      storage,
      locks: page.locks,
    });
    const { client } = fakeChain();
    const handle = hold.open({
      chainId: 10,
      account: ACCOUNT,
      safe: false,
      namespace: NAMESPACE,
      call: CALL,
    });
    await handle.send(client, async (gate) => {
      await gate.beforeSend();
      gate.onRejected();
    });
    const outcome = await recovery.recover(
      attemptOf(async () => ({ result: "not-this" })),
      client,
    );
    expect(outcome).toMatchObject({
      status: "check",
      reason: "Its transaction is another write.",
    });
  });

  it("reads an unreadable rejection marker as none saved", async () => {
    const page = browser();
    const { hold, recovery } = page.load();
    const { client } = fakeChain();
    const handle = hold.open({
      chainId: 10,
      account: ACCOUNT,
      safe: false,
      namespace: NAMESPACE,
      call: CALL,
    });
    await handle.send(client, async (gate) => {
      await gate.beforeSend();
      gate.onRejected();
    });
    for (const key of page.site.values.keys())
      if (key.endsWith(":rejected")) page.site.values.set(key, "{");
    expect(
      (
        await recovery.recover(
          attemptOf(async () => ({ result: "unknown" })),
          client,
        )
      ).status,
    ).toBe("check");
  });
});

describe("held: the hold decides while it holds the write", () => {
  it("is held, with the hold's own state and handle, and blocks discard and retirement", async () => {
    const { hold, recovery } = browser().load();
    const { client } = fakeChain();
    await sendUnder(hold, client);
    const attempt = attemptOf(async () => proven("never asked"), {
      saved: { started: true },
    });
    const outcome = await recovery.recover(attempt, client);
    expect(outcome.status).toBe("held");
    if (outcome.status !== "held") throw new Error("unreachable");
    expect(outcome.state.status).toBe("held-no-hash");
    expect(attempt.authenticate).not.toHaveBeenCalled();
    expect(recovery.canDiscard(attempt)).toBe(false);
    expect((await recovery.retire(attempt, { by: "exit" })).retired).toBe(
      false,
    );
  });

  it("finds a hold under a legacy namespace", async () => {
    const { hold, recovery } = browser().load();
    const { client } = fakeChain();
    await sendUnder(hold, client, undefined, LEGACY);
    const outcome = await recovery.recover(
      attemptOf(async () => ({ result: "unknown" }), {
        namespaces: [NAMESPACE, LEGACY],
      }),
      client,
    );
    expect(outcome.status).toBe("held");
  });

  // Homerun 5: the exit is recorded only once the hold released it.
  it("retires on the user's exit only after the hold released it, for every later load", async () => {
    const page = browser();
    const { hold, recovery } = page.load();
    const { client } = fakeChain();
    await sendUnder(hold, client);
    const attempt = attemptOf(async () => ({ result: "unknown" }), {
      saved: { started: true },
    });
    const outcome = await recovery.recover(attempt, client);
    if (outcome.status !== "held") throw new Error("expected held");
    const ended = await outcome.handle.exit(
      await outcome.handle.state(client),
      { checkedWallet: true },
      client,
    );
    expect(ended.released).toBe(true);
    expect((await recovery.retire(attempt, { by: "exit" })).retired).toBe(true);
    const reloaded = page.load().recovery;
    expect(await reloaded.recover(attempt, client)).toEqual({
      status: "none",
      retired: "exit",
    });
    expect(reloaded.canDiscard(attempt)).toBe(true);
  });
});

describe("done: a settled success always wins", () => {
  // Settled before resume: the page closed after the hash, and it mined meanwhile.
  it("follows a success settled while the page was closed, through the app's check", async () => {
    const page = browser();
    const { chain, client } = fakeChain();
    await sendUnder(page.load().hold, client, HASH);
    chain.txs.push(sent(HASH, { block: 50n }));
    const { recovery } = page.load();
    const attempt = attemptOf(async (hash) =>
      hash === HASH ? proven("project 7") : { result: "not-this" },
    );
    expect(await recovery.recover(attempt, client)).toEqual({
      status: "done",
      result: "success",
      authenticated: true,
      hash: HASH,
      value: "project 7",
    });
    // Unfollowed, it blocks discard and the user's exit; followed, it retires.
    expect(recovery.canDiscard(attempt)).toBe(false);
    expect((await recovery.retire(attempt, { by: "exit" })).retired).toBe(
      false,
    );
    expect(
      (await recovery.retire(attempt, { by: "settled", hash: HASH })).retired,
    ).toBe(true);
    expect(recovery.canDiscard(attempt)).toBe(true);
    expect(await recovery.recover(attempt, client)).toEqual({
      status: "none",
      retired: "settled",
    });
    // Followed, the hold's success is acknowledged and blocks no new send.
    const handle = page.load().hold.open({
      chainId: 10,
      account: ACCOUNT,
      safe: false,
      namespace: NAMESPACE,
      call: CALL,
    });
    const now = handle.peek();
    expect(now.status === "clear" && now.settled).toMatchObject({
      result: "success",
      acknowledged: true,
    });
  });

  // The reload between the SDK saving the hash and the journal saving it.
  it("follows the hold's settlement when the app's journal never saved the hash", async () => {
    const page = browser();
    const { chain, client } = fakeChain();
    await sendUnder(page.load().hold, client, HASH);
    chain.txs.push(sent(HASH, { block: 50n }));
    const outcome = await page.load().recovery.recover(
      attemptOf(async (hash) => (hash ? proven("p") : { result: "unknown" }), {
        saved: { started: true },
      }),
      client,
    );
    expect(outcome).toMatchObject({ status: "done", hash: HASH });
  });

  // revnet 3: a settled success with an empty event read became permission to deploy again.
  it("follows the success by its hash alone when the app's check can't show it (empty logs)", async () => {
    const page = browser();
    const { chain, client } = fakeChain();
    await sendUnder(page.load().hold, client, HASH);
    chain.txs.push(sent(HASH, { block: 50n }));
    const { recovery } = page.load();
    const attempt = attemptOf(async () => ({ result: "unknown" }));
    const outcome = await recovery.recover(attempt, client);
    expect(outcome).toMatchObject({
      status: "done",
      result: "success",
      authenticated: false,
      hash: HASH,
    });
    expect(recovery.canDiscard(attempt)).toBe(false);
    expect((await recovery.retire(attempt, { by: "exit" })).retired).toBe(
      false,
    );
    // The saved hash, a different one, is tried too.
    const withSaved = attemptOf(
      async (hash) =>
        hash === OTHER ? proven("saved") : { result: "unknown" },
      { saved: { hash: OTHER } },
    );
    expect(await recovery.recover(withSaved, client)).toMatchObject({
      status: "done",
      hash: OTHER,
      value: "saved",
    });
  });

  it("ignores a settlement from before the attempt began", async () => {
    const page = browser();
    const { chain, client } = fakeChain();
    await sendUnder(page.load().hold, client, HASH);
    chain.txs.push(sent(HASH, { block: 50n }));
    const { recovery } = page.load();
    const attempt = attemptOf(async () => ({ result: "unknown" }), {
      saved: { before: [HASH] },
    });
    expect(await recovery.recover(attempt, client)).toMatchObject({
      status: "check",
    });
    expect(attempt.authenticate).toHaveBeenCalledWith(undefined);
    expect(recovery.canDiscard(attempt)).toBe(true);
  });

  it("is done failed on the hold's proven final revert", async () => {
    const page = browser();
    const { chain, client } = fakeChain();
    await sendUnder(page.load().hold, client, HASH);
    chain.txs.push(sent(HASH, { block: 50n, status: "reverted" }));
    const { recovery } = page.load();
    const attempt = attemptOf(async () => proven("never"));
    expect(await recovery.recover(attempt, client)).toEqual({
      status: "done",
      result: "failed",
      hash: HASH,
    });
    expect(recovery.canDiscard(attempt)).toBe(true);
  });

  // Settlement during exit: the exit finds it ran; the exit isn't recorded, the success is followed.
  it("refuses an exit retirement when the exit found the write settled, and follows it", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const page = browser();
    const { chain, client } = fakeChain();
    const { hold, recovery } = page.load();
    await sendUnder(hold, client, HASH);
    chain.hidden.add(HASH.toLowerCase());
    vi.setSystemTime(Date.now() + 31 * 60_000);
    const attempt = attemptOf(async (hash) =>
      hash === HASH ? proven("ran") : { result: "unknown" },
    );
    const outcome = await recovery.recover(attempt, client);
    if (outcome.status !== "held") throw new Error("expected held");
    expect(outcome.state.status).toBe("held-unchecked");
    const snapshot = await outcome.handle.state(client);
    expect(snapshot.status !== "clear" && snapshot.exit).toBe(true);
    chain.hidden.clear();
    chain.txs.push(sent(HASH, { block: 50n }));
    const ended = await outcome.handle.exit(
      snapshot,
      { checkedWallet: true },
      client,
    );
    expect(ended.released).toBe(false);
    expect((await recovery.retire(attempt, { by: "exit" })).retired).toBe(
      false,
    );
    expect(await recovery.recover(attempt, client)).toMatchObject({
      status: "done",
      value: "ran",
    });
  });
});

describe("adoption of a saved hash the hold doesn't know (a main-era record)", () => {
  it("holds a pending saved hash adopted against the exact call", async () => {
    const { recovery } = browser().load();
    const { chain, client } = fakeChain();
    chain.txs.push(sent(HASH));
    const outcome = await recovery.recover(
      attemptOf(async () => ({ result: "unknown" }), {
        saved: { hash: HASH, started: true, submittedAt: Date.now() },
      }),
      client,
    );
    expect(outcome).toMatchObject({
      status: "held",
      state: { status: "pending-known-hash" },
    });
  });

  it("follows a mined saved hash through its verified receipt and the app's check", async () => {
    const { recovery } = browser().load();
    const { chain, client } = fakeChain();
    chain.txs.push(sent(HASH, { block: 50n }));
    const outcome = await recovery.recover(
      attemptOf(
        async (hash) =>
          hash === HASH ? proven("main era") : { result: "unknown" },
        {
          saved: { hash: HASH },
        },
      ),
      client,
    );
    expect(outcome).toMatchObject({ status: "done", value: "main era" });
  });

  // Sticky 5, Homerun 2: adoption refused (another call at the hash) left no exit.
  it("is check when adoption is refused and the app can't show the hash", async () => {
    const { recovery } = browser().load();
    const { chain, client } = fakeChain();
    chain.txs.push(sent(HASH, { block: 50n, input: "0xdeadbeef" }));
    const outcome = await recovery.recover(
      attemptOf(async () => ({ result: "not-this" }), {
        saved: { hash: HASH },
      }),
      client,
    );
    expect(outcome).toMatchObject({
      status: "check",
      reason:
        "Its saved transaction is not this write. Its transaction is another write.",
    });
  });

  it("is done when adoption is refused (a rebuilt call) but the app's check shows the hash", async () => {
    const { recovery } = browser().load();
    const { chain, client } = fakeChain();
    chain.txs.push(sent(HASH, { block: 50n, input: "0xdeadbeef" }));
    const outcome = await recovery.recover(
      attemptOf(async () => proven("rebuilt"), { saved: { hash: HASH } }),
      client,
    );
    expect(outcome).toMatchObject({ status: "done", hash: HASH });
  });

  // Sticky 5: getChainId failing left adoption unread and no exit.
  it("is check when adoption can't read the chain", async () => {
    const { recovery } = browser().load();
    const { client } = fakeChain();
    client.getChainId.mockRejectedValue(new Error("rpc down"));
    const outcome = await recovery.recover(
      attemptOf(async () => ({ result: "unknown", reason: "rpc down" }), {
        saved: { hash: HASH },
      }),
      client,
    );
    expect(outcome).toMatchObject({ status: "check" });
    if (outcome.status !== "check") throw new Error("unreachable");
    expect(outcome.reason).toContain(
      "Its saved transaction could not be read.",
    );
  });

  it("asks the app's check of a saved hash when no call was kept", async () => {
    const { recovery } = browser().load();
    const { client } = fakeChain();
    const attempt = attemptOf(async () => proven("by hash"), {
      call: undefined,
      saved: { hash: HASH },
    });
    expect(await recovery.recover(attempt, client)).toEqual({
      status: "done",
      result: "success",
      authenticated: true,
      hash: HASH,
      value: "by hash",
    });
    // Discovery without a hash: no hash on the outcome.
    const found = await recovery.recover(
      attemptOf(async () => proven("found"), { saved: { started: true } }),
      client,
    );
    expect(found).toEqual({
      status: "done",
      result: "success",
      authenticated: true,
      value: "found",
    });
  });
});

describe("check: every failure reaches the one explicit action", () => {
  // Homerun 3 and 7: a recovery error or an authentication throw was a dead end.
  it("turns a throwing check into check, never a throw", async () => {
    const { recovery } = browser().load();
    const { client } = fakeChain();
    const outcome = await recovery.recover(
      attemptOf(
        async () => {
          throw new Error("logs unavailable");
        },
        { saved: { started: true } },
      ),
      client,
    );
    expect(outcome).toMatchObject({
      status: "check",
      reason: "logs unavailable",
    });
    const odd = await recovery.recover(
      attemptOf(
        async () => {
          throw "plain";
        },
        { saved: { started: true } },
      ),
      client,
    );
    expect(odd).toMatchObject({ status: "check", reason: "plain" });
  });

  // jbm 2, revnet 4, Homerun 4 (Invariant A): only saved inputs; a dead chain still reaches the exit.
  it("needs only what was saved: a chain whose every read fails still reaches check", async () => {
    const { recovery } = browser().load();
    const dead = new Proxy(
      {},
      {
        get: () => async () => {
          throw new Error("down");
        },
      },
    ) as WriteHoldClient;
    const outcome = await recovery.recover(
      attemptOf(async () => ({ result: "unknown" }), {
        saved: { hash: HASH, started: true },
      }),
      dead,
    );
    expect(outcome.status).toBe("check");
  });

  it("is check when storage can't be read, and its check action waits until the hold can be read", async () => {
    const page = browser();
    const { recovery } = page.load();
    const { client } = fakeChain();
    page.site.state.read = false;
    page.site.state.write = false;
    const attempt = attemptOf(async () => ({ result: "unknown" }), {
      saved: { started: true },
    });
    const outcome = await recovery.recover(attempt, client);
    expect(outcome.status).toBe("check");
    if (outcome.status !== "check") throw new Error("unreachable");
    expect(
      (await recovery.retire(attempt, { by: "check", outcome })).retired,
    ).toBe(false);
    // Readable again (holds kept in this tab), its check action retires it there.
    page.site.state.read = true;
    const again = await recovery.recover(attempt, client);
    if (again.status !== "check") throw new Error("expected check");
    expect(
      await recovery.retire(attempt, { by: "check", outcome: again }),
    ).toEqual({
      retired: true,
      durable: false,
    });
  });

  it("is check for an attempt with no namespace, which can't be retired or discarded", async () => {
    const { recovery } = browser().load();
    const { client } = fakeChain();
    const attempt = attemptOf(async () => proven("x"), { namespaces: [] });
    expect(await recovery.recover(attempt, client)).toMatchObject({
      status: "check",
      reason: "A saved attempt names at least one namespace.",
    });
    expect((await recovery.retire(attempt, { by: "exit" })).retired).toBe(
      false,
    );
    expect(recovery.canDiscard(attempt)).toBe(false);
  });

  // Homerun 6: the check action was transient React state.
  it("persists the user's check action for every tab and reload, and for discard", async () => {
    const page = browser();
    const { recovery } = page.load();
    const { client } = fakeChain();
    const attempt = attemptOf(async () => ({ result: "unknown" }), {
      saved: { started: true },
    });
    const outcome = await recovery.recover(attempt, client);
    if (outcome.status !== "check") throw new Error("expected check");
    expect(
      (await recovery.retire(attempt, { by: "check", outcome })).retired,
    ).toBe(true);
    const other = page.load().recovery;
    expect(await other.recover(attempt, client)).toEqual({
      status: "none",
      retired: "check",
    });
    expect(other.canDiscard(attempt)).toBe(true);
  });

  it("refuses a check action on evidence that changed since it was shown", async () => {
    const page = browser();
    const { hold, recovery } = page.load();
    const { client } = fakeChain();
    const attempt = attemptOf(async () => ({ result: "unknown" }), {
      saved: { started: true },
    });
    const outcome = await recovery.recover(attempt, client);
    if (outcome.status !== "check") throw new Error("expected check");
    const handle = hold.open({
      chainId: 10,
      account: ACCOUNT,
      safe: false,
      namespace: NAMESPACE,
      call: CALL,
    });
    await handle.send(client, async (gate) => {
      await gate.beforeSend();
      gate.onRejected();
    });
    expect(
      (await recovery.retire(attempt, { by: "check", outcome })).retired,
    ).toBe(false);
  });

  // Invariant D: a success that lands after the check action still wins.
  it("lets a success after a retirement win over it", async () => {
    const page = browser();
    const { hold, recovery } = page.load();
    const { chain, client } = fakeChain();
    const attempt = attemptOf(
      async (hash) =>
        hash === THIRD ? proven("later") : { result: "unknown" },
      { saved: { started: true } },
    );
    const outcome = await recovery.recover(attempt, client);
    if (outcome.status !== "check") throw new Error("expected check");
    expect(
      (await recovery.retire(attempt, { by: "check", outcome })).retired,
    ).toBe(true);
    await sendUnder(hold, client, THIRD);
    chain.txs.push(sent(THIRD, { block: 60n }));
    expect(await recovery.recover(attempt, client)).toMatchObject({
      status: "done",
      hash: THIRD,
      value: "later",
    });
  });

  it("refuses to retire while a namespace lock is busy, or when storage drops the record", async () => {
    const page = browser();
    const { recovery } = page.load();
    const { client } = fakeChain();
    const attempt = attemptOf(async () => ({ result: "unknown" }), {
      saved: { started: true },
    });
    const outcome = await recovery.recover(attempt, client);
    if (outcome.status !== "check") throw new Error("expected check");
    let busy!: () => void;
    const held = page.locks.request(
      `nana-sdk:reviewed-write:v1:namespace:10:${ACCOUNT.toLowerCase()}:${NAMESPACE}`,
      { mode: "exclusive" },
      () => new Promise<void>((resolve) => (busy = resolve)),
    );
    await Promise.resolve();
    expect(
      (await recovery.retire(attempt, { by: "check", outcome })).retired,
    ).toBe(false);
    busy();
    await held;
    const dropping = createSavedAttemptRecovery({
      hold: page.load().hold,
      storage: {
        ...createHeldWriteStorage({
          durable: () => page.site.storage,
          memory: page.memory,
        }),
        setItem: () => {},
      },
      locks: page.locks,
    });
    expect(
      (await dropping.retire(attempt, { by: "check", outcome })).retired,
    ).toBe(false);
  });
});

describe("retiring a followed settlement", () => {
  it("retires a settlement without a hash, acknowledging every success shown", async () => {
    const page = browser();
    const { chain, client } = fakeChain();
    await sendUnder(page.load().hold, client, HASH);
    chain.txs.push(sent(HASH, { block: 50n }));
    const { recovery } = page.load();
    const attempt = attemptOf(async () => proven("p"));
    await recovery.recover(attempt, client);
    expect((await recovery.retire(attempt, { by: "settled" })).retired).toBe(
      true,
    );
    expect(recovery.canDiscard(attempt)).toBe(true);
  });
});

/** A hold whose handles answer what a test sets, for the paths a real chain can't reach cheaply. */
function stubHold(answer: Partial<WriteHoldHandle>, durable = true) {
  const clear = { status: "clear" } as WriteHoldState;
  const handle = {
    peek: () => clear,
    state: async () => clear,
    adopt: async () => clear,
    attachSafeNonce: async () => clear,
    acknowledge: async () => clear,
    ...answer,
  } as unknown as WriteHoldHandle;
  const hold = {
    open: () => handle,
    durable: () => durable,
  } as unknown as WriteHold;
  return { hold, handle };
}

describe("the paths a stub hold reaches", () => {
  const client = {} as WriteHoldClient;

  it("saves a Safe proposal's nonce after adopting it, and holds it", async () => {
    const heldState = {
      status: "pending-known-hash",
      record: {},
      hash: HASH,
      exit: false,
      line: "awaiting",
    } as unknown as WriteHoldState;
    const attachSafeNonce = vi.fn(async () => heldState);
    const { hold } = stubHold({
      adopt: (async () => heldState) as never,
      attachSafeNonce: attachSafeNonce as never,
    });
    const recovery = createSavedAttemptRecovery({
      hold,
      storage: createHeldWriteStorage({ memory: new Map() }),
      locks: lockManager(),
    });
    const outcome = await recovery.recover(
      attemptOf(async () => ({ result: "unknown" }), {
        saved: { safeTxHash: HASH, safeNonce: 5 },
      }),
      client,
    );
    expect(outcome.status).toBe("held");
    expect(attachSafeNonce).toHaveBeenCalledWith(client, {
      safeTxHash: HASH,
      nonce: 5,
    });
  });

  it("follows a settlement the adoption itself returned, and ignores a proven expiry", async () => {
    const settledState = {
      status: "clear",
      settled: { result: "success", hash: HASH },
    } as WriteHoldState;
    const { hold } = stubHold({
      state: (async () =>
        ({
          status: "clear",
          settled: { result: "expired" },
        }) as WriteHoldState) as never,
      adopt: (async () => settledState) as never,
    });
    const recovery = createSavedAttemptRecovery({
      hold,
      storage: createHeldWriteStorage({ memory: new Map() }),
      locks: lockManager(),
    });
    expect(
      await recovery.recover(
        attemptOf(async () => proven("adopted"), { saved: { hash: HASH } }),
        client,
      ),
    ).toMatchObject({ status: "done", hash: HASH });
  });

  it("asks the saved hash only once when it is the settled one", async () => {
    const settledState = {
      status: "clear",
      settled: { result: "success", hash: HASH },
    } as WriteHoldState;
    const { hold } = stubHold({
      peek: (() => settledState) as never,
      state: (async () => settledState) as never,
    });
    const recovery = createSavedAttemptRecovery({
      hold,
      storage: createHeldWriteStorage({ memory: new Map() }),
      locks: lockManager(),
    });
    const attempt = attemptOf(async () => ({ result: "unknown" }), {
      saved: { hash: HASH },
    });
    expect(await recovery.recover(attempt, client)).toMatchObject({
      status: "done",
      authenticated: false,
      hash: HASH,
    });
    expect(attempt.authenticate).toHaveBeenCalledTimes(1);
    // An already acknowledged one is not acknowledged again.
    const acknowledged = {
      status: "clear",
      settled: { result: "success", hash: HASH, acknowledged: true },
    } as WriteHoldState;
    const acknowledge = vi.fn(async () => acknowledged);
    const again = stubHold({
      peek: (() => acknowledged) as never,
      acknowledge: acknowledge as never,
    });
    // The hold's default storage and locks by default.
    const other = createSavedAttemptRecovery({ hold: again.hold });
    expect(
      (await other.retire(attempt, { by: "settled", hash: OTHER })).retired,
    ).toBe(true);
    expect(acknowledge).not.toHaveBeenCalled();
  });

  it("falls back to the saved record when a hold's chain read throws, and reads the stub's empty proof", async () => {
    const { hold } = stubHold({
      state: (async () => {
        throw new Error("rpc");
      }) as never,
    });
    const recovery = createSavedAttemptRecovery({
      hold,
      storage: createHeldWriteStorage({ memory: new Map() }),
      locks: lockManager(),
    });
    const outcome = await recovery.recover(
      attemptOf(async () => undefined as never, { saved: { started: true } }),
      client,
    );
    expect(outcome).toMatchObject({
      status: "check",
      reason: "Its transaction could not be shown here.",
    });
  });

  it("is check with no retirable evidence when even the saved record can't be read", async () => {
    const fail = (async () => {
      throw new Error("unreadable");
    }) as never;
    const { hold } = stubHold({
      state: fail,
      peek: (() => {
        throw new Error("unreadable");
      }) as never,
    });
    const recovery = createSavedAttemptRecovery({
      hold,
      storage: createHeldWriteStorage({ memory: new Map() }),
      locks: lockManager(),
    });
    expect(
      await recovery.recover(
        attemptOf(async () => proven("x")),
        client,
      ),
    ).toMatchObject({ status: "check", reason: "unreadable", evidence: "" });
  });
});

describe("review round: success, mirrors, ordering and tab-only retirement", () => {
  // 1: a settled success the app can't show is never a retirable check.
  it("returns an unauthenticated done for a settled success the app can't show, retirable only as followed", async () => {
    const page = browser();
    const { chain, client } = fakeChain();
    await sendUnder(page.load().hold, client, HASH);
    chain.txs.push(sent(HASH, { block: 50n }));
    const { recovery } = page.load();
    const attempt = attemptOf(async () => {
      throw new Error("logs unavailable");
    });
    const outcome = await recovery.recover(attempt, client);
    expect(outcome).toEqual({
      status: "done",
      result: "success",
      hash: HASH,
      authenticated: false,
      reason: "logs unavailable",
    });
    expect(recovery.canDiscard(attempt)).toBe(false);
    // A check action can't retire it, even on evidence that matches now.
    const now = page
      .load()
      .hold.open({
        chainId: 10,
        account: ACCOUNT,
        safe: false,
        namespace: NAMESPACE,
        call: CALL,
      })
      .peek();
    const evidence = JSON.stringify({
      saved: null,
      holds: [[NAMESPACE, now.reservation, "clear", HASH]],
    });
    expect(
      (
        await recovery.retire(attempt, {
          by: "check",
          outcome: {
            status: "check",
            reason: "",
            line: SAVED_ATTEMPT_CHECK_LINE,
            warning: SAVED_ATTEMPT_CHECK_WARNING,
            evidence,
          },
        })
      ).retired,
    ).toBe(false);
    expect((await recovery.retire(attempt, { by: "exit" })).retired).toBe(
      false,
    );
    expect(recovery.canDiscard(attempt)).toBe(false);
    expect(
      (await recovery.retire(attempt, { by: "settled", hash: HASH })).retired,
    ).toBe(true);
    expect(recovery.canDiscard(attempt)).toBe(true);
  });

  // 2: C' across mirrors: a rejected intent send with legacy keys retires on its own.
  it("retires a rejected send whose reservation was mirrored under legacy namespaces", async () => {
    const page = browser();
    const { hold, recovery } = page.load();
    const { client } = fakeChain();
    const handle = hold.open(
      {
        chainId: 10,
        account: ACCOUNT,
        safe: false,
        namespace: NAMESPACE,
        call: CALL,
      },
      { legacy: [LEGACY] },
    );
    await handle.send(client, async (gate) => {
      await gate.beforeSend();
      gate.onRejected();
    });
    expect(
      await recovery.recover(
        attemptOf(async () => ({ result: "unknown" }), {
          namespaces: [NAMESPACE, LEGACY],
          saved: { started: true },
        }),
        client,
      ),
    ).toEqual({ status: "none", retired: "rejected" });
  });

  // 4: a settlement that lands while the app's check runs is evaluated, never covered by a stale check.
  it("re-evaluates when the hold settles during the app's check", async () => {
    const page = browser();
    const { hold, recovery } = page.load();
    const { chain, client } = fakeChain();
    let landed = false;
    const attempt = attemptOf(
      async (hash) => {
        if (hash === HASH) return proven("landed");
        if (!landed) {
          landed = true;
          await sendUnder(hold, client, HASH);
          chain.txs.push(sent(HASH, { block: 50n }));
          await hold
            .open({
              chainId: 10,
              account: ACCOUNT,
              safe: false,
              namespace: NAMESPACE,
              call: CALL,
            })
            .state(client);
        }
        return { result: "unknown" };
      },
      { saved: { started: true } },
    );
    expect(await recovery.recover(attempt, client)).toMatchObject({
      status: "done",
      hash: HASH,
      value: "landed",
      authenticated: true,
    });
  });

  it("binds a check to the evidence it evaluated: one that changes every pass can't be retired", async () => {
    const page = browser();
    const { hold, recovery } = page.load();
    const { client } = fakeChain();
    const attempt = attemptOf(
      async () => {
        // Every pass, another rejected reservation changes the evidence.
        await hold
          .open({
            chainId: 10,
            account: ACCOUNT,
            safe: false,
            namespace: NAMESPACE,
            call: CALL,
          })
          .send(client, async (gate) => {
            await gate.beforeSend();
            gate.onRejected();
          });
        return { result: "unknown" };
      },
      { saved: { started: true, hash: OTHER }, call: undefined },
    );
    const outcome = await recovery.recover(attempt, client);
    if (outcome.status !== "check") throw new Error("expected check");
    expect(
      (await recovery.retire(attempt, { by: "check", outcome })).retired,
    ).toBe(false);
  });

  // 5: tab-only retirement is distinct.
  it("says whether a retirement outlives the tab", async () => {
    const page = browser();
    const { recovery } = page.load();
    const { client } = fakeChain();
    const attempt = attemptOf(async () => ({ result: "unknown" }), {
      saved: { started: true },
    });
    let outcome = await recovery.recover(attempt, client);
    if (outcome.status !== "check") throw new Error("expected check");
    expect(await recovery.retire(attempt, { by: "check", outcome })).toEqual({
      retired: true,
      durable: true,
    });
    const tab = browser();
    tab.site.state.write = false;
    const only = tab.load().recovery;
    outcome = await only.recover(attempt, client);
    if (outcome.status !== "check") throw new Error("expected check");
    expect(await only.retire(attempt, { by: "check", outcome })).toEqual({
      retired: true,
      durable: false,
    });
  });
});

describe("review round 2: one snapshot, a success after exhausted passes, per-commit durability", () => {
  const client = {} as WriteHoldClient;

  // 2: a success that lands between the hold's read and the fingerprint is not hidden.
  it("fingerprints the snapshot it evaluated, and returns a success found after the last pass", async () => {
    const landed = {
      status: "clear",
      reservation: "r1",
      settled: { result: "success", hash: HASH },
    } as WriteHoldState;
    const { hold } = stubHold({
      state: (async () =>
        ({ status: "clear", reservation: "r1" }) as WriteHoldState) as never,
      peek: (() => landed) as never,
    });
    const recovery = createSavedAttemptRecovery({
      hold,
      storage: createHeldWriteStorage({ memory: new Map() }),
      locks: lockManager(),
    });
    const attempt = attemptOf(async () => ({ result: "unknown" }), {
      saved: { started: true },
    });
    expect(await recovery.recover(attempt, client)).toEqual({
      status: "done",
      result: "success",
      authenticated: false,
      hash: HASH,
      reason: "Its transaction could not be shown here.",
    });
  });

  it("returns the success that lands on the last pass of a moving check", async () => {
    const page = browser();
    const { hold, recovery } = page.load();
    const { chain, client } = fakeChain();
    const open = () =>
      hold.open({
        chainId: 10,
        account: ACCOUNT,
        safe: false,
        namespace: NAMESPACE,
        call: CALL,
      });
    let calls = 0;
    const attempt = attemptOf(
      async (hash) => {
        if (hash !== OTHER) return { result: "unknown" };
        calls += 1;
        if (calls < 3)
          await open().send(client, async (gate) => {
            await gate.beforeSend();
            gate.onRejected();
          });
        else {
          await sendUnder(hold, client, HASH);
          chain.txs.push(sent(HASH, { block: 50n }));
          await open().state(client);
        }
        return { result: "unknown" };
      },
      { saved: { started: true, hash: OTHER }, call: undefined },
    );
    expect(await recovery.recover(attempt, client)).toMatchObject({
      status: "done",
      result: "success",
      authenticated: false,
      hash: HASH,
    });
  });

  // 3: a retirement kept only in memory says so, even while the probe still writes.
  it("reports the durability of the retirement's own commit", async () => {
    const page = browser();
    const setItem = page.site.storage.setItem;
    page.site.storage.setItem = (key: string, value: string) => {
      if (key.startsWith("nana-sdk:saved-attempt:retired:"))
        throw new Error("QuotaExceededError");
      setItem(key, value);
    };
    const { recovery } = page.load();
    const { client } = fakeChain();
    const attempt = attemptOf(async () => ({ result: "unknown" }), {
      saved: { started: true },
    });
    const outcome = await recovery.recover(attempt, client);
    if (outcome.status !== "check") throw new Error("expected check");
    expect(await recovery.retire(attempt, { by: "check", outcome })).toEqual({
      retired: true,
      durable: false,
    });
  });

  it("reports a retirement in storage that can't say where a key lives as not durable", async () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => void values.set(key, value),
      removeItem: (key: string) => void values.delete(key),
      durable: () => true,
    };
    const hold = createWriteHold({ storage, locks: lockManager() });
    const recovery = createSavedAttemptRecovery({
      hold,
      storage,
      locks: lockManager(),
    });
    const { client } = fakeChain();
    const attempt = attemptOf(async () => ({ result: "unknown" }), {
      saved: { started: true },
    });
    const outcome = await recovery.recover(attempt, client);
    if (outcome.status !== "check") throw new Error("expected check");
    expect(await recovery.retire(attempt, { by: "check", outcome })).toEqual({
      retired: true,
      durable: false,
    });
  });
});

describe("review round 3: rule E across tabs, unreadable settlements, and positive proof of unsent", () => {
  // 1: a success one tab's check proved can't be retired by another tab's stale check.
  it("persists an authenticated success so no tab's check or exit retires it", async () => {
    const page = browser();
    const a = page.load().recovery;
    const b = page.load().recovery;
    const { client } = fakeChain();
    const unknown = attemptOf(async () => ({ result: "unknown" }), {
      saved: { started: true },
    });
    const outcome = await a.recover(unknown, client);
    if (outcome.status !== "check") throw new Error("expected check");
    const provenAttempt = attemptOf(async () => proven("launched"), {
      saved: { started: true },
    });
    expect(await b.recover(provenAttempt, client)).toMatchObject({
      status: "done",
      authenticated: true,
      value: "launched",
    });
    expect((await a.retire(unknown, { by: "check", outcome })).retired).toBe(
      false,
    );
    expect((await a.retire(unknown, { by: "exit" })).retired).toBe(false);
    expect(a.canDiscard(unknown)).toBe(false);
    // A tab whose own check can't show it still follows it.
    expect(await a.recover(unknown, client)).toMatchObject({
      status: "done",
      result: "success",
      authenticated: false,
    });
    // Followed, it retires.
    expect((await b.retire(provenAttempt, { by: "settled" })).retired).toBe(
      true,
    );
    expect(a.canDiscard(unknown)).toBe(true);
    expect(await a.recover(unknown, client)).toEqual({
      status: "none",
      retired: "settled",
    });
  });

  it("gives the app's journal a final say under the lock", async () => {
    const { recovery } = browser().load();
    const { client } = fakeChain();
    const attempt = attemptOf(async () => ({ result: "unknown" }), {
      saved: { started: true },
    });
    const outcome = await recovery.recover(attempt, client);
    if (outcome.status !== "check") throw new Error("expected check");
    const refused = { ...attempt, confirmRetirable: vi.fn(async () => false) };
    expect(
      (await recovery.retire(refused, { by: "check", outcome })).retired,
    ).toBe(false);
    const throws = {
      ...attempt,
      confirmRetirable: vi.fn(async () => {
        throw new Error("journal unreadable");
      }),
    };
    expect((await recovery.retire(throws, { by: "exit" })).retired).toBe(false);
    const allowed = { ...attempt, confirmRetirable: vi.fn(async () => true) };
    expect(
      (await recovery.retire(allowed, { by: "check", outcome })).retired,
    ).toBe(true);
    expect(allowed.confirmRetirable).toHaveBeenCalledTimes(1);
  });

  // 2: a settlement that can't be read is never "clear" to a retirement.
  it("refuses retirement while a settlement, the marker or the record can't be read", async () => {
    const page = browser();
    const { chain, client } = fakeChain();
    await sendUnder(page.load().hold, client, HASH);
    chain.txs.push(sent(HASH, { block: 50n }));
    const { recovery } = page.load();
    const attempt = attemptOf(async () => ({ result: "unknown" }), {
      saved: { started: true },
    });
    await recovery.recover(attempt, client);
    const getItem = page.site.storage.getItem;
    page.site.storage.getItem = (key: string) => {
      if (key.endsWith(":settled")) throw new Error("SecurityError");
      return getItem(key);
    };
    expect((await recovery.retire(attempt, { by: "exit" })).retired).toBe(
      false,
    );
    page.site.storage.getItem = (key: string) => {
      if (key.startsWith("nana-sdk:saved-attempt:"))
        throw new Error("SecurityError");
      return getItem(key);
    };
    expect((await recovery.retire(attempt, { by: "exit" })).retired).toBe(
      false,
    );
    page.site.storage.getItem = getItem;
    // A corrupted settlement is unresolved too.
    for (const key of page.site.values.keys())
      if (key.endsWith(":settled")) page.site.values.set(key, "{");
    expect((await recovery.retire(attempt, { by: "exit" })).retired).toBe(
      false,
    );
  });

  // 4: none needs positive evidence that nothing was sent.
  it("is check, after the app's check, for an attempt saved without saying it was unsent", async () => {
    const { recovery } = browser().load();
    const { client } = fakeChain();
    for (const saved of [
      undefined,
      {},
      { nonce: 7, fromBlock: 1n },
      { started: false, nonce: 7, fromBlock: 1n },
      { started: false, submittedAt: 1 },
    ]) {
      const attempt = attemptOf(async () => ({ result: "unknown" }), { saved });
      expect((await recovery.recover(attempt, client)).status).toBe("check");
      expect(attempt.authenticate).toHaveBeenCalledWith(undefined);
    }
  });

  it("follows another tab's proven success by its saved hash, and keeps a done when the marker can't be saved", async () => {
    const page = browser();
    const a = page.load().recovery;
    const b = page.load().recovery;
    const { client } = fakeChain();
    const saved = { started: true, hash: HASH };
    expect(
      await b.recover(
        attemptOf(async () => proven("b"), { call: undefined, saved }),
        client,
      ),
    ).toMatchObject({ status: "done", authenticated: true, hash: HASH });
    expect(
      await a.recover(
        attemptOf(async () => ({ result: "unknown" }), {
          call: undefined,
          saved,
        }),
        client,
      ),
    ).toMatchObject({ status: "done", authenticated: false, hash: HASH });
    // Storage that refuses the marker: the outcome is still done.
    const base = createHeldWriteStorage({ memory: new Map() });
    const storage = {
      ...base,
      setItem: (key: string, value: string) => {
        if (key.startsWith("nana-sdk:saved-attempt:success:"))
          throw new Error("QuotaExceededError");
        base.setItem(key, value);
      },
    };
    const refusing = createSavedAttemptRecovery({
      hold: createWriteHold({ storage, locks: lockManager() }),
      storage,
      locks: lockManager(),
    });
    expect(
      await refusing.recover(
        attemptOf(async () => proven("c"), { call: undefined, saved }),
        client,
      ),
    ).toMatchObject({ status: "done", authenticated: true });
  });

  it("retires in this tab alone when there is no browser storage at all", async () => {
    const storage = createHeldWriteStorage({
      durable: () => {
        throw new Error("SecurityError");
      },
      memory: new Map(),
    });
    const recovery = createSavedAttemptRecovery({
      hold: createWriteHold({ storage, locks: lockManager() }),
      storage,
      locks: lockManager(),
    });
    const { client } = fakeChain();
    const attempt = attemptOf(async () => ({ result: "unknown" }), {
      saved: { started: true },
    });
    const outcome = await recovery.recover(attempt, client);
    if (outcome.status !== "check") throw new Error("expected check");
    expect(await recovery.retire(attempt, { by: "check", outcome })).toEqual({
      retired: true,
      durable: false,
    });
  });
});

describe("review round 4: rule E under concurrency, strict reads for none and discard, unreadable storage", () => {
  /** Make every read of a saved hold or attempt key throw, as a storage policy does; the probe still works. */
  function unreadable(
    site: ReturnType<typeof origin>,
    match = (key: string) =>
      key.startsWith("nana-sdk:reviewed-write:v") ||
      key.startsWith("nana-sdk:saved-attempt:"),
  ) {
    const getItem = site.storage.getItem;
    site.storage.getItem = (key: string) => {
      if (match(key)) throw new Error("SecurityError");
      return getItem(key);
    };
    return () => {
      site.storage.getItem = getItem;
    };
  }

  // 1: a domain success proved while another tab retired the check still wins.
  it("lets a proven success override a check retirement made while it was being proved", async () => {
    const page = browser();
    const b = page.load().recovery;
    const a = page.load().recovery;
    const { client } = fakeChain();
    const unknown = attemptOf(async () => ({ result: "unknown" }), {
      saved: { started: true },
    });
    const outcome = await b.recover(unknown, client);
    if (outcome.status !== "check") throw new Error("expected check");
    const racing = attemptOf(
      async () => {
        expect(
          (await b.retire(unknown, { by: "check", outcome })).retired,
        ).toBe(true);
        return proven("raced");
      },
      { saved: { started: true } },
    );
    expect(await a.recover(racing, client)).toMatchObject({
      status: "done",
      authenticated: true,
    });
    expect(await page.load().recovery.recover(unknown, client)).toMatchObject({
      status: "done",
      result: "success",
      authenticated: false,
    });
    expect(b.canDiscard(unknown)).toBe(false);
  });

  // 2: the app's journal re-read is required for check and exit.
  it("refuses a check or exit retirement from a scope without confirmRetirable", async () => {
    const { recovery } = browser().load();
    const { client } = fakeChain();
    const attempt = attemptOf(async () => ({ result: "unknown" }), {
      saved: { started: true },
    });
    const outcome = await recovery.recover(attempt, client);
    if (outcome.status !== "check") throw new Error("expected check");
    const { confirmRetirable: _, ...without } = attempt;
    // @ts-expect-error confirmRetirable is required
    const scope: SavedAttemptScope = without;
    expect(
      (await recovery.retire(scope, { by: "check", outcome })).retired,
    ).toBe(false);
    expect((await recovery.retire(scope, { by: "exit" })).retired).toBe(false);
  });

  // 4: none needs strict reads proving no reservation.
  it("is check, not none, when the hold's records can't be read in a fresh tab", async () => {
    const page = browser();
    const { client } = fakeChain();
    await sendUnder(page.load().hold, client);
    unreadable(page.site);
    const { recovery } = page.load(new Map());
    const attempt = attemptOf(async () => ({ result: "unknown" }), {
      saved: { started: false },
    });
    expect((await recovery.recover(attempt, client)).status).toBe("check");
  });

  // 5: discard reads strictly too.
  it("refuses discard when a settled success can't be read in a fresh tab", async () => {
    const page = browser();
    const { chain, client } = fakeChain();
    await sendUnder(page.load().hold, client, HASH);
    chain.txs.push(sent(HASH, { block: 50n }));
    await page
      .load()
      .hold.open({
        chainId: 10,
        account: ACCOUNT,
        safe: false,
        namespace: NAMESPACE,
        call: CALL,
      })
      .state(client);
    unreadable(page.site, (key) => key.endsWith(":settled"));
    const { recovery } = page.load(new Map());
    expect(recovery.canDiscard(attemptOf(async () => proven("x")))).toBe(false);
  });

  // 6: storage that exists but can't be read: refused, then the warned tab-only exit.
  it("refuses a check retirement as unreadable, then retires in this tab on the warned exit", async () => {
    const page = browser();
    const { client } = fakeChain();
    const restore = unreadable(page.site);
    const { recovery } = page.load(new Map());
    const attempt = attemptOf(async () => ({ result: "unknown" }), {
      saved: { started: true },
    });
    const outcome = await recovery.recover(attempt, client);
    if (outcome.status !== "check") throw new Error("expected check");
    expect(await recovery.retire(attempt, { by: "check", outcome })).toEqual({
      retired: false,
      reason: "unreadable",
    });
    expect(
      await recovery.retire(attempt, {
        by: "check",
        outcome,
        force: "unreadable",
      }),
    ).toEqual({ retired: true, durable: false });
    expect(await recovery.recover(attempt, client)).toEqual({
      status: "none",
      retired: "check",
    });
    // Another tab, once storage reads again, asks again: it never sends.
    restore();
    expect(
      (await page.load(new Map()).recovery.recover(attempt, client)).status,
    ).toBe("check");
  });

  it("ignores force when storage reads: the ordinary retirement applies", async () => {
    const { recovery } = browser().load();
    const { client } = fakeChain();
    const attempt = attemptOf(async () => ({ result: "unknown" }), {
      saved: { started: true },
    });
    const outcome = await recovery.recover(attempt, client);
    if (outcome.status !== "check") throw new Error("expected check");
    expect(
      await recovery.retire(attempt, {
        by: "check",
        outcome,
        force: "unreadable",
      }),
    ).toEqual({ retired: true, durable: true });
  });

  it("has the copy for the tab-only and unreadable exits", () => {
    expect(SAVED_ATTEMPT_TAB_ONLY_LINE).toBe("This applies to this tab only.");
    expect(SAVED_ATTEMPT_UNREADABLE_LINE).toBe(
      "This browser can't read its saved transactions. Check your wallet before sending again.",
    );
    expect(SAVED_ATTEMPT_CONTINUE_ANYWAY_LABEL).toBe(
      "I checked my wallet. Continue anyway",
    );
  });
});

describe("final round: strict C' across namespaces, the warned exit over throwing storage", () => {
  // 2: an unreadable legacy reservation is never read as absent.
  it("is check, not rejected none, when another namespace's reservation can't be read", async () => {
    const page = browser();
    const { client } = fakeChain();
    const { hold } = page.load();
    await hold
      .open({
        chainId: 10,
        account: ACCOUNT,
        safe: false,
        namespace: NAMESPACE,
        call: CALL,
      })
      .send(client, async (gate) => {
        await gate.beforeSend();
        gate.onRejected();
      });
    await sendUnder(hold, client, undefined, LEGACY);
    const getItem = page.site.storage.getItem;
    page.site.storage.getItem = (key: string) => {
      if (key.includes(LEGACY)) throw new Error("SecurityError");
      return getItem(key);
    };
    const outcome = await page.load(new Map()).recovery.recover(
      attemptOf(async () => ({ result: "unknown" }), {
        namespaces: [NAMESPACE, LEGACY],
        saved: { started: true },
      }),
      client,
    );
    expect(outcome.status).not.toBe("none");
  });

  /** Custom storage whose reads throw while `broken` is set. */
  function throwing() {
    const values = new Map<string, string>();
    const state = { broken: false };
    const storage = {
      getItem: (key: string) => {
        if (state.broken) throw new Error("SecurityError");
        return values.get(key) ?? null;
      },
      setItem: (key: string, value: string) => void values.set(key, value),
      removeItem: (key: string) => void values.delete(key),
      durable: () => true,
    };
    const locks = lockManager();
    const hold = createWriteHold({ storage, locks });
    const recovery = createSavedAttemptRecovery({ hold, storage, locks });
    return { state, recovery };
  }

  // 3: the warned exit works over custom storage whose reads keep throwing.
  it("retires in this tab on the warned exit even when every later read throws", async () => {
    const { state, recovery } = throwing();
    state.broken = true;
    const { client } = fakeChain();
    const attempt = attemptOf(async () => ({ result: "unknown" }), {
      saved: { started: true },
    });
    const outcome = await recovery.recover(attempt, client);
    if (outcome.status !== "check") throw new Error("expected check");
    expect(await recovery.retire(attempt, { by: "check", outcome })).toEqual({
      retired: false,
      reason: "unreadable",
    });
    expect(
      await recovery.retire(attempt, {
        by: "check",
        outcome,
        force: "unreadable",
      }),
    ).toEqual({ retired: true, durable: false });
    expect(attempt.confirmRetirable).toHaveBeenCalled();
    expect(await recovery.recover(attempt, client)).toEqual({
      status: "none",
      retired: "check",
    });
  });

  it("still refuses the warned exit for a success proved in this tab, or the app's no", async () => {
    const { state, recovery } = throwing();
    const { client } = fakeChain();
    const attempt = attemptOf(async () => proven("here"), {
      saved: { started: true },
    });
    expect(await recovery.recover(attempt, client)).toMatchObject({
      status: "done",
      authenticated: true,
    });
    state.broken = true;
    const outcome = await recovery.recover(
      attemptOf(async () => ({ result: "unknown" }), {
        saved: { started: true },
      }),
      client,
    );
    if (outcome.status !== "check") throw new Error("expected check");
    expect(
      (
        await recovery.retire(attempt, {
          by: "check",
          outcome,
          force: "unreadable",
        })
      ).retired,
    ).toBe(false);
    const other = throwing();
    other.state.broken = true;
    const no = attemptOf(async () => ({ result: "unknown" }), {
      saved: { started: true },
      confirmRetirable: vi.fn(async () => false),
    });
    const seen = await other.recovery.recover(no, client);
    if (seen.status !== "check") throw new Error("expected check");
    expect(
      (
        await other.recovery.retire(no, {
          by: "check",
          outcome: seen,
          force: "unreadable",
        })
      ).retired,
    ).toBe(false);
    expect(no.confirmRetirable).toHaveBeenCalled();
  });
});
