// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import {
  ACCOUNT,
  approveCall,
  payCall,
  resetReviewUi,
  reviewUi,
  setup,
} from "../__fixtures__/reviewedSend.js";
import type { ReviewedResult } from "../send.js";
import { REVIEWED_SEQUENCE_UNFINISHED_LINE } from "../sequence.js";
import {
  REVIEWED_RUN_SCOPE_LINE,
  useReviewedRun,
  type UseReviewedRunDeps,
  type UseReviewedRunResult,
} from "./useReviewedRun.js";

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
function harness(deps: UseReviewedRunDeps | null) {
  const seen: { current?: UseReviewedRunResult } = {};
  function Probe() {
    seen.current = useReviewedRun(deps);
    return null;
  }
  root = createRoot(document.createElement("div"));
  act(() => root!.render(<Probe />));
  const run = async (...args: Parameters<UseReviewedRunResult["run"]>) => {
    let result!: ReviewedResult | null;
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
    await expect(run({ calls: [payCall()] })).resolves.toBeNull();
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
    await expect(run({ calls: [payCall()] })).resolves.toBeNull();
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
    ).resolves.toBeNull();
    expect(seen.current!.error).toBe(REVIEWED_RUN_SCOPE_LINE);
    expect(prompts).toHaveLength(0);
    expect(wallet.adapter.sendTransaction).not.toHaveBeenCalled();

    const none = harness(null);
    await expect(none.run({ calls: [payCall()] })).resolves.toBeNull();
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
    let running!: Promise<ReviewedResult | null>;
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
    await expect(run(action)).resolves.toBeNull();
    // The same action again resumes it: its held step refuses before a review.
    await expect(run(action)).resolves.toBeNull();
    expect(prompts).toHaveLength(1);
    expect(seen.current!.held).toMatchObject({
      phase: "held",
      state: { status: "held-no-hash" },
    });
    expect(seen.current!.error).toBe(seen.current!.held!.line);

    // Other calls under the same scope are refused, not resumed in their name.
    await expect(
      run({ ...action, calls: [approveCall(), payCall(9n)] }),
    ).resolves.toBeNull();
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
    ).resolves.toBeNull();
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
