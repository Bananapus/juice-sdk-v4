import {
  encodeAbiParameters,
  encodeFunctionData,
  erc20Abi,
  numberToHex,
  type Address,
  type Hex,
  type PublicClient,
  type TransactionReceipt,
  type TypedDataDefinition,
} from "viem";
import { vi } from "vitest";
import {
  canonicalSafeTxHash,
  safeProposalFor,
  type SafeQueuedTransaction,
} from "../../safeService.js";
import {
  registerReviewHandler,
  type ReviewConfirmation,
  type ReviewPrompt,
} from "../confirm.js";
import type {
  ReviewedAction,
  ReviewedCall,
  ReviewedProgress,
} from "../send.js";
import type { WalletAdapter } from "../wallet.js";
import { createWriteHold } from "../writeHold.js";
import {
  createHeldWriteStorage,
  type ReviewedWriteRecoveryInput,
} from "../writeRecovery.js";

/** A one-chain fake wallet, chain and write hold for the reviewed-send tests. */
export const ACCOUNT = "0x1111111111111111111111111111111111111111" as Address;
export const OTHER = "0x3333333333333333333333333333333333333333" as Address;
export const TERMINAL = "0x2222222222222222222222222222222222222222" as Address;
const TOKEN = "0x4444444444444444444444444444444444444444" as Address;
export const NOT_CONFIRMED =
  "This review was not confirmed here. Nothing was sent; review it again.";
export const CHANGED =
  "Transaction data changed after review. Nothing was sent; review it again.";

export const PAY_ABI = [
  {
    type: "function",
    name: "pay",
    stateMutability: "payable",
    inputs: [
      { name: "projectId", type: "uint256" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

export function payCall(
  amount = 5n,
  extra: Partial<ReviewedCall> = {},
): ReviewedCall {
  const args = [1n, amount];
  return {
    chainId: 10,
    to: TERMINAL,
    data: encodeFunctionData({
      abi: PAY_ABI,
      functionName: "pay",
      args: [1n, amount],
    }),
    value: 7n,
    abi: PAY_ABI,
    functionName: "pay",
    args,
    label: "Pay",
    ...extra,
  };
}

const MODIFY_LIQUIDITIES_ABI = [
  {
    type: "function",
    name: "modifyLiquidities",
    stateMutability: "payable",
    inputs: [
      { name: "unlockData", type: "bytes" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

/** A position manager call: its deadline is a fresh stamp on each retry. */
export function liquidityCall(
  unlockData: Hex,
  deadline: bigint,
  extra: Partial<ReviewedCall> = {},
): ReviewedCall {
  const args = [unlockData, deadline] as const;
  return {
    chainId: 10,
    to: TERMINAL,
    data: encodeFunctionData({
      abi: MODIFY_LIQUIDITIES_ABI,
      functionName: "modifyLiquidities",
      args,
    }),
    value: 7n,
    abi: MODIFY_LIQUIDITIES_ABI,
    functionName: "modifyLiquidities",
    args,
    label: "Add liquidity",
    ...extra,
  };
}

export function approveCall(): ReviewedCall {
  return {
    chainId: 10,
    to: TOKEN,
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: "approve",
      args: [TERMINAL, 5n],
    }),
    abi: erc20Abi,
    functionName: "approve",
    args: [TERMINAL, 5n],
    label: "Approve",
  };
}

/** A node's revert with reason "NOPE", as viem surfaces it. */
export const reverted = () =>
  Object.assign(new Error("execution reverted"), {
    code: 3,
    data: `0x08c379a0${encodeAbiParameters([{ type: "string" }], ["NOPE"]).slice(2)}`,
    details: "execution reverted: NOPE",
    shortMessage: "Execution reverted: NOPE",
  });
export const unreachable = () =>
  Object.assign(new Error("HTTP request failed."), {
    name: "HttpRequestError",
    shortMessage: "HTTP request failed.",
    details: "fetch failed",
  });

/** One chain: its reads, the eth_calls asked of it, and the blocks the wallet's sends land in. */
export function fakeChain() {
  const state = {
    head: 100n,
    nonce: 7,
    /** What eth_call does: answer, revert, fail, or never answer. */
    ethCall: (() => "0x") as (params: unknown[]) => unknown,
    mined: new Map<string, bigint>(),
    sent: new Map<
      string,
      { to: Address; data: Hex; value: bigint; nonce: number }
    >(),
    status: "success" as "success" | "reverted",
    /** The logs every receipt carries. */
    logs: [] as unknown[],
    /** The connected Safe's nonce, and what Safe's service queues from it. */
    safeNonce: 0n,
    safeQueue: [] as SafeQueuedTransaction[],
    /** How Safe's service answers a queue read. */
    safeService: async (queue: SafeQueuedTransaction[]) =>
      new Response(JSON.stringify({ next: null, results: queue })),
  };
  const receipt = (hash: Hex) =>
    ({
      transactionHash: hash,
      blockNumber: state.mined.get(hash)!,
      blockHash: numberToHex(state.mined.get(hash)!, { size: 32 }),
      status: state.status,
      transactionIndex: 0,
      from: ACCOUNT,
      to: state.sent.get(hash)?.to ?? TERMINAL,
      logs: state.logs,
    }) as unknown as TransactionReceipt;
  const notFound = (name: string) =>
    Object.assign(new Error("not found"), { name });
  const client = {
    chain: { id: 10, name: "OP Mainnet" },
    request: vi.fn(
      async ({ method, params }: { method: string; params: unknown[] }) => {
        const [call] = params as [{ to?: Address; data?: Hex }];
        if (
          method === "eth_call" &&
          call.to?.toLowerCase() === ACCOUNT.toLowerCase() &&
          call.data?.startsWith("0xaffed0e0")
        )
          return encodeAbiParameters([{ type: "uint256" }], [state.safeNonce]);
        if (method === "eth_call") return state.ethCall(params);
        if (method === "eth_getBlockByNumber") {
          return {
            number: numberToHex(state.head),
            hash: numberToHex(state.head, { size: 32 }),
          };
        }
        throw new Error(`unexpected ${method}`);
      },
    ),
    estimateGas: vi.fn(async (_: unknown) => 21_000n),
    simulateCalls: vi.fn(async ({ calls }: { calls: { data: Hex }[] }) => ({
      results: calls.map(() => ({ status: "success" })),
    })),
    readContract: vi.fn(async () => {
      throw new Error("no token reads here");
    }),
    getChainId: vi.fn(async () => 10),
    getBlockNumber: vi.fn(async () => state.head),
    getTransactionCount: vi.fn(async () => state.nonce),
    getBlock: vi.fn(
      async ({
        blockNumber,
        blockHash,
      }: { blockNumber?: bigint; blockHash?: Hex } = {}) => {
        const number =
          blockNumber ?? (blockHash ? BigInt(blockHash) : state.head);
        return {
          number,
          hash: numberToHex(number, { size: 32 }),
          timestamp: 1_000n,
          transactions: [],
        };
      },
    ),
    getTransaction: vi.fn(async ({ hash }: { hash: Hex }) => {
      const tx = state.sent.get(hash);
      if (!tx) throw notFound("TransactionNotFoundError");
      const block = state.mined.get(hash)!;
      return {
        hash,
        chainId: 10,
        from: ACCOUNT,
        to: tx.to,
        input: tx.data,
        value: tx.value,
        nonce: tx.nonce,
        blockNumber: block,
        blockHash: numberToHex(block, { size: 32 }),
        transactionIndex: 0,
      };
    }),
    getTransactionReceipt: vi.fn(async ({ hash }: { hash: Hex }) => {
      if (!state.mined.has(hash))
        throw notFound("TransactionReceiptNotFoundError");
      return receipt(hash);
    }),
    waitForTransactionReceipt: vi.fn(async ({ hash }: { hash: Hex }) =>
      receipt(hash),
    ),
  };
  /** The wallet broadcast `hash`: it is mined in the next block. */
  const mine = (hash: Hex, tx: { to: Address; data: Hex; value: bigint }) => {
    state.sent.set(hash, { ...tx, nonce: state.nonce });
    state.head += 1n;
    state.nonce += 1;
    state.mined.set(hash, state.head);
  };
  /** Safe's service queues `call` in the connected Safe at the next nonce. */
  const queueProposal = (
    call: { to: Address; data: Hex; value?: bigint },
    extra: Partial<SafeQueuedTransaction> = {},
  ) => {
    const tx = {
      ...safeProposalFor(
        call,
        Number(state.safeNonce) + state.safeQueue.length,
      ),
      ...extra,
    };
    const safeTxHash = canonicalSafeTxHash(10, ACCOUNT, tx);
    state.safeQueue.push({ ...tx, safeTxHash } as SafeQueuedTransaction);
    return safeTxHash;
  };
  return { state, client, mine, queueProposal };
}

function fakeWallet(chain: ReturnType<typeof fakeChain>) {
  const state = {
    account: ACCOUNT as Address | undefined,
    chainId: 10,
    safe: false,
  };
  let count = 0;
  const adapter = {
    kind: "wallet",
    account: () => state.account,
    chainId: () => state.chainId,
    isSafe: () => state.safe,
    switchChain: vi.fn(async (chainId: number) => {
      state.chainId = chainId;
    }),
    sendTransaction: vi.fn(
      async (tx: Parameters<WalletAdapter["sendTransaction"]>[0]) => {
        count += 1;
        const hash = `0x${count.toString(16).padStart(64, "0")}` as Hex;
        if (!state.safe) chain.mine(hash, tx);
        return hash;
      },
    ),
    signTypedData: vi.fn(
      async (_typedData: TypedDataDefinition): Promise<Hex> => {
        throw new Error("unused");
      },
    ),
    signMessage: vi.fn(async (_message: string): Promise<Hex> => {
      throw new Error("unused");
    }),
  } satisfies WalletAdapter;
  return { state, adapter };
}

/**
 * The wallet's next send of the reviewed call (its hash `original`, at the
 * account's nonce) is replaced by a speed-up of exactly that call, which mines:
 * the node keeps `original` pending, finds the speed-up at its nonce in a
 * finalized block, and viem's watcher follows it to the speed-up's receipt.
 */
export function speedUpNextSend(
  chain: ReturnType<typeof fakeChain>,
  wallet: ReturnType<typeof fakeWallet>,
) {
  const original = `0x${"aa".repeat(32)}` as Hex;
  const replacement = `0x${"bb".repeat(32)}` as Hex;
  const { client, state } = chain;
  wallet.adapter.sendTransaction.mockImplementationOnce(async (tx) => {
    chain.mine(replacement, tx);
    return original;
  });
  const read = client.getTransaction.getMockImplementation()!;
  client.getTransaction.mockImplementation(async (args) => {
    if (args.hash !== original) return read(args);
    const tx = state.sent.get(replacement)!;
    return {
      ...(await read({ hash: replacement })),
      hash: original,
      nonce: tx.nonce,
      blockNumber: null,
      blockHash: null,
      transactionIndex: null,
    } as never;
  });
  const count = client.getTransactionCount.getMockImplementation()!;
  client.getTransactionCount.mockImplementation((async (args: {
    blockNumber?: bigint;
  }) => {
    const mined = state.mined.get(replacement);
    if (mined === undefined) return count();
    return args?.blockNumber === undefined || args.blockNumber >= mined
      ? state.sent.get(replacement)!.nonce + 1
      : state.sent.get(replacement)!.nonce;
  }) as never);
  client.getBlock.mockImplementation((async ({
    blockNumber,
    blockHash,
  }: { blockNumber?: bigint; blockHash?: Hex } = {}) => {
    const number = blockNumber ?? (blockHash ? BigInt(blockHash) : state.head);
    return {
      number,
      hash: numberToHex(number, { size: 32 }),
      timestamp: 1_000n,
      transactions:
        state.mined.get(replacement) === number
          ? [await read({ hash: replacement })]
          : [],
    };
  }) as never);
  const watch = client.waitForTransactionReceipt.getMockImplementation()!;
  client.waitForTransactionReceipt.mockImplementation(async (args) =>
    watch({ ...args, hash: args.hash === original ? replacement : args.hash }),
  );
  return { original, replacement };
}

export function setup() {
  const chain = fakeChain();
  const wallet = fakeWallet(chain);
  /** What the browser saved, by key. */
  const memory = new Map<string, string>();
  const storage = createHeldWriteStorage({
    durable: () => undefined,
    memory,
  });
  const hold = createWriteHold({
    storage,
    // Web Locks that are always free: these tests send one step at a time.
    locks: {
      request: (async (
        name: string,
        _options: unknown,
        work: (lock: Lock) => unknown,
      ) => work({ name, mode: "exclusive" })) as LockManager["request"],
    },
    settle: { intervalMs: 1_000, attempts: 1 },
    // Safe's service lists the connected Safe's queue; any other read is the test's own.
    safeService: {
      fetch: (input, init) =>
        String(input).includes(`/safes/${ACCOUNT}/multisig-transactions/?`)
          ? chain.state.safeService(chain.state.safeQueue)
          : globalThis.fetch(input, init),
    },
  });
  const progress: ReviewedProgress[] = [];
  const deps = {
    adapter: wallet.adapter as WalletAdapter,
    clientFor: () => chain.client as unknown as PublicClient,
    hold,
    onProgress: (step: ReviewedProgress) => progress.push(step),
    storage,
  };
  const holdOf = (call: ReviewedCall): ReviewedWriteRecoveryInput => ({
    chainId: call.chainId,
    account: ACCOUNT,
    safe: false,
    call: { to: call.to, data: call.data, value: call.value ?? 0n },
  });
  return { chain, wallet, hold, deps, progress, holdOf, storage, memory };
}

/** Each registered review UI's unregister, latest last. */
export const unregister: (() => void)[] = [];
/** The review UI: `answer` decides each prompt; every prompt is kept. */
export function reviewUi(
  answer: (prompt: ReviewPrompt) => Promise<ReviewConfirmation | null> = async (
    prompt,
  ) => prompt.confirmation,
) {
  const prompts: ReviewPrompt[] = [];
  unregister.push(
    registerReviewHandler((prompt) => {
      prompts.push(prompt);
      return answer(prompt);
    }),
  );
  return prompts;
}

/** Unregister every review UI and forget the tab's held writes, after each test. */
export function resetReviewUi() {
  while (unregister.length) unregister.pop()!();
  delete (globalThis as Record<symbol, unknown>)[
    Symbol.for("nana-sdk:held-writes")
  ];
}

export const action = (
  calls: ReviewedCall[],
  extra: Partial<ReviewedAction> = {},
): ReviewedAction => ({
  account: ACCOUNT,
  calls,
  ...extra,
});

/**
 * Watches the site-callback guard: what it logged, and any rejection nothing
 * handled. `settled()` waits a moment, then returns both and stops watching.
 */
export function watchGuard() {
  const logged = vi.spyOn(console, "error").mockImplementation(() => {});
  const unhandled: unknown[] = [];
  const onUnhandled = (reason: unknown) => unhandled.push(reason);
  process.on("unhandledRejection", onUnhandled);
  return {
    async settled() {
      await new Promise((resolve) => setTimeout(resolve, 20));
      process.off("unhandledRejection", onUnhandled);
      const errors = logged.mock.calls.map(([, error]) => error);
      logged.mockRestore();
      return { errors, unhandled };
    },
  };
}
