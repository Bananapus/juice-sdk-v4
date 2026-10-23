import {
  concat,
  decodeFunctionData,
  decodeFunctionResult,
  encodeFunctionData,
  formatEther,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import {
  erc2771ForwarderAbi,
  jbV6ContractAddress,
} from "../generated/juicebox.js";
import { multiSendCallsOf } from "../safe.js";
import {
  findPendingSafeAppProposal,
  hasSafeService,
  SAFE_EXEC_ABI,
} from "../safeService.js";
import { promptReview } from "./confirm.js";
import {
  SubmittedContractWriteError,
  submitReviewedContractWrite,
} from "./contractWrite.js";
import { decodeReviewCall } from "./decodeCall.js";
import { buildReviewModel, type ReviewContextRow } from "./model.js";
import {
  plannedRelayrFee,
  relayrStandInSender,
  spendPlan,
  spendPlannedRelayrRound,
  type ReviewedPlan,
  type ReviewedPlanCall,
} from "./plan.js";
import { waitForTrackedReceipt } from "./receipt.js";
import {
  bindRelayrQuote,
  FORWARD_REQUEST_TYPES,
  MAX_RELAYR_SENT_PAYMENTS,
  quoteExpired,
  readRelayrBundle,
  RELAYR_API,
  RELAYR_PAYMENT_ADDRESS,
  RELAYR_PAYMENT_GAS,
  RELAYR_PAYMENT_SELECTOR,
  relayrBundleRequest,
  relayrForwarder,
  relayrForwarderDeadline,
  relayrForwardRequest,
  relayrPaymentChains,
  relayrPaymentDetails,
  relayrPaymentOptions,
  RelayrPaymentNotSentError,
  relayrWalletPaymentError,
  relayrStateIsFailed,
  relayrStateIsSuccess,
  relayrSupportsChains,
  requireRelayrBundleUnpaid,
  requireRelayrPaymentRuntime,
  requireRelayrRetry,
  sentRelayrPayment,
  simulateRelayrPayment,
  TRUSTED_FORWARDER_ABI,
  verifyRelayrPayment,
  type RelayrBundle,
  type RelayrEntry,
  type RelayrPaymentDetails,
  type RelayrQuote,
  type RelayrSentPayment,
  type RelayrTransactionRecord,
} from "./relayr.js";
import type { SafeRelayrOptions } from "./safeRelayr.js";
import type { ReviewedSendDeps } from "./send.js";
import { ReviewedCallRevertedError, ReviewLineError } from "./lineError.js";
import {
  plannedCallsOf,
  prepareSignature,
  signPrepared,
  type ReviewedForwardRequest,
  type ReviewedSignature,
} from "./sign.js";
import { simulateStateChangingTransaction } from "./simulation.js";
import type { TransactionReviewCall } from "./transactionReview.js";
import {
  unsupportedWalletRequest,
  walletReady,
  type WalletAdapter,
} from "./wallet.js";
import { openStepHold, WriteHeldError } from "./writeHold.js";
import { browserLocks } from "./writeRecovery.js";
import { timeout } from "../pause.js";

// Relayr runs ERC-2771 forward requests for one prepaid payment. Everything
// here asks the person once through core's review, then signs and pays only
// what that review showed.

/**
 * One destination call Relayr runs through the chain's forwarder, with the
 * gas its request signs. `raw`: Relayr runs it from its own account, unsigned
 * (a permissionless call), `gas` bounding only the fee. A raw call carries
 * no ETH: Relayr's executor is unknown before it quotes, so one with `value`
 * is refused.
 */
export type RelayrReviewedCall = {
  chainId: number;
  target: Address;
  data: Hex;
  value?: bigint;
  gas: bigint;
  raw?: boolean;
};

/**
 * The margin over an estimated Relayr fee that the review shows as its cap,
 * in basis points (11,000 = the estimate plus 10%). Identical requests quoted
 * minutes apart on every Relayr chain differed by at most 1.4%, so a signed
 * quote above the cap, which asks again, should be rare.
 */
export const RELAYR_FEE_MARGIN_BPS = 11_000n;

/**
 * Relayr's fee over a request's gas limit at the chain's gas price, in basis
 * points, for bounding a fee when no stand-in quote can be had: the highest
 * ratio measured on a Relayr chain (7.95, Ethereum at 100,000 gas), rounded
 * up. Most of a fee is fixed per chain, so the ratio falls as gas rises.
 */
export const RELAYR_FEE_MARKUP_BPS = 80_000n;

/** The gas a forwarder's `execute` adds around the request's own. */
const FORWARDER_OVERHEAD_GAS = 100_000n;
const QUOTE_TIMEOUT_MS = 45_000;
/** How long the review waits on a stand-in quote before it bounds the fee locally. */
const STAND_IN_TIMEOUT_MS = 10_000;
const POLL_INTERVAL_MS = 2_500;
const POLL_TIMEOUT_MS = 5 * 60_000;
/** How many times an expired quote is replaced before the action stops. */
const QUOTE_ATTEMPTS = 3;
const BALANCE_OF_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;
const RELAYR_PAYMENT_ABI = [
  {
    type: "function",
    name: "prepayment",
    stateMutability: "payable",
    inputs: [
      { name: "payment_uuid", type: "bytes16" },
      { name: "deadline", type: "uint40" },
    ],
    outputs: [],
  },
] as const;

const ACCOUNT_CHANGED = "The connected account changed. Review again.";
const ORDINARY_WALLET =
  "Pay for relayed transactions from an ordinary wallet. Nothing was sent.";
const CHANGED_REQUEST =
  "The relay authorization or trusted forwarder changed. Review the original action again.";

/** The quote's payment deadline passed before the wallet opened. */
class QuoteExpiredError extends Error {
  constructor() {
    super(
      "This Relayr quote expired. Review the action again for a new quote.",
    );
  }
}

function forwarderOn(chainId: number): Address {
  const forwarder = relayrForwarder(chainId);
  if (!forwarder) {
    throw new Error(`There is no Juicebox forwarder on chain ${chainId}.`);
  }
  return forwarder;
}

/** The connected wallet, as long as it is an ordinary one on `account` (or, with `safe`, a Safe app). */
async function requireOrdinaryWallet(
  adapter: WalletAdapter,
  account: Address,
  safe = false,
): Promise<void> {
  await walletReady(adapter);
  if (adapter.kind !== "wallet") throw unsupportedWalletRequest();
  const connected = adapter.account();
  if (!connected) throw new Error("Connect a wallet first.");
  if (connected.toLowerCase() !== account.toLowerCase()) {
    throw new Error(ACCOUNT_CHANGED);
  }
  // Signed requests and their proof need an ordinary wallet's own transaction.
  if (adapter.isSafe() && !safe) throw new Error(ORDINARY_WALLET);
}

/** Whether `target` on `chainId` trusts the chain's canonical forwarder, so the real sender is kept. */
async function trustsForwarder(
  client: PublicClient,
  chainId: number,
  target: Address,
): Promise<boolean> {
  const forwarder = relayrForwarder(chainId);
  if (!forwarder) return false;
  try {
    const data = await simulateStateChangingTransaction(client, {
      from: forwarder,
      to: target,
      data: encodeFunctionData({
        abi: TRUSTED_FORWARDER_ABI,
        functionName: "isTrustedForwarder",
        args: [forwarder],
      }),
      gas: 100_000n,
    });
    return decodeFunctionResult({
      abi: TRUSTED_FORWARDER_ABI,
      functionName: "isTrustedForwarder",
      data,
    });
  } catch {
    return false;
  }
}

/**
 * The forward request each call is signed as: from `account`, with the
 * forwarder nonce read now and the default deadline. Refuses more than one
 * call per chain, chains outside one Relayr network family, a gas limit that
 * is not positive, and a destination that does not trust the forwarder.
 */
async function forwardRequests(
  calls: readonly RelayrReviewedCall[],
  account: Address,
  clientFor: (chainId: number) => PublicClient,
): Promise<{ chainId: number; request: ReviewedForwardRequest }[]> {
  const read = [...calls].map(({ chainId, target, data, value, gas }) => ({
    chainId,
    target,
    data,
    value: value ?? 0n,
    gas,
  }));
  if (!read.length) throw new Error("Choose at least one chain.");
  const chainIds = read.map((call) => call.chainId);
  if (!relayrSupportsChains(chainIds)) {
    throw new Error(
      "Relayr runs one call per supported destination, all mainnets or all testnets.",
    );
  }
  if (read.some((call) => typeof call.gas !== "bigint" || call.gas <= 0n)) {
    throw new Error("Each relayed call needs a positive gas limit.");
  }
  const deadline = relayrForwarderDeadline();
  return Promise.all(
    read.map(async (call) => {
      const client = clientFor(call.chainId);
      if (!(await trustsForwarder(client, call.chainId, call.target))) {
        throw new Error(
          `The target on chain ${call.chainId} does not trust the canonical forwarder. Send this action directly.`,
        );
      }
      const nonce = await client.readContract({
        address: forwarderOn(call.chainId),
        abi: erc2771ForwarderAbi,
        functionName: "nonces",
        args: [account],
      });
      return {
        chainId: call.chainId,
        request: {
          from: account,
          to: call.target,
          value: call.value,
          gas: call.gas,
          nonce,
          deadline,
          data: call.data,
        },
      };
    }),
  );
}

/** The bundle entry that runs `request` with `signature` through the chain's forwarder. */
function entryOf(
  chainId: number,
  request: Omit<ReviewedForwardRequest, "nonce">,
  signature: Hex,
): RelayrEntry {
  const { from, to, value, gas, deadline, data } = request;
  return {
    chain: chainId,
    target: forwarderOn(chainId),
    data: encodeFunctionData({
      abi: erc2771ForwarderAbi,
      functionName: "execute",
      args: [{ from, to, value, gas, deadline, data, signature }],
    }),
    value: value.toString(),
  };
}

/**
 * Before posting or paying, each signed entry must still be what was
 * signed: from `account`, executable for two more minutes, to a destination
 * that trusts the forwarder, accepted by the forwarder's `verify`, and
 * simulating from `account` without a revert.
 */
async function verifyForwardedEntries(
  entries: readonly RelayrEntry[],
  account: Address,
  clientFor: (chainId: number) => PublicClient,
): Promise<void> {
  for (const entry of entries) {
    const request = relayrForwardRequest(entry);
    if (!request) throw new Error("Invalid relay authorization.");
    const client = clientFor(entry.chain);
    if (
      request.from.toLowerCase() !== account.toLowerCase() ||
      request.value !== BigInt(entry.value) ||
      request.deadline <= Math.floor(Date.now() / 1_000) + 120 ||
      !(await trustsForwarder(client, entry.chain, request.to)) ||
      !(await client.readContract({
        address: entry.target,
        abi: erc2771ForwarderAbi,
        functionName: "verify",
        args: [request],
      }))
    ) {
      throw new Error(CHANGED_REQUEST);
    }
    await simulateStateChangingTransaction(client, {
      from: account,
      to: entry.target,
      data: entry.data,
      value: request.value,
      gas: request.gas + request.gas / 63n + FORWARDER_OVERHEAD_GAS,
    });
  }
}

/** Post `entries` to Relayr and bind its quote to them (see {@link bindRelayrQuote}). */
async function postBundle(
  entries: readonly RelayrEntry[],
): Promise<RelayrQuote> {
  const request = relayrBundleRequest(entries);
  const response = await globalThis.fetch(`${RELAYR_API}/v1/bundle/prepaid`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(QUOTE_TIMEOUT_MS),
  });
  return bindRelayrQuote(response, request);
}

/**
 * A namespace a payment is held under, on every chain that could fund it:
 * the hold's key names its chain, and another chain could pay too.
 * `paidOnce`: a payment that succeeded under it ends it (a bundle is paid
 * once).
 */
type PaymentIntent = {
  key: string;
  funding: readonly number[];
  paidOnce?: boolean;
};

/** Refuses while a payment held under `intent` may still land, or, for `paidOnce`, once one succeeded. */
function requireIntentClear(
  deps: ReviewedSendDeps,
  account: Address,
  intent: PaymentIntent,
): void {
  for (const chainId of intent.funding) {
    const state = openStepHold(deps.hold, account, false, {
      chainId,
      to: RELAYR_PAYMENT_ADDRESS,
      data: "0x",
      intent: intent.key,
    }).peek();
    if (state.status !== "clear") throw new WriteHeldError(state);
    if (intent.paidOnce && state.settled?.result === "success") {
      throw new Error(
        "This Relayr payment already succeeded. Do not pay again.",
      );
    }
  }
}

/** The quote's authenticated payment on `chainId`. */
function paymentOn(quote: RelayrQuote, chainId: number): RelayrPaymentDetails {
  const destinationChainIds = quote.expectedTransactions.map(
    (binding) => binding.chain,
  );
  const option = relayrPaymentOptions(quote, destinationChainIds).find(
    (payment) => payment.chain === chainId,
  );
  if (
    !option &&
    relayrPaymentOptions(quote, destinationChainIds, 0).some(
      (payment) => payment.chain === chainId,
    )
  ) {
    // Offered, but already too close to its deadline to pay.
    throw new QuoteExpiredError();
  }
  if (!option) {
    throw new Error(
      `Relayr returned no payment option on chain ${chainId}. Nothing was paid.`,
    );
  }
  return relayrPaymentDetails(option, {
    bundleUuid: quote.bundle_uuid,
    destinationChainIds,
    expectedTransactions: quote.expectedTransactions,
  });
}

/** The calls a quote's bundle runs, as a plan holds them; a raw value that can't be read matches none. */
function quotedCalls(quote: RelayrQuote): ReviewedPlanCall[] {
  return quote.expectedTransactions.map(({ chain, entry }) => {
    const request = relayrForwardRequest(entry);
    if (request) {
      const { from, to, data, value, gas } = request;
      return { chainId: chain, from, to, data, value, gas };
    }
    return {
      chainId: chain,
      from: "relayr",
      to: entry.target,
      data: entry.data,
      value: /^\d+$/u.test(entry.value) ? BigInt(entry.value) : -1n,
    };
  });
}

function withMargin(fee: bigint): bigint {
  return (fee * RELAYR_FEE_MARGIN_BPS + 9_999n) / 10_000n;
}

/**
 * Relayr's fee for `calls` signed by a key made for this quote alone: the
 * same chains, gas limits and values, so Relayr prices the same work. The key
 * lives only in memory for this call and leaves it only inside the requests'
 * signatures.
 */
async function standInFee(
  calls: readonly (RelayrReviewedCall & { value: bigint })[],
  paymentChainId: number,
  deadline: number,
): Promise<bigint> {
  const signer = privateKeyToAccount(generatePrivateKey());
  const entries = await Promise.all(
    calls.map(async ({ chainId, target, data, value, gas, raw }) => {
      // Anyone may run a raw call: it is its own stand-in.
      if (raw) return { chain: chainId, target, data, value: value.toString() };
      const request = {
        from: signer.address,
        to: target,
        value,
        gas,
        deadline,
        data,
      };
      const signature = await signer.signTypedData({
        domain: {
          name: "Juicebox",
          version: "1",
          chainId,
          verifyingContract: forwarderOn(chainId),
        },
        types: FORWARD_REQUEST_TYPES,
        primaryType: "ForwardRequest",
        // A key made now has used no forwarder nonce.
        message: { ...request, nonce: 0n },
      });
      return entryOf(chainId, request, signature);
    }),
  );
  return paymentOn(await postBundle(entries), paymentChainId).amount;
}

/**
 * The fee cap the review shows: Relayr's quote for stand-ins of `calls`, plus
 * {@link RELAYR_FEE_MARGIN_BPS}. A call that runs only for the real sender
 * (an owner's action) can't be stood in, so a call with the same chain, gas
 * and calldata length that anyone can run (JBProjects' `balanceOf`) is quoted
 * instead, with the calls' values added. Without either quote in time, the
 * fee is bounded locally: each call's gas estimate through the forwarder as
 * `account`, at the chain's gas price, times {@link RELAYR_FEE_MARKUP_BPS}.
 */
export async function relayrFeeCap(
  calls: readonly RelayrReviewedCall[],
  account: Address,
  paymentChainId: number,
  clientFor: (chainId: number) => PublicClient,
): Promise<bigint> {
  const read = calls.map((call) => ({ ...call, value: call.value ?? 0n }));
  const deadline = relayrForwarderDeadline();
  const values = read.reduce((sum, call) => sum + call.value, 0n);
  const quoted = await timeout(
    standInFee(read, paymentChainId, deadline).catch(async () => {
      const filler = privateKeyToAccount(generatePrivateKey()).address;
      return (
        (await standInFee(
          read.map((call) => {
            const probe = encodeFunctionData({
              abi: BALANCE_OF_ABI,
              functionName: "balanceOf",
              args: [filler],
            });
            const bytes = Math.max((call.data.length - probe.length) / 2, 0);
            return {
              ...call,
              raw: false,
              target: (
                jbV6ContractAddress.JBProjects as Readonly<
                  Record<string, Address>
                >
              )[call.chainId],
              data: `${probe}${"00".repeat(bytes)}` as Hex,
              value: 0n,
            };
          }),
          paymentChainId,
          deadline,
        )) + values
      );
    }),
    STAND_IN_TIMEOUT_MS,
  ).catch(() => null);
  if (quoted !== null) return withMargin(quoted);
  let bound = values;
  for (const call of read) {
    const client = clientFor(call.chainId);
    const estimate = await client
      .estimateGas(
        call.raw
          ? { to: call.target, data: call.data, value: call.value }
          : {
              account: forwarderOn(call.chainId),
              to: call.target,
              // ERC-2771: the forwarder appends the real sender.
              data: concat([call.data, account]),
              value: call.value,
            },
      )
      .catch(() => call.gas);
    const gas =
      (estimate > call.gas ? estimate : call.gas) +
      (call.raw ? 0n : FORWARDER_OVERHEAD_GAS);
    bound +=
      (gas * (await client.getGasPrice()) * RELAYR_FEE_MARKUP_BPS) / 10_000n;
  }
  return withMargin(bound);
}

/** The payment as the review shows it: one call to Relayr's pinned payment contract. */
function paymentReviewCall(
  details: RelayrPaymentDetails,
  account: Address,
  safe = false,
): TransactionReviewCall {
  const { functionName, args } = decodeFunctionData({
    abi: RELAYR_PAYMENT_ABI,
    data: details.calldata,
  });
  return {
    chainId: details.chainId,
    from: account,
    to: RELAYR_PAYMENT_ADDRESS,
    data: details.calldata,
    value: details.amount,
    // A Safe signs the sent gas as safeTxGas; 0 makes a failed payment revert.
    ...(safe ? { safeTxGas: 0n } : { gas: RELAYR_PAYMENT_GAS }),
    abi: RELAYR_PAYMENT_ABI,
    functionName,
    args,
    label: "Pay network fee",
    contractName: "Relayr payment",
  };
}

async function reviewPayment(
  details: RelayrPaymentDetails,
  account: Address,
  action: { context?: readonly ReviewContextRow[]; title?: string },
  safe = false,
): Promise<void> {
  const model = buildReviewModel({
    calls: [paymentReviewCall(details, account, safe)],
    title: action.title ?? "Review network fee",
    ...(action.context ? { context: action.context } : {}),
  });
  await promptReview(
    model,
    Promise.resolve({ status: "passed" }),
    Promise.resolve(model),
  );
}

/**
 * Send one reviewed payment without asking again: Relayr's pinned contract
 * and selector only, from `account`, after the runtime and simulation checks,
 * under the payment's write hold (or `intent`'s). The payment must be proven
 * from the chain before the hash it was mined under comes back.
 */
async function sendPayment(
  details: RelayrPaymentDetails,
  account: Address,
  deps: ReviewedSendDeps,
  hooks: {
    /**
     * Holds the payment under this namespace instead of its exact call,
     * refused while one held under it on any of `funding` may still land.
     * The check and the reservation run under one lock across tabs.
     */
    intent?: PaymentIntent;
    /** Async rechecks after the review, before the simulation. */
    recheck?: () => Promise<void>;
    /** Runs after the hold reserves, right before the wallet opens. */
    onSending?: () => Promise<void>;
    /** Every hash the payment is known by: the wallet's, then the mined one. */
    onSent?: (hash: Hex) => Promise<void>;
    /**
     * Paid by a Safe app: its proposal hash comes back, held until the Safe
     * runs it, and is neither awaited nor proven here.
     */
    safe?: boolean;
  } = {},
): Promise<Hex> {
  const { adapter } = deps;
  const safe = hooks.safe ?? false;
  await requireOrdinaryWallet(adapter, account, safe);
  const client = deps.clientFor(details.chainId);
  const call = {
    chainId: details.chainId,
    to: RELAYR_PAYMENT_ADDRESS,
    data: details.calldata,
    value: details.amount,
    ...(hooks.intent ? { intent: hooks.intent.key } : {}),
  };
  const handle = openStepHold(deps.hold, account, safe, call);
  /** The attempt is saved (`onSending`), and the wallet not yet asked. */
  let saved = false;
  let invoked = false;
  /** A proposal of exactly this payment its Safe already queued, sent in its place. */
  let queued: Awaited<ReturnType<typeof findPendingSafeAppProposal>> = null;
  const attempt = () => {
    const held = handle.peek();
    if (held.status !== "clear") throw new WriteHeldError(held);
    return handle.send<Hex>(client, (gate) =>
      submitReviewedContractWrite({
        request: call,
        expectedAccount: account,
        review: () => Promise.resolve(),
        switchChain: async (chainId) => {
          if (adapter.chainId() !== chainId) await adapter.switchChain(chainId);
        },
        currentAccount: () => adapter.account(),
        reverify: async () => {
          await hooks.recheck?.();
          // A lapsed payment would only revert in simulation.
          if (quoteExpired(details.deadline)) throw new QuoteExpiredError();
          await requireRelayrPaymentRuntime(client);
        },
        simulate: async () => {
          const [, found] = await Promise.all([
            simulateRelayrPayment(client, {
              from: account,
              payment: details,
            }),
            // A Safe never proposes again a payment it already queued exactly.
            safe && hasSafeService(details.chainId)
              ? findPendingSafeAppProposal(
                  client,
                  details.chainId,
                  account,
                  {
                    to: RELAYR_PAYMENT_ADDRESS,
                    data: details.calldata,
                    value: details.amount,
                  },
                  deps.hold.safeService,
                  true,
                )
              : null,
          ]);
          queued = found;
          return details;
        },
        beforeWrite: async () => {
          const { intent } = hooks;
          // Only the check and the reservation are under the lock: never a
          // chain switch, simulation or wallet that might not answer.
          await (intent
            ? browserLocks().request(
                `nana-sdk:relayr-payment:${account.toLowerCase()}:${intent.key}`,
                { mode: "exclusive" },
                async () => {
                  requireIntentClear(deps, account, intent);
                  await gate.beforeSend();
                },
              )
            : gate.beforeSend());
          try {
            await hooks.onSending?.();
          } catch (error) {
            gate.onRejected();
            throw error;
          }
          saved = true;
        },
        beforeSend: () => {
          try {
            if (
              details.target.toLowerCase() !== RELAYR_PAYMENT_ADDRESS ||
              details.calldata.slice(0, 10).toLowerCase() !==
                RELAYR_PAYMENT_SELECTOR
            ) {
              throw new Error(
                "The Relayr payment is not to its pinned contract.",
              );
            }
            if (quoteExpired(details.deadline)) throw new QuoteExpiredError();
            if (adapter.isSafe() !== safe)
              throw new Error(
                safe
                  ? "Wallet connection changed. Review the payment again."
                  : ORDINARY_WALLET,
              );
            if (adapter.chainId() !== details.chainId) {
              throw new Error(
                "Your wallet changed networks. Review the payment again.",
              );
            }
            // Last, after every callback above could have run.
            if (adapter.account()?.toLowerCase() !== account.toLowerCase()) {
              throw new Error(ACCOUNT_CHANGED);
            }
          } catch (error) {
            throw new RelayrPaymentNotSentError(error);
          }
        },
        onBeforeWriteAborted: () => gate.onRejected(),
        onWriteRejected: () => gate.onRejected(),
        onWriteSubmitted: async (submitted) => {
          gate.afterSubmit(submitted, queued?.tx);
          await hooks.onSent?.(submitted);
        },
        // The pinned contract and gas, never the quote's word.
        write: async ({ chainId, calldata, amount }) => {
          // An adopted proposal is already with the Safe: never "not sent".
          invoked = true;
          if (queued) return queued.proposalHash;
          try {
            return await adapter.sendTransaction({
              chainId,
              to: RELAYR_PAYMENT_ADDRESS,
              data: calldata,
              value: amount,
              gas: safe ? 0n : RELAYR_PAYMENT_GAS,
            });
          } catch (error) {
            // Only the wallet's own 4001 says it declined.
            throw relayrWalletPaymentError(error);
          }
        },
      }),
    );
  };
  let hash: Hex;
  try {
    if (hooks.intent) requireIntentClear(deps, account, hooks.intent);
    hash = await attempt();
  } catch (error) {
    // Saved as sending, refused by a final gate, never given to the wallet.
    if (saved && !invoked && !(error instanceof RelayrPaymentNotSentError)) {
      throw new RelayrPaymentNotSentError(error);
    }
    throw error;
  }
  // A proposal: its hold follows it to the Safe's execution.
  if (safe) return hash;
  const receipt = await waitForTrackedReceipt(client, hash);
  // The hold checks the receipt itself and settles, so a reverted payment can
  // be reviewed and sent again without waiting on a view.
  await handle.state(client).catch(() => undefined);
  // A wallet that sped the payment up mined it under another hash.
  const mined = receipt.transactionHash;
  if (mined.toLowerCase() !== hash.toLowerCase()) {
    try {
      await hooks.onSent?.(mined);
    } catch (error) {
      throw new SubmittedContractWriteError(mined, error);
    }
  }
  if (receipt.status === "reverted")
    throw new ReviewedCallRevertedError(0, mined, receipt);
  await verifyRelayrPayment(client, {
    hash: mined,
    from: account,
    payment: details,
  });
  return mined;
}

/**
 * Signs `calls` as ERC-2771 forward requests after one review of the
 * requests, decoded, and returns the Relayr bundle entries that run them.
 * Each destination must trust the chain's canonical forwarder. Nothing is
 * posted or paid.
 */
export async function signReviewedForwardRequests(
  calls: readonly RelayrReviewedCall[],
  action: {
    account: Address;
    context?: readonly ReviewContextRow[];
    title?: string;
  },
  deps: {
    adapter: WalletAdapter;
    clientFor: (chainId: number) => PublicClient;
  },
): Promise<RelayrEntry[]> {
  const { account } = action;
  await requireOrdinaryWallet(deps.adapter, account);
  const requests = await forwardRequests(calls, account, deps.clientFor);
  const prepared = requests.map(({ chainId, request }) =>
    prepareSignature({ kind: "forward-request", chainId, request }, account),
  );
  const model = buildReviewModel({
    calls: [],
    signatures: prepared.map(({ review }) => review),
    title: action.title ?? "Review relayed transactions",
    ...(action.context ? { context: action.context } : {}),
  });
  await promptReview(
    model,
    Promise.resolve({ status: "passed" }),
    Promise.resolve(model),
  );
  const signatures = await signPrepared(prepared, account, deps.adapter);
  return requests.map(({ chainId, request }, index) =>
    entryOf(chainId, request, signatures[index]),
  );
}

/**
 * Pays a Relayr quote after one review of the payment: the option on
 * `chainId`, authenticated against the quote, sent to Relayr's pinned
 * contract and proven from the chain. For a payment resumed apart from its
 * signatures. A Safe app pays by proposal: `safeTxHash` comes back, held
 * until the Safe runs it. `onSending` runs after the hold reserves, right
 * before the wallet opens (a throw sends nothing); `onSent` gets every hash
 * the payment is known by. With `plan` and `relayrRound`, a quote of exactly
 * that round's calls spends the round's reviewed fee bound once, as
 * {@link runRelayrReviewed} does: at most the bound pays with no prompt, and
 * a higher fee, a spent round or another chain is asked.
 */
export async function payRelayrReviewed(
  quote: RelayrQuote,
  chainId: number,
  action: {
    account: Address;
    context?: readonly ReviewContextRow[];
    onSending?: () => Promise<void>;
    onSent?: (hash: Hex) => Promise<void>;
    /** A plan already reviewed with exactly this payment (`reviewPlan`): nothing is asked. */
    plan?: ReviewedPlan;
    /** The plan's Relayr round this quote runs: the payment spends its fee bound instead. */
    relayrRound?: string;
  },
  deps: ReviewedSendDeps,
): Promise<{ hash: Hex } | { safeTxHash: Hex }> {
  const { account } = action;
  await walletReady(deps.adapter);
  const safe = deps.adapter.isSafe();
  await requireOrdinaryWallet(deps.adapter, account, safe);
  const details = paymentOn(quote, chainId);
  const intent = {
    key: `relayr:${details.bundleUuid}`,
    funding: relayrPaymentChains(
      quote.expectedTransactions.map((binding) => binding.chain),
    ),
    paidOnce: true,
  };
  requireIntentClear(deps, account, intent);
  if (action.plan && action.relayrRound !== undefined) {
    const cap = spendPlannedRelayrRound(
      action.plan,
      account,
      action.relayrRound,
      quotedCalls(quote),
      details.chainId,
    );
    if (cap === undefined || details.amount > cap)
      await reviewPayment(
        details,
        account,
        {
          title: cap ? "The network fee went up" : "Review network fee",
          ...(action.context ? { context: action.context } : {}),
        },
        safe,
      );
  } else if (action.plan)
    spendPlan(action.plan, account, [
      {
        chainId: details.chainId,
        from: account,
        to: RELAYR_PAYMENT_ADDRESS,
        data: details.calldata,
        value: details.amount,
      },
    ]);
  else await reviewPayment(details, account, action, safe);
  const hash = await sendPayment(details, account, deps, {
    intent,
    // Relayr's own word too, whatever this browser kept of earlier payments.
    recheck: () => requireRelayrBundleUnpaid(details.bundleUuid),
    ...(action.onSending ? { onSending: action.onSending } : {}),
    ...(action.onSent ? { onSent: action.onSent } : {}),
    safe,
  });
  return safe ? { safeTxHash: hash } : { hash };
}

/**
 * Runs `calls` through Relayr under one review. Before the review it quotes
 * stand-ins of the calls ({@link relayrFeeCap}), and the review shows the
 * forward requests, decoded, with the fee cap as a row; a `raw` call shows as
 * sent by Relayr, unsigned. After confirm it signs the requests, posts them
 * for the quote that binds them, and pays it without asking again when its
 * fee is at most the cap. A higher fee opens one fresh review of the payment
 * first. A quote that expires before the wallet opens is replaced the same
 * way. `scope`, the site's stable key for the action, is required: it holds
 * the payment on every funding chain, so the action is never paid twice,
 * even after a paid run. With `plan` (`reviewPlan`), the calls are spent from
 * it instead of reviewed, and the payment is reviewed on its own.
 */
export async function runRelayrReviewed(
  calls: readonly RelayrReviewedCall[],
  action: {
    account: Address;
    scope: string;
    context?: readonly ReviewContextRow[];
    title?: string;
    /** Further signatures for the same review, signed after the requests. */
    signatures?: readonly ReviewedSignature[];
    /** The chain the fee is paid on: the wallet's, by default, when it can pay there. */
    paymentChainId?: number;
    plan?: ReviewedPlan;
  },
  deps: ReviewedSendDeps,
): Promise<{ uuid: string; paymentHash: Hex; signatures?: Hex[] }> {
  const { adapter, clientFor } = deps;
  const { account, scope, plan } = action;
  if (typeof scope !== "string" || !scope.trim()) {
    throw new Error("A relayed action needs its scope. Nothing was sent.");
  }
  await requireOrdinaryWallet(adapter, account);
  /** Each call as reviewed, read once. */
  const read = [...calls].map(({ chainId, target, data, value, gas, raw }) => ({
    chainId,
    target,
    data,
    value: value ?? 0n,
    gas,
    raw: raw === true,
  }));
  const chainIds = read.map(({ chainId }) => chainId);
  if (!relayrSupportsChains(chainIds)) {
    throw new Error(
      "Relayr runs one call per supported destination, all mainnets or all testnets.",
    );
  }
  // Relayr's executor is not known before it quotes, so a raw call can't be simulated carrying ETH.
  if (read.some(({ raw, value }) => raw && value !== 0n))
    throw new Error("A call Relayr sends on its own can't carry ETH.");
  const forwarded = read.filter(({ raw }) => !raw);
  const requests = forwarded.length
    ? await forwardRequests(forwarded, account, clientFor)
    : [];
  const funding = relayrPaymentChains(chainIds);
  const walletChain = adapter.chainId();
  /** What the plan holds for these calls: forward requests by their call and gas, raw calls as Relayr's. */
  const planned = read.map(({ chainId, target, data, value, gas, raw }) => ({
    chainId,
    from: raw ? ("relayr" as const) : account,
    to: target,
    data,
    value,
    ...(raw ? {} : { gas }),
  }));
  const paymentChainId =
    action.paymentChainId ??
    // Under a plan, the chain its fee bound was reviewed for.
    (plan && plannedRelayrFee(plan, planned)?.chainId) ??
    (walletChain !== undefined && funding.includes(walletChain)
      ? walletChain
      : chainIds[0]);
  if (!funding.includes(paymentChainId)) {
    throw new Error(
      "Choose a Relayr funding chain in the same network family as these destinations.",
    );
  }
  const intent = { key: scope, funding, paidOnce: true };
  // An earlier payment of this action may still land, or landed: nothing is asked.
  requireIntentClear(deps, account, intent);
  const signatures = [
    ...requests.map(
      ({ chainId, request }): ReviewedSignature => ({
        kind: "forward-request",
        chainId,
        request,
      }),
    ),
    ...(action.signatures ?? []),
  ];
  const prepared = signatures.map((signature) =>
    prepareSignature(signature, account),
  );
  /** The fee the person reviewed, if any: a payment above it, or with none, is asked. */
  let cap: bigint | undefined;
  if (plan) {
    // The round's fee bound its review showed, or none: then the payment is asked.
    cap = spendPlan(
      plan,
      account,
      [
        ...planned.filter(({ from }) => from === "relayr"),
        ...prepared.flatMap(plannedCallsOf),
      ],
      paymentChainId,
    );
  } else {
    cap = await relayrFeeCap(read, account, paymentChainId, clientFor);
    const model = buildReviewModel({
      calls: read.flatMap(({ chainId, target, data, value, gas, raw }) =>
        raw
          ? [
              {
                ...decodeReviewCall({ chainId, to: target, data, value, gas }),
                label: "Sent by Relayr",
              },
            ]
          : [],
      ),
      signatures: prepared.map(({ review }) => review),
      title: action.title ?? "Review relayed transactions",
      context: [
        ...(action.context ?? []),
        {
          label: "Network fee",
          value: `Up to ${formatEther(cap)} ETH`,
          strong: true,
        },
        { label: "Fee paid on", value: `Chain ${paymentChainId}` },
        { label: "Fee paid to", value: RELAYR_PAYMENT_ADDRESS, mono: true },
      ],
    });
    await promptReview(
      model,
      Promise.resolve({ status: "passed" }),
      Promise.resolve(model),
    );
  }
  const signed = await signPrepared(prepared, account, adapter);
  let next = 0;
  const entries = read.map(({ chainId, target, data, value, raw }) => {
    if (raw) return { chain: chainId, target, data, value: value.toString() };
    const { request } = requests[next];
    return entryOf(chainId, request, signed[next++]);
  });
  const extra = signed.slice(requests.length);
  /** Every call still as reviewed, each signed entry still valid, each raw call still running. */
  const recheck = async () => {
    const now = [...calls];
    if (
      now.length !== read.length ||
      now.some(
        (call, index) =>
          call.chainId !== read[index].chainId ||
          call.target.toLowerCase() !== read[index].target.toLowerCase() ||
          call.data.toLowerCase() !== read[index].data.toLowerCase() ||
          (call.value ?? 0n) !== read[index].value ||
          (call.raw === true) !== read[index].raw,
      )
    )
      throw new ReviewLineError(
        "Transaction data changed after review. Nothing was sent; review it again.",
      );
    await verifyForwardedEntries(
      entries.filter((_entry, index) => !read[index].raw),
      account,
      clientFor,
    );
    for (const { chainId, target, data, value, raw } of read)
      if (raw)
        await simulateStateChangingTransaction(clientFor(chainId), {
          from: relayrStandInSender(),
          to: target,
          data,
          value,
        });
  };
  await recheck();
  for (let attempt = 1; ; attempt += 1) {
    try {
      const quote = await postBundle(entries);
      const details = paymentOn(quote, paymentChainId);
      if (cap === undefined || details.amount > cap) {
        await reviewPayment(details, account, {
          title: cap ? "The network fee went up" : "Review network fee",
          ...(action.context ? { context: action.context } : {}),
        });
        cap = details.amount;
      }
      const paymentHash = await sendPayment(details, account, deps, {
        intent,
        recheck,
      });
      return {
        uuid: quote.bundle_uuid,
        paymentHash,
        ...(extra.length ? { signatures: extra } : {}),
      };
    } catch (error) {
      const expired =
        error instanceof QuoteExpiredError ||
        (error instanceof RelayrPaymentNotSentError &&
          (error as { cause?: unknown }).cause instanceof QuoteExpiredError);
      if (!expired || attempt >= QUOTE_ATTEMPTS) throw error;
    }
  }
}

/**
 * Relayr's bundle once every one of its `expectedCount` transactions reports
 * success. Only `failed`, in any case, is final; every other state, and a
 * read that fails, is polled again every 2.5 seconds, for up to 5 minutes.
 * Relayr's word is not proof: verify the destinations from the chain.
 */
export async function pollRelayrBundle(
  uuid: string,
  expectedCount: number,
  options: { signal?: AbortSignal; fetch?: typeof fetch } = {},
): Promise<RelayrBundle> {
  if (!Number.isSafeInteger(expectedCount) || expectedCount < 1) {
    throw new Error("Relayr polling requires the exact destination count.");
  }
  const { signal } = options;
  const until = Date.now() + POLL_TIMEOUT_MS;
  for (;;) {
    signal?.throwIfAborted();
    const bundle = await readRelayrBundle(uuid, {
      ...(options.fetch ? { fetch: options.fetch } : {}),
    }).catch(() => null);
    const records = Array.isArray(bundle?.transactions)
      ? (bundle.transactions as RelayrTransactionRecord[])
      : [];
    const failed = records.filter((record) =>
      relayrStateIsFailed(record?.status?.state),
    ).length;
    if (failed) {
      throw new Error(
        `Relayr could not run this on ${failed} chain${failed === 1 ? "" : "s"}.`,
      );
    }
    if (
      bundle &&
      records.length === expectedCount &&
      records.every((record) => relayrStateIsSuccess(record?.status?.state))
    ) {
      return bundle;
    }
    if (Date.now() >= until) {
      throw new Error(
        `Relayr is still processing paid bundle ${uuid}. Do not submit this action again; check it later.`,
      );
    }
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, POLL_INTERVAL_MS);
      signal?.addEventListener(
        "abort",
        () => {
          clearTimeout(timer);
          reject(signal.reason);
        },
        { once: true },
      );
    });
  }
}

/** A Safe execution as the review shows it: the Safe's `execTransaction`, with the call or MultiSend inside. */
function safeExecutionCall(entry: RelayrEntry): TransactionReviewCall {
  const decoded = decodeFunctionData({ abi: SAFE_EXEC_ABI, data: entry.data });
  if (decoded.functionName !== "execTransaction") {
    throw new Error("The saved call is not a Safe execution.");
  }
  const [to, value, data, operation] = decoded.args;
  const inner = multiSendCallsOf({ to, data, operation }) ?? [
    { to, value, data },
  ];
  return {
    chainId: entry.chain,
    to: entry.target,
    data: entry.data,
    value: BigInt(entry.value),
    abi: SAFE_EXEC_ABI,
    functionName: "execTransaction",
    args: decoded.args,
    contractName: "Safe",
    calls: inner.map((call) =>
      decodeReviewCall({ chainId: entry.chain, from: entry.target, ...call }),
    ),
  };
}

/**
 * The wallet side of {@link createSafeRelayrController}: `review` shows the
 * frozen Safe executions in core's review, and `sendPayment` reviews and
 * sends the selected payment as {@link payRelayrReviewed} does, with the
 * controller's checks and journal callbacks around the wallet. A quote paid
 * before is paid again only when {@link requireRelayrRetry} clears every
 * earlier payment.
 */
export function safeRelayrWalletDeps(
  deps: ReviewedSendDeps,
): Pick<SafeRelayrOptions, "review" | "sendPayment"> {
  return {
    review: async (executions, { resumed }) => {
      const model = buildReviewModel({
        calls: executions.map(({ entry }) => safeExecutionCall(entry)),
        title: `Review ${executions.length} Safe execution${executions.length === 1 ? "" : "s"}`,
        confirmLabel: resumed
          ? "Use saved quote"
          : "Review & get payment options",
      });
      await promptReview(
        model,
        Promise.resolve({ status: "passed" }),
        Promise.resolve(model),
      );
    },
    sendPayment: async ({
      session,
      payment,
      beforeSend,
      onSending,
      onSent,
    }) => {
      const { account } = session;
      await requireOrdinaryWallet(deps.adapter, account);
      if (session.payments.length >= MAX_RELAYR_SENT_PAYMENTS) {
        throw new Error(
          "This Relayr quote was paid too many times to pay again. Keep it pending; do not pay again.",
        );
      }
      if (!session.quote)
        throw new Error("This Safe action has no quote to pay.");
      const details = relayrPaymentDetails(payment, {
        bundleUuid: session.quote.bundle_uuid,
        destinationChainIds: session.executions.map(({ entry }) => entry.chain),
      });
      await reviewPayment(details, account, {});
      const payments: RelayrSentPayment[] = [...session.payments];
      const hash = await sendPayment(details, account, deps, {
        recheck: async () => {
          await beforeSend();
          if (session.payments.length) {
            await requireRelayrRetry(deps.clientFor, {
              payments: session.payments,
              from: account,
              bundleUuid: details.bundleUuid,
            });
          }
        },
        onSending,
        onSent: async (sent) => {
          payments.push(sentRelayrPayment(details, sent));
          await onSent([...payments]);
        },
      });
      return { hash, payments };
    },
  };
}
