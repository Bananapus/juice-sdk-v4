import {
  createHeldWriteView,
  HELD_EXIT_LABEL,
  HELD_SEND_AGAIN_LABEL,
  type HeldWriteEvidence,
  type HeldWriteView,
  type HeldWriteViewController,
  type ReviewedWriteRecoveryInput,
  type WriteHold,
  type WriteHoldClient,
  type WriteHoldGate,
  type WriteHoldHandle,
  type WriteHoldSettled,
  type WriteHoldState,
} from "../index.js";
import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import type { Address, Hex, TransactionReceipt } from "viem";

/** A call stand-in for a hold found by its intent alone, before any call is built. */
const NO_CALL = {
  to: "0x0000000000000000000000000000000000000000" as Address,
  data: "0x" as Hex,
};

export type UseHeldWriteOptions = {
  /** The app's one write hold controller (createWriteHold()). */
  hold: WriteHold;
  chainId: number;
  /** The account that sends: the wallet, or the Safe. */
  account: Address;
  /** Whether `account` is a Safe whose writes are proposals. */
  safe?: boolean;
  /** The action's intent key (payIntent and the other builders). */
  namespace?: string;
  /** Keys an earlier version held this write under. */
  legacy?: Parameters<WriteHold["open"]>[1] extends infer O
    ? O extends { legacy?: infer L }
      ? L
      : never
    : never;
  /** The reviewed call, when built; without one, the hold is found by `namespace`. */
  call?: ReviewedWriteRecoveryInput["call"];
  /** Reads the account's chain. */
  client: WriteHoldClient | undefined;
  /** A previous deploy's saved evidence of this write: adopted before any send. */
  adopt?: () => Promise<HeldWriteEvidence | null | undefined>;
  onAdopted?: (state: WriteHoldState) => void;
  /** The hold settled what this view saw held, on authenticated evidence: once. */
  onSettled?: (
    settled: WriteHoldSettled,
    receipt: TransactionReceipt | null,
  ) => void;
  /** Released: by the user's exit (reopen the review), or by another window. */
  onReleased?: (by: "user" | "other-tab") => void;
  /** How often a held write is asked again (15 s to 60 s, 30 s by default). */
  pollMs?: number;
};

export type UseHeldWriteResult = HeldWriteView & {
  /** The exit the hold offers now, with its label; null when none. */
  exitAction: { label: string; run: () => Promise<boolean> } | null;
  /**
   * On a success settled while away ("This went through while you were
   * away."): the user's choice to send it again. Null otherwise.
   */
  sendAgainAction: { label: string; run: () => Promise<void> } | null;
  /** Send under the hold, once any adoption is done. */
  send: (run: (gate: WriteHoldGate) => Promise<Hex>) => Promise<Hex>;
  /** Ask the chain now. */
  check: () => Promise<HeldWriteView>;
  /** The hold handle, for anything else. */
  handle: WriteHoldHandle | undefined;
};

const IDLE: HeldWriteView = {
  phase: "clear",
  state: null,
  line: null,
  exit: false,
  adopting: false,
};
const none = () => () => {};
/** A value's identity for a memo key, wei amounts (bigints) included. */
const keyOf = (value: unknown) =>
  JSON.stringify(value, (_, field) =>
    typeof field === "bigint" ? `${field}n` : field,
  );
const idle = () => IDLE;

/**
 * One held write, the one way every app runs it: its send under the hold,
 * the watch, the shared follower of its transaction or Safe proposal, its
 * one line, its exit and the adoption of a previous deploy's record.
 *
 * The exit ("I checked my wallet") only releases the hold: `onReleased("user")`
 * is where the app reopens its review, so a resend always shows the values it
 * sends. A release by another window is neutral (`releasedBy: "other-tab"`),
 * and `onSettled` fires only for a settlement of what this view saw held.
 */
export function useHeldWrite(options: UseHeldWriteOptions): UseHeldWriteResult {
  const {
    hold,
    chainId,
    account,
    safe = false,
    namespace,
    client,
    pollMs,
  } = options;
  const callKey = keyOf(options.call ?? null);
  const legacyKey = keyOf(options.legacy ?? null);
  const latest = useRef(options);
  latest.current = options;
  const handle = useMemo(() => {
    const call = latest.current.call;
    if (!call && !namespace) return undefined;
    const legacy = latest.current.legacy;
    return hold.open(
      {
        chainId,
        account,
        safe,
        call: call ?? NO_CALL,
        ...(namespace ? { namespace } : {}),
      },
      legacy ? { legacy } : undefined,
    );
    // The call and legacy keys stand for their values.
  }, [hold, chainId, account, safe, namespace, callKey, legacyKey]);
  // Whether the app has a previous deploy's record to adopt: a change makes a
  // new view, whose adoption runs before any send.
  const adopts = !!options.adopt;
  /** The view whose callbacks are the app's now: an earlier one's late answers reach none. */
  const active = useRef<HeldWriteViewController | undefined>(undefined);
  const view = useMemo(() => {
    if (!handle || !client) return undefined;
    /** Only while this view is the app's: an earlier one's late answers reach no callback. */
    const own =
      <A extends unknown[]>(callback: (...args: A) => void) =>
      (...args: A) => {
        if (active.current === created) callback(...args);
      };
    const created: HeldWriteViewController = createHeldWriteView(handle, {
      client,
      pollMs,
      onSettled: own((settled, receipt) =>
        latest.current.onSettled?.(settled, receipt),
      ),
      onReleased: own((by) => latest.current.onReleased?.(by)),
      onAdopted: own((state) => latest.current.onAdopted?.(state)),
      // A view made with a provider: the app's current one (a removed one
      // makes a new view, and this one stops).
      ...(adopts ? { adopt: () => latest.current.adopt!() } : {}),
    });
    return created;
  }, [handle, client, pollMs, adopts]);
  useEffect(() => {
    if (!view) return;
    active.current = view;
    const stop = view.start();
    return () => {
      if (active.current === view) active.current = undefined;
      stop();
    };
  }, [view]);
  const shown = useSyncExternalStore(
    view?.subscribe ?? none,
    view?.get ?? idle,
    view?.get ?? idle,
  );
  return {
    ...shown,
    exitAction:
      shown.exit && view ? { label: HELD_EXIT_LABEL, run: view.exit } : null,
    sendAgainAction:
      shown.phase === "succeeded" && view
        ? { label: HELD_SEND_AGAIN_LABEL, run: view.acknowledge }
        : null,
    send: (run) => {
      if (!view)
        return Promise.reject(
          new Error("Connect a wallet and build the call before sending."),
        );
      // A record to adopt that this view doesn't know of yet: never send past it.
      if (!!latest.current.adopt !== adopts)
        return Promise.reject(
          new Error(
            "Saved transactions are still being checked. Try again in a moment.",
          ),
        );
      return view.send(run);
    },
    check: () => (view ? view.check() : Promise.resolve(IDLE)),
    handle,
  };
}
