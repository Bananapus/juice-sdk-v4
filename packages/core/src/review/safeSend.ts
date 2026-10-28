import {
  decodeFunctionResult,
  encodeFunctionData,
  isAddressEqual,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";
import {
  readAuthorityIdentity,
  readBoundedSafeNonce,
  type SafeAuthorityIdentity,
} from "../safe.js";
import {
  canonicalSafeTxHash,
  hasSafeService,
  listPendingSafeTransactions,
  nextProposalNonce,
  proposeSafeTransaction,
  readSafeTransaction,
  requireSafeExecutionSuccess,
  SAFE_EXEC_ABI,
  safeBatchProposalFor,
  safeExecutionArgs,
  safeProposalFor,
  safeTransactionHash,
  safeTransactionHasRefund,
  safeTransactionMatchesCall,
  safeTransactionMessage,
  submitSafeConfirmation,
  usableSafeConfirmations,
  type SafeQueuedTransaction,
  type SafeServiceOptions,
} from "../safeService.js";
import { safeExecutionIntent } from "./intents.js";
import type { ReviewContextRow } from "./model.js";
import type { ReviewedPlan } from "./plan.js";
import { tell, waitForTrackedReceipt } from "./receipt.js";
import {
  sendReviewed,
  type ReviewedCall,
  type ReviewedResult,
  type ReviewedSendDeps,
} from "./send.js";
import { signReviewed } from "./sign.js";
import { simulateStateChangingTransaction } from "./simulation.js";
import { walletReady } from "./wallet.js";

type LiveSafe = { identity: SafeAuthorityIdentity; nonce: number };

const UNVERIFIED = "Could not verify this Safe onchain.";
const SAFE_CHANGED =
  "The Safe policy or nonce changed. Review the transaction again.";
const REFUND =
  "This transaction pays a gas refund, so it can't be executed here.";

function connectedAccount(deps: ReviewedSendDeps): Address {
  const account = deps.adapter.account();
  if (!account) throw new Error("Connect a wallet first.");
  return account;
}

function requireService(chainId: number): void {
  if (!hasSafeService(chainId)) {
    throw new Error(
      `Safe does not host a transaction service on chain ${chainId}.`,
    );
  }
}

/**
 * The Safe's live policy and nonce. Fails closed on anything but a recognized
 * Safe whose every module was read: a module can change the policy without
 * moving the nonce.
 */
async function liveSafe(
  client: PublicClient,
  safe: Address,
): Promise<LiveSafe> {
  const [identity, nonce] = await Promise.all([
    readAuthorityIdentity(client, safe),
    readBoundedSafeNonce(client, safe),
  ]);
  if (
    identity?.kind !== "safe" ||
    !identity.modules ||
    nonce === null ||
    nonce > BigInt(Number.MAX_SAFE_INTEGER)
  ) {
    throw new Error(UNVERIFIED);
  }
  return { identity, nonce: Number(nonce) };
}

/** Throws unless `after` is `before`: the same policy, modules and nonce. */
function requireUnchanged(before: LiveSafe, after: LiveSafe): void {
  if (JSON.stringify(before) !== JSON.stringify(after)) {
    throw new Error(SAFE_CHANGED);
  }
}

function requireSigner(state: LiveSafe, account: Address): void {
  if (!state.identity.owners.some((owner) => isAddressEqual(owner, account))) {
    throw new Error("The connected wallet is not a signer of this Safe.");
  }
}

/** A pending transaction may wait behind others; an executed one must be next. */
function requireNonce(
  state: LiveSafe,
  tx: SafeQueuedTransaction,
  mode: "pending" | "execute",
): void {
  const nonce = safeTransactionMessage(tx).nonce;
  const live = BigInt(state.nonce);
  if (mode === "execute" ? nonce !== live : nonce < live) {
    throw new Error(
      `Safe transaction #${tx.nonce} is stale or does not match the live nonce.`,
    );
  }
}

/** `tx` read once, so a record changed after review is not what is sent. */
function snapshot(tx: SafeQueuedTransaction): SafeQueuedTransaction {
  const copy = structuredClone(tx);
  if (safeTransactionHasRefund(copy)) throw new Error(REFUND);
  return copy;
}

/**
 * Signs `tx` as `account`, an owner, through {@link signReviewed}'s Safe
 * transaction review. The Safe's policy and nonce must not move while the
 * review is open, checked before the wallet is asked, nor while the wallet
 * is open, checked once it answers.
 */
async function signAsOwner(
  input: {
    chainId: number;
    safe: Address;
    account: Address;
    tx: SafeQueuedTransaction;
    context?: readonly ReviewContextRow[];
    title?: string;
    /** The caller's last read before posting, ahead of the final Safe check. */
    beforePost?: () => Promise<void>;
    plan?: ReviewedPlan;
  },
  deps: ReviewedSendDeps,
): Promise<Hex> {
  const { chainId, safe, account, tx, context, title, beforePost, plan } =
    input;
  const client = deps.clientFor(chainId);
  const before = await liveSafe(client, safe);
  requireSigner(before, account);
  requireNonce(before, tx, "pending");
  const unchanged = async () =>
    requireUnchanged(before, await liveSafe(client, safe));
  const [signature] = await signReviewed(
    [{ kind: "safe-tx", chainId, safe, tx }],
    {
      account,
      ...(title ? { title } : {}),
      ...(context ? { context } : {}),
      ...(plan ? { plan } : {}),
      reverify: unchanged,
    },
    deps,
  );
  await beforePost?.();
  await unchanged();
  return signature;
}

/**
 * Proposes `calls` to `safe`'s owners through Safe's transaction service: one
 * zero-refund Safe transaction, a CALL for one call or a MultiSendCallOnly
 * batch for several, signed by the connected owner after one review. It takes
 * the nonce after everything already queued. A queued proposal of exactly
 * these calls is confirmed instead, or, when this owner already confirmed it,
 * returned as it is.
 *
 * Mirrors jbm `src/lib/safe.ts` `runSafeCalls` (service path), `proposeSafeTx`
 * and `signSafeTx` (`:331-420`).
 */
export async function proposeReviewedSafeTransaction(
  input: {
    chainId: number;
    safe: Address;
    calls: readonly ReviewedCall[];
    context?: readonly ReviewContextRow[];
    title?: string;
    /** The app the service records as the proposer. */
    origin?: string;
    service?: SafeServiceOptions;
    /** A plan already reviewed with these calls from `safe` (`reviewPlan`): nothing is asked. */
    plan?: ReviewedPlan;
  },
  deps: ReviewedSendDeps,
): Promise<{ safeTxHash: Hex }> {
  const {
    chainId,
    safe,
    context,
    title,
    origin = "Juicebox",
    service,
    plan,
  } = input;
  requireService(chainId);
  const calls = [...input.calls].map((call) => {
    const { chainId: on, to, data, value } = call;
    if (on !== chainId) {
      throw new Error(
        `Every call of a Safe proposal must be on chain ${chainId}.`,
      );
    }
    return { to, data, value: value ?? 0n };
  });
  if (!calls.length) throw new Error("There is no transaction to review.");
  const account = connectedAccount(deps);
  const state = await liveSafe(deps.clientFor(chainId), safe);
  requireSigner(state, account);
  // An outage must not read as an empty queue: the proposal would take a
  // queued nonce and strand one of the two.
  const pending = await listPendingSafeTransactions(
    chainId,
    safe,
    state.nonce,
    service,
  );
  const build = (nonce: number) =>
    calls.length === 1
      ? safeProposalFor(calls[0], nonce)
      : safeBatchProposalFor(calls, nonce);
  const shape = safeTransactionMessage(build(state.nonce));
  const queued = pending.find((tx) => safeTransactionMatchesCall(tx, shape));
  if (queued) {
    const confirmed = usableSafeConfirmations(
      queued,
      state.identity.owners,
    ).some(({ owner }) => isAddressEqual(owner, account));
    if (confirmed) {
      return { safeTxHash: canonicalSafeTxHash(chainId, safe, queued) };
    }
    return confirmAs(
      account,
      {
        chainId,
        safe,
        tx: queued,
        ...(context ? { context } : {}),
        ...(plan ? { plan } : {}),
        service,
      },
      deps,
    );
  }
  const nonce = nextProposalNonce(state.nonce, pending);
  const tx = build(nonce);
  const safeTxHash = safeTransactionHash(chainId, safe, tx);
  const signature = await signAsOwner(
    {
      chainId,
      safe,
      account,
      tx,
      context,
      title,
      ...(plan ? { plan } : {}),
      // Another proposal queued at this nonce meanwhile would be replaced by this one.
      beforePost: async () => {
        const since = await listPendingSafeTransactions(
          chainId,
          safe,
          state.nonce,
          service,
        );
        if (since.some((other) => other.nonce === nonce)) {
          throw new Error(
            `Another proposal took Safe nonce ${nonce} during review. Nothing was proposed; review it again.`,
          );
        }
      },
    },
    deps,
  );
  try {
    await proposeSafeTransaction(
      chainId,
      safe,
      tx,
      { sender: account, signature, origin },
      service,
    );
  } catch (error) {
    // The service may have queued it and lost its answer: a retry must find
    // it, not propose the same calls again at the next nonce. Only this
    // owner's own signature on the record proves this proposal landed.
    const queued = await readSafeTransaction(
      chainId,
      safe,
      safeTxHash,
      service,
    ).then(
      (record) =>
        Array.isArray(record.confirmations) &&
        record.confirmations.some(
          (confirmation) =>
            typeof confirmation?.owner === "string" &&
            isAddressEqual(confirmation.owner, account) &&
            confirmation.signature?.toLowerCase() === signature.toLowerCase(),
        ),
      () => false,
    );
    if (!queued) throw error;
  }
  return { safeTxHash };
}

/**
 * Adds the connected owner's signature to the queued `tx`, after one review
 * of exactly its fields, safeTxGas included. Refuses a record whose fields do
 * not hash to the hash it advertises, one that pays a gas refund, and one
 * whose nonce the Safe has passed.
 *
 * Mirrors jbm `src/lib/safe.ts` `confirmSafeTx` and `signSafeTx`
 * (`:331-420`).
 */
export async function confirmReviewedSafeTransaction(
  input: {
    chainId: number;
    safe: Address;
    tx: SafeQueuedTransaction;
    context?: readonly ReviewContextRow[];
    service?: SafeServiceOptions;
    /** A plan already reviewed with the transaction's calls from `safe` (`reviewPlan`): nothing is asked. */
    plan?: ReviewedPlan;
  },
  deps: ReviewedSendDeps,
): Promise<{ safeTxHash: Hex }> {
  return confirmAs(connectedAccount(deps), input, deps);
}

async function confirmAs(
  account: Address,
  input: Parameters<typeof confirmReviewedSafeTransaction>[0],
  deps: ReviewedSendDeps,
): Promise<{ safeTxHash: Hex }> {
  const { chainId, safe, context, service, plan } = input;
  const tx = snapshot(input.tx);
  requireService(chainId);
  const safeTxHash = canonicalSafeTxHash(chainId, safe, tx);
  const signature = await signAsOwner(
    { chainId, safe, account, tx, context, ...(plan ? { plan } : {}) },
    deps,
  );
  await submitSafeConfirmation(chainId, safe, tx, signature, service);
  return { safeTxHash };
}

/**
 * Executes the queued `tx` from the connected wallet, signed by its usable
 * current-owner confirmations, through {@link sendReviewed}: one review, the
 * step's write hold, and before the wallet opens, the Safe's policy and nonce
 * checked unchanged and the exact call simulated to return true. The result
 * is decided by the Safe's own ExecutionSuccess for the exact hash, never by
 * the receipt's status alone. A Safe-connected wallet's proposal is returned
 * as `proposed`.
 *
 * Mirrors jbm `src/lib/safe.ts` `executeSafeTx` and `sendContractAndConfirm`
 * (`:595-760`).
 */
export async function executeReviewedSafeTransaction(
  input: {
    chainId: number;
    safe: Address;
    tx: SafeQueuedTransaction;
    context?: readonly ReviewContextRow[];
  },
  deps: ReviewedSendDeps,
): Promise<ReviewedResult> {
  const { chainId, safe, context } = input;
  const tx = snapshot(input.tx);
  const account = connectedAccount(deps);
  // A Safe app wraps the call in a transaction of its own Safe, which spends
  // the nonce this one is signed for.
  if (isAddressEqual(account, safe)) {
    throw new Error(
      "A Safe can't execute its own queued transaction from inside itself. Execute it from an owner's wallet.",
    );
  }
  const safeTxHash = canonicalSafeTxHash(chainId, safe, tx);
  const client = deps.clientFor(chainId);
  const state = await liveSafe(client, safe);
  requireNonce(state, tx, "execute");
  const { owners, threshold } = state.identity;
  const usable = usableSafeConfirmations(tx, owners);
  if (usable.length < threshold) {
    throw new Error(
      `This transaction needs ${threshold} current-owner signature${threshold === 1 ? "" : "s"} before it can execute.`,
    );
  }
  // Safe accepts the executor's own approval (v = 1) without checking its
  // hash, so it does not bind the execution to this nonce: with it alone, a
  // nonce spent meanwhile would run the same call again at the next one.
  const bound = usable.filter(
    ({ owner, signature }) =>
      !isAddressEqual(owner, account) ||
      (!!signature && signature.slice(130, 132) !== "01"),
  );
  if (!bound.length) {
    throw new Error(
      "Your own approval alone does not bind this execution to its nonce. Sign the Safe transaction first.",
    );
  }
  const args = safeExecutionArgs(
    { ...tx, confirmations: bound.length >= threshold ? bound : usable },
    owners,
  );
  const data = encodeFunctionData({
    abi: SAFE_EXEC_ABI,
    functionName: "execTransaction",
    args,
  });
  /**
   * Before the wallet opens: the Safe unchanged since review, and the exact
   * call simulated to return true. A Safe signed with safeTxGas or gasPrice
   * returns false for a failed call instead of reverting.
   */
  const stillExecutes = async () => {
    requireUnchanged(state, await liveSafe(client, safe));
    let executes = false;
    try {
      executes = decodeFunctionResult({
        abi: SAFE_EXEC_ABI,
        functionName: "execTransaction",
        data: await simulateStateChangingTransaction(client, {
          from: account,
          to: safe,
          data,
        }),
      });
    } catch {
      // A revert or an unreadable answer is not an execution.
    }
    if (executes !== true) {
      throw new Error(
        `Safe transaction #${tx.nonce} would not execute successfully.`,
      );
    }
  };
  await walletReady(deps.adapter);
  // A self-reviewing wallet sends with no step of core's before it.
  if (deps.adapter.kind === "self-reviewing") await stillExecutes();
  const result = await sendReviewed(
    {
      account,
      calls: [
        {
          chainId,
          to: safe,
          data,
          abi: SAFE_EXEC_ABI,
          functionName: "execTransaction",
          args,
          label: `Execute Safe transaction #${tx.nonce}`,
          contractName: "Safe",
          intent: safeExecutionIntent({ chainId, safe, safeTxHash }),
        },
      ],
      ...(context ? { context } : {}),
      reverify: stillExecutes,
    },
    {
      ...deps,
      // Done only once the Safe's own event says so, below.
      onProgress: (progress) => {
        if (progress.phase !== "done") deps.onProgress?.(progress);
      },
    },
  );
  if (result.status !== "done") return result;
  const receipt =
    result.receipts[0] ??
    (await waitForTrackedReceipt(client, result.hashes[0]));
  requireSafeExecutionSuccess(receipt, safe, safeTxHash);
  tell(deps.onProgress, { step: 0, total: 1, phase: "done" });
  return result;
}
