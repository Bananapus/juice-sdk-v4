import { describe, expect, test } from "vitest";
import type { RelayrQuote, RelayrSentPayment } from "./relayr.js";
import {
  advanceRelayrLaunch,
  isRelayrLaunchPhase,
  RELAYR_LAUNCH_PHASES,
  relayrLaunchInFlight,
  relayrLaunchPaying,
  relayrLaunchUnfunded,
  resignedRelayrLaunch,
  type RelayrLaunchEvent,
  type RelayrLaunchJournal,
  type RelayrSignedLaunch,
} from "./relayrLaunch.js";

const account = "0x1111111111111111111111111111111111111111";
const quote = { bundle_uuid: "b" } as RelayrQuote;
const payment = (hash: string) => ({ hash }) as RelayrSentPayment;
const signed = { chainId: 1, nonce: "3", deadline: 9 } as RelayrSignedLaunch;
const paid = (): RelayrLaunchJournal => ({
  account,
  phase: "submitted",
  signed: [signed],
  records: [],
  published: true,
  abandonable: true,
  quote,
  paymentChainId: 10,
  paymentDeadline: "99",
  paymentHash: "0xaa",
  payments: [payment("0xaa")],
});

describe("Relayr launch journal", () => {
  test("names its phases and groups them", () => {
    expect(RELAYR_LAUNCH_PHASES.filter(isRelayrLaunchPhase)).toHaveLength(7);
    expect(isRelayrLaunchPhase("paid")).toBe(false);
    expect(RELAYR_LAUNCH_PHASES.filter(relayrLaunchPaying)).toEqual([
      "payment-signing",
      "submitted",
      "executing",
      "payment-reverted",
    ]);
    expect(RELAYR_LAUNCH_PHASES.filter(relayrLaunchUnfunded)).toEqual([
      "signing",
      "quoting",
      "quoted",
      "payment-reverted",
    ]);
    expect(RELAYR_LAUNCH_PHASES.filter(relayrLaunchInFlight)).toEqual([
      "payment-signing",
      "submitted",
      "executing",
    ]);
  });

  test.each<[string, RelayrLaunchEvent, Partial<RelayrLaunchJournal>, boolean]>(
    [
      [
        "quoting drops the quote, payment choice and abandonable mark",
        { type: "quoting" },
        {
          phase: "quoting",
          quote: undefined,
          paymentChainId: undefined,
          paymentDeadline: undefined,
          abandonable: undefined,
        },
        true,
      ],
      [
        "quoted keeps the quote",
        { type: "quoted", quote: { bundle_uuid: "c" } as RelayrQuote },
        { phase: "quoted", quote: { bundle_uuid: "c" } as RelayrQuote },
        true,
      ],
      [
        "chosen saves the payment chain and deadline",
        { type: "chosen", paymentChainId: 8453, paymentDeadline: "7" },
        { paymentChainId: 8453, paymentDeadline: "7" },
        true,
      ],
      [
        "sending forgets the earlier hash",
        { type: "sending" },
        { phase: "payment-signing", paymentHash: undefined },
        true,
      ],
      [
        "sent keeps every payment and the latest hash",
        { type: "sent", payments: [payment("0xaa"), payment("0xbb")] },
        { phase: "submitted", paymentHash: "0xbb" },
        true,
      ],
      [
        "a reverted attempt waits on the retry rule",
        { type: "unsent", outcome: "reverted" },
        { phase: "payment-reverted", paymentChainId: 10 },
        true,
      ],
      [
        "an unpaid attempt asks for a new choice",
        { type: "unsent", outcome: "unpaid" },
        {
          phase: "quoted",
          paymentChainId: undefined,
          paymentDeadline: undefined,
        },
        true,
      ],
      [
        "an uncertain attempt stays as it is",
        { type: "unsent", outcome: null },
        { phase: "submitted", paymentChainId: 10 },
        false,
      ],
      ["executing", { type: "executing" }, { phase: "executing" }, true],
      [
        "a proven revert",
        { type: "reverted" },
        { phase: "payment-reverted" },
        true,
      ],
      [
        "a released quote is quoted again with nothing of the old one",
        { type: "released" },
        {
          phase: "quoted",
          quote: undefined,
          payments: undefined,
          paymentHash: undefined,
          paymentChainId: undefined,
          paymentDeadline: undefined,
        },
        true,
      ],
    ],
  )("%s", (_, event, expected, changed) => {
    const journal = paid();
    expect(advanceRelayrLaunch(journal, event)).toBe(changed);
    const entries = Object.entries(expected);
    expect(journal).toMatchObject({
      ...Object.fromEntries(entries.filter(([, value]) => value !== undefined)),
      published: true,
      signed: [signed],
    });
    for (const [key, value] of entries)
      if (value === undefined) expect(key in journal).toBe(false);
  });

  test("signs again, published only when it supersedes", () => {
    expect(resignedRelayrLaunch({ account, retryNonces: { 1: "3" } })).toEqual({
      account,
      phase: "signing",
      signed: [],
      records: [],
      retryNonces: { 1: "3" },
    });
    expect(
      resignedRelayrLaunch({
        account,
        superseded: [signed],
        abandonable: true,
      }),
    ).toEqual({
      account,
      phase: "signing",
      signed: [],
      records: [],
      published: true,
      superseded: [signed],
      abandonable: true,
    });
  });
});
