import {
  decodeAbiParameters,
  decodeFunctionData,
  encodeAbiParameters,
  TransactionNotFoundError,
  TransactionReceiptNotFoundError,
  type AbiParameter,
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
  multiSendCallsOf,
  readBoundedSafeNonce,
  isRecognizedSafeDeployment,
  MULTI_SEND_CALL_ONLY,
  type SafeCreation,
} from "./safe.js";
import { pause } from "./pause.js";
import { isBytes32, isHexBytes, retryAfterMs, uint256 } from "./untrusted.js";

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
 * Not-found answers before the wait gives up. With a service they are its 404s
 * since the last record it returned for the proposal, even a pending one; its
 * other failures neither count nor start over. Without one they are the
 * chain's own answers that it has no such transaction, a running total: nothing
 * starts it over, and a look the chain could not answer does not count. The
 * service can lag a just-created proposal briefly, but a sustained 404 means it
 * will never report this proposal (wrong network or an unhosted chain that
 * slipped through) — polling forever just strands the flow at "pending". At the
 * default 5s interval this is about a minute of patience.
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

/** The chain's client, as far as the wait reads it. */
type SafeExecutionClient = {
  getTransaction: (args: { hash: Hex }) => Promise<unknown>;
};

/** What the chain said of a hash: it is a transaction, there is none, or the chain could not say. */
type ChainLook = "found" | "none" | "unanswered";

/**
 * What the chain says of `hash`: a transaction (`found`), none (`none`) or
 * nothing (`unanswered`). Only viem's `TransactionNotFoundError` is the chain
 * saying it has none. Any other failure (a timeout, an HTTP error, a node still
 * indexing) says nothing about the hash. The error is matched by its name, as
 * `isDefiniteWalletRejection` (in /review) matches viem's wallet rejection: the
 * app's viem and the SDK's can be different installs, whose classes never
 * match under `instanceof`. viem throws it from `getTransaction` itself, so
 * there is no cause chain to read. Only the promise's rejection is read: a
 * client that throws before it returns one, or is not a client, fails the wait
 * at once instead of reading as a look the chain could not answer.
 */
async function lookUpTransaction(
  client: SafeExecutionClient,
  hash: Hex,
): Promise<ChainLook> {
  return client.getTransaction({ hash }).then(
    () => "found",
    (error: unknown) =>
      (error as { name?: unknown } | null | undefined)?.name ===
      "TransactionNotFoundError"
        ? "none"
        : "unanswered",
  );
}

/** A service answer the wait cannot get past: it ends the wait, unlike a network error. */
class SafeExecutionRecordError extends Error {}

/** What a wait ends with when its signal aborts. */
function waitAborted(): DOMException {
  return new DOMException("Safe execution wait aborted", "AbortError");
}

/**
 * `work`, cut short when `signal` aborts: the promise then rejects with
 * `aborted()`, at once when `signal` already has. `work` is left to settle on
 * its own and its answer is ignored. The abort listener goes when it does.
 */
function abortable<T>(
  work: Promise<T>,
  signal: AbortSignal | undefined,
  aborted: () => unknown,
): Promise<T> {
  if (!signal) return work;
  return new Promise<T>((resolve, reject) => {
    function onAbort() {
      reject(aborted());
    }
    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) onAbort();
    work
      .finally(() => signal.removeEventListener("abort", onAbort))
      .then(resolve, reject);
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
 * the execution's own hash when the owner executes at once. On a chain with a
 * service, a failed chain check leaves the decision to the service.
 *
 * On a chain without a service only the `client` answers. The wait throws that
 * Safe does not host one after twelve answers (about a minute at the default
 * interval) that the chain has no such transaction, which is viem's
 * `TransactionNotFoundError`. A look the chain cannot answer, such as an RPC
 * failure or a timeout, neither counts nor starts the count over, because the
 * hash may be a real execution. The wait keeps looking, so without a `signal`
 * it lasts as long as the node cannot answer.
 *
 * `signal` ends the wait at once, even while a chain look is in flight: the
 * look is left to settle and its answer is ignored. Each poll is one service
 * request with the local API key and `signal`, which also ends a request in
 * flight. After a 429 the next poll waits the longer of the polling interval
 * and the wait its Retry-After asks for.
 */
export async function waitForSafeExecutionHash(
  chainId: number,
  safeTxHash: Hex,
  options: {
    pollingIntervalMs?: number;
    signal?: AbortSignal;
    client?: SafeExecutionClient;
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
  let notFoundAnswers = 0;

  for (;;) {
    if (options.signal?.aborted) throw waitAborted();
    let wait = interval;
    const look =
      client &&
      (await abortable(
        lookUpTransaction(client, safeTxHash),
        options.signal,
        waitAborted,
      ));
    if (look === "found") return safeTxHash;
    if (!endpoint) {
      // Without a service only the chain answers. A look it could not answer
      // says nothing about the proposal, so it neither counts nor starts over.
      if (look === "none") {
        notFoundAnswers += 1;
        if (notFoundAnswers >= SAFE_EXECUTION_NOT_FOUND_LIMIT) {
          throw noHostedService(chainId);
        }
      }
    } else {
      try {
        const response = await serviceFetch(
          endpoint,
          { headers: serviceHeaders() },
          { signal: options.signal, retryRateLimited: false },
        );
        if (response.ok) {
          notFoundAnswers = 0;
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
          notFoundAnswers += 1;
          if (notFoundAnswers >= SAFE_EXECUTION_NOT_FOUND_LIMIT) {
            throw new SafeExecutionRecordError(
              "Safe’s transaction service has no record of this proposal. Tracking cannot continue here — check the proposal in the Safe app; if it exists there, it will still take effect once executed.",
            );
          }
        } else if (response.status === 429) {
          const asked = retryAfterMs(response.headers.get("retry-after"));
          // Without a readable Retry-After the poll keeps its interval.
          if (asked !== null && asked > interval) wait = asked;
        }
      } catch (error) {
        if (error instanceof SafeExecutionRecordError) throw error;
        // Other service/network failures are transient. Keep the already-created
        // proposal pending instead of inviting a duplicate submission.
      }
    }
    await pause(wait, options.signal, waitAborted);
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

/** What a Safe app flow says when it cannot confirm its proposal ran. */
export const SAFE_PROPOSAL_UNCONFIRMED =
  "Safe proposal submitted, but confirmation is unavailable. Check Safe before taking another action.";

/** What a Safe app flow says while its proposal waits for the Safe's other signers. */
export const SAFE_PROPOSAL_AWAITING =
  "Proposed to your Safe. Its other signers can approve it there.";

/** A call a Safe app proposal was reviewed to run. */
export type SafeAppCall = { to: Address; data: Hex; value?: bigint };

/** A reviewed call whose wei value may be persisted as a decimal string. */
export type ReviewedSafeCall = Omit<SafeAppCall, "value"> & {
  value?: bigint | string;
};

type SafeAppExecution = {
  /** Reads the execution's transaction, which only an execution returned at once needs. */
  client: {
    getTransaction(args: {
      hash: Hex;
    }): Promise<{ to?: Address | null; input?: Hex }>;
  };
  receipt: Parameters<typeof safeExecutionResult>[0];
  safe: Address;
  /** What the wallet returned: the safeTxHash, or the execution's own hash when Safe{Wallet} executed at once. */
  proposalHash: Hex;
  /** What the proposal was reviewed to run: one call, or a batch in order. */
  calls: readonly ReviewedSafeCall[];
  /** Whether a recognized MultiSendCallOnly batch may run the calls. */
  batch?: boolean;
};

/**
 * Whether the Safe transaction runs exactly the reviewed calls: one CALL,
 * or, when `batch` permits it, a zero-value MultiSendCallOnly DELEGATECALL
 * running every call in order. Persisted decimal values compare in wei.
 */
export function safeTransactionRunsCalls(
  tx: { to: Address; value: bigint; data: Hex; operation: number },
  calls: readonly ReviewedSafeCall[],
  batch = true,
): boolean {
  if (calls.length === 1 && tx.operation === 0 && sameCall(calls[0], tx))
    return true;
  if (!batch || tx.value !== 0n) return false;
  const inner = multiSendCallsOf(tx);
  return (
    !!inner &&
    inner.length === calls.length &&
    inner.every((call, index) => sameCall(calls[index], call))
  );
}

/** Whether a transaction calls `safe`'s execTransaction of exactly the reviewed calls. */
export function safeExecutionRunsCalls(
  transaction: { to?: Address | null; input?: Hex },
  safe: Address,
  calls: readonly ReviewedSafeCall[],
  batch = true,
): boolean {
  if (
    !transaction.to ||
    !transaction.input ||
    !isAddressEqual(transaction.to, safe)
  )
    return false;
  let decoded: ReturnType<typeof decodeFunctionData<typeof SAFE_EXEC_ABI>>;
  try {
    decoded = decodeFunctionData({
      abi: SAFE_EXEC_ABI,
      data: transaction.input,
    });
  } catch {
    return false;
  }
  if (decoded.functionName !== "execTransaction") return false;
  const [to, value, data, operation] = decoded.args;
  return safeTransactionRunsCalls({ to, value, data, operation }, calls, batch);
}

/**
 * What the execution's receipt proves about the proposal a Safe app returned
 * ({@link safeExecutionResult}). When Safe{Wallet} executed it at once, the
 * reply is the execution's own hash and the SDK takes the Safe's one
 * execution event in that receipt whatever its safeTxHash, so the execution
 * must also be the Safe's execTransaction of exactly the reviewed calls, or
 * the result is unproven.
 */
export async function readSafeAppExecution({
  client,
  receipt,
  safe,
  proposalHash,
  calls,
  batch = true,
}: SafeAppExecution): Promise<SafeExecutionResult> {
  const result = safeExecutionResult(receipt, safe, proposalHash);
  const atOnce =
    typeof receipt.transactionHash === "string" &&
    receipt.transactionHash.toLowerCase() === proposalHash.toLowerCase();
  if (!atOnce || (result.status !== "success" && result.status !== "failed")) {
    return result;
  }
  const transaction = await client
    .getTransaction({ hash: proposalHash })
    .catch(() => null);
  return transaction && safeExecutionRunsCalls(transaction, safe, calls, batch)
    ? result
    : {
        status: "unproven",
        reason: `Transaction ${proposalHash} is not Safe ${safe}'s execution of the reviewed call.`,
      };
}

/**
 * Throws unless the execution proves the Safe ran the reviewed proposal and
 * its call succeeded ({@link readSafeAppExecution}): `failure` when the Safe
 * ran it and it failed, and SAFE_PROPOSAL_UNCONFIRMED when it does not show
 * this proposal ran.
 */
export async function requireSafeProposalSuccess(
  execution: SafeAppExecution,
  failure: string,
): Promise<void> {
  const { status } = await readSafeAppExecution(execution);
  if (status === "unproven") throw new Error(SAFE_PROPOSAL_UNCONFIRMED);
  if (status !== "success") throw new Error(failure);
}

/**
 * The calls this app stamps with a field at send time, by selector: the
 * stamp's argument, and whether the contract refuses the call once the chain
 * passes it. Universal Router's `execute` and PositionManager's
 * `modifyLiquidities` check a deadline; the expiration Permit2's `approve`
 * sets only bounds the allowance it grants.
 */
const STAMPED_CALLS: Record<
  string,
  { params: readonly AbiParameter[]; stamp: number; reverts: boolean }
> = {
  // execute(bytes commands, bytes[] inputs, uint256 deadline)
  "0x3593564c": {
    params: [{ type: "bytes" }, { type: "bytes[]" }, { type: "uint256" }],
    stamp: 2,
    reverts: true,
  },
  // modifyLiquidities(bytes unlockData, uint256 deadline)
  "0xdd46508f": {
    params: [{ type: "bytes" }, { type: "uint256" }],
    stamp: 1,
    reverts: true,
  },
  // approve(address token, address spender, uint160 amount, uint48 expiration)
  "0x87517c45": {
    params: [
      { type: "address" },
      { type: "address" },
      { type: "uint160" },
      { type: "uint48" },
    ],
    stamp: 3,
    reverts: false,
  },
};

/** A stamped call's shape and arguments, when its data is exactly their ABI encoding. */
function stampedArgs(call: SafeAppCall) {
  const shape = STAMPED_CALLS[call.data.slice(0, 10).toLowerCase()];
  if (!shape) return null;
  const encoded = `0x${call.data.slice(10)}` as Hex;
  try {
    const args = decodeAbiParameters(
      shape.params,
      encoded,
    ) as readonly unknown[];
    // Any other encoding of the same arguments is held exactly as sent.
    return encodeAbiParameters(shape.params, args).toLowerCase() ===
      encoded.toLowerCase()
      ? { shape, args }
      : null;
  } catch {
    return null;
  }
}

/**
 * The call a Safe proposal of `call` holds: `call` with the field it is
 * stamped with at send time zeroed, so the same action sent again with a later
 * stamp is the action the proposal already holds. Any other call is held
 * exactly as sent.
 */
export function heldCall(call: SafeAppCall): SafeAppCall {
  const stamped = stampedArgs(call);
  if (!stamped) return call;
  const args = [...stamped.args];
  args[stamped.shape.stamp] = 0n;
  return {
    ...call,
    data: `${call.data.slice(0, 10)}${encodeAbiParameters(stamped.shape.params, args).slice(2)}` as Hex,
  };
}

/** The deadline after which the contract refuses `call`, or null for a call without one. */
export function stampedDeadline(call: SafeAppCall): bigint | null {
  const stamped = stampedArgs(call);
  return stamped?.shape.reverts
    ? BigInt(stamped.args[stamped.shape.stamp] as bigint)
    : null;
}

function sameCall(a: ReviewedSafeCall, b: ReviewedSafeCall): boolean {
  return (
    isAddressEqual(a.to, b.to) &&
    BigInt(a.value ?? 0n) === BigInt(b.value ?? 0n) &&
    a.data.toLowerCase() === b.data.toLowerCase()
  );
}

/** A Safe app proposal's one call, or null for any other Safe transaction. */
function proposedCall(tx: SafeQueuedTransaction): SafeAppCall | null {
  // Both callers have authenticated the record through the service reader.
  const { to, data, value } = safeTransactionMessage(tx);
  // A zero-refund CALL, as a Safe app proposes it.
  return safeTransactionMatchesCall(tx, { to, data, value })
    ? { to, data, value }
    : null;
}

/** A chain client that reads the Safe's nonce and the latest block. */
type SafeQueueClient = Parameters<typeof readBoundedSafeNonce>[0] & {
  getBlock(): Promise<{ number: bigint | null; timestamp: bigint }>;
};

/**
 * A pending proposal of the action `call` makes in `safe`'s queue (its
 * service record, its safeTxHash and the call it runs), read from Safe's
 * service from the Safe's nonce in the latest block, or null: a Safe app
 * never proposes an action that is already queued, whoever queued it,
 * whatever its stamp ({@link heldCall}). A queued call the contract refuses
 * once its deadline passed is passed over when that block is past the
 * deadline: it can no longer run. Throws when the block, the nonce or the
 * queue can't be read.
 */
export async function findPendingSafeAppProposal(
  client: SafeQueueClient,
  chainId: number,
  safe: Address,
  call: SafeAppCall,
  service?: SafeServiceOptions,
): Promise<{
  tx: SafeQueuedTransaction;
  proposalHash: Hex;
  call: SafeAppCall;
} | null> {
  // One block's view: its time, and the Safe's nonce in it. A proposal listed
  // from that nonce had not run by that block, so a deadline already past then
  // proves it never will.
  const block = await client.getBlock();
  const nonce = await readBoundedSafeNonce(client, safe, {
    blockNumber: block.number ?? undefined,
  }).catch(() => null);
  if (nonce === null || nonce > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("Could not read the Safe nonce.");
  }
  const held = heldCall(call);
  const queued = (
    await listPendingSafeTransactions(chainId, safe, Number(nonce), service)
  ).flatMap((tx) => {
    const proposed = proposedCall(tx);
    return proposed && sameCall(heldCall(proposed), held)
      ? [{ tx, call: proposed, deadline: stampedDeadline(proposed) }]
      : [];
  });
  const live = queued.find(
    ({ deadline }) => deadline === null || deadline >= block.timestamp,
  );
  return live
    ? {
        tx: live.tx,
        proposalHash: canonicalSafeTxHash(chainId, safe, live.tx),
        call: live.call,
      }
    : null;
}

/**
 * What one look at a proposal awaiting its signers finds:
 *
 * - `expired`: the latest block is past its deadline and the Safe's nonce in
 *   that block is not past the proposal's, so it never ran, and the contract
 *   refuses it in any later block;
 * - `passed`: the Safe's nonce is past the proposal's and Safe's service lists
 *   no execution of it: another transaction took its nonce, or the service has
 *   yet to list its own execution;
 * - `live`: it can still run, it ran, or the look could not tell.
 */
export type SafeProposalLook = "expired" | "passed" | "live";

/**
 * One look at `safe`'s proposal `proposalHash`: the latest block, the Safe's
 * nonce in that block, and Safe's authenticated record of the proposal. A read
 * that fails makes the look live.
 */
export async function lookAtSafeProposal(
  client: SafeQueueClient,
  chainId: number,
  safe: Address,
  proposalHash: Hex,
  service?: SafeServiceOptions,
): Promise<SafeProposalLook> {
  try {
    const block = await client.getBlock();
    const nonce = await readBoundedSafeNonce(client, safe, {
      blockNumber: block.number ?? undefined,
    });
    const record = await readSafeTransaction(
      chainId,
      safe,
      proposalHash,
      service,
    );
    if (nonce === null || record.isExecuted) return "live";
    if (nonce > safeTransactionMessage(record).nonce) return "passed";
    const call = proposedCall(record);
    const deadline = call && stampedDeadline(call);
    return deadline !== null && block.timestamp > deadline ? "expired" : "live";
  } catch {
    return "live";
  }
}

/** A watch looks at its proposal once a minute, so it reads the Safe's nonce at most that often. */
const SAFE_LOOK_MS = 60_000;
/** How long looks in a row must find the Safe past a proposal before it counts as replaced. */
const SAFE_REPLACED_AFTER_MS = 10 * 60_000;

/**
 * Watches a proposal awaiting its signers, one {@link lookAtSafeProposal} a
 * minute, until `signal` aborts. It ends `expired` at the first look that
 * finds it expired, and `replaced` once looks in a row have found it passed
 * for ten minutes: one such look proves nothing, since Safe's service may list
 * the proposal's own execution later. Any other look starts that count again.
 */
export async function watchSafeProposal(
  client: SafeQueueClient,
  chainId: number,
  safe: Address,
  proposalHash: Hex,
  signal: AbortSignal,
  service?: SafeServiceOptions,
): Promise<"expired" | "replaced"> {
  let passedSince: number | null = null;
  for (;;) {
    await pause(SAFE_LOOK_MS, signal, waitAborted);
    const look = await lookAtSafeProposal(
      client,
      chainId,
      safe,
      proposalHash,
      service,
    );
    if (look === "expired") return look;
    passedSince = look === "passed" ? (passedSince ?? Date.now()) : null;
    if (
      passedSince !== null &&
      Date.now() - passedSince >= SAFE_REPLACED_AFTER_MS
    )
      return "replaced";
  }
}

/** Looks at the chain for an execution returned at once, and the pause between them. */
const AT_ONCE_LOOKS = 5;
const AT_ONCE_LOOK_MS = 2_000;

/**
 * The transaction `hash` names on the chain, or null: Safe{Wallet} replies
 * with the execution's own hash when the owner executes at once, and the node
 * may learn it a moment later. It looks up to 5 times, 2 seconds apart (8
 * seconds at most), before the reply counts as a proposal.
 */
export async function atOnceExecution<T>(
  client: { getTransaction(args: { hash: Hex }): Promise<T> },
  hash: Hex,
): Promise<T | null> {
  for (let look = 1; look <= AT_ONCE_LOOKS; look += 1) {
    try {
      return await client.getTransaction({ hash });
    } catch {
      if (look < AT_ONCE_LOOKS) {
        await pause(AT_ONCE_LOOK_MS, undefined, waitAborted);
      }
    }
  }
  return null;
}

/**
 * The chain's last word before a proposal ends unproven: what `read` returns,
 * or null when the chain says there is none (viem's transaction or receipt
 * not-found). A node that can't answer says nothing, so it is asked again a
 * minute later, for as long as it takes, with `onRetry` called first. With
 * `exists`, the chain already proved the thing exists (its receipt is in
 * hand), so a not-found only says the node is behind, and is asked again too.
 */
export async function chainAnswer<T>(
  read: () => Promise<T>,
  { exists = false, onRetry }: { exists?: boolean; onRetry?: () => void } = {},
): Promise<T | null> {
  for (;;) {
    try {
      return await read();
    } catch (error) {
      const notFound =
        error instanceof TransactionNotFoundError ||
        error instanceof TransactionReceiptNotFoundError;
      if (notFound && !exists) return null;
    }
    onRetry?.();
    await pause(SAFE_LOOK_MS, undefined, waitAborted);
  }
}

/**
 * The execution Safe's authenticated record names for `safeTxHash` when
 * `error` is its service's report that the proposal ran and failed, or null.
 * Only that execution's receipt decides the proposal, never the report alone.
 */
export async function reportedSafeExecution(
  error: unknown,
  chainId: number,
  safe: Address,
  safeTxHash: Hex,
  service?: SafeServiceOptions,
): Promise<Hex | null> {
  if (
    !(error instanceof Error) ||
    !/executed the proposal.*failed/i.test(error.message)
  )
    return null;
  const record = await readSafeTransaction(
    chainId,
    safe,
    safeTxHash,
    service,
  ).catch(() => null);
  const hash = (record as { transactionHash?: unknown } | null)
    ?.transactionHash;
  return typeof hash === "string" && /^0x[0-9a-fA-F]{64}$/u.test(hash)
    ? (hash as Hex)
    : null;
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
 * {@link fetchSafeCreation}). A 429 is retried up to three times after the
 * wait its Retry-After asks for, in delay-seconds or as an HTTP-date, when that
 * is at most {@link SAFE_SERVICE_MAX_RETRY_WAIT_MS}, or after 1, 2 and 3
 * seconds when it sends none. A 429 that asks for longer, or whose Retry-After
 * cannot be read, is handed back at once: retrying before the service allows
 * works against its rate limit. `retryRateLimited: false` hands back the first
 * 429 instead, for a caller that must not wait, such as a server render.
 */
export type SafeServiceOptions = {
  fetch?: typeof fetch;
  signal?: AbortSignal;
  retryRateLimited?: boolean;
};

/** The longest a service call waits to retry a 429: 10 seconds. A 429 that asks for longer is handed back at once. */
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
  { fetch: custom, signal, retryRateLimited }: SafeServiceOptions,
): Promise<Response> {
  const request = custom ?? fetch;
  for (let attempt = 0; ; attempt += 1) {
    signal?.throwIfAborted();
    const response = await request(url, signal ? { ...init, signal } : init);
    if (response.status !== 429 || attempt >= 3 || retryRateLimited === false) {
      return response;
    }
    const retryAfter = response.headers.get("retry-after");
    const wait =
      retryAfter === null ? 1000 * (attempt + 1) : retryAfterMs(retryAfter);
    // An unreadable Retry-After (null) is handed back as well.
    if (wait === null || wait > SAFE_SERVICE_MAX_RETRY_WAIT_MS) return response;
    await pause(wait, signal, () => signal!.reason);
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
