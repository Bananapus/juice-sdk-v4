import {
  encodeFunctionData,
  erc20Abi,
  numberToHex,
  type Address,
  type Hex,
  type PublicClient,
  type TransactionReceipt,
} from "viem";
import { vi } from "vitest";
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
export const TOKEN = "0x4444444444444444444444444444444444444444" as Address;
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

export const reverted = () =>
  Object.assign(new Error("execution reverted"), {
    code: 3,
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
      logs: [],
    }) as unknown as TransactionReceipt;
  const notFound = (name: string) =>
    Object.assign(new Error("not found"), { name });
  const client = {
    chain: { id: 10, name: "OP Mainnet" },
    request: vi.fn(
      async ({ method, params }: { method: string; params: unknown[] }) => {
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
    getBlock: vi.fn(async ({ blockNumber }: { blockNumber?: bigint } = {}) => ({
      number: blockNumber ?? state.head,
      hash: numberToHex(blockNumber ?? state.head, { size: 32 }),
      timestamp: 1_000n,
      transactions: [],
    })),
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
  return { state, client, mine };
}

export function fakeWallet(chain: ReturnType<typeof fakeChain>) {
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
    signTypedData: vi.fn(async () => {
      throw new Error("unused");
    }),
    signMessage: vi.fn(async () => {
      throw new Error("unused");
    }),
  } satisfies WalletAdapter;
  return { state, adapter };
}

export function setup() {
  const chain = fakeChain();
  const wallet = fakeWallet(chain);
  const hold = createWriteHold({
    storage: createHeldWriteStorage({
      durable: () => undefined,
      memory: new Map(),
    }),
    // Web Locks that are always free: these tests send one step at a time.
    locks: {
      request: (async (
        name: string,
        _options: unknown,
        work: (lock: Lock) => unknown,
      ) => work({ name, mode: "exclusive" })) as LockManager["request"],
    },
    settle: { intervalMs: 1_000, attempts: 1 },
  });
  const progress: ReviewedProgress[] = [];
  const deps = {
    adapter: wallet.adapter as WalletAdapter,
    clientFor: () => chain.client as unknown as PublicClient,
    hold,
    onProgress: (step: ReviewedProgress) => progress.push(step),
  };
  const holdOf = (call: ReviewedCall): ReviewedWriteRecoveryInput => ({
    chainId: call.chainId,
    account: ACCOUNT,
    safe: false,
    call: { to: call.to, data: call.data, value: call.value ?? 0n },
  });
  return { chain, wallet, hold, deps, progress, holdOf };
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
