import {
  HELD_EXIT_LABEL,
  HELD_SEND_AGAIN_LABEL,
  type HeldWriteView,
  type HeldWriteViewController,
} from "../index.js";

/** The actions a shown held-write view offers, the one way both hooks show them. */
export type HeldViewActions = {
  /** The exit the hold offers now, with its label; null when none. */
  exitAction: { label: string; run: () => Promise<boolean> } | null;
  /**
   * On a success settled while away ("This went through while you were
   * away."): the user's choice to send it again. Null otherwise.
   */
  sendAgainAction: { label: string; run: () => Promise<void> } | null;
};

export const IDLE: HeldWriteView = {
  phase: "clear",
  state: null,
  line: null,
  exit: false,
  adopting: false,
};
export const none = () => () => {};
export const idle = () => IDLE;
/** A value's identity for a memo key, wei amounts (bigints) included. */
export const keyOf = (value: unknown) =>
  JSON.stringify(value, (_, field) =>
    typeof field === "bigint" ? `${field}n` : field,
  );

/** The exit and send-again actions of what `view` shows. */
export function actionsOf(
  shown: HeldWriteView,
  view: HeldWriteViewController | undefined,
): HeldViewActions {
  return {
    exitAction:
      shown.exit && view ? { label: HELD_EXIT_LABEL, run: view.exit } : null,
    sendAgainAction:
      shown.phase === "succeeded" && view
        ? { label: HELD_SEND_AGAIN_LABEL, run: view.acknowledge }
        : null,
  };
}
