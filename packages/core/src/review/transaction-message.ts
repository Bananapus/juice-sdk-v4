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

/**
 * The line to show for a thrown value: the message of an SDK error
 * ({@link ReviewLineError}), presented by {@link transactionMessage}, or
 * {@link NETWORK_ERROR_LINE} for anything else (a node, RPC, wallet, service
 * or runtime error, or an app's own); the raw error stays the cause.
 */
export function errorLine(error: unknown): string {
  return error instanceof ReviewLineError
    ? transactionMessage(error.message)
    : NETWORK_ERROR_LINE;
}
