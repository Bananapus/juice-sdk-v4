// @vitest-environment jsdom
import {
  SAVED_ATTEMPT_CHECK_LINE,
  SAVED_ATTEMPT_CHECK_WARNING,
  type SavedAttempt,
  type SavedAttemptOutcome,
  type SavedAttemptRecovery,
  type WriteHoldClient,
} from "@bananapus/nana-sdk-core/review";
import { act, StrictMode, useLayoutEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { Address } from "viem";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import {
  useSavedAttempt,
  type UseSavedAttemptOptions,
  type UseSavedAttemptResult,
} from "./useSavedAttempt";

const ACCOUNT = "0x1111111111111111111111111111111111111111" as Address;
const check: SavedAttemptOutcome<string> = {
  status: "check",
  reason: "unknown",
  line: SAVED_ATTEMPT_CHECK_LINE,
  warning: SAVED_ATTEMPT_CHECK_WARNING,
  evidence: "e1",
};
const attemptOf = (namespace = "launch:a"): SavedAttempt<string> => ({
  chainId: 10,
  account: ACCOUNT,
  namespaces: [namespace],
  saved: { started: true, nonce: 7n },
  authenticate: async () => ({ result: "unknown" }),
});

/** A recovery whose answers the test releases one by one. */
function fakeRecovery() {
  const pending: ((outcome: SavedAttemptOutcome<string>) => void)[] = [];
  const recovery = {
    recover: vi.fn(
      () =>
        new Promise<SavedAttemptOutcome<string>>((resolve) =>
          pending.push(resolve),
        ),
    ),
    retire: vi.fn(
      async (): Promise<Retired> => ({ retired: true, durable: true }),
    ),
    canDiscard: vi.fn(() => true),
  };
  return {
    recovery: recovery as unknown as SavedAttemptRecovery & typeof recovery,
    answer: async (outcome: SavedAttemptOutcome<string>) => {
      await act(async () => pending.shift()!(outcome));
    },
  };
}

const client = {} as WriteHoldClient;
type Retired = Awaited<ReturnType<SavedAttemptRecovery["retire"]>>;

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});
let root: Root | undefined;
afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
});

function harness(initial: UseSavedAttemptOptions<string>) {
  const seen: { current?: UseSavedAttemptResult<string> } = {};
  function Probe(props: UseSavedAttemptOptions<string>) {
    seen.current = useSavedAttempt(props);
    return null;
  }
  root = createRoot(document.createElement("div"));
  const render = async (props: UseSavedAttemptOptions<string>) => {
    await act(async () => root!.render(<Probe {...props} />));
  };
  return { seen, render, start: () => render(initial) };
}

describe("useSavedAttempt", () => {
  test("recovers on mount and offers the one check action, which retires and recovers again", async () => {
    const { recovery, answer } = fakeRecovery();
    const attempt = attemptOf();
    const { seen, start } = harness({
      recovery,
      attempt,
      client,
      checkNext: "Create again",
    });
    await start();
    expect(seen.current!.recovering).toBe(true);
    expect(seen.current!.outcome).toBeNull();
    await answer(check);
    expect(seen.current!.recovering).toBe(false);
    expect(seen.current!.checkAction).toMatchObject({
      line: SAVED_ATTEMPT_CHECK_LINE,
      warning: SAVED_ATTEMPT_CHECK_WARNING,
      label: "I checked it. Create again.",
    });
    let ran!: Promise<Retired>;
    await act(async () => {
      ran = seen.current!.checkAction!.run();
    });
    expect(recovery.retire).toHaveBeenCalledWith(attempt, {
      by: "check",
      outcome: check,
    });
    await answer({ status: "none", retired: "check" });
    expect(await ran).toEqual({ retired: true, durable: true });
    expect(seen.current!.outcome).toEqual({ status: "none", retired: "check" });
    expect(seen.current!.checkAction).toBeNull();
  });

  test("labels the check action 'Review it again' by default", async () => {
    const { recovery, answer } = fakeRecovery();
    const { seen, start } = harness({
      recovery,
      attempt: attemptOf(),
      client,
    });
    await start();
    await answer(check);
    expect(seen.current!.checkAction!.label).toBe(
      "I checked it. Review it again.",
    );
  });

  test("never lets an earlier attempt's late answer reach the current one", async () => {
    const { recovery, answer } = fakeRecovery();
    const { seen, start, render } = harness({
      recovery,
      attempt: attemptOf("launch:a"),
      client,
    });
    await start();
    await render({ recovery, attempt: attemptOf("launch:b"), client });
    expect(recovery.recover).toHaveBeenCalledTimes(2);
    await answer(check); // launch:a's, late
    expect(seen.current!.outcome).toBeNull();
    await answer({ status: "none" });
    expect(seen.current!.outcome).toEqual({ status: "none" });
    // The same attempt rendered again (a new authenticate) recovers nothing new.
    await render({ recovery, attempt: attemptOf("launch:b"), client });
    expect(recovery.recover).toHaveBeenCalledTimes(2);
  });

  test("does nothing without an attempt or a client, and recovers on demand", async () => {
    const { recovery, answer } = fakeRecovery();
    const { seen, start, render } = harness({
      recovery,
      attempt: null,
      client,
    });
    await start();
    expect(recovery.recover).not.toHaveBeenCalled();
    expect(await seen.current!.retire({ by: "exit" })).toEqual({
      retired: false,
    });
    expect(recovery.retire).not.toHaveBeenCalled();
    await render({ recovery, attempt: attemptOf(), client: undefined });
    expect(recovery.recover).not.toHaveBeenCalled();
    await render({ recovery, attempt: attemptOf(), client });
    await answer({ status: "none" });
    let again!: Promise<SavedAttemptOutcome<string> | null>;
    await act(async () => {
      again = seen.current!.recover();
    });
    expect(seen.current!.recovering).toBe(true);
    await answer({
      status: "done",
      result: "failed",
      hash: `0x${"aa".repeat(32)}`,
    });
    expect(await again).toMatchObject({ status: "done" });
  });

  test("retires a followed settlement and skips recovering again once the attempt changed", async () => {
    const { recovery, answer } = fakeRecovery();
    let release!: (value: Retired) => void;
    recovery.retire.mockImplementationOnce(
      () => new Promise<Retired>((resolve) => (release = resolve)),
    );
    const { seen, start, render } = harness({
      recovery,
      attempt: attemptOf("launch:a"),
      client,
    });
    await start();
    await answer({
      status: "done",
      result: "success",
      authenticated: true,
      value: "p",
    });
    let retired!: Promise<Retired>;
    await act(async () => {
      retired = seen.current!.retire({ by: "settled" });
    });
    await render({ recovery, attempt: attemptOf("launch:b"), client });
    await act(async () => release({ retired: true, durable: true }));
    expect(await retired).toEqual({ retired: true, durable: true });
    // Only launch:a's mount and launch:b's: the retirement didn't recover the old one again.
    expect(recovery.recover).toHaveBeenCalledTimes(2);
  });

  test("never shows one attempt's outcome for the next, even while it recovers", async () => {
    const { recovery, answer } = fakeRecovery();
    const { seen, start, render } = harness({
      recovery,
      attempt: attemptOf("launch:a"),
      client,
    });
    await start();
    await answer(check);
    expect(seen.current!.checkAction).not.toBeNull();
    await render({ recovery, attempt: attemptOf("launch:b"), client });
    expect(seen.current!.outcome).toBeNull();
    expect(seen.current!.checkAction).toBeNull();
    expect(seen.current!.recovering).toBe(true);
  });

  // Review 3: a retire captured for attempt A never retires attempt B.
  test("refuses a stale retire callback before anything is saved", async () => {
    const { recovery, answer } = fakeRecovery();
    const { seen, start, render } = harness({
      recovery,
      attempt: attemptOf("launch:a"),
      client,
    });
    await start();
    await answer({
      status: "done",
      result: "success",
      authenticated: true,
      value: "a",
    });
    const retireA = seen.current!.retire;
    await render({ recovery, attempt: attemptOf("launch:b"), client });
    await answer(check);
    let result!: Retired;
    await act(async () => {
      result = await retireA({ by: "settled" });
    });
    expect(result).toEqual({ retired: false });
    expect(recovery.retire).not.toHaveBeenCalled();
    expect(seen.current!.outcome).toEqual(check);
  });

  // Review 4: an older request's answer never replaces a newer one's.
  test("drops an older request answered first, while the latest is pending", async () => {
    const { recovery, answer } = fakeRecovery();
    const { seen, start } = harness({ recovery, attempt: attemptOf(), client });
    await start(); // request 1 (mount), pending
    let second!: Promise<SavedAttemptOutcome<string> | null>;
    await act(async () => {
      second = seen.current!.recover(); // request 2, pending
    });
    expect(recovery.recover).toHaveBeenCalledTimes(2);
    const success: SavedAttemptOutcome<string> = {
      status: "done",
      result: "success",
      authenticated: true,
      value: "ok",
    };
    await answer(check); // request 1's: dropped, request 2 is still pending
    expect(seen.current!.outcome).toBeNull();
    expect(seen.current!.recovering).toBe(true);
    await answer(success);
    expect(await second).toEqual(success);
    expect(seen.current!.outcome).toEqual(success);
  });

  test("answers out of order: an older request finishing last is dropped", async () => {
    const resolvers: ((outcome: SavedAttemptOutcome<string>) => void)[] = [];
    const recovery = {
      recover: vi.fn(
        () =>
          new Promise<SavedAttemptOutcome<string>>((resolve) =>
            resolvers.push(resolve),
          ),
      ),
      retire: vi.fn(),
      canDiscard: vi.fn(),
    } as unknown as SavedAttemptRecovery;
    const { seen, start } = harness({ recovery, attempt: attemptOf(), client });
    await start();
    let second!: Promise<SavedAttemptOutcome<string> | null>;
    await act(async () => {
      second = seen.current!.recover();
    });
    const success: SavedAttemptOutcome<string> = {
      status: "done",
      result: "success",
      authenticated: true,
      value: "ok",
    };
    await act(async () => resolvers[1](success));
    expect(await second).toEqual(success);
    await act(async () => resolvers[0](check));
    expect(seen.current!.outcome).toEqual(success);
    expect(seen.current!.recovering).toBe(false);
  });

  // StrictMode mounts, cleans up and mounts again: the first mount's late answer is dropped.
  test("drops StrictMode's first mount answer and shows the remount's", async () => {
    const resolvers: ((outcome: SavedAttemptOutcome<string>) => void)[] = [];
    const recovery = {
      recover: vi.fn(
        () =>
          new Promise<SavedAttemptOutcome<string>>((resolve) =>
            resolvers.push(resolve),
          ),
      ),
      retire: vi.fn(async () => ({ retired: true, durable: true })),
      canDiscard: vi.fn(),
    } as unknown as SavedAttemptRecovery;
    const seen: { current?: UseSavedAttemptResult<string> } = {};
    const attempt = attemptOf();
    function Probe() {
      seen.current = useSavedAttempt({ recovery, attempt, client });
      return null;
    }
    root = createRoot(document.createElement("div"));
    await act(async () =>
      root!.render(
        <StrictMode>
          <Probe />
        </StrictMode>,
      ),
    );
    expect(resolvers).toHaveLength(2);
    await act(async () => resolvers[1](check));
    await act(async () => resolvers[0]({ status: "none" }));
    expect(seen.current!.outcome).toEqual(check);
    // Its retire still belongs to the mounted lifecycle.
    await act(async () => {
      void seen.current!.checkAction!.run();
    });
    expect(recovery.retire).toHaveBeenCalledWith(attempt, {
      by: "check",
      outcome: check,
    });
  });

  // Review round 2: a child's layout effect runs in B's commit, before any hook effect of B.
  test("refuses a stale retire called from the next attempt's commit phase", async () => {
    const { recovery, answer } = fakeRecovery();
    const seen: { current?: UseSavedAttemptResult<string> } = {};
    let retained: UseSavedAttemptResult<string>["retire"] | undefined;
    const results: Promise<unknown>[] = [];
    function Child({ name }: { name: string }) {
      useLayoutEffect(() => {
        if (name === "launch:b" && retained)
          results.push(retained({ by: "settled" }));
      }, [name]);
      return null;
    }
    function Probe({ name }: { name: string }) {
      seen.current = useSavedAttempt({
        recovery,
        attempt: attemptOf(name),
        client,
      });
      return <Child name={name} />;
    }
    root = createRoot(document.createElement("div"));
    await act(async () => root!.render(<Probe name="launch:a" />));
    await answer({
      status: "done",
      result: "success",
      authenticated: true,
      value: "a",
    });
    retained = seen.current!.retire;
    await act(async () => root!.render(<Probe name="launch:b" />));
    expect(await Promise.all(results)).toEqual([{ retired: false }]);
    expect(recovery.retire).not.toHaveBeenCalled();
  });

  test("lets the current attempt retire from its own commit phase", async () => {
    const { recovery, answer } = fakeRecovery();
    const seen: { current?: UseSavedAttemptResult<string> } = {};
    const results: Promise<unknown>[] = [];
    function Child({
      retire,
    }: {
      retire: UseSavedAttemptResult<string>["retire"];
    }) {
      useLayoutEffect(() => {
        results.push(retire({ by: "exit" }));
      }, [retire]);
      return null;
    }
    function Probe({ name }: { name: string }) {
      seen.current = useSavedAttempt({
        recovery,
        attempt: attemptOf(name),
        client,
      });
      return <Child retire={seen.current.retire} />;
    }
    root = createRoot(document.createElement("div"));
    await act(async () => root!.render(<Probe name="launch:a" />));
    await answer(check);
    await act(async () => root!.render(<Probe name="launch:b" />));
    expect(recovery.retire).toHaveBeenCalledTimes(1);
    expect((recovery.retire.mock.calls[0] as unknown[])[0]).toMatchObject({
      namespaces: ["launch:b"],
    });
  });
});
