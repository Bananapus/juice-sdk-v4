import { describe, expect, it } from "vitest";
import * as review from "./index.js";
import {
  RELAYR_PAYMENT_RELEASED_LINE,
  SAFE_PROPOSAL_EXECUTED_LINE,
  SAFE_PROPOSAL_REPLACED_LINE,
  WRITE_EXIT_LABEL,
  relayrDiscardLine,
  relayrHeldMessage,
  writeExitMessage,
  writeHeldMessage,
} from "./messages.js";

const UNTIL = 1_800_000_000;
const at = (ms: number) => `T${ms}`;

const lines = () => [
  relayrHeldMessage(UNTIL, { nowMs: 0, formatTime: at }),
  relayrHeldMessage(UNTIL, { nowMs: UNTIL * 1_000 + 1 }),
  relayrDiscardLine("ran"),
  relayrDiscardLine("changed"),
  relayrDiscardLine("expired"),
  relayrDiscardLine("expired", { paymentUnmatched: true }),
  writeHeldMessage(),
  writeExitMessage({ value: "1" }),
  writeExitMessage({ value: "0" }),
  WRITE_EXIT_LABEL,
  SAFE_PROPOSAL_REPLACED_LINE,
  SAFE_PROPOSAL_EXECUTED_LINE,
  RELAYR_PAYMENT_RELEASED_LINE,
];

describe("shared held and discard copy", () => {
  it("states when a held signature frees up, and after that, a short wait", () => {
    expect(relayrHeldMessage(UNTIL, { nowMs: 0, formatTime: at })).toBe(
      `This action's earlier signature can still run until T${UNTIL * 1_000}. Try again after that.`,
    );
    expect(
      relayrHeldMessage(UNTIL, { action: "launch", nowMs: UNTIL * 1_000 }),
    ).toBe(
      "This launch's earlier signature may still run. Try again in a few minutes.",
    );
  });

  it("formats the time in the user's locale by default", () => {
    expect(relayrHeldMessage(UNTIL, { nowMs: 0 })).toContain(
      new Date(UNTIL * 1_000).toLocaleString(),
    );
  });

  it("names the subject and action in each discard line", () => {
    expect(relayrDiscardLine("ran", { subject: "revnet" })).toBe(
      "This action's earlier signature may already have run. Check the revnet, then discard it to review it again.",
    );
    expect(relayrDiscardLine("changed", { subject: "revnet" })).toBe(
      "The revnet changed since this review.",
    );
    expect(relayrDiscardLine("expired", { action: "launch" })).toBe(
      "This launch's earlier signatures expired without running.",
    );
    expect(relayrDiscardLine("ran", { paymentUnmatched: true })).toBe(
      relayrDiscardLine("ran"),
    );
    expect(relayrDiscardLine("expired", { paymentUnmatched: true })).toBe(
      "The saved payment couldn't be matched to this action and isn't refunded. Discard it to review it again.",
    );
  });

  it("says plainly what sending again does when the held write carried value", () => {
    expect(writeHeldMessage("payment")).toBe(
      "Your earlier payment hasn't confirmed yet. Check your wallet.",
    );
    expect(writeExitMessage({ value: 5n }, "payment")).toBe(
      "If your earlier payment went through, sending again pays twice.",
    );
    expect(writeExitMessage({})).toBe(writeExitMessage({ value: "0" }));
    expect(writeExitMessage({ value: "0" })).toBe(
      "If your earlier transaction went through, sending again runs it twice.",
    );
  });

  it("keeps every line to one short sentence pair, free of mechanism names and em dashes", () => {
    for (const line of lines()) {
      expect(line).not.toMatch(/relayr|execution service|—/i);
      expect(line).not.toContain("\n");
      expect(line.length).toBeLessThanOrEqual(120);
    }
  });

  it("is one copy set on the review entry point", () => {
    expect(review.relayrHeldMessage).toBe(relayrHeldMessage);
    expect(review.relayrDiscardLine).toBe(relayrDiscardLine);
    expect(review.writeExitMessage).toBe(writeExitMessage);
  });
});
