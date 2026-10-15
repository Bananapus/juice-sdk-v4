// @vitest-environment jsdom
import {
  HELD_AWAY_SUCCESS_LINE,
  HELD_CONFIRMING_LINE,
  HELD_EXIT_LABEL,
  HELD_RELEASE_LABEL,
  HELD_RELEASED_ELSEWHERE_LINE,
  HELD_RELEASED_LINE,
  HELD_SEND_AGAIN_LABEL,
  WRITE_HOLD_HASHED_EXIT_LINE,
  WRITE_HOLD_IN_TAB_LINE,
  WRITE_HOLD_PENDING_LINE,
  WRITE_HOLD_SAFE_UNPROVEN_LINE,
  createHeldWriteStorage,
  createWriteHold,
  WriteHeldError,
  type WriteHold,
  type WriteHoldClient,
  type WriteHoldState,
} from "../index.js";
import { resetWriteHoldsForTests } from "../../testing.js";
import { act, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { Address, Hex } from "viem";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";
// Through the entry point itself, as apps import it.
import {
  HeldWritesNotice,
  useHeldIntents,
  useHeldWrite,
  useHeldWrites,
  type HeldWriteItem,
  type UseHeldSendResult,
  type UseHeldWriteResult,
  useHeldSend,
} from "./index.js";

const ACCOUNT = "0x1111111111111111111111111111111111111111" as Address;
const HASH = `0x${"aa".repeat(32)}` as Hex;
const OTHER_HASH = `0x${"bb".repeat(32)}` as Hex;
const record = (id = "r1", extra: object = {}) => ({
  version: 1 as const,
  id,
  chainId: 10,
  account: ACCOUNT,
  safe: true,
  hash: HASH,
  call: { to: ACCOUNT, data: "0x" as Hex, value: "0" },
  ...extra,
});
const unproven = (id = "r1"): WriteHoldState =>
  ({
    status: "safe-unproven",
    record: record(id),
    hash: HASH,
    exit: true,
    line: WRITE_HOLD_SAFE_UNPROVEN_LINE,
    warning: WRITE_HOLD_HASHED_EXIT_LINE,
    notice: WRITE_HOLD_IN_TAB_LINE,
    reservation: id,
  }) as WriteHoldState;

/** A hold controller whose handles answer what the test sets, by namespace. */
function fakeHold() {
  const answers = new Map<string, WriteHoldState>();
  const listeners = new Map<string, Set<(state: WriteHoldState) => void>>();
  const opened: unknown[] = [];
  const answer = (key: string) =>
    answers.get(key) ?? ({ status: "clear" } as WriteHoldState);
  const handleOf = (key: string) => ({
    peek: () => answer(key),
    state: vi.fn(
      async (): Promise<WriteHoldState> => ({ ...answer(key), checked: true }),
    ),
    subscribe: (listener: (state: WriteHoldState) => void) => {
      if (!listeners.has(key)) listeners.set(key, new Set());
      listeners.get(key)!.add(listener);
      return () => void listeners.get(key)!.delete(listener);
    },
    exit: vi.fn(async () => {
      answers.set(key, {
        status: "clear",
        reservation: "r1",
      } as WriteHoldState);
      return { released: true, state: answer(key) };
    }),
    send: vi.fn(async () => HASH),
    adopt: vi.fn(async () => answer(key)),
    settlementOf: () => undefined,
    unacknowledgedSuccess: (skip?: (hash: Hex) => boolean) => {
      const now = answer(key);
      return now.status === "clear" &&
        now.settled?.result === "success" &&
        !now.settled.acknowledged &&
        !skip?.(now.settled.hash)
        ? {
            result: "success" as const,
            hash: now.settled.hash,
            reservation: now.reservation,
          }
        : undefined;
    },
    acknowledge: vi.fn(async () => {
      answers.set(key, { status: "clear" } as WriteHoldState);
      return answer(key);
    }),
    onExecuted: vi.fn(),
    onUnproven: vi.fn(),
  });
  const handles = new Map<string, ReturnType<typeof handleOf>>();
  const handle = (key: string) => {
    if (!handles.has(key)) handles.set(key, handleOf(key));
    return handles.get(key)!;
  };
  const listed: { key: string; record: ReturnType<typeof record> }[] = [];
  const hold = {
    open: vi.fn((input: { namespace?: string }) => {
      opened.push(input);
      return handle(input.namespace ?? "exact");
    }),
    list: vi.fn(() =>
      listed.map(({ key, record }) => ({ key, record, handle: handle(key) })),
    ),
  } as unknown as WriteHold & {
    open: ReturnType<typeof vi.fn>;
    list: ReturnType<typeof vi.fn>;
  };
  return {
    hold,
    handle,
    opened,
    listed,
    set: (key: string, state: WriteHoldState) => answers.set(key, state),
    emit: (key: string, state: WriteHoldState) =>
      listeners.get(key)?.forEach((listener) => listener(state)),
  };
}

const client = {
  getTransactionReceipt: vi.fn(async () => null),
} as unknown as WriteHoldClient;

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});
let root: Root | undefined;
let host: HTMLDivElement | undefined;
afterEach(() => {
  act(() => root?.unmount());
  resetWriteHoldsForTests();
  host?.remove();
  root = undefined;
});
async function mount(element: React.ReactElement) {
  host = document.body.appendChild(document.createElement("div"));
  root = createRoot(host);
  await act(async () => root!.render(element));
  await act(async () => {});
  return host;
}

describe("useHeldWrite", () => {
  function Probe(props: {
    options: Parameters<typeof useHeldWrite>[0];
    out: { current?: UseHeldWriteResult };
  }) {
    props.out.current = useHeldWrite(props.options);
    return null;
  }

  test("shows the hold's line and exit, and the exit only releases: the app reopens its review", async () => {
    const fake = fakeHold();
    fake.set("intent:pay", unproven());
    const onReleased = vi.fn();
    const out: { current?: UseHeldWriteResult } = {};
    await mount(
      <Probe
        out={out}
        options={{
          hold: fake.hold,
          chainId: 10,
          account: ACCOUNT,
          safe: true,
          namespace: "intent:pay",
          legacy: [{ call: { to: ACCOUNT, data: "0x" } }],
          client,
          onReleased,
        }}
      />,
    );
    expect(fake.opened[0]).toMatchObject({
      namespace: "intent:pay",
      safe: true,
      call: { to: "0x0000000000000000000000000000000000000000" },
    });
    expect(out.current).toMatchObject({
      phase: "held",
      line: WRITE_HOLD_SAFE_UNPROVEN_LINE,
      warning: WRITE_HOLD_HASHED_EXIT_LINE,
      exit: true,
    });
    expect(out.current!.exitAction?.label).toBe(HELD_EXIT_LABEL);
    await act(async () => {
      await out.current!.exitAction!.run();
    });
    expect(out.current).toMatchObject({
      phase: "released",
      line: HELD_RELEASED_LINE,
      releasedBy: "user",
      exitAction: null,
    });
    expect(onReleased).toHaveBeenCalledWith("user");
    await expect(out.current!.check()).resolves.toMatchObject({
      phase: "released",
    });
  });

  test("sends under the hold, then confirms; with no client or no call it holds nothing", async () => {
    const fake = fakeHold();
    const onSettled = vi.fn();
    const onAdopted = vi.fn();
    const out: { current?: UseHeldWriteResult } = {};
    fake.handle("exact").adopt.mockResolvedValueOnce(unproven("r0"));
    const call = { to: ACCOUNT, data: "0x12" as Hex, value: 1n };
    await mount(
      <Probe
        out={out}
        options={{
          hold: fake.hold,
          chainId: 10,
          account: ACCOUNT,
          call,
          client,
          onSettled,
          onAdopted,
          adopt: async () => ({ hash: HASH }),
        }}
      />,
    );
    // The previous deploy's record was adopted into the hold.
    expect(onAdopted).toHaveBeenCalledWith(
      expect.objectContaining({ reservation: "r0" }),
    );
    fake.set("exact", {
      status: "pending-known-hash",
      record: record("r2", { safe: false, submittedAt: String(Date.now()) }),
      hash: HASH,
      exit: false,
      line: "pending",
      reservation: "r2",
    } as WriteHoldState);
    await act(async () => {
      await expect(out.current!.send(async () => HASH)).resolves.toBe(HASH);
    });
    expect(out.current!.phase).toBe("confirming");
    expect(out.current!.line).toBe("pending");
    fake.set("exact", {
      status: "clear",
      reservation: "r2",
      settled: { result: "success", hash: HASH },
    } as WriteHoldState);
    await act(async () => {
      await out.current!.check();
    });
    expect(out.current!.phase).toBe("settled");
    await vi.waitFor(() => expect(onSettled).toHaveBeenCalledOnce());
    // Without a client, or without a call or intent: nothing to hold.
    const idle: { current?: UseHeldWriteResult } = {};
    act(() => root!.unmount());
    host!.remove();
    await mount(
      <Probe
        out={idle}
        options={{
          hold: fake.hold,
          chainId: 10,
          account: ACCOUNT,
          client: undefined,
          call,
        }}
      />,
    );
    expect(idle.current).toMatchObject({ phase: "clear", exitAction: null });
    await expect(idle.current!.send(async () => HASH)).rejects.toThrow(
      "Connect a wallet",
    );
    await expect(idle.current!.check()).resolves.toMatchObject({
      phase: "clear",
    });
    act(() => root!.unmount());
    host!.remove();
    const nothing: { current?: UseHeldWriteResult } = {};
    await mount(
      <Probe
        out={nothing}
        options={{ hold: fake.hold, chainId: 10, account: ACCOUNT, client }}
      />,
    );
    expect(nothing.current!.handle).toBeUndefined();
  });

  test("a confirming Safe write never goes back to awaiting, and another window's release is neutral", async () => {
    const fake = fakeHold();
    fake.set("intent:x", {
      status: "pending-known-hash",
      record: record("r3", { candidates: [HASH] }),
      hash: HASH,
      exit: false,
      line: "awaiting",
      reservation: "r3",
    } as WriteHoldState);
    const out: { current?: UseHeldWriteResult } = {};
    await mount(
      <Probe
        out={out}
        options={{
          hold: fake.hold,
          chainId: 10,
          account: ACCOUNT,
          safe: true,
          namespace: "intent:x",
          client,
        }}
      />,
    );
    expect(out.current).toMatchObject({
      phase: "confirming",
      line: HELD_CONFIRMING_LINE,
    });
    await act(async () => {
      fake.emit("intent:x", { status: "clear" } as WriteHoldState);
    });
    expect(out.current).toMatchObject({
      phase: "released",
      line: HELD_RELEASED_ELSEWHERE_LINE,
      releasedBy: "other-tab",
    });
  });
});

describe("useHeldWrite on a success settled while away", () => {
  function Probe(props: {
    options: Parameters<typeof useHeldWrite>[0];
    out: { current?: UseHeldWriteResult };
  }) {
    props.out.current = useHeldWrite(props.options);
    return null;
  }

  test("blocks until the user chooses to send it again, then sends", async () => {
    const fake = fakeHold();
    fake.set("intent:away", {
      status: "clear",
      reservation: "rw",
      settled: { result: "success", hash: HASH },
    } as WriteHoldState);
    const out: { current?: UseHeldWriteResult } = {};
    const onSettled = vi.fn();
    await mount(
      <Probe
        out={out}
        options={{
          hold: fake.hold,
          chainId: 10,
          account: ACCOUNT,
          namespace: "intent:away",
          client,
          onSettled,
        }}
      />,
    );
    expect(out.current).toMatchObject({
      phase: "succeeded",
      line: HELD_AWAY_SUCCESS_LINE,
      sendAgainAction: { label: HELD_SEND_AGAIN_LABEL },
    });
    await act(async () => {
      await expect(out.current!.send(async () => HASH)).rejects.toThrow(
        HELD_AWAY_SUCCESS_LINE,
      );
    });
    await act(async () => {
      await out.current!.sendAgainAction!.run();
    });
    expect(out.current).toMatchObject({
      phase: "clear",
      sendAgainAction: null,
    });
    await act(async () => {
      await expect(out.current!.send(async () => HASH)).resolves.toBe(HASH);
    });
    expect(onSettled).not.toHaveBeenCalled();
  });
});

describe("useHeldWrite with legacy calls that carry a value", () => {
  test("renders in StrictMode with a bigint value in its legacy keys", async () => {
    const fake = fakeHold();
    const out: { current?: UseHeldWriteResult } = {};
    function Probe() {
      out.current = useHeldWrite({
        hold: fake.hold,
        chainId: 10,
        account: ACCOUNT,
        namespace: "intent:valued",
        legacy: [{ call: { to: ACCOUNT, data: "0x12", value: 5n } }],
        client,
      });
      return null;
    }
    await mount(
      <StrictMode>
        <Probe />
      </StrictMode>,
    );
    expect(out.current?.phase).toBe("clear");
  });
});

describe("useHeldWrite across changes (Codex 4, 6)", () => {
  function Probe(props: {
    options: Parameters<typeof useHeldWrite>[0];
    out: { current?: UseHeldWriteResult };
  }) {
    props.out.current = useHeldWrite(props.options);
    return null;
  }

  test("adopts with a provider added after mount before it sends", async () => {
    const fake = fakeHold();
    const out: { current?: UseHeldWriteResult } = {};
    const base = {
      hold: fake.hold,
      chainId: 10,
      account: ACCOUNT,
      namespace: "intent:late",
      client,
    };
    await mount(<Probe out={out} options={base} />);
    const adopt = vi.fn(async () => ({ hash: HASH }));
    const before = out.current!.send;
    await act(async () =>
      root!.render(<Probe out={out} options={{ ...base, adopt }} />),
    );
    // A send from before the provider arrived refuses: it never skips adoption.
    await expect(before(async () => HASH)).rejects.toThrow(
      "Saved transactions are still being checked",
    );
    await act(async () => {
      await out.current!.send(async () => HASH).catch(() => undefined);
    });
    expect(adopt).toHaveBeenCalledOnce();
    expect(fake.handle("intent:late").adopt).toHaveBeenCalled();
  });

  test("never hands action A's late settlement to action B's callback", async () => {
    const fake = fakeHold();
    fake.set("intent:a", unproven("ra"));
    const out: { current?: UseHeldWriteResult } = {};
    const onSettledA = vi.fn();
    const onSettledB = vi.fn();
    const base = { hold: fake.hold, chainId: 10, account: ACCOUNT, client };
    await mount(
      <Probe
        out={out}
        options={{ ...base, namespace: "intent:a", onSettled: onSettledA }}
      />,
    );
    // A's read is in flight when the app moves to action B.
    let answer!: (state: WriteHoldState) => void;
    fake
      .handle("intent:a")
      .state.mockImplementationOnce(
        () => new Promise<WriteHoldState>((resolve) => (answer = resolve)),
      );
    const late = out.current!.check();
    await act(async () =>
      root!.render(
        <Probe
          out={out}
          options={{ ...base, namespace: "intent:b", onSettled: onSettledB }}
        />,
      ),
    );
    await act(async () => {
      answer({
        status: "clear",
        reservation: "ra",
        settled: { result: "success", hash: HASH },
      } as WriteHoldState);
      await late;
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(onSettledB).not.toHaveBeenCalled();
    expect(onSettledA).not.toHaveBeenCalled();
    // Action A's exit taken after the move releases A, and tells no one.
    const onReleased = vi.fn();
    fake.set("intent:c", unproven("rc"));
    await act(async () =>
      root!.render(
        <Probe
          out={out}
          options={{ ...base, namespace: "intent:c", onReleased }}
        />,
      ),
    );
    const exitC = out.current!.exitAction!.run;
    await act(async () =>
      root!.render(
        <Probe
          out={out}
          options={{ ...base, namespace: "intent:d", onReleased }}
        />,
      ),
    );
    await act(async () => {
      await exitC();
    });
    expect(fake.handle("intent:c").exit).toHaveBeenCalled();
    expect(onReleased).not.toHaveBeenCalled();
  });
});

describe("the app-wide notice of held writes", () => {
  function Notice(props: { use: () => HeldWriteItem[] }) {
    return <HeldWritesNotice className="held" items={props.use()} />;
  }

  test("shows a fixed set of actions' holds with their labels, and releases one", async () => {
    const fake = fakeHold();
    fake.set("intent:pay", unproven());
    fake.set("intent:unlabeled", {
      status: "pending-known-hash",
      record: record("r6", { safe: false, submittedAt: String(Date.now()) }),
      hash: HASH,
      exit: false,
      line: WRITE_HOLD_PENDING_LINE,
      reservation: "r6",
    } as WriteHoldState);
    const view = await mount(
      <Notice
        use={() =>
          useHeldIntents({
            hold: fake.hold,
            chainId: 10,
            account: ACCOUNT,
            client,
            intents: [
              { namespace: "intent:pay", label: "Pay" },
              { namespace: "intent:cash-out", label: "Cash out" },
              { namespace: "intent:unlabeled" },
            ],
          })
        }
      />,
    );
    const status = view.querySelector('[role="status"]')!;
    expect(status.className).toBe("held");
    expect(status.textContent).toContain("Pay");
    expect(status.textContent).not.toContain("Cash out");
    expect(status.querySelectorAll("[data-phase]")).toHaveLength(2);
    expect(status.textContent).toContain(HELD_CONFIRMING_LINE);
    expect(status.textContent).toContain(WRITE_HOLD_SAFE_UNPROVEN_LINE);
    expect(status.textContent).toContain(WRITE_HOLD_HASHED_EXIT_LINE);
    expect(status.textContent).toContain(WRITE_HOLD_IN_TAB_LINE);
    const button = status.querySelector("button")!;
    expect(button.textContent).toBe(HELD_RELEASE_LABEL);
    await act(async () => {
      button.click();
    });
    expect(fake.handle("intent:pay").exit).toHaveBeenCalledOnce();
    expect(view.textContent).toContain(HELD_RELEASED_LINE);
    expect(view.querySelector("button")).toBeNull();
  });

  test("lists every held write for the account, again on another window's change, and none without an account", async () => {
    vi.useFakeTimers();
    const fake = fakeHold();
    fake.listed.push({ key: "k1", record: record("r5") });
    fake.set("k1", unproven("r5"));
    const label = vi.fn(() => "Payer");
    const view = await mount(
      <Notice
        use={() =>
          useHeldWrites({
            hold: fake.hold,
            chainId: 10,
            account: ACCOUNT,
            client,
            label,
          })
        }
      />,
    );
    expect(fake.hold.list).toHaveBeenCalledWith({
      account: ACCOUNT,
      chainId: 10,
    });
    expect(view.textContent).toContain("Payer");
    const lists = fake.hold.list.mock.calls.length;
    await act(async () => {
      window.dispatchEvent(new Event("storage"));
    });
    expect(fake.hold.list.mock.calls.length).toBeGreaterThan(lists);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    act(() => root!.unmount());
    host!.remove();
    vi.useRealTimers();
    const empty = await mount(
      <Notice
        use={() =>
          useHeldWrites({
            hold: fake.hold,
            chainId: 10,
            account: undefined,
            client,
          })
        }
      />,
    );
    expect(empty.textContent).toBe("");
    act(() => root!.unmount());
    host!.remove();
    const noAccount = await mount(
      <Notice
        use={() =>
          useHeldIntents({
            hold: fake.hold,
            chainId: 10,
            account: undefined,
            client: undefined,
            intents: [{ namespace: "intent:pay" }],
          })
        }
      />,
    );
    expect(noAccount.textContent).toBe("");
  });
});

describe("useHeldSend", () => {
  function Probe(props: {
    options: Parameters<typeof useHeldSend>[0];
    out: { current?: UseHeldSendResult };
  }) {
    props.out.current = useHeldSend(props.options);
    return null;
  }
  const call = { to: ACCOUNT, data: "0x12" as Hex, value: 1n };
  const input = (namespace: string) => ({
    chainId: 10,
    account: ACCOUNT,
    safe: true,
    namespace,
    call,
  });

  test("holds each send by its intent, one view per intent, showing the current one", async () => {
    const fake = fakeHold();
    const onReleased = vi.fn();
    const onSettled = vi.fn();
    const out: { current?: UseHeldSendResult } = {};
    await mount(
      <Probe
        out={out}
        options={{ hold: fake.hold, client, onReleased, onSettled }}
      />,
    );
    expect(out.current).toMatchObject({ phase: "clear", exitAction: null });
    expect(out.current!.handle).toBeUndefined();
    await expect(out.current!.check()).resolves.toMatchObject({
      phase: "clear",
    });
    // A's call is known only now: its view is made at the send.
    fake.set("intent:a", unproven());
    const legacy = [{ call: { to: ACCOUNT, data: "0x" as Hex } }];
    await act(async () => {
      await expect(
        out.current!.send({ ...input("intent:a"), legacy }, async () => HASH),
      ).resolves.toBe(HASH);
    });
    expect(fake.hold.open).toHaveBeenCalledWith(
      expect.objectContaining({ namespace: "intent:a", safe: true, call }),
      { legacy },
    );
    expect(out.current).toMatchObject({
      phase: "held",
      notice: WRITE_HOLD_IN_TAB_LINE,
      exit: true,
    });
    expect(out.current!.handle).toBe(fake.handle("intent:a"));
    // The same intent again: the same view.
    await act(async () => {
      await out.current!.send(
        { ...input("intent:a"), legacy },
        async () => HASH,
      );
    });
    expect(fake.hold.open).toHaveBeenCalledTimes(1);
    expect(out.current!.exitAction?.label).toBe(HELD_EXIT_LABEL);
    await act(async () => {
      await out.current!.exitAction!.run();
    });
    expect(out.current).toMatchObject({
      phase: "released",
      releasedBy: "user",
    });
    expect(onReleased).toHaveBeenCalledWith("user");
    // Another intent: its own view, shown now.
    fake.set("intent:b", unproven("r5"));
    await act(async () => {
      await out.current!.send(input("intent:b"), async () => HASH);
    });
    expect(fake.hold.open).toHaveBeenCalledTimes(2);
    expect(out.current).toMatchObject({ phase: "held", exit: true });
    fake.set("intent:b", {
      status: "clear",
      reservation: "r5",
      settled: { result: "success", hash: HASH },
    } as WriteHoldState);
    await act(async () => {
      await out.current!.check();
    });
    expect(out.current!.phase).toBe("settled");
    await vi.waitFor(() =>
      expect(onSettled).toHaveBeenCalledWith(
        { result: "success", hash: HASH },
        null,
      ),
    );
  });

  test("blocks on a success its exact call settled while away until the user sends it again", async () => {
    const fake = fakeHold();
    const out: { current?: UseHeldSendResult } = {};
    // No intent: held by its exact call.
    const exact = { chainId: 10, account: ACCOUNT, call };
    await mount(
      <Probe out={out} options={{ hold: fake.hold, client, follow: false }} />,
    );
    fake.set("exact", {
      status: "clear",
      reservation: "r7",
      settled: { result: "success", hash: HASH },
    } as WriteHoldState);
    await act(async () => {
      await expect(out.current!.send(exact, async () => HASH)).rejects.toThrow(
        HELD_AWAY_SUCCESS_LINE,
      );
    });
    expect(out.current!.phase).toBe("succeeded");
    expect(out.current!.sendAgainAction?.label).toBe(HELD_SEND_AGAIN_LABEL);
    await act(async () => {
      await out.current!.sendAgainAction!.run();
    });
    await act(async () => {
      await expect(out.current!.send(exact, async () => HASH)).resolves.toBe(
        HASH,
      );
    });
  });

  test("a view replaced before React shows it leaves its success pending, told when it shows again", async () => {
    const fake = fakeHold();
    const onSettled = vi.fn();
    const out: { current?: UseHeldSendResult } = {};
    await mount(
      <Probe out={out} options={{ hold: fake.hold, client, onSettled }} />,
    );
    const settled = {
      status: "clear",
      reservation: "r1",
      settled: { result: "success", hash: HASH },
    } as WriteHoldState;
    // A's send sees its own hold settle while B replaces it.
    fake.handle("intent:a").send.mockImplementationOnce(async () => {
      fake.emit("intent:a", unproven());
      fake.set("intent:a", settled);
      fake.emit("intent:a", settled);
      return HASH;
    });
    await act(async () => {
      const a = out.current!.send(input("intent:a"), async () => HASH);
      const b = out.current!.send(input("intent:b"), async () => HASH);
      await Promise.all([a, b]);
    });
    await act(async () => {});
    expect(onSettled).not.toHaveBeenCalled();
    expect(fake.handle("intent:a").acknowledge).not.toHaveBeenCalled();
    // A again: the gate still sees the success, and A's view tells it now.
    await act(async () => {
      await expect(
        out.current!.send(input("intent:a"), async () => HASH),
      ).rejects.toThrow(HELD_AWAY_SUCCESS_LINE);
    });
    await vi.waitFor(() =>
      expect(onSettled).toHaveBeenCalledWith(
        { result: "success", hash: HASH },
        null,
      ),
    );
    expect(onSettled).toHaveBeenCalledTimes(1);
    expect(fake.handle("intent:a").acknowledge).toHaveBeenCalledTimes(1);
  });

  /** A real hold over this tab's own memory, and a chain where nothing is mined unless told. */
  function realHold() {
    const hold = createWriteHold({
      storage: createHeldWriteStorage({
        durable: () => undefined,
        memory: new Map(),
      }),
    });
    const mined = new Map<string, bigint>();
    const missing = (name: string) =>
      Object.assign(new Error("not found"), { name });
    const chain = {
      getChainId: async () => 10,
      getBlockNumber: async () => (mined.size ? 120n : 100n),
      getTransactionCount: async (args: { blockTag?: string }) =>
        7 + (args.blockTag === "pending" ? 0 : mined.size),
      getTransaction: async ({ hash }: { hash: Hex }) => {
        const block = mined.get(hash);
        if (block === undefined) throw missing("TransactionNotFoundError");
        return {
          hash,
          from: ACCOUNT,
          nonce: 7,
          to: ACCOUNT,
          input: "0x12",
          value: 1n,
          blockNumber: block,
          blockHash: `0x${"11".repeat(32)}`,
          transactionIndex: 0,
        };
      },
      getTransactionReceipt: async ({ hash }: { hash: Hex }) => {
        const block = mined.get(hash);
        if (block === undefined)
          throw missing("TransactionReceiptNotFoundError");
        return {
          transactionHash: hash,
          status: "success",
          blockNumber: block,
          blockHash: `0x${"11".repeat(32)}`,
          transactionIndex: 0,
          from: ACCOUNT,
          to: ACCOUNT,
          logs: [],
        };
      },
      getBlock: async (
        args: { blockTag?: string; blockNumber?: bigint } = {},
      ) => ({
        number: args.blockNumber ?? (mined.size ? 120n : 100n),
        hash: `0x${"11".repeat(32)}`,
        timestamp: 1_000n,
        transactions: [],
      }),
    } as unknown as WriteHoldClient;
    return { hold, chain, mined };
  }
  const exactOf = { chainId: 10, account: ACCOUNT, safe: false, call };

  test("a real hold refuses a send while its write is held, and the wallet never opens", async () => {
    const { hold, chain } = realHold();
    const out: { current?: UseHeldSendResult } = {};
    await mount(
      <Probe out={out} options={{ hold, client: chain, follow: false }} />,
    );
    // The wallet's reply is lost after it may have sent: held, no hash.
    await act(async () => {
      await expect(
        out.current!.send(exactOf, async (gate) => {
          await gate.beforeSend();
          throw new Error("reply lost");
        }),
      ).rejects.toThrow("reply lost");
    });
    expect(out.current!.phase).toBe("held");
    const wallet = vi.fn(async () => HASH);
    await act(async () => {
      await expect(
        out.current!.send(exactOf, async (gate) => {
          await gate.beforeSend();
          return wallet();
        }),
      ).rejects.toBeInstanceOf(WriteHeldError);
    });
    expect(wallet).not.toHaveBeenCalled();
    expect(out.current).toMatchObject({ phase: "held", exit: true });
  });

  test("a real hold asks again at the reservation: a success saved meanwhile stops the send", async () => {
    const { hold, chain, mined } = realHold();
    const out: { current?: UseHeldSendResult } = {};
    await mount(
      <Probe out={out} options={{ hold, client: chain, follow: false }} />,
    );
    const wallet = vi.fn(async () => HASH);
    // An intent's send lets its lock go while the app reviews.
    const pay = { ...exactOf, namespace: "intent:pay" };
    await act(async () => {
      await expect(
        out.current!.send(pay, async (gate) => {
          // Meanwhile another flow's write of this intent succeeds.
          const other = hold.open(pay);
          await other.send(chain, async (inner) => {
            await inner.beforeSend();
            inner.afterSubmit(OTHER_HASH);
          });
          mined.set(OTHER_HASH, 105n);
          await other.state(chain);
          await gate.beforeSend();
          return wallet();
        }),
      ).rejects.toThrow(HELD_AWAY_SUCCESS_LINE);
    });
    expect(wallet).not.toHaveBeenCalled();
  });

  test("a real hold's view still hears the hold after a send", async () => {
    const { hold, chain, mined } = realHold();
    const out: { current?: UseHeldSendResult } = {};
    await mount(
      <Probe out={out} options={{ hold, client: chain, follow: false }} />,
    );
    await act(async () => {
      await out.current!.send(exactOf, async (gate) => {
        await gate.beforeSend();
        gate.afterSubmit(HASH);
        return HASH;
      });
    });
    await act(async () => {});
    expect(out.current!.phase).toBe("confirming");
    // Mined later: the hold's own read reaches the started view.
    mined.set(HASH, 105n);
    await act(async () => {
      await out.current!.handle!.state(chain);
    });
    expect(out.current!.phase).toBe("settled");
  });

  test("a real hold's view asks the chain once more after each send", async () => {
    const { hold, chain, mined } = realHold();
    const out: { current?: UseHeldSendResult } = {};
    await mount(
      <Probe out={out} options={{ hold, client: chain, follow: false }} />,
    );
    await act(async () => {
      await out.current!.send(exactOf, async (gate) => {
        // The view's first read is done before the wallet opens.
        await new Promise((resolve) => setTimeout(resolve, 0));
        await gate.beforeSend();
        gate.afterSubmit(HASH);
        mined.set(HASH, 105n);
        return HASH;
      });
    });
    await act(async () => {});
    expect(out.current!.phase).toBe("settled");
  });

  test("a real hold's send withdrawn before the wallet is never another window's release", async () => {
    const { hold, chain } = realHold();
    const onReleased = vi.fn();
    const out: { current?: UseHeldSendResult } = {};
    await mount(
      <Probe
        out={out}
        options={{ hold, client: chain, follow: false, onReleased }}
      />,
    );
    await act(async () => {
      await expect(
        out.current!.send(exactOf, async (gate) => {
          await gate.beforeSend();
          gate.onRejected();
          throw new Error("wallet never opened");
        }),
      ).rejects.toThrow("wallet never opened");
    });
    await act(async () => {});
    expect(out.current).toMatchObject({ phase: "clear", line: null });
    expect(out.current!.releasedBy).toBeUndefined();
    // Again with the view's own reads long done: still its own withdrawal.
    await act(async () => {
      await expect(
        out.current!.send(exactOf, async (gate) => {
          await new Promise((resolve) => setTimeout(resolve, 0));
          await gate.beforeSend();
          gate.onRejected();
          throw new Error("wallet never opened");
        }),
      ).rejects.toThrow("wallet never opened");
    });
    await act(async () => {});
    expect(out.current).toMatchObject({ phase: "clear", line: null });
    expect(onReleased).not.toHaveBeenCalled();
  });

  test("a replaced view's late answers reach no callback, and a new hold or no client starts over", async () => {
    const fake = fakeHold();
    const onReleased = vi.fn();
    const out: { current?: UseHeldSendResult } = {};
    const props = { hold: fake.hold, client, onReleased };
    await mount(<Probe out={out} options={props} />);
    fake.set("intent:a", unproven());
    let finish: (hash: Hex) => void = () => {};
    fake
      .handle("intent:a")
      .send.mockImplementationOnce(
        () => new Promise<Hex>((resolve) => (finish = resolve)),
      );
    let first: Promise<Hex> | undefined;
    await act(async () => {
      first = out.current!.send(input("intent:a"), async () => HASH);
    });
    // B replaces A while A's send is still out.
    await act(async () => {
      await out.current!.send(input("intent:b"), async () => HASH);
    });
    // Another window releases A: A's view says so, to no one.
    fake.set("intent:a", {
      status: "clear",
      reservation: "r1",
    } as WriteHoldState);
    await act(async () => {
      finish(HASH);
      await first;
    });
    expect(onReleased).not.toHaveBeenCalled();
    // A new hold controller: nothing of the old one shows.
    const other = fakeHold();
    await act(async () =>
      root!.render(
        <Probe out={out} options={{ ...props, hold: other.hold }} />,
      ),
    );
    expect(out.current!.handle).toBeUndefined();
    await act(async () =>
      root!.render(
        <Probe
          out={out}
          options={{ ...props, hold: other.hold, client: undefined }}
        />,
      ),
    );
    await expect(
      out.current!.send(input("intent:a"), async () => HASH),
    ).rejects.toThrow("Connect a wallet");
  });
});
