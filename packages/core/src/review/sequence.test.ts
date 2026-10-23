import { encodeFunctionData, type Hex } from "viem";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ACCOUNT,
  OTHER,
  action,
  approveCall,
  payCall,
  resetReviewUi,
  reviewUi,
  setup,
} from "./__fixtures__/reviewedSend.js";
import { buildReviewModel } from "./model.js";
import { resumeReviewed, sendReviewed, type ReviewedCall } from "./send.js";
import {
  discardReviewedSequence,
  findReviewedSequence,
  REVIEWED_SEQUENCE_HELD_LINE,
  REVIEWED_SEQUENCE_MOVED_LINE,
  REVIEWED_SEQUENCE_UNCERTAIN_LINE,
  REVIEWED_SEQUENCE_UNFINISHED_LINE,
  REVIEWED_SEQUENCE_UNSAVABLE_LINE,
} from "./sequence.js";
import { WriteHeldError, type WriteHold } from "./writeHold.js";

afterEach(resetReviewUi);

const SCOPE = "pay:project-1";
const rejected = () =>
  Object.assign(new Error("User rejected the request."), { code: 4001 });
/** The model a review of exactly `calls` shows. */
const modelOf = (calls: ReviewedCall[], safe = false) =>
  buildReviewModel({
    calls: calls.map(
      ({ chainId, to, data, value, abi, functionName, args, label }) => ({
        chainId,
        to,
        data,
        value: value ?? 0n,
        from: ACCOUNT,
        ...(safe ? { safeTxGas: 0n } : {}),
        abi,
        functionName,
        args,
        label,
      }),
    ),
  }).id;
const hashOf = (n: number) => `0x${n.toString(16).padStart(64, "0")}` as Hex;

/** Run `calls` under SCOPE with the wallet refusing step `refuse` (4001): a sequence to resume. */
async function interrupted(
  calls: ReviewedCall[],
  refuse: number,
  context = setup(),
) {
  const { wallet, deps, storage } = context;
  const sent = wallet.adapter.sendTransaction.getMockImplementation()!;
  let count = 0;
  wallet.adapter.sendTransaction.mockImplementation(async (tx) => {
    if (count++ === refuse) throw rejected();
    return sent(tx);
  });
  await expect(
    sendReviewed(action(calls, { scope: SCOPE }), deps),
  ).rejects.toMatchObject({ code: 4001 });
  wallet.adapter.sendTransaction.mockImplementation(sent);
  const record = findReviewedSequence(SCOPE, ACCOUNT, { storage })!;
  return { ...context, record };
}

describe("reviewed sequences", () => {
  it("resumes at the first incomplete step with one fresh review", async () => {
    const prompts = reviewUi();
    const approve = approveCall();
    const pay = payCall(5n);
    const tip = payCall(6n);
    const { wallet, deps, storage, record } = await interrupted(
      [approve, pay, tip],
      1,
    );
    expect(record.completed).toEqual([hashOf(1)]);
    expect(record.calls.map((call) => call.data)).toEqual([
      approve.data,
      pay.data,
      tip.data,
    ]);

    // A fresh run of the same action is refused while this one is unfinished.
    await expect(
      sendReviewed(action([approve, pay, tip], { scope: SCOPE }), deps),
    ).rejects.toThrow(REVIEWED_SEQUENCE_UNFINISHED_LINE);
    expect(prompts).toHaveLength(1);

    const result = await resumeReviewed(record, {}, deps);
    expect(prompts).toHaveLength(2);
    expect(prompts[1].model.id).toBe(modelOf([pay, tip]));
    expect(
      wallet.adapter.sendTransaction.mock.calls.map(([tx]) => tx.data),
    ).toEqual([approve.data, pay.data, pay.data, tip.data]);
    expect(result).toMatchObject({
      status: "done",
      hashes: [hashOf(1), hashOf(2), hashOf(3)],
    });
    expect(findReviewedSequence(SCOPE, ACCOUNT, { storage })).toBeNull();
  });

  it("saves the sequence before the first wallet call", async () => {
    reviewUi();
    const { wallet, deps, storage } = setup();
    const saved: unknown[] = [];
    const sent = wallet.adapter.sendTransaction.getMockImplementation()!;
    wallet.adapter.sendTransaction.mockImplementation(async (tx) => {
      saved.push(findReviewedSequence(SCOPE, ACCOUNT, { storage }));
      return sent(tx);
    });
    await sendReviewed(
      action([approveCall(), payCall()], { scope: SCOPE }),
      deps,
    );
    expect(saved).toEqual([
      expect.objectContaining({
        completed: [],
        sending: { step: 0, reservation: expect.any(String) },
      }),
      expect.objectContaining({
        completed: [hashOf(1)],
        sending: { step: 1, reservation: expect.any(String) },
      }),
    ]);
    expect(findReviewedSequence(SCOPE, ACCOUNT, { storage })).toBeNull();
  });

  it("stops at a Safe proposal and resumes after execution", async () => {
    const prompts = reviewUi();
    const context = setup();
    const { wallet, storage } = context;
    wallet.state.safe = true;
    /** The Safe's executions, by proposal: what the hold proves once signers run it. */
    const executed = new Map<Hex, Hex>();
    /** A settlement the hold could not save: the step reads clear with nothing to show. */
    let lost = false;
    const hold: WriteHold = {
      ...context.hold,
      open: (...args) => {
        const handle = context.hold.open(...args);
        const proposal = handle.peek();
        const execution =
          proposal.status !== "clear" && proposal.record.hash
            ? executed.get(proposal.record.hash)
            : undefined;
        return lost && proposal.status !== "clear"
          ? {
              ...handle,
              state: async () => ({
                status: "clear",
                reservation: proposal.reservation,
              }),
            }
          : execution
            ? {
                ...handle,
                state: async () => ({
                  status: "clear",
                  reservation: proposal.reservation,
                  settled: { result: "success", hash: execution },
                }),
                acknowledge: vi.fn(async () => handle.peek()),
              }
            : handle;
      },
    };
    const deps = { ...context.deps, hold };
    const approve = approveCall();
    const pay = payCall(5n, { dependsOnPrior: true });

    const first = await sendReviewed(
      action([approve, pay], { scope: SCOPE }),
      deps,
    );
    expect(first).toEqual({
      status: "proposed",
      step: 0,
      safeTxHash: hashOf(1),
    });
    const record = findReviewedSequence(SCOPE, ACCOUNT, { storage })!;
    expect(record.proposed).toEqual({ step: 0, safeTxHash: hashOf(1) });

    // Still waiting for its signers: the resume is refused before any review.
    await expect(resumeReviewed(record, {}, deps)).rejects.toBeInstanceOf(
      WriteHeldError,
    );
    expect(prompts).toHaveLength(1);

    lost = true;
    await expect(resumeReviewed(record, {}, deps)).rejects.toThrow(
      REVIEWED_SEQUENCE_UNCERTAIN_LINE,
    );
    lost = false;
    executed.set(hashOf(1), hashOf(0xe1));
    const second = await resumeReviewed(record, {}, deps);
    expect(prompts).toHaveLength(2);
    expect(prompts[1].model.id).toBe(modelOf([pay], true));
    expect(second).toEqual({
      status: "proposed",
      step: 1,
      safeTxHash: hashOf(2),
    });
    expect(
      findReviewedSequence(SCOPE, ACCOUNT, { storage })?.completed,
    ).toEqual([hashOf(0xe1)]);

    executed.set(hashOf(2), hashOf(0xe2));
    await expect(resumeReviewed(record, {}, deps)).resolves.toEqual({
      status: "done",
      hashes: [hashOf(0xe1), hashOf(0xe2)],
      receipts: [],
    });
    expect(prompts).toHaveLength(2);
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(2);
    expect(findReviewedSequence(SCOPE, ACCOUNT, { storage })).toBeNull();
  });

  it("never resends a completed step", async () => {
    const prompts = reviewUi();
    const { wallet, chain, deps, storage } = setup();
    const approve = approveCall();
    const pay = payCall(5n);
    // The tab closes while the pay's receipt is awaited.
    const wait =
      chain.client.waitForTransactionReceipt.getMockImplementation()!;
    chain.client.waitForTransactionReceipt.mockImplementation(async (args) =>
      args.hash === hashOf(2) ? new Promise(() => {}) : wait(args),
    );
    void sendReviewed(action([approve, pay], { scope: SCOPE }), deps);
    await vi.waitFor(() =>
      expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(2),
    );
    const record = findReviewedSequence(SCOPE, ACCOUNT, { storage })!;
    expect(record).toMatchObject({
      completed: [hashOf(1)],
      sending: { step: 1, reservation: expect.any(String) },
    });

    // The pay landed: its hold settles it, and nothing is reviewed or sent again.
    await expect(resumeReviewed(record, {}, deps)).resolves.toEqual({
      status: "done",
      hashes: [hashOf(1), hashOf(2)],
      receipts: [],
    });
    expect(prompts).toHaveLength(1);
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(2);
    expect(findReviewedSequence(SCOPE, ACCOUNT, { storage })).toBeNull();
  });

  it("reviews a reverted step again on resume", async () => {
    const prompts = reviewUi();
    const { wallet, chain, deps, storage } = setup();
    const approve = approveCall();
    const pay = payCall(5n);
    const send = wallet.adapter.sendTransaction.getMockImplementation()!;
    wallet.adapter.sendTransaction.mockImplementation(async (tx) => {
      chain.state.status =
        wallet.adapter.sendTransaction.mock.calls.length === 2
          ? "reverted"
          : "success";
      return send(tx);
    });
    await expect(
      sendReviewed(action([approve, pay], { scope: SCOPE }), deps),
    ).rejects.toThrow("This transaction failed onchain.");
    const record = findReviewedSequence(SCOPE, ACCOUNT, { storage })!;
    expect(record.completed).toEqual([hashOf(1)]);
    expect(record.sending).toBeUndefined();

    await expect(resumeReviewed(record, {}, deps)).resolves.toMatchObject({
      status: "done",
      hashes: [hashOf(1), hashOf(3)],
    });
    expect(prompts[1].model.id).toBe(modelOf([pay]));
  });

  it("discard refuses while a step is held", async () => {
    reviewUi();
    const timeout = () => new Error("The request took too long to respond.");
    // An intent's step, held by its intent.
    const { wallet, deps, storage } = setup();
    wallet.adapter.sendTransaction.mockRejectedValueOnce(timeout());
    await expect(
      sendReviewed(
        action([{ ...approveCall(), intent: "approve:1" }, payCall()], {
          scope: SCOPE,
        }),
        deps,
      ),
    ).rejects.toThrow(timeout().message);
    const held = findReviewedSequence(SCOPE, ACCOUNT, { storage })!;
    expect(held).toMatchObject({
      completed: [],
      sending: { step: 0, reservation: expect.any(String) },
    });
    await expect(discardReviewedSequence(held, { storage })).rejects.toThrow(
      REVIEWED_SEQUENCE_HELD_LINE,
    );
    expect(findReviewedSequence(SCOPE, ACCOUNT, { storage })).not.toBeNull();

    // A later step, held as its exact call.
    const second = setup();
    const send = second.wallet.adapter.sendTransaction;
    send
      .mockImplementationOnce(send.getMockImplementation()!)
      .mockRejectedValueOnce(timeout());
    await expect(
      sendReviewed(
        action([approveCall(), payCall()], { scope: SCOPE }),
        second.deps,
      ),
    ).rejects.toThrow(timeout().message);
    const later = findReviewedSequence(SCOPE, ACCOUNT, {
      storage: second.storage,
    })!;
    expect(later).toMatchObject({
      completed: [hashOf(1)],
      sending: { step: 1, reservation: expect.any(String) },
    });
    await expect(
      discardReviewedSequence(later, { storage: second.storage }),
    ).rejects.toThrow(REVIEWED_SEQUENCE_HELD_LINE);

    // A step the wallet refused (4001) holds nothing: the sequence can go.
    const { record, storage: other } = await interrupted(
      [approveCall(), payCall(6n, { intent: "pay:1" })],
      1,
    );
    // Unless the same call was sent since without its intent, and is held.
    const exact = await interrupted(
      [approveCall(), payCall(7n, { intent: "pay:1" })],
      1,
    );
    exact.wallet.adapter.sendTransaction.mockRejectedValueOnce(timeout());
    await expect(
      sendReviewed(action([payCall(7n)]), exact.deps),
    ).rejects.toThrow(timeout().message);
    await expect(
      discardReviewedSequence(exact.record, { storage: exact.storage }),
    ).rejects.toThrow(REVIEWED_SEQUENCE_HELD_LINE);

    // Or under another intent.
    const renamed = await interrupted(
      [approveCall(), payCall(8n, { intent: "pay:1" })],
      1,
    );
    renamed.wallet.adapter.sendTransaction.mockRejectedValueOnce(timeout());
    await expect(
      sendReviewed(action([payCall(8n, { intent: "pay:2" })]), renamed.deps),
    ).rejects.toThrow(timeout().message);
    await expect(
      discardReviewedSequence(renamed.record, { storage: renamed.storage }),
    ).rejects.toThrow(REVIEWED_SEQUENCE_HELD_LINE);

    await discardReviewedSequence(record, { storage: other });
    expect(findReviewedSequence(SCOPE, ACCOUNT, { storage: other })).toBeNull();
    // A record another window moved on (or removed) is not discarded.
    await expect(
      discardReviewedSequence(record, { storage: other }),
    ).rejects.toThrow(REVIEWED_SEQUENCE_MOVED_LINE);
  });

  it("a run another window began meanwhile sends nothing", async () => {
    const prompts = reviewUi();
    const { wallet, chain, deps, storage, holdOf } = setup();
    const call = payCall();
    const key = `nana-sdk:sequence:${ACCOUNT.toLowerCase()}:${SCOPE}`;
    // Another window's run of the same action reaches its wallet first.
    const theirs = JSON.stringify({ another: "window" });
    chain.client.estimateGas.mockImplementationOnce(async () => {
      storage.setItem(key, theirs);
      return 21_000n;
    });
    await expect(
      sendReviewed(action([call], { scope: SCOPE }), deps),
    ).rejects.toThrow(REVIEWED_SEQUENCE_MOVED_LINE);
    expect(prompts).toHaveLength(1);
    expect(wallet.adapter.sendTransaction).not.toHaveBeenCalled();
    expect(deps.hold.open(holdOf(call)).peek().status).toBe("clear");
    expect(storage.getItem(key)).toBe(theirs);
  });

  it("a resume confirmed after another window finished the sequence sends nothing", async () => {
    let first = true;
    let confirmA!: () => void;
    const prompts = reviewUi(async (prompt) => {
      if (!first) return prompt.confirmation;
      first = false;
      await new Promise<void>((resolve) => (confirmA = resolve));
      return prompt.confirmation;
    });
    const { wallet, deps, storage, record } = await (async () => {
      const context = setup();
      first = false;
      const result = await interrupted(
        [approveCall(), payCall(5n), payCall(6n)],
        1,
        context,
      );
      first = true;
      return result;
    })();
    const sends = wallet.adapter.sendTransaction.mock.calls.length;
    const a = resumeReviewed(record, {}, deps);
    await vi.waitFor(() => expect(prompts).toHaveLength(2));
    // Window B resumes and finishes it while A's review is open.
    await expect(resumeReviewed(record, {}, deps)).resolves.toMatchObject({
      status: "done",
    });
    expect(findReviewedSequence(SCOPE, ACCOUNT, { storage })).toBeNull();
    const after = wallet.adapter.sendTransaction.mock.calls.length;
    confirmA();
    await expect(a).rejects.toThrow(REVIEWED_SEQUENCE_MOVED_LINE);
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(after);
    expect(after - sends).toBe(2);
    expect(findReviewedSequence(SCOPE, ACCOUNT, { storage })).toBeNull();
  });

  it("refuses to decide a step another send of the same call has since replaced", async () => {
    const prompts = reviewUi();
    const { wallet, chain, deps, storage, hold, holdOf } = setup();
    const pay = payCall(5n);
    const wait =
      chain.client.waitForTransactionReceipt.getMockImplementation()!;
    chain.client.waitForTransactionReceipt.mockImplementation(async (args) =>
      args.hash === hashOf(2) ? new Promise(() => {}) : wait(args),
    );
    void sendReviewed(action([approveCall(), pay], { scope: SCOPE }), deps);
    await vi.waitFor(() =>
      expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(2),
    );
    const record = findReviewedSequence(SCOPE, ACCOUNT, { storage })!;
    // A view settles the pay and the user acknowledges it; then the same
    // call is tried again and refused (4001): a newer reservation.
    const handle = hold.open(holdOf(pay));
    const settled = await handle.state(chain.client as never);
    await handle.acknowledge(
      (settled as { settled: { result: "success"; hash: Hex } }).settled,
    );
    wallet.adapter.sendTransaction.mockRejectedValueOnce(rejected());
    await expect(sendReviewed(action([pay]), deps)).rejects.toMatchObject({
      code: 4001,
    });
    const sends = wallet.adapter.sendTransaction.mock.calls.length;
    await expect(resumeReviewed(record, {}, deps)).rejects.toThrow(
      REVIEWED_SEQUENCE_UNCERTAIN_LINE,
    );
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(sends);
    expect(prompts).toHaveLength(2);
    // Nothing is held: the user can discard it and start again.
    await discardReviewedSequence(record, { storage });
    expect(findReviewedSequence(SCOPE, ACCOUNT, { storage })).toBeNull();
  });

  it("keeps arguments of every shape across a resume", async () => {
    const prompts = reviewUi();
    const abi = [
      {
        type: "function",
        name: "note",
        stateMutability: "nonpayable",
        inputs: [
          {
            name: "entry",
            type: "tuple",
            components: [
              { name: "n", type: "string" },
              { name: "o", type: "uint256" },
            ],
          },
        ],
        outputs: [],
      },
    ] as const;
    const args = [{ n: "hello", o: 2n ** 200n }] as const;
    const note: ReviewedCall = {
      chainId: 10,
      to: OTHER,
      data: encodeFunctionData({ abi, functionName: "note", args }),
      abi,
      functionName: "note",
      args,
    };
    const { deps, record } = await interrupted([approveCall(), note], 1);
    expect(record.calls[1].args).toEqual(args);
    // Saved with its id on top, as the held-write storage reconciles by it.
    expect(
      JSON.parse(
        deps.storage!.getItem(
          `nana-sdk:sequence:${ACCOUNT.toLowerCase()}:${SCOPE}`,
        )!,
      ).id,
    ).toBe(record.id);
    await expect(resumeReviewed(record, {}, deps)).resolves.toMatchObject({
      status: "done",
    });
    expect(prompts).toHaveLength(2);
  });

  it("a changed account cannot resume another account's sequence", async () => {
    const prompts = reviewUi();
    const { wallet, deps, storage, record } = await interrupted(
      [approveCall(), payCall()],
      1,
    );
    wallet.state.account = OTHER;
    expect(findReviewedSequence(SCOPE, OTHER, { storage })).toBeNull();
    await expect(resumeReviewed(record, {}, deps)).rejects.toThrow(
      "The connected account changed. Review again.",
    );
    wallet.state.account = undefined;
    await expect(resumeReviewed(record, {}, deps)).rejects.toThrow(
      "Connect a wallet first.",
    );
    expect(prompts).toHaveLength(1);
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(2);
    expect(findReviewedSequence(SCOPE, ACCOUNT, { storage })).toEqual(record);
  });

  it("without scope, no journal is written", async () => {
    reviewUi();
    const { wallet, deps, storage } = setup();
    wallet.adapter.sendTransaction
      .mockImplementationOnce(
        wallet.adapter.sendTransaction.getMockImplementation()!,
      )
      .mockRejectedValueOnce(rejected());
    await expect(
      sendReviewed(action([approveCall(), payCall()]), deps),
    ).rejects.toMatchObject({ code: 4001 });
    expect(
      storage.keys!().filter((key) => key.startsWith("nana-sdk:sequence:")),
    ).toEqual([]);

    // With a scope, a run that sent nothing leaves nothing to resume.
    wallet.adapter.sendTransaction.mockRejectedValueOnce(rejected());
    await expect(
      sendReviewed(action([payCall(9n)], { scope: SCOPE }), deps),
    ).rejects.toMatchObject({ code: 4001 });
    expect(findReviewedSequence(SCOPE, ACCOUNT, { storage })).toBeNull();
  });

  it("reverify on resume receives the original index", async () => {
    reviewUi();
    const { deps, record } = await interrupted(
      [approveCall(), payCall(5n), payCall(6n)],
      1,
    );
    const reverify = vi.fn(async (_call: ReviewedCall, _index: number) => {});
    await resumeReviewed(record, { reverify }, deps);
    expect(reverify.mock.calls.map(([, index]) => index)).toEqual([1, 2]);
  });

  it("refuses, before any review, an argument it could not save exactly", async () => {
    const prompts = reviewUi();
    const { wallet, deps, storage } = setup();
    const abi = [
      {
        type: "function",
        name: "put",
        stateMutability: "nonpayable",
        inputs: [{ name: "data", type: "bytes" }],
        outputs: [],
      },
    ] as const;
    const bytes = new Uint8Array([1]);
    const put: ReviewedCall = {
      chainId: 10,
      to: OTHER,
      data: encodeFunctionData({ abi, functionName: "put", args: ["0x01"] }),
      // Bytes kept as an array of bytes, which JSON would turn into an object.
      args: [bytes],
    };
    await expect(
      sendReviewed(action([approveCall(), put], { scope: SCOPE }), deps),
    ).rejects.toThrow(REVIEWED_SEQUENCE_UNSAVABLE_LINE);
    expect(prompts).toHaveLength(0);
    expect(wallet.adapter.sendTransaction).not.toHaveBeenCalled();
    expect(findReviewedSequence(SCOPE, ACCOUNT, { storage })).toBeNull();
  });

  it("reads an unreadable or foreign record as none", () => {
    const { storage } = setup();
    const key = `nana-sdk:sequence:${ACCOUNT.toLowerCase()}:${SCOPE}`;
    storage.setItem(key, "{not json");
    expect(findReviewedSequence(SCOPE, ACCOUNT, { storage })).toBeNull();
    storage.setItem(
      key,
      JSON.stringify({ version: 1, id: "a", account: OTHER, scope: SCOPE }),
    );
    expect(findReviewedSequence(SCOPE, ACCOUNT, { storage })).toBeNull();
  });
});
