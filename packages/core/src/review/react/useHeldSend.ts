import {
  createHeldWriteView,
  type HeldWriteView,
  type HeldWriteViewController,
  type WriteHoldGate,
  type WriteHoldHandle,
} from "../index.js";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { Hex } from "viem";
import {
  actionsOf,
  IDLE,
  idle,
  keyOf,
  none,
  type HeldViewActions,
} from "./heldView.js";
import type { UseHeldWriteOptions } from "./useHeldWrite.js";

/** One send's hold: what useHeldWrite takes up front, known only at send time. */
export type HeldSendInput = Pick<
  UseHeldWriteOptions,
  "chainId" | "account" | "safe" | "namespace" | "legacy"
> & {
  /** The reviewed call this send sends. */
  call: NonNullable<UseHeldWriteOptions["call"]>;
};

export type UseHeldSendOptions = Pick<
  UseHeldWriteOptions,
  "hold" | "client" | "pollMs" | "onSettled" | "onReleased"
> & {
  /** False when the app follows the transaction or proposal itself. */
  follow?: boolean;
};

export type UseHeldSendResult = HeldWriteView &
  HeldViewActions & {
    /** Send `call` under its hold: its intent's (or call's) view, made or reused, shows from now. */
    send: (
      input: HeldSendInput,
      run: (gate: WriteHoldGate) => Promise<Hex>,
    ) => Promise<Hex>;
    /** Ask the chain now about the current send. */
    check: () => Promise<HeldWriteView>;
    /** The current send's hold handle. */
    handle: WriteHoldHandle | undefined;
  };

type Held = { handle: WriteHoldHandle; view: HeldWriteViewController };

/**
 * Held sends whose call is known only at send time (a generic contract write
 * or Safe transaction): each send runs through the held-write view of its
 * intent or exact call, made once and reused, and the result shows the
 * current send's line, notice and exit as {@link useHeldWrite} does. Only
 * the current send's view runs and reaches the app's callbacks.
 */
export function useHeldSend(options: UseHeldSendOptions): UseHeldSendResult {
  const { hold, client, pollMs, follow } = options;
  const latest = useRef(options);
  latest.current = options;
  /** This hold and client's views, by their send's identity. */
  const views = useMemo(
    () => new Map<string, Held>(),
    [hold, client, pollMs, follow],
  );
  const [current, setCurrent] = useState<{
    views: Map<string, Held>;
    held: Held;
  }>();
  // A view of an earlier hold or client shows nothing.
  const held = current?.views === views ? current.held : undefined;
  const view = held?.view;
  /**
   * The one view running, started at its send: a replaced view is stopped
   * then, so only the current send's view ever tells the app anything, and
   * a success it never told stays pending for the gate.
   */
  const running = useRef<
    | {
        views: Map<string, Held>;
        view: HeldWriteViewController;
        stop: () => void;
      }
    | undefined
  >(undefined);
  useEffect(
    () => () => {
      if (running.current?.views !== views) return;
      running.current.stop();
      running.current = undefined;
    },
    [views],
  );
  const shown = useSyncExternalStore(
    view?.subscribe ?? none,
    view?.get ?? idle,
    view?.get ?? idle,
  );
  return {
    ...shown,
    ...actionsOf(shown, view),
    send: (input, run) => {
      if (!client)
        return Promise.reject(
          new Error("Connect a wallet and build the call before sending."),
        );
      const { chainId, account, safe = false, namespace, legacy, call } = input;
      const key = keyOf([
        chainId,
        account.toLowerCase(),
        safe,
        namespace ?? null,
        call,
        legacy ?? null,
      ]);
      let next = views.get(key);
      if (!next) {
        const handle = hold.open(
          { chainId, account, safe, call, ...(namespace ? { namespace } : {}) },
          legacy ? { legacy } : undefined,
        );
        const created: HeldWriteViewController = createHeldWriteView(handle, {
          client,
          pollMs,
          ...(follow === undefined ? {} : { follow }),
          // A stopped view tells no settlement; a late release is dropped here.
          onSettled: (settled, receipt) =>
            latest.current.onSettled?.(settled, receipt),
          onReleased: (by) =>
            running.current?.view === created
              ? latest.current.onReleased?.(by)
              : undefined,
        });
        next = { handle, view: created };
        views.set(key, next);
      }
      if (running.current?.view !== next.view) {
        running.current?.stop();
        running.current = { views, view: next.view, stop: next.view.start() };
      }
      setCurrent({ views, held: next });
      return next.view.send(run);
    },
    check: () => (view ? view.check() : Promise.resolve(IDLE)),
    handle: held?.handle,
  };
}
