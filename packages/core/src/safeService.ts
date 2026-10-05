import {
  getAddress,
  hashTypedData,
  isAddress,
  isAddressEqual,
  zeroAddress,
  type Address,
  type Hex,
} from "viem";
import {
  encodeMultiSend,
  isRecognizedSafeDeployment,
  MULTI_SEND_CALL_ONLY,
  type SafeCreation,
} from "./safe.js";
import { isBytes32, isHexBytes, uint256 } from "./untrusted.js";

/**
 * Safe's per-chain app URL prefix. Wider than {@link SAFE_SERVICE_PREFIX}:
 * Safe app links work on chains without a hosted transaction service.
 */
export const SAFE_PREFIX: Partial<Record<number, string>> = {
  1: "eth",
  10: "oeth",
  8453: "base",
  42161: "arb1",
  11155111: "sep",
  11155420: "opsepolia",
  84532: "basesep",
  421614: "arb1-sep",
};

/**
 * Chains with a HOSTED Safe Transaction Service — a smaller set than the
 * chains Safe app links work on: `api.safe.global/tx-service/{opsepolia,
 * arb1-sep}` both 404, while `basesep` is live. Probed against
 * `/api/v1/about/`. This split from {@link SAFE_PREFIX} is DELIBERATE:
 * conflating the two maps is what made service calls fire at chains with
 * none. Every tx-service URL must come from here, never from `SAFE_PREFIX`.
 */
export const SAFE_SERVICE_PREFIX: Partial<Record<number, string>> = {
  1: "eth",
  10: "oeth",
  8453: "base",
  42161: "arb1",
  11155111: "sep",
  84532: "basesep",
};

/** The Safe Transaction Service base URL for a chain, honoring the
 *  `jb-safe-tx-base` localStorage override; null when the chain has none. */
export function safeServiceBase(chainId: number): string | null {
  try {
    const custom = JSON.parse(
      globalThis.localStorage?.getItem("jb-safe-tx-base") ?? "null",
    ) as Record<string, string> | null;
    if (custom?.[chainId]) return custom[chainId].replace(/\/$/, "");
  } catch {
    // Local overrides are optional.
  }
  const prefix = SAFE_SERVICE_PREFIX[chainId];
  return prefix ? `https://api.safe.global/tx-service/${prefix}` : null;
}

export const SAFE_NONCE_GUIDANCE =
  "On Safe’s confirmation screen, Nonce defaults to the next available value. Open its dropdown to see queued nonces and replace one if desired.";

/** Swap/mint execution deadline seconds: 20 minutes for an EOA, whose review
 *  and signature are one sitting. */
const SWAP_DEADLINE_SECONDS = 20 * 60;
/** Safe deadline seconds: co-signer collection routinely outlives 20 minutes,
 *  so match the 30-day Permit2 approval windows. The longer window widens MEV
 *  exposure only within the swap's already-frozen slippage floor. */
const SAFE_SWAP_DEADLINE_SECONDS = 30 * 24 * 60 * 60;

/** The unix deadline for a swap/liquidity transaction proposed now. */
export function swapDeadline(
  isSafe: boolean,
  nowMs: number = Date.now(),
): bigint {
  return BigInt(
    Math.floor(nowMs / 1000) +
      (isSafe ? SAFE_SWAP_DEADLINE_SECONDS : SWAP_DEADLINE_SECONDS),
  );
}

export function safeQueueUrl(chainId: number, safe: Address): string | null {
  const prefix = SAFE_PREFIX[chainId];
  return prefix
    ? `https://app.safe.global/transactions/queue?safe=${prefix}:${safe}`
    : null;
}

/**
 * Consecutive 404s from the transaction service before the wait gives up. The
 * service can lag a just-created proposal briefly, but a sustained 404 means
 * it will never report this proposal (wrong network or an unhosted chain that
 * slipped through) — polling forever just strands the flow at "pending".
 * At the default 5s interval this is about a minute of patience.
 */
const SAFE_EXECUTION_NOT_FOUND_LIMIT = 12;

/**
 * Whether a WalletConnect peer is Safe{Wallet}. It proposes like the Safe
 * app: the gas a dapp sends becomes the proposal's safeTxGas, and the reply is
 * a safeTxHash unless the owner executes at once.
 */
export function isSafeWalletPeer(url: string | undefined): boolean {
  try {
    return new URL(url ?? "").origin === "https://app.safe.global";
  } catch {
    return false;
  }
}

function noHostedService(chainId: number): Error {
  return new Error(
    `Safe does not host a transaction service on chain ${chainId}, so this proposal cannot be tracked here. Execute it from the Safe app; the action takes effect once it is executed there.`,
  );
}

/** A service answer the wait cannot get past: it ends the wait, unlike a network error. */
class SafeExecutionRecordError extends Error {}

/**
 * Waits `ms`, or rejects with `aborted()` once `signal` aborts: at once when
 * it already has.
 */
function pause(
  ms: number,
  signal: AbortSignal | undefined,
  aborted: () => unknown,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    function onAbort() {
      clearTimeout(timer);
      reject(aborted());
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
    if (signal?.aborted) onAbort();
  });
}

/**
 * Resolve a Safe proposal identifier to its actual onchain execution hash.
 * A safeTxHash is not a transaction hash and must never be receipt-polled.
 *
 * The polling URL comes from {@link safeServiceBase} (the hosted-service
 * map), NOT `SAFE_PREFIX`: OP Sepolia and Arbitrum Sepolia have Safe app
 * URLs but no hosted transaction service, and polling a nonexistent service
 * left every Safe write there pending forever.
 *
 * With the chain's `client`, a hash the chain already knows as a transaction
 * is returned as the execution: over WalletConnect, Safe{Wallet} answers with
 * the execution's own hash when the owner executes at once.
 */
export async function waitForSafeExecutionHash(
  chainId: number,
  safeTxHash: Hex,
  options: {
    pollingIntervalMs?: number;
    signal?: AbortSignal;
    client?: { getTransaction: (args: { hash: Hex }) => Promise<unknown> };
  } = {},
): Promise<Hex> {
  if (!isBytes32(safeTxHash)) {
    throw new Error(`Invalid Safe proposal hash: ${String(safeTxHash)}.`);
  }
  const base = safeServiceBase(chainId);
  const { client } = options;
  if (!base && !client) throw noHostedService(chainId);
  const interval = options.pollingIntervalMs ?? 5_000;
  const endpoint =
    base && `${base}/api/v1/multisig-transactions/${safeTxHash}/`;
  let consecutiveNotFound = 0;

  for (;;) {
    if (options.signal?.aborted) {
      throw new DOMException("Safe execution wait aborted", "AbortError");
    }
    if (
      client &&
      (await client.getTransaction({ hash: safeTxHash }).then(
        () => true,
        () => false,
      ))
    ) {
      return safeTxHash;
    }
    if (!endpoint) {
      consecutiveNotFound += 1;
      if (consecutiveNotFound >= SAFE_EXECUTION_NOT_FOUND_LIMIT) {
        throw noHostedService(chainId);
      }
    } else {
      try {
        const response = await fetch(endpoint);
        if (response.ok) {
          consecutiveNotFound = 0;
          const transaction = (await response.json()) as {
            isExecuted?: boolean;
            isSuccessful?: boolean | null;
            transactionHash?: Hex | null;
          };
          if (transaction.isExecuted && transaction.isSuccessful === false) {
            throw new SafeExecutionRecordError(
              "Safe executed the proposal, but the onchain transaction failed.",
            );
          }
          if (transaction.isExecuted && transaction.transactionHash) {
            if (!isBytes32(transaction.transactionHash)) {
              throw new SafeExecutionRecordError(
                `Safe’s transaction service reported ${safeTxHash} executed in a malformed transaction hash: ${String(transaction.transactionHash)}. Check the proposal in the Safe app.`,
              );
            }
            return transaction.transactionHash;
          }
        } else if (response.status === 404) {
          consecutiveNotFound += 1;
          if (consecutiveNotFound >= SAFE_EXECUTION_NOT_FOUND_LIMIT) {
            throw new SafeExecutionRecordError(
              "Safe’s transaction service has no record of this proposal. Tracking cannot continue here — check the proposal in the Safe app; if it exists there, it will still take effect once executed.",
            );
          }
        }
      } catch (error) {
        if (error instanceof SafeExecutionRecordError) throw error;
        // Other service/network failures are transient. Keep the already-created
        // proposal pending instead of inviting a duplicate submission.
      }
    }
    await pause(
      interval,
      options.signal,
      () => new DOMException("Safe execution wait aborted", "AbortError"),
    );
  }
}

// ── Safe transactions ────────────────────────────────────────────────────────

/** The EIP-712 types a Safe transaction is signed and hashed with. */
export const SAFE_TX_TYPES = {
  SafeTx: [
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "data", type: "bytes" },
    { name: "operation", type: "uint8" },
    { name: "safeTxGas", type: "uint256" },
    { name: "baseGas", type: "uint256" },
    { name: "gasPrice", type: "uint256" },
    { name: "gasToken", type: "address" },
    { name: "refundReceiver", type: "address" },
    { name: "nonce", type: "uint256" },
  ],
} as const;

/** `execTransaction` and `approveHash`, and the execution events of Safe 1.4. */
export const SAFE_EXEC_ABI = [
  {
    type: "function",
    name: "execTransaction",
    stateMutability: "payable",
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "data", type: "bytes" },
      { name: "operation", type: "uint8" },
      { name: "safeTxGas", type: "uint256" },
      { name: "baseGas", type: "uint256" },
      { name: "gasPrice", type: "uint256" },
      { name: "gasToken", type: "address" },
      { name: "refundReceiver", type: "address" },
      { name: "signatures", type: "bytes" },
    ],
    outputs: [{ name: "success", type: "bool" }],
  },
  {
    type: "function",
    name: "approveHash",
    stateMutability: "nonpayable",
    inputs: [{ name: "hashToApprove", type: "bytes32" }],
    outputs: [],
  },
  {
    type: "event",
    name: "ExecutionSuccess",
    anonymous: false,
    inputs: [
      { name: "txHash", type: "bytes32", indexed: true },
      { name: "payment", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "ExecutionFailure",
    anonymous: false,
    inputs: [
      { name: "txHash", type: "bytes32", indexed: true },
      { name: "payment", type: "uint256", indexed: false },
    ],
  },
] as const;

/** One owner's confirmation; without a signature it is an onchain `approveHash`. */
export type SafeConfirmation = { owner: Address; signature?: Hex | null };

/**
 * A Safe transaction as the transaction service lists it, or as an app
 * proposes it. Read every field through {@link safeTransactionMessage}: a
 * service row is untrusted.
 */
export type SafeQueuedTransaction = {
  safe?: Address;
  to: Address;
  value: string | number | bigint;
  data: Hex | null;
  operation: number;
  safeTxGas: string | number | bigint;
  baseGas: string | number | bigint;
  gasPrice: string | number | bigint;
  /** Null on a service row whose proposer omitted it, hashed as the zero address. */
  gasToken: Address | null;
  /** Null on a service row whose proposer omitted it, hashed as the zero address. */
  refundReceiver: Address | null;
  nonce: number;
  safeTxHash?: Hex;
  contractTransactionHash?: Hex;
  confirmationsRequired?: number;
  confirmations?: SafeConfirmation[];
  isExecuted?: boolean;
};

/** A Safe transaction's exact EIP-712 message. */
export type SafeTransactionMessage = {
  to: Address;
  value: bigint;
  data: Hex;
  operation: 0 | 1;
  safeTxGas: bigint;
  baseGas: bigint;
  gasPrice: bigint;
  gasToken: Address;
  refundReceiver: Address;
  nonce: bigint;
};

function invalidField(name: string, value: unknown): Error {
  return new Error(
    `The Safe transaction's ${name} is invalid: ${String(value)}.`,
  );
}

function fieldAddress(name: string, value: unknown): Address {
  if (typeof value !== "string" || !isAddress(value)) {
    throw invalidField(name, value);
  }
  return getAddress(value);
}

function fieldUint(name: string, value: unknown): bigint {
  const parsed = uint256(value);
  if (parsed === null) throw invalidField(name, value);
  return parsed;
}

/** A nonce as a number: apps order and compare them. */
function nonceOf(value: unknown): number {
  const parsed = uint256(value);
  if (parsed === null || parsed > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw invalidField("nonce", value);
  }
  return Number(parsed);
}

/**
 * The exact EIP-712 message of `tx`. Every field is required and read
 * strictly: addresses checksummed, amounts as uint256 in any form, operation 0
 * (CALL) or 1 (DELEGATECALL), null data as empty, and a null gas token or
 * refund receiver as the zero address. Throws naming the first field that is
 * not.
 */
export function safeTransactionMessage(
  tx: SafeQueuedTransaction,
): SafeTransactionMessage {
  if (!tx || typeof tx !== "object") throw invalidField("record", tx);
  const operation = fieldUint("operation", tx.operation);
  if (operation > 1n) throw invalidField("operation", tx.operation);
  const data = tx.data ?? "0x";
  if (!isHexBytes(data)) throw invalidField("data", tx.data);
  return {
    to: fieldAddress("to", tx.to),
    value: fieldUint("value", tx.value),
    data,
    operation: operation === 1n ? 1 : 0,
    safeTxGas: fieldUint("safeTxGas", tx.safeTxGas),
    baseGas: fieldUint("baseGas", tx.baseGas),
    gasPrice: fieldUint("gasPrice", tx.gasPrice),
    // The service stores an omitted gas token or refund receiver as null and
    // hashes it as the zero address, as Safe does; nothing else may be absent.
    gasToken:
      tx.gasToken === null
        ? zeroAddress
        : fieldAddress("gasToken", tx.gasToken),
    refundReceiver:
      tx.refundReceiver === null
        ? zeroAddress
        : fieldAddress("refundReceiver", tx.refundReceiver),
    nonce: BigInt(nonceOf(tx.nonce)),
  };
}

function requireChainId(chainId: number): number {
  if (!Number.isSafeInteger(chainId) || chainId <= 0) {
    throw new Error(`Invalid chain ID: ${String(chainId)}.`);
  }
  return chainId;
}

function requireSafe(safe: unknown): Address {
  if (typeof safe !== "string" || !isAddress(safe)) {
    throw new Error(`Invalid Safe address: ${String(safe)}.`);
  }
  return getAddress(safe);
}

/** The EIP-712 hash `safe` signs and executes `tx` under on `chainId`. */
export function safeTransactionHash(
  chainId: number,
  safe: Address,
  tx: SafeQueuedTransaction,
): Hex {
  return hashTypedData({
    domain: {
      chainId: requireChainId(chainId),
      verifyingContract: requireSafe(safe),
    },
    types: SAFE_TX_TYPES,
    primaryType: "SafeTx",
    message: safeTransactionMessage(tx),
  });
}

/**
 * The hash of `tx`'s exact fields, refusing a record that names another Safe,
 * advertises a different `safeTxHash` or `contractTransactionHash`, or, given
 * `expected`, no longer hashes to the reviewed hash.
 */
export function canonicalSafeTxHash(
  chainId: number,
  safe: Address,
  tx: SafeQueuedTransaction,
  expected?: Hex,
): Hex {
  const address = requireSafe(safe);
  if (
    tx?.safe !== undefined &&
    tx.safe !== null &&
    (typeof tx.safe !== "string" ||
      !isAddress(tx.safe) ||
      !isAddressEqual(tx.safe, address))
  ) {
    throw new Error(
      `The Safe transaction belongs to ${String(tx.safe)}, not ${address}.`,
    );
  }
  const computed = safeTransactionHash(chainId, address, tx);
  for (const [name, advertised] of [
    ["safeTxHash", tx.safeTxHash],
    ["contractTransactionHash", tx.contractTransactionHash],
  ] as const) {
    if (advertised === undefined || advertised === null) continue;
    if (
      !isBytes32(advertised) ||
      advertised.toLowerCase() !== computed.toLowerCase()
    ) {
      throw new Error(
        `The Safe transaction's ${name} ${String(advertised)} does not match its fields, which hash to ${computed}.`,
      );
    }
  }
  if (expected !== undefined && !isBytes32(expected)) {
    throw new Error(
      `Invalid reviewed Safe transaction hash: ${String(expected)}.`,
    );
  }
  if (
    expected !== undefined &&
    expected.toLowerCase() !== computed.toLowerCase()
  ) {
    throw new Error(
      `The Safe transaction changed: it hashes to ${computed}, not the reviewed ${expected}.`,
    );
  }
  return computed;
}

// ── Execution results ────────────────────────────────────────────────────────

/** `ExecutionSuccess(bytes32,uint256)` and `ExecutionFailure(bytes32,uint256)`, the same in Safe 1.3 and 1.4. */
const EXECUTION_SUCCESS_TOPIC =
  "0x442e715f626346e8c54381002da614f62bee8d27386535b2521ec8540898556e";
const EXECUTION_FAILURE_TOPIC =
  "0x23428b18acfb3ea64b08dc0c1d296ea9c09702c09083ca5272e64d115b687d23";
const ZERO_WORD =
  "0000000000000000000000000000000000000000000000000000000000000000";

/**
 * What a receipt proves about one Safe transaction:
 *
 * - `success`: the Safe logged ExecutionSuccess for it;
 * - `failed`: the Safe ran it and its call failed (ExecutionFailure). A Safe
 *   signed with a nonzero safeTxGas or gasPrice logs this instead of reverting,
 *   so the receipt itself reads success. The nonce is spent;
 *
 *   both carry `payment`, the refund the Safe paid its executor. The signed
 *   hash commits to gasPrice, gas token and refund receiver, and Safe pays only
 *   when gasPrice > 0, so a refund never changes what ran. Refuse a refund
 *   before executing ({@link safeTransactionHasRefund}), not after;
 * - `reverted`: the outer transaction reverted, so the Safe ran nothing;
 * - `unproven`: no exact event for it, more than one, or a malformed one.
 */
export type SafeExecutionResult =
  | { status: "success"; payment: bigint }
  | { status: "failed"; payment: bigint }
  | { status: "reverted" }
  | { status: "unproven"; reason: string };

type SafeExecutionEvent = { failed: boolean; txHash: string; payment: bigint };

/**
 * A Safe execution event in exactly the Safe 1.4 layout (txHash indexed) or
 * the Safe 1.3 layout (txHash the first data word), with its payment. Null for
 * another event; a string naming what is wrong for a malformed one.
 */
function safeExecutionEvent(log: {
  topics?: unknown;
  data?: unknown;
}): SafeExecutionEvent | string | null {
  const topics = Array.isArray(log.topics) ? log.topics : [];
  const topic = typeof topics[0] === "string" ? topics[0].toLowerCase() : "";
  if (topic !== EXECUTION_SUCCESS_TOPIC && topic !== EXECUTION_FAILURE_TOPIC) {
    return null;
  }
  const failed = topic === EXECUTION_FAILURE_TOPIC;
  const name = failed ? "ExecutionFailure" : "ExecutionSuccess";
  const data = typeof log.data === "string" ? log.data.toLowerCase() : "";
  if (topics.length === 2) {
    if (!isBytes32(topics[1]) || !/^0x[\da-f]{64}$/.test(data)) {
      return `a malformed ${name} event`;
    }
    return {
      failed,
      txHash: topics[1].toLowerCase(),
      payment: BigInt(data),
    };
  }
  if (topics.length === 1) {
    if (!/^0x[\da-f]{128}$/.test(data)) return `a malformed ${name} event`;
    return {
      failed,
      txHash: data.slice(0, 66),
      payment: BigInt(`0x${data.slice(66)}`),
    };
  }
  return `a malformed ${name} event`;
}

/**
 * What `receipt` proves about the Safe transaction `hash` on `safe`. `hash` is
 * what the wallet returned: the safeTxHash, or, when Safe{Wallet} executed the
 * proposal at once, the execution's own transaction hash. Then the receipt
 * must carry exactly one execution event of `safe`, whatever its hash.
 * Otherwise exactly one event for `hash`, so another proposal in the same
 * batch cannot stand in for this one, and another proposal's event, refund
 * included, never decides this one. Any malformed execution event of `safe`
 * leaves the result unproven, since it cannot be told apart from this one.
 *
 * `receipt` is viem's parsed receipt: a raw RPC receipt (status "0x1") reads
 * unproven.
 *
 * The at-once reading proves only that the Safe ran one transaction in that
 * receipt. A caller who holds the executing transaction's input should also
 * bind it to the reviewed call, as an `execTransaction` with exactly the
 * reviewed fields.
 */
export function safeExecutionResult(
  receipt: {
    status?: unknown;
    transactionHash?: unknown;
    logs?: readonly unknown[];
  },
  safe: Address,
  hash: Hex,
): SafeExecutionResult {
  const address = requireSafe(safe).toLowerCase();
  if (!isBytes32(hash)) {
    throw new Error(`Invalid Safe transaction hash: ${String(hash)}.`);
  }
  if (receipt?.status === "reverted") return { status: "reverted" };
  const unproven = (reason: string): SafeExecutionResult => ({
    status: "unproven",
    reason,
  });
  if (receipt?.status !== "success" || !Array.isArray(receipt.logs)) {
    return unproven(
      `The receipt has no success status and logs to prove ${hash} on Safe ${safe}.`,
    );
  }
  const atOnce =
    typeof receipt.transactionHash === "string" &&
    receipt.transactionHash.toLowerCase() === hash.toLowerCase();
  const events: SafeExecutionEvent[] = [];
  for (const log of receipt.logs as {
    address?: unknown;
    topics?: unknown;
    data?: unknown;
  }[]) {
    if (
      typeof log?.address !== "string" ||
      log.address.toLowerCase() !== address
    ) {
      continue;
    }
    const event = safeExecutionEvent(log);
    if (typeof event === "string") {
      return unproven(`Safe ${safe} logged ${event}.`);
    }
    if (event && (atOnce || event.txHash === hash.toLowerCase())) {
      events.push(event);
    }
  }
  const subject = atOnce ? `transaction ${hash}` : `Safe transaction ${hash}`;
  if (events.length === 0) {
    return unproven(
      `The receipt has no ExecutionSuccess or ExecutionFailure from Safe ${safe} for ${subject}.`,
    );
  }
  if (events.length > 1) {
    return unproven(
      `Safe ${safe} logged ${events.length} execution results (${events.map((event) => (event.failed ? "ExecutionFailure" : "ExecutionSuccess")).join(", ")}) for ${subject}, so the receipt proves none of them.`,
    );
  }
  const [event] = events;
  return {
    status: event.failed ? "failed" : "success",
    payment: event.payment,
  };
}

/** Throws unless `receipt` proves the Safe transaction `hash` ran and succeeded ({@link safeExecutionResult}). */
export function requireSafeExecutionSuccess(
  receipt: Parameters<typeof safeExecutionResult>[0],
  safe: Address,
  hash: Hex,
): void {
  const result = safeExecutionResult(receipt, safe, hash);
  if (result.status === "success") return;
  if (result.status === "reverted") {
    throw new Error(
      `The transaction executing ${hash} on Safe ${safe} reverted, so the Safe ran nothing.`,
    );
  }
  if (result.status === "failed") {
    throw new Error(
      `Safe ${safe} ran ${hash}, but its call failed (ExecutionFailure).`,
    );
  }
  throw new Error(result.reason);
}

// ── Signatures ───────────────────────────────────────────────────────────────

/**
 * One confirmation's part of Safe's `signatures` bytes, without 0x:
 *
 * - none at all: the `approveHash` form (v = 1) naming the owner, a head;
 * - an ECDSA, eth_sign or approved-hash signature: exactly 65 bytes, a head;
 *   an approved hash (v = 1) must name its own owner;
 * - an EIP-1271 contract signature in the transaction service's standalone
 *   form: r = owner, s = 65, v = 0, then a length word and the signature,
 *   optionally zero-padded to a word. Its dynamic part becomes a tail that
 *   {@link safeExecutionSignatures} places after every head.
 *
 * Null for anything else, which never counts as a confirmation.
 */
function signaturePart(
  owner: Address,
  signature: unknown,
): { head: string } | { contract: string } | null {
  const word = owner.slice(2).toLowerCase().padStart(64, "0");
  if (signature === undefined || signature === null || signature === "") {
    return { head: `${word}${ZERO_WORD}01` };
  }
  if (!isHexBytes(signature) || signature.length < 132) return null;
  const bytes = signature.slice(2).toLowerCase();
  const v = bytes.slice(128, 130);
  if (v !== "00") {
    if (bytes.length !== 130 || (v === "01" && bytes.slice(0, 64) !== word)) {
      return null;
    }
    return { head: bytes };
  }
  if (
    bytes.length < 194 ||
    bytes.slice(0, 64) !== word ||
    BigInt(`0x${bytes.slice(64, 128)}`) !== 65n
  ) {
    return null;
  }
  const end = 194n + 2n * BigInt(`0x${bytes.slice(130, 194)}`);
  if (
    end > BigInt(bytes.length) ||
    BigInt(bytes.length) - end >= 64n ||
    /[^0]/.test(bytes.slice(Number(end)))
  ) {
    return null;
  }
  return { contract: bytes.slice(194, Number(end)) };
}

function requireOwners(owners: readonly Address[]): Set<string> {
  if (!Array.isArray(owners)) {
    throw new Error(`Invalid Safe owners: ${String(owners)}.`);
  }
  return new Set(
    owners.map((owner) => {
      if (typeof owner !== "string" || !isAddress(owner)) {
        throw new Error(`Invalid Safe owner: ${String(owner)}.`);
      }
      return owner.toLowerCase();
    }),
  );
}

/**
 * The confirmations of `tx` that count: one per current owner in `owners`,
 * with a well-formed signature or none (an onchain approval), a signature
 * preferred, in ascending numeric owner order as Safe requires (a string sort
 * disagrees and reverts with GS026). Owners are checksummed.
 */
export function usableSafeConfirmations(
  tx: Pick<SafeQueuedTransaction, "confirmations">,
  owners: readonly Address[],
): SafeConfirmation[] {
  const allowed = requireOwners(owners);
  const byOwner = new Map<string, SafeConfirmation>();
  for (const confirmation of Array.isArray(tx?.confirmations)
    ? tx.confirmations
    : []) {
    const owner = confirmation?.owner;
    if (
      typeof owner !== "string" ||
      !isAddress(owner) ||
      !allowed.has(owner.toLowerCase()) ||
      signaturePart(owner, confirmation.signature) === null
    ) {
      continue;
    }
    const key = owner.toLowerCase();
    const existing = byOwner.get(key);
    if (!existing || (!existing.signature && confirmation.signature)) {
      byOwner.set(key, {
        owner: getAddress(owner),
        signature: confirmation.signature ?? null,
      });
    }
  }
  // Owners are unique here, so no two compare equal.
  return [...byOwner.values()].sort((left, right) =>
    BigInt(left.owner) < BigInt(right.owner) ? -1 : 1,
  );
}

/**
 * The `signatures` bytes for `execTransaction`, as Safe's checkNSignatures
 * reads them: one 65-byte head per {@link usableSafeConfirmations} entry, in
 * owner order, then each contract signature's length and bytes. A contract
 * signature's head points at its tail by byte offset, which is never below
 * the heads' total length, so it passes Safe's GS021 check.
 */
export function safeExecutionSignatures(
  tx: Pick<SafeQueuedTransaction, "confirmations">,
  owners: readonly Address[],
): Hex {
  const parts = usableSafeConfirmations(tx, owners).map(
    ({ owner, signature }) => ({
      owner,
      part: signaturePart(owner, signature)!,
    }),
  );
  let head = "";
  let tail = "";
  for (const { owner, part } of parts) {
    if ("head" in part) {
      head += part.head;
      continue;
    }
    const offset = parts.length * 65 + tail.length / 2;
    head += `${owner.slice(2).toLowerCase().padStart(64, "0")}${offset.toString(16).padStart(64, "0")}00`;
    tail += `${(part.contract.length / 2).toString(16).padStart(64, "0")}${part.contract}`;
  }
  return `0x${head}${tail}`;
}

/** `execTransaction`'s arguments for `tx`, signed by its usable confirmations from `owners`. */
export function safeExecutionArgs(
  tx: SafeQueuedTransaction,
  owners: readonly Address[],
) {
  const message = safeTransactionMessage(tx);
  return [
    message.to,
    message.value,
    message.data,
    message.operation,
    message.safeTxGas,
    message.baseGas,
    message.gasPrice,
    message.gasToken,
    message.refundReceiver,
    safeExecutionSignatures(tx, owners),
  ] as const;
}

/**
 * Whether executing `tx` pays its executor a refund out of the Safe: Safe pays
 * one only when gasPrice is above zero (in the gas token, or ETH, to the refund
 * receiver or the executor). This SDK never proposes one. A queue card shows
 * or refuses such a transaction before executing it. Throws on a malformed
 * record, as {@link safeTransactionMessage} does.
 */
export function safeTransactionHasRefund(tx: SafeQueuedTransaction): boolean {
  return safeTransactionMessage(tx).gasPrice > 0n;
}

// ── Proposals ────────────────────────────────────────────────────────────────

/** The zero-refund Safe transaction this SDK proposes: one CALL, no gas fields. */
export function safeProposalFor(
  call: { to: Address; data: Hex; value?: bigint },
  nonce: number,
): SafeQueuedTransaction {
  const tx: SafeQueuedTransaction = {
    to: fieldAddress("to", call?.to),
    value: fieldUint("value", call?.value ?? 0n).toString(),
    data: call?.data,
    operation: 0,
    safeTxGas: "0",
    baseGas: "0",
    gasPrice: "0",
    gasToken: zeroAddress,
    refundReceiver: zeroAddress,
    nonce: nonceOf(nonce),
    confirmations: [],
  };
  safeTransactionMessage(tx);
  return tx;
}

/**
 * One Safe transaction for a batch: a DELEGATECALL into MultiSendCallOnly,
 * which runs each call from the Safe, in order, or reverts them all.
 */
export function safeBatchProposalFor(
  calls: readonly { to: Address; data: Hex; value?: bigint }[],
  nonce: number,
): SafeQueuedTransaction {
  return {
    ...safeProposalFor(
      { to: MULTI_SEND_CALL_ONLY, data: encodeMultiSend(calls) },
      nonce,
    ),
    operation: 1,
  };
}

/**
 * Whether `tx` is exactly `call` as a zero-refund proposal: the same target,
 * value, data and operation, and no safeTxGas, baseGas, gasPrice, gas token or
 * refund receiver. A malformed `tx` never matches.
 */
export function safeTransactionMatchesCall(
  tx: SafeQueuedTransaction,
  call: { to: Address; data: Hex; value?: bigint; operation?: 0 | 1 },
): boolean {
  let message: SafeTransactionMessage;
  try {
    message = safeTransactionMessage(tx);
  } catch {
    return false;
  }
  return (
    typeof call?.to === "string" &&
    isAddress(call.to) &&
    isAddressEqual(message.to, call.to) &&
    message.value === (call.value ?? 0n) &&
    message.data.toLowerCase() === String(call.data).toLowerCase() &&
    message.operation === (call.operation ?? 0) &&
    message.safeTxGas === 0n &&
    message.baseGas === 0n &&
    message.gasPrice === 0n &&
    isAddressEqual(message.gasToken, zeroAddress) &&
    isAddressEqual(message.refundReceiver, zeroAddress)
  );
}

/**
 * The nonce a new proposal takes: after everything already queued, never below
 * the Safe's own. Reusing a queued nonce would offer a replacement instead.
 */
export function nextProposalNonce(
  currentNonce: number,
  pending: readonly Pick<SafeQueuedTransaction, "nonce">[],
): number {
  return pending.reduce(
    (next, tx) => Math.max(next, nonceOf(tx?.nonce) + 1),
    nonceOf(currentNonce),
  );
}

/**
 * The next onchain step for `account` on a chain with no Safe service. Safe
 * counts the executing owner as a signature, so the owner who would complete
 * the threshold executes instead of approving first.
 */
export function onchainApprovalStep({
  account,
  approved,
  threshold,
}: {
  account: Address;
  /** Current owners whose `approvedHashes` holds the exact Safe transaction hash. */
  approved: readonly Address[];
  threshold: number;
}):
  | { kind: "approve" }
  | { kind: "waiting" }
  | { kind: "execute"; signers: Address[] } {
  const others = approved.filter((owner) => !isAddressEqual(owner, account));
  if (others.length + 1 >= threshold) {
    return { kind: "execute", signers: [...others, account] };
  }
  return others.length === approved.length
    ? { kind: "approve" }
    : { kind: "waiting" };
}

// ── Transaction service ──────────────────────────────────────────────────────

/**
 * How calls to Safe's transaction service run. They go through `fetch`, the
 * global one by default. `signal` goes with every request and ends any wait
 * between attempts; the call then fails with the signal's reason, except where
 * a failed request reads as nothing found ({@link fetchSafesOwnedBy},
 * {@link fetchSafeCreation}). A 429 is retried up to three times, after its
 * Retry-After or 1, 2 and 3 seconds without one, each wait capped at
 * {@link SAFE_SERVICE_MAX_RETRY_WAIT_MS}. `retryRateLimited: false` hands back
 * the first 429 instead, for a caller that must not wait, such as a server
 * render.
 */
export type SafeServiceOptions = {
  fetch?: typeof fetch;
  signal?: AbortSignal;
  retryRateLimited?: boolean;
};

/** The longest a service call waits before retrying a 429: 10 seconds, whatever its Retry-After asks. */
export const SAFE_SERVICE_MAX_RETRY_WAIT_MS = 10_000;

const PENDING_PAGE_SIZE = 50;
const MAX_PENDING = 250;
const SERVICE_DETAIL_CHARACTERS = 200;

/** Whether Safe hosts a transaction service for `chainId`; without one, owners approve onchain. */
export function hasSafeService(chainId: number): boolean {
  return safeServiceBase(chainId) !== null;
}

/** The Safe app's page for one queued transaction. */
export function safeTransactionUrl(
  chainId: number,
  safe: Address,
  safeTxHash: Hex,
): string | null {
  const prefix = SAFE_PREFIX[chainId];
  if (!prefix || typeof safe !== "string" || !isAddress(safe)) return null;
  if (!isBytes32(safeTxHash)) return null;
  const address = getAddress(safe);
  return `https://app.safe.global/transactions/tx?safe=${prefix}:${address}&id=multisig_${address}_${safeTxHash}`;
}

function serviceOrThrow(chainId: number): string {
  const base = safeServiceBase(chainId);
  if (!base) {
    throw new Error(
      `Safe does not host a transaction service on chain ${chainId}.`,
    );
  }
  return base;
}

/** The optional `jb-safe-api-key` from local storage, as a bearer token. */
function serviceHeaders(json = false): Record<string, string> {
  const headers: Record<string, string> = { accept: "application/json" };
  if (json) headers["content-type"] = "application/json";
  try {
    const key = globalThis.localStorage?.getItem("jb-safe-api-key");
    if (key) headers.authorization = `Bearer ${key}`;
  } catch {
    // The key is optional.
  }
  return headers;
}

/**
 * One service request, as {@link SafeServiceOptions} describes: a 429 is
 * refused before processing, so it waits and repeats, up to three times.
 */
async function serviceFetch(
  url: string,
  init: RequestInit,
  { fetch: request = fetch, signal, retryRateLimited }: SafeServiceOptions,
): Promise<Response> {
  for (let attempt = 0; ; attempt += 1) {
    signal?.throwIfAborted();
    const response = await request(url, signal ? { ...init, signal } : init);
    if (response.status !== 429 || attempt >= 3 || retryRateLimited === false) {
      return response;
    }
    const retryAfter = Number(response.headers.get("retry-after"));
    await pause(
      Math.min(
        Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : 1000 * (attempt + 1),
        SAFE_SERVICE_MAX_RETRY_WAIT_MS,
      ),
      signal,
      () => signal!.reason,
    );
  }
}

async function serviceDetail(response: Response): Promise<string> {
  const text = await response.text().catch(() => "");
  return text ? `: ${text.slice(0, SERVICE_DETAIL_CHARACTERS)}` : "";
}

/** The most confirmations a service row may carry; each must be an owner's. */
const MAX_ROW_CONFIRMATIONS = 100;

/**
 * Every field of a service row read strictly, its advertised hash required and
 * checked, its confirmations bounded: the row with its nonce as a number and
 * its own Safe and hash, or a refusal naming what is wrong.
 */
function checkedRow(
  chainId: number,
  safe: Address,
  row: unknown,
): SafeQueuedTransaction {
  try {
    const tx = row as SafeQueuedTransaction;
    if (
      (tx?.safeTxHash === undefined || tx.safeTxHash === null) &&
      (tx?.contractTransactionHash === undefined ||
        tx.contractTransactionHash === null)
    ) {
      throw new Error("It advertises no safeTxHash.");
    }
    if (
      tx.confirmations !== undefined &&
      tx.confirmations !== null &&
      (!Array.isArray(tx.confirmations) ||
        tx.confirmations.length > MAX_ROW_CONFIRMATIONS)
    ) {
      throw new Error(
        `Its confirmations are not a list of at most ${MAX_ROW_CONFIRMATIONS}.`,
      );
    }
    const hash = canonicalSafeTxHash(chainId, safe, tx);
    return { ...tx, safe, safeTxHash: hash, nonce: nonceOf(tx.nonce) };
  } catch (error) {
    throw new Error(
      `Safe's transaction service listed a transaction for Safe ${safe} on chain ${chainId} that cannot be trusted. ${(error as Error).message}`,
    );
  }
}

/**
 * Every queued, unexecuted transaction of `safe` from nonce `currentNonce`
 * on, read from the chain's transaction service. Each row must belong to
 * `safe` and hash to its advertised safeTxHash. Throws when the chain has no
 * service or the service fails, so an outage never reads as an empty queue,
 * and when more than 250 are queued.
 */
export async function listPendingSafeTransactions(
  chainId: number,
  safe: Address,
  currentNonce: number,
  options: SafeServiceOptions = {},
): Promise<SafeQueuedTransaction[]> {
  const base = serviceOrThrow(chainId);
  const address = requireSafe(safe);
  const fromNonce = nonceOf(currentNonce);
  const rows: SafeQueuedTransaction[] = [];
  for (let offset = 0; offset < MAX_PENDING; offset += PENDING_PAGE_SIZE) {
    const url =
      `${base}/api/v1/safes/${address}/multisig-transactions/` +
      `?executed=false&trusted=true&ordering=nonce&limit=${PENDING_PAGE_SIZE}` +
      `&offset=${offset}&nonce__gte=${fromNonce}`;
    let response = await serviceFetch(
      url,
      { headers: serviceHeaders() },
      options,
    );
    if (!response.ok && response.status !== 429) {
      // A failed page is retried once before the listing gives up. A 429 has
      // already had the retries serviceFetch allows.
      await pause(500, options.signal, () => options.signal!.reason);
      response = await serviceFetch(
        url,
        { headers: serviceHeaders() },
        options,
      );
    }
    if (!response.ok) {
      throw new Error(
        `Safe's transaction service answered ${response.status} listing the queue of Safe ${address} on chain ${chainId}${await serviceDetail(response)}`,
      );
    }
    const body = (await response.json()) as {
      next?: unknown;
      results?: unknown;
    };
    if (!body || !Array.isArray(body.results)) {
      throw new Error(
        `Safe's transaction service returned no transaction list for Safe ${address} on chain ${chainId}.`,
      );
    }
    if (body.results.length > PENDING_PAGE_SIZE) {
      throw new Error(
        `Safe's transaction service returned ${body.results.length} transactions in a page of ${PENDING_PAGE_SIZE} for Safe ${address} on chain ${chainId}.`,
      );
    }
    rows.push(...body.results.map((row) => checkedRow(chainId, address, row)));
    if (body.results.length < PENDING_PAGE_SIZE || !body.next) {
      return rows.filter(
        (row) => row.isExecuted !== true && row.nonce >= fromNonce,
      );
    }
  }
  throw new Error(
    `Safe ${address} has more than ${MAX_PENDING} queued transactions on chain ${chainId}. Nothing was proposed; execute or replace older ones first.`,
  );
}

/** The queued zero-refund proposal of exactly `call`, so a retry can confirm it instead of proposing it twice. */
export async function findPendingSafeTransaction(
  chainId: number,
  safe: Address,
  currentNonce: number,
  call: Parameters<typeof safeTransactionMatchesCall>[1],
  options: SafeServiceOptions = {},
): Promise<SafeQueuedTransaction | null> {
  const pending = await listPendingSafeTransactions(
    chainId,
    safe,
    currentNonce,
    options,
  );
  return pending.find((tx) => safeTransactionMatchesCall(tx, call)) ?? null;
}

/**
 * The service's record of the proposal `safeTxHash`, authenticated: it must
 * belong to `safe` and its fields must hash to `safeTxHash`.
 */
export async function readSafeTransaction(
  chainId: number,
  safe: Address,
  safeTxHash: Hex,
  options: SafeServiceOptions = {},
): Promise<SafeQueuedTransaction> {
  const base = serviceOrThrow(chainId);
  const address = requireSafe(safe);
  if (!isBytes32(safeTxHash)) {
    throw new Error(`Invalid Safe transaction hash: ${String(safeTxHash)}.`);
  }
  const response = await serviceFetch(
    `${base}/api/v1/multisig-transactions/${safeTxHash}/`,
    { headers: serviceHeaders() },
    options,
  );
  if (!response.ok) {
    throw new Error(
      `Safe's transaction service answered ${response.status} for proposal ${safeTxHash} on chain ${chainId}. Try again when it is available.`,
    );
  }
  const record = (await response.json()) as SafeQueuedTransaction;
  try {
    if (record?.safe === undefined || record.safe === null) {
      throw new Error("The record names no Safe.");
    }
    canonicalSafeTxHash(chainId, address, record, safeTxHash);
  } catch (error) {
    throw new Error(
      `Safe's record of proposal ${safeTxHash} does not match Safe ${address} on chain ${chainId}. ${(error as Error).message}`,
    );
  }
  return record;
}

async function postToService(
  url: string,
  body: unknown,
  what: string,
  options: SafeServiceOptions,
): Promise<void> {
  const response = await serviceFetch(
    url,
    {
      method: "POST",
      headers: serviceHeaders(true),
      body: JSON.stringify(body),
    },
    options,
  );
  if (!response.ok && response.status !== 201) {
    throw new Error(
      `Safe's transaction service refused ${what} (${response.status})${await serviceDetail(response)}`,
    );
  }
}

function requireSignature(signature: unknown): Hex {
  if (!isHexBytes(signature) || signature.length < 132) {
    throw new Error(`Invalid Safe signature: ${String(signature)}.`);
  }
  return signature;
}

/**
 * Queue `tx`, signed by `sender`, with the transaction service so the Safe's
 * other owners can confirm and execute it. The body is built from the exact
 * fields, checksummed as the service requires, and the hash is recomputed,
 * never taken from the record. Returns the safeTxHash.
 */
export async function proposeSafeTransaction(
  chainId: number,
  safe: Address,
  tx: SafeQueuedTransaction,
  {
    sender,
    signature,
    origin,
  }: { sender: Address; signature: Hex; origin: string },
  options: SafeServiceOptions = {},
): Promise<Hex> {
  const base = serviceOrThrow(chainId);
  const address = requireSafe(safe);
  const safeTxHash = canonicalSafeTxHash(chainId, address, tx);
  const message = safeTransactionMessage(tx);
  if (typeof origin !== "string" || !origin.trim()) {
    throw new Error("A Safe proposal needs an origin naming the app.");
  }
  await postToService(
    `${base}/api/v1/safes/${address}/multisig-transactions/`,
    {
      to: message.to,
      value: message.value.toString(),
      data: message.data,
      operation: message.operation,
      safeTxGas: message.safeTxGas.toString(),
      baseGas: message.baseGas.toString(),
      gasPrice: message.gasPrice.toString(),
      gasToken: message.gasToken,
      refundReceiver: message.refundReceiver,
      nonce: message.nonce.toString(),
      contractTransactionHash: safeTxHash,
      sender: fieldAddress("sender", sender),
      signature: requireSignature(signature),
      origin,
    },
    `the proposal ${safeTxHash} for Safe ${address} on chain ${chainId}`,
    options,
  );
  return safeTxHash;
}

/**
 * Add an owner's signature to the queued `tx`. The confirmation is posted to
 * the hash of `tx`'s exact fields, never to a hash the record advertises.
 */
export async function submitSafeConfirmation(
  chainId: number,
  safe: Address,
  tx: SafeQueuedTransaction,
  signature: Hex,
  options: SafeServiceOptions = {},
): Promise<void> {
  const base = serviceOrThrow(chainId);
  const safeTxHash = canonicalSafeTxHash(chainId, safe, tx);
  await postToService(
    `${base}/api/v1/multisig-transactions/${safeTxHash}/confirmations/`,
    { signature: requireSignature(signature) },
    `the confirmation of ${safeTxHash} on chain ${chainId}`,
    options,
  );
}

/** The most Safes listed for one owner on one chain; the rest are not read. */
const MAX_OWNED_SAFES = 200;

/**
 * Every Safe `owner` signs for on `chainIds`, from each chain's transaction
 * service, at most 200 per chain. A chain without a service, a failed request
 * or a malformed answer contributes nothing; listed Safes are checksummed and
 * others dropped.
 */
export async function fetchSafesOwnedBy(
  owner: string,
  chainIds: readonly number[],
  options: SafeServiceOptions = {},
): Promise<{ chainId: number; safe: Address }[]> {
  if (typeof owner !== "string" || !isAddress(owner)) return [];
  const account = getAddress(owner);
  const perChain = await Promise.all(
    chainIds.map(async (chainId) => {
      const base = safeServiceBase(chainId);
      if (!base) return [];
      try {
        const response = await serviceFetch(
          `${base}/api/v1/owners/${account}/safes/`,
          { headers: serviceHeaders() },
          options,
        );
        if (!response.ok) return [];
        const body = (await response.json()) as { safes?: unknown };
        return Array.isArray(body?.safes)
          ? body.safes
              .slice(0, MAX_OWNED_SAFES)
              .flatMap((safe) =>
                typeof safe === "string" && isAddress(safe)
                  ? [{ chainId, safe: getAddress(safe) }]
                  : [],
              )
          : [];
      } catch {
        return [];
      }
    }),
  );
  return perChain.flat();
}

/** The source chain's service URL for a Safe's creation record, or null. */
export function safeCreationUrl(chainId: number, safe: string): string | null {
  const base = safeServiceBase(chainId);
  if (!base || typeof safe !== "string" || !isAddress(safe)) return null;
  return `${base}/api/v1/safes/${getAddress(safe)}/creation/`;
}

/**
 * A service creation record read strictly: the factory and singleton as
 * addresses of one recognized Safe release, whole-hex setup data with at
 * least a selector, and a decimal uint256 salt. Null for anything else.
 */
export function parseSafeCreationPayload(
  payload: unknown,
): SafeCreation | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const { factoryAddress, masterCopy, setupData, saltNonce } = record;
  if (
    typeof factoryAddress !== "string" ||
    typeof masterCopy !== "string" ||
    !isAddress(factoryAddress) ||
    !isAddress(masterCopy) ||
    !isHexBytes(setupData) ||
    setupData.length < 10 ||
    typeof saltNonce !== "string" ||
    !/^\d+$/.test(saltNonce) ||
    uint256(saltNonce) === null ||
    !isRecognizedSafeDeployment(factoryAddress, masterCopy)
  ) {
    return null;
  }
  return {
    factory: getAddress(factoryAddress),
    singleton: getAddress(masterCopy),
    initializer: setupData,
    saltNonce: BigInt(saltNonce),
  };
}

/**
 * The Safe's creation record from its source chain's service only: a record
 * for the same address from another chain could replay unrelated setup data.
 * Null when the chain has no service, the request fails, or the record is
 * not {@link parseSafeCreationPayload strictly valid}.
 */
export async function fetchSafeCreation(
  safe: Address,
  sourceChainId: number,
  options: SafeServiceOptions = {},
): Promise<SafeCreation | null> {
  const url = safeCreationUrl(sourceChainId, safe);
  if (!url) return null;
  try {
    const response = await serviceFetch(
      url,
      { headers: serviceHeaders() },
      options,
    );
    return response.ok ? parseSafeCreationPayload(await response.json()) : null;
  } catch {
    return null;
  }
}
