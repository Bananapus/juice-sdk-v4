import type { Address, Hex } from "viem";
import type {
  RelayrEntry,
  RelayrQuote,
  RelayrSentPayment,
  RelayrTransactionRecord,
} from "./relayr.js";

/** The phases a saved Relayr launch journal may be in, in order. */
export const RELAYR_LAUNCH_PHASES = [
  "signing",
  "quoting",
  "quoted",
  "payment-signing",
  "submitted",
  "executing",
  "payment-reverted",
] as const;

/** `payment-reverted`: the latest payment canonically reverted; only the SDK's retry rule lets the quote be paid again. */
export type RelayrLaunchPhase = (typeof RELAYR_LAUNCH_PHASES)[number];

export type RelayrSignedLaunch = {
  chainId: number;
  entry: RelayrEntry;
  nonce: string;
  deadline: number;
  /** Replaced before any quote was asked for, so nothing of it was ever posted. */
  unposted?: true;
};

/** A launch's Relayr journal: exact signatures and quote bindings that survive reloads, including the wallet's no-hash send window. */
export type RelayrLaunchJournal = {
  account: Address;
  paymentChainId?: number;
  phase: RelayrLaunchPhase;
  signed: RelayrSignedLaunch[];
  superseded?: RelayrSignedLaunch[];
  /** Retrying a known failed attempt must reuse its nonce, even if the old signature is still live. */
  retryNonces?: Record<number, string>;
  quote?: RelayrQuote;
  paymentHash?: Hex;
  /** Every payment sent for the quote, as relayrPaymentDetails authenticated it, under the hash it was mined. */
  payments?: RelayrSentPayment[];
  paymentDeadline?: string;
  records: RelayrTransactionRecord[];
  published?: true;
  abandonable?: true;
};

export const isRelayrLaunchPhase = (
  value: unknown,
): value is RelayrLaunchPhase =>
  (RELAYR_LAUNCH_PHASES as readonly unknown[]).includes(value);

/** A payment was or may be sent: the saved payment chain is required. */
export const relayrLaunchPaying = (phase: RelayrLaunchPhase) =>
  phase === "payment-signing" ||
  phase === "submitted" ||
  phase === "executing" ||
  phase === "payment-reverted";

/** Nothing funds the quote: published requests are classified, and an abandonable journal signs again. */
export const relayrLaunchUnfunded = (phase: RelayrLaunchPhase) =>
  phase === "signing" ||
  phase === "quoting" ||
  phase === "quoted" ||
  phase === "payment-reverted";

/** A payment is with the wallet or the chain: resume reconciles it, never pays again. */
export const relayrLaunchInFlight = (phase: RelayrLaunchPhase) =>
  phase === "payment-signing" || phase === "submitted" || phase === "executing";

export type RelayrLaunchEvent =
  /** Persisted before the signed entries are posted to Relayr. */
  | { type: "quoting" }
  | { type: "quoted"; quote: RelayrQuote }
  | { type: "chosen"; paymentChainId: number; paymentDeadline: string }
  /** The wallet holds the payment and has returned no hash. */
  | { type: "sending" }
  | { type: "sent"; payments: RelayrSentPayment[] }
  /** The payment attempt failed; `outcome` is relayrPaymentAttemptOutcome's answer. */
  | { type: "unsent"; outcome: "reverted" | "unpaid" | null }
  | { type: "executing" }
  /** A saved payment was proven reverted on resume. */
  | { type: "reverted" }
  /** revertedRelayrQuote proved nothing can fund the quote: the same signatures are quoted again. */
  | { type: "released" };

/**
 * Moves a launch journal through its payment lifecycle, in place, since the
 * session holds it: true when it changed and must be persisted.
 */
export function advanceRelayrLaunch(
  journal: RelayrLaunchJournal,
  event: RelayrLaunchEvent,
): boolean {
  switch (event.type) {
    case "quoting":
      journal.phase = "quoting";
      journal.published = true;
      delete journal.abandonable;
      delete journal.quote;
      delete journal.paymentChainId;
      delete journal.paymentDeadline;
      return true;
    case "quoted":
      journal.quote = event.quote;
      journal.phase = "quoted";
      return true;
    case "chosen":
      journal.paymentChainId = event.paymentChainId;
      journal.paymentDeadline = event.paymentDeadline;
      return true;
    case "sending":
      journal.phase = "payment-signing";
      // The wallet's payment has no hash yet, even when an earlier one reverted.
      delete journal.paymentHash;
      return true;
    case "sent":
      journal.payments = event.payments;
      journal.paymentHash = event.payments[event.payments.length - 1].hash;
      journal.phase = "submitted";
      return true;
    case "unsent":
      if (event.outcome === "reverted") journal.phase = "payment-reverted";
      else if (event.outcome === "unpaid") {
        journal.phase = "quoted";
        delete journal.paymentChainId;
        delete journal.paymentDeadline;
      }
      return event.outcome !== null;
    case "executing":
      journal.phase = "executing";
      return true;
    case "reverted":
      journal.phase = "payment-reverted";
      return true;
    case "released":
      journal.phase = "quoted";
      delete journal.quote;
      delete journal.payments;
      delete journal.paymentHash;
      delete journal.paymentChainId;
      delete journal.paymentDeadline;
      return true;
  }
}

/**
 * A new journal that signs again: `superseded` (published signatures it
 * replaces) marks it published, and `retryNonces` pins each chain's nonce so
 * the forwarder runs at most one of old and new.
 */
export function resignedRelayrLaunch({
  account,
  retryNonces,
  superseded,
  abandonable,
}: {
  account: Address;
  retryNonces?: Record<number, string>;
  superseded?: RelayrSignedLaunch[];
  abandonable?: boolean;
}): RelayrLaunchJournal {
  return {
    account,
    phase: "signing",
    signed: [],
    records: [],
    ...(superseded ? { published: true as const, superseded } : {}),
    ...(abandonable ? { abandonable: true as const } : {}),
    ...(retryNonces ? { retryNonces } : {}),
  };
}
