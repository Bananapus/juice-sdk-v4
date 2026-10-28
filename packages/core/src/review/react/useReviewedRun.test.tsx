// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import {
  ACCOUNT,
  OTHER,
  approveCall,
  payCall,
  resetReviewUi,
  reviewUi,
  setup,
  speedUpNextSend,
  unregister,
} from "../__fixtures__/reviewedSend.js";
import {
  HELD_AWAY_SUCCESS_LINE,
  HELD_EXPIRED_LINE,
  HELD_FAILED_LINE,
  REVIEWED_ENGINE_LOAD_LINE,
} from "../messages.js";
import { NETWORK_ERROR_LINE, ReviewLineError } from "../transaction-message.js";
import { openStepHold } from "../writeHold.js";
import { viemWalletAdapter } from "../wallet.js";
import {
  createWalletClient,
  custom,
  encodeAbiParameters,
  encodeEventTopics,
  numberToHex,
  parseAbi,
  type Hex as ViemHex,
} from "viem";
import {
  findReviewedSequence,
  REVIEWED_SEQUENCE_HELD_LINE,
  REVIEWED_SEQUENCE_UNFINISHED_LINE,
} from "../sequence.js";
import {
  REVIEWED_RUN_BUSY_LINE,
  REVIEWED_RUN_SCOPE_LINE,
  useReviewedRun,
  type ReviewedRunReceipt,
  type UseReviewedRunDeps,
  type UseReviewedRunResult,
} from "./useReviewedRun.js";

/** The options of the last held-write view the hook made, to settle what it follows. */
const views = vi.hoisted(() => ({
  last: undefined as
    | {
        onSettled?: (settled: never, receipt: never) => void;
        onReleased?: (by: "user" | "other-tab") => void;
      }
    | undefined,
}));
vi.mock("../index.js", async (original) => {
  const actual = await original<typeof import("../index.js")>();
  return {
    ...actual,
    createHeldWriteView: (
      ...args: Parameters<typeof actual.createHeldWriteView>
    ) => {
      views.last = args[1];
      return actual.createHeldWriteView(...args);
    },
  };
});

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});
let root: Root | undefined;
afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  resetReviewUi();
});

/** Mounts the hook. */
function harness(
  given:
    | (Omit<UseReviewedRunDeps, "engine"> &
        Partial<Pick<UseReviewedRunDeps, "engine">>)
    | null,
) {
  const deps = given && { engine: () => import("../send.js"), ...given };
  const seen: { current?: UseReviewedRunResult } = {};
  function Probe() {
    seen.current = useReviewedRun(deps);
    return null;
  }
  root = createRoot(document.createElement("div"));
  act(() => root!.render(<Probe />));
  const run = async (...args: Parameters<UseReviewedRunResult["run"]>) => {
    let result!: Awaited<ReturnType<UseReviewedRunResult["run"]>>;
    await act(async () => {
      result = await seen.current!.run(...args);
    });
    return result;
  };
  return { seen, run };
}

/** Waits until `check` passes, rendering what each wait queued. */
const rendered = (check: () => void) =>
  vi.waitFor(async () => {
    await act(async () => {});
    check();
  });

describe("useReviewedRun", () => {
  test("maps errors through transactionMessage", async () => {
    reviewUi();
    const { wallet, deps } = setup();
    wallet.adapter.sendTransaction.mockRejectedValueOnce(
      new ReviewLineError("Relayr HTTP 502: upstream"),
    );
    const { seen, run } = harness({ ...deps, account: ACCOUNT });
    await expect(run({ calls: [payCall()] })).resolves.toMatchObject({
      status: "failed",
    });
    expect(seen.current!.error).toBe(
      "Transaction request failed (HTTP 502): upstream",
    );

    // A node's or wallet's own text never shows, however it reads.
    wallet.adapter.sendTransaction.mockRejectedValueOnce(
      new Error("Header not found."),
    );
    await expect(run({ calls: [payCall(7n)] })).resolves.toMatchObject({
      status: "failed",
      error: NETWORK_ERROR_LINE,
    });
    expect(seen.current!.phase).toBe("idle");

    // A closed review or a wallet's refusal is no error.
    reviewUi(async () => null);
    await expect(run({ calls: [payCall(6n)] })).resolves.toBeNull();
    expect(seen.current!.error).toBeNull();
    expect(seen.current!.failure).toBeNull();

    act(() => seen.current!.reset());
    expect(seen.current!.phase).toBe("idle");
  });

  test("shows its own line when the send engine does not load", async () => {
    reviewUi();
    const { deps } = setup();
    const loadFailure = new Error("Header not found.");
    const { seen, run } = harness({
      ...deps,
      account: ACCOUNT,
      engine: () => Promise.reject(loadFailure),
    });
    const result = await run({ calls: [payCall()] });
    expect(result).toMatchObject({
      status: "failed",
      error: REVIEWED_ENGINE_LOAD_LINE,
    });
    expect(seen.current!.error).toBe(REVIEWED_ENGINE_LOAD_LINE);
    expect((seen.current!.failure as { cause?: unknown }).cause).toBe(
      loadFailure,
    );
  });

  test("keeps the raw failure with its cause for site decoders", async () => {
    reviewUi();
    const { wallet, deps } = setup();
    const cause = { data: "0x08c379a0" };
    const thrown = Object.assign(new Error("execution reverted"), { cause });
    wallet.adapter.sendTransaction.mockRejectedValueOnce(thrown);
    const { seen, run } = harness({ ...deps, account: ACCOUNT });
    await expect(run({ calls: [payCall()] })).resolves.toMatchObject({
      status: "failed",
    });
    expect(seen.current!.failure).toBe(thrown);
    expect((seen.current!.failure as typeof thrown).cause).toBe(cause);
    expect(seen.current!.error).toBeTruthy();

    // A new run clears it, and a cancel leaves none.
    reviewUi(async () => null);
    await expect(run({ calls: [payCall(6n)] })).resolves.toBeNull();
    expect(seen.current!.failure).toBeNull();

    wallet.adapter.sendTransaction.mockRejectedValueOnce(thrown);
    reviewUi();
    await run({ calls: [payCall(7n)] });
    expect(seen.current!.failure).toBe(thrown);
    act(() => seen.current!.reset());
    expect(seen.current!.failure).toBeNull();
  });

  test("refuses a multi-call run without scope", async () => {
    const prompts = reviewUi();
    const { wallet, deps } = setup();
    const { seen, run } = harness({ ...deps, account: ACCOUNT });
    await expect(
      run({ calls: [approveCall(), payCall()] }),
    ).resolves.toMatchObject({ status: "failed" });
    expect(seen.current!.error).toBe(REVIEWED_RUN_SCOPE_LINE);
    expect(prompts).toHaveLength(0);
    expect(wallet.adapter.sendTransaction).not.toHaveBeenCalled();

    const none = harness(null);
    await expect(none.run({ calls: [payCall()] })).resolves.toMatchObject({
      status: "failed",
    });
    expect(none.seen.current!.error).toBe("Connect a wallet first.");
  });

  test("reports progress per step", async () => {
    reviewUi();
    const { wallet, deps } = setup();
    // The wallet waits on the second step until the test lets it answer.
    const send = wallet.adapter.sendTransaction.getMockImplementation()!;
    let answer!: () => void;
    const second = new Promise<void>((resolve) => (answer = resolve));
    wallet.adapter.sendTransaction.mockImplementation(async (tx) => {
      if (wallet.adapter.sendTransaction.mock.calls.length === 2) await second;
      return send(tx);
    });
    const { seen } = harness({ ...deps, account: ACCOUNT });
    let running!: ReturnType<UseReviewedRunResult["run"]>;
    await act(async () => {
      running = seen.current!.run({
        calls: [approveCall(), payCall()],
        scope: "pay:project-1",
      });
    });
    await act(() =>
      vi.waitFor(() =>
        expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(2),
      ),
    );
    expect(seen.current).toMatchObject({
      phase: "signing",
      step: 1,
      total: 2,
      hash: `0x${"1".padStart(64, "0")}`,
    });
    await act(async () => {
      answer();
      await running;
    });
    await expect(running).resolves.toMatchObject({ status: "done" });
    expect(seen.current).toMatchObject({
      phase: "done",
      step: 1,
      total: 2,
      error: null,
      hash: `0x${"2".padStart(64, "0")}`,
    });
  });

  test("resumes a scope's unfinished sequence and shows a held step", async () => {
    const prompts = reviewUi();
    const { wallet, deps } = setup();
    wallet.adapter.sendTransaction.mockRejectedValueOnce(
      new Error("The request took too long to respond."),
    );
    const { seen, run } = harness({ ...deps, account: ACCOUNT });
    const action = {
      calls: [approveCall(), payCall()],
      scope: "pay:project-1",
    };
    await expect(run(action)).resolves.toMatchObject({ status: "failed" });
    // The same action again resumes it: its held step refuses before a review.
    await expect(run(action)).resolves.toMatchObject({ status: "failed" });
    expect(prompts).toHaveLength(1);
    expect(seen.current!.held).toMatchObject({
      phase: "held",
      state: { status: "held-no-hash" },
    });
    expect(seen.current!.error).toBe(seen.current!.held!.line);

    // Other calls under the same scope are refused, not resumed in their name.
    await expect(
      run({ ...action, calls: [approveCall(), payCall(9n)] }),
    ).resolves.toMatchObject({ status: "failed" });
    expect(seen.current!.error).toBe(REVIEWED_SEQUENCE_UNFINISHED_LINE);
    // Nor are the same calls at another exact gas.
    await expect(
      run({
        ...action,
        calls: [approveCall(), payCall(5n, { gas: 100_000n })],
      }),
    ).resolves.toMatchObject({ status: "failed" });
    expect(seen.current!.error).toBe(REVIEWED_SEQUENCE_UNFINISHED_LINE);
    expect(prompts).toHaveLength(1);
  });

  test("finishes a sequence whose last step landed while away", async () => {
    const prompts = reviewUi();
    const { wallet, chain, deps } = setup();
    const wait =
      chain.client.waitForTransactionReceipt.getMockImplementation()!;
    chain.client.waitForTransactionReceipt.mockImplementation(async (args) =>
      args.hash === `0x${"2".padStart(64, "0")}`
        ? new Promise(() => {})
        : wait(args),
    );
    const action = {
      calls: [approveCall(), payCall()],
      scope: "pay:project-1",
    };
    const first = harness({ ...deps, account: ACCOUNT });
    void act(() => void first.seen.current!.run(action));
    await vi.waitFor(() =>
      expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(2),
    );
    const { seen, run } = harness({ ...deps, account: ACCOUNT });
    await expect(run(action)).resolves.toMatchObject({
      status: "done",
      receipts: [],
    });
    expect(prompts).toHaveLength(1);
    expect(seen.current).toMatchObject({ phase: "done", step: 1, total: 2 });
  });

  test("follows the held step as its hold changes", async () => {
    reviewUi();
    const { wallet, chain, deps, hold, holdOf } = setup();
    wallet.adapter.sendTransaction.mockRejectedValueOnce(
      new Error("The request took too long to respond."),
    );
    const { seen, run } = harness({ ...deps, account: ACCOUNT });
    const call = payCall();
    // An ambiguous failure: nothing refused it, but its step is held now.
    await expect(
      run({ calls: [call], scope: "pay:project-1" }),
    ).resolves.toMatchObject({ status: "failed" });
    expect(seen.current!.held).toMatchObject({
      phase: "held",
      state: { status: "held-no-hash" },
    });
    // Released elsewhere (the user checked their wallet): it shows clear.
    const handle = hold.open(holdOf(call));
    const state = await handle.state(chain.client as never);
    await act(async () => {
      await handle.exit(state, { checkedWallet: true }, chain.client as never);
    });
    expect(seen.current!.held).toBeNull();
  });

  test("an aborted review ends the run cancelled, ready to run again", async () => {
    const prompts = reviewUi(() => new Promise(() => {}));
    const { wallet, deps } = setup();
    const { seen, run } = harness({ ...deps, account: ACCOUNT });
    const controller = new AbortController();
    let running!: ReturnType<UseReviewedRunResult["run"]>;
    await act(async () => {
      running = seen.current!.run({
        calls: [payCall()],
        signal: controller.signal,
      });
    });
    await act(() => vi.waitFor(() => expect(prompts).toHaveLength(1)));
    expect(seen.current!.phase).toBe("review");
    await act(async () => {
      controller.abort();
      await expect(running).resolves.toBeNull();
    });
    expect(seen.current).toMatchObject({ phase: "idle", error: null });
    expect(wallet.adapter.sendTransaction).not.toHaveBeenCalled();
    reviewUi();
    await expect(run({ calls: [payCall()] })).resolves.toMatchObject({
      status: "done",
    });
  });

  test("an abort while the engine loads ends the run cancelled", async () => {
    const prompts = reviewUi();
    const { deps } = setup();
    const { seen } = harness({
      ...deps,
      account: ACCOUNT,
      engine: () => new Promise(() => {}),
    });
    const controller = new AbortController();
    let running!: ReturnType<UseReviewedRunResult["run"]>;
    await act(async () => {
      running = seen.current!.run({
        calls: [payCall()],
        signal: controller.signal,
      });
    });
    await act(async () => {
      controller.abort();
      await expect(running).resolves.toBeNull();
    });
    expect(seen.current).toMatchObject({ phase: "idle", error: null });
    expect(prompts).toHaveLength(0);
  });

  test("preloads the engine once, and again only after a failed load", async () => {
    reviewUi();
    const { deps } = setup();
    const engine = vi.fn(() => import("../send.js"));
    const { seen, run } = harness({ ...deps, account: ACCOUNT, engine });
    // Mounting preloads it.
    expect(engine).toHaveBeenCalledTimes(1);
    for (let i = 0; i < 3; i += 1) seen.current!.preload();
    await run({ calls: [payCall()] });
    expect(engine).toHaveBeenCalledTimes(1);

    const failing = vi
      .fn<() => Promise<typeof import("../send.js")>>()
      .mockRejectedValueOnce(new Error("chunk failed"))
      .mockImplementation(() => import("../send.js"));
    const again = harness({ ...deps, account: ACCOUNT, engine: failing });
    await act(() => vi.waitFor(() => expect(failing).toHaveBeenCalled()));
    await expect(again.run({ calls: [payCall(6n)] })).resolves.toMatchObject({
      status: "done",
    });
    expect(failing).toHaveBeenCalledTimes(2);
  });

  test("discards a released sequence, and refuses while a step is held or a run is open", async () => {
    const prompts = reviewUi();
    const { wallet, deps, storage } = setup();
    const send = wallet.adapter.sendTransaction.getMockImplementation()!;
    wallet.adapter.sendTransaction.mockImplementation(async (tx) => {
      if (wallet.adapter.sendTransaction.mock.calls.length === 2)
        throw new Error("The request took too long to respond.");
      return send(tx);
    });
    const { seen, run } = harness({ ...deps, account: ACCOUNT });
    const scope = "pay:project-1";
    const action = { calls: [approveCall(), payCall()], scope };
    await expect(run(action)).resolves.toMatchObject({ status: "failed" });
    // Its second step is held: nothing is discarded.
    await act(async () => {
      await expect(seen.current!.discard(scope)).rejects.toThrow(
        REVIEWED_SEQUENCE_HELD_LINE,
      );
    });
    await vi.waitFor(() => expect(seen.current!.exitAction).not.toBeNull());
    await act(async () => {
      await seen.current!.exitAction!.run();
    });
    expect(findReviewedSequence(scope, ACCOUNT, { storage })).not.toBeNull();
    // The sending account's sequence, whichever account is connected now.
    act(() => root?.unmount());
    const other = harness({ ...deps, account: OTHER });
    await act(async () => {
      await other.seen.current!.discard(scope, ACCOUNT);
    });
    expect(findReviewedSequence(scope, ACCOUNT, { storage })).toBeNull();
    expect(other.seen.current).toMatchObject({ phase: "idle", error: null });

    // While a run's review is open, nothing is discarded under it.
    reviewUi(() => new Promise(() => {}));
    act(() => root?.unmount());
    const busy = harness({ ...deps, account: ACCOUNT });
    await act(async () => {
      void busy.seen.current!.run({ calls: [payCall(8n)], scope });
    });
    await act(async () => {
      await expect(busy.seen.current!.discard(scope)).rejects.toThrow(
        REVIEWED_RUN_BUSY_LINE,
      );
    });
    expect(prompts.length).toBeGreaterThan(0);
  });

  test("a step the user released by its exit is reviewed once more and sent alone", async () => {
    const prompts = reviewUi();
    const { wallet, deps } = setup();
    const send = wallet.adapter.sendTransaction.getMockImplementation()!;
    // A WalletConnect drop: the pay step's wallet call ends with no hash.
    wallet.adapter.sendTransaction.mockImplementation(async (tx) => {
      if (wallet.adapter.sendTransaction.mock.calls.length === 2)
        throw new Error("The request took too long to respond.");
      return send(tx);
    });
    const { seen, run } = harness({ ...deps, account: ACCOUNT });
    // Held under its intent, as sites send payments.
    const action = {
      calls: [approveCall(), { ...payCall(), intent: "pay:1" }],
      scope: "pay:project-1",
    };
    await expect(run(action)).resolves.toMatchObject({ status: "failed" });
    expect(prompts).toHaveLength(1);
    await vi.waitFor(() => expect(seen.current!.exitAction).not.toBeNull());
    await act(async () => {
      await expect(seen.current!.exitAction!.run()).resolves.toBe(true);
    });
    // The next attempt: one review, of the pay step only, and only it is sent.
    await expect(run(action)).resolves.toMatchObject({ status: "done" });
    expect(prompts).toHaveLength(2);
    expect(prompts[1].model.calls).toHaveLength(1);
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(3);
    expect(wallet.adapter.sendTransaction.mock.calls[2][0].data).toBe(
      payCall().data,
    );
  });

  test("refuses a run for another account before the review", async () => {
    const prompts = reviewUi();
    const { wallet, deps } = setup();
    const { seen, run } = harness({ ...deps, account: ACCOUNT });
    await expect(
      run({ account: OTHER, calls: [payCall()] }),
    ).resolves.toMatchObject({ status: "failed" });
    expect(seen.current!.error).toBe(
      "The connected account changed. Review again.",
    );
    expect(prompts).toHaveLength(0);
    expect(wallet.adapter.sendTransaction).not.toHaveBeenCalled();
    await expect(
      run({ account: ACCOUNT, calls: [payCall()] }),
    ).resolves.toMatchObject({ status: "done" });
  });

  test("offers the held step's exit, which releases it", async () => {
    reviewUi();
    const { wallet, deps } = setup();
    wallet.adapter.sendTransaction.mockRejectedValueOnce(
      new Error("The request took too long to respond."),
    );
    const { seen, run } = harness({ ...deps, account: ACCOUNT });
    await expect(
      run({ calls: [payCall()], scope: "pay:project-1" }),
    ).resolves.toMatchObject({ status: "failed" });
    await vi.waitFor(() => expect(seen.current!.exitAction).not.toBeNull());
    expect(seen.current!.sendAgainAction).toBeNull();
    await act(async () => {
      await expect(seen.current!.exitAction!.run()).resolves.toBe(true);
    });
    expect(seen.current!.held).toBeNull();
    expect(seen.current!.exitAction).toBeNull();
  });

  /**
   * A Safe app's proposal of `call`, sent through the hook, that its Safe
   * then runs in EXECUTION: mined with the Safe's ExecutionSuccess for it, so
   * the real hold settles it from its receipt. `readable` is how many of
   * EXECUTION's receipt reads answer (all, by default).
   */
  async function proposedThenExecuted(
    readable = Infinity,
    {
      calls = [payCall()],
      event = "ExecutionSuccess",
    }: { calls?: ReturnType<typeof payCall>[]; event?: string } = {},
  ) {
    reviewUi();
    const context = setup();
    const { wallet, deps, chain } = context;
    wallet.state.safe = true;
    const onConfirmed = vi.fn();
    const scope = "pay:safe";
    const call = calls[0];
    const hook = harness({ ...deps, account: ACCOUNT });
    const result = await hook.run({ calls, scope, onConfirmed });
    expect(result).toMatchObject({ status: "proposed" });
    const proposal = (result as { safeTxHash: ViemHex }).safeTxHash;
    const EXECUTION = `0x${"ee".repeat(32)}` as ViemHex;
    chain.mine(EXECUTION, { to: ACCOUNT, data: "0x", value: 0n });
    const block = chain.state.mined.get(EXECUTION)!;
    chain.state.logs = [
      {
        address: ACCOUNT,
        topics: encodeEventTopics({
          abi: parseAbi([`event ${event}(bytes32 txHash, uint256 payment)`]),
        }),
        data: encodeAbiParameters(
          [{ type: "bytes32" }, { type: "uint256" }],
          [proposal, 0n],
        ),
        removed: false,
        transactionHash: EXECUTION,
        blockHash: numberToHex(block, { size: 32 }),
        blockNumber: block,
        transactionIndex: 0,
        logIndex: 0,
      },
    ];
    const read = chain.client.getTransactionReceipt.getMockImplementation()!;
    let reads = 0;
    chain.client.getTransactionReceipt.mockImplementation(async (args) => {
      if (args.hash === EXECUTION && ++reads > readable)
        throw new Error("lagging node");
      return read(args);
    });
    await act(async () => {
      await openStepHold(deps.hold, ACCOUNT, true, call).onExecuted(
        chain.client as never,
        EXECUTION,
      );
    });
    return { ...context, ...hook, onConfirmed, scope, EXECUTION };
  }

  test("a Safe proposal its hold settles completes once its execution's receipt is verified: onConfirmed once, the checkpoint cleared", async () => {
    const { seen, onConfirmed, scope, storage, EXECUTION } =
      await proposedThenExecuted();
    await rendered(() => expect(seen.current!.phase).toBe("done"));
    expect(onConfirmed).toHaveBeenCalledOnce();
    expect(onConfirmed.mock.calls[0][2]).toMatchObject({
      transactionHash: EXECUTION,
    });
    expect(seen.current!.receipt).toMatchObject({
      transactionHash: EXECUTION,
    });
    expect(findReviewedSequence(scope, ACCOUNT, { storage })).toBeNull();
  });

  test("a Safe proposal whose execution's receipt can't be read stays confirming, never done", async () => {
    const { seen, onConfirmed, scope, storage } = await proposedThenExecuted(2);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(seen.current!.phase).not.toBe("done");
    expect(onConfirmed).not.toHaveBeenCalled();
    expect(
      findReviewedSequence(scope, ACCOUNT, { storage })?.sending,
    ).toMatchObject({ step: 0 });
  });

  test("ends a followed Safe proposal's run when its hold settles it", async () => {
    // The approval settling is not the action done: running it again resumes.
    const approval = await proposedThenExecuted(Infinity, {
      calls: [approveCall(), payCall()],
    });
    await rendered(() =>
      expect(approval.seen.current).toMatchObject({
        phase: "idle",
        step: 0,
        total: 2,
        hash: approval.EXECUTION,
        receipt: expect.objectContaining({
          transactionHash: approval.EXECUTION,
        }),
        error: null,
        settled: { step: 0, finished: false },
      }),
    );
    expect(approval.onConfirmed).toHaveBeenCalledOnce();
    act(() => root?.unmount());

    // A Safe that ran it and failed shows the failure.
    const failed = await proposedThenExecuted(Infinity, {
      event: "ExecutionFailure",
    });
    await rendered(() =>
      expect(failed.seen.current).toMatchObject({
        phase: "idle",
        error: HELD_FAILED_LINE,
        // Its execution's receipt, so a site can say it ran and failed.
        receipt: expect.objectContaining({
          transactionHash: failed.EXECUTION,
        }),
      }),
    );
    expect(failed.onConfirmed).not.toHaveBeenCalled();
    act(() => root?.unmount());

    /** A fresh Safe's proposal, followed. */
    const proposed = async (expire = false) => {
      act(() => root?.unmount());
      const fresh = setup();
      fresh.wallet.state.safe = true;
      /** Once proposed, its hold reads the proposal proven expired. */
      let lapsed = false;
      const hold = {
        ...fresh.deps.hold,
        open: ((...args: Parameters<typeof fresh.deps.hold.open>) => {
          const handle = fresh.deps.hold.open(...args);
          const { reservation } = handle.peek();
          return {
            ...handle,
            state: async (...state: Parameters<typeof handle.state>) =>
              lapsed
                ? ({
                    status: "clear",
                    reservation,
                    settled: { result: "expired" },
                  } as const)
                : handle.state(...state),
          };
        }) as typeof fresh.deps.hold.open,
      };
      const next = harness({ ...fresh.deps, hold, account: ACCOUNT });
      await next.run({ calls: [payCall()] });
      expect(next.seen.current!.phase).toBe("proposed");
      lapsed = expire;
      return next.seen;
    };
    // A proposal its hold proved expired shows that.
    const expired = await proposed(true);
    await rendered(() => expect(views.last).toBeDefined());
    act(() =>
      (views.last!.onSettled! as (s: unknown, r: unknown) => void)(
        { result: "expired" },
        null,
      ),
    );
    await rendered(() =>
      expect(expired.current).toMatchObject({
        phase: "idle",
        error: HELD_EXPIRED_LINE,
      }),
    );

    // A reset run ignores its followed step's late end.
    const stale = await proposed();
    const late = views.last!;
    act(() => stale.current!.reset());
    act(() =>
      (late.onSettled! as (s: unknown, r: unknown) => void)(
        { result: "success", hash: approval.EXECUTION },
        null,
      ),
    );
    act(() => late.onReleased!("user"));
    expect(stale.current).toMatchObject({ phase: "idle", receipt: null });

    // A proposal released by the user's exit ends its run too.
    const released = await proposed();
    act(() => views.last!.onReleased!("user"));
    expect(released.current).toMatchObject({
      phase: "idle",
      safeTxHash: null,
      error: null,
    });
  });

  test("returns a failure with its line, and never shows a raw node error", async () => {
    reviewUi();
    const { wallet, deps } = setup();
    const raw = Object.assign(
      new Error(
        "Missing or invalid parameters.\n\nURL: https://node.example/secret\nDetails: header not found",
      ),
      {
        shortMessage: "Missing or invalid parameters.",
        details: "header not found",
      },
    );
    wallet.adapter.sendTransaction.mockRejectedValueOnce(raw);
    const { seen, run } = harness({ ...deps, account: ACCOUNT });
    const result = await run({ calls: [payCall()] });
    expect(result).toEqual({
      status: "failed",
      error: NETWORK_ERROR_LINE,
      failure: raw,
    });
    expect(seen.current!.error).toBe(NETWORK_ERROR_LINE);
  });

  test("never reads the Safe mode of a wallet that is not ready", async () => {
    const prompts = reviewUi();
    const { wallet, deps } = setup();
    const isSafe = vi.fn(() => false);
    const adapter = {
      ...wallet.adapter,
      isSafe,
      ready: () => Promise.reject(new Error("peer")),
    };
    const { seen, run } = harness({ ...deps, adapter, account: ACCOUNT });
    await expect(run({ calls: [payCall()] })).resolves.toMatchObject({
      status: "failed",
    });
    expect(seen.current!.held).toBeNull();
    expect(isSafe).not.toHaveBeenCalled();
    expect(prompts).toHaveLength(0);
  });

  test("shows a Safe proposal's hash", async () => {
    reviewUi();
    const { wallet, deps } = setup();
    wallet.state.safe = true;
    const { seen, run } = harness({ ...deps, account: ACCOUNT });
    await expect(run({ calls: [payCall()] })).resolves.toMatchObject({
      status: "proposed",
    });
    expect(seen.current).toMatchObject({
      phase: "proposed",
      safeTxHash: `0x${"1".padStart(64, "0")}`,
      hash: null,
    });
  });

  test("follows a Safe app batch as its one proposal", async () => {
    reviewUi();
    const { wallet, deps } = setup();
    wallet.state.safe = true;
    const proposal = `0x${"ab".repeat(32)}` as const;
    const adapter = {
      ...wallet.adapter,
      sendCalls: vi.fn(async () => proposal),
    };
    const { seen, run } = harness({ ...deps, adapter, account: ACCOUNT });
    await expect(
      run({ calls: [approveCall(), payCall()], scope: "pay", batch: true }),
    ).resolves.toMatchObject({ status: "proposed", safeTxHash: proposal });
    expect(seen.current).toMatchObject({
      phase: "proposed",
      safeTxHash: proposal,
    });
    await vi.waitFor(() => expect(seen.current!.held).not.toBeNull());
  });

  test("a done it shows lets the next run through; one nothing showed is offered as Send it again", async () => {
    const prompts = reviewUi();
    const { wallet, deps } = setup();
    const call = payCall();
    const { run } = harness({ ...deps, account: ACCOUNT });
    await expect(run({ calls: [call] })).resolves.toMatchObject({
      status: "done",
    });
    // Shown, so the same payment again is a new one.
    await expect(run({ calls: [call] })).resolves.toMatchObject({
      status: "done",
    });
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(2);

    // A run whose page unmounted before it ended showed nothing.
    unregister.pop()!();
    let answer!: () => void;
    reviewUi(
      (prompt) =>
        new Promise((resolve) => (answer = () => resolve(prompt.confirmation))),
    );
    const gone = harness({ ...deps, account: ACCOUNT });
    let pending!: ReturnType<UseReviewedRunResult["run"]>;
    act(() => {
      pending = gone.seen.current!.run({ calls: [call] });
    });
    await vi.waitFor(() => expect(answer).toBeDefined());
    act(() => root?.unmount());
    answer();
    await expect(pending).resolves.toMatchObject({ status: "done" });
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(3);

    // Remounted, the same payment is refused before its review, with "Send it again".
    resetReviewUi();
    reviewUi();
    const { seen, run: again } = harness({ ...deps, account: ACCOUNT });
    await expect(again({ calls: [call] })).resolves.toMatchObject({
      status: "failed",
      error: HELD_AWAY_SUCCESS_LINE,
    });
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(3);
    await vi.waitFor(() =>
      expect(seen.current!.sendAgainAction).not.toBeNull(),
    );
    await act(async () => {
      await seen.current!.sendAgainAction!.run();
    });
    await expect(again({ calls: [call] })).resolves.toMatchObject({
      status: "done",
    });
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(4);
    expect(prompts).toHaveLength(2);
  });

  /** A run that hands a step still confirming back at once, as one whose follow timed out. */
  const HANDED_BACK = { follow: { timeoutMs: 0 } };

  /** A run whose receipt the hold can't read yet: the node lags. */
  async function unverified() {
    reviewUi();
    const { wallet, chain, deps, hold } = setup();
    const read = chain.client.getTransactionReceipt.getMockImplementation()!;
    chain.client.getTransactionReceipt.mockImplementation(async () => {
      throw new Error("lagging node");
    });
    const { seen, run } = harness({ ...deps, account: ACCOUNT });
    const call = payCall();
    const result = await run({ ...HANDED_BACK, calls: [call] });
    return { wallet, chain, read, seen, run, call, result, hold };
  }

  test("run resolves as verifying, not failed, while the hold verifies the receipt", async () => {
    const { seen, result } = await unverified();
    const hash = `0x${"1".padStart(64, "0")}`;
    expect(result).toMatchObject({ status: "receipt", step: 0, hash });
    // The hook says the same thing the return value does.
    expect(seen.current).toMatchObject({
      phase: "receipt",
      step: 0,
      hash,
      error: null,
      failure: null,
    });
    await vi.waitFor(() =>
      expect(seen.current!.held).toMatchObject({ phase: "confirming" }),
    );
  });

  test("a payment verified late completes its sequence and tells onConfirmed once, before done", async () => {
    reviewUi();
    const { wallet, chain, deps, storage } = setup();
    const read = chain.client.getTransactionReceipt.getMockImplementation()!;
    const payment = `0x${"2".padStart(64, "0")}`;
    // The approval verifies; the payment's receipt the hold can't read yet.
    chain.client.getTransactionReceipt.mockImplementation(async (args) => {
      if (args.hash === payment) throw new Error("lagging node");
      return read(args);
    });
    const onConfirmed = vi.fn();
    const scope = "pay:project-1";
    const action = {
      ...HANDED_BACK,
      calls: [approveCall(), payCall()],
      scope,
      onConfirmed,
    };
    const { seen, run } = harness({ ...deps, account: ACCOUNT });
    await expect(run(action)).resolves.toMatchObject({
      status: "receipt",
      step: 1,
      hash: payment,
    });
    expect(onConfirmed.mock.calls.map(([, step]) => step)).toEqual([0]);
    await vi.waitFor(() =>
      expect(seen.current!.held).toMatchObject({ phase: "confirming" }),
    );
    chain.client.getTransactionReceipt.mockImplementation(read);
    let sequenceAtDone: unknown = "unread";
    act(() => void globalThis.dispatchEvent(new Event("focus")));
    await rendered(() => {
      expect(seen.current!.phase).toBe("done");
      sequenceAtDone = findReviewedSequence(scope, ACCOUNT, { storage });
    });
    // Completed before the hook showed done.
    expect(sequenceAtDone).toBeNull();
    expect(onConfirmed.mock.calls.map(([, step]) => step)).toEqual([0, 1]);
    // The next run sends.
    await expect(run(action)).resolves.toMatchObject({ status: "done" });
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(4);
    expect(onConfirmed).toHaveBeenCalledTimes(4);
  });

  test("a sped-up send the hold verified is acknowledged by its mined hash, so the next run sends", async () => {
    reviewUi();
    const { wallet, chain, deps } = setup();
    const { replacement } = speedUpNextSend(chain, wallet);
    const { run } = harness({ ...deps, account: ACCOUNT });
    const first = await run({ calls: [payCall()] });
    expect(first).toMatchObject({ status: "done", hashes: [replacement] });
    const done = first as Extract<typeof first, { status: "done" }>;
    expect(done.hashes[0]).toBe(done.receipts[0].transactionHash);
    // Acknowledged: the next run is not refused as "went through while you were away".
    await expect(run({ calls: [payCall()] })).resolves.toMatchObject({
      status: "done",
    });
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(2);
  });

  test("a send whose receipt watcher is exhausted completes once the node recovers: onConfirmed once, its signature kept", async () => {
    reviewUi();
    const { wallet, chain, deps } = setup();
    const signature = `0x${"5e".repeat(65)}` as const;
    wallet.adapter.signMessage.mockImplementation(async () => signature);
    const read = chain.client.getTransactionReceipt.getMockImplementation()!;
    const watch =
      chain.client.waitForTransactionReceipt.getMockImplementation()!;
    chain.client.waitForTransactionReceipt.mockRejectedValue(
      new Error("watcher dropped"),
    );
    chain.client.getTransactionReceipt.mockRejectedValue(
      new Error("lagging node"),
    );
    const onConfirmed = vi.fn();
    const { seen } = harness({ ...deps, account: ACCOUNT });
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    let left!: Awaited<ReturnType<UseReviewedRunResult["run"]>>;
    try {
      let pending!: ReturnType<UseReviewedRunResult["run"]>;
      act(() => {
        pending = seen.current!.run({
          calls: [payCall()],
          signatures: [{ kind: "message", chainId: 10, message: "List it" }],
          onConfirmed,
        });
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(400_000);
      });
      left = await pending;
    } finally {
      vi.useRealTimers();
    }
    expect(left).toMatchObject({ status: "receipt", signatures: [signature] });
    const ended = (left as ReviewedRunReceipt).ended();
    chain.client.getTransactionReceipt.mockImplementation(read);
    chain.client.waitForTransactionReceipt.mockImplementation(watch);
    act(() => void globalThis.dispatchEvent(new Event("focus")));
    await expect(ended).resolves.toMatchObject({
      status: "done",
      signatures: [signature],
    });
    expect(onConfirmed).toHaveBeenCalledOnce();
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledOnce();
  });

  test("the view's receipt completes a late step when completion's own reread fails, telling onConfirmed once", async () => {
    reviewUi();
    const { chain, deps, storage } = setup();
    const read = chain.client.getTransactionReceipt.getMockImplementation()!;
    const payment = `0x${"2".padStart(64, "0")}`;
    chain.client.getTransactionReceipt.mockImplementation(async (args) => {
      if (args.hash === payment) throw new Error("lagging node");
      return read(args);
    });
    // Completion's own client can never read a receipt.
    const unreadable = {
      ...chain.client,
      getTransactionReceipt: async () => {
        throw new Error("lagging node");
      },
    };
    const engine = async () => {
      const real = await import("../send.js");
      return {
        ...real,
        completeReviewedStep: ((unverified, action, given, receipt) =>
          real.completeReviewedStep(
            unverified,
            action,
            { ...given, clientFor: () => unreadable as never },
            receipt,
          )) as typeof real.completeReviewedStep,
      };
    };
    const onConfirmed = vi.fn();
    const scope = "pay:view-receipt";
    const action = {
      ...HANDED_BACK,
      calls: [approveCall(), payCall()],
      scope,
      onConfirmed,
    };
    const { seen, run } = harness({ ...deps, engine, account: ACCOUNT });
    await expect(run(action)).resolves.toMatchObject({ status: "receipt" });
    await vi.waitFor(() =>
      expect(seen.current!.held).toMatchObject({ phase: "confirming" }),
    );
    chain.client.getTransactionReceipt.mockImplementation(read);
    act(() => void globalThis.dispatchEvent(new Event("focus")));
    await rendered(() => expect(seen.current!.phase).toBe("done"));
    expect(onConfirmed.mock.calls.map(([, step]) => step)).toEqual([0, 1]);
    expect(onConfirmed.mock.calls[1][2]).toMatchObject({
      transactionHash: payment,
    });
    expect(findReviewedSequence(scope, ACCOUNT, { storage })).toBeNull();
  });

  test("a run left at its receipt ends done, with every step's hash, once its hold settles it", async () => {
    const prompts = reviewUi();
    const { chain, deps } = setup();
    const read = chain.client.getTransactionReceipt.getMockImplementation()!;
    const approval = `0x${"1".padStart(64, "0")}`;
    const payment = `0x${"2".padStart(64, "0")}`;
    chain.client.getTransactionReceipt.mockImplementation(async (args) => {
      if (args.hash === payment) throw new Error("lagging node");
      return read(args);
    });
    const { run } = harness({ ...deps, account: ACCOUNT });
    const left = await run({
      ...HANDED_BACK,
      calls: [approveCall(), payCall()],
      scope: "pay:ended",
    });
    expect(left).toMatchObject({ status: "receipt", step: 1 });
    let ended: unknown = "pending";
    void (left as ReviewedRunReceipt).ended().then((value) => (ended = value));
    await act(async () => {});
    expect(ended).toBe("pending");
    chain.client.getTransactionReceipt.mockImplementation(read);
    act(() => void globalThis.dispatchEvent(new Event("focus")));
    await rendered(() => expect(ended).not.toBe("pending"));
    expect(ended).toMatchObject({
      status: "done",
      hashes: [approval, payment],
      receipts: [{ transactionHash: payment }],
    });
    expect(prompts).toHaveLength(1);
  });

  test("a one-step run left at its receipt ends done with its one hash", async () => {
    const { chain, read, result } = await unverified();
    const ended = (result as ReviewedRunReceipt).ended();
    chain.client.getTransactionReceipt.mockImplementation(read);
    act(() => void globalThis.dispatchEvent(new Event("focus")));
    await expect(ended).resolves.toMatchObject({
      status: "done",
      hashes: [`0x${"1".padStart(64, "0")}`],
    });
    expect(((await ended) as { hashes: unknown[] }).hashes).toHaveLength(1);
  });

  test("a run whose earlier step was left at its receipt continues once it settles, when its end is awaited", async () => {
    const prompts = reviewUi();
    const { chain, deps, wallet } = setup();
    const read = chain.client.getTransactionReceipt.getMockImplementation()!;
    const approval = `0x${"1".padStart(64, "0")}`;
    chain.client.getTransactionReceipt.mockImplementation(async (args) => {
      if (args.hash === approval) throw new Error("lagging node");
      return read(args);
    });
    const { run } = harness({ ...deps, account: ACCOUNT });
    const left = await run({
      ...HANDED_BACK,
      calls: [approveCall(), payCall()],
      scope: "pay:continued",
    });
    expect(left).toMatchObject({ status: "receipt", step: 0 });
    const ended = (left as ReviewedRunReceipt).ended();
    chain.client.getTransactionReceipt.mockImplementation(read);
    act(() => void globalThis.dispatchEvent(new Event("focus")));
    await expect(ended).resolves.toMatchObject({ status: "done" });
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(2);
    // The remaining step is reviewed once more, as a resumed run is.
    expect(prompts).toHaveLength(2);
  });

  test("a run left at its receipt ends failed when its hold settles a revert", async () => {
    reviewUi();
    const { chain, deps } = setup();
    const read = chain.client.getTransactionReceipt.getMockImplementation()!;
    chain.client.getTransactionReceipt.mockImplementation(async () => {
      throw new Error("lagging node");
    });
    chain.state.status = "reverted";
    const { run } = harness({ ...deps, account: ACCOUNT });
    const left = await run({ ...HANDED_BACK, calls: [payCall()] });
    const ended = (left as ReviewedRunReceipt).ended();
    chain.client.getTransactionReceipt.mockImplementation(read);
    act(() => void globalThis.dispatchEvent(new Event("focus")));
    await expect(ended).resolves.toMatchObject({ status: "failed" });
  });

  test("a run left at its receipt resolves with the signatures it signed", async () => {
    reviewUi();
    const { wallet, chain, deps } = setup();
    const signature = `0x${"5e".repeat(65)}` as const;
    wallet.adapter.signMessage.mockImplementation(async () => signature);
    chain.client.getTransactionReceipt.mockImplementation(async () => {
      throw new Error("lagging node");
    });
    const { run } = harness({ ...deps, account: ACCOUNT });
    await expect(
      run({
        ...HANDED_BACK,
        calls: [payCall()],
        signatures: [{ kind: "message", chainId: 10, message: "List it" }],
      }),
    ).resolves.toMatchObject({ status: "receipt", signatures: [signature] });
  });

  test("an approval confirming late is followed in place: two writes, one review", async () => {
    const prompts = reviewUi();
    const { chain, deps, wallet } = setup();
    const read = chain.client.getTransactionReceipt.getMockImplementation()!;
    const approval = `0x${"1".padStart(64, "0")}`;
    chain.client.getTransactionReceipt.mockImplementation(async (args) => {
      if (args.hash === approval) throw new Error("lagging node");
      return read(args);
    });
    const { seen } = harness({ ...deps, account: ACCOUNT });
    let pending!: ReturnType<UseReviewedRunResult["run"]>;
    act(() => {
      pending = seen.current!.run({
        calls: [approveCall(), payCall()],
        scope: "pay:in-place",
      });
    });
    await rendered(() =>
      expect(seen.current).toMatchObject({ phase: "receipt", step: 0 }),
    );
    chain.client.getTransactionReceipt.mockImplementation(read);
    let result: unknown;
    await act(async () => {
      result = await pending;
    });
    expect(result).toMatchObject({ status: "done" });
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(2);
    expect(prompts).toHaveLength(1);
  }, 20_000);

  test("an unmount while an approval is followed in place ends the run: one write, its end null", async () => {
    reviewUi();
    const { chain, deps, wallet } = setup();
    const read = chain.client.getTransactionReceipt.getMockImplementation()!;
    const approval = `0x${"1".padStart(64, "0")}`;
    chain.client.getTransactionReceipt.mockImplementation(async (args) => {
      if (args.hash === approval) throw new Error("lagging node");
      return read(args);
    });
    const { seen } = harness({ ...deps, account: ACCOUNT });
    let pending!: ReturnType<UseReviewedRunResult["run"]>;
    act(() => {
      pending = seen.current!.run({
        calls: [approveCall(), payCall()],
        scope: "pay:unmounted",
      });
    });
    await rendered(() =>
      expect(seen.current).toMatchObject({ phase: "receipt", step: 0 }),
    );
    act(() => root!.unmount());
    root = undefined;
    chain.client.getTransactionReceipt.mockImplementation(read);
    const result = await pending;
    expect(result).toMatchObject({ status: "receipt", step: 0 });
    await expect((result as ReviewedRunReceipt).ended()).resolves.toBeNull();
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledOnce();
  });

  test("a reset while the approval's first verification is read sends nothing more", async () => {
    reviewUi();
    const { chain, deps, wallet } = setup();
    const read = chain.client.getTransactionReceipt.getMockImplementation()!;
    const approval = `0x${"1".padStart(64, "0")}`;
    let release!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));
    let reading = false;
    chain.client.getTransactionReceipt.mockImplementation(async (args) => {
      if (args.hash === approval) {
        reading = true;
        await held;
      }
      return read(args);
    });
    const { seen } = harness({ ...deps, account: ACCOUNT });
    let pending!: ReturnType<UseReviewedRunResult["run"]>;
    act(() => {
      pending = seen.current!.run({
        calls: [approveCall(), payCall()],
        scope: "pay:reset-verifying",
      });
    });
    await vi.waitFor(() => expect(reading).toBe(true));
    act(() => seen.current!.reset());
    release();
    let result: unknown = "pending";
    await act(async () => {
      result = await pending;
    });
    expect(result).toBeNull();
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledOnce();
  });

  test("an unmount after the run handed its step back resolves its end with null", async () => {
    const { result } = await unverified();
    const ended = (result as ReviewedRunReceipt).ended();
    act(() => root!.unmount());
    root = undefined;
    await expect(ended).resolves.toBeNull();
  });

  test.each(["reset", "unmount"] as const)(
    "a %s while the payment's wallet loads sends nothing more: one write",
    async (end) => {
      const prompts = reviewUi();
      const { deps, wallet } = setup();
      let resume!: () => void;
      let acquiring = false;
      let loads = 0;
      // The wallet's provider: each send reaches the fake chain through the fixture's wallet.
      const provider = async ({
        method,
        params,
      }: {
        method: string;
        params?: unknown;
      }) => {
        if (method === "eth_chainId") return "0xa";
        if (method === "eth_sendTransaction") {
          const [tx] = params as [
            { to: ViemHex; data: ViemHex; value?: ViemHex; gas?: ViemHex },
          ];
          return wallet.adapter.sendTransaction({
            chainId: 10,
            to: tx.to,
            data: tx.data,
            value: BigInt(tx.value ?? 0),
            ...(tx.gas ? { gas: BigInt(tx.gas) } : {}),
          });
        }
        throw new Error(`unexpected ${method}`);
      };
      const real = viemWalletAdapter({
        walletClient: async () => {
          loads += 1;
          // The payment's wallet loads slowly.
          if (loads === 2) {
            acquiring = true;
            await new Promise<void>((resolve) => (resume = resolve));
          }
          return createWalletClient({
            chain: { id: 10 } as never,
            transport: custom({ request: provider }, { retryCount: 0 }),
          });
        },
        account: wallet.adapter.account,
        chainId: wallet.adapter.chainId,
        isSafe: wallet.adapter.isSafe,
        switchChain: async () => undefined,
      });
      const adapter = {
        ...wallet.adapter,
        sendTransaction: real.sendTransaction,
      };
      const { seen } = harness({ ...deps, adapter, account: ACCOUNT });
      let pending!: ReturnType<UseReviewedRunResult["run"]>;
      act(() => {
        pending = seen.current!.run({
          calls: [approveCall(), payCall()],
          scope: `pay:${end}-acquiring`,
        });
      });
      await vi.waitFor(() => expect(acquiring).toBe(true));
      if (end === "reset") act(() => seen.current!.reset());
      else {
        act(() => root!.unmount());
        root = undefined;
      }
      resume();
      let result: unknown = "pending";
      await act(async () => {
        result = await pending;
      });
      expect(result).toBeNull();
      expect(wallet.adapter.sendTransaction).toHaveBeenCalledOnce();
      expect(prompts).toHaveLength(1);
    },
  );

  test("a caller's abort while the approval is followed is a cancel: its end is null, nothing continues", async () => {
    const prompts = reviewUi();
    const { chain, deps, wallet } = setup();
    const read = chain.client.getTransactionReceipt.getMockImplementation()!;
    const approval = `0x${"1".padStart(64, "0")}`;
    chain.client.getTransactionReceipt.mockImplementation(async (args) => {
      if (args.hash === approval) throw new Error("lagging node");
      return read(args);
    });
    const stop = new AbortController();
    const { seen } = harness({ ...deps, account: ACCOUNT });
    let pending!: ReturnType<UseReviewedRunResult["run"]>;
    act(() => {
      pending = seen.current!.run({
        calls: [approveCall(), payCall()],
        scope: "pay:aborted",
        follow: { signal: stop.signal },
      });
    });
    await rendered(() =>
      expect(seen.current).toMatchObject({ phase: "receipt", step: 0 }),
    );
    stop.abort();
    let result: unknown;
    await act(async () => {
      result = await pending;
    });
    expect(result).toMatchObject({ status: "receipt", step: 0 });
    const ended = (result as ReviewedRunReceipt).ended();
    chain.client.getTransactionReceipt.mockImplementation(read);
    act(() => void globalThis.dispatchEvent(new Event("focus")));
    await expect(ended).resolves.toBeNull();
    await act(async () => {});
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledOnce();
    expect(prompts).toHaveLength(1);
  });

  test("a reset resolves an awaited end with null, the step still held", async () => {
    const { seen, result, call, hold } = await unverified();
    let ended: unknown = "pending";
    void (result as ReviewedRunReceipt)
      .ended()
      .then((value) => (ended = value));
    act(() => seen.current!.reset());
    await rendered(() => expect(ended).toBeNull());
    expect(seen.current!.phase).toBe("idle");
    expect(openStepHold(hold, ACCOUNT, false, call).peek().status).not.toBe(
      "clear",
    );
  });

  test("a run left at its receipt ends done with the signatures it signed", async () => {
    reviewUi();
    const { wallet, chain, deps } = setup();
    const read = chain.client.getTransactionReceipt.getMockImplementation()!;
    const signature = `0x${"5e".repeat(65)}` as const;
    wallet.adapter.signMessage.mockImplementation(async () => signature);
    chain.client.getTransactionReceipt.mockImplementation(async () => {
      throw new Error("lagging node");
    });
    const { run } = harness({ ...deps, account: ACCOUNT });
    const left = await run({
      ...HANDED_BACK,
      calls: [payCall()],
      signatures: [{ kind: "message", chainId: 10, message: "List it" }],
    });
    const ended = (left as ReviewedRunReceipt).ended();
    chain.client.getTransactionReceipt.mockImplementation(read);
    act(() => void globalThis.dispatchEvent(new Event("focus")));
    await expect(ended).resolves.toMatchObject({
      status: "done",
      signatures: [signature],
    });
  });

  test("a receipt settled before the hook follows it ends done, never stuck at receipt", async () => {
    reviewUi();
    const { wallet, chain, deps, hold } = setup();
    const read = chain.client.getTransactionReceipt.getMockImplementation()!;
    chain.client.getTransactionReceipt.mockImplementation(async () => {
      throw new Error("lagging node");
    });
    const call = payCall();
    /** The wallet's readiness, held once the send went out: the hook's follow waits on it. */
    let resolveReady: (() => void) | undefined;
    const ready = vi.fn(() =>
      wallet.adapter.sendTransaction.mock.calls.length
        ? new Promise<void>((resolve) => {
            // The hold settles it while the follow waits.
            chain.client.getTransactionReceipt.mockImplementation(read);
            void openStepHold(hold, ACCOUNT, false, call)
              .state(chain.client as never)
              .then(() => {
                resolveReady = resolve;
              });
          })
        : Promise.resolve(),
    );
    const { seen, run } = harness({
      ...deps,
      adapter: { ...deps.adapter, ready },
      account: ACCOUNT,
    });
    await expect(run({ ...HANDED_BACK, calls: [call] })).resolves.toMatchObject(
      {
        status: "receipt",
      },
    );
    await vi.waitFor(() =>
      expect(openStepHold(hold, ACCOUNT, false, call).peek().status).toBe(
        "clear",
      ),
    );
    await vi.waitFor(() => expect(resolveReady).toBeDefined());
    act(() => resolveReady!());
    await rendered(() => expect(seen.current!.phase).toBe("done"));
    expect(seen.current!.held).toBeNull();
  });

  test("done once verification completes", async () => {
    const { wallet, chain, read, seen, run, call } = await unverified();
    await vi.waitFor(() =>
      expect(seen.current!.held).toMatchObject({ phase: "confirming" }),
    );
    // The hold can read it now: the run ends done, its success shown.
    chain.client.getTransactionReceipt.mockImplementation(read);
    act(() => void globalThis.dispatchEvent(new Event("focus")));
    await rendered(() => expect(seen.current!.phase).toBe("done"));
    expect(seen.current).toMatchObject({
      hash: `0x${"1".padStart(64, "0")}`,
      error: null,
    });
    await expect(run({ ...HANDED_BACK, calls: [call] })).resolves.toMatchObject(
      {
        status: "done",
      },
    );
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(2);
  });

  describe("a sent step reaches done only with the receipt its hold verified and onConfirmed once; otherwise it stays uncertain, its checkpoint kept", () => {
    type Ended = {
      /** How the hook ended the step: done, or anything else. */
      done: boolean;
      /** The receipt the hook ended it with (its last step's). */
      receipt: { transactionHash: string; blockHash: string } | null;
      onConfirmed: ReturnType<typeof vi.fn>;
      /** The step it is about, and what it sent: the hash its hold settles. */
      step: number;
      hash: ViemHex;
      chain: ReturnType<typeof setup>["chain"];
      sending: () => unknown;
    };
    const scope = "pay:rows";
    /** A wallet send of `calls`; `lagging` keeps the hold's own reads of `hash` failing. */
    async function sent(
      calls: ReturnType<typeof payCall>[],
      lagging: (hash: string) => boolean,
      after?: (left: unknown) => Promise<boolean>,
    ) {
      reviewUi();
      const { chain, deps, storage } = setup();
      const read = chain.client.getTransactionReceipt.getMockImplementation()!;
      chain.client.getTransactionReceipt.mockImplementation(async (args) => {
        if (lagging(args.hash)) throw new Error("lagging node");
        return read(args);
      });
      const onConfirmed = vi.fn();
      const { seen, run } = harness({ ...deps, account: ACCOUNT });
      const left = await run({
        calls,
        scope,
        onConfirmed,
        follow: { timeoutMs: 1 },
      });
      const done = after
        ? await after(left)
        : (left as { status: string }).status === "done";
      const step = calls.length - 1;
      const hash = `0x${(step + 1).toString(16).padStart(64, "0")}` as ViemHex;
      return {
        done,
        receipt: seen.current!.receipt ?? null,
        onConfirmed,
        step,
        hash,
        chain,
        sending: () =>
          findReviewedSequence(scope, ACCOUNT, { storage })?.sending,
      } as Ended;
    }
    /** Its hold settles once the node reads again; ended() reports it. */
    const recovers = (gate: { lagging: boolean }) => async (left: unknown) => {
      expect(left).toMatchObject({ status: "receipt" });
      const ended = (left as ReviewedRunReceipt).ended();
      gate.lagging = false;
      act(() => void globalThis.dispatchEvent(new Event("focus")));
      return (await ended)?.status === "done";
    };
    /** Never reads: after a while, still not done. */
    const neverReads = async (left: unknown) => {
      expect(left).toMatchObject({ status: "receipt" });
      let ended = false;
      void (left as ReviewedRunReceipt).ended().then(() => (ended = true));
      act(() => void globalThis.dispatchEvent(new Event("focus")));
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });
      return ended;
    };
    const safeRow = (readable: number) => async (): Promise<Ended> => {
      const row = await proposedThenExecuted(readable);
      let done = false;
      try {
        await rendered(() => expect(row.seen.current!.phase).toBe("done"));
        done = true;
      } catch {
        /* Not done: checked below. */
      }
      return {
        done,
        receipt: row.seen.current!.receipt ?? null,
        onConfirmed: row.onConfirmed,
        step: 0,
        hash: row.EXECUTION,
        chain: row.chain,
        sending: () =>
          findReviewedSequence(row.scope, ACCOUNT, { storage: row.storage })
            ?.sending,
      };
    };
    const rows: [string, boolean, () => Promise<Ended>][] = [
      [
        "wallet send, its receipt verified",
        true,
        () => sent([payCall()], () => false),
      ],
      [
        "wallet send left at its receipt, verified later (ended())",
        true,
        () => {
          const gate = { lagging: true };
          return sent(
            [approveCall(), payCall()],
            (hash) => gate.lagging && hash.endsWith("2"),
            recovers(gate),
          );
        },
      ],
      [
        "wallet send whose receipt never verifies",
        false,
        () => sent([payCall()], () => true, neverReads),
      ],
      [
        "Safe proposal, its execution's receipt verified",
        true,
        safeRow(Infinity),
      ],
      ["Safe proposal, its execution's receipt unreadable", false, safeRow(2)],
      [
        "resumed sequence",
        true,
        async () => {
          reviewUi();
          const { chain, deps, storage, wallet } = setup();
          const send = wallet.adapter.sendTransaction.getMockImplementation()!;
          wallet.adapter.sendTransaction
            .mockImplementationOnce(send)
            .mockRejectedValueOnce(
              Object.assign(new Error("User rejected"), { code: 4001 }),
            );
          const calls = [approveCall(), payCall()];
          const onConfirmed = vi.fn();
          const { seen, run } = harness({ ...deps, account: ACCOUNT });
          await run({ calls, scope, onConfirmed });
          onConfirmed.mockClear();
          const left = await run({ calls, scope, onConfirmed });
          return {
            done: (left as { status: string }).status === "done",
            receipt: seen.current!.receipt ?? null,
            onConfirmed,
            step: 1,
            hash: `0x${"2".padStart(64, "0")}` as ViemHex,
            chain,
            sending: () =>
              findReviewedSequence(scope, ACCOUNT, { storage })?.sending,
          };
        },
      ],
    ];

    test.each(rows)("%s", async (_name, done, drive) => {
      const ended = await drive();
      expect(ended.done).toBe(done);
      const told = ended.onConfirmed.mock.calls.filter(
        ([, step]) => step === ended.step,
      );
      if (ended.done) {
        const block =
          ended.chain.state.mined.get(ended.hash.toLowerCase()) ??
          ended.chain.state.mined.get(ended.hash);
        const verified = {
          transactionHash: ended.hash,
          blockHash: numberToHex(block!, { size: 32 }),
          status: "success",
        };
        expect(told).toHaveLength(1);
        expect(told[0][2]).toMatchObject(verified);
        if (ended.receipt) expect(ended.receipt).toMatchObject(verified);
        expect(ended.sending()).toBeUndefined();
      } else {
        expect(told).toHaveLength(0);
        expect(ended.sending()).toMatchObject({ step: ended.step });
      }
    });
  });
});
