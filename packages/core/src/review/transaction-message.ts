import { ReviewLineError } from "./lineError.js";

export { ReviewLineError };

/** Presentation only: saved recovery evidence and original SDK errors stay unchanged. */
export function transactionMessage(message: string): string {
  const formatted = message
    .replace(
      /\bRelayr HTTP \d+:\s*(?:SimulationReverted|FailedToSimulateTransaction)\b/gi,
      "Transaction simulation failed",
    )
    .replace(
      /\bRelayr HTTP (\d+):\s*/gi,
      "Transaction request failed (HTTP $1): ",
    )
    .replace(/\bRelayr HTTP (\d+)\b/gi, "Transaction request failed (HTTP $1)")
    .replace(/\bRelayr-reported\b/gi, "Reported")
    .replace(/\ba Relayr\s+(?=[aeiou])/gi, "an ")
    .replace(
      /\bRelayr\s+(?=(?:quotes?|payments?|bundles?|authorizations?|requests?|calls?|actions?|sessions?|funding|confirmations?|entries|entry|options?|polling|launch|destinations?|Safe|multi-chain bundles?|network fees?)\b)/gi,
      "",
    )
    .replace(/\bRelayr['’]s\s+/gi, "the ")
    .replace(/(?<![\w./:-])Relayr(?![\w./:-])/gi, "the network");
  return formatted === message
    ? message
    : formatted.replace(/^([a-z])/, (letter) => letter.toUpperCase());
}

/** The line for a raw node, RPC or wallet error: its own text can quote a request or its URL. */
export const NETWORK_ERROR_LINE =
  "The network returned an error. Check your wallet's activity before you try again.";

/** Fixed lines for a Relayr retry refusal, by its `reason`: its own text can quote a service. */
const RELAYR_RETRY_LINES: Readonly<Record<string, string>> = {
  invalid:
    "This payment could not be checked. Do not pay again; review the action again.",
  expired: "This quote expired. Review the action again for a new quote.",
  paid: "This bundle is already paid. Do not pay again.",
  running: "This bundle is already running. Do not pay again.",
  unknown:
    "Whether this bundle is paid is not known yet. Do not pay again yet; check it later.",
};

/** Fixed lines for the SDK's other typed refusals, by name, for the same reason. */
const TYPED_LINES: Readonly<Record<string, string>> = {
  RelayrProofError:
    "This payment's result contradicts what was reviewed. Keep the action pending and do not pay again.",
  RelayrProofUnavailableError:
    "This payment's result is not readable yet. Keep the action pending and check it later.",
  RelayrPaymentNotSentError:
    "The payment was not sent. Review the payment again.",
  SafeRelayrRecoveryError:
    "This Safe action already has a payment in progress. Check it before paying again.",
};

/**
 * The line to show for a thrown value: the message of an SDK error
 * ({@link ReviewLineError}), presented by {@link transactionMessage}; a fixed
 * line for the SDK's typed Relayr and Safe refusals, whose text can quote a
 * service; or {@link NETWORK_ERROR_LINE} for anything else (a node, RPC,
 * wallet, service or runtime error, or an app's own). The raw error stays
 * the cause.
 */
export function errorLine(error: unknown): string {
  if (error instanceof ReviewLineError)
    return transactionMessage(error.message);
  if (!(error instanceof Error)) return NETWORK_ERROR_LINE;
  // A name only picks a fixed line, so a forged one shows nothing of its own.
  if (error.name === "RelayrPaymentRetryError") {
    const { reason } = error as Error & { reason?: unknown };
    return typeof reason === "string" &&
      Object.prototype.hasOwnProperty.call(RELAYR_RETRY_LINES, reason)
      ? RELAYR_RETRY_LINES[reason]
      : RELAYR_RETRY_LINES.unknown;
  }
  return Object.prototype.hasOwnProperty.call(TYPED_LINES, error.name)
    ? TYPED_LINES[error.name]
    : NETWORK_ERROR_LINE;
}
