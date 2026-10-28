import {
  REVIEWED_SIMULATION_FAILED_LINE,
  REVIEWED_SIMULATION_UNEXPLAINED_LINE,
} from "./messages.js";
import {
  encodeAbiParameters,
  encodeFunctionData,
  numberToHex,
  type Address,
  type Hex,
  type PublicClient,
  type WalletClient,
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
  liquidityCall,
  payCall,
  resetReviewUi,
  reverted,
  reviewUi,
  setup,
  speedUpNextSend,
  unreachable,
  unregister,
} from "./__fixtures__/reviewedSend.js";
import type { ReviewConfirmation } from "./confirm.js";
import { TransactionReceiptUnavailableError } from "./receipt.js";
import {
  HELD_AWAY_SUCCESS_LINE,
  WRITE_HOLD_REVERTED_LINE,
} from "./messages.js";
import { decodePayFailure } from "../v6/executionErrors.js";
import { buildReviewModel } from "./model.js";
import {
  discardReviewedSequence,
  findReviewedSequence,
  REVIEWED_SEQUENCE_HELD_LINE,
} from "./sequence.js";
import { encodeMultiSend, MULTI_SEND_CALL_ONLY } from "../safe.js";
import { safeBatchIntent } from "./intents.js";
import {
  ReviewedCallRevertedError,
  ReviewedReceiptUnverifiedError,
  ReviewLineError,
} from "./lineError.js";
import {
  completeReviewedStep,
  resumeReviewed,
  SAFE_BATCH_UNFOLLOWABLE_LINE,
  SAFE_BATCH_UNSUPPORTED_LINE,
  sendReviewed,
  type ReviewedCall,
} from "./send.js";
import { REVERT_UNKNOWN_LINE } from "./simulation.js";
import {
  selfReviewingAdapter,
  viemWalletAdapter,
  WALLET_NOT_READY_LINE,
} from "./wallet.js";
import { TransactionReviewCancelledError } from "./reviewQueue.js";
import {
  openStepHold,
  WriteHeldError,
  WriteHoldStaleReviewError,
} from "./writeHold.js";

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

  it("reads the wallet's kind only once its ready settles", async () => {
    const { wallet, deps } = setup();
    const prompts = reviewUi();
    // Safe{Wallet} over WalletConnect is known once its peer metadata settles.
    const adapter = {
      ...wallet.adapter,
      ready: vi.fn(async () => {
        await Promise.resolve();
        wallet.state.safe = true;
      }),
    };
    const result = await sendReviewed(action([payCall()]), {
      ...deps,
      adapter,
    });
    expect(adapter.ready).toHaveBeenCalled();
    expect(prompts[0].model.calls[0].safeTxGas).toBe(0n);
    expect(result).toMatchObject({ status: "proposed" });
  });

  it("sends nothing when the wallet's ready fails or never settles", async () => {
    const { wallet, deps } = setup();
    const prompts = reviewUi();
    const failing = {
      ...wallet.adapter,
      ready: () => Promise.reject(new Error("peer")),
    };
    await expect(
      sendReviewed(action([payCall()]), { ...deps, adapter: failing }),
    ).rejects.toThrow(WALLET_NOT_READY_LINE);
    const throwing = {
      ...wallet.adapter,
      ready: (): Promise<void> => {
        throw new Error("peer");
      },
    };
    await expect(
      sendReviewed(action([payCall()]), { ...deps, adapter: throwing }),
    ).rejects.toThrow(WALLET_NOT_READY_LINE);
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      const stuck = {
        ...wallet.adapter,
        ready: () => new Promise<void>(() => {}),
      };
      const sending = sendReviewed(action([payCall()]), {
        ...deps,
        adapter: stuck,
      });
      const refused = expect(sending).rejects.toThrow(WALLET_NOT_READY_LINE);
      await vi.advanceTimersByTimeAsync(10_000);
      await refused;
    } finally {
      vi.useRealTimers();
    }
    expect(prompts).toHaveLength(0);
    expect(wallet.adapter.sendTransaction).not.toHaveBeenCalled();
  });

  it("a mined revert carries its receipt and never traps the action", async () => {
    const { wallet, deps, chain } = setup();
    const prompts = reviewUi();
    chain.state.status = "reverted";
    const call = payCall();
    const failure = await sendReviewed(action([call]), deps).catch(
      (error: unknown) => error,
    );
    expect(failure).toBeInstanceOf(ReviewedCallRevertedError);
    expect((failure as Error).message).toBe(WRITE_HOLD_REVERTED_LINE);
    expect(failure).toMatchObject({
      step: 0,
      hash: `0x${"1".padStart(64, "0")}`,
      receipt: expect.objectContaining({ status: "reverted" }),
    });
    // The same action can be reviewed and sent again.
    chain.state.status = "success";
    await expect(sendReviewed(action([call]), deps)).resolves.toMatchObject({
      status: "done",
    });
    expect(prompts).toHaveLength(2);
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(2);
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
    await expect(
      sendReviewed(action([payCall(6n)]), deps),
    ).rejects.toMatchObject({
      message: REVIEWED_SIMULATION_UNEXPLAINED_LINE,
      cause: expect.objectContaining({
        message: expect.stringContaining(
          `Pay cannot run on OP Mainnet: ${REVERT_UNKNOWN_LINE}`,
        ),
      }),
    });

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
    ).rejects.toMatchObject({
      // Viem's text is never the reason: no revert data, no reason shown.
      message: REVIEWED_SIMULATION_UNEXPLAINED_LINE,
      cause: expect.objectContaining({
        message: `Pay cannot run on OP Mainnet: ${REVERT_UNKNOWN_LINE}`,
      }),
    });
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(1);
  });

  it("names the chain in a revert line when the client carries no chain", async () => {
    const { deps, chain } = setup();
    (chain.client as { chain?: unknown }).chain = undefined;
    chain.state.ethCall = () => {
      throw reverted();
    };
    const lines: string[] = [];
    reviewUi(async (prompt) => {
      const simulation = await prompt.simulation;
      if (simulation.status === "failed") lines.push(simulation.message);
      return null;
    });
    await sendReviewed(action([payCall(6n)]), deps).catch(() => undefined);
    expect(lines).toEqual([
      `Pay cannot run on OP Mainnet: ${REVERT_UNKNOWN_LINE}`,
    ]);
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
    // The pre-wallet simulation's revert is the SDK's decoded line.
    await expect(sendReviewed(action([call]), deps)).rejects.toThrow(
      new ReviewLineError(
        `Pay cannot run on OP Mainnet: ${REVERT_UNKNOWN_LINE}`,
      ),
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

  it("a Safe app adopts a queued proposal that differs only in the args it lists, only to the same target, value and operation", async () => {
    const { wallet, deps, chain, hold, holdOf } = setup();
    wallet.state.safe = true;
    const prompts = reviewUi();
    // A liquidity retry: the same unlock data with a fresh deadline.
    const call = liquidityCall("0xabcd", 2_000n, { adoptIgnoringArgs: [1] });
    const older = liquidityCall("0xabcd", 1_000n);
    chain.queueProposal({ ...older, value: 8n });
    chain.queueProposal({ ...older, to: OTHER });
    chain.queueProposal(older, { operation: 1 });
    chain.queueProposal(liquidityCall("0xabce", 1_000n));
    // Same args with trailing bytes: not the canonical encoding.
    chain.queueProposal({ ...older, data: `${older.data}00` });
    const queued = chain.queueProposal(older);
    await expect(
      sendReviewed(action([call], { scope: "liquidity" }), deps),
    ).resolves.toEqual({ status: "proposed", step: 0, safeTxHash: queued });
    expect(prompts).toHaveLength(1);
    // The model binds the list.
    const modelOf = (extra: Partial<ReviewedCall>) =>
      buildReviewModel({
        calls: [
          {
            ...liquidityCall("0xabcd", 2_000n, extra),
            from: ACCOUNT,
            safeTxGas: 0n,
          },
        ],
      }).id;
    expect(prompts[0].model.id).toBe(modelOf({ adoptIgnoringArgs: [1] }));
    expect(prompts[0].model.id).not.toBe(modelOf({}));
    expect(wallet.adapter.sendTransaction).not.toHaveBeenCalled();
    // Held as the call the adopted proposal runs, so its expiry can be proven.
    expect(hold.open({ ...holdOf(call), safe: true }).peek()).toMatchObject({
      record: { hash: queued, call: { data: older.data } },
    });

    // Its sequence can't be discarded while the adopted proposal is held.
    const saved = findReviewedSequence("liquidity", ACCOUNT, {
      storage: deps.storage,
    })!;
    await expect(
      discardReviewedSequence(saved, { storage: deps.storage }),
    ).rejects.toThrow(REVIEWED_SEQUENCE_HELD_LINE);

    // A list changed after review adopts nothing and sends nothing.
    const changed = setup();
    changed.wallet.state.safe = true;
    changed.chain.queueProposal(payCall(261n));
    const reviewed = payCall(5n, { adoptIgnoringArgs: [0] });
    await expect(
      sendReviewed(
        action([reviewed], {
          reverify: async () => {
            reviewed.adoptIgnoringArgs = [0, 1];
          },
        }),
        changed.deps,
      ),
    ).rejects.toThrow(CHANGED);
    expect(changed.wallet.adapter.sendTransaction).not.toHaveBeenCalled();

    // A different amount is never adopted: pay(261) is not pay(5).
    for (const extra of [
      {},
      { adoptIgnoringArgs: [] },
      { adoptIgnoringArgs: [0] },
    ]) {
      const other = setup();
      other.wallet.state.safe = true;
      other.chain.queueProposal(payCall(261n));
      other.chain.queueProposal({ ...payCall(5n), data: "0x1234" });
      await expect(
        sendReviewed(action([payCall(5n, extra)]), other.deps),
      ).resolves.toMatchObject({ status: "proposed" });
      expect(other.wallet.adapter.sendTransaction).toHaveBeenCalledTimes(1);
    }
  });

  it("adopts by the queued call's own selector, whatever its overloads or hex case", async () => {
    const OVERLOADED = [
      {
        type: "function",
        name: "f",
        stateMutability: "nonpayable",
        inputs: [
          { name: "proof", type: "uint256[]" },
          { name: "amount", type: "uint256" },
        ],
        outputs: [],
      },
      {
        type: "function",
        name: "f",
        stateMutability: "nonpayable",
        inputs: [
          { name: "proof", type: "bytes[]" },
          { name: "amount", type: "uint256" },
        ],
        outputs: [],
      },
    ] as const;
    const fCall = (
      proof: readonly bigint[],
      extra: Partial<ReviewedCall> = {},
    ): ReviewedCall => ({
      chainId: 10,
      to: TERMINAL,
      data: encodeFunctionData({
        abi: [OVERLOADED[0]],
        functionName: "f",
        args: [proof, 5n],
      }),
      value: 7n,
      abi: OVERLOADED,
      functionName: "f",
      args: [proof, 5n],
      ...extra,
    });
    for (const queuedData of [
      fCall([]).data,
      fCall([2n]).data.toUpperCase().replace(/^0X/, "0x") as Hex,
    ]) {
      const { wallet, deps, chain } = setup();
      wallet.state.safe = true;
      reviewUi();
      const queued = chain.queueProposal({ ...fCall([]), data: queuedData });
      await expect(
        sendReviewed(action([fCall([1n], { adoptIgnoringArgs: [0] })]), deps),
      ).resolves.toEqual({ status: "proposed", step: 0, safeTxHash: queued });
      expect(wallet.adapter.sendTransaction).not.toHaveBeenCalled();
    }
  });

  it("refuses an adoption list it can't apply, sending nothing", async () => {
    for (const extra of [
      { adoptIgnoringArgs: [2] },
      { adoptIgnoringArgs: [-1] },
      { adoptIgnoringArgs: [0.5] },
      { adoptIgnoringArgs: [0, 0] },
      { adoptIgnoringArgs: "1" as unknown as number[] },
      { adoptIgnoringArgs: [0], abi: undefined },
    ]) {
      const { wallet, deps } = setup();
      reviewUi();
      await expect(
        sendReviewed(action([payCall(5n, extra)]), deps),
      ).rejects.toThrow(
        "This call's adoption rule is not valid. Nothing was sent.",
      );
      expect(wallet.adapter.sendTransaction).not.toHaveBeenCalled();
    }
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

    // A site's failure to record a submitted step never changes what was
    // sent, and every step is still told.
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
    ).resolves.toMatchObject({ status: "done" });
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
    const { wallet, deps, hold } = setup();
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
    // Sent, settled and its success shown, the same action reviewed afresh sends normally.
    const handle = openStepHold(hold, ACCOUNT, false, call);
    await handle.acknowledge(handle.unacknowledgedSuccess()!);
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
    ).rejects.toMatchObject({
      message: REVIEWED_SIMULATION_UNEXPLAINED_LINE,
      cause: expect.objectContaining({
        message: expect.stringContaining("Pay cannot run on OP Mainnet"),
      }),
    });
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
    ).rejects.toMatchObject({
      message: REVIEWED_SIMULATION_UNEXPLAINED_LINE,
      cause: expect.objectContaining({
        message: expect.stringContaining(
          `Pay cannot run on OP Mainnet: ${REVERT_UNKNOWN_LINE}`,
        ),
      }),
    });
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
    await expect(sendReviewed(action([payCall()]), deps)).rejects.toMatchObject(
      {
        message: REVIEWED_SIMULATION_UNEXPLAINED_LINE,
        cause: expect.objectContaining({
          message: expect.stringContaining("Pay cannot run on OP Mainnet"),
        }),
      },
    );
    expect(wallet.adapter.sendTransaction).not.toHaveBeenCalled();
  });

  it("says the review shows why only for a revert the SDK decodes", async () => {
    const { wallet, deps, chain } = setup();
    // JBMultiTerminal_TokenNotAccepted(address), which decodePayFailure knows.
    chain.state.ethCall = () => {
      throw Object.assign(reverted(), {
        data: `0xecb6c1d6${"0".repeat(24)}${"1".repeat(40)}`,
      });
    };
    reviewUi(async (prompt) => {
      expect(await prompt.simulation).toMatchObject({
        status: "failed",
        explained: true,
      });
      return prompt.confirmation;
    });
    await expect(sendReviewed(action([payCall()]), deps)).rejects.toMatchObject(
      { message: REVIEWED_SIMULATION_FAILED_LINE },
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

describe("a Safe app batch", () => {
  const PROPOSAL = `0x${"ab".repeat(32)}` as Hex;
  /** A Safe app connection that takes `wallet_sendCalls` as one proposal. */
  function safeApp(answer: () => Promise<string> = async () => PROPOSAL) {
    const context = setup();
    context.wallet.state.safe = true;
    const sendCalls = vi.fn(
      async (_chainId: number, _calls: readonly unknown[]) => answer(),
    );
    const adapter = { ...context.wallet.adapter, sendCalls };
    return { ...context, sendCalls, deps: { ...context.deps, adapter } };
  }
  const batchHold = (calls: ReviewedCall[]) => ({
    chainId: 10,
    account: ACCOUNT,
    safe: true,
    call: {
      to: MULTI_SEND_CALL_ONLY,
      data: encodeMultiSend(
        calls.map(({ to, data, value }) => ({ to, data, value: value ?? 0n })),
      ),
      value: 0n,
    },
    namespace: safeBatchIntent({ chainId: 10, safe: ACCOUNT, calls }),
  });

  it("proposes every call as one Safe transaction under one hold", async () => {
    const prompts = reviewUi();
    const { wallet, deps, sendCalls, hold, storage } = safeApp();
    const calls = [approveCall(), payCall(5n, { dependsOnPrior: true })];
    const onSubmitted = vi.fn();
    const result = await sendReviewed(
      action(calls, { batch: true, scope: "pay", onSubmitted }),
      deps,
    );
    expect(prompts).toHaveLength(1);
    expect(prompts[0].model.calls).toHaveLength(2);
    expect(sendCalls).toHaveBeenCalledTimes(1);
    expect(sendCalls).toHaveBeenCalledWith(
      10,
      calls.map(({ to, data, value }) => ({ to, data, value: value ?? 0n })),
    );
    expect(wallet.adapter.sendTransaction).not.toHaveBeenCalled();
    expect(result).toEqual({
      status: "proposed",
      step: 0,
      safeTxHash: PROPOSAL,
    });
    expect(
      onSubmitted.mock.calls.map(([, step, hash]) => [step, hash]),
    ).toEqual([
      [0, PROPOSAL],
      [1, PROPOSAL],
    ]);
    expect(hold.open(batchHold(calls)).peek().status).not.toBe("clear");
    // One Safe transaction: nothing to resume step by step.
    expect(findReviewedSequence("pay", ACCOUNT, { storage })).toBeNull();
  });

  it("a wallet's refusal releases the hold and tells every step", async () => {
    reviewUi();
    const { deps, hold } = safeApp(async () => {
      throw Object.assign(new Error("User rejected"), { code: 4001 });
    });
    const calls = [approveCall(), payCall(5n)];
    const onUnsent = vi.fn();
    await expect(
      sendReviewed(
        action(calls, { batch: true, onUnsent, beforeWallet: vi.fn() }),
        deps,
      ),
    ).rejects.toMatchObject({ code: 4001 });
    expect(onUnsent.mock.calls.map(([, step]) => step)).toEqual([0, 1]);
    expect(hold.open(batchHold(calls)).peek().status).toBe("clear");
  });

  it("an ambiguous failure keeps the batch held", async () => {
    reviewUi();
    const { deps, hold } = safeApp(async () => {
      throw new Error("The request took too long to respond.");
    });
    const calls = [approveCall(), payCall(5n)];
    await expect(
      sendReviewed(action(calls, { batch: true }), deps),
    ).rejects.toThrow("too long");
    expect(hold.open(batchHold(calls)).peek().status).not.toBe("clear");
  });

  it("an id that is not a Safe transaction hash keeps the batch held", async () => {
    reviewUi();
    const { deps, hold } = safeApp(async () => "batch-1");
    const calls = [approveCall(), payCall(5n)];
    await expect(
      sendReviewed(action(calls, { batch: true }), deps),
    ).rejects.toThrow(SAFE_BATCH_UNFOLLOWABLE_LINE);
    expect(hold.open(batchHold(calls)).peek().status).not.toBe("clear");
  });

  it("refuses before the review what one proposal can't carry, or a changed call", async () => {
    const prompts = reviewUi();
    const { deps, sendCalls } = safeApp();
    const other = { ...payCall(5n), chainId: 8453 };
    await expect(
      sendReviewed(action([approveCall(), other], { batch: true }), deps),
    ).rejects.toThrow(SAFE_BATCH_UNSUPPORTED_LINE);
    const { sendCalls: _none, ...plain } = deps.adapter;
    await expect(
      sendReviewed(action([approveCall(), payCall(5n)], { batch: true }), {
        ...deps,
        adapter: plain,
      }),
    ).rejects.toThrow(SAFE_BATCH_UNSUPPORTED_LINE);
    expect(prompts).toHaveLength(0);

    const pay = payCall(5n);
    reviewUi(async (prompt) => {
      pay.value = 8n;
      return prompt.confirmation;
    });
    await expect(
      sendReviewed(action([approveCall(), pay], { batch: true }), deps),
    ).rejects.toThrow(CHANGED);
    expect(sendCalls).not.toHaveBeenCalled();
  });

  it("tells every step its proposal, whatever an earlier callback does", async () => {
    reviewUi();
    const { deps } = safeApp();
    const onSubmitted = vi.fn(async (_call: ReviewedCall, step: number) => {
      if (step === 0) throw new Error("the site's record failed");
    });
    await expect(
      sendReviewed(
        action([approveCall(), payCall(5n)], { batch: true, onSubmitted }),
        deps,
      ),
    ).resolves.toMatchObject({ status: "proposed" });
    expect(onSubmitted.mock.calls.map(([, step]) => step)).toEqual([0, 1]);
  });

  it("a Safe proposal whose site record failed is still a proposal", async () => {
    reviewUi();
    const { deps } = safeApp();
    await expect(
      sendReviewed(
        action([payCall(5n)], {
          onSubmitted: () => {
            throw new Error("the site's record failed");
          },
        }),
        deps,
      ),
    ).resolves.toMatchObject({ status: "proposed" });
  });

  it("an ordinary wallet sends a batch's calls one by one", async () => {
    reviewUi();
    const { wallet, deps } = setup();
    const result = await sendReviewed(
      action([approveCall(), payCall(5n)], { batch: true, scope: "pay" }),
      deps,
    );
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ status: "done" });
  });
});

describe("sendReviewed and its hold's evidence", () => {
  const FIRST = `0x${"1".padStart(64, "0")}`;

  it("refuses a run while the call's last success is unacknowledged, until it is acknowledged", async () => {
    const { wallet, deps, hold } = setup();
    const prompts = reviewUi();
    const call = payCall();
    await expect(sendReviewed(action([call]), deps)).resolves.toMatchObject({
      status: "done",
    });
    // Nothing showed that success (a remount lost it): a second run sends nothing.
    const refused = await sendReviewed(action([call]), deps).catch(
      (error: unknown) => error,
    );
    expect(refused).toMatchObject({
      message: HELD_AWAY_SUCCESS_LINE,
      success: { result: "success", hash: FIRST },
    });
    expect(prompts).toHaveLength(1);
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(1);
    // "Send it again": one acknowledgement lets the next run through.
    await openStepHold(hold, ACCOUNT, false, call).acknowledge(
      (refused as { success: { result: "success"; hash: Hex } }).success,
    );
    await expect(sendReviewed(action([call]), deps)).resolves.toMatchObject({
      status: "done",
    });
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(2);
  });

  it("a refusal before the wallet is called releases the held step and keeps its message", async () => {
    const { wallet, deps, hold } = setup();
    reviewUi();
    let safe = false;
    const sendTransaction = vi.fn();
    const adapter = viemWalletAdapter({
      // The wallet turns into a Safe connection while its client loads.
      walletClient: async () => {
        safe = true;
        return { sendTransaction } as unknown as WalletClient;
      },
      account: () => ACCOUNT,
      chainId: () => 10,
      isSafe: () => safe,
      switchChain: async () => undefined,
    });
    const call = payCall();
    const onUnsent = vi.fn();
    const refused = await sendReviewed(action([call], { onUnsent }), {
      ...deps,
      adapter: { ...adapter, isSafe: () => false },
    }).catch((error: unknown) => error);
    expect(refused).toMatchObject({
      message: "Wallet connection changed. Review the transaction again.",
    });
    expect(refused).not.toBeInstanceOf(TransactionReviewCancelledError);
    expect(sendTransaction).not.toHaveBeenCalled();
    expect(onUnsent).toHaveBeenCalledTimes(1);
    expect(openStepHold(hold, ACCOUNT, false, call).peek().status).toBe(
      "clear",
    );
    // Released, so the same call reviewed again sends.
    await expect(sendReviewed(action([call]), deps)).resolves.toMatchObject({
      status: "done",
    });
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(1);

    // A provider error that only looks like the refusal keeps the step held.
    wallet.adapter.sendTransaction.mockRejectedValueOnce(
      Object.assign(new Error("Wallet connection changed."), {
        name: "WalletNotInvokedError",
        walletNotInvoked: true,
      }),
    );
    const other = payCall(9n);
    await expect(sendReviewed(action([other]), deps)).rejects.toThrow();
    expect(openStepHold(hold, ACCOUNT, false, other).peek().status).not.toBe(
      "clear",
    );
  });

  it("reports done only once the hold verified the receipt", async () => {
    const { deps, chain, hold, progress } = setup();
    reviewUi();
    const read = chain.client.getTransactionReceipt.getMockImplementation()!;
    // The wallet's receipt arrives, but the hold's own read of it fails: it can't verify it yet.
    chain.client.getTransactionReceipt.mockImplementation(async () => {
      throw new Error("lagging node");
    });
    const call = payCall();
    const failure = await sendReviewed(action([call]), deps).catch(
      (error: unknown) => error,
    );
    expect(failure).toMatchObject({
      name: "ReviewedReceiptUnverifiedError",
      step: 0,
      hash: FIRST,
    });
    expect(progress.map(({ phase }) => phase)).not.toContain("done");
    const handle = openStepHold(hold, ACCOUNT, false, call);
    expect(handle.peek().status).toBe("pending-known-hash");
    // Once the hold can read it, the hold settles it.
    chain.client.getTransactionReceipt.mockImplementation(read);
    await expect(
      handle.state(chain.client as unknown as PublicClient),
    ).resolves.toMatchObject({
      status: "clear",
      settled: { result: "success", hash: FIRST },
    });
  });

  /** A two-step run left at its second step's receipt, which the hold verifies once `read` is back. */
  async function leftAtReceipt(
    extra: Partial<Parameters<typeof action>[1]> = {},
  ) {
    const { deps, chain, hold, storage, wallet, memory } = setup();
    reviewUi();
    const read = chain.client.getTransactionReceipt.getMockImplementation()!;
    const payment = `0x${"2".padStart(64, "0")}`;
    let lagging = true;
    // The approval verifies; the payment's receipt lags.
    chain.client.getTransactionReceipt.mockImplementation(async (args) => {
      if (lagging && args.hash === payment) throw new Error("lagging node");
      return read(args);
    });
    const calls = [approveCall(), payCall()];
    const onConfirmed = vi.fn();
    const scope = "pay:late";
    const failure = await sendReviewed(
      action(calls, { scope, onConfirmed, ...extra }),
      deps,
    ).catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(ReviewedReceiptUnverifiedError);
    const unverified = failure as ReviewedReceiptUnverifiedError;
    const recover = () => (lagging = false);
    return {
      deps,
      chain,
      hold,
      storage,
      wallet,
      calls,
      read,
      scope,
      onConfirmed,
      unverified,
      recover,
      relag: () => (lagging = true),
      memory,
      payment: payment as Hex,
    };
  }

  it("never completes a saved ordinary failure with no block whose transaction now reads a success, nor sends it again", async () => {
    const {
      deps,
      chain,
      hold,
      storage,
      wallet,
      calls,
      scope,
      unverified,
      recover,
      memory,
      payment,
    } = await leftAtReceipt();
    // It reverted, and its hold verified that.
    chain.state.status = "reverted";
    recover();
    const handle = openStepHold(hold, ACCOUNT, false, calls[1]);
    await expect(
      handle.state(chain.client as unknown as PublicClient),
    ).resolves.toMatchObject({ settled: { result: "failed" } });
    // Saved by 4.x: no block, no provenance.
    for (const [key, value] of memory) {
      const saved = JSON.parse(value) as Record<string, unknown> | null;
      if (saved?.result === "failed") {
        delete saved.blockHash;
        delete saved.safe;
        memory.set(key, JSON.stringify(saved));
      }
    }
    // Reorged out and mined again, a success.
    chain.state.status = "success";
    chain.state.head += 1n;
    chain.state.mined.set(payment, chain.state.head);
    const onConfirmed = vi.fn();
    await expect(
      completeReviewedStep(
        unverified,
        { account: ACCOUNT, scope, onConfirmed },
        deps,
      ),
    ).rejects.toThrow();
    const saved = findReviewedSequence(scope, ACCOUNT, { storage })!;
    expect(saved.sending).toMatchObject({ step: 1 });
    await expect(resumeReviewed(saved, {}, deps)).rejects.toThrow();
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(2);
    expect(onConfirmed).not.toHaveBeenCalled();
  });

  it("never completes a saved success with no block whose transaction now reads reverted", async () => {
    const {
      deps,
      chain,
      hold,
      storage,
      calls,
      scope,
      unverified,
      recover,
      memory,
      payment,
    } = await leftAtReceipt();
    recover();
    const handle = openStepHold(hold, ACCOUNT, false, calls[1]);
    await handle.state(chain.client as unknown as PublicClient);
    // A settlement saved before it kept its block (4.x).
    for (const [key, value] of memory) {
      const saved = JSON.parse(value) as { result?: unknown };
      if (saved?.result === "success" && "blockHash" in saved) {
        delete (saved as { blockHash?: unknown }).blockHash;
        memory.set(key, JSON.stringify(saved));
      }
    }
    // Reorged out and mined again, reverted.
    chain.state.head += 1n;
    chain.state.mined.set(payment, chain.state.head);
    chain.state.status = "reverted";
    await expect(
      completeReviewedStep(unverified, { account: ACCOUNT, scope }, deps),
    ).rejects.toThrow();
    expect(
      findReviewedSequence(scope, ACCOUNT, { storage })?.sending,
    ).toMatchObject({ step: 1 });
  });

  it("completes a verified step with the receipt it is given when a reread fails, telling onConfirmed once", async () => {
    const {
      deps,
      chain,
      hold,
      storage,
      calls,
      scope,
      onConfirmed,
      unverified,
      recover,
      relag,
    } = await leftAtReceipt();
    expect(onConfirmed).toHaveBeenCalledTimes(1);
    // The hold verifies it, and the view reads its receipt.
    recover();
    const handle = openStepHold(hold, ACCOUNT, false, calls[1]);
    await expect(
      handle.state(chain.client as unknown as PublicClient),
    ).resolves.toMatchObject({
      status: "clear",
      settled: { result: "success" },
    });
    const receipt = await chain.client.getTransactionReceipt({
      hash: unverified.hash,
    });
    // Every reread fails from here.
    relag();
    const action$ = { account: ACCOUNT, scope, onConfirmed };
    await expect(
      completeReviewedStep(unverified, action$, deps, receipt as never),
    ).resolves.toMatchObject({
      settled: { result: "success", hash: unverified.hash },
      receipt,
    });
    expect(onConfirmed).toHaveBeenCalledTimes(2);
    expect(onConfirmed.mock.calls[1]).toEqual([calls[1], 1, receipt]);
    expect(findReviewedSequence(scope, ACCOUNT, { storage })).toBeNull();
  });

  it("keeps completion pending, nothing advanced, until the receipt it needs reads", async () => {
    const {
      deps,
      chain,
      hold,
      storage,
      calls,
      scope,
      onConfirmed,
      unverified,
      recover,
      relag,
    } = await leftAtReceipt();
    recover();
    const handle = openStepHold(hold, ACCOUNT, false, calls[1]);
    await handle.state(chain.client as unknown as PublicClient);
    relag();
    const action$ = { account: ACCOUNT, scope, onConfirmed };
    await expect(
      completeReviewedStep(unverified, action$, deps),
    ).rejects.toThrow("lagging node");
    // Nothing advanced: the journal still has the step sending, its success unacknowledged.
    expect(
      findReviewedSequence(scope, ACCOUNT, { storage })?.sending,
    ).toMatchObject({ step: 1 });
    expect(handle.unacknowledgedSuccess()).not.toBeNull();
    expect(onConfirmed).toHaveBeenCalledTimes(1);
    recover();
    await expect(
      completeReviewedStep(unverified, action$, deps),
    ).resolves.toMatchObject({ settled: { result: "success" } });
    expect(onConfirmed).toHaveBeenCalledTimes(2);
    expect(findReviewedSequence(scope, ACCOUNT, { storage })).toBeNull();
  });

  it("keeps a run's signatures on the step it left at its receipt", async () => {
    const { wallet, deps, chain } = setup();
    reviewUi();
    const signature = `0x${"5e".repeat(65)}` as Hex;
    wallet.adapter.signMessage.mockImplementation(async () => signature);
    chain.client.getTransactionReceipt.mockImplementation(async () => {
      throw new Error("lagging node");
    });
    const failure = await sendReviewed(
      action([payCall()], {
        signatures: [{ kind: "message", chainId: 10, message: "List it" }],
      }),
      deps,
    ).catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(ReviewedReceiptUnverifiedError);
    expect((failure as ReviewedReceiptUnverifiedError).held).toMatchObject({
      signatures: [signature],
    });
  });

  it("a sped-up send that the hold verified reports and journals the mined hash, so its success is acknowledged", async () => {
    const { wallet, deps, chain } = setup();
    reviewUi();
    const { replacement } = speedUpNextSend(chain, wallet);
    const scope = "pay:sped-up";
    const result = await sendReviewed(
      action([payCall()], { scope, follow: {} }),
      deps,
    );
    expect(result).toMatchObject({ status: "done" });
    const done = result as Extract<typeof result, { status: "done" }>;
    expect(done.hashes[0]).toBe(done.receipts[0].transactionHash);
    expect(done.hashes[0]).toBe(replacement);
  });

  describe("a sent step's outcome is its hold's verified settlement, never the watcher's receipt", () => {
    it("an original the watcher saw mined, orphaned, its replacement settled: the replacement's receipt everywhere", async () => {
      const { wallet, deps, chain } = setup();
      reviewUi();
      const { original, replacement } = speedUpNextSend(chain, wallet);
      const watch =
        chain.client.waitForTransactionReceipt.getMockImplementation()!;
      chain.client.waitForTransactionReceipt.mockImplementation(async (args) =>
        args.hash === original
          ? ({
              ...(await watch({ hash: replacement })),
              transactionHash: original,
              blockHash: `0x${"0d".repeat(32)}`,
            } as never)
          : watch(args),
      );
      const onConfirmed = vi.fn();
      const result = await sendReviewed(
        action([payCall()], { follow: {}, onConfirmed }),
        deps,
      );
      expect(result).toMatchObject({ status: "done", hashes: [replacement] });
      const done = result as Extract<typeof result, { status: "done" }>;
      expect(done.receipts[0].transactionHash).toBe(replacement);
      expect(onConfirmed.mock.calls[0][2].transactionHash).toBe(replacement);
    });

    it("an approval re-mined after the watcher saw it: the payment is simulated on the block its hold verified", async () => {
      const { wallet, deps, chain } = setup();
      reviewUi();
      const watch =
        chain.client.waitForTransactionReceipt.getMockImplementation()!;
      chain.client.waitForTransactionReceipt.mockImplementationOnce(
        async (args) => {
          const seen = await watch(args);
          // Reorged out of block 101 and mined again in 102.
          chain.state.head = 102n;
          chain.state.mined.set(args.hash, 102n);
          return seen;
        },
      );
      // The payment needs the approval's state: before block 102 it reverts.
      chain.state.ethCall = (params) => {
        const tag = (params as unknown[])[1];
        if (
          typeof tag === "string" &&
          tag.startsWith("0x") &&
          BigInt(tag) < 102n
        )
          throw reverted();
        return "0x";
      };
      const onConfirmed = vi.fn();
      const result = await sendReviewed(
        action([approveCall(), payCall(5n, { dependsOnPrior: true })], {
          follow: {},
          onConfirmed,
        }),
        deps,
      );
      expect(result).toMatchObject({ status: "done" });
      expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(2);
      const done = result as Extract<typeof result, { status: "done" }>;
      expect(done.receipts[0].blockNumber).toBe(102n);
      expect(onConfirmed.mock.calls[0][2].blockNumber).toBe(102n);
    });
  });

  describe("a sent step ends done, verified failed, or unverified with what resumes it", () => {
    it("an exhausted receipt watcher is unverified, keeping the hold, the hash and the signatures", async () => {
      const { wallet, deps, chain } = setup();
      reviewUi();
      const signature = `0x${"5e".repeat(65)}` as Hex;
      wallet.adapter.signMessage.mockImplementation(async () => signature);
      chain.client.waitForTransactionReceipt.mockRejectedValue(
        new Error("watcher dropped"),
      );
      chain.client.getTransactionReceipt.mockRejectedValue(
        new Error("lagging node"),
      );
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
      try {
        const sending = sendReviewed(
          action([payCall()], {
            signatures: [{ kind: "message", chainId: 10, message: "List it" }],
          }),
          deps,
        ).catch((error: unknown) => error);
        await vi.advanceTimersByTimeAsync(200_000);
        const failure = await sending;
        expect(failure).toBeInstanceOf(ReviewedReceiptUnverifiedError);
        expect(failure).toMatchObject({
          step: 0,
          hash: expect.stringMatching(/^0x/),
          held: {
            call: expect.anything(),
            reservation: expect.any(String),
            signatures: [signature],
          },
        });
        expect((failure as { cause?: unknown }).cause).toBeInstanceOf(
          TransactionReceiptUnavailableError,
        );
      } finally {
        vi.useRealTimers();
      }
      expect(wallet.adapter.sendTransaction).toHaveBeenCalledOnce();
    });

    it("a site's failed record of the hash never changes the outcome: the run ends done as its hold verified", async () => {
      const { wallet, deps } = setup();
      reviewUi();
      const onConfirmed = vi.fn();
      const logged = vi.spyOn(console, "error").mockImplementation(() => {});
      const result = await sendReviewed(
        action([payCall(), payCall(5n)], {
          onSubmitted: () => {
            throw new Error("the site's record failed");
          },
          onConfirmed,
        }),
        deps,
      );
      expect(result).toMatchObject({ status: "done" });
      expect(onConfirmed).toHaveBeenCalledTimes(2);
      expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(2);
      expect(logged).toHaveBeenCalled();
      logged.mockRestore();
    });

    it("a progress or confirming callback that throws never ends the send", async () => {
      const { wallet, deps, chain } = setup();
      reviewUi();
      const read = chain.client.getTransactionReceipt.getMockImplementation()!;
      let lagged = false;
      chain.client.getTransactionReceipt.mockImplementation(async (args) => {
        if (!lagged) {
          lagged = true;
          throw new Error("lagging node");
        }
        return read(args);
      });
      const result = await sendReviewed(
        action([payCall()], {
          follow: {
            onConfirming: () => {
              throw new Error("the site's view failed");
            },
          },
        }),
        {
          ...deps,
          onProgress: ({ phase }) => {
            if (phase === "receipt" || phase === "done")
              throw new Error("the site's view failed");
          },
        },
      );
      expect(result).toMatchObject({ status: "done" });
      expect(wallet.adapter.sendTransaction).toHaveBeenCalledOnce();
    }, 20_000);
  });

  it("reports a reverted receipt only once the hold verified it, keeping its sending checkpoint", async () => {
    const { deps, chain, hold, storage } = setup();
    reviewUi();
    chain.state.status = "reverted";
    const read = chain.client.getTransactionReceipt.getMockImplementation()!;
    chain.client.getTransactionReceipt.mockImplementation(async () => {
      throw new Error("lagging node");
    });
    const call = payCall();
    const failure = await sendReviewed(
      action([call], { scope: "pay:1" }),
      deps,
    ).catch((error: unknown) => error);
    expect(failure).not.toBeInstanceOf(ReviewedCallRevertedError);
    expect(failure).toMatchObject({
      name: "ReviewedReceiptUnverifiedError",
      step: 0,
      hash: FIRST,
    });
    expect(
      findReviewedSequence("pay:1", ACCOUNT, { storage })?.sending,
    ).toMatchObject({ step: 0 });
    const handle = openStepHold(hold, ACCOUNT, false, call);
    expect(handle.peek().status).toBe("pending-known-hash");
    chain.client.getTransactionReceipt.mockImplementation(read);
    await expect(
      handle.state(chain.client as unknown as PublicClient),
    ).resolves.toMatchObject({
      status: "clear",
      settled: { result: "failed", hash: FIRST },
    });
  });

  it("keeps the review-time revert's data, so a payment's allowed-decrease retry can read it", async () => {
    const { wallet, deps, chain } = setup();
    const underMin = `0x6b2bb382${encodeAbiParameters(
      [{ type: "uint256" }, { type: "uint256" }],
      [98n, 99n],
    ).slice(2)}`;
    chain.state.ethCall = () => {
      throw Object.assign(new Error("execution reverted"), {
        code: 3,
        data: underMin,
        details: "execution reverted",
        shortMessage: "Execution reverted",
      });
    };
    reviewUi(async (prompt) => {
      expect(await prompt.simulation).toMatchObject({ status: "failed" });
      return prompt.confirmation;
    });
    const failure = await sendReviewed(action([payCall()]), deps).catch(
      (error: unknown) => error,
    );
    expect(failure).toBeInstanceOf(ReviewLineError);
    expect(decodePayFailure(failure)).toMatchObject({
      reason: "TERMINAL_UNDER_MIN",
      received: 98n,
      minimum: 99n,
      adjustable: "minimum",
    });
    expect(wallet.adapter.sendTransaction).not.toHaveBeenCalled();
  });
});

describe("sendReviewed with follow", () => {
  const FIRST = `0x${"1".padStart(64, "0")}` as Hex;
  const SECOND = `0x${"2".padStart(64, "0")}` as Hex;

  /** A run whose `lagging` hash's receipt the hold can't read until `recover`. */
  function lagging(hash: Hex) {
    const ran = setup();
    const prompts = reviewUi();
    const read =
      ran.chain.client.getTransactionReceipt.getMockImplementation()!;
    let lag = true;
    ran.chain.client.getTransactionReceipt.mockImplementation(async (args) => {
      if (lag && args.hash === hash) throw new Error("lagging node");
      return read(args);
    });
    return { ...ran, prompts, recover: () => (lag = false) };
  }

  const later = async (ms: number) => vi.advanceTimersByTimeAsync(ms);

  it("continues a no-scope run past a step that confirms late, in the same review, with its step indexes", async () => {
    vi.useFakeTimers();
    try {
      const { deps, prompts, recover } = lagging(FIRST);
      const onConfirming = vi.fn();
      const reverified: number[] = [];
      const opened: number[] = [];
      const submitted: number[] = [];
      const run = sendReviewed(
        action([approveCall(), payCall()], {
          reverify: async (_call, index) => void reverified.push(index),
          beforeWallet: (_call, step) => void opened.push(step),
          onSubmitted: (_call, step) => void submitted.push(step),
          follow: { onConfirming },
        }),
        deps,
      );
      await later(10_000);
      expect(onConfirming).toHaveBeenCalledWith(0);
      expect(submitted).toEqual([0]);
      recover();
      await later(10_000);
      await expect(run).resolves.toMatchObject({
        status: "done",
        hashes: [FIRST, SECOND],
        receipts: [{ transactionHash: FIRST }, { transactionHash: SECOND }],
      });
      expect(prompts).toHaveLength(1);
      expect(reverified).toEqual([0, 1]);
      expect(opened).toEqual([0, 1]);
      expect(submitted).toEqual([0, 1]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("resolves a last step that confirms late with its settling receipt", async () => {
    vi.useFakeTimers();
    try {
      const { deps, recover } = lagging(FIRST);
      const run = sendReviewed(action([payCall()], { follow: {} }), deps);
      await later(10_000);
      recover();
      await later(10_000);
      await expect(run).resolves.toMatchObject({
        status: "done",
        hashes: [FIRST],
        receipts: [{ transactionHash: FIRST, status: "success" }],
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("throws a revert its hold verified after following it", async () => {
    vi.useFakeTimers();
    try {
      const { deps, chain, recover } = lagging(FIRST);
      chain.state.status = "reverted";
      const run = sendReviewed(action([payCall()], { follow: {} }), deps);
      const ended = run.catch((error: unknown) => error);
      await later(10_000);
      recover();
      await later(10_000);
      expect(await ended).toBeInstanceOf(ReviewedCallRevertedError);
      expect(await ended).toMatchObject({ step: 0, hash: FIRST });
    } finally {
      vi.useRealTimers();
    }
  });

  it.each(["timeout", "abort"] as const)(
    "on a %s throws the step still confirming, its signatures kept and its hold still sent",
    async (end) => {
      vi.useFakeTimers();
      try {
        const { deps, hold, wallet } = lagging(FIRST);
        const signature = `0x${"5e".repeat(65)}` as Hex;
        wallet.adapter.signMessage.mockImplementation(async () => signature);
        const stop = new AbortController();
        const call = payCall();
        const ended = sendReviewed(
          action([call], {
            signatures: [{ kind: "message", chainId: 10, message: "List it" }],
            follow:
              end === "timeout"
                ? { timeoutMs: 30_000 }
                : { signal: stop.signal },
          }),
          deps,
        ).catch((error: unknown) => error);
        await later(10_000);
        if (end === "abort") stop.abort();
        await later(30_000);
        const error = await ended;
        expect(error).toBeInstanceOf(ReviewedReceiptUnverifiedError);
        expect(error).toMatchObject({
          step: 0,
          hash: FIRST,
          held: { signatures: [signature] },
        });
        expect(openStepHold(hold, ACCOUNT, false, call).peek().status).toBe(
          "pending-known-hash",
        );
      } finally {
        vi.useRealTimers();
      }
    },
  );

  it.each(["timeout", "abort"] as const)(
    "lets a %s that ends the follow during a read win over the read's late answer",
    async (end) => {
      vi.useFakeTimers();
      try {
        const { deps, chain, wallet, recover } = lagging(FIRST);
        const stop = new AbortController();
        const run = sendReviewed(
          action([approveCall(), payCall()], {
            follow:
              end === "timeout"
                ? { timeoutMs: 30_000 }
                : { signal: stop.signal },
          }),
          deps,
        ).catch((error: unknown) => error);
        await later(10_000);
        // The next read of the step hangs until after the follow ended, then reads it settled.
        const lagged =
          chain.client.getTransactionReceipt.getMockImplementation()!;
        let release!: () => void;
        const held = new Promise<void>((resolve) => (release = resolve));
        chain.client.getTransactionReceipt.mockImplementation(async (args) => {
          if (args.hash === FIRST) await held;
          return lagged(args);
        });
        await later(10_000);
        if (end === "abort") stop.abort();
        await later(20_000);
        recover();
        release();
        await later(10_000);
        expect(await run).toBeInstanceOf(ReviewedReceiptUnverifiedError);
        expect(wallet.adapter.sendTransaction).toHaveBeenCalledOnce();
      } finally {
        vi.useRealTimers();
      }
    },
  );

  it("without follow, still throws at once for a step confirming late", async () => {
    const { deps } = lagging(FIRST);
    await expect(
      sendReviewed(action([approveCall(), payCall()]), deps),
    ).rejects.toBeInstanceOf(ReviewedReceiptUnverifiedError);
  });
});
