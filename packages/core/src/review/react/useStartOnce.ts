import { useEffect, useRef } from "react";

/**
 * Starts an action once per opening, preparation and `startKey`: its review is
 * its one confirmation, so nothing waits for a click. Closing or a new
 * preparation arms it again; `blocked` (busy, complete, settled or failed)
 * holds it without arming. A cancelled review never restarts by itself.
 */
export function useStartOnce(
  open: boolean,
  preparing: boolean,
  start?: () => void,
  startKey?: unknown,
  blocked = false,
): void {
  const started = useRef<{ key: unknown } | null>(null);
  const startRef = useRef(start);
  startRef.current = start;
  const ready = open && !preparing && !blocked && !!start;
  useEffect(() => {
    if (!open || preparing) {
      started.current = null;
      return;
    }
    if (!ready || (started.current && Object.is(started.current.key, startKey)))
      return;
    started.current = { key: startKey };
    startRef.current?.();
  }, [open, preparing, ready, startKey]);
}
