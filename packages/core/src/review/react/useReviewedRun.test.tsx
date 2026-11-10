// @vitest-environment jsdom
import { IDBFactory } from "fake-indexeddb";
import { setImmediate } from "node:timers";
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
  nativeLocks,
} from "../__fixtures__/reviewedSend.js";
import {
  HELD_AWAY_SUCCESS_LINE,
  HELD_EXPIRED_LINE,
  HELD_FAILED_LINE,
  REVIEWED_ENGINE_LOAD_LINE,
} from "../messages.js";
import { NETWORK_ERROR_LINE, ReviewLineError } from "../transaction-message.js";
import { createWriteHold, openStepHold, safeBatchCall } from "../writeHold.js";
import { browserLocks, createHeldWriteStorage } from "../writeRecovery.js";
import { lapsingLocksForTests } from "../../testing.js";
import { ConfirmationQueuedError, type LockHandle } from "../locks.js";
import { selfReviewingAdapter, viemWalletAdapter } from "../wallet.js";
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

/** Web Locks that are always free, as the fixture's. */
const FREE_LOCKS = {
  request: (async (
    name: string,
    _options: unknown,
    work: (lock: Lock) => unknown,
  ) => work({ name, mode: "exclusive" })) as LockManager["request"],
};

/** A site callback that fails. */
/** How a site's callbacks fail: none, by throwing, or by rejecting asynchronously. */
type Failing = false | "throws" | "rejects";
const CALLBACK_FAILURE = new Error("the site's callback failed");
const failing = (mode: Failing) =>
  mode === "throws"
    ? () => {
        throw CALLBACK_FAILURE;
      }
    : mode === "rejects"
      ? async () => {
          throw CALLBACK_FAILURE;
        }
      : undefined;
/** An `onConfirmed` spy, failing as `mode` says. */
const confirmer = (mode: Failing) =>
  vi.fn((..._told: unknown[]) => failing(mode)?.());
/** An action's own site callbacks, every one failing as `mode` says. */
const siteCallbacks = (mode: Failing) =>
  mode
    ? { onSubmitted: failing(mode), follow: { onConfirming: failing(mode) } }
    : {};

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
    const onCancelled = vi.fn();
    await expect(
      run({ calls: [payCall(7n)], onCancelled }),
    ).resolves.toMatchObject({
      status: "failed",
      error: NETWORK_ERROR_LINE,
    });
    expect(seen.current!.phase).toBe("idle");
    // Its step may have been sent: held, with no cancel told.
    expect(seen.current).toMatchObject({ status: "held", busy: false });
    await rendered(() => expect(onCancelled).not.toHaveBeenCalled());

    // A closed review or a wallet's refusal is no error.
    reviewUi(async () => null);
    await expect(
      run({ calls: [payCall(6n)], onCancelled }),
    ).resolves.toBeNull();
    expect(seen.current!.error).toBeNull();
    expect(seen.current!.failure).toBeNull();
    expect(seen.current).toMatchObject({ status: "cancelled", busy: false });
    await rendered(() => expect(onCancelled).toHaveBeenCalledOnce());

    act(() => seen.current!.reset());
    expect(seen.current!.phase).toBe("idle");
    expect(seen.current!.status).toBe("idle");
    expect(seen.current!.lastSubmittedStep).toBeNull();
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

  test("a run whose engine failed to load or whose send threw is free to run again", async () => {
    reviewUi();
    const { wallet, deps } = setup();
    let loads = 0;
    const { seen, run } = harness({
      ...deps,
      account: ACCOUNT,
      engine: () =>
        loads++ ? import("../send.js") : Promise.reject(new Error("offline")),
    });
    await expect(run({ calls: [payCall()] })).resolves.toMatchObject({
      status: "failed",
    });
    expect(seen.current).toMatchObject({ status: "failed", busy: false });
    const send = wallet.adapter.sendTransaction.getMockImplementation()!;
    wallet.adapter.sendTransaction.mockImplementationOnce(async () => {
      throw new Error("wallet crashed");
    });
    await expect(run({ calls: [payCall()] })).resolves.toMatchObject({
      status: "failed",
    });
    // The hold keeps the payment the wallet may have sent: shown, not busy.
    expect(seen.current).toMatchObject({ status: "held", busy: false });
    wallet.adapter.sendTransaction.mockImplementation(send);
    // Another payment: the hold may keep the one whose wallet threw.
    await expect(run({ calls: [payCall(7n)] })).resolves.toMatchObject({
      status: "done",
    });
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
      status: "signing",
      busy: true,
      lastSubmittedStep: 0,
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
      status: "done",
      busy: false,
      lastSubmittedStep: 1,
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
    // A send with no hash is not counted as submitted.
    expect(seen.current!.lastSubmittedStep).toBeNull();
    // Held wins over the failure that left it: the hold's line and exit show.
    expect(seen.current!.status).toBe("held");

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
    // The last step, sent while away, counts as submitted.
    expect(seen.current!.lastSubmittedStep).toBe(1);
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
    expect(seen.current).toMatchObject({ status: "review", busy: true });
    await act(async () => {
      controller.abort();
      await expect(running).resolves.toBeNull();
    });
    expect(seen.current).toMatchObject({
      phase: "idle",
      error: null,
      status: "cancelled",
    });
    expect(wallet.adapter.sendTransaction).not.toHaveBeenCalled();
    reviewUi();
    await expect(run({ calls: [payCall()] })).resolves.toMatchObject({
      status: "done",
    });
  });

  test("a wallet refusal after an earlier step was sent stops the run: no cancel, told once it renders, with the step sent", async () => {
    reviewUi();
    const { wallet, deps } = setup();
    const send = wallet.adapter.sendTransaction.getMockImplementation()!;
    wallet.adapter.sendTransaction.mockImplementation(async (tx) => {
      if (wallet.adapter.sendTransaction.mock.calls.length === 2)
        throw Object.assign(new Error("User rejected"), { code: 4001 });
      return send(tx);
    });
    const { seen, run } = harness({ ...deps, account: ACCOUNT });
    const onCancelled = vi.fn();
    const shown: string[] = [];
    const onStopped = vi.fn((_step: number) => {
      shown.push(seen.current!.status);
    });
    await expect(
      run({
        calls: [approveCall(), payCall()],
        scope: "pay:project-1",
        onCancelled,
        onStopped,
      }),
    ).resolves.toBeNull();
    await rendered(() => expect(onStopped).toHaveBeenCalledOnce());
    expect(onStopped).toHaveBeenCalledWith(0);
    expect(shown).toEqual(["stopped"]);
    expect(seen.current).toMatchObject({
      status: "stopped",
      busy: false,
      error: null,
      lastSubmittedStep: 0,
    });
    expect(onCancelled).not.toHaveBeenCalled();
  });

  test("a wallet that reviews on its own page ends done, not busy", async () => {
    const prompts = reviewUi();
    const { deps } = setup();
    const submit = vi.fn(async () => `0x${"ab".repeat(32)}` as ViemHex);
    const { seen, run } = harness({
      ...deps,
      account: ACCOUNT,
      adapter: selfReviewingAdapter({ account: () => ACCOUNT, submit }),
    });
    await expect(run({ calls: [payCall()] })).resolves.toMatchObject({
      status: "done",
    });
    expect(prompts).toHaveLength(0);
    expect(seen.current).toMatchObject({
      phase: "done",
      status: "done",
      busy: false,
    });
  });

  test("closing a resumed sequence's review after its approval is no cancel", async () => {
    reviewUi();
    const { wallet, deps } = setup();
    const send = wallet.adapter.sendTransaction.getMockImplementation()!;
    wallet.adapter.sendTransaction.mockImplementation(async (tx) => {
      if (wallet.adapter.sendTransaction.mock.calls.length === 2)
        throw Object.assign(new Error("User rejected"), { code: 4001 });
      return send(tx);
    });
    const { seen, run } = harness({ ...deps, account: ACCOUNT });
    const action = { calls: [approveCall(), payCall()], scope: "pay:p1" };
    await run(action);
    reviewUi(async () => null);
    const onCancelled = vi.fn();
    const onStopped = vi.fn();
    await expect(
      run({ ...action, onCancelled, onStopped }),
    ).resolves.toBeNull();
    // Refused at its first remaining step: the approval stands, the rest was not sent.
    await rendered(() => expect(onStopped).toHaveBeenCalledWith(0));
    expect(seen.current!.status).toBe("stopped");
    expect(onCancelled).not.toHaveBeenCalled();
  });

  test("tells a cancel once the cancelled run has rendered", async () => {
    reviewUi(async () => null);
    const { deps } = setup();
    const { seen, run } = harness({ ...deps, account: ACCOUNT });
    const shown: string[] = [];
    const onCancelled = vi.fn(() => {
      shown.push(seen.current!.status);
    });
    await expect(run({ calls: [payCall()], onCancelled })).resolves.toBeNull();
    await rendered(() => expect(onCancelled).toHaveBeenCalledOnce());
    expect(shown).toEqual(["cancelled"]);
  });

  test("a cancel callback that fails is contained", async () => {
    reviewUi(async () => null);
    const { deps } = setup();
    const { seen, run } = harness({ ...deps, account: ACCOUNT });
    const onCancelled = vi.fn(async () => {
      throw new Error("the site's cancel failed");
    });
    await expect(run({ calls: [payCall()], onCancelled })).resolves.toBeNull();
    await rendered(() => expect(onCancelled).toHaveBeenCalledOnce());
    expect(seen.current!.status).toBe("cancelled");
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

  test("a cancel whose held step can't be read yet is no cancel: the step shows once the wallet answers", async () => {
    reviewUi();
    const { chain, deps } = setup();
    chain.client.getTransactionReceipt.mockImplementation(async () => {
      throw new Error("lagging node");
    });
    const first = harness({ ...deps, account: ACCOUNT });
    await expect(
      first.run({ follow: { timeoutMs: 0 }, calls: [payCall()] }),
    ).resolves.toMatchObject({ status: "receipt" });
    act(() => root!.unmount());
    // Reopened: the wallet reconnects, the engine still loads.
    let ready = false;
    const adapter = {
      ...deps.adapter,
      ready: () =>
        ready ? Promise.resolve() : Promise.reject(new Error("reconnecting")),
    };
    const { seen } = harness({
      ...deps,
      adapter,
      account: ACCOUNT,
      engine: () => new Promise(() => {}),
    });
    const onCancelled = vi.fn();
    const controller = new AbortController();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      let running!: ReturnType<UseReviewedRunResult["run"]>;
      act(() => {
        running = seen.current!.run({
          calls: [payCall()],
          signal: controller.signal,
          onCancelled,
        });
      });
      await act(async () => {
        controller.abort();
        await expect(running).resolves.toBeNull();
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(onCancelled).not.toHaveBeenCalled();
      expect(seen.current!.status).not.toBe("cancelled");
      ready = true;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(60_000);
      });
    } finally {
      vi.useRealTimers();
    }
    await rendered(() =>
      expect(seen.current!.held).toMatchObject({ phase: "confirming" }),
    );
    expect(onCancelled).not.toHaveBeenCalled();
    expect(seen.current!.status).not.toBe("cancelled");
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
    await rendered(() =>
      expect(seen.current).toMatchObject({ status: "failed", busy: false }),
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
  /**
   * The Safe runs `proposal` (`call`'s): its execution mined with the
   * event naming it, its receipt read only `readable` times, and the hold
   * told. `readable(n)` changes how many reads succeed.
   */
  async function executeProposal(
    { chain, deps }: ReturnType<typeof setup>,
    proposal: ViemHex,
    call: Parameters<typeof openStepHold>[3],
    options: { event?: string; readable?: number } = {},
  ) {
    const event = options.event ?? "ExecutionSuccess";
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
    let readable = options.readable ?? Infinity;
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
    return {
      EXECUTION,
      readable: (reads$: number) => void (readable = reads$),
    };
  }

  async function proposedThenExecuted(
    readable = Infinity,
    {
      calls = [payCall()],
      event = "ExecutionSuccess",
      journal = true,
      throwing = false as Failing,
      batch = false,
      onConfirmed: given,
      onDismissedSettled,
      beforeExecuted,
    }: {
      calls?: ReturnType<typeof payCall>[];
      event?: string;
      /** False: a lone call run with no scope, so no journal. */
      journal?: boolean;
      /** How every site callback fails. */
      throwing?: Failing;
      /** A Safe app's batch: one MultiSend proposal of every call. */
      batch?: boolean;
      /** The site's onConfirmed, in place of the spy. */
      onConfirmed?: ReturnType<typeof confirmer>;
      onDismissedSettled?: UseReviewedRunDeps["onDismissedSettled"];
      /** Runs once the proposal is made, before the Safe runs it. */
      beforeExecuted?: (hook: ReturnType<typeof harness>) => Promise<void>;
    } = {},
  ) {
    reviewUi();
    const context = setup();
    const { wallet, deps } = context;
    wallet.state.safe = true;
    const onConfirmed = given ?? confirmer(throwing);
    const scope = "pay:safe";
    const call = batch ? safeBatchCall(ACCOUNT, calls) : calls[0];
    const sendCalls = vi.fn(async () => `0x${"ab".repeat(32)}`);
    const hook = harness({
      ...deps,
      // A Safe app takes a batch as one proposal (wallet_sendCalls).
      ...(batch
        ? {
            adapter: {
              ...wallet.adapter,
              sendCalls,
            },
          }
        : {}),
      account: ACCOUNT,
      ...(throwing ? { onProgress: failing(throwing) } : {}),
      ...(onDismissedSettled ? { onDismissedSettled } : {}),
    });
    const result = await hook.run({
      calls,
      ...(journal ? { scope } : {}),
      ...(batch ? { batch } : {}),
      onConfirmed,
      ...siteCallbacks(throwing),
    });
    expect(result).toMatchObject({ status: "proposed" });
    const proposal = (result as { safeTxHash: ViemHex }).safeTxHash;
    await beforeExecuted?.(hook);
    const { EXECUTION, readable: reading } = await executeProposal(
      context,
      proposal,
      call,
      { event, readable },
    );
    /** The node reads EXECUTION's receipt again. */
    const recover = () => reading(Infinity);
    return {
      ...context,
      ...hook,
      onConfirmed,
      scope,
      EXECUTION,
      recover,
      sendCalls,
      call,
    };
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

  test("dismissing a Safe payment while its onConfirmed is pending acknowledges nothing: a retry of it is never sent twice", async () => {
    let release!: () => void;
    const paused = new Promise<void>((resolve) => (release = resolve));
    const onConfirmed = vi.fn((..._told: unknown[]) => paused as never);
    const { seen, wallet, run } = await proposedThenExecuted(Infinity, {
      journal: false,
      onConfirmed,
    });
    await vi.waitFor(() => expect(onConfirmed).toHaveBeenCalledOnce());
    let closed!: boolean;
    act(() => {
      closed = seen.current!.dismiss();
    });
    expect(closed).toBe(true);
    release();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(seen.current!.status).not.toBe("done");
    await run({ calls: [payCall()] });
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledOnce();
  });

  test("a dismissed run's completion retry acknowledges nothing: the same payment is refused, never sent twice", async () => {
    const { seen, run, wallet, onConfirmed, hold, recover } =
      await proposedThenExecuted(2, { journal: false });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });
    expect(onConfirmed).not.toHaveBeenCalled();
    const handle = openStepHold(hold, ACCOUNT, true, payCall());
    expect(handle.unacknowledgedSuccess()).toBeDefined();
    // Between completion's failed receipt read and its retry.
    let closed = false;
    act(() => {
      closed = seen.current!.dismiss();
    });
    expect(closed).toBe(true);
    expect(seen.current!.status).toBe("idle");
    recover();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 4_500));
    });
    expect(seen.current!.status).toBe("idle");
    expect(handle.unacknowledgedSuccess()).toBeDefined();
    await run({ calls: [payCall()] });
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledOnce();
  }, 15_000);

  test("a Safe proposal dismissed while followed is still observed: its execution reaches onDismissedSettled, and the runner is usable", async () => {
    const onDismissedSettled = vi.fn();
    const { run, seen, wallet } = await proposedThenExecuted(Infinity, {
      journal: false,
      onDismissedSettled,
      beforeExecuted: async ({ seen }) => {
        await rendered(() => expect(seen.current!.following).toBe(true));
        act(() => void seen.current!.dismiss());
        expect(seen.current).toMatchObject({ status: "idle", busy: false });
      },
    });
    await vi.waitFor(() => expect(onDismissedSettled).toHaveBeenCalledOnce(), {
      timeout: 12_000,
    });
    expect(onDismissedSettled).toHaveBeenCalledWith(
      expect.objectContaining({ data: payCall().data }),
    );
    expect(seen.current!.busy).toBe(false);
    // The same payment again: the executed proposal closes it, nothing proposed.
    await expect(run({ calls: [payCall()] })).resolves.toMatchObject({
      status: "done",
    });
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledOnce();
    await expect(run({ calls: [payCall(3n)] })).resolves.toMatchObject({
      status: "proposed",
    });
  }, 20_000);

  test("a dismissed Safe batch that executed, acknowledged by another reader, closes a retry of the action: never proposed again", async () => {
    const calls = [approveCall(), payCall()];
    const { run, sendCalls, hold, call, scope, EXECUTION } =
      await proposedThenExecuted(Infinity, {
        calls,
        batch: true,
        beforeExecuted: async ({ seen }) => {
          await rendered(() => expect(seen.current!.following).toBe(true));
          act(() => void seen.current!.dismiss());
        },
      });
    const handle = openStepHold(hold, ACCOUNT, true, call);
    await vi.waitFor(() =>
      expect(handle.unacknowledgedSuccess()).toBeDefined(),
    );
    await act(async () => {
      await handle.acknowledge(handle.unacknowledgedSuccess()!);
    });
    await expect(run({ calls, scope, batch: true })).resolves.toMatchObject({
      status: "done",
      hashes: [EXECUTION],
    });
    expect(sendCalls).toHaveBeenCalledOnce();
  }, 20_000);

  test("a Safe proposal followed while its execution's receipt can't be read is following, not busy", async () => {
    const { seen } = await proposedThenExecuted(0);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });
    expect(seen.current).toMatchObject({
      status: "receipt",
      busy: false,
      following: true,
    });
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

  test("a settled Safe step counts as submitted on the next run, and closing its next review is no cancel", async () => {
    const approval = await proposedThenExecuted(Infinity, {
      calls: [approveCall(), payCall()],
    });
    await rendered(() =>
      expect(approval.seen.current!.settled).toEqual({
        step: 0,
        finished: false,
      }),
    );
    act(() => root?.unmount());
    const again = harness({ ...approval.deps, account: ACCOUNT });
    reviewUi(async () => null);
    const onCancelled = vi.fn();
    await again.run({
      calls: [approveCall(), payCall()],
      scope: approval.scope,
      onCancelled,
    });
    await rendered(() => expect(again.seen.current!.lastSubmittedStep).toBe(0));
    expect(onCancelled).not.toHaveBeenCalled();
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
    await rendered(() =>
      expect(seen.current).toMatchObject({ status: "proposed", busy: false }),
    );
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
    const { wallet, deps, hold } = setup();
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
    // Acknowledged once its done rendered, before another page runs it.
    await vi.waitFor(() =>
      expect(
        openStepHold(hold, ACCOUNT, false, call).unacknowledgedSuccess(),
      ).toBeUndefined(),
    );

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

  test("a retry while the form's own write is still confirming never replaces the run following it", async () => {
    const { chain, read, run, call, result, wallet } = await unverified();
    const ended = (result as ReviewedRunReceipt).ended();
    await expect(run({ ...HANDED_BACK, calls: [call] })).resolves.toMatchObject(
      { status: "failed" },
    );
    chain.client.getTransactionReceipt.mockImplementation(read);
    act(() => void globalThis.dispatchEvent(new Event("focus")));
    await expect(ended).resolves.toMatchObject({ status: "done" });
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledOnce();
  });

  test("a form refused by another form's write on the same hold shows the hold's line and never adopts it", async () => {
    reviewUi();
    const { chain, deps } = setup();
    const read = chain.client.getTransactionReceipt.getMockImplementation()!;
    chain.client.getTransactionReceipt.mockImplementation(async () => {
      throw new Error("lagging node");
    });
    const given = {
      engine: () => import("../send.js"),
      ...deps,
      account: ACCOUNT,
    };
    const transfer: { current?: UseReviewedRunResult } = {};
    const refund: { current?: UseReviewedRunResult } = {};
    function Forms() {
      transfer.current = useReviewedRun(given);
      refund.current = useReviewedRun(given);
      return null;
    }
    root = createRoot(document.createElement("div"));
    act(() => root!.render(<Forms />));
    const runOf =
      (form: typeof transfer) =>
      async (...args: Parameters<UseReviewedRunResult["run"]>) => {
        let ran!: Awaited<ReturnType<UseReviewedRunResult["run"]>>;
        await act(async () => {
          ran = await form.current!.run(...args);
        });
        return ran;
      };
    // Two forms whose writes share one hold (one intent).
    const sent = await runOf(transfer)({
      ...HANDED_BACK,
      calls: [{ ...payCall(), intent: "token:1" }],
    });
    expect(sent).toMatchObject({ status: "receipt" });
    const refused = await runOf(refund)({
      calls: [{ ...payCall(9n), intent: "token:1" }],
    });
    expect(refused).toMatchObject({ status: "failed" });
    const line = (refused as { error: string }).error;
    expect(line).not.toBe(NETWORK_ERROR_LINE);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(refund.current).toMatchObject({ held: null, error: line });
    chain.client.getTransactionReceipt.mockImplementation(read);
    act(() => void globalThis.dispatchEvent(new Event("focus")));
    await expect((sent as ReviewedRunReceipt).ended()).resolves.toMatchObject({
      status: "done",
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(refund.current!.phase).not.toBe("done");
    expect(refund.current!.held).toBeNull();
  });

  test.each([
    ["the same calls", false],
    ["calls refreshed under the same intent (a new deadline)", true],
  ])(
    "two forms queued on one hold: the refused one never follows or acknowledges the other's lost-reply write, and a retry with %s closes on the original's success whoever acknowledged it",
    async (_, refreshed) => {
      const answers: Array<() => void> = [];
      const prompts = reviewUi(
        (prompt) =>
          new Promise((resolve) =>
            answers.push(() => resolve(prompt.confirmation)),
          ),
      );
      const { chain, deps, wallet } = setup();
      const lost = `0x${"7a".repeat(32)}` as ViemHex;
      // The transfer form's wallet is slow to say it is ready again: nothing
      // in it follows the lost write before its retry starts.
      let slow = false;
      const waiting: Array<() => void> = [];
      Object.assign(wallet.adapter, {
        ready: () =>
          slow
            ? new Promise<void>((resolve) => waiting.push(resolve))
            : undefined,
      });
      const ready = () => {
        slow = false;
        waiting.splice(0).forEach((resolve) => resolve());
      };
      wallet.adapter.sendTransaction.mockImplementationOnce(async (tx) => {
        chain.mine(lost, tx);
        slow = true;
        throw new Error("The request took too long to respond.");
      });
      const given = {
        engine: () => import("../send.js"),
        ...deps,
        account: ACCOUNT,
      };
      const transfer: { current?: UseReviewedRunResult } = {};
      const refund: { current?: UseReviewedRunResult } = {};
      /** Whether the refused form ever followed or showed a write. */
      let adopted = false;
      function Forms() {
        transfer.current = useReviewedRun(given);
        refund.current = useReviewedRun(given);
        adopted ||= refund.current.following || !!refund.current.held;
        return null;
      }
      root = createRoot(document.createElement("div"));
      act(() => root!.render(<Forms />));
      const transferCall = { ...payCall(), intent: "token:1" };
      const action = { calls: [transferCall] };
      // 1. Both forms queue their reviews before either reserves.
      let first!: Promise<Awaited<ReturnType<UseReviewedRunResult["run"]>>>;
      let queued!: Promise<Awaited<ReturnType<UseReviewedRunResult["run"]>>>;
      act(() => {
        first = transfer.current!.run(action);
        queued = refund.current!.run({
          calls: [{ ...payCall(9n), intent: "token:1" }],
        });
      });
      await rendered(() => expect(prompts).toHaveLength(2));
      // 2. The transfer broadcasts; its reply is lost.
      await act(async () => {
        answers[0]();
        await expect(first).resolves.toMatchObject({ status: "failed" });
      });
      // 3. The queued review is refused by the hold.
      let refused!: Awaited<typeof queued>;
      await act(async () => {
        slow = false;
        answers[1]();
        refused = await queued;
      });
      expect(refused).toMatchObject({ status: "failed" });
      const handle = openStepHold(deps.hold, ACCOUNT, false, transferCall);
      const reservation = handle.peek().reservation!;
      expect(reservation).toBeTruthy();
      let retry!: Promise<Awaited<ReturnType<UseReviewedRunResult["run"]>>>;
      slow = true;
      act(() => {
        retry = transfer.current!.run(
          refreshed
            ? { calls: [{ ...payCall(6n), intent: "token:1" }] }
            : action,
        );
      });
      // 4. The hash is recovered; another reader acknowledges the success.
      await act(async () => {
        await handle.attachHash(deps.clientFor(), lost);
      });
      await vi.waitFor(() =>
        expect(handle.settlementOf(reservation)).toMatchObject({
          result: "success",
        }),
      );
      await act(async () => {
        await handle.acknowledge(
          handle.settlementOf(reservation) as {
            result: "success";
            hash: ViemHex;
          },
        );
      });
      // 5. The wallet is ready; the retry confirms its review: the
      // original's success closes it.
      act(() => ready());
      await rendered(() => expect(prompts).toHaveLength(3));
      await act(async () => {
        answers[2]();
        await expect(retry).resolves.toMatchObject({
          status: "done",
          hashes: [lost],
        });
      });
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });
      expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(1);
      expect(transfer.current).toMatchObject({ phase: "done", hash: lost });
      expect(refund.current!.phase).not.toBe("done");
      expect(adopted).toBe(false);
    },
  );

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

  test("a resumed run counts its sent step still confirming as submitted", async () => {
    reviewUi();
    const { chain, deps } = setup();
    const read = chain.client.getTransactionReceipt.getMockImplementation()!;
    const payment = `0x${"2".padStart(64, "0")}`;
    chain.client.getTransactionReceipt.mockImplementation(async (args) => {
      if (args.hash === payment) throw new Error("lagging node");
      return read(args);
    });
    const action = {
      ...HANDED_BACK,
      calls: [approveCall(), payCall()],
      scope: "pay:project-1",
    };
    const first = harness({ ...deps, account: ACCOUNT });
    await expect(first.run(action)).resolves.toMatchObject({
      status: "receipt",
      step: 1,
    });
    act(() => root!.unmount());
    const { seen, run } = harness({ ...deps, account: ACCOUNT });
    await run(action);
    await rendered(() =>
      expect(seen.current!.held).toMatchObject({ phase: "confirming" }),
    );
    expect(seen.current!.lastSubmittedStep).toBe(1);
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

  test("closing the review a late approval's receipt reopened stops the run, told once", async () => {
    let answers = 0;
    reviewUi(async (prompt) => (answers++ ? null : prompt.confirmation));
    const { chain, deps, wallet } = setup();
    const read = chain.client.getTransactionReceipt.getMockImplementation()!;
    const approval = `0x${"1".padStart(64, "0")}`;
    chain.client.getTransactionReceipt.mockImplementation(async (args) => {
      if (args.hash === approval) throw new Error("lagging node");
      return read(args);
    });
    const { seen, run } = harness({ ...deps, account: ACCOUNT });
    const onCancelled = vi.fn();
    const onStopped = vi.fn();
    const left = await run({
      ...HANDED_BACK,
      calls: [approveCall(), payCall()],
      scope: "pay:continued-closed",
      onCancelled,
      onStopped,
    });
    const ended = (left as ReviewedRunReceipt).ended();
    chain.client.getTransactionReceipt.mockImplementation(read);
    act(() => void globalThis.dispatchEvent(new Event("focus")));
    await expect(ended).resolves.toBeNull();
    await rendered(() => expect(onStopped).toHaveBeenCalledOnce());
    expect(onStopped).toHaveBeenCalledWith(0);
    expect(seen.current!.status).toBe("stopped");
    expect(onCancelled).not.toHaveBeenCalled();
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledOnce();
  });

  test("a run that only follows its held step is not busy, and says it follows", async () => {
    const { seen } = await unverified();
    await rendered(() =>
      expect(seen.current!.held).toMatchObject({ phase: "confirming" }),
    );
    expect(seen.current).toMatchObject({
      status: "receipt",
      busy: false,
      following: true,
    });
  });

  test("dismissing a held earlier step ends the run there: nothing more reviewed, the hold kept, the app told once it settles", async () => {
    const prompts = reviewUi();
    const { chain, deps, wallet, hold } = setup();
    const read = chain.client.getTransactionReceipt.getMockImplementation()!;
    const approval = `0x${"1".padStart(64, "0")}`;
    chain.client.getTransactionReceipt.mockImplementation(async (args) => {
      if (args.hash === approval) throw new Error("lagging node");
      return read(args);
    });
    const onDismissedSettled = vi.fn();
    const { seen, run } = harness({
      ...deps,
      account: ACCOUNT,
      onDismissedSettled,
    });
    const call = approveCall();
    const left = await run({
      ...HANDED_BACK,
      calls: [call, payCall()],
      scope: "pay:dismissed-approval",
    });
    let ended: unknown = "pending";
    void (left as ReviewedRunReceipt).ended().then((value) => (ended = value));
    let closed!: boolean;
    act(() => {
      closed = seen.current!.dismiss();
    });
    expect(closed).toBe(true);
    await rendered(() => expect(ended).toBeNull());
    expect(seen.current).toMatchObject({
      status: "idle",
      following: false,
      busy: false,
    });
    expect(openStepHold(hold, ACCOUNT, false, call).peek().status).not.toBe(
      "clear",
    );
    chain.client.getTransactionReceipt.mockImplementation(read);
    // The detached follower reads the hold again on its own clock.
    await vi.waitFor(() => expect(onDismissedSettled).toHaveBeenCalledOnce(), {
      timeout: 12_000,
    });
    expect(onDismissedSettled).toHaveBeenCalledWith(
      expect.objectContaining({ to: call.to, data: call.data }),
    );
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledOnce();
    expect(prompts).toHaveLength(1);
    expect(seen.current!.status).toBe("idle");
  }, 20_000);

  test("dismissing a held last step stops the wait and keeps following: its hold still shows, then done", async () => {
    const { seen, result, chain, read } = await unverified();
    let ended: unknown = "pending";
    void (result as ReviewedRunReceipt)
      .ended()
      .then((value) => (ended = value));
    let closed!: boolean;
    act(() => {
      closed = seen.current!.dismiss();
    });
    expect(closed).toBe(true);
    await rendered(() => expect(ended).toBeNull());
    await rendered(() =>
      expect(seen.current!.held).toMatchObject({ phase: "confirming" }),
    );
    expect(seen.current).toMatchObject({ status: "receipt", busy: false });
    chain.client.getTransactionReceipt.mockImplementation(read);
    act(() => void globalThis.dispatchEvent(new Event("focus")));
    await rendered(() => expect(seen.current!.status).toBe("done"));
    expect(seen.current!.following).toBe(false);
  });

  test.each([
    ["the wait stopped", 1, false],
    ["the view closed", 2, false],
    ["the wait stopped, retried while it confirms", 1, true],
    ["the view closed, retried while it confirms", 2, true],
  ])(
    "a last step dismissed while followed (%s) is never sent again: a retry while it confirms is refused, and the same calls close on its success once, unless a run showed it; then they send anew",
    async (_, dismissals, retried) => {
      reviewUi();
      const { chain, deps, wallet } = setup();
      const read = chain.client.getTransactionReceipt.getMockImplementation()!;
      chain.client.getTransactionReceipt.mockImplementation(async () => {
        throw new Error("lagging node");
      });
      const onDismissedSettled = vi.fn();
      const { seen, run } = harness({
        ...deps,
        account: ACCOUNT,
        onDismissedSettled,
      });
      const action = { ...HANDED_BACK, calls: [payCall()] };
      const first = await run(action);
      expect(first).toMatchObject({ status: "receipt" });
      const { hash } = first as ReviewedRunReceipt;
      for (let i = 0; i < dismissals; i += 1) {
        act(() => void seen.current!.dismiss());
        await rendered(() => expect(seen.current!.busy).toBe(false));
      }
      // Still confirming: refused with the hold's line, nothing sent; a
      // closed view follows it again.
      if (retried) {
        await expect(run(action)).resolves.toMatchObject({ status: "failed" });
        expect(wallet.adapter.sendTransaction).toHaveBeenCalledOnce();
        if (dismissals === 2)
          await rendered(() =>
            expect(seen.current!.held).toMatchObject({ phase: "confirming" }),
          );
      }
      chain.client.getTransactionReceipt.mockImplementation(read);
      act(() => void globalThis.dispatchEvent(new Event("focus")));
      await vi.waitFor(
        () =>
          expect(
            openStepHold(deps.hold, ACCOUNT, false, action.calls[0]).peek()
              .status,
          ).toBe("clear"),
        { timeout: 12_000 },
      );
      if (retried && dismissals === 2) {
        // The retry's follow showed it.
        await rendered(() =>
          expect(seen.current).toMatchObject({ phase: "done", hash }),
        );
      } else {
        // Reopened with the same calls: the closed one went through.
        await expect(run(action)).resolves.toMatchObject({
          status: "done",
          hashes: [hash],
        });
        expect(seen.current).toMatchObject({ phase: "done", hash });
      }
      expect(wallet.adapter.sendTransaction).toHaveBeenCalledOnce();
      // Nothing is left running: the form closes and discards as ever.
      await rendered(() => expect(seen.current!.busy).toBe(false));
      let closed!: boolean;
      act(() => {
        closed = seen.current!.dismiss();
      });
      expect(closed).toBe(true);
      await act(async () => {
        await seen.current!.discard("pay:none");
      });
      // Asked again, it is a new send of the user's own choosing.
      await expect(run(action)).resolves.toMatchObject({ status: "done" });
      expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(2);
    },
    20_000,
  );

  test("a new action on another hold still sends while a dismissed success is kept for its own", async () => {
    reviewUi();
    const { chain, deps, wallet } = setup();
    const read = chain.client.getTransactionReceipt.getMockImplementation()!;
    chain.client.getTransactionReceipt.mockImplementation(async () => {
      throw new Error("lagging node");
    });
    const { seen, run } = harness({ ...deps, account: ACCOUNT });
    const action = {
      ...HANDED_BACK,
      calls: [{ ...payCall(), intent: "pay:1" }],
    };
    const { hash } = (await run(action)) as ReviewedRunReceipt;
    act(() => void seen.current!.dismiss());
    await rendered(() => expect(seen.current!.busy).toBe(false));
    act(() => void seen.current!.dismiss());
    chain.client.getTransactionReceipt.mockImplementation(read);
    act(() => void globalThis.dispatchEvent(new Event("focus")));
    await vi.waitFor(
      () =>
        expect(
          openStepHold(deps.hold, ACCOUNT, false, action.calls[0]).peek()
            .status,
        ).toBe("clear"),
      { timeout: 12_000 },
    );
    await expect(
      run({ calls: [{ ...payCall(8n), intent: "pay:2" }] }),
    ).resolves.toMatchObject({ status: "done" });
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(2);
    // Its own hold, though the calls were refreshed: closed on its success.
    await expect(
      run({ calls: [{ ...payCall(6n), intent: "pay:1" }] }),
    ).resolves.toMatchObject({ status: "done", hashes: [hash] });
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(2);
  }, 20_000);

  test("an earlier approval's dismissed success never completes an action it is only the first step of", async () => {
    reviewUi();
    const { chain, deps, wallet } = setup();
    const read = chain.client.getTransactionReceipt.getMockImplementation()!;
    chain.client.getTransactionReceipt.mockImplementation(async () => {
      throw new Error("lagging node");
    });
    const { seen, run } = harness({ ...deps, account: ACCOUNT });
    const approval = approveCall();
    await run({ ...HANDED_BACK, calls: [approval] });
    act(() => void seen.current!.dismiss());
    await rendered(() => expect(seen.current!.busy).toBe(false));
    act(() => void seen.current!.dismiss());
    chain.client.getTransactionReceipt.mockImplementation(read);
    act(() => void globalThis.dispatchEvent(new Event("focus")));
    await vi.waitFor(
      () =>
        expect(
          openStepHold(deps.hold, ACCOUNT, false, approval).peek().status,
        ).toBe("clear"),
      { timeout: 12_000 },
    );
    const ran = await run({ calls: [approval, payCall()], scope: "pay:fresh" });
    expect(ran).not.toMatchObject({
      status: "done",
      hashes: [expect.anything()],
    });
    expect(
      wallet.adapter.sendTransaction.mock.calls.some(
        ([tx]) => tx.data === payCall().data,
      ),
    ).toBe(true);
  }, 20_000);

  test.each([
    ["the lease", () => ({ locks: lapsingLocksForTests().locks })],
    ["native Web Locks", () => ({ locks: nativeLocks() })],
  ])(
    "a followed receipt's onConfirmed refused for the site's ended lock (%s) is kept and applied under it taken back",
    async (_, backend) => {
      vi.stubGlobal("navigator", backend());
      try {
        reviewUi();
        const { chain, deps } = setup();
        const read =
          chain.client.getTransactionReceipt.getMockImplementation()!;
        chain.client.getTransactionReceipt.mockImplementation(async () => {
          throw new Error("lagging node");
        });
        const { run } = harness({ ...deps, account: ACCOUNT });
        const confirmed: string[] = [];
        const result = await browserLocks().request("pay", (lock) =>
          run({
            ...HANDED_BACK,
            calls: [payCall()],
            locks: [lock!],
            onConfirmed: async () => {
              await lock!.assertHeld();
              confirmed.push("confirmed");
            },
          }),
        );
        expect(result).toMatchObject({ status: "receipt" });
        chain.client.getTransactionReceipt.mockImplementation(read);
        act(() => void globalThis.dispatchEvent(new Event("focus")));
        await vi.waitFor(() => expect(confirmed).toEqual(["confirmed"]), {
          timeout: 12_000,
        });
      } finally {
        vi.unstubAllGlobals();
      }
    },
    20_000,
  );

  test.each([false, true])(
    "a followed receipt's onConfirmed dropped (its lock taken since) is pending, not done: unacknowledged, and told once under the next run's fresh lock (dismissed first: %s)",
    async (dismissing) => {
      vi.stubGlobal("navigator", { locks: nativeLocks() });
      try {
        reviewUi();
        const { chain, deps, wallet } = setup();
        const read =
          chain.client.getTransactionReceipt.getMockImplementation()!;
        chain.client.getTransactionReceipt.mockImplementation(async () => {
          throw new Error("lagging node");
        });
        const { seen, run } = harness({ ...deps, account: ACCOUNT });
        const confirmed: string[] = [];
        const checked =
          (lock: { assertHeld(): Promise<void> }, name: string) => async () => {
            await lock.assertHeld();
            confirmed.push(name);
          };
        const result = await browserLocks().request("pay", (lock) =>
          run({
            ...HANDED_BACK,
            calls: [payCall()],
            locks: [lock!],
            onConfirmed: checked(lock!, "first"),
          }),
        );
        expect(result).toMatchObject({ status: "receipt" });
        // A routine refresh takes the site's lock meanwhile.
        await browserLocks().request("pay", async () => undefined);
        chain.client.getTransactionReceipt.mockImplementation(read);
        const handle = openStepHold(deps.hold, ACCOUNT, false, payCall());
        act(() => void globalThis.dispatchEvent(new Event("focus")));
        await vi.waitFor(
          () => expect(handle.unacknowledgedSuccess()).toBeDefined(),
          { timeout: 12_000 },
        );
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 500));
        });
        expect(confirmed).toEqual([]);
        expect(seen.current!.status).not.toBe("done");
        expect(handle.unacknowledgedSuccess()).toBeDefined();
        if (dismissing) {
          // The waiting view dismissed, then closed: still told on a retry.
          act(() => void seen.current!.dismiss());
          act(() => void seen.current!.dismiss());
        }
        // The site's next run, under a fresh lock, is shown the success and
        // the followed step is told under that run's lock, once.
        await browserLocks().request("pay", (lock) =>
          run({
            ...HANDED_BACK,
            calls: [payCall()],
            locks: [lock!],
            onConfirmed: checked(lock!, "fresh"),
          }),
        );
        await vi.waitFor(() => expect(confirmed).toEqual(["fresh"]), {
          timeout: 12_000,
        });
        await rendered(() => expect(seen.current!.status).toBe("done"));
        expect(wallet.adapter.sendTransaction).toHaveBeenCalledOnce();
        await rendered(() =>
          expect(handle.unacknowledgedSuccess()).toBeUndefined(),
        );
      } finally {
        vi.unstubAllGlobals();
      }
    },
    30_000,
  );

  test("a payment whose receipt verifies at once while its lapsed lease was taken meanwhile is not done until onConfirmed is delivered", async () => {
    const lapsing = lapsingLocksForTests();
    vi.stubGlobal("navigator", { locks: lapsing.locks });
    try {
      reviewUi();
      const { deps, wallet } = setup();
      const send = wallet.adapter.sendTransaction.getMockImplementation()!;
      wallet.adapter.sendTransaction.mockImplementationOnce(async (...args) => {
        // In the wallet, the lease lapses and another tab refreshes.
        lapsing.lapse();
        await lapsing.otherTab().request("pay", async () => undefined);
        return send(...args);
      });
      const { seen, run } = harness({ ...deps, account: ACCOUNT });
      const confirmed: string[] = [];
      const checked =
        (lock: { assertHeld(): Promise<void> }, name: string) => async () => {
          await lock.assertHeld();
          confirmed.push(name);
        };
      const result = await browserLocks().request("pay", (lock) =>
        run({
          ...HANDED_BACK,
          calls: [payCall()],
          locks: [lock!],
          onConfirmed: checked(lock!, "first"),
        }),
      );
      expect(result).not.toMatchObject({ status: "done" });
      const handle = openStepHold(deps.hold, ACCOUNT, false, payCall());
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 500));
      });
      expect(confirmed).toEqual([]);
      expect(seen.current!.status).not.toBe("done");
      expect(handle.unacknowledgedSuccess()).toBeDefined();
      await browserLocks().request("pay", (lock) =>
        run({
          ...HANDED_BACK,
          calls: [payCall()],
          locks: [lock!],
          onConfirmed: checked(lock!, "fresh"),
        }),
      );
      await vi.waitFor(() => expect(confirmed).toEqual(["fresh"]), {
        timeout: 12_000,
      });
      await rendered(() => expect(seen.current!.status).toBe("done"));
      expect(wallet.adapter.sendTransaction).toHaveBeenCalledOnce();
      await rendered(() =>
        expect(handle.unacknowledgedSuccess()).toBeUndefined(),
      );
    } finally {
      vi.unstubAllGlobals();
    }
  }, 30_000);

  test("a site awaiting ended() inside its lapsed lock's scope gets an end: lost, then onConfirmed told once the scope ends, done, one send", async () => {
    const lapsing = lapsingLocksForTests();
    vi.stubGlobal("navigator", { locks: lapsing.locks });
    try {
      reviewUi();
      const { deps, wallet } = setup();
      const send = wallet.adapter.sendTransaction.getMockImplementation()!;
      wallet.adapter.sendTransaction.mockImplementationOnce(async (...args) => {
        // The lease lapses while the wallet is open.
        lapsing.lapse();
        return send(...args);
      });
      const { seen, run } = harness({ ...deps, account: ACCOUNT });
      const confirmed: number[] = [];
      const ended = await browserLocks().request("pay", async (lock) => {
        const result = await run({
          ...HANDED_BACK,
          calls: [payCall()],
          locks: [lock!],
          onConfirmed: async (_call, step) => {
            await lock!.assertHeld();
            confirmed.push(step);
          },
        });
        expect(result).toMatchObject({ status: "receipt" });
        // Awaited inside the scope, as a site may.
        return Promise.race([
          (result as ReviewedRunReceipt).ended(),
          new Promise((resolve) => setTimeout(() => resolve("stuck"), 6_000)),
        ]);
      });
      expect(ended).toMatchObject({
        status: "failed",
        failure: expect.any(ConfirmationQueuedError),
      });
      await vi.waitFor(() => expect(confirmed).toEqual([0]), {
        timeout: 12_000,
      });
      // Its follow, retried at the receipt's pace, shows it done.
      await vi.waitFor(
        async () => {
          await act(async () => {});
          expect(seen.current!.status).toBe("done");
        },
        { timeout: 12_000 },
      );
      const handle = openStepHold(deps.hold, ACCOUNT, false, payCall());
      await rendered(() =>
        expect(handle.unacknowledgedSuccess()).toBeUndefined(),
      );
      expect(wallet.adapter.sendTransaction).toHaveBeenCalledOnce();
    } finally {
      vi.unstubAllGlobals();
    }
  }, 30_000);

  test("a sequence whose payment completed in the background after its wait was dismissed closes a reopen as done with every step's hash", async () => {
    reviewUi();
    const { chain, deps, wallet } = setup();
    const read = chain.client.getTransactionReceipt.getMockImplementation()!;
    let lagging = false;
    chain.client.getTransactionReceipt.mockImplementation(async (args) => {
      if (lagging) throw new Error("lagging node");
      return read(args);
    });
    const onConfirmed = vi.fn((_call: unknown, step: number) => {
      // The node lags once the approval is confirmed.
      if (step === 0) lagging = true;
    });
    const action = {
      ...HANDED_BACK,
      calls: [approveCall(), payCall()],
      scope: "pay:sequence",
      onConfirmed,
    };
    const { seen, run } = harness({ ...deps, account: ACCOUNT });
    await expect(run(action)).resolves.toMatchObject({
      status: "receipt",
      step: 1,
    });
    // Only its wait dismissed: its completion goes on in the background.
    act(() => void seen.current!.dismiss());
    lagging = false;
    act(() => void globalThis.dispatchEvent(new Event("focus")));
    await vi.waitFor(() => expect(onConfirmed).toHaveBeenCalledTimes(2), {
      timeout: 12_000,
    });
    await rendered(() =>
      expect(
        findReviewedSequence("pay:sequence", ACCOUNT, {
          storage: deps.storage,
        }),
      ).toBeNull(),
    );
    const sent = await Promise.all(
      wallet.adapter.sendTransaction.mock.results.map(({ value }) => value),
    );
    expect(sent).toHaveLength(2);
    act(() => void seen.current!.dismiss());
    await expect(run(action)).resolves.toMatchObject({
      status: "done",
      hashes: sent,
    });
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(2);
  }, 20_000);

  test("two payments on one runner, each dismissed and completed in the background: reopening the first closes on its own success, never sends it again", async () => {
    reviewUi();
    const { chain, deps, wallet } = setup();
    const read = chain.client.getTransactionReceipt.getMockImplementation()!;
    let lagging = true;
    chain.client.getTransactionReceipt.mockImplementation(async (args) => {
      if (lagging) throw new Error("lagging node");
      return read(args);
    });
    const onConfirmed = vi.fn();
    const { seen, run } = harness({ ...deps, account: ACCOUNT });
    const send = async (call: ReturnType<typeof payCall>) => {
      lagging = true;
      const before = onConfirmed.mock.calls.length;
      const action = { ...HANDED_BACK, calls: [call], onConfirmed };
      const ran = await run(action);
      expect(ran).toMatchObject({ status: "receipt" });
      // Only its wait dismissed: completed and acknowledged in the background.
      act(() => void seen.current!.dismiss());
      lagging = false;
      act(() => void globalThis.dispatchEvent(new Event("focus")));
      await vi.waitFor(
        () => expect(onConfirmed).toHaveBeenCalledTimes(before + 1),
        { timeout: 12_000 },
      );
      await rendered(() =>
        expect(
          openStepHold(deps.hold, ACCOUNT, false, call).unacknowledgedSuccess(),
        ).toBeUndefined(),
      );
      return { action, hash: (ran as ReviewedRunReceipt).hash };
    };
    const a = await send({ ...payCall(), intent: "pay:1" });
    await send({ ...payCall(7n), intent: "pay:2" });
    await expect(run(a.action)).resolves.toMatchObject({
      status: "done",
      hashes: [a.hash],
    });
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(2);
  }, 30_000);

  /** A payment left at its receipt, its wait and view dismissed, then settled. */
  async function dismissedAtReceipt(
    action: Omit<Parameters<UseReviewedRunResult["run"]>[0], "calls"> & {
      calls: ReturnType<typeof payCall>[];
    },
    signature?: `0x${string}`,
  ) {
    reviewUi();
    const { chain, deps, wallet } = setup();
    if (signature)
      wallet.adapter.signMessage.mockImplementation(async () => signature);
    const read = chain.client.getTransactionReceipt.getMockImplementation()!;
    let lagging = true;
    chain.client.getTransactionReceipt.mockImplementation(async (args) => {
      if (lagging) throw new Error("lagging node");
      return read(args);
    });
    const { seen, run } = harness({ ...deps, account: ACCOUNT });
    const left = await run({ ...HANDED_BACK, ...action });
    expect(left).toMatchObject({ status: "receipt" });
    act(() => void seen.current!.dismiss());
    act(() => void seen.current!.dismiss());
    lagging = false;
    const hold = openStepHold(deps.hold, ACCOUNT, false, action.calls[0]);
    await vi.waitFor(
      async () => {
        await act(async () => {
          globalThis.dispatchEvent(new Event("focus"));
        });
        expect(hold.peek().status).toBe("clear");
        expect(hold.unacknowledgedSuccess()).toBeDefined();
      },
      { timeout: 12_000 },
    );
    return { run, wallet, left: left as ReviewedRunReceipt };
  }

  test("a retry under the same intent with refreshed calldata closes on the original send: onConfirmed gets the call that was sent, one send", async () => {
    const onConfirmed = vi.fn();
    const original = { ...payCall(5n), intent: "pay:1" };
    const { run, wallet, left } = await dismissedAtReceipt({
      calls: [original],
      onConfirmed,
    });
    await expect(
      run({
        ...HANDED_BACK,
        calls: [{ ...payCall(9n), intent: "pay:1" }],
        onConfirmed,
      }),
    ).resolves.toMatchObject({ status: "done", hashes: [left.hash] });
    expect(onConfirmed).toHaveBeenCalledOnce();
    expect(onConfirmed.mock.calls[0][0]).toMatchObject({
      data: original.data,
      value: original.value,
    });
    expect(onConfirmed.mock.calls[0][2]).toMatchObject({
      transactionHash: left.hash,
    });
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledOnce();
  }, 30_000);

  test("reopening a dismissed signed action closes done with the signatures it signed, signing and sending once", async () => {
    const signature = `0x${"5e".repeat(65)}` as const;
    const signed = {
      calls: [payCall()],
      signatures: [
        { kind: "message" as const, chainId: 10, message: "List it" },
      ],
    };
    const { wallet, run, left } = await dismissedAtReceipt(signed, signature);
    expect(left.signatures).toEqual([signature]);
    await expect(run({ ...HANDED_BACK, ...signed })).resolves.toMatchObject({
      status: "done",
      hashes: [left.hash],
      signatures: [signature],
    });
    expect(wallet.adapter.signMessage).toHaveBeenCalledOnce();
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledOnce();
  }, 30_000);

  test("a retry under a fresh lock whose old follow delivers behind it: its ended(), awaited in that scope, ends queued; told once after, one send each", async () => {
    vi.stubGlobal("navigator", { locks: nativeLocks() });
    try {
      reviewUi();
      const { chain, deps, wallet } = setup();
      const read = chain.client.getTransactionReceipt.getMockImplementation()!;
      let lagging = false;
      chain.client.getTransactionReceipt.mockImplementation(async (args) => {
        if (lagging) throw new Error("lagging node");
        return read(args);
      });
      const confirmed: number[] = [];
      const { seen, run } = harness({ ...deps, account: ACCOUNT });
      const action = (lock: LockHandle) => ({
        ...HANDED_BACK,
        calls: [approveCall(), payCall()],
        scope: "pay:sequence",
        locks: [lock],
        onConfirmed: async (_call: unknown, step: number) => {
          await lock.assertHeld();
          confirmed.push(step);
          // The node lags once the approval is confirmed.
          if (step === 0) lagging = true;
        },
      });
      await expect(
        browserLocks().request("pay", (lock) => run(action(lock!))),
      ).resolves.toMatchObject({ status: "receipt", step: 1 });
      const hold = openStepHold(deps.hold, ACCOUNT, false, payCall());
      const ended = await browserLocks().request("pay", async (lock) => {
        // The old follow recovers while this retry holds the lock: its
        // notice is claimed and queued behind this scope.
        lagging = false;
        act(() => void globalThis.dispatchEvent(new Event("focus")));
        await vi.waitFor(
          async () => {
            const success = hold.unacknowledgedSuccess();
            expect(success).toBeDefined();
            await expect(hold.confirmation(success!)).resolves.toBe("pending");
          },
          { timeout: 12_000 },
        );
        const retried = await run(action(lock!));
        expect(retried).toMatchObject({ status: "receipt" });
        return Promise.race([
          (retried as ReviewedRunReceipt).ended(),
          new Promise((resolve) => setTimeout(() => resolve("stuck"), 6_000)),
        ]);
      });
      expect(ended).toMatchObject({
        status: "failed",
        failure: expect.any(ConfirmationQueuedError),
      });
      await vi.waitFor(() => expect(confirmed).toEqual([0, 1]), {
        timeout: 12_000,
      });
      await vi.waitFor(
        async () => {
          await act(async () => {});
          expect(seen.current!.status).toBe("done");
          expect(hold.unacknowledgedSuccess()).toBeUndefined();
        },
        { timeout: 12_000 },
      );
      expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(2);
    } finally {
      vi.unstubAllGlobals();
    }
  }, 40_000);

  test("an approval whose onConfirmed was dropped is told before the payment is sent: a retry delivers it, then sends the payment once", async () => {
    const lapsing = lapsingLocksForTests();
    vi.stubGlobal("navigator", { locks: lapsing.locks });
    try {
      reviewUi();
      const { deps, wallet } = setup();
      const send = wallet.adapter.sendTransaction.getMockImplementation()!;
      wallet.adapter.sendTransaction.mockImplementationOnce(async (...args) => {
        // In approval's wallet, the lease lapses and another tab refreshes.
        lapsing.lapse();
        await lapsing.otherTab().request("pay", async () => undefined);
        return send(...args);
      });
      const { run } = harness({ ...deps, account: ACCOUNT });
      const confirmed: number[] = [];
      const runOnce = () =>
        browserLocks().request("pay", (lock) =>
          run({
            calls: [approveCall(), payCall()],
            scope: "pay:sequence",
            locks: [lock!],
            onConfirmed: async (_call, step) => {
              await lock!.assertHeld();
              confirmed.push(step);
            },
          }),
        );
      await expect(runOnce()).resolves.not.toMatchObject({ status: "done" });
      expect(confirmed).toEqual([]);
      await expect(runOnce()).resolves.toMatchObject({ status: "done" });
      expect(confirmed).toEqual([0, 1]);
      expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(2);
    } finally {
      vi.unstubAllGlobals();
    }
  }, 30_000);

  test("a resumed payment whose notice waits for its lease taken back ends done with each step's hash once", async () => {
    const lapsing = lapsingLocksForTests();
    vi.stubGlobal("navigator", { locks: lapsing.locks });
    try {
      reviewUi();
      const { chain, deps, wallet } = setup();
      const read = chain.client.getTransactionReceipt.getMockImplementation()!;
      let lagging = false;
      let lapseOnRead = false;
      chain.client.getTransactionReceipt.mockImplementation(async (args) => {
        if (lagging) throw new Error("lagging node");
        if (lapseOnRead) {
          // The resumed receipt read outlasts the site's lease.
          lapseOnRead = false;
          lapsing.lapse();
        }
        return read(args);
      });
      const action = (lock: LockHandle) => ({
        ...HANDED_BACK,
        calls: [approveCall(), payCall()],
        scope: "pay:sequence",
        locks: [lock],
        onConfirmed: async (_call: unknown, step: number) => {
          await lock.assertHeld();
          // The node lags once the approval is confirmed.
          if (step === 0) lagging = true;
        },
      });
      const first = harness({ ...deps, account: ACCOUNT });
      await expect(
        browserLocks().request("pay", (lock) => first.run(action(lock!))),
      ).resolves.toMatchObject({ status: "receipt", step: 1 });
      // Reloaded: the page resumes once the node reads again.
      act(() => root!.unmount());
      lagging = false;
      lapseOnRead = true;
      const { run } = harness({ ...deps, account: ACCOUNT });
      const resumed = await browserLocks().request("pay", (lock) =>
        run(action(lock!)),
      );
      expect(resumed).toMatchObject({ status: "receipt", step: 1 });
      const sent = await Promise.all(
        wallet.adapter.sendTransaction.mock.results.map(({ value }) => value),
      );
      await expect(
        (resumed as ReviewedRunReceipt).ended(),
      ).resolves.toMatchObject({ status: "done", hashes: sent });
      expect(sent).toHaveLength(2);
    } finally {
      vi.unstubAllGlobals();
    }
  }, 30_000);

  /** Seeded (mulberry32): the same interleavings every run. */
  const PROPERTY_CASES = (() => {
    let seed = 0x5eed;
    const random = () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const pick = <T,>(options: readonly T[]) =>
      options[Math.floor(random() * options.length)];
    const random$ = Array.from({ length: 24 }, (_, index) => ({
      index,
      backend: pick(["lease", "native"] as const),
      /** One payment; a Safe batch's two submissions; or a two-step sequence. */
      shape: pick(["payment", "safe", "sequence"] as const),
      lapse: random() < 0.6,
      /** The step whose wallet the lease lapses in (a sequence's). */
      lapseAt: pick([0, 1] as const),
      refresh: pick(["none", "wallet", "after"] as const),
      unreadable: random() < 0.6,
      recoverInReplay: random() < 0.5,
      submitMs: Math.floor(random() * 40),
      confirmMs: Math.floor(random() * 40),
      dismiss: random() < 0.4,
      /** Dismissed unfinished: reopened, its receipt reread slowly. */
      reopen: random() < 0.6,
      reopenMs: Math.floor(random() * 40),
      /** Dismissed again during that reread, then reopened again. */
      dismissInClose: random() < 0.6,
      /** Its delivered success acknowledged by another reader first. */
      acknowledgedElsewhere: random() < 0.5,
      /** Only its wait dismissed: its completion goes on in the background. */
      dismissOnce: random() < 0.5,
      /** A receipt's `ended()` awaited inside the site's lock scope. */
      endedInScope: random() < 0.5,
      /** Unreadable only once the first step confirmed (a sequence's last). */
      lagLast: random() < 0.5,
      /** Another intent's payment run on the same runner meanwhile. */
      otherIntent: random() < 0.4,
      /** Retried under a fresh lock while the old follow recovers. */
      retryWhileRecovering: random() < 0.4,
      /** Two completions of its held step at once, besides the hook's. */
      concurrentComplete: random() < 0.4,
      /** A payment under an intent, retried and reopened with refreshed calldata. */
      refreshed: random() < 0.4,
      /** The action signs a message before it sends. */
      signed: random() < 0.4,
    }));
    // A sequence lapsing at each step, on each backend, refreshed or not.
    const sequences = (["lease", "native"] as const).flatMap((backend) =>
      ([0, 1] as const).flatMap((lapseAt) =>
        (["wallet", "none"] as const).map((refresh) => ({
          ...random$[0],
          backend,
          shape: "sequence" as const,
          lapse: true,
          lapseAt,
          refresh,
          unreadable: random() < 0.5,
          recoverInReplay: random() < 0.5,
          submitMs: Math.floor(random() * 40),
          confirmMs: Math.floor(random() * 40),
          dismiss: random() < 0.4,
          reopen: random() < 0.6,
          reopenMs: Math.floor(random() * 40),
          dismissInClose: random() < 0.6,
          acknowledgedElsewhere: random() < 0.5,
          dismissOnce: random() < 0.5,
          endedInScope: random() < 0.5,
          lagLast: random() < 0.5,
          otherIntent: random() < 0.4,
          retryWhileRecovering: random() < 0.4,
          concurrentComplete: random() < 0.4,
          refreshed: false,
          signed: random() < 0.4,
        })),
      ),
    );
    // Dismissed unread, recovered and acknowledged elsewhere, then reopened
    // and dismissed during the reopened run's reread: each backend, a
    // payment and a sequence.
    const reopens = (["lease", "native"] as const).flatMap((backend) =>
      (["payment", "sequence"] as const).map((shape) => ({
        ...random$[0],
        backend,
        shape,
        lapse: random() < 0.5,
        lapseAt: 1 as const,
        refresh: "none" as const,
        unreadable: true,
        recoverInReplay: false,
        dismiss: true,
        reopen: true,
        reopenMs: Math.floor(random() * 40),
        dismissInClose: true,
        acknowledgedElsewhere: true,
        dismissOnce: true,
        endedInScope: false,
      })),
    );
    // A lease lapsing in the wallet while the site awaits `ended()` inside
    // its scope: a payment and a sequence, each lapsing at its last step.
    const inScope = (["payment", "sequence"] as const).map((shape) => ({
      ...random$[0],
      backend: "lease" as const,
      shape,
      lapse: true,
      lapseAt: 1 as const,
      refresh: "none" as const,
      unreadable: false,
      recoverInReplay: false,
      dismiss: false,
      reopen: false,
      dismissOnce: false,
      endedInScope: true,
    }));
    // A sequence whose wait alone is dismissed, completed in the
    // background (its journal gone), then reopened: each backend.
    const background = (["lease", "native"] as const).map((backend) => ({
      ...random$[0],
      backend,
      shape: "sequence" as const,
      lapse: false,
      lapseAt: 1 as const,
      refresh: "none" as const,
      unreadable: true,
      recoverInReplay: false,
      dismiss: true,
      reopen: true,
      dismissInClose: false,
      acknowledgedElsewhere: false,
      dismissOnce: true,
      endedInScope: false,
      lagLast: true,
    }));
    const quiet = {
      ...random$[0],
      lapse: false,
      lapseAt: 1 as const,
      refresh: "none" as const,
      unreadable: true,
      recoverInReplay: false,
      dismiss: false,
      reopen: false,
      dismissInClose: false,
      acknowledgedElsewhere: false,
      dismissOnce: false,
      endedInScope: false,
      lagLast: true,
      otherIntent: false,
      retryWhileRecovering: false,
      concurrentComplete: false,
      refreshed: false,
      signed: false,
    };
    // Another intent's payment shown on the same runner after this one's
    // wait was dismissed and completed in the background, then reopened.
    const intents = (["lease", "native"] as const).map((backend) => ({
      ...quiet,
      backend,
      shape: "payment" as const,
      dismiss: true,
      dismissOnce: true,
      reopen: true,
      otherIntent: true,
    }));
    // A retry under a fresh lock, its end awaited in that scope, while the
    // old follow recovers behind it; and two concurrent completions.
    const fresh = (["lease", "native"] as const).flatMap((backend) => [
      {
        ...quiet,
        backend,
        shape: "sequence" as const,
        endedInScope: true,
        retryWhileRecovering: true,
      },
      {
        ...quiet,
        backend,
        shape: "sequence" as const,
        concurrentComplete: true,
      },
    ]);
    // A signed payment under an intent, its wait and view dismissed, then
    // reopened with refreshed calldata; and a signed sequence's concurrent
    // completions: each backend.
    const outcomes = (["lease", "native"] as const).flatMap((backend) => [
      {
        ...quiet,
        backend,
        shape: "payment" as const,
        dismiss: true,
        reopen: true,
        refreshed: true,
        signed: true,
      },
      {
        ...quiet,
        backend,
        shape: "sequence" as const,
        concurrentComplete: true,
        signed: true,
      },
      // Retried with refreshed calldata under a fresh lock while its old
      // follow recovers, another tab taking the lock after: the retry,
      // refused by its own success, leaves it to the next run.
      {
        ...quiet,
        backend,
        shape: "payment" as const,
        refresh: "after" as const,
        endedInScope: true,
        retryWhileRecovering: true,
        refreshed: true,
        signed: true,
      },
    ]);
    return [
      ...random$,
      ...sequences,
      ...reopens,
      ...inScope,
      ...background,
      ...intents,
      ...fresh,
      ...outcomes,
    ].map((c, index) => ({
      ...c,
      index,
    }));
  })();

  test.each(PROPERTY_CASES)(
    "random interleaving $index ($backend, $shape, lapse $lapse at $lapseAt, refresh $refresh, unreadable $unreadable, recover in replay $recoverInReplay, dismiss $dismiss, reopen $reopen, dismiss in close $dismissInClose, acknowledged elsewhere $acknowledgedElsewhere, dismiss once $dismissOnce, ended in scope $endedInScope, lag last $lagLast, other intent $otherIntent, retry while recovering $retryWhileRecovering, concurrent completions $concurrentComplete, refreshed $refreshed, signed $signed): each step told in order with the call it sent, confirmed once before its acknowledgement, one send and one signing across dismiss and reopen, done with every hash and signature in order, every awaited end reached",
    async (c) => {
      const lapsing = lapsingLocksForTests();
      const native = nativeLocks();
      vi.stubGlobal("navigator", {
        locks: c.backend === "lease" ? lapsing.locks : native,
      });
      const other = () =>
        c.backend === "lease" ? lapsing.otherTab() : browserLocks();
      try {
        reviewUi();
        const context = setup();
        const { chain, deps, wallet, memory } = context;
        const told: string[] = [];
        const violations: string[] = [];
        const safe = c.shape === "safe";
        /** A payment under an intent, its later runs' calldata refreshed. */
        const refreshing = c.refreshed && c.shape === "payment";
        const calls = refreshing
          ? [{ ...payCall(), intent: "pay:prop" }]
          : c.shape === "payment"
            ? [payCall()]
            : [approveCall(), payCall()];
        /** What every run after the first brings. */
        const later = refreshing
          ? [{ ...payCall(11n), intent: "pay:prop" }]
          : calls;
        const signs = c.signed && c.shape !== "safe";
        const SIGNATURE = `0x${"5e".repeat(65)}` as const;
        const signing = signs
          ? {
              signatures: [
                { kind: "message" as const, chainId: 10, message: "List it" },
              ],
            }
          : {};
        /** Each onConfirmed's call, by the step it was told. */
        const confirmedCalls: { step: number; data: string }[] = [];
        const last = calls.length - 1;
        const scope = c.shape === "payment" ? undefined : `pay:${c.shape}`;
        const held = safe ? safeBatchCall(ACCOUNT, calls) : calls[last];
        /** The steps whose onConfirmed is told: a Safe batch's last only. */
        const confirming = safe ? [last] : calls.map((_, step) => step);
        /** Each wallet send's hash, by step. */
        const sent: string[] = [];
        const acknowledged = new Set<number>();
        // Every acknowledgement is checked as it is saved: its step's
        // notice told first, and every step's before the last one's.
        const save = memory.set.bind(memory);
        memory.set = (key: string, value: string) => {
          if (key.endsWith(":settled")) {
            const saved = JSON.parse(value) as {
              acknowledged?: boolean;
              hash?: string;
            };
            const step = safe ? last : sent.indexOf(saved?.hash ?? "");
            if (
              saved?.acknowledged === true &&
              step !== -1 &&
              !acknowledged.has(step)
            ) {
              acknowledged.add(step);
              const needed = step === last ? confirming : [step];
              for (const at of needed)
                if (!told.includes(`confirmed:${at}`))
                  violations.push(
                    `step ${step} acknowledged before step ${at}'s delivery: ${told}`,
                  );
            }
          }
          return save(key, value);
        };
        const refreshes: Promise<unknown>[] = [];
        let wallets = 0;
        const inWallet = async () => {
          const at = wallets++;
          if (at !== (c.shape === "sequence" ? c.lapseAt : 0)) return;
          if (c.lapse) lapsing.lapse();
          if (c.refresh === "wallet")
            refreshes.push(other().request("pay", async () => undefined));
          if (c.backend === "lease" && c.lapse)
            await refreshes[refreshes.length - 1];
        };
        const sendCalls = vi.fn(async () => {
          await inWallet();
          return `0x${"ab".repeat(32)}`;
        });
        if (safe) wallet.state.safe = true;
        wallet.adapter.signMessage.mockImplementation(async () => SIGNATURE);
        const send = wallet.adapter.sendTransaction.getMockImplementation()!;
        /** Another intent's payment, sent on the same runner. */
        const otherCall = { ...payCall(9n), intent: "pay:other" };
        const otherSent: string[] = [];
        wallet.adapter.sendTransaction.mockImplementation(async (...args) => {
          if (args[0].data === otherCall.data) {
            const hash = await send(...args);
            otherSent.push(hash.toLowerCase());
            return hash;
          }
          await inWallet();
          const hash = await send(...args);
          sent.push(hash.toLowerCase());
          return hash;
        });
        const read =
          chain.client.getTransactionReceipt.getMockImplementation()!;
        let execution: Awaited<ReturnType<typeof executeProposal>> | undefined;
        let recovered = !c.unreadable;
        const recover = () => {
          if (recovered) return;
          recovered = true;
          if (safe) execution?.readable(Infinity);
          else chain.client.getTransactionReceipt.mockImplementation(read);
          act(() => void globalThis.dispatchEvent(new Event("focus")));
        };
        if (!safe && c.unreadable)
          chain.client.getTransactionReceipt.mockImplementation(
            async (args) => {
              // A sequence's node may lag only once its approval confirmed.
              if (
                c.lagLast &&
                c.shape === "sequence" &&
                !told.includes("confirmed:0")
              )
                return read(args);
              throw new Error("lagging node");
            },
          );
        const { seen, run } = harness({
          ...deps,
          ...(safe ? { adapter: { ...wallet.adapter, sendCalls } } : {}),
          account: ACCOUNT,
        });
        const tries = new Map<number, number>();
        const sleep = (ms: number) =>
          new Promise((resolve) => setTimeout(resolve, ms));
        const site = (lock: { assertHeld(): Promise<void> }) => ({
          onSubmitted: async (_call: unknown, step: number) => {
            await lock.assertHeld();
            const tried = (tries.get(step) ?? 0) + 1;
            tries.set(step, tried);
            // The receipt recovers during this replay's save.
            if (c.recoverInReplay) recover();
            await sleep(c.submitMs);
            await lock.assertHeld();
            told.push(`submitted:${step}`);
          },
          onConfirmed: async (call: { data: string }, step: number) => {
            await lock.assertHeld();
            await sleep(c.confirmMs);
            await lock.assertHeld();
            told.push(`confirmed:${step}`);
            confirmedCalls.push({ step, data: call.data });
          },
        });
        const runOnce = (
          before?: () => Promise<void>,
          endInScope = c.endedInScope,
          bringing = later,
        ) =>
          browserLocks().request("pay", async (lock) => {
            await before?.();
            const result = await run({
              ...HANDED_BACK,
              ...signing,
              calls: bringing,
              ...(safe ? { batch: true } : {}),
              ...(scope ? { scope } : {}),
              locks: [lock!],
              ...site(lock!),
            });
            if (!endInScope || result?.status !== "receipt")
              return result as unknown;
            // Awaited inside the scope, its node reading again: it ends,
            // with no dismiss.
            recover();
            return Promise.race([
              result.ended(),
              sleep(8_000).then(() => "stuck" as const),
            ]);
          });
        /** A reopen in the same tab, by a site that takes no lock. */
        const reopened: Promise<unknown>[] = [];
        const reopen = () =>
          act(
            () =>
              void reopened.push(
                seen.current!.run({
                  ...HANDED_BACK,
                  ...signing,
                  calls: later,
                  ...(safe ? { batch: true } : {}),
                  ...(scope ? { scope } : {}),
                  ...site({ assertHeld: async () => {} }),
                }),
              ),
          );
        // A retry's first run leaves its follow recovering behind it.
        const first = (await runOnce(
          undefined,
          c.endedInScope && !c.retryWhileRecovering,
          calls,
        )) as {
          safeTxHash?: string;
          status?: string;
          step?: number;
        } | null;
        /** Every run's end: a done one has each step's hash, in order. */
        const results: unknown[] = [first];
        /** Every completion's end, by the step it completed. */
        const completions: {
          step: number;
          ended: {
            undelivered?: true;
            settled: { result: string };
            hashes: string[];
            signatures?: string[];
          } | null;
        }[] = [];
        /** An observer's onConfirmed, told at once. */
        const tellNow = (call: { data: string }, step: number) => {
          told.push(`confirmed:${step}`);
          confirmedCalls.push({ step, data: call.data });
        };
        // Two completions of its held step at once (two observers).
        if (c.concurrentComplete && !safe && first?.status === "receipt") {
          const step = first.step!;
          const call = calls[step];
          const hold = openStepHold(deps.hold, ACCOUNT, false, call);
          const reservation =
            hold.peek().reservation ??
            hold.unacknowledgedSuccess()?.reservation;
          recover();
          const { completeReviewedStep } = await import("../send.js");
          await act(async () => {
            const ends = await Promise.all(
              [0, 1].map(() =>
                completeReviewedStep(
                  { step, held: { call, reservation } },
                  {
                    account: ACCOUNT,
                    ...(scope ? { scope } : {}),
                    // Told at once: the other's read races its record.
                    onConfirmed: tellNow,
                  },
                  deps,
                ).catch((error: unknown) => {
                  violations.push(`a completion threw: ${String(error)}`);
                  return null;
                }),
              ),
            );
            for (const ended of ends) completions.push({ step, ended });
            // A later one, after both, unscoped and handed only its call:
            // its hashes and signatures read from the hold.
            completions.push({
              step,
              ended: await completeReviewedStep(
                { step, held: { call, reservation } },
                { account: ACCOUNT, onConfirmed: tellNow },
                deps,
              ).catch((error: unknown) => {
                violations.push(`a completion threw: ${String(error)}`);
                return null;
              }),
            });
          });
        }
        // Retried under a fresh lock while the old follow recovers behind it.
        if (
          c.retryWhileRecovering &&
          !safe &&
          first?.status === "receipt" &&
          !recovered
        )
          results.push(
            await runOnce(async () => {
              recover();
              // Its notice claimed by the old follow, queued behind this lock.
              const hold = openStepHold(
                deps.hold,
                ACCOUNT,
                false,
                calls[first.step!],
              );
              await vi
                .waitFor(
                  async () => {
                    await act(async () => {
                      globalThis.dispatchEvent(new Event("focus"));
                    });
                    const success = hold.unacknowledgedSuccess();
                    expect(success).toBeDefined();
                    await expect(hold.confirmation(success!)).resolves.toBe(
                      "pending",
                    );
                  },
                  { timeout: 6_000 },
                )
                .catch(() => undefined);
            }, true),
          );
        if (safe && first?.safeTxHash)
          execution = await executeProposal(
            context,
            first.safeTxHash as ViemHex,
            held,
            { readable: c.unreadable && !recovered ? 0 : Infinity },
          );
        if (c.refresh === "after")
          refreshes.push(other().request("pay", async () => undefined));
        await Promise.all(refreshes);
        // Only its wait dismissed, then its completion goes on in the
        // background as the node reads again; else dismissed after.
        if (!c.dismissOnce) recover();
        /** Dismissed before its done showed: a reopen is the same action. */
        await act(async () => {});
        const unshown = seen.current!.status !== "done";
        if (c.dismiss) {
          act(() => void seen.current!.dismiss());
          if (!c.dismissOnce) act(() => void seen.current!.dismiss());
        }
        recover();
        const handle = openStepHold(deps.hold, ACCOUNT, safe, held);
        const settle = async () => {
          for (let round = 0; round < 6; round += 1)
            await act(async () => {
              globalThis.dispatchEvent(new Event("focus"));
              await sleep(60);
            });
        };
        await settle();
        // Another intent's payment on the same runner: its wait dismissed
        // too, then completed and shown in the background.
        if (c.otherIntent && !safe) {
          const otherTold: number[] = [];
          const reading =
            chain.client.getTransactionReceipt.getMockImplementation()!;
          let lagging = true;
          chain.client.getTransactionReceipt.mockImplementation(
            async (args) => {
              if (lagging && otherSent.includes(args.hash.toLowerCase()))
                throw new Error("lagging node");
              return reading(args);
            },
          );
          await browserLocks().request("pay", (lock) =>
            run({
              ...HANDED_BACK,
              calls: [otherCall],
              locks: [lock!],
              onConfirmed: async (_call: unknown, step: number) => {
                otherTold.push(step);
              },
            }),
          );
          act(() => void seen.current!.dismiss());
          lagging = false;
          await vi.waitFor(
            async () => {
              await act(async () => {
                globalThis.dispatchEvent(new Event("focus"));
              });
              expect(otherTold).toEqual([0]);
            },
            { timeout: 12_000 },
          );
          await settle();
        }
        // Reopened while unfinished: its success's receipt reread slowly,
        // dismissed meanwhile and reopened again if the dismiss closed it.
        // Its reopen closes on its success, never sends it again: its next
        // read held while it is dismissed and reopened again.
        if (c.dismiss && c.reopen && unshown) {
          const success = handle.unacknowledgedSuccess();
          if (
            c.acknowledgedElsewhere &&
            success &&
            told.includes(`confirmed:${last}`)
          )
            await act(async () => {
              await handle.acknowledge(success);
            });
          let release!: () => void;
          const slow = new Promise<void>((resolve) => (release = resolve));
          const reading =
            chain.client.getTransactionReceipt.getMockImplementation()!;
          chain.client.getTransactionReceipt.mockImplementationOnce(
            async (args) => {
              await slow;
              return reading(args);
            },
          );
          reopen();
          await act(async () => {
            await sleep(c.reopenMs);
          });
          let dismissed = false;
          if (c.dismissInClose)
            act(() => {
              dismissed = seen.current!.dismiss();
            });
          if (dismissed) {
            reopen();
            await settle();
          }
          release();
          await act(async () => {
            results.push(...(await Promise.all(reopened)));
          });
          await settle();
        }
        // Retried, under a fresh lock, only while its sequence is saved
        // unfinished or its last success is unacknowledged.
        const unfinished = () =>
          !!handle.unacknowledgedSuccess() ||
          (scope !== undefined &&
            findReviewedSequence(scope, ACCOUNT, { storage: deps.storage }) !==
              null);
        for (let retry = 0; retry < 4 && unfinished(); retry += 1) {
          results.push(await runOnce());
          await settle();
        }
        // Shown done by its follow, at the receipt's pace.
        if (!c.dismiss)
          await vi.waitFor(
            async () => {
              await act(async () => {});
              expect(seen.current!.status).toBe("done");
            },
            { timeout: 12_000 },
          );
        await rendered(() =>
          expect(handle.unacknowledgedSuccess()).toBeUndefined(),
        );
        expect(unfinished()).toBe(false);
        expect(violations).toEqual([]);
        expect(acknowledged.has(last)).toBe(true);
        // Each step's notice told once, in step order.
        expect(told.filter((name) => name.startsWith("confirmed:"))).toEqual(
          confirming.map((step) => `confirmed:${step}`),
        );
        const submitted = told.filter((name) => name.startsWith("submitted:"));
        expect(submitted).toEqual([...submitted].sort());
        // A step's submission, when told, comes before its confirmation.
        for (const name of submitted) {
          const confirmed = told.indexOf(
            `confirmed:${safe ? last : name.split(":")[1]}`,
          );
          expect(told.indexOf(name)).toBeLessThan(confirmed);
        }
        expect(safe ? sendCalls.mock.calls.length : sent.length).toBe(
          safe ? 1 : calls.length,
        );
        expect(otherSent).toHaveLength(c.otherIntent && !safe ? 1 : 0);
        expect(wallet.adapter.signMessage).toHaveBeenCalledTimes(signs ? 1 : 0);
        // Every onConfirmed, the run's own or a recovery's, gets the call
        // that step sent, never a later run's.
        if (!safe)
          for (const { step, data } of confirmedCalls)
            expect(data).toBe(calls[step].data);
        // Every recovered end shows the run's own signatures.
        const signatures = signs ? [SIGNATURE] : undefined;
        for (const { ended } of completions)
          if (ended) expect(ended.signatures).toEqual(signatures);
        for (const result of results)
          if (
            ["done", "receipt"].includes(
              (result as { status?: string })?.status ?? "",
            )
          )
            expect((result as { signatures?: string[] }).signatures).toEqual(
              signatures,
            );
        // A completion that ended its step has the action's hashes through it.
        for (const { step, ended } of completions)
          if (ended && !ended.undelivered && ended.settled.result === "success")
            expect(ended.hashes.map((hash) => hash.toLowerCase())).toEqual(
              sent.slice(0, step + 1),
            );
        // Every end awaited inside a scope was reached.
        expect(results).not.toContain("stuck");
        // A direct send's done ends with every step's hash, in order.
        if (!safe)
          for (const result of results)
            if ((result as { status?: string })?.status === "done")
              expect(
                (result as { hashes: string[] }).hashes.map((hash) =>
                  hash.toLowerCase(),
                ),
              ).toEqual(sent);
      } finally {
        vi.unstubAllGlobals();
      }
    },
    30_000,
  );

  test("a dismissed payment's success, acknowledged by another reader, closes a retry that adds an approval first: the payment never sent twice", async () => {
    reviewUi();
    const { chain, deps, wallet } = setup();
    const read = chain.client.getTransactionReceipt.getMockImplementation()!;
    chain.client.getTransactionReceipt.mockImplementation(async () => {
      throw new Error("lagging node");
    });
    const { seen, run } = harness({ ...deps, account: ACCOUNT });
    await run({ ...HANDED_BACK, calls: [payCall()] });
    act(() => void seen.current!.dismiss());
    await rendered(() => expect(seen.current!.busy).toBe(false));
    act(() => void seen.current!.dismiss());
    chain.client.getTransactionReceipt.mockImplementation(read);
    const handle = openStepHold(deps.hold, ACCOUNT, false, payCall());
    await vi.waitFor(
      () => expect(handle.unacknowledgedSuccess()).toBeDefined(),
      { timeout: 12_000 },
    );
    await act(async () => {
      await handle.acknowledge(handle.unacknowledgedSuccess()!);
    });
    // Its allowance spent, preparation now asks for an approval first.
    await expect(
      run({ calls: [approveCall(), payCall()], scope: "pay:fresh" }),
    ).resolves.toMatchObject({ status: "done" });
    expect(
      wallet.adapter.sendTransaction.mock.calls.filter(
        ([tx]) => tx.data === payCall().data,
      ),
    ).toHaveLength(1);
  }, 20_000);

  test.each([
    ["the lease", "outlasts", 400],
    ["the lease", "is faster than", 10],
    ["native Web Locks", "outlasts", 400],
    ["native Web Locks", "is faster than", 10],
  ] as const)(
    "onSubmitted refused while the wallet was open (if its lock can lapse) and a late onConfirmed are both kept, one after the other (%s, the confirmation %s the replay)",
    async (backendName, _, confirming) => {
      const backend =
        backendName === "the lease"
          ? () => ({ ...lapsingLocksForTests(), lapses: true })
          : () => ({ locks: nativeLocks(), lapse: () => {}, lapses: false });
      const { locks, lapse, lapses } = backend();
      vi.stubGlobal("navigator", { locks });
      try {
        reviewUi();
        const { chain, deps, wallet } = setup();
        const send = wallet.adapter.sendTransaction.getMockImplementation()!;
        wallet.adapter.sendTransaction.mockImplementation(async (...args) => {
          lapse();
          return send(...args);
        });
        const read =
          chain.client.getTransactionReceipt.getMockImplementation()!;
        chain.client.getTransactionReceipt.mockImplementation(async () => {
          throw new Error("lagging node");
        });
        const { run } = harness({ ...deps, account: ACCOUNT });
        const told: string[] = [];
        const tries: string[] = [];
        let recovered = false;
        const recover = () => {
          if (recovered) return;
          recovered = true;
          chain.client.getTransactionReceipt.mockImplementation(read);
          act(() => void globalThis.dispatchEvent(new Event("focus")));
        };
        // The receipt recovers as the scope ends, so its notice is kept
        // while the submission's replay runs; a fast one recovers once
        // that replay holds the lock taken back.
        const inReplay = lapses && confirming < 300;
        const slowly =
          (name: string, lock: { assertHeld(): Promise<void> }, ms: number) =>
          async () => {
            tries.push(name);
            await lock.assertHeld();
            if (inReplay && name === "submitted") recover();
            await new Promise((resolve) => setTimeout(resolve, ms));
            await lock.assertHeld();
            told.push(name);
          };
        const result = await browserLocks().request("pay", async (lock) => {
          const ran = await run({
            ...HANDED_BACK,
            calls: [payCall()],
            locks: [lock!],
            onSubmitted: slowly("submitted", lock!, 300),
            onConfirmed: slowly("confirmed", lock!, confirming),
          });
          if (!inReplay) recover();
          return ran;
        });
        expect(result).toMatchObject({ status: "receipt" });
        await vi.waitFor(
          () => expect(told).toEqual(["submitted", "confirmed"]),
          { timeout: 12_000 },
        );
        // A lapsed lease refused it in the wallet: told on its replay.
        expect(tries.filter((name) => name === "submitted")).toHaveLength(
          lapses ? 2 : 1,
        );
      } finally {
        vi.unstubAllGlobals();
      }
    },
    20_000,
  );

  test("another account's dismissed success never closes this account's run of the same calls", async () => {
    reviewUi();
    const { chain, deps, wallet } = setup();
    const read = chain.client.getTransactionReceipt.getMockImplementation()!;
    chain.client.getTransactionReceipt.mockImplementation(async () => {
      throw new Error("lagging node");
    });
    // One deps object the app updates in place when the account changes.
    const given = {
      engine: () => import("../send.js"),
      ...deps,
      account: ACCOUNT as typeof OTHER,
    };
    const seen: { current?: UseReviewedRunResult } = {};
    function Probe() {
      seen.current = useReviewedRun(given);
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
    const action = { ...HANDED_BACK, calls: [payCall()] };
    await run(action);
    act(() => void seen.current!.dismiss());
    await rendered(() => expect(seen.current!.busy).toBe(false));
    act(() => void seen.current!.dismiss());
    chain.client.getTransactionReceipt.mockImplementation(read);
    act(() => void globalThis.dispatchEvent(new Event("focus")));
    await vi.waitFor(
      () =>
        expect(
          openStepHold(deps.hold, ACCOUNT, false, action.calls[0]).peek()
            .status,
        ).toBe("clear"),
      { timeout: 12_000 },
    );
    // The wallet switched to another account, the hook still mounted.
    wallet.state.account = OTHER;
    given.account = OTHER;
    act(() => root!.render(<Probe />));
    await run({ ...action, account: OTHER });
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledTimes(2);
  }, 20_000);

  test("a form's own held write, closed, is followed again by its next run under the same intent, though the calls changed (a fresh quote)", async () => {
    reviewUi();
    const { chain, deps, wallet } = setup();
    chain.client.getTransactionReceipt.mockImplementation(async () => {
      throw new Error("lagging node");
    });
    const { seen, run } = harness({ ...deps, account: ACCOUNT });
    await run({ ...HANDED_BACK, calls: [{ ...payCall(), intent: "pay:1" }] });
    act(() => void seen.current!.dismiss());
    await rendered(() => expect(seen.current!.busy).toBe(false));
    act(() => void seen.current!.dismiss());
    expect(seen.current!.held).toBeNull();
    await expect(
      run({ calls: [{ ...payCall(9n), intent: "pay:1" }] }),
    ).resolves.toMatchObject({ status: "failed" });
    await rendered(() =>
      expect(seen.current!.held).toMatchObject({ phase: "confirming" }),
    );
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledOnce();
  });

  test("a retry run in the same handler as the dismiss that closed its followed write follows that write again", async () => {
    reviewUi();
    const { chain, deps, wallet } = setup();
    chain.client.getTransactionReceipt.mockImplementation(async () => {
      throw new Error("lagging node");
    });
    const { seen } = harness({ ...deps, account: ACCOUNT });
    const action = { ...HANDED_BACK, calls: [payCall()] };
    await act(async () => {
      await seen.current!.run(action);
    });
    act(() => void seen.current!.dismiss());
    await rendered(() =>
      expect(seen.current!.held).toMatchObject({ phase: "confirming" }),
    );
    // "Try again": the app resets and runs again from one render's handle.
    const { dismiss, run } = seen.current!;
    let retried!: Awaited<ReturnType<UseReviewedRunResult["run"]>>;
    await act(async () => {
      dismiss();
      retried = await run(action);
    });
    expect(retried).toMatchObject({ status: "failed" });
    await rendered(() =>
      expect(seen.current!.held).toMatchObject({ phase: "confirming" }),
    );
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledOnce();
  });

  test("dismissing a hold the run ended on resets it, and its hold is still followed: the app told once it settles", async () => {
    reviewUi();
    const { chain, deps } = setup();
    const read = chain.client.getTransactionReceipt.getMockImplementation()!;
    chain.client.getTransactionReceipt.mockImplementation(async () => {
      throw new Error("lagging node");
    });
    const onDismissedSettled = vi.fn();
    const { seen, run } = harness({
      ...deps,
      account: ACCOUNT,
      onDismissedSettled,
    });
    const call = payCall();
    await run({ ...HANDED_BACK, calls: [call] });
    // The first stops the wait; the second closes what it still shows.
    act(() => void seen.current!.dismiss());
    await rendered(() =>
      expect(seen.current!.held).toMatchObject({ phase: "confirming" }),
    );
    act(() => void seen.current!.dismiss());
    expect(seen.current).toMatchObject({ status: "idle", held: null });
    chain.client.getTransactionReceipt.mockImplementation(read);
    await vi.waitFor(() => expect(onDismissedSettled).toHaveBeenCalledOnce(), {
      timeout: 12_000,
    });
    expect(onDismissedSettled).toHaveBeenCalledWith(
      expect.objectContaining({ to: call.to, data: call.data }),
    );
  }, 20_000);

  test("dismiss never closes a run whose review or wallet is open", async () => {
    const prompts = reviewUi(() => new Promise(() => {}));
    const { deps } = setup();
    const { seen } = harness({ ...deps, account: ACCOUNT });
    act(() => void seen.current!.run({ calls: [payCall()] }));
    await act(() => vi.waitFor(() => expect(prompts).toHaveLength(1)));
    let closed!: boolean;
    act(() => {
      closed = seen.current!.dismiss();
    });
    expect(closed).toBe(false);
    expect(seen.current).toMatchObject({ status: "review", busy: true });
  });

  test("a reopened run closing on its dismissed success holds the form while the receipt is reread: dismiss refused, a second reopen closes too, one send", async () => {
    reviewUi();
    const { chain, deps, wallet } = setup();
    const read = chain.client.getTransactionReceipt.getMockImplementation()!;
    chain.client.getTransactionReceipt.mockRejectedValue(
      new Error("lagging node"),
    );
    const { seen, run } = harness({ ...deps, account: ACCOUNT });
    const onConfirmed = vi.fn();
    const action = { ...HANDED_BACK, calls: [payCall()], onConfirmed };
    await expect(run(action)).resolves.toMatchObject({ status: "receipt" });
    act(() => void seen.current!.dismiss());
    // Recovered in the background: told and acknowledged.
    chain.client.getTransactionReceipt.mockImplementation(read);
    act(() => void globalThis.dispatchEvent(new Event("focus")));
    await vi.waitFor(() => expect(onConfirmed).toHaveBeenCalledOnce(), {
      timeout: 12_000,
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    // The reopened run's receipt reread is slow.
    let release!: () => void;
    let entered = false;
    const slow = new Promise<void>((resolve) => (release = resolve));
    chain.client.getTransactionReceipt.mockImplementationOnce(async (args) => {
      entered = true;
      await slow;
      return read(args);
    });
    let reopened!: Promise<unknown>;
    act(() => void (reopened = seen.current!.run(action)));
    await rendered(() => expect(entered).toBe(true));
    let closed!: boolean;
    act(() => {
      closed = seen.current!.dismiss();
    });
    expect(closed).toBe(false);
    let again!: Promise<unknown>;
    act(() => void (again = seen.current!.run(action)));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
    });
    release();
    await act(async () => {
      await Promise.all([reopened, again]);
    });
    await expect(again).resolves.toMatchObject({ status: "done" });
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledOnce();
    expect(onConfirmed).toHaveBeenCalledOnce();
  }, 20_000);

  test("a dismissed sequence's last step, closed by a reopened run, ends done with every step's hash", async () => {
    reviewUi();
    const { chain, deps, wallet } = setup();
    const read = chain.client.getTransactionReceipt.getMockImplementation()!;
    let lagging = false;
    chain.client.getTransactionReceipt.mockImplementation(async (args) => {
      if (lagging) throw new Error("lagging node");
      return read(args);
    });
    const action = {
      ...HANDED_BACK,
      calls: [approveCall(), payCall()],
      scope: "pay:sequence",
      // The node lags once the approval is confirmed.
      onConfirmed: (_call: unknown, step: number) => {
        if (step === 0) lagging = true;
      },
    };
    const { seen, run } = harness({ ...deps, account: ACCOUNT });
    await expect(run(action)).resolves.toMatchObject({
      status: "receipt",
      step: 1,
    });
    act(() => void seen.current!.dismiss());
    await rendered(() => expect(seen.current!.busy).toBe(false));
    act(() => void seen.current!.dismiss());
    lagging = false;
    const handle = openStepHold(deps.hold, ACCOUNT, false, payCall());
    await vi.waitFor(
      () => expect(handle.unacknowledgedSuccess()).toBeDefined(),
      { timeout: 12_000 },
    );
    const sent = await Promise.all(
      wallet.adapter.sendTransaction.mock.results.map(({ value }) => value),
    );
    expect(sent).toHaveLength(2);
    await expect(run(action)).resolves.toMatchObject({
      status: "done",
      hashes: sent,
    });
  }, 20_000);

  /** A payment left at its receipt whose completion waits in onConfirmed. */
  async function completing() {
    reviewUi();
    const context = setup();
    const { chain, deps, hold } = context;
    const read = chain.client.getTransactionReceipt.getMockImplementation()!;
    chain.client.getTransactionReceipt.mockRejectedValue(
      new Error("lagging node"),
    );
    let release!: () => void;
    const paused = new Promise<void>((resolve) => (release = resolve));
    const onConfirmed = vi.fn((..._told: unknown[]) => paused as never);
    const hook = harness({ ...deps, account: ACCOUNT });
    const first = (await hook.run({
      ...HANDED_BACK,
      calls: [payCall()],
      onConfirmed,
    })) as ReviewedRunReceipt;
    expect(first).toMatchObject({ status: "receipt" });
    chain.client.getTransactionReceipt.mockImplementation(read);
    act(() => void globalThis.dispatchEvent(new Event("focus")));
    await vi.waitFor(() => expect(onConfirmed).toHaveBeenCalledOnce());
    /** Lets onConfirmed end, then waits for what follows. */
    const finish = async () => {
      release();
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });
    };
    /** The payment's success, still unacknowledged. */
    const warned = () =>
      openStepHold(hold, ACCOUNT, false, payCall()).unacknowledgedSuccess();
    return { ...context, ...hook, first, finish, warned };
  }

  test("a new run while a payment's completion waits in onConfirmed: the payment is acknowledged by nothing, and never sent twice", async () => {
    const { run, wallet, first, finish, warned } = await completing();
    reviewUi(async () => null);
    await expect(run({ calls: [payCall(7n)] })).resolves.toBeNull();
    await finish();
    await expect(first.ended()).resolves.toBeNull();
    expect(warned()).toBeDefined();
    reviewUi();
    await run({ calls: [payCall()] });
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledOnce();
  });

  test("a reset while a payment's completion waits in onConfirmed acknowledges nothing: never sent twice", async () => {
    const { seen, run, wallet, finish, warned } = await completing();
    act(() => seen.current!.reset());
    await finish();
    expect(warned()).toBeDefined();
    await run({ calls: [payCall()] });
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledOnce();
  });

  test("an unmount while a payment's completion waits in onConfirmed acknowledges nothing: never sent twice", async () => {
    const { deps, wallet, finish, warned } = await completing();
    act(() => root?.unmount());
    await finish();
    expect(warned()).toBeDefined();
    const again = harness({ ...deps, account: ACCOUNT });
    await again.run({ calls: [payCall()] });
    expect(wallet.adapter.sendTransaction).toHaveBeenCalledOnce();
  });

  test("a followed payment is acknowledged only once its done is shown: a reset as the IndexedDB lock lets go never hides it", async () => {
    reviewUi();
    const { chain, deps, storage } = setup();
    vi.stubGlobal("indexedDB", new IDBFactory());
    const had = Object.getOwnPropertyDescriptor(navigator, "locks");
    Object.defineProperty(navigator, "locks", {
      configurable: true,
      value: undefined,
    });
    try {
      let seen!: () => UseReviewedRunResult;
      let shownAtAck: string | undefined;
      let reset!: Promise<void>;
      const hold = createWriteHold({
        storage: {
          ...storage,
          setItem: (key, raw) => {
            storage.setItem(key, raw);
            if (shownAtAck || !raw.includes('"acknowledged":true')) return;
            shownAtAck = seen().status;
            // The user navigates as the fallback lock cleans up its lease.
            reset = new Promise((resolve) =>
              setImmediate(() => {
                act(() => seen().reset());
                resolve();
              }),
            );
          },
        },
      });
      const read = chain.client.getTransactionReceipt.getMockImplementation()!;
      chain.client.getTransactionReceipt.mockRejectedValue(
        new Error("lagging node"),
      );
      const hook = harness({ ...deps, hold, account: ACCOUNT });
      seen = () => hook.seen.current!;
      const first = (await hook.run({
        ...HANDED_BACK,
        calls: [payCall()],
        onConfirmed: () => {},
      })) as ReviewedRunReceipt;
      expect(first).toMatchObject({ status: "receipt" });
      chain.client.getTransactionReceipt.mockImplementation(read);
      act(() => void globalThis.dispatchEvent(new Event("focus")));
      // The real IndexedDB lock's lease takes several tasks.
      await vi.waitFor(() => expect(shownAtAck).toBeDefined(), {
        timeout: 5_000,
      });
      await act(() => reset);
      expect(shownAtAck).toBe("done");
      await expect(first.ended()).resolves.toMatchObject({ status: "done" });
    } finally {
      if (had) Object.defineProperty(navigator, "locks", had);
      else delete (navigator as { locks?: unknown }).locks;
      vi.unstubAllGlobals();
    }
  });

  test("a payment another tab acknowledged and reserved again still completes its own run: its end is done", async () => {
    reviewUi();
    const { chain, deps, memory } = setup();
    const read = chain.client.getTransactionReceipt.getMockImplementation()!;
    chain.client.getTransactionReceipt.mockRejectedValue(
      new Error("lagging node"),
    );
    const { run } = harness({ ...deps, account: ACCOUNT });
    const first = (await run({
      ...HANDED_BACK,
      calls: [payCall()],
    })) as ReviewedRunReceipt;
    let ended: unknown = "pending";
    void first.ended().then((value) => (ended = value));
    // Another tab, while this one is suspended: it sees the payment
    // confirm, acknowledges it, then reserves it again and is refused. This
    // tab reads its storage only once it resumes.
    chain.client.getTransactionReceipt.mockImplementation(read);
    const away = new Map(memory);
    const other = openStepHold(
      createWriteHold({
        storage: createHeldWriteStorage({
          durable: () => undefined,
          memory: away,
        }),
        locks: FREE_LOCKS,
        settle: { intervalMs: 1_000, attempts: 1 },
      }),
      ACCOUNT,
      false,
      payCall(),
    );
    const client = chain.client as never;
    const settled = await other.state(client);
    expect(settled).toMatchObject({
      status: "clear",
      settled: { result: "success" },
    });
    await other.acknowledge(
      (settled as { settled: { result: "success"; hash: ViemHex } }).settled,
    );
    await other
      .send(client, async (gate) => {
        await gate.beforeSend();
        gate.onRejected();
      })
      .catch(() => undefined);
    expect(ended).toBe("pending");
    memory.clear();
    for (const [key, value] of away) memory.set(key, value);
    act(() => void globalThis.dispatchEvent(new Event("focus")));
    await rendered(() => expect(ended).not.toBe("pending"));
    expect(ended).toMatchObject({ status: "done" });
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

  describe("a sent step reaches done only with the receipt its hold verified and onConfirmed once; otherwise it stays uncertain, its checkpoint kept and every send refused; a failure shows its checked receipt; a released step is sent again only once reviewed; a site callback that throws or rejects is logged and changes none of it", () => {
    type Ended = {
      /** How the hook ended the step. */
      outcome: "done" | "uncertain" | "failed" | "released";
      /** The receipt the hook ended it with (its last step's). */
      receipt: { transactionHash: string; blockHash: string } | null;
      onConfirmed: ReturnType<typeof vi.fn>;
      /** The step it is about, and what it sent: the hash its hold settles. */
      step: number;
      hash: ViemHex;
      chain: ReturnType<typeof setup>["chain"];
      /** The journal's step in flight, or null with no journal. */
      sending: () => unknown;
      /** Wallet writes so far. */
      writes: () => number;
      /** Runs the same action again, as a user closing and reopening it. */
      again: () => Promise<unknown>;
    };
    const scope = "pay:rows";
    const outcomeOf = (left: unknown): Ended["outcome"] =>
      (left as { status: string }).status === "done" ? "done" : "uncertain";
    /** A wallet send of `calls`; `lagging` keeps the hold's own reads of `hash` failing. */
    async function sent(
      throwing: Failing,
      calls: ReturnType<typeof payCall>[],
      lagging: (hash: string) => boolean,
      after?: (left: unknown) => Promise<Ended["outcome"]>,
    ): Promise<Ended & { deps: ReturnType<typeof setup>["deps"] }> {
      reviewUi();
      const { chain, deps, storage, wallet } = setup();
      const read = chain.client.getTransactionReceipt.getMockImplementation()!;
      chain.client.getTransactionReceipt.mockImplementation(async (args) => {
        if (lagging(args.hash)) throw new Error("lagging node");
        return read(args);
      });
      const onConfirmed = confirmer(throwing);
      const { seen, run } = harness({
        ...deps,
        account: ACCOUNT,
        ...(throwing ? { onProgress: failing(throwing) } : {}),
      });
      const action = {
        calls,
        scope,
        onConfirmed,
        ...siteCallbacks(throwing),
        follow: {
          timeoutMs: 1,
          ...(throwing ? { onConfirming: failing(throwing) } : {}),
        },
      };
      const left = await run(action);
      const outcome = after ? await after(left) : outcomeOf(left);
      const step = calls.length - 1;
      const hash = `0x${(step + 1).toString(16).padStart(64, "0")}` as ViemHex;
      return {
        outcome,
        receipt: seen.current!.receipt ?? null,
        onConfirmed,
        step,
        hash,
        chain,
        sending: () =>
          findReviewedSequence(scope, ACCOUNT, { storage })?.sending,
        writes: () => wallet.adapter.sendTransaction.mock.calls.length,
        again: () => run(action),
        deps,
      };
    }
    /** Its hold settles once the node reads again; ended() reports it. */
    const recovers = (gate: { lagging: boolean }) => async (left: unknown) => {
      expect(left).toMatchObject({ status: "receipt" });
      const ended = (left as ReviewedRunReceipt).ended();
      gate.lagging = false;
      act(() => void globalThis.dispatchEvent(new Event("focus")));
      return outcomeOf(await ended);
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
      return ended ? "done" : "uncertain";
    };
    /** A Safe proposal its hold settles from its execution. */
    const safeRow =
      (
        readable: number,
        options: { journal?: boolean; event?: string; recovers?: boolean } = {},
      ) =>
      async (throwing: Failing): Promise<Ended> => {
        const row = await proposedThenExecuted(readable, {
          ...options,
          throwing,
        });
        let outcome: Ended["outcome"] = "uncertain";
        if (options.recovers) {
          await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 50));
          });
          expect(row.seen.current!.error).toBeNull();
          row.recover();
        }
        try {
          await vi.waitFor(
            async () => {
              await act(async () => {});
              const now = row.seen.current!;
              if (now.phase === "done") outcome = "done";
              else if (now.error === HELD_FAILED_LINE) outcome = "failed";
              else throw new Error("not ended");
            },
            { timeout: options.recovers ? 6_000 : 1_000 },
          );
        } catch {
          /* Not ended: checked below. */
        }
        return {
          outcome,
          receipt: row.seen.current!.receipt ?? null,
          onConfirmed: row.onConfirmed,
          step: 0,
          hash: row.EXECUTION,
          chain: row.chain,
          sending: () =>
            options.journal === false
              ? null
              : findReviewedSequence(row.scope, ACCOUNT, {
                  storage: row.storage,
                })?.sending,
          writes: () => row.wallet.adapter.sendTransaction.mock.calls.length,
          again: async () => {
            // The Safe service no longer queues the executed proposal.
            row.chain.state.safeNonce += 1n;
            row.chain.state.safeQueue = [];
            return row.run({
              calls: [payCall()],
              ...(options.journal === false ? {} : { scope: row.scope }),
              onConfirmed: row.onConfirmed,
            });
          },
        };
      };
    const rows: [
      string,
      Ended["outcome"],
      (throwing: Failing) => Promise<Ended>,
    ][] = [
      [
        "wallet send, its receipt verified",
        "done",
        (throwing) => sent(throwing, [payCall()], () => false),
      ],
      [
        "wallet send left at its receipt, verified later (ended())",
        "done",
        (throwing) => {
          const gate = { lagging: true };
          return sent(
            throwing,
            [approveCall(), payCall()],
            (hash) => gate.lagging && hash.endsWith("2"),
            recovers(gate),
          );
        },
      ],
      [
        "wallet send whose receipt never verifies",
        "uncertain",
        (throwing) => sent(throwing, [payCall()], () => true, neverReads),
      ],
      [
        "Safe proposal, its execution's receipt verified",
        "done",
        safeRow(Infinity),
      ],
      [
        "Safe proposal, its execution's receipt unreadable",
        "uncertain",
        safeRow(2),
      ],
      [
        "Safe proposal with no journal (no scope), its execution's receipt unreadable",
        "uncertain",
        safeRow(2, { journal: false }),
      ],
      [
        "Safe proposal that failed, its execution's receipt unreadable, then read",
        "failed",
        safeRow(2, { event: "ExecutionFailure", recovers: true }),
      ],
      [
        "resumed sequence",
        "done",
        async (throwing) => {
          reviewUi();
          const { chain, deps, storage, wallet } = setup();
          const send = wallet.adapter.sendTransaction.getMockImplementation()!;
          wallet.adapter.sendTransaction
            .mockImplementationOnce(send)
            .mockRejectedValueOnce(
              Object.assign(new Error("User rejected"), { code: 4001 }),
            );
          const calls = [approveCall(), payCall()];
          const onConfirmed = confirmer(throwing);
          const { seen, run } = harness({
            ...deps,
            account: ACCOUNT,
            ...(throwing ? { onProgress: failing(throwing) } : {}),
          });
          const action = {
            calls,
            scope,
            onConfirmed,
            ...siteCallbacks(throwing),
          };
          await run(action);
          onConfirmed.mockClear();
          const left = await run(action);
          return {
            outcome: outcomeOf(left),
            receipt: seen.current!.receipt ?? null,
            onConfirmed,
            step: 1,
            hash: `0x${"2".padStart(64, "0")}` as ViemHex,
            chain,
            sending: () =>
              findReviewedSequence(scope, ACCOUNT, { storage })?.sending,
            writes: () => wallet.adapter.sendTransaction.mock.calls.length,
            again: () => run(action),
          };
        },
      ],
      [
        "resumption that completes an already-sent final step",
        "done",
        async (throwing) => {
          const gate = { lagging: true };
          const first = await sent(
            throwing,
            [payCall()],
            () => gate.lagging,
            async (left) => {
              expect(left).toMatchObject({ status: "receipt" });
              return "uncertain";
            },
          );
          expect(first.sending()).toMatchObject({ step: 0 });
          // Closed, then reopened once the node reads again: the same action
          // resumes, and settles the step it already sent.
          act(() => root?.unmount());
          gate.lagging = false;
          const onConfirmed = confirmer(throwing);
          const { seen, run } = harness({
            ...first.deps,
            account: ACCOUNT,
            ...(throwing ? { onProgress: failing(throwing) } : {}),
          });
          const action = {
            calls: [payCall()],
            scope,
            onConfirmed,
            ...siteCallbacks(throwing),
          };
          const left = await run(action);
          return {
            ...first,
            outcome: outcomeOf(left),
            receipt: seen.current!.receipt ?? null,
            onConfirmed,
            again: () => run(action),
          };
        },
      ],
      [
        "completion and resumption overlapping (closed and reopened while completion reads the receipt)",
        "done",
        async (throwing) => {
          // Its receipt reads fail at first, so completion reads it again.
          const row = await proposedThenExecuted(2, { throwing });
          let release!: () => void;
          const paused = new Promise<void>((resolve) => (release = resolve));
          let entered = false;
          const read =
            row.chain.client.getTransactionReceipt.getMockImplementation()!;
          row.chain.client.getTransactionReceipt.mockImplementation(
            async (args) => {
              if (!entered && args.hash === row.EXECUTION) {
                entered = true;
                await paused;
              }
              return read(args);
            },
          );
          await vi.waitFor(() => expect(entered).toBe(true), {
            timeout: 6_000,
          });
          // The node reads again, but the first completion's read is still out.
          row.recover();
          act(() => root?.unmount());
          const reopened = harness({
            ...row.deps,
            account: ACCOUNT,
            ...(throwing ? { onProgress: failing(throwing) } : {}),
          });
          const action = {
            calls: [payCall()],
            scope: row.scope,
            onConfirmed: row.onConfirmed,
            ...siteCallbacks(throwing),
          };
          const left = await reopened.run(action);
          // The first completion's read answers only now: it must stay silent.
          await act(async () => {
            release();
            await new Promise((resolve) => setTimeout(resolve, 30));
          });
          return {
            outcome: outcomeOf(left),
            receipt: reopened.seen.current!.receipt ?? null,
            onConfirmed: row.onConfirmed,
            step: 0,
            hash: row.EXECUTION,
            chain: row.chain,
            sending: () =>
              findReviewedSequence(row.scope, ACCOUNT, {
                storage: row.storage,
              })?.sending,
            writes: () => row.wallet.adapter.sendTransaction.mock.calls.length,
            again: () => reopened.run(action),
          };
        },
      ],
      [
        "Safe batch proposal, its execution's receipt verified",
        "done",
        async (throwing) => {
          const row = await proposedThenExecuted(Infinity, {
            calls: [approveCall(), payCall()],
            batch: true,
            throwing,
          });
          await rendered(() => expect(row.seen.current!.phase).toBe("done"));
          return {
            outcome: "done",
            receipt: row.seen.current!.receipt ?? null,
            onConfirmed: row.onConfirmed,
            step: 1,
            hash: row.EXECUTION,
            chain: row.chain,
            sending: () =>
              findReviewedSequence(row.scope, ACCOUNT, {
                storage: row.storage,
              })?.sending,
            writes: () => row.wallet.adapter.sendTransaction.mock.calls.length,
            again: async () => undefined,
          };
        },
      ],
      [
        "wallet send that reverted (an ordinary failure)",
        "failed",
        async (throwing) => {
          reviewUi();
          const { chain, deps, storage, wallet } = setup();
          chain.state.status = "reverted";
          const onConfirmed = confirmer(throwing);
          const { seen, run } = harness({
            ...deps,
            account: ACCOUNT,
            ...(throwing ? { onProgress: failing(throwing) } : {}),
          });
          const action = {
            calls: [payCall()],
            scope,
            onConfirmed,
            ...siteCallbacks(throwing),
          };
          const left = await run(action);
          expect(left).toMatchObject({ status: "failed" });
          return {
            outcome: "failed",
            // The revert its hold verified, carried by the failure.
            receipt:
              (seen.current!.failure as { receipt?: Ended["receipt"] })
                ?.receipt ?? null,
            onConfirmed,
            step: 0,
            hash: `0x${"1".padStart(64, "0")}` as ViemHex,
            chain,
            sending: () =>
              findReviewedSequence(scope, ACCOUNT, { storage })?.sending,
            writes: () => wallet.adapter.sendTransaction.mock.calls.length,
            again: () => run(action),
          };
        },
      ],
      [
        "wallet reply lost, released by the user's exit",
        "released",
        async (throwing) => {
          reviewUi();
          const { chain, deps, storage, wallet } = setup();
          wallet.adapter.sendTransaction.mockRejectedValueOnce(
            new Error("The request took too long to respond."),
          );
          const onConfirmed = confirmer(throwing);
          const { seen, run } = harness({
            ...deps,
            account: ACCOUNT,
            ...(throwing ? { onProgress: failing(throwing) } : {}),
          });
          const action = {
            calls: [payCall()],
            scope,
            onConfirmed,
            ...siteCallbacks(throwing),
          };
          await expect(run(action)).resolves.toMatchObject({
            status: "failed",
          });
          await vi.waitFor(() =>
            expect(seen.current!.exitAction).not.toBeNull(),
          );
          await act(async () => {
            await expect(seen.current!.exitAction!.run()).resolves.toBe(true);
          });
          return {
            outcome: "released",
            receipt: null,
            onConfirmed,
            step: 0,
            hash: `0x${"1".padStart(64, "0")}` as ViemHex,
            chain,
            sending: () =>
              findReviewedSequence(scope, ACCOUNT, { storage })?.sending,
            writes: () => wallet.adapter.sendTransaction.mock.calls.length,
            again: () => run(action),
          };
        },
      ],
    ];

    test.each(
      rows.flatMap(([name, outcome, drive]) =>
        (
          [
            [name, false],
            [`${name}, every site callback throwing`, "throws"],
            [`${name}, every site callback rejecting`, "rejects"],
          ] as const
        ).map(([title, mode]) => [title, outcome, drive, mode] as const),
      ),
    )(
      "%s",
      async (_name, outcome, drive, throwing) => {
        const logged = vi.spyOn(console, "error").mockImplementation(() => {});
        const unhandled: unknown[] = [];
        const onUnhandled = (reason: unknown) => unhandled.push(reason);
        process.on("unhandledRejection", onUnhandled);
        try {
          const ended = await drive(throwing);
          expect(ended.outcome).toBe(outcome);
          const told = ended.onConfirmed.mock.calls.filter(
            ([, step]) => step === ended.step,
          );
          const block =
            ended.chain.state.mined.get(ended.hash.toLowerCase()) ??
            ended.chain.state.mined.get(ended.hash);
          const verified = {
            transactionHash: ended.hash,
            blockHash: numberToHex(block ?? 0n, { size: 32 }),
          };
          if (outcome === "done") {
            expect(told).toHaveLength(1);
            expect(told[0][2]).toMatchObject({
              ...verified,
              status: "success",
            });
            if (ended.receipt) expect(ended.receipt).toMatchObject(verified);
            expect(ended.sending() ?? undefined).toBeUndefined();
          } else if (outcome === "failed") {
            expect(told).toHaveLength(0);
            // The receipt completion checked, though the first reads failed.
            expect(ended.receipt).toMatchObject(verified);
            expect(ended.sending() ?? undefined).toBeUndefined();
          } else if (outcome === "released") {
            expect(told).toHaveLength(0);
            // Released by the user: reviewed and sent once more, never twice.
            const writes = ended.writes();
            await expect(ended.again()).resolves.toMatchObject({
              status: "done",
            });
            expect(ended.writes()).toBe(writes + 1);
          } else {
            expect(told).toHaveLength(0);
            const sending = ended.sending();
            if (sending !== null)
              expect(sending).toMatchObject({ step: ended.step });
            // Closed and opened again: still uncertain, nothing sent twice.
            const writes = ended.writes();
            await ended.again().catch(() => undefined);
            expect(ended.writes()).toBe(writes);
            expect(
              ended.onConfirmed.mock.calls.filter(
                ([, step]) => step === ended.step,
              ),
            ).toHaveLength(0);
          }
          await new Promise((resolve) => setTimeout(resolve, 20));
          // Every failing callback was logged by the guard, none left unhandled.
          if (throwing)
            expect(
              logged.mock.calls.some(([, error]) => error === CALLBACK_FAILURE),
            ).toBe(true);
          expect(unhandled).toEqual([]);
        } finally {
          process.off("unhandledRejection", onUnhandled);
          logged.mockRestore();
        }
      },
      20_000,
    );
  });
});
