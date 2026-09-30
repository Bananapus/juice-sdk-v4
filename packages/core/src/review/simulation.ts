import { numberToHex, type Address, type Hex, type PublicClient } from "viem";

/** A generous explicit gas ceiling for a reviewed state-changing preflight. */
export const TRANSACTION_SIMULATION_GAS = 10_000_000n;

/** The most return data a preflight hands back to a caller that decodes it. */
export const TRANSACTION_SIMULATION_MAX_RETURN_BYTES = 4_096;

/**
 * Simulate a state-changing transaction without viem's CCIP-read machinery. A
 * target-controlled `OffchainLookup` revert stays a revert: following its URL
 * would turn an authorization preflight into an SSRF surface, and the real
 * transaction cannot follow it either.
 *
 * The call is bounded by `gas`, and its return data by `maxReturnBytes`. Pass
 * `blockNumber` to simulate on the block a prerequisite (an approval, say) was
 * mined in, instead of `latest` on a node that may lag behind it.
 */
export async function simulateStateChangingTransaction(
  client: Pick<PublicClient, "request">,
  {
    from,
    to,
    data,
    value = 0n,
    gas = TRANSACTION_SIMULATION_GAS,
    blockNumber,
    maxReturnBytes = TRANSACTION_SIMULATION_MAX_RETURN_BYTES,
  }: {
    from: Address;
    to: Address;
    data: Hex;
    value?: bigint;
    gas?: bigint;
    blockNumber?: bigint;
    maxReturnBytes?: number;
  },
): Promise<Hex> {
  if (gas <= 0n) {
    throw new Error("Transaction simulation gas must be positive.");
  }
  if (!Number.isSafeInteger(maxReturnBytes) || maxReturnBytes < 0) {
    throw new Error("Transaction simulation needs a return data limit.");
  }
  // A raw request bypasses call()/simulateContract(), whose behavior can
  // inherit a client-level CCIP-read policy.
  const result: unknown = await client.request({
    method: "eth_call",
    params: [
      {
        from,
        to,
        data,
        value: numberToHex(value),
        gas: numberToHex(gas),
      },
      blockNumber === undefined ? "latest" : numberToHex(blockNumber),
    ],
  });
  if (typeof result !== "string" || !/^0x(?:[0-9a-f]{2})*$/iu.test(result)) {
    throw new Error("Transaction simulation returned malformed data.");
  }
  if ((result.length - 2) / 2 > maxReturnBytes) {
    throw new Error("Transaction simulation returned too much data.");
  }
  return result as Hex;
}

/** One call of an ordered sequence, such as a Safe MultiSend batch. */
export type SimulatedSequenceCall = {
  to: Address;
  data: Hex;
  value?: bigint;
  /** Names the call in a failure message. */
  label: string;
  /** Needs an earlier call's effect (an allowance, a hook), so it cannot run alone. */
  dependsOnPrior?: boolean;
};

function revertDetail(error: unknown): string {
  if (
    error instanceof Error &&
    "shortMessage" in error &&
    typeof error.shortMessage === "string"
  ) {
    return error.shortMessage;
  }
  return error instanceof Error
    ? error.message.split("\n")[0]
    : "The call would revert.";
}

/** Node text saying the method itself is missing: "method not found", "Unsupported method: eth_simulateV1". */
function namesMissingMethod(text: string): boolean {
  return (
    /\bmethod\b|eth_simulateV1/i.test(text) &&
    /not (?:found|supported|available|allowed|implemented)|does not exist|unsupported/i.test(
      text,
    ) &&
    !/revert/i.test(text)
  );
}

/**
 * The node says `eth_simulateV1` itself is unavailable, not that a call
 * reverted or the node failed: a method-not-found (-32601) or
 * method-not-supported (-32004) code anywhere in the error's first eight
 * causes, or the node's own text saying the method is missing. That text is a
 * viem error's `details`; its `message` quotes the request body, which always
 * names eth_simulateV1, so only an error from outside viem is read by its
 * `message`. A revert, a missing block ("header not found") or bad parameters
 * never qualify.
 */
function simulationUnsupported(error: unknown): boolean {
  let current = error;
  for (
    let depth = 0;
    depth < 8 && current && typeof current === "object";
    depth += 1
  ) {
    const item = current as {
      code?: unknown;
      details?: unknown;
      message?: unknown;
      shortMessage?: unknown;
      cause?: unknown;
    };
    if (item.code === -32601 || item.code === -32004) return true;
    const text =
      typeof item.details === "string"
        ? item.details
        : typeof item.shortMessage === "string"
          ? undefined
          : item.message;
    if (typeof text === "string" && namesMissingMethod(text)) return true;
    current = item.cause;
  }
  return false;
}

/**
 * Prove a whole sequence from `from` before anything is signed. `eth_simulateV1`
 * runs the calls in order against one state. Where a node lacks it, each call
 * that does not depend on an earlier one runs alone through
 * {@link simulateStateChangingTransaction}; the dependent ones are left to the
 * executing wallet's own simulation. `chainName` names the chain in errors.
 */
export async function simulateCallSequence(
  client: Pick<PublicClient, "request" | "simulateCalls">,
  {
    from,
    calls,
    chainName,
  }: {
    from: Address;
    calls: readonly SimulatedSequenceCall[];
    chainName: string;
  },
): Promise<void> {
  let sequence: { status: string; error?: unknown }[] | null;
  try {
    const simulated = await client.simulateCalls({
      account: from,
      calls: calls.map(({ to, data, value }) => ({ to, data, value })),
    });
    sequence = simulated.results.map((result) =>
      result.status === "failure"
        ? { status: "failure", error: result.error }
        : { status: result.status },
    );
  } catch (error) {
    if (!simulationUnsupported(error)) {
      throw new Error(
        `The batch could not be simulated on ${chainName}: ${revertDetail(error)}`,
      );
    }
    sequence = null;
  }
  for (const [index, call] of calls.entries()) {
    if (sequence) {
      const result = sequence[index];
      if (result?.status === "success") continue;
      throw new Error(
        `${call.label} cannot run on ${chainName}: ${
          result?.status === "failure"
            ? revertDetail(result.error)
            : "The call would revert."
        }`,
      );
    }
    if (call.dependsOnPrior) continue;
    try {
      await simulateStateChangingTransaction(client, {
        from,
        to: call.to,
        data: call.data,
        value: call.value,
      });
    } catch (error) {
      throw new Error(
        `${call.label} cannot run on ${chainName}: ${revertDetail(error)}`,
      );
    }
  }
}
