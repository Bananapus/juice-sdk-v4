import {
  ReviewedCallRevertedError,
  ReviewedReceiptUnverifiedError,
  ReviewLineError,
  WalletNotInvokedError,
} from "./lineError.js";
import {
  encodeFunctionData,
  formatEther,
  type Abi,
  type Address,
  type Hex,
  type PublicClient,
  type TransactionReceipt,
} from "viem";
import {
  failedSimulation,
  promptReview,
  type ReviewSimulation,
} from "./confirm.js";
import {
  isDefiniteWalletRejection,
  SubmittedContractWriteError,
  submitReviewedContractWrite,
  type ReviewedWritePhase,
} from "./contractWrite.js";
import { JB_CHAINS } from "../constants.js";
import { gasWithHeadroom } from "./gas.js";
import { FOLLOW_MS, followHeldWrite, RECEIPT_RETRY_MS } from "./heldWrite.js";
import { TransactionReviewCancelledError } from "./reviewQueue.js";
import { pause } from "../pause.js";
import {
  findPendingSafeAppProposal,
  hasSafeService,
  isSafeExecTransaction,
} from "../safeService.js";
import {
  REVIEWED_ACCOUNT_CHANGED_LINE,
  WRITE_HOLD_CALL_FAILED_LINE,
  WRITE_HOLD_SAFE_UNCONFIRMED_LINE,
} from "./messages.js";
import {
  buildReviewModel,
  enrichReviewModel,
  type ReviewContextRow,
  type ReviewModel,
  type ReviewWarning,
} from "./model.js";
import {
  mintPlan,
  relayrStandInSender,
  type PlannedRelayrFee,
  REVIEWED_PLAN_REFUSED_LINE,
  spendPlan,
  type ReviewedPlan,
} from "./plan.js";
import { heldReceipt, waitForTrackedReceipt } from "./receipt.js";
import { relayrPaymentChains } from "./relayr.js";
import { relayrFeeCap } from "./relayrSend.js";
import {
  assertSavableCalls,
  readReviewedSequence,
  removeReviewedSequence,
  REVIEWED_SEQUENCE_MOVED_LINE,
  REVIEWED_SEQUENCE_UNCERTAIN_LINE,
  REVIEWED_SEQUENCE_UNFINISHED_LINE,
  saveReviewedSequence,
  type ReviewedSequenceRecord,
} from "./sequence.js";
import {
  plannedCallsOf,
  prepareSignature,
  signPrepared,
  type ReviewedSignature,
} from "./sign.js";
import {
  isRevert,
  REVERT_UNKNOWN_LINE,
  revertDetail,
  revertReason,
  simulateCallSequence,
  simulateStateChangingTransaction,
  simulationFailure,
} from "./simulation.js";
import type {
  TransactionReviewCall,
  TransactionReviewRequest,
} from "./transactionReview.js";
import {
  unsupportedWalletRequest,
  walletReady,
  type WalletAdapter,
} from "./wallet.js";
import {
  openStepHold,
  safeBatchCall,
  WriteHeldError,
  WriteHoldStaleReviewError,
  WriteHoldUnacknowledgedSuccessError,
  type WriteHold,
  type WriteHoldLegacySource,
  type WriteHoldHandle,
  type WriteHoldSettled,
} from "./writeHold.js";
import {
  createHeldWriteStorage,
  type HeldWriteStorage,
} from "./writeRecovery.js";

export type ReviewedCall = {
  chainId: number;
  to: Address;
  data: Hex;
  value?: bigint;
  /**
   * The exact gas limit to send with, when the app fixes it (a saved gas
   * envelope, say). It is shown and bound in the review, simulated and sent
   * as it is, never estimated or padded. A Safe app proposes with safeTxGas 0
   * whatever this is.
   */
  gas?: bigint;
  /**
   * For a Safe app only, with `abi` and `functionName`: the indexes of the
   * args (a fresh deadline) a proposal its Safe already queued may differ in
   * and still be adopted instead of proposed twice. The queued data must
   * decode with `abi` to the same function, encode back to exactly its bytes,
   * and match every other arg; the target, value and operation must match as
   * they are. Bound into the review. Unset compares exact bytes.
   */
  adoptIgnoringArgs?: readonly number[];
  /** When given, `data` must be exactly this function's encoding of `args`. */
  abi?: Abi;
  functionName?: string;
  args?: readonly unknown[];
  label?: string;
  contractName?: string;
  /** The hold namespace, as `useSafeTx`'s `TxSendOptions` today. */
  intent?: string;
  /** The keys an earlier version held this write under, as the hold's `open` takes them. */
  legacy?: readonly WriteHoldLegacySource[];
  /** Simulate on the previous step's receipt block. */
  dependsOnPrior?: boolean;
  /**
   * The block where a prerequisite confirmed outside this run (an earlier
   * approval, say) took effect: the call is simulated on the latest block,
   * or on this one while the node has not reached it. Used where the call
   * is simulated alone and not on a prior step's block; a resumed run
   * simulates on the latest block.
   */
  simulationBlockNumber?: bigint;
};

/** Where the step before this one confirmed. */
export type ReviewedPriorBlock = {
  chainId: number;
  blockNumber: bigint;
  blockHash: Hex;
};

export type ReviewedAction = {
  account: Address;
  calls: readonly ReviewedCall[];
  /**
   * Signatures shown in the same prompt as `calls`, and signed after confirm,
   * before the first send. A resumed sequence signs none.
   */
  signatures?: readonly ReviewedSignature[];
  title?: string;
  description?: string;
  confirmLabel?: string;
  context?: readonly ReviewContextRow[];
  /**
   * A stale-state check before each step; it throws to stop with nothing
   * sent. `prior` is where the previous step of the action confirmed (on its
   * own chain), so the check can read state at or after it; undefined for
   * the first step, or on resume when that step's receipt can't be read.
   */
  reverify?: (
    call: ReviewedCall,
    index: number,
    prior: ReviewedPriorBlock | undefined,
  ) => Promise<void>;
  /** The final synchronous gate before the wallet opens. */
  assertWriteState?: () => void;
  /** Refuses the action, before anything else (view-as, say). */
  guard?: () => void;
  /**
   * A site's own record of a step at the wallet boundary, awaited: after its
   * hold reserved it (and its journal saved it), right before the wallet
   * opens. It throws to stop with nothing sent, which releases the step.
   * `step` is the index in the whole action.
   */
  beforeWallet?: (call: ReviewedCall, step: number) => void | Promise<void>;
  /**
   * Awaited when nothing was sent for a step whose `beforeWallet` began: a
   * gate refused, `beforeWallet` threw, or the wallet rejected (4001). Never
   * after an ambiguous failure.
   */
  onUnsent?: (call: ReviewedCall, step: number) => void | Promise<void>;
  /**
   * Awaited once the wallet returned a step's hash, before its receipt is
   * awaited: a Safe app's proposal hash (`safe`), or one its Safe already
   * queued (`adopted`). A throw keeps the step pending, never unsent.
   */
  onSubmitted?: (
    call: ReviewedCall,
    step: number,
    hash: Hex,
    sent: { safe: boolean; adopted: boolean },
  ) => void | Promise<void>;
  /**
   * Awaited once a step's receipt shows it succeeded and its progress is
   * saved, before the next step; on resume, for a step that went through
   * while away, when its receipt can be read. A throw is ignored: the step
   * went through. A Safe app's proposal is never told here: its hold's
   * settlement is (`useReviewedRun`'s `done` and `receipt`).
   */
  onConfirmed?: (
    call: ReviewedCall,
    step: number,
    receipt: TransactionReceipt,
  ) => void | Promise<void>;
  /**
   * Through a Safe app, every call goes to the Safe as one proposal (the
   * app folds `sendCalls` into a MultiSend its signers approve once and run
   * together, in order), under one hold: the first call's `intent`, or else
   * `safeBatchIntent` of the calls. The calls must share a chain and
   * the adapter must offer `sendCalls`. Nothing is journaled: the proposal
   * runs whole or not at all. A resumed sequence, and any other wallet, sends
   * the calls one by one.
   */
  batch?: boolean;
  /**
   * Withdraws the review while it is open: the run ends as cancelled with
   * nothing sent, and the prompt's own `signal` aborts so its UI closes.
   * Once the review is confirmed it changes nothing.
   */
  signal?: AbortSignal;
  /**
   * The site's key for this action (`payIntent(...)`, say). When set, the
   * action is journaled once its review is confirmed, before the first
   * wallet call, so {@link resumeReviewed} can finish it without sending a
   * completed step again.
   */
  scope?: string;
  /**
   * A plan the person already reviewed ({@link reviewPlan}): nothing is
   * asked, and every call (and every call the `signatures` let someone run)
   * is spent from it, or nothing is sent.
   */
  plan?: ReviewedPlan;
  /**
   * Follows a sent step whose receipt its hold has not verified yet, in the
   * run: `onConfirming(step)` tells the site, the hold is followed until it
   * settles the step, and the run goes on to the next step or resolves.
   * After `timeoutMs` (2 minutes by default) or `signal`, the run throws
   * {@link ReviewedReceiptUnverifiedError} with the step still held, as it
   * does at once without `follow`. Once `signal` aborts after a step was
   * sent, the run sends nothing more: a later step is refused at its last
   * gate as cancelled.
   */
  follow?: {
    onConfirming?: (step: number) => void;
    signal?: AbortSignal;
    timeoutMs?: number;
  };
};

export type ReviewedSendDeps = {
  adapter: WalletAdapter;
  clientFor: (chainId: number) => PublicClient;
  hold: WriteHold;
  onProgress?: (progress: ReviewedProgress) => void;
  /** Self-reviewing adapters only: the model core would have shown. */
  onPreview?: (model: ReviewModel) => void;
  /** Where sequences are journaled: the hold's storage (the browser's, by default). */
  storage?: HeldWriteStorage;
};

export type ReviewedProgress = {
  step: number;
  total: number;
  phase: ReviewedWritePhase | "receipt" | "proposed" | "done";
  hash?: Hex;
};

export type ReviewedResult = (
  | { status: "done"; hashes: Hex[]; receipts: TransactionReceipt[] }
  | { status: "proposed"; step: number; safeTxHash: Hex }
) & {
  /** The action's `signatures`, signed in order, when it had any. */
  signatures?: Hex[];
};

/** The exact bytes a step sends. */
type SentCall = Readonly<{
  chainId: number;
  to: Address;
  data: Hex;
  value: bigint;
  gas?: bigint;
}>;

const CHANGED =
  "Transaction data changed after review. Nothing was sent; review it again.";
const MISMATCHED =
  "This call's data does not match its arguments. Nothing was sent.";
const BAD_GAS = "This call's gas limit is not valid. Nothing was sent.";
const BAD_ADOPT = "This call's adoption rule is not valid. Nothing was sent.";
const ACCOUNT_CHANGED = REVIEWED_ACCOUNT_CHANGED_LINE;
const NOT_SAVED =
  "This action's progress could not be saved. Nothing was sent; review it again.";
export const SAFE_BATCH_UNSUPPORTED_LINE =
  "This Safe connection can't propose these calls as one transaction. Nothing was sent.";
export const SAFE_BATCH_UNFOLLOWABLE_LINE =
  "Your Safe took this batch, but it can't be followed from here. Check your Safe before sending again.";
const SIMULATION_UNAVAILABLE =
  "Simulation unavailable. This could not be checked before you confirm; it is checked again before your wallet opens.";

/**
 * `call` as it encodes now, each field read once, so a getter cannot show one
 * value and send another. Refuses `data` that is not its arguments' encoding.
 */
function exact(call: ReviewedCall): {
  sent: SentCall;
  shown: Pick<
    ReviewedCall,
    | "abi"
    | "functionName"
    | "args"
    | "label"
    | "contractName"
    | "adoptIgnoringArgs"
  >;
} {
  const { chainId, to, data, value, gas, abi, functionName, args } = call;
  const { label, contractName } = call;
  const ignoring = call.adoptIgnoringArgs;
  if (gas !== undefined && (typeof gas !== "bigint" || gas <= 0n)) {
    throw new ReviewLineError(BAD_GAS);
  }
  if (ignoring !== undefined && !Array.isArray(ignoring)) {
    throw new ReviewLineError(BAD_ADOPT);
  }
  const adoptIgnoringArgs = ignoring && Object.freeze([...ignoring]);
  if (
    adoptIgnoringArgs &&
    (!abi ||
      !functionName ||
      new Set(adoptIgnoringArgs).size !== adoptIgnoringArgs.length ||
      adoptIgnoringArgs.some(
        (index) =>
          !Number.isInteger(index) || index < 0 || index >= (args?.length ?? 0),
      ))
  ) {
    throw new ReviewLineError(BAD_ADOPT);
  }
  if (abi && functionName) {
    const encoded = encodeFunctionData({
      abi,
      functionName,
      args: args ?? [],
    } as Parameters<typeof encodeFunctionData>[0]);
    if (encoded.toLowerCase() !== data.toLowerCase()) {
      throw new ReviewLineError(MISMATCHED);
    }
  }
  return {
    sent: Object.freeze({
      chainId,
      to,
      data,
      value: value ?? 0n,
      ...(gas === undefined ? {} : { gas }),
    }),
    shown: {
      abi,
      functionName,
      args,
      label,
      contractName,
      ...(adoptIgnoringArgs ? { adoptIgnoringArgs } : {}),
    },
  };
}

/** What a Safe app may adopt a queued proposal by, as reviewed. */
function adopting({
  abi,
  adoptIgnoringArgs,
}: ReturnType<typeof exact>["shown"]) {
  return abi && adoptIgnoringArgs
    ? { abi, ignoring: adoptIgnoringArgs }
    : undefined;
}

function sameCall(a: SentCall, b: SentCall): boolean {
  return (
    a.chainId === b.chainId &&
    a.to.toLowerCase() === b.to.toLowerCase() &&
    a.data.toLowerCase() === b.data.toLowerCase() &&
    a.value === b.value &&
    a.gas === b.gas
  );
}

/** The chain's name in a line the person reads, never only its id when core knows it. */
function chainNameOf(client: PublicClient, chainId: number): string {
  return (
    client.chain?.name ??
    JB_CHAINS[chainId as keyof typeof JB_CHAINS]?.name ??
    `chain ${chainId}`
  );
}

/** A call as the review shows it, from `from` (none: Relayr's own account runs it). */
function shownCall(
  { sent: { gas, ...sent }, shown }: ReturnType<typeof exact>,
  from: Address | undefined,
  safe: boolean,
): TransactionReviewCall {
  return {
    ...sent,
    ...(from ? { from } : {}),
    // A Safe app signs safeTxGas 0, never the app's gas.
    ...(safe ? { safeTxGas: 0n } : gas === undefined ? {} : { gas }),
    ...(shown.abi ? { abi: shown.abi } : {}),
    ...(shown.functionName ? { functionName: shown.functionName } : {}),
    ...(shown.args ? { args: shown.args } : {}),
    ...(shown.label
      ? { label: shown.label }
      : from
        ? {}
        : { label: "Sent by Relayr" }),
    ...(shown.contractName ? { contractName: shown.contractName } : {}),
    ...(shown.adoptIgnoringArgs
      ? { adoptIgnoringArgs: shown.adoptIgnoringArgs }
      : {}),
  };
}

function labelOf(call: ReviewedCall, index: number): string {
  return call.label ?? call.functionName ?? `Step ${index + 1}`;
}

/**
 * The latest block, or `minimum` while the node has not reached it: never
 * state from before a prerequisite took effect, never stale state after it.
 */
async function notBefore(
  client: PublicClient,
  minimum: bigint,
): Promise<bigint> {
  const head = await client.getBlockNumber();
  return head > minimum ? head : minimum;
}

/**
 * The review-time simulation of every call, per chain: a sequence through
 * {@link simulateCallSequence}, a lone call through
 * {@link simulateStateChangingTransaction}. A lone call that needs a step on
 * another chain is left to the simulation before its send. It never rejects:
 * a revert is `failed`, anything else `unavailable`.
 */
async function reviewSimulation(
  fromOf: (index: number) => Address,
  calls: readonly ReviewedCall[],
  sent: readonly SentCall[],
  blocks: readonly (bigint | undefined)[],
  clientFor: (chainId: number) => PublicClient,
  /** Steps whose value someone else pays: the sender's balance is topped up by it. */
  funded?: (index: number) => boolean,
): Promise<ReviewSimulation> {
  const chains = [...new Set(sent.map((call) => call.chainId))];
  const perChain = chains.map(async (chainId): Promise<ReviewSimulation> => {
    const steps = sent.flatMap((call, index) =>
      call.chainId === chainId ? [index] : [],
    );
    const paid = steps.reduce(
      (sum, index) => sum + (funded?.(index) ? (sent[index].value ?? 0n) : 0n),
      0n,
    );
    let chainName = `chain ${chainId}`;
    try {
      const client = clientFor(chainId);
      chainName = chainNameOf(client, chainId);
      const from = fromOf(steps[0]);
      const balance = paid
        ? { balance: (await client.getBalance({ address: from })) + paid }
        : {};
      if (steps.length > 1) {
        // A sequence runs from one sender; mixed senders are checked before each send.
        if (steps.some((index) => fromOf(index) !== from))
          return { status: "unavailable", message: SIMULATION_UNAVAILABLE };
        await simulateCallSequence(client, {
          from,
          chainName,
          calls: steps.map((index) => ({
            to: sent[index].to,
            data: sent[index].data,
            value: sent[index].value,
            gas: sent[index].gas,
            label: labelOf(calls[index], index),
            dependsOnPrior: calls[index].dependsOnPrior,
            funded: funded?.(index) === true,
          })),
          ...balance,
        });
      } else if (!(calls[steps[0]].dependsOnPrior && steps[0] > 0)) {
        const minimum = blocks[steps[0]];
        await simulateStateChangingTransaction(client, {
          from,
          to: sent[steps[0]].to,
          data: sent[steps[0]].data,
          value: sent[steps[0]].value,
          gas: sent[steps[0]].gas,
          ...balance,
          ...(minimum === undefined
            ? {}
            : { blockNumber: await notBefore(client, minimum) }),
        });
      }
      return { status: "passed" };
    } catch (error) {
      if (!isRevert(error))
        return { status: "unavailable", message: SIMULATION_UNAVAILABLE };
      const reason = revertReason(error);
      // A sequence's failure is the SDK's line naming its call.
      const failure =
        error instanceof ReviewLineError
          ? error
          : simulationFailure(
              `${labelOf(calls[steps[0]], steps[0])} cannot run on ${chainName}: ${reason ?? REVERT_UNKNOWN_LINE}`,
              error,
            );
      return failedSimulation(
        {
          status: "failed",
          message: failure.message,
          explained: reason !== null,
        },
        failure,
      );
    }
  });
  // A revert on one chain is reported at once, whatever the others still wait on.
  const failed = new Promise<ReviewSimulation>((resolve) => {
    for (const result of perChain) {
      void result.then((settled) => {
        if (settled.status === "failed") resolve(settled);
      });
    }
  });
  const all = Promise.all(perChain).then(
    (results) =>
      results.find((result) => result.status === "unavailable") ?? {
        status: "passed" as const,
      },
  );
  return Promise.race([failed, all]);
}

function simulationWarning(
  simulation: ReviewSimulation,
): ReviewWarning | undefined {
  if (simulation.status === "failed") {
    return { code: "simulation-failed", text: simulation.message };
  }
  if (simulation.status === "unavailable") {
    return { code: "simulation-unavailable", text: SIMULATION_UNAVAILABLE };
  }
  return undefined;
}

/** One prompt over `model`, with the review-time simulation of `run` as its warning. */
async function promptSimulated(
  model: ReviewModel,
  fromOf: (index: number) => Address,
  calls: readonly ReviewedCall[],
  run: readonly SentCall[],
  blocks: readonly (bigint | undefined)[],
  clientFor: (chainId: number) => PublicClient,
  signal: AbortSignal | undefined,
  funded?: (index: number) => boolean,
): Promise<void> {
  const simulation = reviewSimulation(
    fromOf,
    calls,
    run,
    blocks,
    clientFor,
    funded,
  );
  const enriched = Promise.all([
    enrichReviewModel(model, clientFor).catch(() => model),
    simulation,
  ]).then(([read, simulated]) => {
    const warning = simulationWarning(simulated);
    return warning ? { ...read, warnings: [...read.warnings, warning] } : read;
  });
  await promptReview(model, simulation, enriched, signal);
}

/** What {@link reviewPlan} reviews: calls from `account`, or from their own `from`. */
export type ReviewedPlanAction = Pick<
  ReviewedAction,
  "account" | "title" | "description" | "confirmLabel" | "context" | "signal"
> & {
  calls: readonly (ReviewedCall & {
    /** Who sends the call: a Safe `account` owns, say, or "relayr" for one Relayr's own account runs. */
    from?: Address | "relayr";
    /**
     * The Relayr round this call goes in, by the app's key: a quote paid by
     * `payRelayrReviewed` with this `relayrRound`. The review shows each round's fee bound (Relayr's
     * stand-in quote plus `RELAYR_FEE_MARGIN_BPS`, paid on the round's
     * payment chain); a round whose quote is within it pays with no prompt.
     */
    relayrRound?: string;
  })[];
  /** Each Relayr round's payment chain, by its key: by default, the round's first call's chain. */
  relayrRounds?: Readonly<Record<string, { paymentChainId: number }>>;
};

/**
 * One review of calls an app then sends one by one, across chains and
 * paths: core's prompt over exactly `action.calls`, simulated as their
 * senders, and nothing else. The plan it returns lets {@link sendReviewed},
 * `signReviewed`, `proposeReviewedSafeTransaction` and `payRelayrReviewed`
 * skip their prompt for a call identical to one of its
 * calls (account, chain, sender, target, data, value and gas: a call's
 * exact gas limit, or a forward request's signed gas, is set before the
 * review), each spent once, for {@link REVIEWED_PLAN_TTL_MS} after confirm.
 * Anything else is refused.
 */
export async function reviewPlan(
  action: ReviewedPlanAction,
  deps: Pick<ReviewedSendDeps, "clientFor">,
): Promise<ReviewedPlan> {
  const { account } = action;
  const calls = [...action.calls];
  if (!calls.length)
    throw new ReviewLineError("There is no transaction to review.");
  const froms = calls.map(({ from }) => from ?? account);
  const snapshots = calls.map(exact);
  const roundOf = calls.map(({ relayrRound }) => relayrRound);
  const fees = new Map<string, PlannedRelayrFee>();
  for (const round of new Set(roundOf)) {
    if (round === undefined) continue;
    const members = snapshots.flatMap(({ sent }, index) =>
      roundOf[index] === round
        ? [{ ...sent, raw: froms[index] === "relayr" }]
        : [],
    );
    if (members.some(({ raw, gas }) => !raw && gas === undefined))
      throw new ReviewLineError(
        "A relayed call needs the gas limit its request signs.",
      );
    const chainId =
      action.relayrRounds?.[round]?.paymentChainId ?? members[0].chainId;
    if (
      !relayrPaymentChains(members.map((member) => member.chainId)).includes(
        chainId,
      )
    )
      throw new ReviewLineError(
        "Choose a Relayr funding chain in the same network family as these destinations.",
      );
    fees.set(round, {
      chainId,
      cap: await relayrFeeCap(
        members.map(({ chainId, to, data, value, gas, raw }) => ({
          chainId,
          target: to,
          data,
          value,
          gas: gas ?? 0n,
          raw,
        })),
        account,
        chainId,
        deps.clientFor,
      ),
    });
  }
  const feeRows = [...fees.values()].map(({ chainId, cap }, index) => ({
    label: fees.size > 1 ? `Network fee ${index + 1}` : "Network fee",
    value: `Up to ${formatEther(cap)} ETH on ${chainNameOf(deps.clientFor(chainId), chainId)}`,
    strong: true,
  }));
  const context = [...(action.context ?? []), ...feeRows];
  const model = buildReviewModel({
    calls: snapshots.map((snapshot, index) =>
      shownCall(
        snapshot,
        froms[index] === "relayr" ? undefined : (froms[index] as Address),
        false,
      ),
    ),
    ...(action.title ? { title: action.title } : {}),
    ...(action.description ? { description: action.description } : {}),
    ...(action.confirmLabel ? { confirmLabel: action.confirmLabel } : {}),
    ...(context.length ? { context } : {}),
  });
  const relayr = relayrStandInSender();
  await promptSimulated(
    model,
    (index) => (froms[index] === "relayr" ? relayr : (froms[index] as Address)),
    calls,
    snapshots.map(({ sent }) => sent),
    calls.map((call) => call.simulationBlockNumber),
    deps.clientFor,
    action.signal,
    // Relayr pays a relayed call's value: its signer needs none of its own.
    (index) => roundOf[index] !== undefined && froms[index] !== "relayr",
  );
  return mintPlan(
    account,
    snapshots.map(({ sent: { chainId, to, data, value, gas } }, index) => ({
      chainId,
      from: froms[index],
      to,
      data,
      value,
      // Relayr's own call: its gas bounds only the fee.
      ...(gas === undefined || froms[index] === "relayr" ? {} : { gas }),
      ...(roundOf[index] === undefined ? {} : { relayrRound: roundOf[index] }),
    })),
    fees,
  );
}

/**
 * Sends one reviewed action: one call, or a sequence (approve then pay, say),
 * reviewed once and sent without asking again.
 *
 * Core builds one model over every call and asks the registered review
 * handler once ({@link registerReviewHandler}); nothing is sent unless the
 * handler returns the confirmation core minted for that model. The
 * review-time simulation runs while the review is open, and confirm never
 * waits on it. Then, for each call in order: `reverify`, a check that the call
 * still encodes to exactly the reviewed bytes, a simulation (at the previous
 * step's receipt block when `dependsOnPrior`), and the send of those bytes
 * through the adapter under the call's write hold, by
 * `submitReviewedContractWrite`. The connected account must stay
 * `action.account`, and the wallet on the call's chain. Each step waits for
 * its receipt; a revert stops the sequence. A Safe-connected wallet's first
 * step becomes a proposal, and the sequence stops there.
 *
 * The action's `signatures` show in the same model and prompt, and are
 * signed after confirm and before the first send, as `signReviewed` signs.
 *
 * Only an explicit wallet rejection (EIP-1193 4001) releases a step's hold;
 * any other failure once the wallet opened keeps it held.
 *
 * A self-reviewing adapter (Signa) is never prompted: `onPreview` gets the
 * model, and the adapter gets the raw calls to review on its own page. An
 * action with `signatures` is refused for it with EIP-1193 4200.
 */
export async function sendReviewed(
  action: ReviewedAction,
  deps: ReviewedSendDeps,
): Promise<ReviewedResult> {
  action.guard?.();
  await walletReady(deps.adapter);
  return send(action, deps);
}

/**
 * Finish a sequence {@link sendReviewed} saved under `record.scope`: the step
 * whose wallet call opened is decided by its write hold first (still held is
 * refused; a settled success counts as completed, its receipt's hash
 * recorded), then every remaining step, and only those, is reviewed once
 * more as one fresh model and sent as `sendReviewed` sends. `reverify` gets
 * each step's original index in the action. Only `record.account` can resume
 * it. The result's `hashes` are every completed step's, `receipts` this
 * run's.
 */
export async function resumeReviewed(
  record: ReviewedSequenceRecord,
  action: Pick<
    ReviewedAction,
    | "reverify"
    | "assertWriteState"
    | "guard"
    | "context"
    | "title"
    | "beforeWallet"
    | "onUnsent"
    | "onSubmitted"
    | "onConfirmed"
    | "signal"
    | "follow"
  >,
  deps: ReviewedSendDeps,
): Promise<ReviewedResult> {
  action.guard?.();
  await walletReady(deps.adapter);
  const storage = deps.storage ?? createHeldWriteStorage();
  const { raw, record: saved } = readReviewedSequence(
    record.scope,
    record.account,
    storage,
  );
  if (!saved || saved.id !== record.id)
    throw new ReviewLineError(REVIEWED_SEQUENCE_MOVED_LINE);
  let expected = raw;
  const connected = deps.adapter.account();
  if (!connected) throw new ReviewLineError("Connect a wallet first.");
  if (connected.toLowerCase() !== saved.account.toLowerCase())
    throw new ReviewLineError(ACCOUNT_CHANGED);
  if (saved.sending) {
    const { step, reservation } = saved.sending;
    const call = saved.calls[step];
    const handle = openStepHold(
      deps.hold,
      saved.account,
      deps.adapter.isSafe(),
      call,
    );
    const state = await handle.state(deps.clientFor(call.chainId));
    if (state.status !== "clear") throw new WriteHeldError(state);
    // Only the step's own reservation's outcome decides it: a later one of
    // the same call or intent hides it.
    if (state.reservation !== reservation)
      throw new ReviewLineError(REVIEWED_SEQUENCE_UNCERTAIN_LINE);
    // Clear with no settlement: a settlement that could not be saved, which
    // may have run, unless the user released it by its exit ("I checked my
    // wallet") or nothing was sent: then the step is reviewed and sent again.
    if (!state.settled && !handle.released(reservation))
      throw new ReviewLineError(REVIEWED_SEQUENCE_UNCERTAIN_LINE);
    const { settled } = state;
    // Read before anything advances: a failed read leaves the step to resume again.
    const receipt = await confirmedReceipt(
      action,
      settled,
      deps.clientFor(call.chainId),
    );
    // This sequence's own step: it is recorded, never offered again.
    if (settled?.result === "success") await handle.acknowledge(settled);
    const kept = await recordSending(saved, settled, storage, expected);
    const told = () => tellConfirmed(action, call, step, receipt);
    if (kept === null) {
      await told();
      const total = saved.calls.length;
      deps.onProgress?.({ step: total - 1, total, phase: "done" });
      return { status: "done", hashes: saved.completed, receipts: [] };
    }
    expected = kept;
    await told();
  }
  return send(
    {
      ...action,
      account: saved.account,
      calls: saved.calls.slice(saved.completed.length),
      scope: saved.scope,
    },
    deps,
    { record: saved, storage, raw: expected },
  );
}

/**
 * Ends `saved`'s step in flight as its hold settled it: a success is
 * recorded as completed. Removes a finished sequence (null) or saves it over
 * `expected`, returning the value written.
 */
async function recordSending(
  saved: ReviewedSequenceRecord,
  settled: WriteHoldSettled | undefined,
  storage: HeldWriteStorage,
  expected: string | null,
): Promise<string | null> {
  delete saved.sending;
  delete saved.proposed;
  if (settled?.result === "success") saved.completed.push(settled.hash);
  if (saved.completed.length < saved.calls.length)
    return saveReviewedSequence(saved, storage, expected);
  await removeReviewedSequence(saved, storage, expected);
  return null;
}

/**
 * The receipt `onConfirmed` gets for a step its hold settled a success: the
 * hold's ({@link heldReceipt}). Null when there is nothing to tell. A failed
 * read throws.
 */
async function confirmedReceipt(
  action: Pick<ReviewedAction, "onConfirmed">,
  settled: WriteHoldSettled | undefined,
  client: PublicClient,
  given?: TransactionReceipt | null,
): Promise<TransactionReceipt | null> {
  if (settled?.result !== "success" || !action.onConfirmed) return null;
  return heldReceipt(settled, client, given);
}

/** Tells the site of a step its hold settled after the send returned. */
async function tellConfirmed(
  action: Pick<ReviewedAction, "onConfirmed">,
  call: ReviewedCall,
  step: number,
  receipt: TransactionReceipt | null,
): Promise<void> {
  if (receipt?.status !== "success") return;
  try {
    await action.onConfirmed?.(call, step, receipt);
  } catch {
    /* The step went through whatever the site's callback does. */
  }
}

/**
 * A sent step's settlement by its own reservation, and the receipt its hold
 * verified ({@link heldReceipt}), read again until it reads. Null on `follow`'s
 * timeout or signal, or when the hold cleared without settling it (its exit).
 */
async function followSent(
  handle: WriteHoldHandle,
  client: PublicClient,
  reserved: string | undefined,
  follow: NonNullable<ReviewedAction["follow"]>,
): Promise<{
  settled: WriteHoldSettled & { hash: Hex };
  receipt: TransactionReceipt;
} | null> {
  const stop = new AbortController();
  const timer = setTimeout(() => stop.abort(), follow.timeoutMs ?? FOLLOW_MS);
  const signal = follow.signal
    ? AbortSignal.any([stop.signal, follow.signal])
    : stop.signal;
  // Every read races the follow's end: a read that answers after it is ignored.
  const ended = new Promise<null>((resolve) => {
    signal.addEventListener("abort", () => resolve(null), { once: true });
  });
  const read = <T>(work: Promise<T>) => Promise.race([work, ended]);
  try {
    while (!signal.aborted) {
      const state = await read(
        followHeldWrite(handle, client as never, { signal }),
      );
      if (signal.aborted) return null;
      if (
        state?.status !== "clear" ||
        state.reservation !== reserved ||
        !state.settled ||
        !("hash" in state.settled)
      )
        return null;
      const { settled } = state;
      try {
        const receipt = await read(heldReceipt(settled, client));
        return signal.aborted || !receipt ? null : { settled, receipt };
      } catch {
        await pause(RECEIPT_RETRY_MS, signal, () => null).catch(() => null);
      }
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Completes the step a run left at its receipt
 * ({@link ReviewedReceiptUnverifiedError}) once its hold settled that send,
 * as the run itself would have: the saved sequence under `scope` records it,
 * a success is acknowledged and told to `onConfirmed` with `receipt` (the
 * hold view's, say), or the one it reads. Null until then. A failed read
 * throws with nothing advanced: call it again. Call it once per settlement:
 * `onConfirmed` is told each time.
 */
export async function completeReviewedStep(
  unverified: ReviewedReceiptUnverifiedError,
  action: Pick<ReviewedAction, "account" | "scope" | "onConfirmed">,
  deps: ReviewedSendDeps,
  receipt?: TransactionReceipt | null,
): Promise<WriteHoldSettled | null> {
  const { step, held } = unverified;
  if (!held) return null;
  const { call, reservation } = held;
  const client = deps.clientFor(call.chainId);
  const handle = openStepHold(deps.hold, action.account, false, call);
  const state = await handle.state(client);
  if (
    state.status !== "clear" ||
    state.reservation !== reservation ||
    !state.settled
  )
    return null;
  const { settled } = state;
  const confirmed = await confirmedReceipt(action, settled, client, receipt);
  if (action.scope !== undefined) {
    const storage = deps.storage ?? createHeldWriteStorage();
    const { raw, record } = readReviewedSequence(
      action.scope,
      action.account,
      storage,
    );
    if (
      record?.sending?.step === step &&
      record.sending.reservation === reservation
    )
      await recordSending(record, settled, storage, raw);
  }
  if (settled.result === "success") await handle.acknowledge(settled);
  await tellConfirmed(action, call, step, confirmed);
  return settled;
}

/**
 * The hash a wallet returned, even when the site's record of it failed
 * afterwards: the step was sent.
 */
function sentHash(error: unknown): Hex {
  if (error instanceof SubmittedContractWriteError) return error.hash as Hex;
  throw error;
}

async function send(
  action: ReviewedAction,
  deps: ReviewedSendDeps,
  resuming?: {
    record: ReviewedSequenceRecord;
    storage: HeldWriteStorage;
    /** The value saved at its key, as this run last read or wrote it. */
    raw: string | null;
  },
): Promise<ReviewedResult> {
  const { adapter, clientFor, hold } = deps;
  /** The site's view of the run: a view that throws never changes what was sent. */
  const onProgress = (progress: ReviewedProgress) => {
    try {
      deps.onProgress?.(progress);
    } catch {
      /* What was sent stands, whatever the view does. */
    }
  };
  action.guard?.();
  const { account } = action;
  const calls = [...action.calls];
  if (!calls.length)
    throw new ReviewLineError("There is no transaction to review.");
  const snapshots = calls.map(exact);
  const sent = snapshots.map(({ sent }) => sent);
  /** Each step's simulation block, read once; a resumed run's prerequisites are long confirmed. */
  const blocks = calls.map((call) =>
    resuming ? undefined : call.simulationBlockNumber,
  );
  /** A site's release callback never stops core's own release. */
  const tellUnsent = async (call: ReviewedCall, step: number) => {
    try {
      await action.onUnsent?.(call, step);
    } catch {
      /* The step is released whatever the site's callback does. */
    }
  };
  const connected = adapter.account();
  if (!connected) throw new ReviewLineError("Connect a wallet first.");
  if (connected.toLowerCase() !== account.toLowerCase()) {
    throw new ReviewLineError(ACCOUNT_CHANGED);
  }
  // A resumed sequence signs none: its signatures went with its first run.
  const prepared = (resuming ? [] : [...(action.signatures ?? [])]).map(
    (signature) => prepareSignature(signature, account),
  );
  // Signa has no reviewed-signature path yet.
  if (prepared.length && adapter.kind === "self-reviewing") {
    throw unsupportedWalletRequest();
  }

  const request = (safe: boolean): TransactionReviewRequest => ({
    calls: snapshots.map((snapshot) => shownCall(snapshot, account, safe)),
    ...(prepared.length
      ? { signatures: prepared.map(({ review }) => review) }
      : {}),
    ...(action.title ? { title: action.title } : {}),
    ...(action.description ? { description: action.description } : {}),
    ...(action.confirmLabel ? { confirmLabel: action.confirmLabel } : {}),
    ...(action.context ? { context: action.context } : {}),
  });

  if (adapter.kind === "self-reviewing") {
    if (!adapter.submitToReviewer) {
      throw new ReviewLineError("This wallet cannot review this transaction.");
    }
    deps.onPreview?.(buildReviewModel(request(false)));
    /** The steps whose beforeWrite began, and whether the wallet was handed the calls. */
    let began = 0;
    let submitting = false;
    let hash: Hex;
    try {
      for (const [step, call] of calls.entries()) {
        began += 1;
        await action.beforeWallet?.(call, step);
      }
      // The site's hooks may have awaited: the gates once more, right before the wallet.
      action.guard?.();
      action.assertWriteState?.();
      if (adapter.account()?.toLowerCase() !== account.toLowerCase())
        throw new ReviewLineError(ACCOUNT_CHANGED);
      submitting = true;
      hash = await adapter.submitToReviewer({
        account,
        calls: sent.map((call) => ({ ...call })),
      });
    } catch (error) {
      // Only the site's own refusal or an explicit rejection proves nothing was sent.
      if (!submitting || isDefiniteWalletRejection(error))
        for (const [step, call] of calls.slice(0, began).entries())
          await tellUnsent(call, step);
      throw error;
    }
    // Every step is told; a site's failure to record it never changes what was sent.
    for (const [step, call] of calls.entries())
      try {
        await action.onSubmitted?.(call, step, hash, {
          safe: false,
          adopted: false,
        });
      } catch {
        /* Sent, whatever the site's record of it did. */
      }
    return { status: "done", hashes: [hash], receipts: [] };
  }

  const { scope } = action;
  const storage =
    scope === undefined
      ? undefined
      : (resuming?.storage ?? deps.storage ?? createHeldWriteStorage());
  /** The journal's saved value as this run last read or wrote it. */
  let expected = resuming?.raw ?? null;
  if (storage && !resuming) {
    const saved = readReviewedSequence(scope!, account, storage);
    // A fresh run refuses while an earlier run of the same action is unfinished.
    if (saved.record)
      throw new ReviewLineError(REVIEWED_SEQUENCE_UNFINISHED_LINE);
    assertSavableCalls(calls);
    expected = saved.raw;
  }
  /** Where the remaining steps start in the whole action. */
  const offset = resuming?.record.completed.length ?? 0;

  const safe = adapter.isSafe();
  /** Through a Safe app, the one MultiSend call every step goes as. */
  const batched =
    // A resumed sequence is journaled step by step: never folded into one proposal.
    action.batch && safe && calls.length > 1 && !resuming
      ? safeBatchCall(
          account,
          calls.map((call, step) => ({ ...call, ...sent[step] })),
        )
      : undefined;
  if (
    batched &&
    (!adapter.sendCalls ||
      sent.some((call) => call.chainId !== batched.chainId))
  )
    throw new ReviewLineError(SAFE_BATCH_UNSUPPORTED_LINE);
  const handles = (batched ? [batched] : calls).map((call, step) =>
    openStepHold(hold, account, safe, {
      intent: call.intent,
      legacy: call.legacy,
      ...(batched ?? sent[step]),
    }),
  );
  // A step its hold already holds is refused before the review opens.
  for (const handle of handles) {
    const state = handle.peek();
    if (state.status !== "clear") throw new WriteHeldError(state);
  }
  // So is one whose last success nothing showed: a resend may pay twice.
  const away = handles[handles.length - 1].unacknowledgedSuccess();
  if (away) throw new WriteHoldUnacknowledgedSuccessError(away);
  /**
   * Each step's latest reservation as the review opened. Another prompt of
   * the same action that reserved meanwhile, whether or not it has settled,
   * makes this review stale.
   */
  const generation = (handle: (typeof handles)[number]) =>
    handle.peek().reservation ?? null;
  const reviewedGenerations = handles.map(generation);
  const model = buildReviewModel(request(safe));
  /** What each step runs as: a Safe app's call is proposed with safeTxGas 0, not the app's gas. */
  const run: readonly SentCall[] = safe
    ? sent.map(({ gas: _gas, ...call }) => call)
    : sent;
  if (action.plan) {
    // A plan binds bytes, never an adoption rule; a Safe app's unbatched
    // sequence stops at its first proposal, so its other calls would be spent unsent.
    if (
      snapshots.some(({ shown }) => shown.adoptIgnoringArgs) ||
      (safe && !batched && calls.length > 1)
    )
      throw new ReviewLineError(REVIEWED_PLAN_REFUSED_LINE);
    spendPlan(action.plan, account, [
      ...sent.map(({ chainId, to, data, value, gas }) => ({
        chainId,
        from: account,
        to,
        data,
        value,
        ...(gas === undefined ? {} : { gas }),
      })),
      ...prepared.flatMap(plannedCallsOf),
    ]);
  } else
    await promptSimulated(
      model,
      () => account,
      calls,
      run,
      blocks,
      clientFor,
      action.signal,
    );
  let signed: { signatures?: Hex[] } = {};
  if (prepared.length) {
    // The action's own gates, last before the wallet opens for each signature.
    const stillReviewed = () => {
      action.guard?.();
      action.assertWriteState?.();
      calls.forEach((call, step) => {
        let now: SentCall;
        try {
          now = exact(call).sent;
        } catch {
          throw new ReviewLineError(CHANGED);
        }
        if (!sameCall(now, sent[step])) throw new ReviewLineError(CHANGED);
      });
      handles.forEach((handle, step) => {
        if (generation(handle) !== reviewedGenerations[step]) {
          throw new WriteHoldStaleReviewError();
        }
      });
    };
    signed = {
      signatures: await signPrepared(prepared, account, adapter, stillReviewed),
    };
  }

  if (batched) {
    const client = clientFor(batched.chainId);
    const unchanged = () =>
      calls.forEach((call, step) => {
        let now: SentCall;
        try {
          now = exact(call).sent;
        } catch {
          throw new ReviewLineError(CHANGED);
        }
        if (!sameCall(now, sent[step])) throw new ReviewLineError(CHANGED);
      });
    const progress = (phase: ReviewedProgress["phase"], hash?: Hex) =>
      onProgress?.({
        step: 0,
        total: calls.length,
        phase,
        ...(hash ? { hash } : {}),
      });
    /** The steps whose `beforeWallet` began. */
    let began = 0;
    const hash = await handles[0]
      .send<Hex>(client, (gate) => {
        if (generation(handles[0]) !== reviewedGenerations[0]) {
          throw new WriteHoldStaleReviewError();
        }
        const released = async () => {
          gate.onRejected();
          for (const [step, call] of calls.slice(0, began).entries())
            await tellUnsent(call, step);
        };
        return submitReviewedContractWrite({
          request: batched,
          expectedAccount: account,
          review: () => Promise.resolve(),
          switchChain: async (chainId) => {
            if (adapter.chainId() !== chainId)
              await adapter.switchChain(chainId);
          },
          currentAccount: () => adapter.account(),
          reverify: async () => {
            for (const [step, call] of calls.entries())
              await action.reverify?.(call, step, undefined);
            unchanged();
          },
          simulate: async (sending) => {
            await simulateCallSequence(client, {
              from: account,
              chainName: chainNameOf(client, batched.chainId),
              calls: run.map((call, step) => ({
                ...call,
                label: labelOf(calls[step], step),
                dependsOnPrior: calls[step].dependsOnPrior,
              })),
            });
            return sending;
          },
          beforeWrite: async () => {
            await gate.beforeSend();
            try {
              for (const [step, call] of calls.entries()) {
                began = step + 1;
                await action.beforeWallet?.(call, step);
              }
            } catch (error) {
              await released();
              throw error;
            }
          },
          beforeSend: () => {
            action.assertWriteState?.();
            unchanged();
            if (!adapter.isSafe())
              throw new ReviewLineError(
                "Wallet connection changed. Review the transaction again.",
              );
            if (adapter.chainId() !== batched.chainId)
              throw new ReviewLineError(
                "Your wallet changed networks. Review the transaction again.",
              );
            if (adapter.account()?.toLowerCase() !== account.toLowerCase())
              throw new ReviewLineError(ACCOUNT_CHANGED);
          },
          onBeforeWriteAborted: released,
          onWriteRejected: released,
          onWriteSubmitted: async (submitted) => {
            gate.afterSubmit(submitted);
            // Every step went: each is told, whatever an earlier callback does.
            const failures: unknown[] = [];
            for (const [step, call] of calls.entries())
              try {
                await action.onSubmitted?.(call, step, submitted, {
                  safe: true,
                  adopted: false,
                });
              } catch (error) {
                failures.push(error);
              }
            if (failures.length) throw failures[0];
          },
          write: async () => {
            const id = await adapter.sendCalls!(
              batched.chainId,
              sent.map(({ to, data, value }) => ({ to, data, value })),
            );
            // A Safe app answers with the proposal's safeTxHash; anything else can't be followed.
            if (typeof id !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(id))
              throw new ReviewLineError(SAFE_BATCH_UNFOLLOWABLE_LINE);
            return id as Hex;
          },
          onPhase: (phase) => progress(phase),
          guard: action.guard,
        });
      })
      .catch(sentHash);
    progress("proposed", hash);
    return { status: "proposed", step: 0, safeTxHash: hash, ...signed };
  }

  // Saved before the first wallet call, once the review is confirmed.
  let journal: ReviewedSequenceRecord | undefined;
  if (storage) {
    if (resuming) journal = { ...resuming.record, modelId: model.id };
    else
      journal = {
        version: 1,
        id: globalThis.crypto.randomUUID(),
        account,
        scope: scope!,
        modelId: model.id,
        // What was reviewed, read once above.
        calls: calls.map((call, step) => ({
          ...call,
          ...snapshots[step].shown,
          ...snapshots[step].sent,
        })),
        completed: [],
      };
    // Refused when another window changed it meanwhile.
    expected = await saveReviewedSequence(journal, storage, expected);
  }
  /**
   * Progress after a send is saved as it can be: the step's saved
   * `sending` mark already lets its hold decide it on resume.
   */
  const keep = async () => {
    try {
      if (journal!.completed.length === journal!.calls.length)
        await removeReviewedSequence(journal!, storage!, expected);
      else expected = await saveReviewedSequence(journal!, storage!, expected);
    } catch {
      /* Another window owns the sequence now; the hold still holds the step. */
    }
  };

  const hashes: Hex[] = [];
  const receipts: TransactionReceipt[] = [];
  const total = offset + calls.length;
  for (const [step, call] of calls.entries()) {
    const reviewed = sent[step];
    /** This step's index in the whole action. */
    const at = offset + step;
    const progress = (phase: ReviewedProgress["phase"], hash?: Hex) =>
      onProgress?.({ step: at, total, phase, ...(hash ? { hash } : {}) });
    const unchanged = () => {
      let now: ReturnType<typeof exact>;
      try {
        now = exact(call);
      } catch {
        throw new ReviewLineError(CHANGED);
      }
      if (
        !sameCall(now.sent, reviewed) ||
        String(now.shown.adoptIgnoringArgs) !==
          String(snapshots[step].shown.adoptIgnoringArgs)
      )
        throw new ReviewLineError(CHANGED);
    };
    const client = clientFor(reviewed.chainId);
    const prior = receipts[step - 1];
    /** Where the step before this one confirmed: this run's receipt, or a resumed run's last completed step. */
    const confirmedBefore = async (): Promise<
      ReviewedPriorBlock | undefined
    > => {
      if (prior)
        return {
          chainId: sent[step - 1].chainId,
          blockNumber: prior.blockNumber,
          blockHash: prior.blockHash,
        };
      const done = resuming?.record;
      if (step > 0 || !done?.completed.length) return undefined;
      const { chainId } = done.calls[done.completed.length - 1];
      // One read: a receipt that can't be read now (a repriced original) is no block.
      const receipt = await clientFor(chainId)
        .getTransactionReceipt({
          hash: done.completed[done.completed.length - 1],
        })
        .catch(() => undefined);
      return receipt
        ? {
            chainId,
            blockNumber: receipt.blockNumber,
            blockHash: receipt.blockHash,
          }
        : undefined;
    };
    const priorBlock =
      call.dependsOnPrior &&
      prior &&
      sent[step - 1].chainId === reviewed.chainId
        ? prior.blockNumber
        : undefined;
    /** The reservation this step's send took. */
    let reserved: string | undefined;
    /** A proposal of exactly this call its Safe already queued, sent in its place. */
    let queued:
      | Awaited<ReturnType<typeof findPendingSafeAppProposal>>
      | undefined;
    /** The caller's end of the run, once this run sent a step. */
    const runEnd = hashes.length ? action.follow?.signal : undefined;
    /** The site's failed record of this step's hash: the step was sent, and is held unverified. */
    let unrecorded: unknown;
    const hash = await handles[step]
      .send<Hex>(client, (gate) => {
        // Under the hold's own check of the call, before anything reserves.
        if (generation(handles[step]) !== reviewedGenerations[step]) {
          throw new WriteHoldStaleReviewError();
        }
        /** Nothing was sent: the hold lets go, and the step is no longer in flight. */
        const released = async () => {
          gate.onRejected();
          if (journal) {
            delete journal.sending;
            await keep();
          }
          await tellUnsent(call, at);
        };
        return submitReviewedContractWrite({
          request: reviewed,
          expectedAccount: account,
          // Confirmed once, above, for every step.
          review: () => Promise.resolve(),
          switchChain: async (chainId) => {
            if (adapter.chainId() !== chainId)
              await adapter.switchChain(chainId);
          },
          currentAccount: () => adapter.account(),
          reverify: async () => {
            if (action.reverify)
              await action.reverify(call, at, await confirmedBefore());
            unchanged();
          },
          simulate: async (sending) => {
            const blockNumber =
              priorBlock ??
              (blocks[step] === undefined
                ? undefined
                : await notBefore(client, blocks[step]));
            const tx = {
              to: sending.to,
              data: sending.data,
              value: sending.value,
              ...(blockNumber === undefined ? {} : { blockNumber }),
            };
            const { gas } = run[step];
            const [, estimate, found] = await Promise.all([
              simulateStateChangingTransaction(client, {
                from: account,
                ...tx,
                gas,
              }).catch((error: unknown) => {
                throw simulationFailure(
                  `${labelOf(call, at)} cannot run on ${chainNameOf(client, sending.chainId)}: ${revertDetail(error)}`,
                  error,
                );
              }),
              // A Safe app signs the sent gas as safeTxGas; 0 makes a failed call revert.
              safe || gas !== undefined
                ? undefined
                : client.estimateGas({ account, ...tx }),
              // A Safe app never proposes again a call its Safe already queued exactly.
              safe && hasSafeService(sending.chainId)
                ? findPendingSafeAppProposal(
                    client,
                    sending.chainId,
                    account,
                    sending,
                    hold.safeService,
                    true,
                    adopting(snapshots[step].shown),
                  )
                : null,
            ]);
            queued = found;
            return {
              ...sending,
              gas: safe ? 0n : (gas ?? gasWithHeadroom(estimate!)),
            };
          },
          beforeWrite: async () => {
            // An adopted proposal is held as the call it runs.
            await gate.beforeSend(queued?.call);
            reserved = handles[step].peek().reservation;
            if (journal)
              try {
                const { reservation } = handles[step].peek();
                if (reservation === undefined)
                  throw new ReviewLineError(NOT_SAVED);
                journal.sending = { step: at, reservation };
                expected = await saveReviewedSequence(
                  journal,
                  storage!,
                  expected,
                );
              } catch (error) {
                // Reserved, and the wallet never opened.
                delete journal.sending;
                gate.onRejected();
                throw error;
              }
            try {
              await action.beforeWallet?.(call, at);
            } catch (error) {
              await released();
              throw error;
            }
          },
          beforeSend: () => {
            // The caller ended the run (a reset, an unmount) after it sent a
            // step: nothing more is sent.
            if (hashes.length && action.follow?.signal?.aborted)
              throw new TransactionReviewCancelledError();
            action.assertWriteState?.();
            unchanged();
            if (adapter.isSafe() !== safe) {
              throw new ReviewLineError(
                "Wallet connection changed. Review the transaction again.",
              );
            }
            if (adapter.chainId() !== reviewed.chainId) {
              throw new ReviewLineError(
                "Your wallet changed networks. Review the transaction again.",
              );
            }
            // Last, after every callback and getter above could have run.
            if (adapter.account()?.toLowerCase() !== account.toLowerCase()) {
              throw new ReviewLineError(ACCOUNT_CHANGED);
            }
          },
          onBeforeWriteAborted: released,
          onWriteRejected: released,
          // An adopted proposal's nonce lets the hold prove its execution onchain.
          onWriteSubmitted: async (submitted) => {
            gate.afterSubmit(submitted, queued?.tx);
            await action.onSubmitted?.(call, at, submitted, {
              safe,
              adopted: !!queued,
            });
          },
          write: async ({ chainId, to, data, value, gas }) =>
            queued?.proposalHash ??
            adapter.sendTransaction({
              chainId,
              to,
              data,
              value,
              gas,
              // After a step was sent, the run's end refuses this one, unsent,
              // as late as the wallet's own last check.
              ...(runEnd ? { signal: runEnd } : {}),
            }),
          onPhase: (phase) => progress(phase),
          guard: action.guard,
        });
      })
      .catch((error: unknown) => {
        // Refused unsent because the caller ended the run: a cancel, not a failure.
        if (runEnd?.aborted && error instanceof WalletNotInvokedError)
          throw new TransactionReviewCancelledError();
        unrecorded = error;
        return sentHash(error);
      });
    hashes.push(hash);
    // A later step held under this step's key (the same call, or the same
    // intent) was reserved by this send, not by another prompt.
    for (const [later, handle] of handles.entries()) {
      const sameKey = call.intent
        ? calls[later].intent === call.intent &&
          sent[later].chainId === reviewed.chainId
        : !calls[later].intent && sameCall(sent[later], reviewed);
      if (later > step && sameKey) {
        reviewedGenerations[later] = generation(handle);
      }
    }
    if (safe) {
      if (journal) {
        journal.proposed = { step: at, safeTxHash: hash };
        await keep();
      }
      progress("proposed", hash);
      return { status: "proposed", step: at, safeTxHash: hash, ...signed };
    }
    // From here the step was sent: it ends done, failed as its hold
    // verified, or unverified with what resumes it, never any other way.
    const unverified = (cause?: unknown) =>
      new ReviewedReceiptUnverifiedError(
        at,
        hash,
        isSafeExecTransaction(reviewed.data)
          ? WRITE_HOLD_SAFE_UNCONFIRMED_LINE
          : undefined,
        {
          call,
          reservation: reserved,
          // This run's sends, its own last: only the steps before it completed.
          hashes: journal ? [...journal.completed] : hashes.slice(0, -1),
          ...signed,
        },
        cause === undefined ? {} : { cause },
      );
    // The site could not record the hash: held as sent, for it to resume.
    if (unrecorded !== undefined) throw unverified(unrecorded);
    // Its hold's verified settlement is the only word on how it ended: its
    // result, its transaction (a speed-up's, when the wallet replaced the
    // send) and that transaction's receipt in the block the hold verified.
    // A watcher's receipt only says when to ask.
    let receipt: TransactionReceipt | undefined;
    let settled: (WriteHoldSettled & { hash: Hex }) | undefined;
    try {
      progress("receipt", hash);
      const seen = await waitForTrackedReceipt(client, hash);
      // Only this send's own reservation's settlement speaks for it: a later
      // send of the same call or intent may have settled since.
      settled = await handles[step]
        .state(client)
        .then((state) =>
          state.status === "clear" &&
          reserved !== undefined &&
          state.reservation === reserved &&
          state.settled &&
          "hash" in state.settled
            ? state.settled
            : undefined,
        )
        .catch(() => undefined);
      receipt = settled
        ? await heldReceipt(settled, client, seen).catch(() => undefined)
        : undefined;
      if (!receipt && action.follow) {
        try {
          action.follow.onConfirming?.(at);
        } catch {
          /* The step is followed whatever the site's view does. */
        }
        const ended = await followSent(
          handles[step],
          client,
          reserved,
          action.follow,
        );
        ({ settled, receipt } = ended ?? { settled, receipt });
      }
    } catch (error) {
      throw unverified(error);
    }
    if (!settled || !receipt) throw unverified();
    if (settled.result === "failed" && receipt.status === "success") {
      // It ran, and the hold proved it failed: a Safe's call that failed.
      if (journal) {
        delete journal.sending;
        await keep();
      }
      throw new ReviewLineError(WRITE_HOLD_CALL_FAILED_LINE);
    }
    if (settled.result === "success" && receipt.status !== "success")
      throw unverified();
    const mined = settled.hash;
    hashes[hashes.length - 1] = mined;
    if (receipt.status !== "success") {
      // It ran and reverted: nothing of it to resume.
      if (journal) {
        delete journal.sending;
        await keep();
      }
      throw new ReviewedCallRevertedError(at, mined, receipt);
    }
    receipts.push(receipt);
    if (journal) {
      delete journal.sending;
      journal.completed.push(mined);
      await keep();
    }
    try {
      await action.onConfirmed?.(call, at, receipt);
    } catch {
      /* The step went through whatever the site's callback does. */
    }
  }
  onProgress?.({ step: total - 1, total, phase: "done" });
  return {
    status: "done",
    hashes: journal ? [...journal.completed] : hashes,
    receipts,
    ...signed,
  };
}
