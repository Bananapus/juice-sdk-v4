import {
  decodeAbiParameters,
  decodeErrorResult,
  keccak256,
  numberToHex,
  toHex,
  type Abi,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";
import { collectEvidence, decodePayFailure } from "../v6/executionErrors.js";
import { knownErrorAbi } from "./decodeCall.js";
import { ReviewLineError } from "./lineError.js";

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
    throw new ReviewLineError("Transaction simulation gas must be positive.");
  }
  if (!Number.isSafeInteger(maxReturnBytes) || maxReturnBytes < 0) {
    throw new ReviewLineError(
      "Transaction simulation needs a return data limit.",
    );
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
    throw new ReviewLineError(
      "Transaction simulation returned malformed data.",
    );
  }
  if ((result.length - 2) / 2 > maxReturnBytes) {
    throw new ReviewLineError("Transaction simulation returned too much data.");
  }
  return result as Hex;
}

/** One call of an ordered sequence, such as a Safe MultiSend batch. */
export type SimulatedSequenceCall = {
  to: Address;
  data: Hex;
  value?: bigint;
  /** The exact gas limit the call is sent with, when the app fixed it. */
  gas?: bigint;
  /** Names the call in a failure message. */
  label: string;
  /** Needs an earlier call's effect (an allowance, a hook), so it cannot run alone. */
  dependsOnPrior?: boolean;
  /** The call's ABI, whose custom errors name a revert. */
  abi?: Abi;
};

/** The line for a revert whose reason the review cannot read. */
export const REVERT_UNKNOWN_LINE =
  "The call would revert, and the review could not read why.";

/** The line for a simulation the node did not answer. */
export const SIMULATION_NO_ANSWER_LINE =
  "The node did not answer the simulation.";

/** Solidity's panic causes, by code. */
const PANICS: Readonly<Record<string, string>> = {
  "1": "a failed assertion",
  "17": "an arithmetic overflow",
  "18": "a division by zero",
  "33": "an invalid enum value",
  "34": "bad storage data",
  "49": "an empty array pop",
  "50": "an out-of-bounds index",
  "65": "an out-of-memory error",
  "81": "an uninitialized function",
};

const ERROR_STRING = "0x08c379a0";
const PANIC = "0x4e487b71";
const IDENTIFIER = /^[A-Za-z_$][\w$]{0,99}$/u;

/** A contract's reason text, quoted: control, format and line characters dropped, clipped. */
function quoted(reason: string): string | null {
  const text = reason
    .replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
  if (!text) return null;
  return `"${text.length > 80 ? `${text.slice(0, 79)}…` : text}"`;
}

/**
 * Why a call reverted, decoded from its revert data, in one short line: a
 * payment revert the SDK knows says what to change; `Error(string)` shows its
 * reason quoted; a panic names its cause; a custom error from `abi` (the
 * call's) or the SDK's ABIs shows its name. Null when there is no revert data
 * or it decodes to nothing known. Error text (viem's `shortMessage`, a node's
 * message) is never read: it can quote a request or its URL.
 */
export function revertReason(error: unknown, abi?: Abi): string | null {
  const known = decodePayFailure(error);
  if (known) return known.message;
  const { payloads, decoded } = collectEvidence(error);
  for (const data of payloads) {
    const selector = data.slice(0, 10).toLowerCase();
    const rest = `0x${data.slice(10)}` as Hex;
    try {
      if (selector === ERROR_STRING) {
        const shown = quoted(
          decodeAbiParameters([{ type: "string" }], rest)[0],
        );
        if (shown) return `The contract refused: ${shown}.`;
        continue;
      }
      if (selector === PANIC) {
        const [code] = decodeAbiParameters([{ type: "uint256" }], rest);
        return `The contract stopped on ${PANICS[code.toString()] ?? "an internal error"}.`;
      }
      const errors = [...(abi ?? []), ...knownErrorAbi()];
      // viem cannot decode an error that has no arguments.
      const name =
        data.length === 10
          ? errors.flatMap((item) =>
              item.type === "error" &&
              !item.inputs.length &&
              keccak256(toHex(`${item.name}()`)).slice(0, 10) === selector
                ? [item.name]
                : [],
            )[0]
          : decodeErrorResult({ abi: errors, data: data as Hex }).errorName;
      if (name && IDENTIFIER.test(name))
        return `The contract refused: ${name}.`;
    } catch {
      /* Data that decodes to nothing known says nothing. */
    }
  }
  // An error viem typed, when the error carries no data of its own.
  if (!payloads.length)
    for (const { errorName } of decoded)
      if (
        IDENTIFIER.test(errorName) &&
        errorName !== "Error" &&
        errorName !== "Panic"
      )
        return `The contract refused: ${errorName}.`;
  return null;
}

/**
 * A failed simulation's one-line reason: {@link revertReason}, or a fixed
 * line, {@link REVERT_UNKNOWN_LINE} for a revert and
 * {@link SIMULATION_NO_ANSWER_LINE} otherwise. Never the error's own text.
 */
export function revertDetail(error: unknown, abi?: Abi): string {
  return (
    revertReason(error, abi) ??
    (isRevert(error) ? REVERT_UNKNOWN_LINE : SIMULATION_NO_ANSWER_LINE)
  );
}

/**
 * Whether a failed simulation is the call reverting, not the node failing:
 * EIP-1474 code 3, viem's contract-revert errors, or the node's own text
 * saying it reverted, in the error's first eight causes. A viem error is read
 * by its `details`, since its `message` quotes the request.
 */
export function isRevert(error: unknown): boolean {
  let current = error;
  for (
    let depth = 0;
    depth < 8 && current && typeof current === "object";
    depth += 1
  ) {
    const item = current as {
      code?: unknown;
      name?: unknown;
      details?: unknown;
      shortMessage?: unknown;
      message?: unknown;
      cause?: unknown;
    };
    if (
      item.code === 3 ||
      item.name === "ContractFunctionRevertedError" ||
      item.name === "RawContractError" ||
      item.name === "ExecutionRevertedError" ||
      // A failed call that returned no revert data.
      item.name === "ContractFunctionZeroDataError" ||
      item.name === "AbiDecodingZeroDataError"
    ) {
      return true;
    }
    // A wrapper that carries its cause (simulateCallSequence's, which names
    // the call) is read through that cause, never by its own text.
    const text =
      typeof item.details === "string"
        ? item.details
        : typeof item.shortMessage === "string" || "cause" in item
          ? undefined
          : item.message;
    if (typeof text === "string" && /revert/i.test(text)) return true;
    current = item.cause;
  }
  return false;
}

/**
 * The error a failed simulation throws, with the answer as its cause: the
 * SDK's own line (a {@link ReviewLineError}) for a revert, decoded or not; a
 * plain error, which `errorLine` shows as the network line, for a node that
 * did not answer.
 */
export function simulationFailure(text: string, cause: unknown): Error {
  return Object.defineProperty(
    isRevert(cause) ? new ReviewLineError(text) : new Error(text),
    "cause",
    { value: cause, configurable: true, writable: true },
  );
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
      calls: calls.map(({ to, data, value, gas }) => ({
        to,
        data,
        value,
        ...(gas === undefined ? {} : { gas }),
      })),
    });
    sequence = simulated.results.map((result) =>
      result.status === "failure"
        ? { status: "failure", error: result.error }
        : { status: result.status },
    );
  } catch (error) {
    if (!simulationUnsupported(error)) {
      throw simulationFailure(
        `The batch could not be simulated on ${chainName}: ${revertDetail(error)}`,
        error,
      );
    }
    sequence = null;
  }
  for (const [index, call] of calls.entries()) {
    if (sequence) {
      const result = sequence[index];
      if (result?.status === "success") continue;
      throw simulationFailure(
        `${call.label} cannot run on ${chainName}: ${
          result?.status === "failure"
            ? revertDetail(result.error, call.abi)
            : SIMULATION_NO_ANSWER_LINE
        }`,
        result?.error,
      );
    }
    if (call.dependsOnPrior) continue;
    try {
      await simulateStateChangingTransaction(client, {
        from,
        to: call.to,
        data: call.data,
        value: call.value,
        gas: call.gas,
      });
    } catch (error) {
      throw simulationFailure(
        `${call.label} cannot run on ${chainName}: ${revertDetail(error, call.abi)}`,
        error,
      );
    }
  }
}
