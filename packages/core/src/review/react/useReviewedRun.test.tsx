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
} from "../__fixtures__/reviewedSend.js";
import { HELD_EXPIRED_LINE, HELD_FAILED_LINE } from "../messages.js";
import { NETWORK_ERROR_LINE } from "../transaction-message.js";
import { REVIEWED_SEQUENCE_UNFINISHED_LINE } from "../sequence.js";
import {
  REVIEWED_RUN_SCOPE_LINE,
  useReviewedRun,
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
function harness(given: Omit<UseReviewedRunDeps, "engine"> | null) {
  const deps = given && { ...given, engine: () => import("../send.js") };
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

describe("useReviewedRun", () => {
  test("maps errors through transactionMessage", async () => {
    reviewUi();
    const { wallet, deps } = setup();
    wallet.adapter.sendTransaction.mockRejectedValueOnce(
      new Error("Relayr HTTP 502: upstream"),
    );
    const { seen, run } = harness({ ...deps, account: ACCOUNT });
    await expect(run({ calls: [payCall()] })).resolves.toMatchObject({
      status: "failed",
    });
    expect(seen.current!.error).toBe(
      "Transaction request failed (HTTP 502): upstream",
    );
    expect(seen.current!.phase).toBe("idle");

    // A closed review or a wallet's refusal is no error.
    reviewUi(async () => null);
    await expect(run({ calls: [payCall(6n)] })).resolves.toBeNull();
    expect(seen.current!.error).toBeNull();
    expect(seen.current!.failure).toBeNull();

    act(() => seen.current!.reset());
    expect(seen.current!.phase).toBe("idle");
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

  test("ends a followed Safe proposal's run when its hold settles it", async () => {
    reviewUi();
    const { wallet, deps } = setup();
    wallet.state.safe = true;
    const { seen, run } = harness({ ...deps, account: ACCOUNT });
    await run({ calls: [approveCall(), payCall()], scope: "pay:1" });
    expect(seen.current).toMatchObject({ phase: "proposed", step: 0 });
    const receipt = {
      status: "success",
      transactionHash: `0x${"e".repeat(64)}`,
    };
    act(() =>
      (views.last!.onSettled! as (s: unknown, r: unknown) => void)(
        { result: "success", hash: receipt.transactionHash },
        receipt,
      ),
    );
    expect(seen.current).toMatchObject({
      phase: "done",
      step: 0,
      total: 2,
      hash: receipt.transactionHash,
      receipt,
      error: null,
    });

    /** A fresh Safe's proposal, followed. */
    const proposed = async () => {
      act(() => root?.unmount());
      const fresh = setup();
      fresh.wallet.state.safe = true;
      const next = harness({ ...fresh.deps, account: ACCOUNT });
      await next.run({ calls: [payCall()] });
      expect(next.seen.current!.phase).toBe("proposed");
      return next.seen;
    };
    for (const [settled, line] of [
      [{ result: "failed", hash: receipt.transactionHash }, HELD_FAILED_LINE],
      [{ result: "expired" }, HELD_EXPIRED_LINE],
    ] as const) {
      const next = await proposed();
      act(() =>
        (views.last!.onSettled! as (s: unknown, r: unknown) => void)(
          settled,
          null,
        ),
      );
      expect(next.current).toMatchObject({ phase: "idle", error: line });
    }

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
});
