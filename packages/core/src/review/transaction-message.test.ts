import { describe, expect, it } from "vitest";
import { transactionMessage } from "./index.js";

describe("transaction diagnostic presentation", () => {
  it.each([
    [
      "Relayr HTTP 406: FailedToSimulateTransaction on chain 10: GS013",
      "Transaction simulation failed on chain 10: GS013",
    ],
    [
      "Relayr-reported; onchain proof pending",
      "Reported; onchain proof pending",
    ],
    [
      "Relayr’s response could not be verified. Keep the original bundle pending.",
      "The execution service's response could not be verified. Keep the original bundle pending.",
    ],
    [
      "Saved Relayr authorizations may still run.",
      "Saved authorizations may still run.",
    ],
    [
      "Your wallet may have sent the Relayr payment. Do not pay again.",
      "Your wallet may have sent the payment. Do not pay again.",
    ],
    [
      "Relayr launch destinations remain pending.",
      "Launch destinations remain pending.",
    ],
    ["Relayr HTTP 429", "Transaction request failed (HTTP 429)"],
    [
      "Relayr HTTP 406: SimulationReverted on chain 1: GS013",
      "Transaction simulation failed on chain 1: GS013",
    ],
    [
      "Relayr HTTP 503: TemporarilyUnavailable",
      "Transaction request failed (HTTP 503): TemporarilyUnavailable",
    ],
    ["Relayr multi-chain bundle", "Multi-chain bundle"],
    [
      "The saved batch contains a Relayr authorization.",
      "The saved batch contains an authorization.",
    ],
    [
      "The Relayr entry does not match its Safe execution.",
      "The entry does not match its Safe execution.",
    ],
    [
      "Relayr Safe executions must not reimburse an executor from Safe funds.",
      "Safe executions must not reimburse an executor from Safe funds.",
    ],
    [
      "This unpaid Relayr quote expired. Review the action again for a new quote.",
      "This unpaid quote expired. Review the action again for a new quote.",
    ],
    [
      "Relayr reported a failed destination transaction. Do not pay again.",
      "The execution service reported a failed destination transaction. Do not pay again.",
    ],
    [
      "Relayr's response does not match the signed bundle. Do not pay again.",
      "The execution service's response does not match the signed bundle. Do not pay again.",
    ],
    [
      "Relayr funding is being submitted. Do not pay again while the wallet result is uncertain.",
      "Funding is being submitted. Do not pay again while the wallet result is uncertain.",
    ],
  ])("preserves the transaction meaning of %s", (original, visible) => {
    expect(transactionMessage(original)).toBe(visible);
    expect(transactionMessage(visible)).toBe(visible);
  });

  it.each([
    "",
    "https://relayr.example/bundle/1",
    "RelayrRecoveryError",
    "insufficient funds",
    "GS013 on Ethereum. Keep the original bundle pending.",
  ])("leaves technical and unrelated text intact: %s", (message) => {
    expect(transactionMessage(message)).toBe(message);
  });
});
