import {
  encodeFunctionData,
  numberToHex,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ACCOUNT,
  CHANGED,
  NOT_CONFIRMED,
  OTHER,
  PAY_ABI,
  TERMINAL,
  action,
  approveCall,
  fakeChain,
  payCall,
  resetReviewUi,
  reverted,
  reviewUi,
  setup,
  unreachable,
  unregister,
} from "./__fixtures__/reviewedSend.js";
import type { ReviewConfirmation } from "./confirm.js";
import { SubmittedContractWriteError } from "./contractWrite.js";
import { buildReviewModel } from "./model.js";
import { sendReviewed, type ReviewedCall } from "./send.js";
import { selfReviewingAdapter } from "./wallet.js";
import { WriteHeldError, WriteHoldStaleReviewError } from "./writeHold.js";

afterEach(resetReviewUi);

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

  it("shows, binds, simulates and sends an app's exact gas, never estimating it", async () => {
    const { wallet, deps, chain } = setup();
    const prompts = reviewUi();
    const call = payCall(5n, { gas: 300_000n });
    await sendReviewed(action([call]), deps);
    const [prompt] = prompts;
    expect(prompt.model.calls[0].gas).toBe(300_000n);
    const shown = {
      chainId: 10,
      to: TERMINAL,
      data: call.data,
      value: 7n,
      from: ACCOUNT,
      abi: PAY_ABI,
      functionName: "pay",
      args: call.args,
      label: "Pay",
    };
    expect(prompt.model.id).toBe(
      buildReviewModel({ calls: [{ ...shown, gas: 300_000n }] }).id,
    );
    expect(prompt.model.id).not.toBe(buildReviewModel({ calls: [shown] }).id);
    expect(chain.client.estimateGas).not.toHaveBeenCalled();
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledWith({
      chainId: 10,
      to: TERMINAL,
      data: call.data,
      value: 7n,
      gas: 300_000n,
    });
    // Both simulations, at review and before the wallet, ran at exactly that gas.
    const simulated = chain.client.request.mock.calls.filter(
      ([request]) => (request as { method: string }).method === "eth_call",
    );
    expect(simulated.length).toBeGreaterThanOrEqual(2);
    for (const [request] of simulated)
      expect(request).toMatchObject({
        params: [
          expect.objectContaining({ gas: numberToHex(300_000n) }),
          "latest",
        ],
      });
  });

  it("simulates a sequence at each call's exact gas", async () => {
    const { deps, chain } = setup();
    reviewUi();
    await sendReviewed(
      action(
        [
          { ...approveCall(), gas: 90_000n },
          payCall(5n, { dependsOnPrior: true }),
        ],
        { scope: "pay" },
      ),
      deps,
    );
    expect(chain.client.simulateCalls).toHaveBeenCalledWith(
      expect.objectContaining({
        calls: [
          expect.objectContaining({ gas: 90_000n }),
          expect.not.objectContaining({ gas: expect.anything() }),
        ],
      }),
    );
  });

  it("refuses an exact gas changed after review, or one that is not positive", async () => {
    const { wallet, deps } = setup();
    const prompts = reviewUi();
    const call = payCall(5n, { gas: 300_000n });
    await expect(
      sendReviewed(
        action([call], { reverify: async () => void (call.gas = 400_000n) }),
        deps,
      ),
    ).rejects.toThrow(CHANGED);
    expect(prompts).toHaveLength(1);
    for (const gas of [0n, -1n, 5 as unknown as bigint])
      await expect(
        sendReviewed(action([payCall(5n, { gas })]), deps),
      ).rejects.toThrow(
        "This call's gas limit is not valid. Nothing was sent.",
      );
    expect(prompts).toHaveLength(1);
    expect(wallet.adapter.sendTransaction).not.toHaveBeenCalled();
  });

  it("a Safe app proposes with safeTxGas 0 whatever gas the app set", async () => {
    const { wallet, deps } = setup();
    wallet.state.safe = true;
    const prompts = reviewUi();
    await sendReviewed(action([payCall(5n, { gas: 300_000n })]), deps);
    expect(prompts[0].model.calls[0]).toMatchObject({
      gas: null,
      safeTxGas: 0n,
    });
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ gas: 0n }),
    );
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

    // A rejection's name without code 4001 may have broadcast: it stays held.
    const named = payCall(6n);
    wallet.adapter.sendTransaction.mockRejectedValueOnce(
      Object.assign(new Error("Rejected?"), {
        name: "UserRejectedRequestError",
        code: -32000,
      }),
    );
    await expect(sendReviewed(action([named]), deps)).rejects.toThrow(
      "Rejected?",
    );
    expect(hold.open(holdOf(named)).peek().status).toBe("held-no-hash");

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
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(3);
    expect(prompts).toHaveLength(3);
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

  it("a Safe app reuses a queued proposal of the exact call, never a near match", async () => {
    const { wallet, deps, chain, hold, holdOf } = setup();
    wallet.state.safe = true;
    const prompts = reviewUi();
    const call = payCall();
    // Near matches: another amount, value, target, or the same bytes as a DELEGATECALL.
    chain.queueProposal({ ...call, data: payCall(6n).data });
    chain.queueProposal({ ...call, value: 8n });
    chain.queueProposal({ ...call, to: OTHER });
    chain.queueProposal(call, { operation: 1 });
    const exact = chain.queueProposal(call);
    const onSubmitted = vi.fn();
    await expect(
      sendReviewed(action([call], { onSubmitted }), deps),
    ).resolves.toEqual({
      status: "proposed",
      step: 0,
      safeTxHash: exact,
    });
    expect(prompts).toHaveLength(1);
    expect(wallet.adapter.sendTransaction).not.toHaveBeenCalled();
    expect(onSubmitted).toHaveBeenCalledWith(call, 0, exact, {
      safe: true,
      adopted: true,
    });
    // Held as that proposal, with its nonce, so its execution can be proven onchain.
    expect(hold.open({ ...holdOf(call), safe: true }).peek()).toMatchObject({
      record: { hash: exact, safeNonce: "4" },
    });

    // Only near matches queued: the wallet proposes it.
    const other = setup();
    other.wallet.state.safe = true;
    other.chain.queueProposal({ ...call, data: payCall(6n).data });
    other.chain.queueProposal(call, { operation: 1 });
    await expect(sendReviewed(action([call]), other.deps)).resolves.toEqual({
      status: "proposed",
      step: 0,
      safeTxHash: `0x${"1".padStart(64, "0")}`,
    });
    expect(other.wallet.adapter.sendTransaction).toHaveBeenCalledTimes(1);
  });

  it("a Safe app sends nothing when its queue can't be read, or hangs", async () => {
    const { wallet, deps, chain } = setup();
    wallet.state.safe = true;
    reviewUi();
    chain.state.safeService = async () => new Response("down", { status: 503 });
    await expect(sendReviewed(action([payCall()]), deps)).rejects.toThrow();
    expect(wallet.adapter.sendTransaction).not.toHaveBeenCalled();

    // A read that never answers ends, holding nothing.
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      chain.state.safeService = () => new Promise<never>(() => {});
      const hung = sendReviewed(action([payCall()]), deps);
      const settled = expect(hung).rejects.toThrow("did not answer in time");
      await vi.advanceTimersByTimeAsync(8_000);
      await settled;
    } finally {
      vi.useRealTimers();
    }
    expect(wallet.adapter.sendTransaction).not.toHaveBeenCalled();

    // Nothing was reserved: once the queue reads, the same action proposes.
    chain.state.safeService = async (queue) =>
      new Response(JSON.stringify({ next: null, results: queue }));
    await expect(
      sendReviewed(action([payCall()]), deps),
    ).resolves.toMatchObject({ status: "proposed" });
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(1);
  });

  it("sends nothing for an action whose review can't be bound", async () => {
    const { wallet, deps } = setup();
    const prompts = reviewUi();
    await expect(
      sendReviewed(
        action([payCall()], {
          context: [{ label: "When", value: new Date(0) as never }],
        }),
        deps,
      ),
    ).rejects.toThrow("can't be confirmed here");
    expect(prompts).toHaveLength(0);
    expect(wallet.adapter.sendTransaction).not.toHaveBeenCalled();
  });

  it("runs the site's beforeWallet under the hold, before the wallet, and tells it how the step ended", async () => {
    const { wallet, deps, hold, holdOf } = setup();
    reviewUi();
    const events: string[] = [];
    const call = payCall();
    const hooks = {
      beforeWallet: vi.fn(async (step: ReviewedCall, index: number) => {
        // The hold has reserved the step; the wallet has not opened.
        expect(hold.open(holdOf(step)).peek().status).not.toBe("clear");
        events.push(`before ${index}`);
      }),
      onUnsent: vi.fn((_: ReviewedCall, index: number) => {
        events.push(`released ${index}`);
      }),
      onSubmitted: vi.fn((_: ReviewedCall, index: number, hash: Hex) => {
        events.push(`submitted ${index} ${hash.slice(-1)}`);
      }),
    };
    // Its own refusal sends nothing and releases the step.
    hooks.beforeWallet.mockRejectedValueOnce(new Error("Launch changed"));
    await expect(sendReviewed(action([call], hooks), deps)).rejects.toThrow(
      "Launch changed",
    );
    expect(wallet.adapter.sendTransaction).not.toHaveBeenCalled();
    expect(hold.open(holdOf(call)).peek().status).toBe("clear");
    expect(events).toEqual(["released 0"]);

    // A 4001 releases it too.
    events.length = 0;
    wallet.adapter.sendTransaction.mockRejectedValueOnce(
      Object.assign(new Error("User rejected the request."), { code: 4001 }),
    );
    await expect(sendReviewed(action([call], hooks), deps)).rejects.toThrow();
    expect(events).toEqual(["before 0", "released 0"]);

    // Sent: each step is told its hash, the wallet opening between.
    events.length = 0;
    const send = wallet.adapter.sendTransaction.getMockImplementation()!;
    wallet.adapter.sendTransaction.mockImplementation(async (tx) => {
      events.push("wallet");
      return send(tx);
    });
    await sendReviewed(
      action([approveCall(), payCall(5n, { dependsOnPrior: true })], {
        ...hooks,
        scope: "pay",
      }),
      deps,
    );
    expect(events).toEqual([
      "before 0",
      "wallet",
      "submitted 0 1",
      "before 1",
      "wallet",
      "submitted 1 2",
    ]);
    expect(hooks.beforeWallet.mock.calls[1][0]).toMatchObject({
      label: "Pay",
    });

    // An ambiguous failure is neither released nor submitted.
    events.length = 0;
    wallet.adapter.sendTransaction.mockRejectedValueOnce(
      new Error("The request took too long to respond."),
    );
    await expect(
      sendReviewed(action([payCall(9n)], hooks), deps),
    ).rejects.toThrow();
    expect(events).toEqual(["before 0"]);
  });

  it("simulates a lone call no earlier than its simulationBlockNumber", async () => {
    const { wallet, deps, chain } = setup();
    reviewUi();
    const blocks: unknown[] = [];
    chain.state.ethCall = (params) => {
      blocks.push(params[1]);
      return "0x";
    };
    // The node is past the prerequisite's block: the latest state decides.
    await sendReviewed(
      action([payCall(5n, { simulationBlockNumber: 90n })]),
      deps,
    );
    expect(blocks).toEqual([numberToHex(100n), numberToHex(100n)]);
    expect(chain.client.estimateGas).toHaveBeenLastCalledWith(
      expect.objectContaining({ blockNumber: 100n }),
    );

    // Not there yet: the prerequisite's own block.
    blocks.length = 0;
    await sendReviewed(
      action([payCall(6n, { simulationBlockNumber: 200n })]),
      deps,
    );
    expect(blocks).toEqual([numberToHex(200n), numberToHex(200n)]);

    // A call that ran at the prerequisite's block but reverts now is refused.
    const head = numberToHex(chain.state.head);
    chain.state.ethCall = (params) => {
      if (params[1] === head) throw reverted();
      return "0x";
    };
    const sends = wallet.adapter.sendTransaction.mock.calls.length;
    await expect(
      sendReviewed(action([payCall(7n, { simulationBlockNumber: 90n })]), deps),
    ).rejects.toThrow();
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(sends);
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

  it("hands a self-reviewing wallet an app's exact gas", async () => {
    const { deps } = setup();
    const submit = vi.fn(async () => `0x${"ab".repeat(32)}` as Hex);
    const previews: { calls: { gas: bigint | null }[] }[] = [];
    const call = payCall(5n, { gas: 300_000n });
    await sendReviewed(action([call]), {
      ...deps,
      adapter: selfReviewingAdapter({ account: () => ACCOUNT, submit }),
      onPreview: (model) => previews.push(model),
    });
    expect(previews[0].calls[0].gas).toBe(300_000n);
    expect(submit).toHaveBeenCalledWith({
      account: ACCOUNT,
      calls: [
        {
          chainId: 10,
          to: TERMINAL,
          data: call.data,
          value: 7n,
          gas: 300_000n,
        },
      ],
    });
  });

  it("runs the site's wallet-boundary hooks around a self-reviewing wallet's submit", async () => {
    const { deps } = setup();
    const events: string[] = [];
    const hooks = {
      beforeWallet: (_: ReviewedCall, step: number) => {
        events.push(`before ${step}`);
      },
      onUnsent: (_: ReviewedCall, step: number) => {
        events.push(`released ${step}`);
      },
      onSubmitted: (_: ReviewedCall, step: number, hash: Hex) => {
        events.push(`submitted ${step} ${hash.slice(-2)}`);
      },
    };
    const submit = vi.fn(async () => `0x${"ab".repeat(32)}` as Hex);
    const signa = {
      ...deps,
      adapter: selfReviewingAdapter({ account: () => ACCOUNT, submit }),
    };
    await sendReviewed(action([approveCall(), payCall()], hooks), signa);
    expect(events).toEqual([
      "before 0",
      "before 1",
      "submitted 0 ab",
      "submitted 1 ab",
    ]);

    events.length = 0;
    submit.mockRejectedValueOnce(
      Object.assign(new Error("no"), { code: 4001 }),
    );
    await expect(
      sendReviewed(action([payCall()], hooks), signa),
    ).rejects.toThrow();
    expect(events).toEqual(["before 0", "released 0"]);

    // A site's failure to record a submitted step never reads as unsent, and
    // every step is still told.
    events.length = 0;
    const told: number[] = [];
    await expect(
      sendReviewed(
        action([approveCall(), payCall()], {
          ...hooks,
          onSubmitted: (_, step) => {
            told.push(step);
            if (step === 0)
              throw Object.assign(new Error("no"), { code: 4001 });
          },
        }),
        signa,
      ),
    ).rejects.toBeInstanceOf(SubmittedContractWriteError);
    expect(told).toEqual([0, 1]);
    expect(events).toEqual(["before 0", "before 1"]);

    // An account switch while a hook ran: refused, released, never submitted.
    events.length = 0;
    let account: Address = ACCOUNT;
    const switching = {
      ...deps,
      adapter: selfReviewingAdapter({ account: () => account, submit }),
    };
    await expect(
      sendReviewed(
        action([payCall()], {
          ...hooks,
          beforeWallet: (call, step) => {
            hooks.beforeWallet(call, step);
            account = OTHER;
          },
        }),
        switching,
      ),
    ).rejects.toThrow("The connected account changed");
    expect(events).toEqual(["before 0", "released 0"]);
    expect(submit).toHaveBeenCalledTimes(3);

    // The site's own refusal: nothing reaches the wallet.
    events.length = 0;
    await expect(
      sendReviewed(
        action([payCall()], {
          ...hooks,
          beforeWallet: () => {
            throw new Error("Launch changed");
          },
        }),
        signa,
      ),
    ).rejects.toThrow("Launch changed");
    expect(submit).toHaveBeenCalledTimes(3);
    expect(events).toEqual(["released 0"]);
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

  it("shows the handler a frozen model it cannot edit", async () => {
    const { deps } = setup();
    reviewUi(async (prompt) => {
      expect(() => {
        (prompt.model.calls[0] as { to: Address }).to = OTHER;
      }).toThrow(TypeError);
      expect(() => {
        (prompt.model.calls[0] as { value: bigint }).value = 0n;
      }).toThrow(TypeError);
      expect(Object.isFrozen(prompt)).toBe(true);
      expect(Object.isFrozen((await prompt.enriched).warnings)).toBe(true);
      return prompt.confirmation;
    });
    await expect(
      sendReviewed(action([payCall()]), deps),
    ).resolves.toMatchObject({
      status: "done",
    });
  });

  it("checks the account after every callback before the wallet opens", async () => {
    const { wallet, deps, hold, holdOf } = setup();
    reviewUi();
    const call = payCall();
    await expect(
      sendReviewed(
        action([call], {
          assertWriteState: () => void (wallet.state.account = OTHER),
        }),
        deps,
      ),
    ).rejects.toThrow("The connected account changed. Review again.");
    expect(wallet.adapter.sendTransaction).not.toHaveBeenCalled();
    expect(hold.open(holdOf(call)).peek().status).toBe("clear");
  });

  it("refuses a second prompt of the same action once the first one sent", async () => {
    const { wallet, deps } = setup();
    const answers: (() => void)[] = [];
    reviewUi(
      (prompt) =>
        new Promise((resolve) =>
          answers.push(() => resolve(prompt.confirmation)),
        ),
    );
    const call = payCall();
    const first = sendReviewed(action([call]), deps);
    const second = sendReviewed(action([call]), deps);
    await vi.waitFor(() => expect(answers).toHaveLength(2));
    answers[0]();
    await expect(first).resolves.toMatchObject({ status: "done" });
    answers[1]();
    await expect(second).rejects.toBeInstanceOf(WriteHoldStaleReviewError);
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(1);
    // Sent and settled, the same action reviewed afresh sends normally.
    answers.length = 0;
    const again = sendReviewed(action([call]), deps);
    await vi.waitFor(() => expect(answers).toHaveLength(1));
    answers[0]();
    await expect(again).resolves.toMatchObject({ status: "done" });
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(2);
  });

  it("reads a sequence step that reverts with no data as a revert", async () => {
    const { wallet, deps, chain } = setup();
    chain.client.simulateCalls.mockImplementationOnce(async ({ calls }) => ({
      results: calls.map((_, index) =>
        index === 1
          ? {
              status: "failure",
              error: Object.assign(new Error("no data"), {
                name: "ContractFunctionExecutionError",
                shortMessage: "The contract function returned no data.",
                cause: Object.assign(new Error("zero data"), {
                  name: "ContractFunctionZeroDataError",
                }),
              }),
            }
          : { status: "success" },
      ),
    }));
    reviewUi(async (prompt) => {
      expect(await prompt.simulation).toMatchObject({ status: "failed" });
      return prompt.confirmation;
    });
    await expect(
      sendReviewed(
        action([approveCall(), payCall(5n, { dependsOnPrior: true })]),
        deps,
      ),
    ).rejects.toThrow("Pay cannot run on OP Mainnet");
    expect(wallet.adapter.sendTransaction).not.toHaveBeenCalled();
  });

  it("reports a revert on one chain while another chain's simulation is still pending", async () => {
    const { wallet, deps, chain } = setup();
    const base = fakeChain();
    base.client.chain = { id: 8453, name: "Base" };
    base.state.ethCall = () => new Promise(() => {});
    chain.state.ethCall = () => {
      throw reverted();
    };
    reviewUi(async (prompt) => {
      expect(await prompt.simulation).toMatchObject({ status: "failed" });
      return prompt.confirmation;
    });
    await expect(
      sendReviewed(action([payCall(), { ...payCall(6n), chainId: 8453 }]), {
        ...deps,
        clientFor: (chainId) =>
          (chainId === 8453
            ? base.client
            : chain.client) as unknown as PublicClient,
      }),
    ).rejects.toThrow("Pay cannot run on OP Mainnet: Execution reverted: NOPE");
    expect(wallet.adapter.sendTransaction).not.toHaveBeenCalled();
  });

  it("sends every step of one intent without calling its own reservation stale", async () => {
    const { wallet, deps } = setup();
    const prompts = reviewUi();
    const result = await sendReviewed(
      action(
        [approveCall(), payCall(5n, { dependsOnPrior: true })].map((call) => ({
          ...call,
          intent: "pay:1",
        })),
      ),
      deps,
    );
    expect(result.status).toBe("done");
    expect(prompts).toHaveLength(1);
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(2);
  });

  it("enforces core's own copy of a reported revert, whatever the handler does to it", async () => {
    const { wallet, deps, chain } = setup();
    chain.state.ethCall = () => {
      throw reverted();
    };
    reviewUi(async (prompt) => {
      const simulation = await prompt.simulation;
      expect(() => {
        (simulation as { status: string }).status = "passed";
      }).toThrow(TypeError);
      return prompt.confirmation;
    });
    await expect(sendReviewed(action([payCall()]), deps)).rejects.toThrow(
      "Pay cannot run on OP Mainnet",
    );
    expect(wallet.adapter.sendTransaction).not.toHaveBeenCalled();
  });

  it("reads an RPC failure as unavailable whatever the call is labelled", async () => {
    const { deps, chain } = setup();
    // No eth_simulateV1: each call runs alone, and the node is unreachable.
    chain.client.simulateCalls.mockImplementationOnce(async () => {
      throw Object.assign(new Error("method not found"), { code: -32601 });
    });
    chain.state.ethCall = () => {
      throw unreachable();
    };
    reviewUi(async (prompt) => {
      expect(await prompt.simulation).toMatchObject({ status: "unavailable" });
      chain.state.ethCall = () => "0x";
      return prompt.confirmation;
    });
    await expect(
      sendReviewed(
        action([
          { ...approveCall(), label: "Revert upgrade approval" },
          payCall(5n, { label: "Revert upgrade" }),
        ]),
        deps,
      ),
    ).resolves.toMatchObject({ status: "done" });
  });
});
