import {
  decodeFunctionData,
  encodeFunctionData,
  isAddress,
  keccak256,
  toHex,
  zeroAddress,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";
import { readBoundedSafeNonce } from "../safe.js";
import {
  SAFE_EXEC_ABI,
  canonicalSafeTxHash,
  requireSafeExecutionSuccess,
  safeExecutionResult,
  type SafeTransactionMessage,
} from "../safeService.js";
import {
  RELAYR_API,
  RELAYR_UUID_RE,
  MAX_RELAYR_SENT_PAYMENTS,
  atCanonicalFinalizedBlock,
  bindRelayrQuote,
  readRelayrBundle,
  relayrBundleRequest,
  relayrPaymentOptions,
  relayrPaymentDetails,
  relayrPaymentAttemptOutcome,
  relayrDestinationHash,
  relayrDestinationHashes,
  relayrRetryOption,
  relayrSentPaymentsSnapshot,
  relayrStateIsPending,
  relayrStateIsFailed,
  relayrDeadlinePassed,
  relayrQuotedOptions,
  relayrQuoteUnfundable,
  RelayrPaymentRetryError,
  requireRelayrBundleUnpaid,
  requireRelayrRetry,
  revertedRelayrQuote,
  verifyRelayrDestinations,
  verifyRelayrDestination,
  verifyRelayrPayment,
  RelayrPaymentRevertedError,
  RelayrProofUnavailableError,
  type RelayrEntry,
  type RelayrPayment,
  type RelayrQuote,
  type RelayrReleaseClient,
  type RelayrSentPayment,
  type RelayrTransactionRecord,
  type RelayrTransactionBinding,
  type RelayrProofClient,
  type RelayrVerifiedDestination,
} from "./relayr.js";
import { TAB, tabShared } from "./tabState.js";

/** Exact frozen calldata plus the Safe intent it executes. Context belongs to the app. */
export type SafeRelayrExecution = {
  entry: RelayrEntry;
  safe: Address;
  safeTxHash: Hex;
  nonce: number;
  context?: unknown;
};

/** Normalized durable state. Adapters retain their existing storage schema and metadata. */
export type SafeRelayrSession = {
  id: string;
  account: Address;
  executions: SafeRelayrExecution[];
  quote?: RelayrQuote;
  bundleUuid?: string;
  paymentStatus:
    | "unfunded"
    | "sending"
    | "submitted"
    | "confirmed"
    | "reverted"
    | "expired";
  payments: RelayrSentPayment[];
  state: "publishing" | "active" | "complete" | "released";
  /** Obsolete Safe nonces do not prove execution success, quote expiry, or a refund. */
  releaseReason?:
    | "quote-expired"
    | "safe-nonces-consumed"
    | "quote-replaced"
    /** The user's warned exit from a quote whose payment status stayed unknown. The record is kept for reconciliation. */
    | "payment-unconfirmed";
  /** Sticky evidence that Relayr reported funding or an execution attempt. Not a payment receipt proof. */
  fundingObserved?: boolean;
  /** When Relayr last reported that funding, in milliseconds since the epoch: the warned exit waits an hour from it. */
  fundingObservedAt?: number;
  createdAt: number;
  records?: RelayrTransactionRecord[];
  /** Conservative legacy reservations when exact execution proof is unavailable. */
  reservationKeys?: string[];
  context?: unknown;
};

export type SafeRelayrStore = {
  /** A single-session journal also reserves disjoint selections until its prior session can be replaced. */
  scope?: "overlapping" | "single-session";
  /** Include unresolved legacy reservations, including those made by other accounts. */
  list(account: Address): Promise<SafeRelayrSession[]>;
  /** Must finish durable persistence before resolving; never silently swallow failure. */
  save(session: SafeRelayrSession): Promise<void>;
  /** Serialize overlapping Safe scopes across tabs AND accounts. An account-only lock is insufficient; retain legacy locks too. */
  withLock<T>(account: Address, run: () => Promise<T>): Promise<T>;
};

function hasFundingRecords(records: unknown): boolean {
  if (records === undefined) return false;
  if (!Array.isArray(records)) return true;
  return records.some((record: RelayrTransactionRecord | null) => {
    if (!record || typeof record !== "object" || Array.isArray(record))
      return true;
    const status = record.status;
    if (status === undefined) return false;
    if (!status || typeof status !== "object" || Array.isArray(status))
      return true;
    const data = status.data;
    if (
      data !== undefined &&
      data !== null &&
      (typeof data !== "object" || Array.isArray(data))
    )
      return true;
    const transaction = data?.transaction;
    if (
      transaction !== undefined &&
      (transaction === null ||
        typeof transaction !== "object" ||
        Array.isArray(transaction))
    )
      return true;
    if (
      status.data?.hash !== undefined ||
      status.data?.transaction?.hash !== undefined
    )
      return true;
    return status.state !== undefined && !relayrStateIsPending(status.state);
  });
}

function hasObservedFunding(session: SafeRelayrSession): boolean {
  return (
    (session.fundingObserved !== undefined &&
      session.fundingObserved !== false) ||
    hasFundingRecords(session.records) ||
    hasFundingRecords(session.quote?.transactions)
  );
}

/**
 * Safe signatures already authorize a nonce-protected call. Publishing or losing
 * an unused quote is not a funding attempt. Only this Safe-specific owner may
 * replace such a quote; raw/forwarded authorizations keep their existing rules.
 */
export function canReplaceSafeRelayrQuote(session: SafeRelayrSession): boolean {
  if (
    (session.state !== "publishing" && session.state !== "active") ||
    session.paymentStatus !== "unfunded" ||
    !Array.isArray(session.payments) ||
    session.payments.length !== 0 ||
    (session.reservationKeys !== undefined &&
      !Array.isArray(session.reservationKeys)) ||
    hasObservedFunding(session)
  )
    return false;
  try {
    validateExecutions(session.executions);
    const identities = new Set(
      session.executions.map(safeRelayrReservationKey),
    );
    return !session.reservationKeys?.some(
      (key) => !identities.has(key.toLowerCase()),
    );
  } catch {
    return false;
  }
}

export type SafeRelayrResult = {
  state: "ready" | "pending" | "complete" | "released";
  session: SafeRelayrSession;
  payments: RelayrPayment[];
  recovery?: SafeRelayrRecovery;
};

/** Read-only evidence when the saved publication cannot identify an exact quote. */
export type SafeRelayrRecovery = {
  reason:
    | "missing-execution-proof"
    | "safe-nonces-live"
    | "safe-nonces-mixed"
    | "safe-nonces-unavailable"
    | "safe-nonces-consumed"
    | "funding-unresolved"
    /** The payment's status couldn't be read: unknown, never paid or free to pay. Retry. */
    | "status-unknown"
    /** The browser's clock closed the payment window before the chain's: wait for a new quote. */
    | "quote-closing";
  message: string;
  /** A later check may clear it: try again in a moment. */
  retryable?: true;
  /**
   * The quote's deadline passed on finalized evidence, no payment is shown to
   * have funded it, yet its status stays unknown: the user may leave it with
   * the controller's `exit`, warned by `message`, for a new quote.
   */
  exit?: true;
  checks?: {
    chainId: number;
    safe: Address;
    nonce: number;
    currentNonce?: string;
    state: "consumed" | "live" | "unavailable";
  }[];
};

export type SafeRelayrReady = SafeRelayrResult & {
  state: "ready";
  resumed: boolean;
};

export type SafeRelayrStatus = (
  index: number,
  state: "checking" | "ready" | "rechecking" | "failed",
  execution: SafeRelayrExecution,
) => void;

export type SafeRelayrPhase =
  | "reviewing"
  | "quoting"
  | "payment-review"
  | "payment-checking"
  | "payment-submitting"
  | "payment-confirming"
  | "executing"
  | "complete";

/** Display evidence only; notifications never authorize or replace chain proofs. */
export type SafeRelayrProgress =
  | { type: "phase"; phase: SafeRelayrPhase; session?: SafeRelayrSession }
  | {
      type: "execution";
      session: SafeRelayrSession;
      index: number;
      execution: SafeRelayrExecution;
      status: "pending" | "confirming" | "executed" | "failed";
      hash?: Hex;
      message?: string;
    };

export type SafeRelayrOptions = {
  store: SafeRelayrStore;
  /** Best-effort display updates, isolated from the journal and payment flow. */
  onProgress?: (progress: SafeRelayrProgress) => void;
  clientFor: (
    chainId: number,
  ) =>
    | (RelayrReleaseClient & Partial<Pick<PublicClient, "request">>)
    | undefined;
  fetch?: typeof globalThis.fetch;
  currentAccount: () => Address | undefined;
  /** Check live Safe nonce/policy, app permissions, and simulate this ORIGINAL calldata. */
  revalidate: (
    execution: SafeRelayrExecution,
    account: Address,
  ) => Promise<void>;
  /** Explicit user review of precisely these frozen calls. No wallet submission. */
  review: (
    executions: readonly SafeRelayrExecution[],
    options: { resumed: boolean },
  ) => Promise<unknown>;
  /**
   * Guarded wallet adapter. Await beforeSend after wallet review, then onSending
   * immediately before wallet invocation. Await onSent whenever a hash (including
   * a replacement) becomes known. Retain the application's payment review,
   * runtime authentication, simulation, and account checks.
   */
  sendPayment: (options: {
    session: SafeRelayrSession;
    payment: RelayrPayment;
    beforeSend: () => Promise<void>;
    onSending: () => Promise<void>;
    onSent: (payments: RelayrSentPayment[]) => Promise<void>;
  }) => Promise<{ hash: Hex; payments: RelayrSentPayment[] }>;
  /** App receipt guards run after that execution's exact destination and Safe event are proven. */
  afterVerified?: (
    execution: SafeRelayrExecution,
    verified: RelayrVerifiedDestination,
  ) => Promise<void>;
  createId?: () => string;
};

/** The line a Safe action shows when its payment's status couldn't be read. */
export const SAFE_RELAYR_STATUS_UNKNOWN_LINE =
  "Couldn't check this payment's status. Try again in a moment.";

/** The line a Safe action shows when its quote can no longer be paid but hasn't expired onchain. */
export const SAFE_RELAYR_QUOTE_CLOSING_LINE =
  "This quote's payment window has closed. Try again in a few minutes for a new quote.";

/** The line a Safe action shows with its warned exit while Relayr's funding report is unresolved. */
export const SAFE_RELAYR_FUNDING_EXIT_LINE =
  "Relayr reported a payment for this quote. Check your wallet and Relayr before paying again.";

/** How long after funding was last reported its warned exit waits: an hour. */
const FUNDING_EXIT_MS = 60 * 60_000;

/** The line a Safe action shows with its warned exit (see {@link SafeRelayrRecovery.exit}). */
export const SAFE_RELAYR_UNCONFIRMED_LINE =
  "We couldn't confirm this payment's status. If your wallet shows no payment, get a new quote.";

/** A status read's failure that says nothing: no refusal Relayr gave. */
function statusUnknown(error: unknown): boolean {
  return (
    !(error instanceof RelayrPaymentRetryError) || error.reason === "unknown"
  );
}

/** A refusal saying Relayr reports the bundle paid, or a call running or run. */
function fundingReported(error: unknown): boolean {
  return (
    error instanceof RelayrPaymentRetryError &&
    (error.reason === "paid" || error.reason === "running")
  );
}

/** Reads of a bundle's payment status before an unknown answer is reported. */
const STATUS_READS = 3;
const STATUS_RETRY_MS = 250;

export class SafeRelayrRecoveryError extends Error {
  readonly name = "SafeRelayrRecoveryError";
  constructor(
    readonly session: SafeRelayrSession,
    message = "This Safe action already has a payment in progress. Check it before paying again.",
    readonly recovery?: SafeRelayrRecovery,
  ) {
    super(message);
  }
}

// Review is a page-lifetime capability, never a local-storage claim. Multiple
// hook instances can share it; reloading, changing exact bytes, or eviction
// requires explicit review again. Eviction only adds a review, never a write.
const reviewedIntents = tabShared(TAB.reviews, () => new Set<Hex>());
/** The stop of every running watch, for the test-only reset. */
const watching = tabShared(TAB.watches, () => new Set<() => void>());
function reviewKey(session: SafeRelayrSession): Hex {
  return keccak256(
    toHex(
      JSON.stringify([
        session.account.toLowerCase(),
        session.id,
        session.bundleUuid,
        session.executions.map(({ safe, safeTxHash, nonce, entry }) => [
          entry.chain,
          safe.toLowerCase(),
          safeTxHash.toLowerCase(),
          nonce,
          entry.target.toLowerCase(),
          entry.data.toLowerCase(),
          entry.value,
        ]),
      ]),
    ),
  );
}
function rememberReview(session: SafeRelayrSession): void {
  reviewedIntents.add(reviewKey(session));
  if (reviewedIntents.size > 256)
    reviewedIntents.delete(reviewedIntents.values().next().value!);
}

const SAFE_STATE_ABI = [
  {
    name: "nonce",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "getTransactionHash",
    type: "function",
    stateMutability: "view",
    inputs: [
      { type: "address", name: "to" },
      { type: "uint256", name: "value" },
      { type: "bytes", name: "data" },
      { type: "uint8", name: "operation" },
      { type: "uint256", name: "safeTxGas" },
      { type: "uint256", name: "baseGas" },
      { type: "uint256", name: "gasPrice" },
      { type: "address", name: "gasToken" },
      { type: "address", name: "refundReceiver" },
      { type: "uint256", name: "_nonce" },
    ],
    outputs: [{ type: "bytes32" }],
  },
] as const;

/** A nonce reserves its Safe on its chain even when signature bytes or the proposed intent change. */
export function safeRelayrReservationKey(
  execution: Pick<SafeRelayrExecution, "entry" | "safe" | "nonce">,
): string {
  return `${execution.entry.chain}:${execution.safe.toLowerCase()}:${execution.nonce}`;
}

function intentKey(execution: SafeRelayrExecution): string {
  return `${safeRelayrReservationKey(execution)}:${execution.safeTxHash.toLowerCase()}`;
}

/** Reuse requires the complete one-to-one intent set. Subsets and supersets conflict. */
export function sameSafeRelayrIntents(
  left: readonly SafeRelayrExecution[],
  right: readonly SafeRelayrExecution[],
): boolean {
  const keys = left.map(intentKey);
  return (
    !!left.length &&
    left.length === right.length &&
    new Set(keys).size === keys.length &&
    new Set(right.map(intentKey)).size === right.length &&
    right.every((execution) => keys.includes(intentKey(execution)))
  );
}

/** Authenticate execTransaction's signed fields against the expected Safe EIP-712 hash. */
export function requireSafeRelayrExecution(
  execution: SafeRelayrExecution,
): SafeTransactionMessage {
  const { entry, safe, nonce, safeTxHash } = execution;
  if (
    !Number.isSafeInteger(entry.chain) ||
    entry.chain <= 0 ||
    !Number.isSafeInteger(nonce) ||
    nonce < 0 ||
    !isAddress(safe) ||
    entry.target.toLowerCase() !== safe.toLowerCase() ||
    BigInt(entry.value) !== 0n
  ) {
    throw new Error("The Relayr entry does not match its Safe execution.");
  }
  const decoded = decodeFunctionData({ abi: SAFE_EXEC_ABI, data: entry.data });
  if (decoded.functionName !== "execTransaction")
    throw new Error("The Relayr entry is not a Safe execution.");
  const [
    to,
    value,
    data,
    operation,
    safeTxGas,
    baseGas,
    gasPrice,
    gasToken,
    refundReceiver,
  ] = decoded.args;
  if (operation !== 0 && operation !== 1)
    throw new Error("The Safe execution has an invalid operation.");
  if (
    encodeFunctionData({
      abi: SAFE_EXEC_ABI,
      functionName: "execTransaction",
      args: decoded.args,
    }).toLowerCase() !== entry.data.toLowerCase()
  )
    throw new Error("The Safe execution calldata is not canonical.");
  if (
    gasPrice !== 0n ||
    gasToken.toLowerCase() !== zeroAddress ||
    refundReceiver.toLowerCase() !== zeroAddress
  )
    throw new Error(
      "Relayr Safe executions must not reimburse an executor from Safe funds.",
    );
  const message: SafeTransactionMessage = {
    to,
    value,
    data,
    operation,
    safeTxGas,
    baseGas,
    gasPrice,
    gasToken,
    refundReceiver,
    nonce: BigInt(nonce),
  };
  const hash = canonicalSafeTxHash(entry.chain, safe, { ...message, nonce });
  if (hash.toLowerCase() !== safeTxHash.toLowerCase())
    throw new Error(
      "The Safe execution does not match its reviewed transaction hash.",
    );
  return message;
}

/** Exact live nonce/hash guards for adapters that perform eth_call preconditions. */
export function safeRelayrPreconditions(
  execution: SafeRelayrExecution,
): { address: Address; data: Hex; expected: Hex }[] {
  const tx = requireSafeRelayrExecution(execution);
  return [
    {
      address: execution.safe,
      data: encodeFunctionData({ abi: SAFE_STATE_ABI, functionName: "nonce" }),
      expected: `0x${tx.nonce.toString(16).padStart(64, "0")}`,
    },
    {
      address: execution.safe,
      data: encodeFunctionData({
        abi: SAFE_STATE_ABI,
        functionName: "getTransactionHash",
        args: [
          tx.to,
          tx.value,
          tx.data,
          tx.operation,
          tx.safeTxGas,
          tx.baseGas,
          tx.gasPrice,
          tx.gasToken,
          tx.refundReceiver,
          tx.nonce,
        ],
      }),
      expected: execution.safeTxHash,
    },
  ];
}

function validateExecutions(executions: readonly SafeRelayrExecution[]): void {
  if (!executions.length)
    throw new Error("Select at least one Safe execution.");
  executions.forEach(requireSafeRelayrExecution);
  const keys = executions.map(safeRelayrReservationKey);
  if (new Set(keys).size !== keys.length)
    throw new Error("A Safe nonce may appear only once in a Relayr bundle.");
}

function entriesEqual(left: RelayrEntry, right: RelayrEntry): boolean {
  return (
    left.chain === right.chain &&
    left.target.toLowerCase() === right.target.toLowerCase() &&
    left.data.toLowerCase() === right.data.toLowerCase() &&
    BigInt(left.value) === BigInt(right.value) &&
    (left.virtual_nonce ?? 0) === (right.virtual_nonce ?? 0)
  );
}

/** Authenticate every status UUID, chain, and (when supplied) exact request, even before a hash exists. */
function requireSafeRelayrRecords(
  bindings: readonly RelayrTransactionBinding[],
  records: readonly RelayrTransactionRecord[],
): void {
  if (
    records.length !== bindings.length ||
    new Set(records.map((record) => record.tx_uuid?.toLowerCase())).size !==
      bindings.length
  )
    throw new Error(
      "Relayr's records do not identify every saved Safe execution exactly once.",
    );
  for (const binding of bindings) {
    const record = records.find(
      (item) => item.tx_uuid?.toLowerCase() === binding.txUuid.toLowerCase(),
    );
    if (
      !record ||
      (record.chain ?? record.request?.chain) !== binding.chain ||
      (record.request !== undefined &&
        !entriesEqual(record.request, binding.entry))
    )
      throw new Error(
        "Relayr's record does not match the saved Safe transaction binding.",
      );
  }
}

function requireSafeLanding(
  execution: SafeRelayrExecution,
  { receipt }: RelayrVerifiedDestination,
): void {
  const { safe, safeTxHash } = execution;
  requireSafeExecutionSuccess(receipt, safe, safeTxHash);
  const event = safeExecutionResult(receipt, safe, safeTxHash);
  if (event.status !== "success" || event.payment !== 0n)
    throw new Error(
      "The Safe execution reimbursed its executor. Keep the existing bundle for verification.",
    );
}

/** Canonical exact destination receipts plus matching, refund-free Safe success events. */
export async function verifySafeRelayrLanding(
  clientFor: (chainId: number) => RelayrProofClient | undefined,
  {
    executions,
    bindings,
    records,
  }: {
    executions: readonly SafeRelayrExecution[];
    bindings: readonly RelayrTransactionBinding[];
    records: readonly RelayrTransactionRecord[];
  },
): Promise<RelayrVerifiedDestination[]> {
  validateExecutions(executions);
  const entries = relayrBundleRequest(
    executions.map(({ entry }) => entry),
  ).transactions;
  if (
    bindings.length !== entries.length ||
    bindings.some(
      (binding, index) => !entriesEqual(binding.entry, entries[index]),
    )
  )
    throw new Error(
      "The saved Safe bindings do not match the reviewed executions.",
    );
  requireSafeRelayrRecords(bindings, records);
  const verified = await verifyRelayrDestinations(clientFor, {
    bindings,
    records,
  });
  verified.forEach((item, index) =>
    requireSafeLanding(executions[index], item),
  );
  return verified;
}

/** Validate persisted bindings again; local storage is not authenticated evidence. */
function requireSessionQuote(session: SafeRelayrSession): RelayrQuote {
  validateExecutions(session.executions);
  const quote = session.quote;
  const entries = relayrBundleRequest(
    session.executions.map(({ entry }) => entry),
  ).transactions;
  if (
    !quote ||
    !RELAYR_UUID_RE.test(quote.bundle_uuid) ||
    quote.bundle_uuid !== session.bundleUuid ||
    !Array.isArray(quote.expectedTransactions) ||
    quote.expectedTransactions.some(
      ({ txUuid }) => !RELAYR_UUID_RE.test(txUuid),
    ) ||
    quote.expectedTransactions.length !== entries.length ||
    new Set(quote.expectedTransactions.map(({ txUuid }) => txUuid)).size !==
      entries.length ||
    quote.expectedTransactions.some(
      (binding, index) =>
        binding.chain !== entries[index].chain ||
        !entriesEqual(binding.entry, entries[index]),
    )
  ) {
    throw new SafeRelayrRecoveryError(
      session,
      "The saved Safe bundle lacks exact transaction bindings. Keep it saved and verify its existing transactions.",
    );
  }
  return quote;
}

/** Shared Safe Relayr state machine. It never signs Safe proposals or submits on prepare/check. */
export function createSafeRelayrController(options: SafeRelayrOptions) {
  /**
   * The app's store, with funding evidence sticky in its one save path: a
   * save from an older snapshot never drops `fundingObserved` or an older
   * `fundingObservedAt` another flow saved. Nothing ever clears them; an
   * exit keeps them for reconciliation.
   */
  const store: SafeRelayrStore = {
    get scope() {
      return options.store.scope;
    },
    list: (account) => options.store.list(account),
    withLock: (account, run) => options.store.withLock(account, run),
    async save(next) {
      const saved = (await options.store.list(next.account)).find(
        (session) => session.id === next.id,
      );
      const at = [saved?.fundingObservedAt, next.fundingObservedAt].filter(
        (value): value is number => typeof value === "number",
      );
      // Once seen, funding stays, and its clock only moves forward.
      return options.store.save(
        saved?.fundingObserved || next.fundingObserved
          ? {
              ...next,
              fundingObserved: true,
              ...(at.length ? { fundingObservedAt: Math.max(...at) } : {}),
            }
          : next,
      );
    },
  };
  const fetchRelayr = options.fetch ?? globalThis.fetch;
  const displayedExecutions = new Map<string, string>();
  const notify = (progress: SafeRelayrProgress, rechecking = false) => {
    if (progress.type === "execution") {
      const key = `${progress.session.id}:${progress.index}`;
      const display = JSON.stringify([
        progress.status,
        progress.hash,
        progress.message,
      ]);
      const previous = displayedExecutions.get(key);
      // Rechecking does not undo a proven display result. A later unavailable,
      // contradictory, or changed-hash result explicitly updates it below.
      if (
        previous === display ||
        (rechecking &&
          previous === JSON.stringify(["executed", progress.hash, undefined]))
      )
        return;
      displayedExecutions.set(key, display);
    }
    try {
      // A view must not mutate frozen calls or turn a submitted payment into a
      // rejected operation. Also consume rejection from an async UI callback.
      void Promise.resolve(
        options.onProgress?.(structuredClone(progress)),
      ).catch(() => undefined);
    } catch {
      // Display observers cannot change the durable execution lifecycle.
    }
  };
  const phase = (
    phase: SafeRelayrPhase,
    session?: SafeRelayrSession,
    signal?: AbortSignal,
  ) => {
    if (!signal?.aborted) notify({ type: "phase", phase, session });
  };
  const savedPhase = (session: SafeRelayrSession, signal?: AbortSignal) => {
    if (session.state === "released") return;
    if (session.state === "complete") phase("complete", session, signal);
    else if (
      session.paymentStatus === "confirmed" ||
      hasObservedFunding(session)
    )
      phase("executing", session, signal);
    else if (
      session.paymentStatus === "submitted" ||
      session.paymentStatus === "sending"
    )
      phase("payment-confirming", session, signal);
  };
  const checkAccount = (account: Address, signal?: AbortSignal) => {
    signal?.throwIfAborted();
    if (
      !isAddress(account) ||
      options.currentAccount()?.toLowerCase() !== account.toLowerCase()
    )
      throw new Error("The connected account changed. Review again.");
  };
  const load = async (account: Address, id: string) => {
    const session = (await store.list(account)).find(
      (candidate) => candidate.id === id,
    );
    if (!session || session.account.toLowerCase() !== account.toLowerCase())
      throw new Error(
        "The saved Safe execution belongs to another account or is unavailable.",
      );
    return session;
  };
  const revalidate = async (
    executions: readonly SafeRelayrExecution[],
    account: Address,
    status?: SafeRelayrStatus,
    again = false,
    signal?: AbortSignal,
  ) => {
    validateExecutions(executions);
    checkAccount(account, signal);
    // Launch every independent check. The RPC transport paces egress without
    // holding the next chain behind a slow response. Drain failures before exit.
    const settled = await Promise.allSettled(
      executions.map(async (execution, index) => {
        status?.(index, again ? "rechecking" : "checking", execution);
        try {
          const original = JSON.stringify([
            execution.entry,
            execution.safe,
            execution.safeTxHash,
            execution.nonce,
          ]);
          await options.revalidate(execution, account);
          if (
            JSON.stringify([
              execution.entry,
              execution.safe,
              execution.safeTxHash,
              execution.nonce,
            ]) !== original
          )
            throw new Error("A Safe recheck changed its frozen execution.");
          checkAccount(account, signal);
          status?.(index, "ready", execution);
        } catch (error) {
          status?.(index, "failed", execution);
          throw error;
        }
      }),
    );
    const failure = settled.find((item) => item.status === "rejected");
    if (failure?.status === "rejected") throw failure.reason;
    checkAccount(account, signal);
  };
  const overlap = (
    session: SafeRelayrSession,
    executions: readonly SafeRelayrExecution[],
  ) => {
    const keys = new Set([
      ...session.executions.map(safeRelayrReservationKey),
      ...(session.reservationKeys ?? []).map((key) => key.toLowerCase()),
    ]);
    return executions.some(
      (execution) =>
        keys.has(safeRelayrReservationKey(execution)) ||
        keys.has(`${execution.entry.chain}:${execution.safe.toLowerCase()}:*`),
    );
  };
  const unidentified = (session: SafeRelayrSession) =>
    !session.executions.length && !session.reservationKeys?.length;
  const unresolved = (session: SafeRelayrSession) =>
    session.state !== "complete" && session.state !== "released";
  const reserves = (
    session: SafeRelayrSession,
    executions: readonly SafeRelayrExecution[],
  ) =>
    unresolved(session) &&
    (store.scope === "single-session" ||
      unidentified(session) ||
      overlap(session, executions));
  const assertUnreserved = async (
    account: Address,
    executions: readonly SafeRelayrExecution[],
    exceptId?: string,
  ) => {
    const conflict = (await store.list(account)).find(
      (session) => session.id !== exceptId && reserves(session, executions),
    );
    if (conflict) throw new SafeRelayrRecoveryError(conflict);
  };
  const result = (
    state: SafeRelayrResult["state"],
    session: SafeRelayrSession,
    payments: RelayrPayment[] = [],
  ): SafeRelayrResult => ({
    state,
    session,
    payments,
    ...(state === "released" && session.releaseReason === "safe-nonces-consumed"
      ? {
          recovery: {
            reason: "safe-nonces-consumed" as const,
            message:
              "Every saved Safe nonce has been used. This saved selection is obsolete; refresh the Safe queue. This does not prove the intended calls succeeded or that any payment was refunded.",
          },
        }
      : {}),
  });

  async function inspectMissingQuote(
    session: SafeRelayrSession,
  ): Promise<SafeRelayrResult> {
    const pending = (recovery: SafeRelayrRecovery): SafeRelayrResult => ({
      ...result("pending", session),
      recovery,
    });
    try {
      validateExecutions(session.executions);
      const exactKeys = new Set(
        session.executions.map(safeRelayrReservationKey),
      );
      if (
        session.reservationKeys?.some(
          (key) => !exactKeys.has(key.toLowerCase()),
        )
      )
        throw new Error("Incomplete Safe identities");
    } catch {
      return pending({
        reason: "missing-execution-proof",
        message:
          "This saved selection is missing complete Safe transaction details. Its status cannot be verified automatically. Inspect the original Safe proposals; the saved payment evidence has been kept.",
      });
    }
    const checks = await Promise.all(
      session.executions.map(
        async (
          execution,
        ): Promise<NonNullable<SafeRelayrRecovery["checks"]>[number]> => {
          const check = {
            chainId: execution.entry.chain,
            safe: execution.safe,
            nonce: execution.nonce,
          };
          try {
            const client = options.clientFor(execution.entry.chain);
            const request = client?.request;
            if (!client || !request) return { ...check, state: "unavailable" };
            const finalized = await atCanonicalFinalizedBlock(
              client,
              (blockNumber) =>
                readBoundedSafeNonce({ request }, execution.safe, {
                  blockNumber,
                }),
            );
            const nonce = finalized?.value;
            if (typeof nonce !== "bigint" || nonce < 0n)
              return { ...check, state: "unavailable" };
            return {
              ...check,
              currentNonce: nonce.toString(),
              state: nonce > BigInt(execution.nonce) ? "consumed" : "live",
            };
          } catch {
            return { ...check, state: "unavailable" };
          }
        },
      ),
    );
    if (checks.some((check) => check.state === "unavailable"))
      return pending({
        reason: "safe-nonces-unavailable",
        message:
          "Some Safe nonces could not be verified at a finalized block. The saved selection remains reserved. Check again when those networks respond.",
        checks,
      });
    if (checks.every((check) => check.state === "consumed")) {
      // A nonce proves an authorization is obsolete, not where any funding went.
      // Keep uncertain funding records reserved: some legacy stores hold only one
      // session per Safe and replacing it would erase the unresolved evidence.
      if (
        session.paymentStatus !== "unfunded" ||
        !Array.isArray(session.payments) ||
        session.payments.length ||
        hasObservedFunding(session)
      )
        return pending({
          reason: "funding-unresolved",
          message:
            "Every saved Safe nonce has been used, but this selection still has unresolved payment evidence. Inspect the original Safe proposals and funding transactions before replacing it. No refund or successful execution has been confirmed.",
          checks,
        });
      if (session.bundleUuid) {
        const [status, read] = await bundleUnpaid(session);
        session = read;
        if (status !== "unpaid")
          return pending({
            reason: "funding-unresolved",
            message:
              "Every saved Safe nonce has been used, but the existing Relayr bundle has not been proven unpaid with all calls pending. Keep its payment evidence and inspect the original bundle before replacing this selection.",
            checks,
          });
      }
      session = {
        ...session,
        state: "released",
        releaseReason: "safe-nonces-consumed",
      };
      await store.save(session);
      return {
        ...result("released", session),
        recovery: { ...result("released", session).recovery!, checks },
      };
    }
    if (checks.some((check) => check.state === "consumed"))
      return pending({
        reason: "safe-nonces-mixed",
        message:
          "Some saved Safe nonces have been used, while others are still unused. This selection remains reserved. Inspect each original Safe proposal before continuing.",
        checks,
      });
    return pending({
      reason: "safe-nonces-live",
      message:
        "The saved Safe nonces are still unused. This record has no complete Relayr quote to resume, so it remains reserved. Inspect the original Safe proposals before submitting another payment.",
      checks,
    });
  }

  /**
   * `read` of the bundle's status, tried up to {@link STATUS_READS} times
   * while its failure is unknown. Every status read goes through it.
   */
  async function statusRead<T>(read: () => Promise<T>): Promise<T> {
    for (let attempt = 1; ; attempt += 1) {
      try {
        return await read();
      } catch (error) {
        if (!statusUnknown(error) || attempt >= STATUS_READS) throw error;
        await new Promise((resolve) => setTimeout(resolve, STATUS_RETRY_MS));
      }
    }
  }

  /** `session`, saved with the funding Relayr reported. */
  async function observed(
    session: SafeRelayrSession,
  ): Promise<SafeRelayrSession> {
    session = {
      ...session,
      fundingObserved: true,
      fundingObservedAt: Date.now(),
    };
    await store.save(session);
    return session;
  }

  /**
   * The bundle's payment status, three-valued: proven unpaid, funded (Relayr
   * reports it paid or running, saved as observed funding), or unknown when
   * it couldn't be read. Unknown is never paid, and never free to pay again.
   */
  async function bundleUnpaid(
    session: SafeRelayrSession,
  ): Promise<["unpaid" | "funded" | "unknown", SafeRelayrSession]> {
    try {
      await statusRead(() =>
        requireRelayrBundleUnpaid(session.bundleUuid!, { fetch: fetchRelayr }),
      );
      return ["unpaid", session];
    } catch (error) {
      if (!fundingReported(error)) return ["unknown", session];
      return ["funded", await observed(session)];
    }
  }

  /**
   * What a quote whose payments didn't fund it allows
   * ({@link revertedRelayrQuote}), read after {@link bundleUnpaid} proved it
   * unpaid; its own reads are confirmations. Funding they report is saved.
   * Null while unproven, or with `rethrow`, its reason thrown.
   */
  async function disposed(
    session: SafeRelayrSession,
    quote: RelayrQuote,
    chains: number[],
    rethrow = false,
  ): Promise<{
    state: "funded" | "payable" | "released" | "unknown";
    session: SafeRelayrSession;
  } | null> {
    let state: "funded" | "payable" | "released";
    /** The last read before release failed after its retries: unknown. */
    let unconfirmed = false;
    try {
      ({ state } = await revertedRelayrQuote(
        options.clientFor,
        {
          bundleUuid: quote.bundle_uuid,
          payments: session.payments,
          options: quote.payment_info,
          destinationChainIds: chains,
          account: session.account,
        },
        {
          fetch: fetchRelayr,
          // Every read of its bundle, through the same retries.
          statusRead: (read) =>
            statusRead(read).catch((error: unknown) => {
              unconfirmed = statusUnknown(error);
              throw error;
            }),
        },
      ));
    } catch (error) {
      if (unconfirmed) return { state: "unknown", session };
      if (rethrow) throw error;
      return null;
    }
    return {
      state,
      session: state === "funded" ? await observed(session) : session,
    };
  }

  /**
   * Held while reported funding is unresolved: never a release or a retry.
   * Once every deadline is final and an hour has passed since funding was
   * last reported, the user may leave it, strongly warned: a spurious
   * report is no dead end.
   */
  async function fundingUnresolved(
    session: SafeRelayrSession,
  ): Promise<SafeRelayrResult> {
    const exit = await fundingExitDue(session, session.quote!);
    return {
      ...result("pending", session),
      recovery: exit
        ? {
            reason: "funding-unresolved",
            message: SAFE_RELAYR_FUNDING_EXIT_LINE,
            exit: true,
          }
        : {
            reason: "funding-unresolved",
            message:
              "This saved selection has reported funding or execution activity. Check the existing bundle and its funding transactions before submitting another payment.",
          },
    };
  }

  /** Reported funding's warned exit is due: an hour since it was last reported, and every deadline final. */
  async function fundingExitDue(
    session: SafeRelayrSession,
    quote: RelayrQuote,
  ): Promise<boolean> {
    return (
      Date.now() - Number(session.fundingObservedAt) >= FUNDING_EXIT_MS &&
      (await deadlinesFinal(session, quote))
    );
  }

  /** Every deadline of the quote's options and payments passed at a canonical finalized block. */
  async function deadlinesFinal(
    session: SafeRelayrSession,
    quote: RelayrQuote,
  ): Promise<boolean> {
    const deadlines = [
      ...relayrQuotedOptions(
        quote,
        session.executions.map(({ entry }) => entry.chain),
      ).map(({ details }) => details),
      ...session.payments,
    ];
    for (const { chainId, deadline } of deadlines) {
      const client = options.clientFor(chainId);
      if (!client || (await relayrDeadlinePassed(client, deadline)) !== true)
        return false;
    }
    return true;
  }

  /**
   * A held result that says why: in progress, unknown, or closing. Unknown
   * offers the warned exit once nothing shown can fund the quote.
   */
  async function held(
    why: "funded" | "unknown" | "closing",
    session: SafeRelayrSession,
  ): Promise<SafeRelayrResult> {
    if (why === "funded") return result("pending", session);
    if (why === "closing")
      return {
        ...result("pending", session),
        recovery: {
          reason: "quote-closing",
          message: SAFE_RELAYR_QUOTE_CLOSING_LINE,
          retryable: true,
        },
      };
    const quote = session.quote;
    // With funding reported and unresolved, the exit also waits for the
    // funding exit's rule (see fundingUnresolved), with its stronger warning.
    const funded = hasObservedFunding(session);
    const spent =
      !!quote &&
      (!funded || (await fundingExitDue(session, quote))) &&
      (await relayrQuoteUnfundable(
        options.clientFor,
        {
          bundleUuid: quote.bundle_uuid,
          payments: session.payments,
          options: quote.payment_info,
          destinationChainIds: session.executions.map(
            ({ entry }) => entry.chain,
          ),
          account: session.account,
        },
        { unseen: true },
      ).catch(() => null)) === true;
    return {
      ...result("pending", session),
      recovery: spent
        ? {
            reason: "status-unknown",
            message: funded
              ? SAFE_RELAYR_FUNDING_EXIT_LINE
              : SAFE_RELAYR_UNCONFIRMED_LINE,
            retryable: true,
            exit: true,
          }
        : {
            reason: "status-unknown",
            message: SAFE_RELAYR_STATUS_UNKNOWN_LINE,
            retryable: true,
          },
    };
  }

  /** The status-unknown refusal, for a status read outside an inspection. */
  const unknownStatus = (session: SafeRelayrSession) =>
    new SafeRelayrRecoveryError(session, SAFE_RELAYR_STATUS_UNKNOWN_LINE, {
      reason: "status-unknown",
      message: SAFE_RELAYR_STATUS_UNKNOWN_LINE,
      retryable: true,
    });

  /**
   * Why an overlapping quote is kept, or null when it may be replaced: it is
   * unused (see {@link canReplaceSafeRelayrQuote}) and, once quoted, a status
   * read now proves it unpaid. Funding it reports is saved; unknown keeps it.
   */
  async function unreplaceable(
    saved: SafeRelayrSession,
  ): Promise<SafeRelayrResult | null> {
    if (!canReplaceSafeRelayrQuote(saved)) return result("pending", saved);
    if (!saved.bundleUuid) return null;
    const [status, read] = await bundleUnpaid(saved);
    return status === "unpaid" ? null : held(status, read);
  }

  async function inspect(
    session: SafeRelayrSession,
    signal?: AbortSignal,
  ): Promise<SafeRelayrResult> {
    const report = (progress: SafeRelayrProgress, rechecking = false) => {
      if (!signal?.aborted) notify(progress, rechecking);
    };
    try {
      savedPhase(session, signal);
      if (session.state === "released") return result("released", session);
      if (session.state === "complete") return result("complete", session);
      if (
        hasObservedFunding(session) &&
        (session.fundingObserved !== true ||
          session.fundingObservedAt === undefined)
      ) {
        // A record saved before the clock existed starts it now.
        session = {
          ...session,
          fundingObserved: true,
          fundingObservedAt: session.fundingObservedAt ?? Date.now(),
        };
        await store.save(session);
      }
      if (!session.bundleUuid || !session.quote)
        return inspectMissingQuote(session);
      const quote = requireSessionQuote(session);
      const chains = session.executions.map(({ entry }) => entry.chain);
      const bundleUuid = session.bundleUuid;
      const bundle = await statusRead(() =>
        readRelayrBundle(bundleUuid, { fetch: fetchRelayr }),
      ).catch(() => null);
      if (!bundle) return held("unknown", session);
      if (
        bundle.payment_received === true ||
        hasFundingRecords(bundle.transactions)
      )
        session = await observed(session);
      if (!Array.isArray(bundle.transactions))
        throw new SafeRelayrRecoveryError(
          session,
          "Relayr has not returned this bundle's transactions. Check the existing bundle again.",
        );
      const records = bundle.transactions as RelayrTransactionRecord[];
      requireSafeRelayrRecords(quote.expectedTransactions, records);
      session = { ...session, records };
      await store.save(session);
      savedPhase(session, signal);
      // Each hash is only a pointer. Check available chains independently, using
      // the same complete binding validator and exact receipt proof as completion.
      const indexed = quote.expectedTransactions.map((binding, index) => ({
        binding,
        index,
        record: records.find(
          (record) =>
            record.tx_uuid?.toLowerCase() === binding.txUuid.toLowerCase(),
        )!,
      }));
      const known = indexed.filter(
        ({ record }) =>
          record.status?.data?.hash !== undefined ||
          record.status?.data?.transaction?.hash !== undefined,
      );
      if (known.length) {
        try {
          relayrDestinationHashes({
            bindings: known.map(({ binding }) => binding),
            records: known.map(({ record }) => record),
          });
        } catch (error) {
          for (const { index, record } of known)
            report({
              type: "execution",
              session,
              index,
              execution: session.executions[index],
              status: "failed",
              hash: relayrDestinationHash(record) ?? undefined,
              message:
                error instanceof Error
                  ? error.message
                  : "The destination records do not match this quote.",
            });
          throw new SafeRelayrRecoveryError(
            session,
            error instanceof Error ? error.message : undefined,
          );
        }
        phase("executing", session, signal);
      }
      if (
        known.length ||
        session.paymentStatus !== "unfunded" ||
        session.fundingObserved
      ) {
        for (const { index, record } of indexed) {
          const hash = relayrDestinationHash(record) ?? undefined;
          report(
            {
              type: "execution",
              session,
              index,
              execution: session.executions[index],
              status: hash
                ? "confirming"
                : relayrStateIsFailed(record.status?.state)
                  ? "failed"
                  : "pending",
              hash,
              ...(!hash && relayrStateIsFailed(record.status?.state)
                ? {
                    message:
                      "Relayr reported this execution failed. Its onchain result has not been verified.",
                  }
                : {}),
            },
            true,
          );
        }
      }
      const landed = await Promise.allSettled(
        known.map(async ({ binding, index, record }) => {
          const execution = session.executions[index];
          const hash = relayrDestinationHash(record)!;
          const client = options.clientFor(binding.chain);
          if (!client) {
            report({
              type: "execution",
              session,
              index,
              execution,
              status: "confirming",
              hash,
              message: "Waiting for a connection to this network.",
            });
            return false;
          }
          try {
            const receipt = await verifyRelayrDestination(client, {
              entry: binding.entry,
              hash,
            });
            const verified = {
              txUuid: binding.txUuid,
              chainId: binding.chain,
              receipt,
            };
            requireSafeLanding(execution, verified);
            await options.afterVerified?.(execution, verified);
            report({
              type: "execution",
              session,
              index,
              execution,
              status: "executed",
              hash,
            });
            return true;
          } catch (error) {
            if (error instanceof RelayrProofUnavailableError) {
              report({
                type: "execution",
                session,
                index,
                execution,
                status: "confirming",
                hash,
                message: "Waiting for the network to confirm this transaction.",
              });
              return false;
            }
            report({
              type: "execution",
              session,
              index,
              execution,
              status: "failed",
              hash,
              message:
                error instanceof Error
                  ? error.message
                  : "The Safe execution could not be verified.",
            });
            throw error;
          }
        }),
      );
      const failure = landed.find((item) => item.status === "rejected");
      if (failure?.status === "rejected")
        throw new SafeRelayrRecoveryError(
          session,
          failure.reason instanceof Error ? failure.reason.message : undefined,
        );
      if (
        known.length === session.executions.length &&
        landed.every((item) => item.status === "fulfilled" && item.value)
      ) {
        session = { ...session, state: "complete" };
        await store.save(session);
        phase("complete", session, signal);
        return result("complete", session);
      }
      if (session.paymentStatus === "sending")
        return result("pending", session);
      if (
        session.payments.some(
          (payment) => payment.bundleUuid !== session.bundleUuid,
        )
      )
        throw new SafeRelayrRecoveryError(
          session,
          "A saved payment belongs to another bundle. Keep the existing bundle for verification.",
        );
      if (session.payments.length) {
        let everyReverted = true;
        for (const payment of session.payments) {
          const client = options.clientFor(payment.chainId);
          if (!client) return result("pending", session);
          try {
            await verifyRelayrPayment(client, {
              hash: payment.hash,
              from: session.account,
              payment,
            });
            session = { ...session, paymentStatus: "confirmed" };
            await store.save(session);
            phase("executing", session, signal);
            return result("pending", session);
          } catch (error) {
            if (!(error instanceof RelayrPaymentRevertedError))
              everyReverted = false;
          }
        }
        // Funding reported once stays unresolved until the chain proves a
        // payment funded it (above) or the calls ran: a later unpaid read,
        // or this session's own payments reverting, can't exclude another
        // payment. No release, no retry.
        if (hasObservedFunding(session))
          return await fundingUnresolved(session);
        if (!everyReverted) {
          // A payment through a wallet contract that reverted is no
          // RelayrPaymentRevertedError. Once nothing can fund the quote, it
          // is released like an expired one. A payment that can't be shown
          // reverted (dropped, or unreadable) is unknown: never released on
          // its own, since no node can prove a transaction doesn't exist;
          // the warned exit is offered once the chain says it has none.
          const [status, read] = await bundleUnpaid(session);
          session = read;
          if (status === "funded") return held("funded", session);
          const disposition =
            status === "unpaid" ? await disposed(session, quote, chains) : null;
          if (!disposition || disposition.state === "unknown")
            return held("unknown", session);
          session = disposition.session;
          if (disposition.state !== "released")
            return result("pending", session);
          session = {
            ...session,
            state: "released",
            paymentStatus: "expired",
            releaseReason: "quote-expired",
          };
          await store.save(session);
          return result("released", session);
        }
        session = { ...session, paymentStatus: "reverted" };
        await store.save(session);
        const [status, read] = await bundleUnpaid(session);
        session = read;
        if (status !== "unpaid") return held(status, session);
        // Unpaid, its release may still be unproven: it says why.
        const disposition = (await disposed(session, quote, chains, true))!;
        session = disposition.session;
        if (disposition.state === "unknown") return held("unknown", session);
        if (disposition.state === "funded") return result("pending", session);
        if (disposition.state === "released") {
          session = {
            ...session,
            state: "released",
            paymentStatus: "expired",
            releaseReason: "quote-expired",
          };
          await store.save(session);
          return result("released", session);
        }
      } else if (
        session.paymentStatus !== "unfunded" ||
        session.fundingObserved
      ) {
        // A wallet invocation without a known hash may still have broadcast.
        return session.fundingObserved && !known.length
          ? await fundingUnresolved(session)
          : result("pending", session);
      }
      const quoted = relayrQuotedOptions(quote, chains);
      if (!quoted.length) return inspectMissingQuote(session);
      const payments = relayrPaymentOptions(quote, chains);
      const expired = payments.length
        ? [false]
        : await Promise.all(
            quoted.map(async ({ details }) => {
              const client = options.clientFor(details.chainId);
              return client
                ? relayrDeadlinePassed(client, details.deadline)
                : false;
            }),
          );
      const [unpaid, read] = await bundleUnpaid(session);
      session = read;
      if (unpaid !== "unpaid") return held(unpaid, session);
      if (expired.every((passed) => passed === true)) {
        session = {
          ...session,
          state: "released",
          paymentStatus: "expired",
          releaseReason: "quote-expired",
        };
        await store.save(session);
        return result("released", session);
      }
      // No option the browser's clock still allows, though the chain hasn't
      // shown the quote expired: closing, or unknown if the chain couldn't say.
      if (!payments.length)
        return held(
          expired.some((passed) => passed === null) ? "unknown" : "closing",
          session,
        );
      const allowed = session.payments.length
        ? [relayrRetryOption(session.payments, payments)]
        : payments;
      return allowed.length
        ? result("ready", session, allowed)
        : result("pending", session);
    } catch (error) {
      if (error instanceof SafeRelayrRecoveryError) throw error;
      throw new SafeRelayrRecoveryError(
        session,
        error instanceof Error ? error.message : undefined,
      );
    }
  }

  async function prepare({
    account,
    executions: input,
    signal,
    onStatus,
  }: {
    account: Address;
    executions: readonly SafeRelayrExecution[];
    signal?: AbortSignal;
    onStatus?: SafeRelayrStatus;
  }): Promise<SafeRelayrReady> {
    const executions = structuredClone([...input]);
    validateExecutions(executions);
    return store.withLock(account, async () => {
      checkAccount(account, signal);
      const reservations = (await store.list(account)).filter((session) =>
        reserves(session, executions),
      );
      for (const found of reservations) {
        const kept = await unreplaceable(found);
        if (!kept) continue;
        // What its status read saved, a funding report included.
        const saved = kept.session;
        let checked: SafeRelayrResult;
        try {
          checked = await inspect(saved, signal);
        } catch (error) {
          if (error instanceof SafeRelayrRecoveryError) throw error;
          throw new SafeRelayrRecoveryError(
            saved,
            error instanceof Error ? error.message : undefined,
          );
        }
        if (
          checked.state === "released" &&
          checked.session.releaseReason === "safe-nonces-consumed"
        )
          throw new SafeRelayrRecoveryError(
            checked.session,
            checked.recovery?.message,
            checked.recovery,
          );
        if (checked.state === "released" || checked.state === "complete")
          continue;
        if (
          checked.state !== "ready" ||
          saved.account.toLowerCase() !== account.toLowerCase() ||
          !sameSafeRelayrIntents(saved.executions, executions)
        )
          throw new SafeRelayrRecoveryError(
            checked.session,
            checked.recovery?.message,
            checked.recovery,
          );
        await assertUnreserved(account, executions, saved.id);
        await revalidate(saved.executions, account, onStatus, false, signal);
        phase("reviewing", checked.session, signal);
        await options.review(saved.executions, { resumed: true });
        checkAccount(account, signal);
        rememberReview(checked.session);
        return { ...checked, state: "ready", resumed: true };
      }
      await revalidate(executions, account, onStatus, false, signal);
      phase("reviewing", undefined, signal);
      await options.review(executions, { resumed: false });
      checkAccount(account, signal);
      // Re-read under the shared lock after review. A rejected review leaves the
      // old quote untouched; a recorded wallet invocation can never be retired.
      for (const saved of await store.list(account)) {
        if (!reserves(saved, executions)) continue;
        const kept = await unreplaceable(saved);
        if (kept)
          throw new SafeRelayrRecoveryError(
            kept.session,
            kept.recovery?.message,
            kept.recovery,
          );
        await store.save({
          ...saved,
          state: "released",
          releaseReason: "quote-replaced",
        });
      }
      await assertUnreserved(account, executions);
      let session: SafeRelayrSession = {
        id: options.createId?.() ?? globalThis.crypto.randomUUID(),
        account,
        executions,
        state: "publishing",
        paymentStatus: "unfunded",
        payments: [],
        createdAt: Date.now(),
      };
      // Persist before POST so the quote can be recovered or retired later.
      // Safe publication alone is not evidence that the wallet funded it.
      await store.save(session);
      try {
        checkAccount(account, signal);
      } catch (error) {
        await store.save({ ...session, state: "released" });
        throw error;
      }
      const request = relayrBundleRequest(executions.map(({ entry }) => entry));
      phase("quoting", session, signal);
      const response = await fetchRelayr(`${RELAYR_API}/v1/bundle/prepaid`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request),
        cache: "no-store",
        // UI cancellation stops its updates, but must not throw away a POST
        // response that can identify published signatures. Bound the network
        // request independently so a stalled server cannot hold the lock forever.
        signal: AbortSignal.timeout(45_000),
      });
      const quote = await bindRelayrQuote(response, request, {
        fetch: fetchRelayr,
      });
      session = {
        ...session,
        quote,
        bundleUuid: quote.bundle_uuid,
        state: "active",
      };
      await store.save(session);
      checkAccount(account, signal);
      const payments = relayrPaymentOptions(
        quote,
        executions.map(({ entry }) => entry.chain),
      );
      if (!payments.length)
        throw new SafeRelayrRecoveryError(
          session,
          "The saved Relayr quote has no payable option. Check the existing bundle.",
        );
      rememberReview(session);
      return { state: "ready", session, payments, resumed: false };
    });
  }

  async function check({
    account,
    sessionId,
    signal,
  }: {
    account: Address;
    sessionId: string;
    signal?: AbortSignal;
  }): Promise<SafeRelayrResult> {
    return store.withLock(account, async () => {
      signal?.throwIfAborted();
      const session = await load(account, sessionId);
      return inspect(session, signal);
    });
  }

  async function fund({
    account,
    sessionId,
    paymentChainId,
    signal,
    onStatus,
  }: {
    account: Address;
    sessionId: string;
    paymentChainId: number;
    signal?: AbortSignal;
    onStatus?: SafeRelayrStatus;
  }): Promise<SafeRelayrResult> {
    return store.withLock(account, async () => {
      checkAccount(account, signal);
      let session = await load(account, sessionId);
      const checked = await inspect(session, signal);
      session = checked.session;
      if (checked.state !== "ready")
        throw new SafeRelayrRecoveryError(
          session,
          checked.recovery?.message,
          checked.recovery,
        );
      if (session.payments.length >= MAX_RELAYR_SENT_PAYMENTS)
        throw new SafeRelayrRecoveryError(
          session,
          "This quote has reached its saved payment attempt limit. Check the existing bundle.",
        );
      const payment = checked.payments.find(
        (option) => option.chain === paymentChainId,
      );
      if (!payment)
        throw new Error(
          "Choose a current payment option from this saved quote.",
        );
      await assertUnreserved(account, session.executions, session.id);
      if (!reviewedIntents.has(reviewKey(session))) {
        phase("reviewing", session, signal);
        await options.review(session.executions, { resumed: true });
        checkAccount(account, signal);
        rememberReview(session);
      }
      let verified = false;
      let sending = false;
      let paymentPersisted = false;
      const requireOpenPayment = () =>
        relayrPaymentDetails(payment, {
          bundleUuid: session.bundleUuid!,
          destinationChainIds: session.executions.map(
            ({ entry }) => entry.chain,
          ),
        });
      const beforeSend = async () => {
        phase("payment-checking", session, signal);
        await revalidate(session.executions, account, onStatus, true, signal);
        await assertUnreserved(account, session.executions, session.id);
        await statusRead(() =>
          session.payments.length
            ? requireRelayrRetry(
                options.clientFor,
                {
                  payments: session.payments,
                  from: account,
                  bundleUuid: session.bundleUuid!,
                },
                { fetch: fetchRelayr },
              )
            : requireRelayrBundleUnpaid(session.bundleUuid!, {
                fetch: fetchRelayr,
              }),
        ).catch(async (error) => {
          if (statusUnknown(error)) throw unknownStatus(session);
          if (fundingReported(error)) session = await observed(session);
          throw error;
        });
        checkAccount(account, signal);
        requireOpenPayment();
        verified = true;
      };
      const onSending = async () => {
        checkAccount(account, signal);
        if (!verified || sending)
          throw new Error("Recheck the Safe execution before funding it.");
        // The saved record, read again just before the wallet opens: funding
        // another flow reported, or any change to its payment, refuses.
        const stored = await load(account, session.id);
        if (
          hasObservedFunding(stored) ||
          stored.state !== session.state ||
          stored.paymentStatus !== session.paymentStatus ||
          stored.bundleUuid !== session.bundleUuid ||
          JSON.stringify(stored.payments) !== JSON.stringify(session.payments)
        )
          throw new SafeRelayrRecoveryError(
            stored,
            hasObservedFunding(stored)
              ? SAFE_RELAYR_FUNDING_EXIT_LINE
              : "This saved selection changed while it was being paid. Check it again before paying.",
          );
        session = { ...session, paymentStatus: "sending" };
        await store.save(session);
        try {
          checkAccount(account, signal);
          requireOpenPayment();
        } catch (error) {
          session = {
            ...session,
            paymentStatus: checked.session.paymentStatus,
          };
          await store.save(session);
          throw error;
        }
        sending = true;
        phase("payment-submitting", session, signal);
      };
      const onSent = async (payments: RelayrSentPayment[]) => {
        const snapshot = relayrSentPaymentsSnapshot(payments);
        if (
          !sending ||
          !snapshot?.length ||
          snapshot.some((item) => item.bundleUuid !== session.bundleUuid)
        )
          throw new Error("The payment does not match the saved Safe bundle.");
        if (
          !snapshot.some(
            (item) =>
              !checked.session.payments.some(
                (prior) => prior.hash.toLowerCase() === item.hash.toLowerCase(),
              ),
          )
        )
          throw new Error(
            "The new payment attempt has no new transaction hash.",
          );
        for (const prior of session.payments) {
          if (
            !snapshot.some(
              (item) =>
                item.hash.toLowerCase() === prior.hash.toLowerCase() &&
                item.chainId === prior.chainId &&
                item.calldata.toLowerCase() === prior.calldata.toLowerCase() &&
                item.amount === prior.amount &&
                item.deadline === prior.deadline &&
                item.target.toLowerCase() === prior.target.toLowerCase(),
            )
          )
            throw new Error(
              "The saved payment history must retain every known payment.",
            );
        }
        const details = relayrPaymentDetails(payment, {
          bundleUuid: session.bundleUuid!,
          destinationChainIds: session.executions.map(
            ({ entry }) => entry.chain,
          ),
          nowSeconds: 0,
        });
        for (const item of snapshot.filter(
          (item) => !session.payments.some((prior) => prior.hash === item.hash),
        )) {
          if (
            item.chainId !== details.chainId ||
            BigInt(item.amount) !== details.amount ||
            BigInt(item.deadline) !== details.deadline ||
            item.calldata.toLowerCase() !== details.calldata.toLowerCase() ||
            item.target.toLowerCase() !== details.target.toLowerCase()
          )
            throw new Error(
              "The funding payment differs from the selected Relayr option.",
            );
        }
        paymentPersisted = false;
        session = {
          ...session,
          payments: structuredClone(payments),
          paymentStatus: "submitted",
        };
        await store.save(session);
        paymentPersisted = true;
        phase("payment-confirming", session, signal);
      };
      try {
        phase("payment-review", session, signal);
        const sent = await options.sendPayment({
          session: structuredClone(session),
          payment,
          beforeSend,
          onSending,
          onSent,
        });
        if (
          !sent.payments.some(
            (item) => item.hash.toLowerCase() === sent.hash.toLowerCase(),
          )
        )
          throw new Error("The funding result omitted its transaction hash.");
        await onSent(sent.payments);
      } catch (error) {
        if (
          sending &&
          // Classify only this attempt; restoring the previous status below
          // preserves the quote's earlier payments and their retry policy.
          relayrPaymentAttemptOutcome(error, { sending, paid: false }) ===
            "unpaid" &&
          session.payments.length === checked.session.payments.length
        ) {
          session = {
            ...session,
            paymentStatus: checked.session.paymentStatus,
          };
          await store.save(session);
          throw error;
        }
        if (
          sending ||
          session.payments.length > checked.session.payments.length
        ) {
          // A saved hash may already have funded or completed the bundle even
          // when the wallet adapter could not prove it. Inspect once, read-only;
          // never turn an uncertain or unsaved attempt into a retry invitation.
          if (paymentPersisted) {
            try {
              const inspected = await inspect(session, signal);
              session = inspected.session;
              if (
                inspected.state === "complete" ||
                (inspected.state === "pending" &&
                  session.paymentStatus === "confirmed")
              )
                return inspected;
            } catch (inspectionError) {
              if (inspectionError instanceof SafeRelayrRecoveryError)
                session = inspectionError.session;
            }
          }
          throw new SafeRelayrRecoveryError(
            session,
            error instanceof Error ? error.message : undefined,
          );
        }
        throw error;
      }
      return inspect(session, signal);
    });
  }

  /** Read-only progress polling; each read releases its lock before the wait. */
  async function watch({
    account,
    sessionId,
    signal,
    onUpdate,
    intervalMs = 2_500,
    timeoutMs = 300_000,
  }: {
    account: Address;
    sessionId: string;
    signal?: AbortSignal;
    onUpdate?: (result: SafeRelayrResult) => void | Promise<void>;
    intervalMs?: number;
    timeoutMs?: number;
  }): Promise<SafeRelayrResult> {
    if (
      !Number.isFinite(intervalMs) ||
      intervalMs <= 0 ||
      !Number.isFinite(timeoutMs) ||
      timeoutMs < 0
    )
      throw new Error(
        "Safe Relayr polling needs a positive interval and a finite timeout.",
      );
    // The caller's signal, or a test reset, stops it.
    const halt = new AbortController();
    const stop = () =>
      halt.abort(
        signal?.aborted
          ? signal.reason
          : new DOMException("Aborted", "AbortError"),
      );
    watching.add(stop);
    signal?.addEventListener("abort", stop, { once: true });
    if (signal?.aborted) stop();
    const halted = halt.signal;
    try {
      const started = Date.now();
      while (true) {
        halted.throwIfAborted();
        const next = await check({ account, sessionId, signal: halted });
        halted.throwIfAborted();
        await onUpdate?.(next);
        const remaining = timeoutMs - (Date.now() - started);
        if (next.state !== "pending" || remaining <= 0) return next;
        await new Promise<void>((resolve, reject) => {
          const aborted = () => {
            clearTimeout(timer);
            reject(halted.reason);
          };
          const timer = setTimeout(
            () => {
              halted.removeEventListener("abort", aborted);
              resolve();
            },
            Math.min(intervalMs, remaining),
          );
          halted.addEventListener("abort", aborted, { once: true });
          if (halted.aborted) aborted();
        });
      }
    } finally {
      watching.delete(stop);
      signal?.removeEventListener("abort", stop);
    }
  }

  /**
   * The user's warned exit from a quote whose status stays unknown (see
   * {@link SafeRelayrRecovery.exit}): rechecked now, then released, its
   * record kept for reconciliation, so a new quote can follow.
   */
  async function exit({
    account,
    sessionId,
    signal,
  }: {
    account: Address;
    sessionId: string;
    signal?: AbortSignal;
  }): Promise<SafeRelayrResult> {
    return store.withLock(account, async () => {
      checkAccount(account, signal);
      const checked = await inspect(await load(account, sessionId), signal);
      if (!checked.recovery?.exit)
        throw new SafeRelayrRecoveryError(
          checked.session,
          checked.recovery?.message,
          checked.recovery,
        );
      const session: SafeRelayrSession = {
        ...checked.session,
        state: "released",
        releaseReason: "payment-unconfirmed",
      };
      await store.save(session);
      return result("released", session);
    });
  }

  return { prepare, check, fund, watch, exit };
}
