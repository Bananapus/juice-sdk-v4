import {
  encodeFunctionData,
  erc20Abi,
  numberToHex,
  type Address,
  type Hex,
  type PublicClient,
  type TransactionReceipt,
} from "viem";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  registerReviewHandler,
  type ReviewConfirmation,
  type ReviewPrompt,
} from "./confirm.js";
import { buildReviewModel } from "./model.js";
import {
  sendReviewed,
  type ReviewedAction,
  type ReviewedCall,
  type ReviewedProgress,
} from "./send.js";
import { selfReviewingAdapter, type WalletAdapter } from "./wallet.js";
import { createWriteHold, WriteHeldError } from "./writeHold.js";
import {
  createHeldWriteStorage,
  type ReviewedWriteRecoveryInput,
} from "./writeRecovery.js";

const ACCOUNT = "0x1111111111111111111111111111111111111111" as Address;
const OTHER = "0x3333333333333333333333333333333333333333" as Address;
const TERMINAL = "0x2222222222222222222222222222222222222222" as Address;
const TOKEN = "0x4444444444444444444444444444444444444444" as Address;
const NOT_CONFIRMED =
  "This review was not confirmed here. Nothing was sent; review it again.";
const CHANGED =
  "Transaction data changed after review. Nothing was sent; review it again.";

const PAY_ABI = [
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

function payCall(amount = 5n, extra: Partial<ReviewedCall> = {}): ReviewedCall {
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

function approveCall(): ReviewedCall {
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

const reverted = () =>
  Object.assign(new Error("execution reverted"), {
    code: 3,
    details: "execution reverted: NOPE",
    shortMessage: "Execution reverted: NOPE",
  });
const unreachable = () =>
  Object.assign(new Error("HTTP request failed."), {
    name: "HttpRequestError",
    shortMessage: "HTTP request failed.",
    details: "fetch failed",
  });

/** One chain: its reads, the eth_calls asked of it, and the blocks the wallet's sends land in. */
function fakeChain() {
  const state = {
    head: 100n,
    nonce: 7,
    /** What eth_call does: answer, revert, fail, or never answer. */
    ethCall: (() => "0x") as (params: unknown[]) => unknown,
    mined: new Map<string, bigint>(),
    status: "success" as "success" | "reverted",
  };
  const receipt = (hash: Hex) =>
    ({
      transactionHash: hash,
      blockNumber: state.mined.get(hash)!,
      blockHash: numberToHex(state.mined.get(hash)!, { size: 32 }),
      status: state.status,
      from: ACCOUNT,
      to: TERMINAL,
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
    getBlock: vi.fn(async () => ({
      number: state.head,
      hash: numberToHex(state.head, { size: 32 }),
      transactions: [],
    })),
    getTransaction: vi.fn(async () => {
      throw notFound("TransactionNotFoundError");
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
  const mine = (hash: Hex) => {
    state.head += 1n;
    state.nonce += 1;
    state.mined.set(hash, state.head);
  };
  return { state, client, mine };
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
      async (_tx: Parameters<WalletAdapter["sendTransaction"]>[0]) => {
        count += 1;
        const hash = `0x${count.toString(16).padStart(64, "0")}` as Hex;
        if (!state.safe) chain.mine(hash);
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

function setup() {
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

const unregister: (() => void)[] = [];
/** The review UI: `answer` decides each prompt; every prompt is kept. */
function reviewUi(
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

afterEach(() => {
  while (unregister.length) unregister.pop()!();
  delete (globalThis as Record<symbol, unknown>)[
    Symbol.for("nana-sdk:held-writes")
  ];
});

const action = (
  calls: ReviewedCall[],
  extra: Partial<ReviewedAction> = {},
): ReviewedAction => ({
  account: ACCOUNT,
  calls,
  ...extra,
});

describe("sendReviewed", () => {
  it("sends exactly the reviewed bytes through the adapter", async () => {
    const { wallet, deps, progress, chain } = setup();
    const prompts = reviewUi();
    const call = payCall();
    const result = await sendReviewed(
      action([call], {
        title: "Pay project 1",
        context: [{ label: "You pay", value: "5" }],
      }),
      deps,
    );
    expect(prompts).toHaveLength(1);
    const [prompt] = prompts;
    expect(prompt.model.id).toBe(
      buildReviewModel({
        calls: [
          {
            chainId: 10,
            to: TERMINAL,
            data: call.data,
            value: 7n,
            from: ACCOUNT,
            abi: PAY_ABI,
            functionName: "pay",
            args: call.args,
            label: "Pay",
          },
        ],
        title: "Pay project 1",
        context: [{ label: "You pay", value: "5" }],
      }).id,
    );
    expect(prompt.model.calls[0]).toMatchObject({
      to: TERMINAL,
      from: ACCOUNT,
      value: 7n,
      functionName: "pay",
    });
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(1);
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledWith({
      chainId: 10,
      to: TERMINAL,
      data: call.data,
      value: 7n,
      gas: 42_000n,
    });
    expect(result).toEqual({
      status: "done",
      hashes: [`0x${"1".padStart(64, "0")}`],
      receipts: [
        expect.objectContaining({ status: "success", blockNumber: 101n }),
      ],
    });
    expect(progress.map((step) => step.phase)).toEqual([
      "review",
      "simulating",
      "signing",
      "receipt",
      "done",
    ]);
    // The post-confirm simulation ran the exact bytes from the reviewed account.
    expect(chain.client.request).toHaveBeenLastCalledWith({
      method: "eth_call",
      params: [
        expect.objectContaining({
          from: ACCOUNT,
          to: TERMINAL,
          data: call.data,
          value: "0x7",
        }),
        "latest",
      ],
    });
  });

  it("refuses calldata that is not its arguments' encoding before any review", async () => {
    const { wallet, deps } = setup();
    const prompts = reviewUi();
    await expect(
      sendReviewed(action([{ ...payCall(), args: [1n, 6n] }]), deps),
    ).rejects.toThrow(
      "This call's data does not match its arguments. Nothing was sent.",
    );
    expect(prompts).toHaveLength(0);
    expect(wallet.adapter.sendTransaction).not.toHaveBeenCalled();
  });

  it("refuses after an account switch and spends the confirmation", async () => {
    const { wallet, deps, hold, holdOf } = setup();
    let first: ReviewConfirmation | undefined;
    reviewUi(async (prompt) => {
      first = prompt.confirmation;
      wallet.state.account = OTHER;
      return prompt.confirmation;
    });
    const call = payCall();
    await expect(sendReviewed(action([call]), deps)).rejects.toThrow(
      "The connected account changed. Review again.",
    );
    expect(wallet.adapter.sendTransaction).not.toHaveBeenCalled();
    expect(hold.open(holdOf(call)).peek().status).toBe("clear");

    // Back on the reviewed account, the earlier confirmation confirms nothing.
    wallet.state.account = ACCOUNT;
    unregister.pop()!();
    reviewUi(async () => first!);
    await expect(sendReviewed(action([call]), deps)).rejects.toThrow(
      NOT_CONFIRMED,
    );
    expect(wallet.adapter.sendTransaction).not.toHaveBeenCalled();

    // A wallet that stays on another chain is refused at the last gate.
    unregister.pop()!();
    reviewUi();
    wallet.adapter.switchChain.mockImplementation(async () => {});
    wallet.state.chainId = 8453;
    await expect(sendReviewed(action([call]), deps)).rejects.toThrow(
      "Your wallet changed networks. Review the transaction again.",
    );
    expect(wallet.adapter.sendTransaction).not.toHaveBeenCalled();
    expect(hold.open(holdOf(call)).peek().status).toBe("clear");

    // Refused before the review when another account is connected.
    wallet.state.account = OTHER;
    await expect(sendReviewed(action([call]), deps)).rejects.toThrow(
      "The connected account changed. Review again.",
    );
  });

  it("refuses when reverify changes the calldata, without a second prompt", async () => {
    const { wallet, deps, hold, holdOf } = setup();
    const prompts = reviewUi();
    const call = payCall();
    const args = call.args as bigint[];
    await expect(
      sendReviewed(
        action([call], {
          reverify: async (current) => {
            expect(current).toBe(call);
            args[1] = 999n;
          },
        }),
        deps,
      ),
    ).rejects.toThrow(CHANGED);
    expect(prompts).toHaveLength(1);
    expect(wallet.adapter.sendTransaction).not.toHaveBeenCalled();
    args[1] = 5n;
    expect(hold.open(holdOf(call)).peek().status).toBe("clear");

    // Raw bytes, value or target changed in place are refused the same way.
    for (const change of [
      (target: ReviewedCall) =>
        (target.data = encodeFunctionData({
          abi: PAY_ABI,
          functionName: "pay",
          args: [1n, 6n],
        })),
      (target: ReviewedCall) => (target.value = 8n),
      (target: ReviewedCall) => (target.to = OTHER),
    ]) {
      const raw: ReviewedCall = {
        chainId: 10,
        to: TERMINAL,
        data: call.data,
        value: 7n,
      };
      await expect(
        sendReviewed(
          action([raw], { reverify: async () => void change(raw) }),
          deps,
        ),
      ).rejects.toThrow(CHANGED);
    }
    // A change made while the wallet is being readied is caught by the last gate.
    const late = payCall();
    await expect(
      sendReviewed(
        action([late], { assertWriteState: () => void (late.value = 9n) }),
        deps,
      ),
    ).rejects.toThrow(CHANGED);
    expect(wallet.adapter.sendTransaction).not.toHaveBeenCalled();
  });

  it("asks exactly once for an approve + pay action", async () => {
    const { wallet, deps, chain } = setup();
    const prompts = reviewUi();
    const approve = approveCall();
    const pay = payCall(5n, { dependsOnPrior: true });
    const result = await sendReviewed(action([approve, pay]), deps);
    expect(prompts).toHaveLength(1);
    expect(prompts[0].model.calls.map((call) => call.functionName)).toEqual([
      "approve",
      "pay",
    ]);
    expect(chain.client.simulateCalls).toHaveBeenCalledTimes(1);
    expect(
      wallet.adapter.sendTransaction.mock.calls.map(([tx]) => tx.data),
    ).toEqual([approve.data, pay.data]);
    expect(result.status).toBe("done");
    expect(result.status === "done" && result.hashes).toHaveLength(2);
  });

  it("simulates the dependent step at the approval receipt block", async () => {
    const { deps, chain } = setup();
    reviewUi();
    const approve = approveCall();
    const pay = payCall(5n, { dependsOnPrior: true });
    const result = await sendReviewed(action([approve, pay]), deps);
    const approvalBlock =
      result.status === "done" ? result.receipts[0].blockNumber : 0n;
    expect(approvalBlock).toBe(101n);
    const ethCalls = chain.client.request.mock.calls
      .map(([request]) => request)
      .filter((request) => request.method === "eth_call");
    expect(
      ethCalls.map((request) => [
        (request.params[0] as { data: Hex }).data,
        request.params[1],
      ]),
    ).toEqual([
      [approve.data, "latest"],
      [pay.data, numberToHex(approvalBlock)],
    ]);
    expect(
      chain.client.estimateGas.mock.calls.map(([request]) => request),
    ).toEqual([
      expect.not.objectContaining({ blockNumber: expect.anything() }),
      expect.objectContaining({ data: pay.data, blockNumber: approvalBlock }),
    ]);
  });

  it("unavailable simulation warns, revert blocks", async () => {
    const { wallet, deps, chain } = setup();
    // The node is unreachable while the review is open, and back once confirmed.
    chain.state.ethCall = () => {
      throw unreachable();
    };
    reviewUi(async (prompt) => {
      expect(await prompt.simulation).toMatchObject({ status: "unavailable" });
      expect(
        (await prompt.enriched).warnings.map((warning) => warning.code),
      ).toEqual(["simulation-unavailable"]);
      chain.state.ethCall = () => "0x";
      return prompt.confirmation;
    });
    await expect(
      sendReviewed(action([payCall()]), deps),
    ).resolves.toMatchObject({ status: "done" });

    // A revert the review-time simulation reported refuses the confirmation.
    unregister.pop()!();
    chain.state.ethCall = () => {
      throw reverted();
    };
    reviewUi(async (prompt) => {
      const simulation = await prompt.simulation;
      expect(simulation).toMatchObject({ status: "failed" });
      expect((await prompt.enriched).warnings).toEqual([
        {
          code: "simulation-failed",
          text: simulation.status === "failed" ? simulation.message : "",
        },
      ]);
      return prompt.confirmation;
    });
    await expect(sendReviewed(action([payCall(6n)]), deps)).rejects.toThrow(
      "Pay cannot run on OP Mainnet: Execution reverted: NOPE",
    );

    // A sequence whose step reverts in eth_simulateV1 is refused the same way.
    chain.client.simulateCalls.mockImplementationOnce(async ({ calls }) => ({
      results: calls.map((_, index) =>
        index === 1
          ? {
              status: "failure",
              error: Object.assign(new Error("reverted"), {
                name: "ContractFunctionRevertedError",
                shortMessage: "NOPE",
              }),
            }
          : { status: "success" },
      ),
    }));
    await expect(
      sendReviewed(
        action([approveCall(), payCall(7n, { dependsOnPrior: true })]),
        deps,
      ),
    ).rejects.toThrow("Pay cannot run on OP Mainnet: NOPE");
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(1);
  });

  it("confirm does not wait on a pending review simulation; the post-confirm simulation decides", async () => {
    const { wallet, deps, chain, hold, holdOf } = setup();
    let calls = 0;
    chain.state.ethCall = () => {
      calls += 1;
      if (calls === 1) return new Promise(() => {});
      throw reverted();
    };
    let simulationSettled = false;
    reviewUi(async (prompt) => {
      void prompt.simulation.then(() => (simulationSettled = true));
      return prompt.confirmation;
    });
    const call = payCall();
    await expect(sendReviewed(action([call]), deps)).rejects.toThrow(
      "execution reverted",
    );
    expect(simulationSettled).toBe(false);
    expect(calls).toBe(2);
    expect(wallet.adapter.sendTransaction).not.toHaveBeenCalled();
    expect(hold.open(holdOf(call)).peek().status).toBe("clear");
  });

  it("the confirmation still matches after the simulation warning is added", async () => {
    const { deps, chain } = setup();
    chain.state.ethCall = () => {
      throw unreachable();
    };
    reviewUi(async (prompt) => {
      const enriched = await prompt.enriched;
      expect(enriched.warnings.map((warning) => warning.code)).toContain(
        "simulation-unavailable",
      );
      expect(enriched.id).toBe(prompt.model.id);
      expect(prompt.model.warnings).toEqual([]);
      chain.state.ethCall = () => "0x";
      return prompt.confirmation;
    });
    await expect(
      sendReviewed(action([payCall()]), deps),
    ).resolves.toMatchObject({ status: "done" });
  });

  it("4001 releases the hold, a timeout keeps it", async () => {
    const { wallet, deps, hold, holdOf } = setup();
    const prompts = reviewUi();
    const call = payCall();
    wallet.adapter.sendTransaction.mockRejectedValueOnce(
      Object.assign(new Error("User rejected the request."), { code: 4001 }),
    );
    await expect(sendReviewed(action([call]), deps)).rejects.toMatchObject({
      code: 4001,
    });
    expect(hold.open(holdOf(call)).peek().status).toBe("clear");

    wallet.adapter.sendTransaction.mockRejectedValueOnce(
      new Error("The request took too long to respond."),
    );
    await expect(sendReviewed(action([call]), deps)).rejects.toThrow(
      "The request took too long to respond.",
    );
    expect(hold.open(holdOf(call)).peek().status).toBe("held-no-hash");

    // The same action again is refused by the hold: the wallet never opens twice.
    await expect(sendReviewed(action([call]), deps)).rejects.toBeInstanceOf(
      WriteHeldError,
    );
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(2);
    expect(prompts).toHaveLength(2);
  });

  it("a Safe-connected wallet's first step becomes a proposal and the action stops there", async () => {
    const { wallet, deps } = setup();
    wallet.state.safe = true;
    const prompts = reviewUi();
    const result = await sendReviewed(
      action([approveCall(), payCall(5n, { dependsOnPrior: true })]),
      deps,
    );
    expect(prompts[0].model.calls.map((call) => call.safeTxGas)).toEqual([
      0n,
      0n,
    ]);
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(1);
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ gas: 0n }),
    );
    expect(result).toEqual({
      status: "proposed",
      step: 0,
      safeTxHash: `0x${"1".padStart(64, "0")}`,
    });
  });

  it("self-reviewing adapter gets raw calls and no prompt", async () => {
    const { deps } = setup();
    const prompts = reviewUi();
    const submit = vi.fn(async () => `0x${"ab".repeat(32)}` as Hex);
    const previews: unknown[] = [];
    const call = payCall();
    const result = await sendReviewed(action([call]), {
      ...deps,
      adapter: selfReviewingAdapter({ account: () => ACCOUNT, submit }),
      onPreview: (model) => previews.push(model),
    });
    expect(prompts).toHaveLength(0);
    expect(previews).toEqual([
      expect.objectContaining({
        calls: [expect.objectContaining({ functionName: "pay" })],
      }),
    ]);
    expect(submit).toHaveBeenCalledWith({
      account: ACCOUNT,
      calls: [{ chainId: 10, to: TERMINAL, data: call.data, value: 7n }],
    });
    expect(result).toEqual({
      status: "done",
      hashes: [`0x${"ab".repeat(32)}`],
      receipts: [],
    });
  });

  it("runs the guard before anything and refuses an empty action", async () => {
    const { wallet, deps } = setup();
    const prompts = reviewUi();
    await expect(
      sendReviewed(
        action([payCall()], {
          guard: () => {
            throw new Error("Viewing as another account.");
          },
        }),
        deps,
      ),
    ).rejects.toThrow("Viewing as another account.");
    await expect(sendReviewed(action([]), deps)).rejects.toThrow(
      "There is no transaction to review.",
    );
    wallet.state.account = undefined;
    await expect(sendReviewed(action([payCall()]), deps)).rejects.toThrow(
      "Connect a wallet first.",
    );
    expect(prompts).toHaveLength(0);
  });
});
