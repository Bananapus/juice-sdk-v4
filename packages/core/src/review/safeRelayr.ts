import {
  decodeFunctionData,
  encodeFunctionData,
  isAddress,
  keccak256,
  toHex,
  parseAbi,
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
import { isDefiniteWalletRejection } from "./contractWrite.js";
import {
  RELAYR_API,
  RELAYR_UUID_RE,
  MAX_RELAYR_SENT_PAYMENTS,
  atCanonicalFinalizedBlock,
  bindRelayrQuote,
  readRelayrBundle,
  relayrBundleRequest,
  relayrDeadlinePassed,
  relayrPaymentOptions,
  relayrPaymentDetails,
  relayrRetryOption,
  relayrSentPaymentsSnapshot,
  relayrStateIsPending,
  relayrQuotedOptions,
  requireRelayrBundleUnpaid,
  requireRelayrRetry,
  revertedRelayrQuote,
  verifyRelayrDestinations,
  verifyRelayrPayment,
  RelayrPaymentRevertedError,
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
  releaseReason?: "quote-expired" | "safe-nonces-consumed" | "quote-replaced";
  /** Sticky evidence that Relayr reported funding or an execution attempt. Not a payment receipt proof. */
  fundingObserved?: boolean;
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
    | "funding-unresolved";
  message: string;
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

export type SafeRelayrOptions = {
  store: SafeRelayrStore;
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
  /** App receipt guards run only after every exact destination and Safe event is proven. */
  afterVerified?: (
    execution: SafeRelayrExecution,
    verified: RelayrVerifiedDestination,
  ) => Promise<void>;
  createId?: () => string;
};

export class SafeRelayrRecoveryError extends Error {
  readonly name = "SafeRelayrRecoveryError";
  constructor(
    readonly session: SafeRelayrSession,
    message = "This Safe execution has an existing Relayr bundle. Check the existing bundle before submitting another payment.",
    readonly recovery?: SafeRelayrRecovery,
  ) {
    super(message);
  }
}

// Review is a page-lifetime capability, never a local-storage claim. Multiple
// hook instances can share it; reloading, changing exact bytes, or eviction
// requires explicit review again. Eviction only adds a review, never a write.
const reviewedIntents = new Set<Hex>();
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

const SAFE_STATE_ABI = parseAbi([
  "function nonce() view returns (uint256)",
  "function getTransactionHash(address to,uint256 value,bytes data,uint8 operation,uint256 safeTxGas,uint256 baseGas,uint256 gasPrice,address gasToken,address refundReceiver,uint256 _nonce) view returns (bytes32)",
]);

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
  verified.forEach(({ receipt }, index) => {
    const { safe, safeTxHash } = executions[index];
    requireSafeExecutionSuccess(receipt, safe, safeTxHash);
    const event = safeExecutionResult(receipt, safe, safeTxHash);
    if (event.status !== "success" || event.payment !== 0n)
      throw new Error(
        "The Safe execution reimbursed its executor. Keep the existing bundle for verification.",
      );
  });
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
  const { store } = options;
  const fetchRelayr = options.fetch ?? globalThis.fetch;
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
        try {
          await requireRelayrBundleUnpaid(session.bundleUuid, {
            fetch: fetchRelayr,
          });
        } catch {
          return pending({
            reason: "funding-unresolved",
            message:
              "Every saved Safe nonce has been used, but the existing Relayr bundle has not been proven unpaid with all calls pending. Keep its payment evidence and inspect the original bundle before replacing this selection.",
            checks,
          });
        }
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

  async function inspect(
    session: SafeRelayrSession,
  ): Promise<SafeRelayrResult> {
    if (session.state === "released") return result("released", session);
    if (session.state === "complete") return result("complete", session);
    if (hasObservedFunding(session) && session.fundingObserved !== true) {
      session = { ...session, fundingObserved: true };
      await store.save(session);
    }
    if (!session.bundleUuid || !session.quote)
      return inspectMissingQuote(session);
    const quote = requireSessionQuote(session);
    const chains = session.executions.map(({ entry }) => entry.chain);
    const bundle = await readRelayrBundle(session.bundleUuid, {
      fetch: fetchRelayr,
    });
    if (
      hasObservedFunding(session) ||
      bundle.payment_received === true ||
      hasFundingRecords(bundle.transactions)
    ) {
      session = { ...session, fundingObserved: true };
      await store.save(session);
    }
    if (!Array.isArray(bundle.transactions))
      throw new SafeRelayrRecoveryError(
        session,
        "Relayr has not returned this bundle's transactions. Check the existing bundle again.",
      );
    const records = bundle.transactions as RelayrTransactionRecord[];
    requireSafeRelayrRecords(quote.expectedTransactions, records);
    session = { ...session, records };
    await store.save(session);
    // A reported hash is only a pointer. Completion requires canonical exact
    // calldata/value receipts AND the matching Safe ExecutionSuccess event.
    if (
      records.length &&
      records.every(
        (record) =>
          record.status?.data?.hash || record.status?.data?.transaction?.hash,
      )
    ) {
      const verified = await verifySafeRelayrLanding(options.clientFor, {
        executions: session.executions,
        bindings: quote.expectedTransactions,
        records,
      });
      await Promise.all(
        session.executions.map((execution, index) =>
          options.afterVerified?.(execution, verified[index]),
        ),
      );
      session = { ...session, state: "complete" };
      await store.save(session);
      return result("complete", session);
    }
    if (session.paymentStatus === "sending") return result("pending", session);
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
          return result("pending", session);
        } catch (error) {
          if (!(error instanceof RelayrPaymentRevertedError))
            everyReverted = false;
        }
      }
      if (!everyReverted) return result("pending", session);
      session = { ...session, paymentStatus: "reverted" };
      await store.save(session);
      const disposition = await revertedRelayrQuote(
        options.clientFor,
        {
          bundleUuid: quote.bundle_uuid,
          payments: session.payments,
          options: quote.payment_info,
          destinationChainIds: chains,
          account: session.account,
        },
        { fetch: fetchRelayr },
      );
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
      return session.fundingObserved
        ? {
            ...result("pending", session),
            recovery: {
              reason: "funding-unresolved",
              message:
                "This saved selection has reported funding or execution activity. Check the existing bundle and its funding transactions before submitting another payment.",
            },
          }
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
            return (
              !!client &&
              (await relayrDeadlinePassed(client, details.deadline).catch(
                () => false,
              ))
            );
          }),
        );
    if (expired.every(Boolean)) {
      try {
        await requireRelayrBundleUnpaid(quote.bundle_uuid, {
          fetch: fetchRelayr,
        });
      } catch {
        return result("pending", session);
      }
      session = {
        ...session,
        state: "released",
        paymentStatus: "expired",
        releaseReason: "quote-expired",
      };
      await store.save(session);
      return result("released", session);
    }
    try {
      await requireRelayrBundleUnpaid(quote.bundle_uuid, {
        fetch: fetchRelayr,
      });
    } catch {
      return result("pending", session);
    }
    const allowed =
      session.payments.length && payments.length
        ? [relayrRetryOption(session.payments, payments)]
        : payments;
    return allowed.length
      ? result("ready", session, allowed)
      : result("pending", session);
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
      for (const saved of reservations) {
        if (canReplaceSafeRelayrQuote(saved)) continue;
        let checked: SafeRelayrResult;
        try {
          checked = await inspect(saved);
        } catch (error) {
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
        await options.review(saved.executions, { resumed: true });
        checkAccount(account, signal);
        rememberReview(checked.session);
        return { ...checked, state: "ready", resumed: true };
      }
      await revalidate(executions, account, onStatus, false, signal);
      await options.review(executions, { resumed: false });
      checkAccount(account, signal);
      // Re-read under the shared lock after review. A rejected review leaves the
      // old quote untouched; a recorded wallet invocation can never be retired.
      for (const saved of await store.list(account)) {
        if (!reserves(saved, executions)) continue;
        if (!canReplaceSafeRelayrQuote(saved))
          throw new SafeRelayrRecoveryError(saved);
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
  }: {
    account: Address;
    sessionId: string;
  }): Promise<SafeRelayrResult> {
    return store.withLock(account, async () =>
      inspect(await load(account, sessionId)),
    );
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
      const checked = await inspect(session);
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
        await options.review(session.executions, { resumed: true });
        checkAccount(account, signal);
        rememberReview(session);
      }
      let verified = false;
      let sending = false;
      const requireOpenPayment = () =>
        relayrPaymentDetails(payment, {
          bundleUuid: session.bundleUuid!,
          destinationChainIds: session.executions.map(
            ({ entry }) => entry.chain,
          ),
        });
      const beforeSend = async () => {
        await revalidate(session.executions, account, onStatus, true, signal);
        await assertUnreserved(account, session.executions, session.id);
        if (session.payments.length) {
          await requireRelayrRetry(
            options.clientFor,
            {
              payments: session.payments,
              from: account,
              bundleUuid: session.bundleUuid!,
            },
            { fetch: fetchRelayr },
          );
        } else
          await requireRelayrBundleUnpaid(session.bundleUuid!, {
            fetch: fetchRelayr,
          });
        checkAccount(account, signal);
        requireOpenPayment();
        verified = true;
      };
      const onSending = async () => {
        checkAccount(account, signal);
        if (!verified || sending)
          throw new Error("Recheck the Safe execution before funding it.");
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
        session = {
          ...session,
          payments: structuredClone(payments),
          paymentStatus: "submitted",
        };
        await store.save(session);
      };
      try {
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
          isDefiniteWalletRejection(error) &&
          session.payments.length === checked.session.payments.length
        ) {
          session = {
            ...session,
            paymentStatus: checked.session.paymentStatus,
          };
          await store.save(session);
        }
        throw error;
      }
      return inspect(session);
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
    const started = Date.now();
    while (true) {
      signal?.throwIfAborted();
      const next = await check({ account, sessionId });
      signal?.throwIfAborted();
      await onUpdate?.(next);
      const remaining = timeoutMs - (Date.now() - started);
      if (next.state !== "pending" || remaining <= 0) return next;
      await new Promise<void>((resolve, reject) => {
        const aborted = () => {
          clearTimeout(timer);
          signal?.removeEventListener("abort", aborted);
          reject(signal?.reason ?? new DOMException("Aborted", "AbortError"));
        };
        const timer = setTimeout(
          () => {
            signal?.removeEventListener("abort", aborted);
            resolve();
          },
          Math.min(intervalMs, remaining),
        );
        signal?.addEventListener("abort", aborted, { once: true });
        if (signal?.aborted) aborted();
      });
    }
  }

  return { prepare, check, fund, watch };
}
