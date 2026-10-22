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
 * The line to show for a thrown value: the SDK's own message, presented by
 * {@link transactionMessage}, or {@link NETWORK_ERROR_LINE} for a raw node,
 * RPC or wallet error (a viem error, a JSON-RPC code) and anything not an
 * Error. An EIP-1193 provider error (4xxx) keeps its message.
 */
export function errorLine(error: unknown): string {
  if (!(error instanceof Error)) return NETWORK_ERROR_LINE;
  const { code, shortMessage, details } = error as {
    code?: unknown;
    shortMessage?: unknown;
    details?: unknown;
  };
  if (
    typeof shortMessage === "string" ||
    typeof details === "string" ||
    (typeof code === "number" && (code < 4000 || code > 4999))
  )
    return NETWORK_ERROR_LINE;
  return transactionMessage(error.message);
}
