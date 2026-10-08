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
    .replace(/\bRelayr['’]s\b/gi, "the execution service's")
    .replace(/(?<![\w./:-])Relayr(?![\w./:-])/gi, "the execution service");
  return formatted === message
    ? message
    : formatted.replace(/^([a-z])/, (letter) => letter.toUpperCase());
}
