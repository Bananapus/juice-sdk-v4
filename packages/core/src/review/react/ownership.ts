import type { Address } from "viem";

/**
 * A form's own write, by the account that sent it and its reservation:
 * `owned` (its success not shown yet: a later run of the form closes on it)
 * until `shown` (its done rendered, or its close acknowledged it), which is
 * final. `dismissed` lists the runs whose own showing the user closed: a
 * showing by one of them never counts.
 */
export type OwnEntry = {
  readonly account: Address;
  readonly reservation: string;
  readonly state: "owned" | "shown";
  readonly dismissed: readonly number[];
};

/** What happened to a form's write: kept, dismissed by `run`, or shown (by `run`). */
export type OwnChange =
  | { kind: "keep" }
  | { kind: "dismiss"; run: number }
  | { kind: "shown"; run?: number };

/**
 * The one way an entry changes: it only moves forward. A shown entry stays
 * shown, and a dismissing run, once listed, is never dropped.
 */
export function mergeOwn(
  entry: OwnEntry | undefined,
  account: Address,
  reservation: string,
  change: OwnChange,
): OwnEntry {
  const now: OwnEntry = entry ?? {
    account,
    reservation,
    state: "owned",
    dismissed: [],
  };
  if (now.state === "shown") return now;
  if (change.kind === "dismiss")
    return now.dismissed.includes(change.run)
      ? now
      : { ...now, dismissed: [...now.dismissed, change.run] };
  if (change.kind === "shown")
    return change.run !== undefined && now.dismissed.includes(change.run)
      ? now
      : { ...now, state: "shown" };
  return now;
}
