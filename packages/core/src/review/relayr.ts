import {
  decodeFunctionData,
  encodeFunctionData,
  isAddress,
  keccak256,
  type Address,
  type Hex,
  type PublicClient,
  type TransactionReceipt,
} from "viem";
import {
  erc2771ForwarderAbi,
  jbContractAddress,
} from "../generated/juicebox.js";
import { isBytes32, isHexBytes, uint256 } from "../untrusted.js";
import { simulateStateChangingTransaction } from "./simulation.js";

// Relayr runs a bundle of transactions on several chains for one prepaid
// native payment on one of them. Everything its API returns is untrusted:
// these helpers bind a quote to the exact transactions that were posted,
// authenticate the payment against Relayr's immutable payment contract, and
// prove payments and destination transactions from the chain itself. None of
// them signs or sends.

/** Relayr's HTTP API. */
export const RELAYR_API = "https://api.relayr.ba5ed.com";

/**
 * Relayr's immutable prepaid-native payment contract. A quote is untrusted
 * HTTP input, so paying any other target or calldata would turn the quote
 * service into a wallet transaction oracle.
 */
export const RELAYR_PAYMENT_ADDRESS =
  "0x1c05f7841379d4393574c0ffa17908ec40ffd97d" as Address;

/**
 * The payment function's selector. Its arguments are the bundle UUID as a
 * right-padded bytes16 word and a uint40 deadline.
 */
export const RELAYR_PAYMENT_SELECTOR = "0x103903a7";

/** keccak256 of the payment contract's runtime code. */
export const RELAYR_PAYMENT_CODE_HASH =
  "0x6006b5acadb4cd60aa5c00cb844c34563e182dff83d4f4ff4fde226f7df16fa6" as Hex;

/** The token Relayr quotes for a payment in the chain's native currency. */
export const RELAYR_NATIVE_TOKEN =
  "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" as Address;

/** The gas a payment is simulated and sent with. */
export const RELAYR_PAYMENT_GAS = 150_000n;

/**
 * How long a signed ERC-2771 ForwardRequest stays executable: 47 hours from
 * signing. The forwarder rejects it afterwards, even if the bundle was paid.
 */
export const RELAYR_FORWARDER_DEADLINE_SECONDS = 47 * 60 * 60;

/** ERC2771Context's view on a destination contract. */
export const TRUSTED_FORWARDER_ABI = [
  {
    type: "function",
    name: "isTrustedForwarder",
    stateMutability: "view",
    inputs: [{ name: "forwarder", type: "address" }],
    outputs: [{ type: "bool" }],
  },
] as const;

/** EIP-712 types of an ERC2771Forwarder ForwardRequest. */
export const FORWARD_REQUEST_TYPES = {
  ForwardRequest: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "gas", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint48" },
    { name: "data", type: "bytes" },
  ],
} as const;

const MAINNETS: readonly number[] = [1, 10, 8453, 42161];
const TESTNETS: readonly number[] = [11155111, 11155420, 84532, 421614];
const PAYMENT_CODE_MAX_BYTES = 2_048;
const BUNDLE_READ_TIMEOUT_MS = 15_000;
const HTTP_DETAIL_CHARACTERS = 240;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;
// RFC 3339 with an explicit offset. A time without one is read in the
// machine's timezone, which would make the same quote pass or fail by place.
const DEADLINE_TIME =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/iu;

const UNBOUND =
  "Relayr did not bind every quoted transaction to a unique ID. Nothing was paid.";
const UNRETURNED =
  "Relayr did not return the quoted transactions. Nothing was paid.";
const NO_PROOF =
  "This saved Relayr bundle lacks exact destination proof. Keep it pending and verify the original transactions; do not pay again.";
const NOT_IDENTIFIED =
  "Relayr has not identified every exact destination transaction. Keep checking the original bundle; do not pay again.";
const EXPIRED =
  "This Relayr quote expired. Review the action again for a new quote.";
const UNKNOWN_PAYMENT =
  "Relayr has not said whether this bundle is paid. Do not pay again yet; check it later.";

/** One transaction of a bundle as posted to Relayr. `value` is decimal wei. */
export type RelayrEntry = {
  chain: number;
  target: Address;
  data: Hex;
  value: string;
  /** Its place among the bundle's transactions on the same chain, from 0. */
  virtual_nonce?: number;
};

/** The body posted to `${RELAYR_API}/v1/bundle/prepaid`. */
export type RelayrBundleRequest = {
  transactions: (RelayrEntry & { virtual_nonce: number })[];
  virtual_nonce_mode: "ChainIndependent";
};

/** A payment option exactly as Relayr quotes it: untrusted until {@link relayrPaymentDetails} accepts it. */
export type RelayrPayment = {
  chain: number;
  amount: string;
  calldata: Hex;
  target: Address;
  token?: Address;
  payment_deadline?: number | string;
};

/** A payment option authenticated against its bundle. */
export type RelayrPaymentDetails = {
  chainId: number;
  target: Address;
  amount: bigint;
  calldata: Hex;
  bundleUuid: string;
  deadline: bigint;
};

/** Relayr's status record for one bundle transaction: untrusted. */
export type RelayrTransactionRecord = {
  chain?: number;
  tx_uuid?: string;
  request?: RelayrEntry;
  status?: {
    state?: string;
    data?: { hash?: Hex; transaction?: { hash?: Hex } };
  };
};

/** A posted transaction and the Relayr ID bound to it by its exact request. */
export type RelayrTransactionBinding = {
  txUuid: string;
  chain: number;
  entry: RelayrEntry;
};

export type RelayrQuote = {
  bundle_uuid: string;
  payment_info: RelayrPayment[];
  /** Relayr's record for each posted transaction, in posted order. */
  transactions: RelayrTransactionRecord[];
  /** Each posted transaction with its quoted ID, in posted order. */
  expectedTransactions: RelayrTransactionBinding[];
};

export type RelayrProgressSummary = {
  confirmed: number;
  failed: number;
  pending: number;
  total: number;
};

/** The ERC-2771 request an `execute` call carries. */
export type RelayrForwardRequest = {
  from: Address;
  to: Address;
  value: bigint;
  gas: bigint;
  deadline: number;
  data: Hex;
  signature: Hex;
};

export type RelayrVerifiedDestination = {
  txUuid: string;
  chainId: number;
  receipt: TransactionReceipt;
};

/**
 * The reads a proof makes. Typed by the fields it reads, so a PublicClient
 * for any chain, with that chain's formatters, satisfies it.
 */
export type RelayrProofClient = {
  getTransaction(args: { hash: Hex }): Promise<{
    hash: Hex;
    chainId?: number;
    from: Address;
    to: Address | null;
    input: Hex;
    value: bigint;
    blockHash: Hex | null;
    blockNumber: bigint | null;
  }>;
  getTransactionReceipt(args: { hash: Hex }): Promise<TransactionReceipt>;
  getBlock(args: { blockNumber: bigint }): Promise<{ hash: Hex | null }>;
};

/**
 * The chain or Relayr contradicts the expected transaction: this evidence can
 * never prove it. Keep the action pending and never pay for it again.
 */
export class RelayrProofError extends Error {
  readonly name: string = "RelayrProofError";
}

/**
 * The payment at `hash` is exactly the reviewed payment, canonically included,
 * and reverted, so that one transaction paid nothing. It does not show that
 * the bundle is unpaid: the payment contract keeps no state, and Relayr keeps
 * every payment it receives for a bundle, so another payment may have funded
 * it. Only {@link requireRelayrPaymentRetry} clears the quote to be paid
 * again.
 */
export class RelayrPaymentRevertedError extends RelayrProofError {
  readonly name = "RelayrPaymentRevertedError";

  constructor(
    message: string,
    readonly hash: Hex,
    readonly chainId: number,
  ) {
    super(message);
  }
}

/**
 * The destination at `hash` is exactly the signed call, canonically included,
 * and reverted: the call failed on its chain. Whether its authorization can
 * still be used again (an unchanged forwarder nonce) is the caller's to check.
 */
export class RelayrDestinationRevertedError extends RelayrProofError {
  readonly name = "RelayrDestinationRevertedError";

  constructor(
    message: string,
    readonly hash: Hex,
    readonly chainId: number,
  ) {
    super(message);
  }
}

/** Like a native error cause, but set on ES2021 and never enumerable: an RPC error's URL can carry a key. */
function errorWithCause(message: string, cause: unknown): Error {
  const error = new Error(message);
  Object.defineProperty(error, "cause", {
    value: cause,
    writable: true,
    enumerable: false,
    configurable: true,
  });
  return error;
}

function isAddressLike(value: unknown): value is Address {
  return typeof value === "string" && isAddress(value, { strict: false });
}

function sameAddress(value: unknown, address: string): boolean {
  return isAddressLike(value) && value.toLowerCase() === address.toLowerCase();
}

function uuidOf(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const uuid = value.toLowerCase();
  return UUID.test(uuid) ? uuid : null;
}

type ReadEntry = { chain: number; target: Address; data: Hex; value: bigint };

function readEntry(entry: unknown): ReadEntry | null {
  if (!entry || typeof entry !== "object") return null;
  const { chain, target, data, value } = entry as Record<string, unknown>;
  const amount = uint256(value);
  return typeof chain === "number" &&
    Number.isSafeInteger(chain) &&
    chain > 0 &&
    isAddressLike(target) &&
    isHexBytes(data) &&
    amount !== null
    ? { chain, target, data, value: amount }
    : null;
}

/**
 * Whether a record's request is the posted transaction: the same chain,
 * target, calldata and value, and the same virtual nonce (always when
 * `nonce` is "required", else only when both carry one).
 */
function isRequestFor(
  request: unknown,
  entry: RelayrEntry,
  nonce: "required" | "when-present",
): boolean {
  const read = readEntry(request);
  const expected = readEntry(entry);
  if (!read || !expected) return false;
  const quoted = (request as { virtual_nonce?: unknown }).virtual_nonce;
  return (
    read.chain === expected.chain &&
    read.target.toLowerCase() === expected.target.toLowerCase() &&
    read.data.toLowerCase() === expected.data.toLowerCase() &&
    read.value === expected.value &&
    (nonce === "required"
      ? quoted === entry.virtual_nonce
      : typeof quoted !== "number" ||
        typeof entry.virtual_nonce !== "number" ||
        quoted === entry.virtual_nonce)
  );
}

/** Relayr runs bundles on Ethereum, Optimism, Base and Arbitrum, and on their Sepolia testnets. */
export function relayrSupportsChain(chainId: number): boolean {
  return MAINNETS.includes(chainId) || TESTNETS.includes(chainId);
}

/**
 * One destination per chain, every one in a single network family: all
 * mainnets or all testnets.
 */
export function relayrSupportsChains(chainIds: readonly number[]): boolean {
  return (
    chainIds.length > 0 &&
    new Set(chainIds).size === chainIds.length &&
    [MAINNETS, TESTNETS].some((family) =>
      chainIds.every((chainId) => family.includes(chainId)),
    )
  );
}

/**
 * The chains that may fund a bundle with these destinations: their network
 * family, so a testnet action never spends mainnet ETH. Empty when the
 * destinations are unsupported or mix families.
 */
export function relayrPaymentChains(chainIds: readonly number[]): number[] {
  const unique = [...new Set(chainIds)];
  if (!relayrSupportsChains(unique)) return [];
  return [...(MAINNETS.includes(unique[0]) ? MAINNETS : TESTNETS)];
}

/**
 * The body to post to `${RELAYR_API}/v1/bundle/prepaid`. Each chain's
 * transactions run in order: their virtual nonces count up from 0 per chain,
 * independently of other chains. Throws unless every transaction is
 * well-formed and the destinations share one network family.
 */
export function relayrBundleRequest(
  entries: readonly RelayrEntry[],
): RelayrBundleRequest {
  if (
    !relayrSupportsChains([...new Set(entries.map((entry) => entry.chain))])
  ) {
    throw new Error(
      "Choose supported destinations from one network family: mainnets or testnets.",
    );
  }
  const nextNonce = new Map<number, number>();
  const transactions = entries.map((entry) => {
    const read = readEntry(entry);
    if (!read) throw new Error("A Relayr bundle transaction is malformed.");
    const virtual_nonce = nextNonce.get(read.chain) ?? 0;
    nextNonce.set(read.chain, virtual_nonce + 1);
    return {
      chain: read.chain,
      target: read.target,
      data: read.data,
      value: read.value.toString(),
      virtual_nonce,
    };
  });
  return { transactions, virtual_nonce_mode: "ChainIndependent" };
}

/**
 * Relayr's `GET /v1/bundle/{uuid}` for exactly this bundle, or `unavailable`.
 * Never from a cache: a stale answer could say a paid bundle is unpaid.
 */
async function readBundle(
  fetchBundle: typeof globalThis.fetch,
  bundleUuid: string,
  unavailable: string,
): Promise<{ transactions?: unknown; payment_received?: unknown }> {
  let bundle: {
    bundle_uuid?: unknown;
    transactions?: unknown;
    payment_received?: unknown;
  } | null;
  try {
    const response = await fetchBundle(
      `${RELAYR_API}/v1/bundle/${bundleUuid}`,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(BUNDLE_READ_TIMEOUT_MS),
      },
    );
    if (!response.ok) throw new Error(`Relayr HTTP ${response.status}`);
    bundle = await response.json();
  } catch (cause) {
    throw errorWithCause(unavailable, cause);
  }
  if (!bundle || uuidOf(bundle.bundle_uuid) !== bundleUuid) {
    throw new Error(unavailable);
  }
  return bundle;
}

/**
 * Authenticate Relayr's response to posting `request` (from
 * {@link relayrBundleRequest}). Relayr lists transaction IDs out of request
 * order, so each posted transaction is bound to the quoted ID whose record
 * carries its exact request; the records are read from the bundle (with
 * `fetch`) when the response leaves them out. The records must be exactly the
 * quoted IDs, one each, as {@link verifyRelayrDestinations} will require of
 * Relayr's status. Throws, with nothing paid, unless every posted transaction
 * is bound to its own ID.
 */
export async function bindRelayrQuote(
  response: Response,
  request: RelayrBundleRequest,
  {
    fetch: fetchBundle = globalThis.fetch,
  }: { fetch?: typeof globalThis.fetch } = {},
): Promise<RelayrQuote> {
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Relayr HTTP ${response.status}${detail ? `: ${detail.slice(0, HTTP_DETAIL_CHARACTERS)}` : ""}`,
    );
  }
  let body: {
    bundle_uuid?: unknown;
    payment_info?: unknown;
    transactions?: unknown;
    tx_uuids?: unknown;
    txn_uuids?: unknown;
  } | null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  if (!body || typeof body !== "object") {
    throw new Error("Relayr returned an unreadable quote. Nothing was paid.");
  }
  const bundleUuid = uuidOf(body.bundle_uuid);
  if (!bundleUuid) {
    throw new Error("Relayr returned no valid bundle ID. Nothing was paid.");
  }
  const current = Array.isArray(body.tx_uuids) ? body.tx_uuids : null;
  const legacy = Array.isArray(body.txn_uuids) ? body.txn_uuids : null;
  if (current && legacy && JSON.stringify(current) !== JSON.stringify(legacy)) {
    throw new Error(
      "Relayr returned conflicting transaction IDs. Nothing was paid.",
    );
  }
  const { transactions } = request;
  const ids = (current ?? legacy ?? []).map(uuidOf);
  if (
    !transactions.length ||
    transactions.some(
      (entry) =>
        !Number.isSafeInteger(entry.virtual_nonce) || entry.virtual_nonce < 0,
    ) ||
    ids.length !== transactions.length ||
    ids.some((id) => id === null) ||
    new Set(ids).size !== ids.length ||
    !Array.isArray(body.payment_info)
  ) {
    throw new Error(UNBOUND);
  }
  const quoted = new Set(ids);
  const idOf = (record: unknown) =>
    record && typeof record === "object"
      ? uuidOf((record as { tx_uuid?: unknown }).tx_uuid)
      : null;
  let records: unknown[] = Array.isArray(body.transactions)
    ? body.transactions
    : [];
  if (
    records.length !== transactions.length ||
    records.some(
      (record) =>
        idOf(record) === null || !(record as { request?: unknown }).request,
    )
  ) {
    const bundle = await readBundle(fetchBundle, bundleUuid, UNRETURNED);
    if (!Array.isArray(bundle.transactions)) throw new Error(UNRETURNED);
    records = bundle.transactions;
  }
  // Every record carries one of the quoted IDs, once. With every posted
  // transaction bound to its own record below, the records are then exactly
  // the quoted IDs, as the destination proof requires of Relayr's status.
  const recordIds = records.map(idOf);
  if (
    recordIds.some((id) => id === null || !quoted.has(id)) ||
    new Set(recordIds).size !== records.length
  ) {
    throw new Error(UNBOUND);
  }
  const bound = transactions.map((entry) => {
    const matches = records.filter((record) =>
      isRequestFor(
        (record as { request?: unknown }).request,
        entry,
        "required",
      ),
    );
    if (matches.length !== 1) throw new Error(UNBOUND);
    return matches[0] as RelayrTransactionRecord;
  });
  const expectedTransactions = bound.map((record, index) => ({
    txUuid: idOf(record)!,
    chain: transactions[index].chain,
    entry: { ...transactions[index] },
  }));
  if (
    new Set(expectedTransactions.map((binding) => binding.txUuid)).size !==
    transactions.length
  ) {
    throw new Error(UNBOUND);
  }
  return {
    bundle_uuid: bundleUuid,
    payment_info: body.payment_info as RelayrPayment[],
    transactions: bound,
    expectedTransactions,
  };
}

/** A quoted deadline in seconds: integer seconds, or an RFC 3339 time with an offset. */
function deadlineSeconds(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value >= 0 ? value : null;
  }
  if (typeof value !== "string") return null;
  if (/^\d+$/u.test(value)) {
    const seconds = Number(value);
    return Number.isSafeInteger(seconds) ? seconds : null;
  }
  const milliseconds = DEADLINE_TIME.test(value) ? Date.parse(value) : NaN;
  return Number.isFinite(milliseconds) && milliseconds >= 0
    ? Math.floor(milliseconds / 1_000)
    : null;
}

/** The deadline word of payment calldata. */
function calldataDeadline(calldata: string): bigint {
  return BigInt(`0x${calldata.slice(74)}`);
}

/** A quote is dead once its deadline is 15 seconds away or less. */
function quoteExpired(deadline: bigint, nowSeconds: number): boolean {
  return deadline <= BigInt(Math.floor(nowSeconds)) + 15n;
}

/** Payment calldata: the selector, the bundle UUID as a right-padded bytes16 word, and a uint40 deadline word. */
function paymentCalldataFor(calldata: unknown, bundleUuid: string): boolean {
  return (
    typeof calldata === "string" &&
    /^0x[0-9a-f]{136}$/iu.test(calldata) &&
    calldata.slice(0, 10).toLowerCase() === RELAYR_PAYMENT_SELECTOR &&
    calldata.slice(10, 74).toLowerCase() ===
      `${bundleUuid.replaceAll("-", "")}${"0".repeat(32)}` &&
    calldataDeadline(calldata) <= 0xffffffffffn
  );
}

/**
 * Authenticate one of Relayr's payment options against its bundle: a chain in
 * the destinations' network family, Relayr's payment contract and native
 * token, calldata that pays for exactly `bundleUuid` with the quoted
 * deadline, and a deadline more than 15 seconds away. Throws otherwise.
 */
export function relayrPaymentDetails(
  payment: RelayrPayment,
  {
    bundleUuid,
    destinationChainIds,
    nowSeconds = Date.now() / 1_000,
  }: {
    bundleUuid: string;
    destinationChainIds: readonly number[];
    nowSeconds?: number;
  },
): RelayrPaymentDetails {
  const chainId = (payment as Partial<RelayrPayment> | null)?.chain;
  if (typeof chainId !== "number" || !relayrSupportsChain(chainId)) {
    throw new Error("Relayr returned an unsupported payment chain.");
  }
  if (!relayrPaymentChains(destinationChainIds).includes(chainId)) {
    throw new Error(
      "Choose a supported Relayr funding chain in the same network family as these destinations.",
    );
  }
  if (!sameAddress(payment.target, RELAYR_PAYMENT_ADDRESS)) {
    throw new Error("Relayr returned an unrecognized payment contract.");
  }
  if (!sameAddress(payment.token, RELAYR_NATIVE_TOKEN)) {
    throw new Error("Relayr returned an unsupported payment token.");
  }
  const amount = uint256(payment.amount);
  if (amount === null) {
    throw new Error("Relayr returned an invalid payment amount.");
  }
  const uuid = uuidOf(bundleUuid);
  if (!uuid) throw new Error("Relayr returned an invalid bundle ID.");
  const calldata =
    typeof payment.calldata === "string" ? payment.calldata.toLowerCase() : "";
  if (!/^0x[0-9a-f]{136}$/u.test(calldata)) {
    throw new Error("Relayr returned invalid payment calldata.");
  }
  if (calldata.slice(0, 10) !== RELAYR_PAYMENT_SELECTOR) {
    throw new Error("Relayr returned an unrecognized payment function.");
  }
  if (
    calldata.slice(10, 74) !== `${uuid.replaceAll("-", "")}${"0".repeat(32)}`
  ) {
    throw new Error("Relayr payment calldata does not match this bundle.");
  }
  const deadline = calldataDeadline(calldata);
  if (deadline > 0xffffffffffn) {
    throw new Error("Relayr returned an invalid payment deadline.");
  }
  const quoted = deadlineSeconds(payment.payment_deadline);
  if (quoted === null || BigInt(quoted) !== deadline) {
    throw new Error(
      "Relayr payment calldata does not match the quote deadline.",
    );
  }
  if (quoteExpired(deadline, nowSeconds)) throw new Error(EXPIRED);
  return {
    chainId,
    target: RELAYR_PAYMENT_ADDRESS,
    amount,
    calldata: calldata as Hex,
    bundleUuid: uuid,
    deadline,
  };
}

/**
 * The payment options to offer: each passes {@link relayrPaymentDetails} for
 * the quote's bundle and destinations, one per chain (Relayr's first), copied
 * so the quote's owner cannot change one under a later review.
 */
export function relayrPaymentOptions(
  quote: Pick<RelayrQuote, "bundle_uuid" | "payment_info">,
  destinationChainIds: readonly number[],
  nowSeconds?: number,
): RelayrPayment[] {
  const chains = new Set<number>();
  const options: RelayrPayment[] = [];
  for (const payment of Array.isArray(quote.payment_info)
    ? quote.payment_info
    : []) {
    let chainId: number;
    try {
      ({ chainId } = relayrPaymentDetails(payment, {
        bundleUuid: quote.bundle_uuid,
        destinationChainIds,
        nowSeconds,
      }));
    } catch {
      continue;
    }
    if (chains.has(chainId)) continue;
    chains.add(chainId);
    options.push({ ...payment });
  }
  return options;
}

/**
 * Prove the payment chain runs Relayr's payment contract: the code at
 * {@link RELAYR_PAYMENT_ADDRESS} hashes to {@link RELAYR_PAYMENT_CODE_HASH}.
 */
export async function requireRelayrPaymentRuntime(
  client: Pick<PublicClient, "getCode">,
): Promise<void> {
  let code: unknown;
  try {
    code = await client.getCode({
      address: RELAYR_PAYMENT_ADDRESS,
      blockTag: "latest",
    });
  } catch (cause) {
    throw errorWithCause(
      "Could not authenticate the Relayr payment contract.",
      cause,
    );
  }
  if (
    typeof code !== "string" ||
    !/^0x(?:[0-9a-f]{2})+$/iu.test(code) ||
    (code.length - 2) / 2 > PAYMENT_CODE_MAX_BYTES
  ) {
    throw new Error("Could not authenticate the Relayr payment contract.");
  }
  if (keccak256(code as Hex) !== RELAYR_PAYMENT_CODE_HASH) {
    throw new Error("Relayr payment contract code is not recognized.");
  }
}

/**
 * The node's own words for a failure: a viem error's `details` in its first
 * eight causes. Its `message` is never read, since over HTTP it quotes the
 * RPC URL. Only an error from outside viem is read by its message.
 */
function nodeDetail(error: unknown): string {
  let current = error;
  for (
    let depth = 0;
    depth < 8 && current && typeof current === "object";
    depth += 1
  ) {
    const { details, cause } = current as {
      details?: unknown;
      cause?: unknown;
    };
    if (typeof details === "string" && details.trim()) {
      return details.trim().split("\n")[0].slice(0, HTTP_DETAIL_CHARACTERS);
    }
    current = cause;
  }
  return error instanceof Error && !("shortMessage" in error)
    ? error.message.split("\n")[0].slice(0, HTTP_DETAIL_CHARACTERS)
    : "the node refused the call";
}

/**
 * Simulate the exact payment from `from` with the gas it is sent with,
 * without CCIP-read. Relayr's contract returns nothing, so a revert or any
 * return data refuses the payment.
 */
export async function simulateRelayrPayment(
  client: Pick<PublicClient, "request">,
  {
    from,
    payment,
  }: {
    from: Address;
    payment: Pick<RelayrPaymentDetails, "target" | "amount" | "calldata">;
  },
): Promise<void> {
  let result: Hex;
  try {
    result = await simulateStateChangingTransaction(client, {
      from,
      to: payment.target,
      data: payment.calldata,
      value: payment.amount,
      gas: RELAYR_PAYMENT_GAS,
    });
  } catch (cause) {
    throw errorWithCause(
      `The Relayr payment would fail: ${nodeDetail(cause)}`,
      cause,
    );
  }
  if (result !== "0x") {
    throw new Error("Relayr payment simulation returned an unexpected result.");
  }
}

/** A status label as Relayr's states are compared: trimmed, in any case. */
function stateLabel(state: unknown): string {
  return typeof state === "string" ? state.trim().toLowerCase() : "";
}

/** Success is `success` or `completed`, in any case. */
export function relayrStateIsSuccess(state?: string): boolean {
  const label = stateLabel(state);
  return label === "success" || label === "completed";
}

/** `pending`, in any case: Relayr has not run the transaction. */
function relayrStateIsPending(state: unknown): boolean {
  return stateLabel(state) === "pending";
}

/**
 * Only `failed`, in any case, is a failure. Relayr's other states say nothing
 * final; receipts stay the proof either way.
 */
export function relayrStateIsFailed(state?: string): boolean {
  return stateLabel(state) === "failed";
}

/** Counts by Relayr's labels, with rows it has not reported yet counted as pending. */
export function relayrProgress(
  records: readonly RelayrTransactionRecord[],
  expectedCount = records.length,
): RelayrProgressSummary {
  const total = Math.max(expectedCount, records.length);
  const confirmed = records.filter((record) =>
    relayrStateIsSuccess(record?.status?.state),
  ).length;
  const failed = records.filter((record) =>
    relayrStateIsFailed(record?.status?.state),
  ).length;
  return {
    confirmed,
    failed,
    pending: Math.max(total - confirmed - failed, 0),
    total,
  };
}

/** The destination transaction hash a record reports, if it is a transaction hash. */
export function relayrDestinationHash(
  record: RelayrTransactionRecord,
): Hex | null {
  const data = record?.status?.data;
  const hash = data?.hash ?? data?.transaction?.hash;
  return typeof hash === "string" && isBytes32(hash) ? hash : null;
}

/** A record's destination chain. Relayr's status nests it under `request`. */
export function relayrRecordChain(
  record: RelayrTransactionRecord,
): number | null {
  const chain = record?.request?.chain ?? record?.chain;
  return typeof chain === "number" && Number.isSafeInteger(chain) && chain > 0
    ? chain
    : null;
}

function forwarderOn(chainId: number): Address | undefined {
  return relayrSupportsChain(chainId)
    ? (
        jbContractAddress["6"].ERC2771Forwarder as Readonly<
          Record<string, Address>
        >
      )[chainId]
    : undefined;
}

/**
 * The ERC-2771 request an entry carries: an `execute` call on its chain's
 * canonical Juicebox V6 forwarder whose calldata re-encodes byte for byte.
 * Null for anything else: a raw call, another forwarder, another function or
 * a dirty encoding.
 */
export function relayrForwardRequest(
  entry: Pick<RelayrEntry, "chain" | "target" | "data">,
): RelayrForwardRequest | null {
  const forwarder = forwarderOn(entry?.chain);
  if (
    !forwarder ||
    !sameAddress(entry.target, forwarder) ||
    !isHexBytes(entry.data)
  ) {
    return null;
  }
  try {
    const decoded = decodeFunctionData({
      abi: erc2771ForwarderAbi,
      data: entry.data,
    });
    if (decoded.functionName !== "execute") return null;
    const [request] = decoded.args;
    const encoded = encodeFunctionData({
      abi: erc2771ForwarderAbi,
      functionName: "execute",
      args: [request],
    });
    return encoded.toLowerCase() === entry.data.toLowerCase()
      ? { ...request }
      : null;
  } catch {
    return null;
  }
}

type ExpectedTransaction = {
  hash: Hex;
  chainId: number;
  from?: Address;
  to: Address;
  data: Hex;
  value: bigint;
};

type ProofWords = {
  unavailable: string;
  mismatch: string;
  notCanonical: string;
};

/**
 * Read `expected.hash` and prove it is exactly the expected transaction,
 * canonically included. Returns its receipt, successful or reverted. A
 * transaction hash commits to its sender, target, calldata, value and chain,
 * so any difference there is a {@link RelayrProofError}. A receipt,
 * transaction and block that disagree (a lagging node, a reorg) prove nothing
 * either way.
 */
async function proveTransaction(
  client: RelayrProofClient,
  expected: ExpectedTransaction,
  words: ProofWords,
): Promise<TransactionReceipt> {
  const hash = expected.hash.toLowerCase();
  let transaction: Awaited<ReturnType<RelayrProofClient["getTransaction"]>>;
  let receipt: TransactionReceipt;
  try {
    [transaction, receipt] = await Promise.all([
      client.getTransaction({ hash: expected.hash }),
      client.getTransactionReceipt({ hash: expected.hash }),
    ]);
  } catch (cause) {
    throw errorWithCause(words.unavailable, cause);
  }
  if (
    transaction?.hash?.toLowerCase() !== hash ||
    receipt?.transactionHash?.toLowerCase() !== hash
  ) {
    throw new Error(words.unavailable);
  }
  if (
    transaction.chainId !== expected.chainId ||
    !sameAddress(transaction.to, expected.to) ||
    typeof transaction.input !== "string" ||
    transaction.input.toLowerCase() !== expected.data.toLowerCase() ||
    transaction.value !== expected.value ||
    (expected.from !== undefined &&
      !sameAddress(transaction.from, expected.from))
  ) {
    throw new RelayrProofError(words.mismatch);
  }
  if (
    !sameAddress(receipt.to, expected.to) ||
    typeof receipt.blockHash !== "string" ||
    !isBytes32(receipt.blockHash) ||
    transaction.blockHash?.toLowerCase() !== receipt.blockHash.toLowerCase() ||
    typeof receipt.blockNumber !== "bigint" ||
    transaction.blockNumber !== receipt.blockNumber ||
    (receipt.status !== "success" && receipt.status !== "reverted")
  ) {
    throw new Error(words.unavailable);
  }
  let block: Awaited<ReturnType<RelayrProofClient["getBlock"]>>;
  try {
    block = await client.getBlock({ blockNumber: receipt.blockNumber });
  } catch (cause) {
    throw errorWithCause(words.unavailable, cause);
  }
  if (block?.hash?.toLowerCase() !== receipt.blockHash.toLowerCase()) {
    throw new Error(words.notCanonical);
  }
  return receipt;
}

/**
 * A reviewed payment as {@link relayrPaymentDetails} returned it, or as a
 * saved session restores it from JSON, with the amount as a decimal string.
 */
type ReviewedPayment = Pick<
  RelayrPaymentDetails,
  "chainId" | "target" | "calldata" | "bundleUuid"
> & { amount: bigint | string };

/** A reviewed payment's parts, or null unless it is an authenticated Relayr payment. */
function readReviewedPayment(payment: ReviewedPayment): {
  chainId: number;
  amount: bigint;
  bundleUuid: string;
  calldata: Hex;
  deadline: bigint;
} | null {
  const bundleUuid = uuidOf(payment?.bundleUuid);
  const amount = uint256(payment?.amount);
  if (
    !relayrSupportsChain(payment?.chainId) ||
    !sameAddress(payment.target, RELAYR_PAYMENT_ADDRESS) ||
    amount === null ||
    bundleUuid === null ||
    !paymentCalldataFor(payment.calldata, bundleUuid)
  ) {
    return null;
  }
  return {
    chainId: payment.chainId,
    amount,
    bundleUuid,
    calldata: payment.calldata,
    deadline: calldataDeadline(payment.calldata),
  };
}

/**
 * Prove a Relayr payment from the chain: the transaction at `hash` is exactly
 * `payment` sent by `from` (chain, payment contract, calldata, value),
 * canonically included, and successful. Pass the hash that was mined: when a
 * wallet speeds a payment up, viem's receipt is the replacement's, so verify
 * its `transactionHash`, not the hash the wallet first returned.
 *
 * Throws {@link RelayrPaymentRevertedError} when it canonically reverted. That
 * transaction paid nothing, but the bundle may still be paid by another, so
 * only {@link requireRelayrPaymentRetry} clears the quote to be paid again.
 * {@link RelayrProofError} means the transaction is a different one: never pay
 * again. Any other error means the proof is unavailable for now.
 */
export async function verifyRelayrPayment(
  client: RelayrProofClient,
  {
    hash,
    from,
    payment,
  }: { hash: Hex; from: Address; payment: ReviewedPayment },
): Promise<TransactionReceipt> {
  const reviewed = readReviewedPayment(payment);
  if (
    typeof hash !== "string" ||
    !isBytes32(hash) ||
    !isAddressLike(from) ||
    !reviewed
  ) {
    throw new Error(
      "Only an authenticated Relayr payment with its transaction hash can be verified.",
    );
  }
  const receipt = await proveTransaction(
    client,
    {
      hash,
      chainId: reviewed.chainId,
      from,
      to: RELAYR_PAYMENT_ADDRESS,
      data: reviewed.calldata,
      value: reviewed.amount,
    },
    {
      unavailable: `Could not read Relayr payment ${hash} on chain ${reviewed.chainId}. Do not pay again; check it later.`,
      mismatch:
        "The funding transaction does not match the reviewed Relayr payment. Do not pay again; inspect the wallet's activity and the saved bundle.",
      notCanonical:
        "The Relayr funding receipt is no longer canonical. Do not pay again; check it later.",
    },
  );
  if (receipt.status === "reverted") {
    throw new RelayrPaymentRevertedError(
      "The Relayr funding transaction reverted onchain.",
      hash,
      reviewed.chainId,
    );
  }
  return receipt;
}

/**
 * Clear a saved quote to be paid once more after its payments reverted.
 * `hashes` is every payment this session sent for the quote, each as mined
 * (see {@link verifyRelayrPayment}). A bundle ID belongs to one quote, and a
 * quote to the session on the device that requested it, so the session's own
 * hashes are every payment that could have funded the bundle. Resolves only
 * when:
 *
 * - every one of them is exactly the reviewed payment, canonically reverted;
 * - the quote's deadline is more than 15 seconds away (`nowSeconds`, by
 *   default the clock);
 * - Relayr's bundle, read with `fetch` and never from a cache, reports
 *   `payment_received: false`, and every record is still pending with no
 *   destination hash. Relayr runs only paid bundles.
 *
 * The payment contract keeps no state and Relayr keeps every payment it
 * receives, so anything else rules a new payment out, and an empty list never
 * clears one. A payment still in flight from elsewhere is not visible yet.
 * Throws in every other case, including when an answer is unavailable. Never
 * pay on an error.
 */
export async function requireRelayrPaymentRetry(
  client: RelayrProofClient,
  {
    hashes,
    from,
    payment,
  }: { hashes: readonly Hex[]; from: Address; payment: ReviewedPayment },
  {
    fetch: fetchBundle = globalThis.fetch,
    nowSeconds = Date.now() / 1_000,
  }: { fetch?: typeof globalThis.fetch; nowSeconds?: number } = {},
): Promise<void> {
  if (!Array.isArray(hashes) || !hashes.length) {
    throw new Error(
      "Name every payment this session sent for the quote before paying it again.",
    );
  }
  const reviewed = readReviewedPayment(payment);
  if (reviewed && quoteExpired(reviewed.deadline, nowSeconds)) {
    throw new Error(EXPIRED);
  }
  for (const hash of hashes) {
    try {
      await verifyRelayrPayment(client, { hash, from, payment });
    } catch (error) {
      if (error instanceof RelayrPaymentRevertedError) continue;
      throw error;
    }
    throw new Error(
      "This Relayr payment succeeded onchain, so its bundle is paid. Do not pay again.",
    );
  }
  const { payment_received, transactions } = await readBundle(
    fetchBundle,
    reviewed!.bundleUuid,
    UNKNOWN_PAYMENT,
  );
  if (payment_received === true) {
    throw new Error(
      "Relayr already reports a payment for this bundle. Do not pay again.",
    );
  }
  if (
    payment_received !== false ||
    !Array.isArray(transactions) ||
    !transactions.length
  ) {
    throw new Error(UNKNOWN_PAYMENT);
  }
  if (
    transactions.some(
      (record: RelayrTransactionRecord) =>
        relayrDestinationHash(record) !== null ||
        !relayrStateIsPending(record?.status?.state),
    )
  ) {
    throw new Error(
      "Relayr reports a transaction of this bundle as running or run. Do not pay again.",
    );
  }
}

function destinationWords(hash: Hex, chainId: number): ProofWords {
  return {
    unavailable: `Could not read destination transaction ${hash} on chain ${chainId}. Keep the original bundle pending; do not pay again.`,
    mismatch:
      "The destination transaction does not prove the signed Relayr call. Keep the original bundle pending; do not pay again.",
    notCanonical:
      "The destination receipt is no longer canonical. Keep the original bundle pending.",
  };
}

/**
 * Prove one destination from the chain: the transaction at `hash` is exactly
 * `entry` (chain, target, calldata, value), canonically included, and
 * successful. Throws {@link RelayrDestinationRevertedError} when it
 * canonically reverted, {@link RelayrProofError} when it is a different
 * transaction, and any other error while the proof is unavailable.
 */
export async function verifyRelayrDestination(
  client: RelayrProofClient,
  { entry, hash }: { entry: RelayrEntry; hash: Hex },
): Promise<TransactionReceipt> {
  const read = readEntry(entry);
  if (!read || typeof hash !== "string" || !isBytes32(hash)) {
    throw new Error(NO_PROOF);
  }
  const receipt = await proveTransaction(
    client,
    {
      hash,
      chainId: read.chain,
      to: read.target,
      data: read.data,
      value: read.value,
    },
    destinationWords(hash, read.chain),
  );
  if (receipt.status === "reverted") {
    throw new RelayrDestinationRevertedError(
      "The destination receipt does not prove the signed Relayr call succeeded: it reverted onchain. Keep the original bundle pending; do not pay again.",
      hash,
      read.chain,
    );
  }
  return receipt;
}

/**
 * Prove every destination of a bundle from the chain. `bindings` are the
 * quote's {@link RelayrQuote.expectedTransactions}; `records` are Relayr's
 * status records, which only say which hash to check. Every record must carry
 * one of the quote's IDs, once. Each binding then needs exactly one record on
 * its chain carrying its exact request; only a record without a request is
 * paired by its ID, since bindings saved before request binding paired IDs by
 * position. Every hash must prove its binding onchain with
 * {@link verifyRelayrDestination}.
 *
 * With `account`, every entry must also be that account's ERC-2771 request
 * on its chain's canonical forwarder, for the entry's own value.
 *
 * Returns the receipts in binding order. Throws
 * {@link RelayrDestinationRevertedError} when a destination canonically
 * reverted, another {@link RelayrProofError} when Relayr or the chain
 * contradicts a binding, and any other error while proof is unavailable.
 * Never pay again on any error.
 */
export async function verifyRelayrDestinations(
  clientFor: (chainId: number) => RelayrProofClient | undefined,
  {
    bindings,
    records,
    account,
  }: {
    bindings: readonly RelayrTransactionBinding[];
    records: readonly RelayrTransactionRecord[];
    account?: Address;
  },
): Promise<RelayrVerifiedDestination[]> {
  const ids = bindings.map((binding) => uuidOf(binding?.txUuid));
  if (
    !bindings.length ||
    ids.some((id) => id === null) ||
    new Set(ids).size !== bindings.length ||
    bindings.some(
      (binding) => readEntry(binding.entry)?.chain !== binding.chain,
    )
  ) {
    throw new Error(NO_PROOF);
  }
  if (account !== undefined) {
    for (const { entry } of bindings) {
      const request = relayrForwardRequest(entry);
      if (
        !isAddressLike(account) ||
        !request ||
        !sameAddress(request.from, account) ||
        request.value !== uint256(entry.value)
      ) {
        throw new Error(
          "The saved relay authorization does not match its account or value.",
        );
      }
    }
  }
  const quoted = new Set(ids);
  const recordIds = records.map((record) => uuidOf(record?.tx_uuid));
  if (records.length !== bindings.length) throw new Error(NOT_IDENTIFIED);
  if (
    recordIds.some((id) => id === null || !quoted.has(id)) ||
    new Set(recordIds).size !== records.length
  ) {
    throw new RelayrProofError(
      "Relayr's status names a transaction this quote did not bind. Keep the original bundle pending; do not pay again.",
    );
  }
  const hashes = bindings.map((binding, index) => {
    const matches = records.filter(
      (record, recordIndex) =>
        relayrRecordChain(record) === binding.chain &&
        (record.request !== undefined && record.request !== null
          ? isRequestFor(record.request, binding.entry, "when-present")
          : recordIds[recordIndex] === ids[index]),
    );
    if (matches.length !== 1) {
      throw new RelayrProofError(
        "Relayr's destination call does not match the signed request. Keep the original bundle pending; do not pay again.",
      );
    }
    const hash = relayrDestinationHash(matches[0]);
    if (!hash) throw new Error(NOT_IDENTIFIED);
    return hash;
  });
  if (
    new Set(hashes.map((hash) => hash.toLowerCase())).size !== hashes.length
  ) {
    throw new RelayrProofError(
      "Relayr reported one destination transaction for two signed calls. Keep the original bundle pending; do not pay again.",
    );
  }
  const verified: RelayrVerifiedDestination[] = [];
  for (const [index, binding] of bindings.entries()) {
    const client = clientFor(binding.chain);
    if (!client) {
      throw new Error(
        `No RPC is available for chain ${binding.chain}. Keep the original bundle pending; do not pay again.`,
      );
    }
    verified.push({
      txUuid: ids[index]!,
      chainId: binding.chain,
      receipt: await verifyRelayrDestination(client, {
        entry: binding.entry,
        hash: hashes[index],
      }),
    });
  }
  return verified;
}
