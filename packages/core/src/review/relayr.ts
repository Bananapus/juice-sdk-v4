import {
  ContractFunctionRevertedError,
  decodeFunctionData,
  encodeFunctionData,
  isAddress,
  keccak256,
  RpcError,
  RpcRequestError,
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
import { isDefiniteWalletRejection } from "./contractWrite.js";
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
/** A Relayr bundle or transaction ID, in lower case. */
export const RELAYR_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;
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
const UNNAMED =
  "Name every payment this session sent for the quote before paying it again.";
const UNVERIFIABLE =
  "Only an authenticated Relayr payment with its transaction hash can be verified.";

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

/**
 * Relayr's record of one bundle as {@link readRelayrBundle} returns it: the
 * bundle it names is the one asked for, and the rest is Relayr's word.
 */
export type RelayrBundle = {
  bundle_uuid: string;
  /** `true` once Relayr has a payment for the bundle. */
  payment_received?: unknown;
  /** Relayr's record of each transaction, as {@link RelayrTransactionRecord}. */
  transactions?: unknown;
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

/**
 * Why {@link requireRelayrPaymentRetry} will not clear a quote to be paid
 * again, or {@link requireRelayrBundleUnpaid} a bundle to be released:
 *
 * - `invalid`: no payment was named, or the payment, its sender, a hash or the
 *   bundle ID is malformed;
 * - `expired`: the quote's deadline is 15 seconds away or less;
 * - `paid`: a payment succeeded onchain, or Relayr reports one;
 * - `running`: Relayr reports a call of the bundle running or run;
 * - `unknown`: a payment or the bundle could not be read, or Relayr has not
 *   said whether the bundle is paid.
 */
export type RelayrPaymentRetryRefusal =
  | "invalid"
  | "expired"
  | "paid"
  | "running"
  | "unknown";

/**
 * A refusal to pay a Relayr quote again, with its `reason`. Never pay on one:
 * `paid` and `running` mean the bundle is funded, `unknown` may clear on a
 * later check, and `expired` needs a new quote.
 */
export class RelayrPaymentRetryError extends Error {
  readonly name = "RelayrPaymentRetryError";

  constructor(
    message: string,
    readonly reason: RelayrPaymentRetryRefusal,
  ) {
    super(message);
  }
}

/** `target` with `key` set to `value`, writable but never enumerable: an RPC error's URL can carry a key, and no JSON or log may show it. */
function withHidden<T extends object, K extends string>(
  target: T,
  key: K,
  value: unknown,
): T & Record<K, unknown> {
  Object.defineProperty(target, key, {
    value,
    writable: true,
    enumerable: false,
    configurable: true,
  });
  return target as T & Record<K, unknown>;
}

/** `error` with `cause` set like a native error cause, but on ES2021 and never enumerable: an RPC error's URL can carry a key. */
function withCause<T extends Error>(error: T, cause: unknown): T {
  return withHidden(error, "cause", cause);
}

function errorWithCause(message: string, cause: unknown): Error {
  return withCause(new Error(message), cause);
}

function isAddressLike(value: unknown): value is Address {
  return typeof value === "string" && isAddress(value, { strict: false });
}

function sameAddress(value: unknown, address: string): boolean {
  return isAddressLike(value) && value.toLowerCase() === address.toLowerCase();
}

/**
 * An address as viem's strict check reads one: in lower case, or with a valid
 * EIP-55 checksum. Any other mixed case is a corrupted address.
 */
function isStrictAddress(value: unknown): value is Address {
  return typeof value === "string" && isAddress(value);
}

/** {@link sameAddress}, spelled as {@link isStrictAddress} requires. */
function sameStrictAddress(value: unknown, address: string): boolean {
  return (
    isStrictAddress(value) && value.toLowerCase() === address.toLowerCase()
  );
}

function uuidOf(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const uuid = value.toLowerCase();
  return RELAYR_UUID_RE.test(uuid) ? uuid : null;
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
 * Relayr's `GET /v1/bundle/{uuid}` for exactly this bundle, or throws
 * `unavailable()`, with the failure as its cause when there is one. Never from
 * a cache: a stale answer could say a paid bundle is unpaid.
 */
async function readBundle(
  fetchBundle: typeof globalThis.fetch,
  bundleUuid: string,
  unavailable: () => Error,
): Promise<RelayrBundle> {
  let bundle:
    | (Omit<RelayrBundle, "bundle_uuid"> & { bundle_uuid?: unknown })
    | null;
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
    throw withCause(unavailable(), cause);
  }
  if (!bundle || uuidOf(bundle.bundle_uuid) !== bundleUuid) {
    throw unavailable();
  }
  return bundle as RelayrBundle;
}

/**
 * Relayr's `GET /v1/bundle/{uuid}` for exactly `bundleUuid`, read with `fetch`
 * (the global one by default) within 15 seconds and never from an HTTP cache:
 * a stale answer could say a paid bundle is unpaid. Throws, with the failure
 * as its cause, when the read fails or the answer names another bundle.
 * {@link requireRelayrBundleUnpaid} reads whether the bundle is unpaid.
 */
export async function readRelayrBundle(
  bundleUuid: string,
  {
    fetch: fetchBundle = globalThis.fetch,
  }: { fetch?: typeof globalThis.fetch } = {},
): Promise<RelayrBundle> {
  const uuid = uuidOf(bundleUuid);
  if (!uuid) {
    throw new Error(`Invalid Relayr bundle ID: ${String(bundleUuid)}.`);
  }
  return readBundle(
    fetchBundle,
    uuid,
    () =>
      new Error(`Could not read Relayr bundle ${uuid}. Check it again later.`),
  );
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
    const bundle = await readBundle(
      fetchBundle,
      bundleUuid,
      () => new Error(UNRETURNED),
    );
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

/**
 * Whether a quote whose payment deadline is `deadline` (unix seconds) is dead
 * at `nowSeconds`, by default the clock: its deadline is 15 seconds away or
 * less, too close for a payment to land before it.
 */
export function quoteExpired(
  deadline: bigint,
  nowSeconds: number = Date.now() / 1_000,
): boolean {
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
 * token (in lower case or with their EIP-55 checksum), calldata that pays for
 * exactly `bundleUuid` with the quoted deadline, and a deadline more than 15
 * seconds away. Throws otherwise.
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
  if (!sameStrictAddress(payment.target, RELAYR_PAYMENT_ADDRESS)) {
    throw new Error("Relayr returned an unrecognized payment contract.");
  }
  if (!sameStrictAddress(payment.token, RELAYR_NATIVE_TOKEN)) {
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
 * so the quote's owner cannot change one under a later review. A chain with
 * any option whose contract or token is not an address as viem's strict check
 * reads one (in lower case, or with a valid EIP-55 checksum) gets no option:
 * Relayr's answer for that chain is corrupted.
 */
export function relayrPaymentOptions(
  quote: Pick<RelayrQuote, "bundle_uuid" | "payment_info">,
  destinationChainIds: readonly number[],
  nowSeconds?: number,
): RelayrPayment[] {
  const payments: RelayrPayment[] = Array.isArray(quote.payment_info)
    ? quote.payment_info
    : [];
  const corrupted = new Set(
    payments
      .filter(
        (payment) =>
          !isStrictAddress(payment?.target) || !isStrictAddress(payment?.token),
      )
      .map((payment) => payment?.chain),
  );
  const chains = new Set<number>();
  const options: RelayrPayment[] = [];
  for (const payment of payments) {
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
    if (chains.has(chainId) || corrupted.has(chainId)) continue;
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
 * The reviewed payment's parts when it is an authenticated Relayr payment,
 * `from` is an address and every hash a transaction hash; else null.
 */
function verifiablePayment(
  hashes: readonly unknown[],
  from: unknown,
  payment: ReviewedPayment,
): ReturnType<typeof readReviewedPayment> {
  const reviewed = readReviewedPayment(payment);
  return reviewed && isAddressLike(from) && hashes.every(isBytes32)
    ? reviewed
    : null;
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
  const reviewed = verifiablePayment([hash], from, payment);
  if (!reviewed) throw new Error(UNVERIFIABLE);
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
 * Throws in every other case, including when an answer is unavailable, and
 * refuses a malformed request before reading anything. Each refusal is a
 * {@link RelayrPaymentRetryError} naming its `reason`, except a hash that is
 * another transaction, which stays a {@link RelayrProofError}. Never pay on an
 * error.
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
    throw new RelayrPaymentRetryError(UNNAMED, "invalid");
  }
  const reviewed = verifiablePayment(hashes, from, payment);
  if (!reviewed) throw new RelayrPaymentRetryError(UNVERIFIABLE, "invalid");
  if (quoteExpired(reviewed.deadline, nowSeconds)) {
    throw new RelayrPaymentRetryError(EXPIRED, "expired");
  }
  for (const hash of hashes) {
    try {
      await verifyRelayrPayment(client, { hash, from, payment });
    } catch (error) {
      if (error instanceof RelayrPaymentRevertedError) continue;
      if (error instanceof RelayrProofError) throw error;
      throw withCause(
        new RelayrPaymentRetryError((error as Error).message, "unknown"),
        error,
      );
    }
    throw new RelayrPaymentRetryError(
      "This Relayr payment succeeded onchain, so its bundle is paid. Do not pay again.",
      "paid",
    );
  }
  await requireRelayrBundleUnpaid(reviewed.bundleUuid, { fetch: fetchBundle });
}

/**
 * Throws a {@link RelayrPaymentRetryError} unless Relayr's bundle
 * `bundleUuid`, read as {@link readRelayrBundle} reads it (with `fetch`, never
 * from an HTTP cache, and only an answer naming this bundle), reports no
 * payment received (`payment_received: false`) and at least one call, every
 * one still pending with no destination hash. Relayr runs only paid bundles,
 * so the refusal is `paid` when Relayr reports a payment, `running` when a
 * call is running or run, `unknown` when the bundle cannot be read or Relayr
 * has not said, and `invalid` for a malformed bundle ID. Confirm a bundle with
 * it before releasing its quote; {@link requireRelayrPaymentRetry} runs it
 * before clearing a quote to be paid again.
 */
export async function requireRelayrBundleUnpaid(
  bundleUuid: string,
  {
    fetch: fetchBundle = globalThis.fetch,
  }: { fetch?: typeof globalThis.fetch } = {},
): Promise<void> {
  const uuid = uuidOf(bundleUuid);
  if (!uuid) {
    throw new RelayrPaymentRetryError(
      `Invalid Relayr bundle ID: ${String(bundleUuid)}.`,
      "invalid",
    );
  }
  requireUnpaidBundle(
    await readBundle(
      fetchBundle,
      uuid,
      () => new RelayrPaymentRetryError(UNKNOWN_PAYMENT, "unknown"),
    ),
  );
}

/** Relayr has not run the call: `pending`, in any case, with no destination hash. */
function relayrRecordPending(record: RelayrTransactionRecord): boolean {
  return (
    relayrDestinationHash(record) === null &&
    relayrStateIsPending(record?.status?.state)
  );
}

/** {@link requireRelayrBundleUnpaid}'s check of a bundle already read. */
function requireUnpaidBundle({
  payment_received,
  transactions,
}: Pick<RelayrBundle, "payment_received" | "transactions">): void {
  if (payment_received === true) {
    throw new RelayrPaymentRetryError(
      "Relayr already reports a payment for this bundle. Do not pay again.",
      "paid",
    );
  }
  if (
    payment_received !== false ||
    !Array.isArray(transactions) ||
    !transactions.length
  ) {
    throw new RelayrPaymentRetryError(UNKNOWN_PAYMENT, "unknown");
  }
  if (transactions.some((record) => !relayrRecordPending(record))) {
    throw new RelayrPaymentRetryError(
      "Relayr reports a transaction of this bundle as running or run. Do not pay again.",
      "running",
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

// A session whose bundle won't run as signed: an unpaid quote that was
// released, a payment that reverted, a bundle whose calls reverted, a nonce
// that moved. These rules decide what it may do next from the chain alone
// (rulings R104, R114 and R117). Each signed forward request is classified at
// a canonical finalized block on its chain, by OpenZeppelin ERC2771Forwarder's
// rules: a request runs only at its signer's current nonce and while its
// deadline is at least the block's timestamp, and an execute that reverts
// leaves the nonce unused. Anything that cannot be read counts as live.

/**
 * The reads that classify signed forward requests at a canonical finalized
 * block. Typed by the fields they read, so a PublicClient for any chain, with
 * that chain's formatters, satisfies it.
 */
export type RelayrFinalizedClient = {
  getBlock(args: { blockTag: "finalized" }): Promise<{
    number: bigint | null;
    hash: Hex | null;
    timestamp: bigint;
  }>;
  getBlock(args: { blockNumber: bigint }): Promise<{ hash: Hex | null }>;
  readContract(args: {
    address: Address;
    abi: typeof erc2771ForwarderAbi;
    functionName: "nonces";
    args: readonly [Address];
    blockNumber: bigint;
  }): Promise<bigint>;
};

/**
 * A signed forward request as these rules read it: its chain, its signer (the
 * request's `from`, whose forwarder nonce it uses), its deadline in seconds,
 * and the forwarder nonce it was signed with, when that was saved.
 */
export type RelayrSignedRequest = {
  chainId: number;
  signer: Address;
  deadline: number | bigint;
  nonce?: string | bigint;
};

/**
 * One signed request at a canonical finalized block on its chain (ruling
 * R114). It is dead once the forwarder's nonce for its signer moved past the
 * nonce it was signed with (it, or another request at that nonce, may have
 * run), or once its deadline is strictly earlier than that block's timestamp.
 * `unused`: the nonce still equals the saved one. Anything unknown is live: a
 * failed read, a node without a finalized block, a block no longer canonical,
 * and a request saved without its nonce until its deadline passes.
 */
export type RelayrRequestState =
  | { live: true; deadline: number }
  | { live: false; mayHaveRun: boolean; unused: boolean };

/**
 * What a set of requests allows together (ruling R114). While any one is live
 * the set holds until `until`, the deadline of its last live request.
 * `mayHaveRun` says whether a dead one's nonce moved or was never saved, and,
 * once every one is dead, `unused` whether there is at least one and every
 * nonce still equals the saved one.
 */
export type RelayrRequestsVerdict =
  | { live: true; until: number; mayHaveRun: boolean }
  | { live: false; mayHaveRun: boolean; unused: boolean };

/**
 * Why a session whose requests are all dead can be discarded (ruling R114):
 *
 * - `ran`: a request's nonce moved past the one it was signed with, or the
 *   session saved no nonces, so one may have run;
 * - `changed`: none ran, and the action's recheck refuses its calls;
 * - `expired`: none ran, and no recheck could run, as in an account view. The
 *   action itself still signs them again at their saved nonces.
 */
export type RelayrDiscardReason = "ran" | "changed" | "expired";

/**
 * What a session whose bundle won't run as signed does next, from its
 * requests' verdict (rulings R104 and R114). Discard ends only the session,
 * never what the action saved.
 *
 * - `hold`: a request can still run and one may already have run. No new
 *   signature, no new quote and no Discard until `until`.
 * - `refresh`: a request can still run and none moved (R114 (a)). Until
 *   `until`, the session may quote or pay its saved requests again while they
 *   still verify and the action's recheck passes, or sign each again at its
 *   saved nonce, in `nonces` (null when it saved none): the forwarder runs one
 *   request per nonce, so an old request and its refresh never both run. A
 *   signature at any other nonce waits until every request is dead.
 * - `re-sign`: every request is dead and unused, and the recheck passed: sign
 *   the calls again at `nonces` (R104).
 * - `discard`: every request is dead; Discard for `reason`. With `changed`,
 *   `error` is the recheck's refusal.
 * - `reorg-hold`: every request is dead and none moved, but a finalized nonce
 *   is below a saved one (a reorg dropped an earlier forwarded transaction),
 *   or there are no saved nonces to sign at (`nonces` omitted or empty), or
 *   there were no requests. It holds until the nonce catches up.
 * - `unchecked`: the recheck failed because the node could not answer (ruling
 *   R118): its cause chain holds a transport or JSON-RPC failure, or a revert
 *   without revert data, and no revert data. That decides nothing. Try again.
 *
 * `error` is never enumerable, so no JSON or log of an outcome shows it: an
 * RPC error's URL can carry a key.
 */
export type RelayrSessionOutcome =
  | { kind: "hold"; until: number }
  | { kind: "refresh"; until: number; nonces: string[] | null }
  | { kind: "re-sign"; nonces: string[] }
  | { kind: "discard"; reason: RelayrDiscardReason; error?: unknown }
  | { kind: "reorg-hold" }
  | { kind: "unchecked"; error: unknown };

/**
 * `read` at the chain's finalized block, with that block's timestamp, once
 * the block at its number still has the same hash after the read. Null while
 * any of it cannot be read: a node without the finalized tag, an RPC error, a
 * malformed block, or a block that is no longer canonical.
 */
export async function atCanonicalFinalizedBlock<T>(
  client: Pick<RelayrFinalizedClient, "getBlock">,
  read: (blockNumber: bigint) => Promise<T>,
): Promise<{ value: T; timestamp: bigint } | null> {
  try {
    const { number, hash, timestamp } = await client.getBlock({
      blockTag: "finalized",
    });
    if (
      typeof number !== "bigint" ||
      !isBytes32(hash) ||
      typeof timestamp !== "bigint"
    ) {
      return null;
    }
    const value = await read(number);
    const canonical = await client.getBlock({ blockNumber: number });
    return canonical.hash === hash ? { value, timestamp } : null;
  } catch {
    return null;
  }
}

/** `clientFor(chainId)`, or none when it has none or throws. */
function clientOn<T>(
  clientFor: (chainId: number) => T | undefined,
  chainId: number,
): T | undefined {
  try {
    return clientFor(chainId);
  } catch {
    return undefined;
  }
}

/**
 * The nonce the canonical forwarder on `chainId` expects next from `signer`
 * at the chain's finalized block, still canonical, with that block's
 * timestamp. Null while that cannot be read.
 */
async function finalizedForwarderNonce(
  clientFor: (chainId: number) => RelayrFinalizedClient | undefined,
  chainId: number,
  signer: Address,
): Promise<{ nonce: bigint; timestamp: bigint } | null> {
  const forwarder = forwarderOn(chainId);
  const reader =
    forwarder && isAddressLike(signer)
      ? clientOn(clientFor, chainId)
      : undefined;
  if (!forwarder || !reader) return null;
  const finalized = await atCanonicalFinalizedBlock(reader, (blockNumber) =>
    reader.readContract({
      address: forwarder,
      abi: erc2771ForwarderAbi,
      functionName: "nonces",
      args: [signer],
      blockNumber,
    }),
  );
  const nonce = finalized && uint256(finalized.value);
  return finalized && nonce !== null
    ? { nonce, timestamp: finalized.timestamp }
    : null;
}

/**
 * The requests a session published, each read from its entry (an `execute`
 * on its chain's canonical forwarder, as {@link relayrForwardRequest} reads
 * it), with the nonce it was signed with when `nonces` has one for every
 * entry. Null when there are none, or one is not such a request: requests
 * that can't be read can't be classified, so they never count as dead.
 */
export function relayrSignedRequests(
  entries:
    | readonly Pick<RelayrEntry, "chain" | "target" | "data">[]
    | undefined,
  nonces?: readonly (string | bigint)[],
): RelayrSignedRequest[] | null {
  const published = Array.isArray(entries) ? entries : [];
  const saved =
    Array.isArray(nonces) && nonces.length === published.length
      ? nonces
      : undefined;
  const requests = published.flatMap((entry, index) => {
    const request = relayrForwardRequest(entry);
    return request
      ? [
          {
            chainId: entry.chain,
            signer: request.from,
            deadline: request.deadline,
            ...(saved ? { nonce: saved[index] } : {}),
          },
        ]
      : [];
  });
  return published.length && requests.length === published.length
    ? requests
    : null;
}

/**
 * The one classification of signed forward requests (ruling R114): each at a
 * canonical finalized block on its chain, read once per chain and signer with
 * `clientFor(chainId)`. Never throws for a chain it cannot read: its requests
 * are live.
 */
export async function relayrRequestStates(
  clientFor: (chainId: number) => RelayrFinalizedClient | undefined,
  requests: readonly RelayrSignedRequest[],
): Promise<RelayrRequestState[]> {
  const finalized = new Map<
    string,
    ReturnType<typeof finalizedForwarderNonce>
  >();
  return Promise.all(
    requests.map(
      async ({
        chainId,
        signer,
        deadline,
        nonce,
      }): Promise<RelayrRequestState> => {
        const key = `${chainId}:${String(signer).toLowerCase()}`;
        if (!finalized.has(key)) {
          finalized.set(
            key,
            finalizedForwarderNonce(clientFor, chainId, signer),
          );
        }
        const block = await finalized.get(key);
        // A saved nonce that can't be read leaves the request unknown, and a
        // deadline that can't be read has not passed.
        const saved = nonce === undefined ? null : uint256(nonce);
        const end = uint256(deadline);
        if (block && (nonce === undefined || saved !== null)) {
          if (saved !== null && block.nonce > saved) {
            return { live: false, mayHaveRun: true, unused: false };
          }
          if (end !== null && end < block.timestamp) {
            return {
              live: false,
              mayHaveRun: saved === null,
              unused: block.nonce === saved,
            };
          }
        }
        return { live: true, deadline: Number(deadline) };
      },
    ),
  );
}

/**
 * What `states` allow together. No states are neither run nor unused, so a
 * session with none holds.
 */
export function relayrRequestsVerdict(
  states: readonly RelayrRequestState[],
): RelayrRequestsVerdict {
  const deadlines = states.flatMap((state) =>
    state.live ? [state.deadline] : [],
  );
  const mayHaveRun = states.some((state) => !state.live && state.mayHaveRun);
  if (deadlines.length) {
    return { live: true, until: Math.max(...deadlines), mayHaveRun };
  }
  return {
    live: false,
    mayHaveRun,
    unused:
      states.length > 0 && states.every((state) => !state.live && state.unused),
  };
}

/**
 * Ruling R117: whether every request is dead at a canonical finalized block
 * on its chain, anything unknown counting as live. A saved session reserves
 * its signers' forwarder nonces on its chains exactly while one of its
 * requests is live, never by a device clock or a quote's expiry. Requests that
 * can't be classified (null) or none at all are never dead.
 */
export async function relayrRequestsDead(
  clientFor: (chainId: number) => RelayrFinalizedClient | undefined,
  requests: readonly RelayrSignedRequest[] | null | undefined,
): Promise<boolean> {
  return (
    Array.isArray(requests) &&
    requests.length > 0 &&
    !relayrRequestsVerdict(await relayrRequestStates(clientFor, requests)).live
  );
}

/**
 * Whether the chain's finalized block, still canonical, is past `deadline`
 * (seconds, as a safe integer, decimal or 0x-hex digits, or a bigint): its
 * timestamp is later. False while that is unknown, or the deadline can't be
 * read.
 */
export async function relayrDeadlinePassed(
  client: Pick<RelayrFinalizedClient, "getBlock">,
  deadline: number | string | bigint,
): Promise<boolean> {
  const finalized = await atCanonicalFinalizedBlock(
    client,
    async () => undefined,
  );
  const end = uint256(deadline);
  return !!finalized && end !== null && finalized.timestamp > end;
}

/** Whether `value` is a {@link RelayrDiscardReason}, for a reason read back from storage. */
export function isRelayrDiscardReason(
  value: unknown,
): value is RelayrDiscardReason {
  return value === "ran" || value === "changed" || value === "expired";
}

/** The transport failures that mean a recheck could not reach the chain. */
const UNREACHED = ["HttpRequestError", "TimeoutError", "WebSocketRequestError"];

/**
 * Revert data: whole bytes of hex, at least a 4-byte selector, bare or in
 * Nethermind's "Reverted 0x…" form.
 */
const REVERT_DATA = /^(?:Reverted )?0x(?:[0-9a-fA-F]{2}){4,}$/u;

/**
 * Whether one error carries revert data, whatever its JSON-RPC code: in its
 * `data`, in a `data.data` a node nests there, or in the `raw` data of viem's
 * contract revert. Such an error is the chain answering.
 */
function revertedWithData(link: Error): boolean {
  const { raw, data } = link as { raw?: unknown; data?: unknown };
  const nested =
    data !== null && typeof data === "object"
      ? (data as { data?: unknown }).data
      : undefined;
  return [raw, data, nested].some(
    (value) => typeof value === "string" && REVERT_DATA.test(value),
  );
}

/**
 * Ruling R118: the node could not answer the recheck, so it says nothing
 * about the project. Within the error's first eight links (its cause chain),
 * one is a transport failure (HTTP, timeout or WebSocket), a JSON-RPC failure
 * (viem's `RpcRequestError` or any `RpcError`, such as -32001, -32005 or
 * -32603), or a contract revert without revert data, as viem reads a bare
 * revert, transient or not; and no link carries revert data, which on any
 * code is the chain answering. An app's error that wraps such a failure as
 * its `cause` reads the same way.
 */
function recheckUnreached(error: unknown): boolean {
  const links: Error[] = [];
  for (
    let link = error;
    links.length < 8 && link instanceof Error;
    link = (link as { cause?: unknown }).cause
  ) {
    links.push(link);
  }
  return (
    !links.some(revertedWithData) &&
    links.some(
      (link) =>
        UNREACHED.includes(link.name) ||
        link instanceof RpcRequestError ||
        link instanceof RpcError ||
        link instanceof ContractFunctionRevertedError,
    )
  );
}

/**
 * What a session does next from its requests' `verdict` (see
 * {@link RelayrSessionOutcome}), which was classified before the action's own
 * recheck, since a request that ran would make the recheck refuse.
 *
 * `nonces` must be the saved nonces of exactly the requests that were
 * classified into `verdict`, in the same order: `refresh` and `re-sign` hand
 * them back to sign at, and nothing here can check them against the verdict.
 * Without them (omitted, empty or not a list), a session whose requests are
 * all dead and unused holds as `reorg-hold`, and is neither discarded nor
 * signed again.
 *
 * `recheck`, the action's proof that its calls still apply, resolves when
 * they do and throws when they don't; a value it resolves with is never read.
 * It runs only once every request is dead and unused. Without one, as in an
 * account view, such a session can be discarded as `expired`. A recheck that
 * fails because the node could not answer decides nothing. Known limit: a
 * reorg that drops an earlier forwarded transaction can leave a finalized
 * nonce below a saved one, and the session holds until the nonce catches up.
 */
export async function relayrSessionOutcome(
  verdict: RelayrRequestsVerdict,
  {
    nonces,
    recheck,
  }: {
    nonces?: readonly string[] | null;
    recheck?: () => Promise<void>;
  } = {},
): Promise<RelayrSessionOutcome> {
  const saved = Array.isArray(nonces) && nonces.length ? [...nonces] : null;
  if (verdict.live) {
    return verdict.mayHaveRun
      ? { kind: "hold", until: verdict.until }
      : { kind: "refresh", until: verdict.until, nonces: saved };
  }
  if (verdict.mayHaveRun) return { kind: "discard", reason: "ran" };
  if (!verdict.unused || !saved) return { kind: "reorg-hold" };
  if (!recheck) return { kind: "discard", reason: "expired" };
  try {
    await recheck();
  } catch (error) {
    return recheckUnreached(error)
      ? withHidden({ kind: "unchecked" as const }, "error", error)
      : withHidden(
          { kind: "discard" as const, reason: "changed" as const },
          "error",
          error,
        );
  }
  return { kind: "re-sign", nonces: saved };
}

// Ruling R104 for a quote a session paid: the payments it sent, the option it
// pays again with, where a failed payment attempt leaves the quote, and when
// a quote whose own payments reverted is funded by another, still payable,
// or released, so that its action quotes its calls again.

/**
 * A payment sent for a quote: the payment {@link relayrPaymentDetails}
 * authenticated, with its amount and deadline in decimal so JSON keeps them,
 * and the hash it was mined under.
 */
export type RelayrSentPayment = Omit<
  RelayrPaymentDetails,
  "amount" | "deadline"
> & {
  amount: string;
  deadline: string;
  hash: Hex;
};

/** The payment `details` describes, as a session records it once sent under `hash`. */
export function sentRelayrPayment(
  details: RelayrPaymentDetails,
  hash: Hex,
): RelayrSentPayment {
  return {
    ...details,
    amount: details.amount.toString(),
    deadline: details.deadline.toString(),
    hash,
  };
}

/** The most payments one quote's journal keeps. No payment is sent beyond them. */
export const MAX_RELAYR_SENT_PAYMENTS = 16;

/**
 * A saved sent payment, read strictly, or null. Its deadline must be the one
 * its calldata pays until, which the payment's proof binds onchain.
 */
function relayrSentPaymentSnapshot(value: unknown): RelayrSentPayment | null {
  if (!value || typeof value !== "object") return null;
  const { hash, chainId, target, calldata, amount, deadline, bundleUuid } =
    value as Record<string, unknown>;
  return isBytes32(hash) &&
    typeof chainId === "number" &&
    relayrSupportsChain(chainId) &&
    isStrictAddress(target) &&
    typeof calldata === "string" &&
    /^0x[0-9a-f]{136}$/iu.test(calldata) &&
    typeof amount === "string" &&
    /^\d{1,78}$/u.test(amount) &&
    typeof deadline === "string" &&
    /^\d{1,13}$/u.test(deadline) &&
    typeof bundleUuid === "string" &&
    RELAYR_UUID_RE.test(bundleUuid) &&
    BigInt(deadline) === calldataDeadline(calldata)
    ? {
        hash,
        chainId,
        target,
        calldata: calldata as Hex,
        amount,
        deadline,
        bundleUuid,
      }
    : null;
}

/**
 * A saved list of sent payments, read strictly: at most
 * {@link MAX_RELAYR_SENT_PAYMENTS}, each with only a payment's own fields.
 * Null when any of it is malformed.
 */
export function relayrSentPaymentsSnapshot(
  values: unknown,
): RelayrSentPayment[] | null {
  if (!Array.isArray(values) || values.length > MAX_RELAYR_SENT_PAYMENTS) {
    return null;
  }
  const payments = values.map(relayrSentPaymentSnapshot);
  return payments.every((payment) => payment !== null)
    ? (payments as RelayrSentPayment[])
    : null;
}

/**
 * The saved option a quote paid before is paid again with: exactly the one
 * its latest payment used, on its chain with its calldata (in any case) and
 * amount. Throws when no option is that one, and when an option on that
 * chain with that calldata whose amount can't be read comes before it.
 */
export function relayrRetryOption(
  payments:
    | readonly Pick<RelayrSentPayment, "chainId" | "calldata" | "amount">[]
    | undefined,
  options: readonly RelayrPayment[] | undefined,
): RelayrPayment {
  const latest = Array.isArray(payments)
    ? payments[payments.length - 1]
    : undefined;
  let option: RelayrPayment | undefined;
  if (latest && Array.isArray(options)) {
    for (const item of options) {
      if (
        item.chain !== latest.chainId ||
        typeof item.calldata !== "string" ||
        item.calldata.toLowerCase() !== latest.calldata.toLowerCase() ||
        typeof item.amount !== "string"
      ) {
        continue;
      }
      // An earlier twin whose amount can't be read ends the search, refused.
      const amount = uint256(item.amount);
      if (amount === null) break;
      if (amount === uint256(latest.amount)) {
        option = item;
        break;
      }
    }
  }
  if (!option) {
    throw new Error(
      "This Relayr quote cannot be paid again from its saved record. Keep it pending; do not pay again.",
    );
  }
  return option;
}

/**
 * Where a failed payment attempt leaves its quote: `reverted` when the
 * payment reverted onchain, or when the wallet declined to pay a quote paid
 * before, which stays on {@link requireRelayrPaymentRetry}'s rule; `unpaid`
 * when the wallet declined its first payment; null when nothing is known, and
 * the journal stays as it is. `sending` is whether the wallet held the
 * payment, and `paid` whether the quote was paid before.
 */
export function relayrPaymentAttemptOutcome(
  error: unknown,
  { sending, paid }: { sending: boolean; paid: boolean },
): "reverted" | "unpaid" | null {
  if (error instanceof RelayrPaymentRevertedError) return "reverted";
  if (sending && isDefiniteWalletRejection(error)) {
    return paid ? "reverted" : "unpaid";
  }
  return null;
}

/**
 * Clear a quote paid before for one more payment, with
 * {@link requireRelayrPaymentRetry}'s rule for each option its payments used.
 * `payments` is every payment the session sent for the quote, as mined; those
 * of one option (its chain, its calldata in any case, and its amount) are
 * proven together on its chain, with `clientFor`. Before reading anything it
 * refuses, as `invalid`, an empty list and anything
 * {@link relayrSentPaymentsSnapshot} refuses, and a payment of another
 * bundle; a chain without a client is `unknown`. Never pay on an error.
 */
export async function requireRelayrRetry(
  clientFor: (chainId: number) => RelayrProofClient | undefined,
  {
    payments,
    from,
    bundleUuid,
  }: {
    payments: readonly RelayrSentPayment[];
    from: Address;
    bundleUuid: string;
  },
  options: { fetch?: typeof globalThis.fetch; nowSeconds?: number } = {},
): Promise<void> {
  if (!Array.isArray(payments) || !payments.length) {
    throw new RelayrPaymentRetryError(UNNAMED, "invalid");
  }
  const sent = relayrSentPaymentsSnapshot(payments);
  if (!sent) throw new RelayrPaymentRetryError(UNVERIFIABLE, "invalid");
  if (sent.some((payment) => payment.bundleUuid !== bundleUuid)) {
    throw new Error(
      "A saved Relayr payment belongs to another bundle. Do not pay again; check the original bundle.",
    );
  }
  const byPayment = new Map<
    string,
    { payment: RelayrSentPayment; hashes: Hex[] }
  >();
  for (const payment of sent) {
    const key = `${payment.chainId}:${payment.calldata.toLowerCase()}:${payment.amount}`;
    const group = byPayment.get(key) ?? { payment, hashes: [] };
    group.hashes.push(payment.hash);
    byPayment.set(key, group);
  }
  for (const { payment, hashes } of byPayment.values()) {
    const client = clientOn(clientFor, payment.chainId);
    if (!client) {
      throw new RelayrPaymentRetryError(
        `No RPC is available for chain ${payment.chainId}. Do not pay again yet; check it later.`,
        "unknown",
      );
    }
    await requireRelayrPaymentRetry(client, { hashes, from, payment }, options);
  }
}

/**
 * Prove a saved session's latest payment when it resumes, on its chain with
 * `clientFor`. Resolves true once it succeeded onchain, and false while that
 * can't be proven: no payment, an `account` that is not an address, no client
 * for its chain, or a read that failed. A canonical revert runs `onReverted`
 * and is thrown, as is any other {@link RelayrProofError}; the quote then
 * waits on {@link requireRelayrPaymentRetry}'s rule.
 */
export async function proveSavedRelayrPayment(
  clientFor: (chainId: number) => RelayrProofClient | undefined,
  payments: readonly RelayrSentPayment[] | undefined,
  account: string | null | undefined,
  onReverted: () => void,
): Promise<boolean> {
  const latest = Array.isArray(payments)
    ? payments[payments.length - 1]
    : undefined;
  if (!latest || !isStrictAddress(account)) return false;
  const client = clientOn(clientFor, latest.chainId);
  if (!client) return false;
  try {
    await verifyRelayrPayment(client, {
      hash: latest.hash,
      from: account,
      payment: latest,
    });
    return true;
  } catch (error) {
    if (error instanceof RelayrPaymentRevertedError) onReverted();
    if (error instanceof RelayrProofError) throw error;
    return false;
  }
}

/**
 * Whether the quote a session paid can still be paid at `nowMs` (the clock by
 * default): its latest payment's deadline is more than 15 seconds away, as
 * {@link quoteExpired} reads it and {@link requireRelayrPaymentRetry}
 * requires. A deadline or a time that can't be read is closed.
 */
export function relayrPaidQuoteOpen(
  payments: readonly Pick<RelayrSentPayment, "deadline">[] | undefined,
  nowMs: number = Date.now(),
): boolean {
  const latest = Array.isArray(payments)
    ? payments[payments.length - 1]
    : undefined;
  const deadline = latest ? uint256(latest.deadline) : null;
  return (
    deadline !== null &&
    Number.isFinite(nowMs) &&
    !quoteExpired(deadline, nowMs / 1_000)
  );
}

/**
 * Every option of a quote that {@link relayrPaymentDetails} accepts, expired
 * or not, several on one chain included, with its details: the options a
 * session keeps, and whose deadlines a release waits out. An option nothing
 * can authenticate is never paid from, so it is left out.
 */
export function relayrQuotedOptions(
  quote: Pick<RelayrQuote, "bundle_uuid" | "payment_info">,
  destinationChainIds: readonly number[],
): { option: RelayrPayment; details: RelayrPaymentDetails }[] {
  return (Array.isArray(quote.payment_info) ? quote.payment_info : []).flatMap(
    (option) => {
      try {
        return [
          {
            option,
            details: relayrPaymentDetails(option, {
              bundleUuid: quote.bundle_uuid,
              destinationChainIds,
              nowSeconds: 0,
            }),
          },
        ];
      } catch {
        return [];
      }
    },
  );
}

/**
 * The reads a release makes on a chain: a payment's proof and a deadline at a
 * canonical finalized block. A PublicClient for any chain satisfies it.
 */
export type RelayrReleaseClient = RelayrProofClient &
  Pick<RelayrFinalizedClient, "getBlock">;

/** A quote as a session saved it, for {@link revertedRelayrQuote}. */
type RevertedQuote = {
  bundleUuid: string;
  /** Every payment sent for the quote, as mined. */
  payments: readonly RelayrSentPayment[];
  /** The quote's payment options, as Relayr quoted them. */
  options: readonly RelayrPayment[];
  destinationChainIds: readonly number[];
  /** The account the payments were sent from. */
  account: string;
};

/** One uncached read of the bundle, or null when it can't be read, names another bundle or lists no calls. */
async function relayrBundleIfNamed(
  bundleUuid: string,
  fetchBundle: typeof globalThis.fetch,
): Promise<{
  paymentReceived: unknown;
  records: RelayrTransactionRecord[];
} | null> {
  try {
    const { payment_received, transactions } = await readRelayrBundle(
      bundleUuid,
      { fetch: fetchBundle },
    );
    return Array.isArray(transactions)
      ? { paymentReceived: payment_received, records: transactions }
      : null;
  } catch {
    return null;
  }
}

/**
 * Nothing can fund the quote any more: every payment it sent is proven
 * canonically reverted, and the deadline of each of those payments, and of
 * each option {@link relayrQuotedOptions} keeps, has passed at a canonical
 * finalized block on its chain. Anything unread is false.
 */
async function relayrQuoteUnfundable(
  clientFor: (chainId: number) => RelayrReleaseClient | undefined,
  {
    payments,
    options,
    bundleUuid,
    destinationChainIds,
    account,
  }: RevertedQuote,
): Promise<boolean> {
  if (
    !Array.isArray(payments) ||
    !payments.length ||
    !Array.isArray(options) ||
    !isStrictAddress(account)
  ) {
    return false;
  }
  for (const payment of payments) {
    const client = clientOn(clientFor, payment.chainId);
    if (!client) return false;
    try {
      await verifyRelayrPayment(client, {
        hash: payment.hash,
        from: account,
        payment,
      });
      return false;
    } catch (error) {
      if (!(error instanceof RelayrPaymentRevertedError)) return false;
    }
    // The proof read the calldata's deadline word; the saved one must be it.
    if (uint256(payment.deadline) !== calldataDeadline(payment.calldata)) {
      return false;
    }
  }
  const deadlines = new Map<string, { chainId: number; deadline: string }>(
    payments.map((payment) => [
      `${payment.chainId}:${payment.deadline}`,
      payment,
    ]),
  );
  for (const { details } of relayrQuotedOptions(
    { bundle_uuid: bundleUuid, payment_info: [...options] },
    destinationChainIds,
  )) {
    deadlines.set(`${details.chainId}:${details.deadline}`, {
      chainId: details.chainId,
      deadline: details.deadline.toString(),
    });
  }
  for (const { chainId, deadline } of deadlines.values()) {
    const client = clientOn(clientFor, chainId);
    if (!client || !(await relayrDeadlinePassed(client, deadline))) {
      return false;
    }
  }
  return true;
}

/**
 * What a quote whose own payments reverted allows (ruling R104), from one
 * uncached read of its bundle (with `fetch`, the global one by default):
 *
 * - `funded` when Relayr reports a payment, or a call running or run: another
 *   payment funded it, so its destinations are proven, never paid again;
 * - `payable` while the quote of its latest payment is open at `nowMs` (the
 *   clock, read after the bundle, by default), for
 *   {@link requireRelayrPaymentRetry}'s rule;
 * - `released` once nothing can fund it: every payment it sent is proven
 *   canonically reverted on its chain (with `clientFor`), every deadline of
 *   those payments and of the options {@link relayrQuotedOptions} keeps
 *   passed at a canonical finalized block, and
 *   {@link requireRelayrBundleUnpaid}, reading the bundle once more, finds it
 *   unpaid with every call pending. Its action then quotes its calls again.
 *
 * Throws while an expired quote's release is unproven, and, unless the
 * bundle is funded, for a payment of another bundle or a time that can't be
 * read. Resolves with the records Relayr reported, or null when the bundle
 * could not be read.
 */
export async function revertedRelayrQuote(
  clientFor: (chainId: number) => RelayrReleaseClient | undefined,
  quote: RevertedQuote,
  {
    fetch: fetchBundle = globalThis.fetch,
    nowMs,
  }: { fetch?: typeof globalThis.fetch; nowMs?: number } = {},
): Promise<{
  state: "funded" | "payable" | "released";
  records: RelayrTransactionRecord[] | null;
}> {
  const bundle = await relayrBundleIfNamed(quote.bundleUuid, fetchBundle);
  const records = bundle?.records ?? null;
  if (
    bundle &&
    (bundle.paymentReceived === true ||
      bundle.records.some((record) => !relayrRecordPending(record)))
  ) {
    return { state: "funded", records };
  }
  // The clock is read after the bundle, whose read can take a while.
  const now = nowMs ?? Date.now();
  const ownPayments =
    Array.isArray(quote.payments) &&
    quote.payments.every((payment) => payment?.bundleUuid === quote.bundleUuid);
  if (ownPayments && Number.isFinite(now)) {
    if (relayrPaidQuoteOpen(quote.payments, now)) {
      return { state: "payable", records };
    }
    if (
      bundle &&
      (await relayrQuoteUnfundable(clientFor, quote)) &&
      (await requireRelayrBundleUnpaid(quote.bundleUuid, {
        fetch: fetchBundle,
      }).then(
        () => true,
        () => false,
      ))
    ) {
      return { state: "released", records };
    }
  }
  throw new Error(
    "This Relayr quote expired after its payment reverted. A new quote needs its deadline final onchain and Relayr to report nothing ran; try again in a few minutes.",
  );
}
