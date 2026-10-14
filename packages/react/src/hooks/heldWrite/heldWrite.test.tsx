// @vitest-environment jsdom
import {
  HELD_CONFIRMING_LINE,
  HELD_EXIT_LABEL,
  HELD_RELEASE_LABEL,
  HELD_RELEASED_ELSEWHERE_LINE,
  HELD_RELEASED_LINE,
  WRITE_HOLD_HASHED_EXIT_LINE,
  WRITE_HOLD_IN_TAB_LINE,
  WRITE_HOLD_PENDING_LINE,
  WRITE_HOLD_SAFE_UNPROVEN_LINE,
  type WriteHold,
  type WriteHoldClient,
  type WriteHoldState,
} from "@bananapus/nana-sdk-core/review";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { Address, Hex } from "viem";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import { HeldWritesNotice } from "./HeldWritesNotice";
import { useHeldWrite, type UseHeldWriteResult } from "./useHeldWrite";
import {
  useHeldIntents,
  useHeldWrites,
  type HeldWriteItem,
} from "./useHeldWrites";

const ACCOUNT = "0x1111111111111111111111111111111111111111" as Address;
const HASH = `0x${"aa".repeat(32)}` as Hex;
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
    state: vi.fn(async () => ({ ...answer(key), checked: true })),
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
