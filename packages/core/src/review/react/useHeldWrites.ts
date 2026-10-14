import {
  createHeldWriteView,
  type HeldWriteView,
  type HeldWriteViewController,
  type WriteHold,
  type WriteHoldClient,
  type WriteHoldHandle,
} from "../index.js";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { Address, Hex } from "viem";

/** One held write an app-wide notice shows. */
export type HeldWriteItem = {
  key: string;
  /** What the action is, when the app names it. */
  label?: string;
  view: HeldWriteView;
  /** Release it (the notice's exit): true when released. */
  release: () => Promise<boolean>;
};

type Entry = { key: string; label?: string; handle: WriteHoldHandle };

/** Watch each entry's hold as one held write view; held ones (and fresh results) come back as items. */
function useHeldViews(
  entries: readonly Entry[],
  client: WriteHoldClient | undefined,
  pollMs: number | undefined,
): HeldWriteItem[] {
  const views = useMemo(
    () =>
      client
        ? entries.map((entry) => ({
            entry,
            view: createHeldWriteView(entry.handle, { client, pollMs }),
          }))
        : [],
    [entries, client, pollMs],
  );
  useEffect(() => {
    const stops = views.map(({ view }) => view.start());
    return () => stops.forEach((stop) => stop());
  }, [views]);
  const store = useMemo(() => feed(views.map(({ view }) => view)), [views]);
  const shown = useSyncExternalStore(store.subscribe, store.get, store.get);
  return views
    .map(({ entry, view }, index) => ({
      key: entry.key,
      ...(entry.label ? { label: entry.label } : {}),
      view: shown[index],
      release: view.exit,
    }))
    .filter(({ view }) => view.phase !== "clear");
}

/** Several views as one store: a snapshot array that changes when any view does. */
function feed(views: readonly HeldWriteViewController[]) {
  let snapshot = views.map((view) => view.get());
  return {
    subscribe(listener: () => void) {
      const stops = views.map((view) =>
        view.subscribe(() => {
          snapshot = views.map((each) => each.get());
          listener();
        }),
      );
      return () => stops.forEach((stop) => stop());
    },
    get: () => snapshot,
  };
}

/**
 * The holds of a fixed set of actions, found by their intents alone and
 * shown with their lines and exits, whatever the actions' buttons allow now.
 */
export function useHeldIntents({
  hold,
  chainId,
  account,
  client,
  intents,
  pollMs,
}: {
  hold: WriteHold;
  chainId: number;
  account: Address | undefined;
  client: WriteHoldClient | undefined;
  intents: readonly { namespace: string; label?: string }[];
  pollMs?: number;
}): HeldWriteItem[] {
  const intentsKey = JSON.stringify(intents);
  const entries = useMemo(
    () =>
      account
        ? intents.map(({ namespace, label }) => ({
            key: namespace,
            label,
            handle: hold.open({
              chainId,
              account,
              safe: false,
              namespace,
              call: { to: account, data: "0x" as Hex },
            }),
          }))
        : [],
    // The intents key stands for the intents.
    [hold, chainId, account, intentsKey],
  );
  return useHeldViews(entries, client, pollMs);
}

/**
 * Every write held for `account` on `chainId`, whatever action made it
 * (`hold.list`), read again when another window changes one and every poll.
 */
export function useHeldWrites({
  hold,
  chainId,
  account,
  client,
  label,
  pollMs = 30_000,
}: {
  hold: WriteHold;
  chainId: number;
  account: Address | undefined;
  client: WriteHoldClient | undefined;
  /** The app's name for a listed write's action, when it knows it. */
  label?: (
    record: ReturnType<WriteHold["list"]>[number]["record"],
  ) => string | undefined;
  pollMs?: number;
}): HeldWriteItem[] {
  const [generation, setGeneration] = useState(0);
  useEffect(() => {
    const again = () => setGeneration((value) => value + 1);
    globalThis.addEventListener?.("storage", again);
    const timer = setInterval(again, pollMs);
    return () => {
      globalThis.removeEventListener?.("storage", again);
      clearInterval(timer);
    };
  }, [pollMs]);
  const listed = useMemo(
    () => (account ? hold.list({ account, chainId }) : []),
    [hold, account, chainId, generation],
  );
  const listedKey = listed
    .map(({ key, record }) => `${key}:${record.id}`)
    .join("|");
  const entries = useMemo(
    () =>
      listed.map(({ key, record, handle }) => ({
        key,
        label: label?.(record),
        handle,
      })),
    // The listed key stands for the list.
    [listedKey],
  );
  return useHeldViews(entries, client, pollMs);
}
