import {
  encodeFunctionData,
  type Abi,
  type Address,
  type Hex,
  type PublicClient,
  type TransactionReceipt,
} from "viem";
import { promptReview, type ReviewSimulation } from "./confirm.js";
import {
  isDefiniteWalletRejection,
  SubmittedContractWriteError,
  submitReviewedContractWrite,
  type ReviewedWritePhase,
} from "./contractWrite.js";
import { gasWithHeadroom } from "./gas.js";
import {
  findPendingSafeAppProposal,
  hasSafeService,
  isSafeExecTransaction,
} from "../safeService.js";
import {
  WRITE_HOLD_CALL_FAILED_LINE,
  WRITE_HOLD_REVERTED_LINE,
  WRITE_HOLD_SAFE_UNCONFIRMED_LINE,
} from "./messages.js";
import {
  buildReviewModel,
  enrichReviewModel,
  type ReviewContextRow,
  type ReviewModel,
  type ReviewWarning,
} from "./model.js";
import { waitForTrackedReceipt } from "./receipt.js";
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
  prepareSignature,
  signPrepared,
  type ReviewedSignature,
} from "./sign.js";
import {
  revertDetail,
  simulateCallSequence,
  simulateStateChangingTransaction,
} from "./simulation.js";
import type { TransactionReviewRequest } from "./transactionReview.js";
import {
  unsupportedWalletRequest,
  walletReady,
  type WalletAdapter,
} from "./wallet.js";
import {
  WriteHeldError,
  WriteHoldStaleReviewError,
  type WriteHold,
  type WriteHoldLegacySource,
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
   * For a Safe app only: the calldata a proposal its Safe already queued is
   * compared by, so a retry whose only change is a fresh stamp (a deadline)
   * adopts that proposal instead of proposing twice. It must keep every
   * field that decides what runs (recipients, amounts); the target, value
   * and operation must match as they are. Unset compares exact bytes. Never
   * saved: a resumed step compares exact bytes.
   */
  normalizeData?: (data: Hex) => Hex;
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
  /** A stale-state check before each step; it throws to stop with nothing sent. */
  reverify?: (call: ReviewedCall, index: number) => Promise<void>;
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
   * The site's key for this action (`payIntent(...)`, say). When set, the
   * action is journaled once its review is confirmed, before the first
   * wallet call, so {@link resumeReviewed} can finish it without sending a
   * completed step again.
   */
  scope?: string;
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

/**
 * A step's transaction was mined and reverted: nothing of it to resume, and
 * the action can be reviewed again. `receipt` is the mined receipt, so a
 * site can close its own record of the attempt.
 */
export class ReviewedCallRevertedError extends Error {
  readonly name = "ReviewedCallRevertedError";

  constructor(
    /** The step's index in the whole action. */
    readonly step: number,
    readonly hash: Hex,
    readonly receipt: TransactionReceipt,
  ) {
    super(WRITE_HOLD_REVERTED_LINE);
  }
}

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
/** The refusal when the connected account is not the one an action was built for. */
export const REVIEWED_ACCOUNT_CHANGED_LINE =
  "The connected account changed. Review again.";
const ACCOUNT_CHANGED = REVIEWED_ACCOUNT_CHANGED_LINE;
const NOT_SAVED =
  "This action's progress could not be saved. Nothing was sent; review it again.";
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
    "abi" | "functionName" | "args" | "label" | "contractName"
  >;
} {
  const { chainId, to, data, value, gas, abi, functionName, args } = call;
  const { label, contractName } = call;
  if (gas !== undefined && (typeof gas !== "bigint" || gas <= 0n)) {
    throw new Error(BAD_GAS);
  }
  if (abi && functionName) {
    const encoded = encodeFunctionData({
      abi,
      functionName,
      args: args ?? [],
    } as Parameters<typeof encodeFunctionData>[0]);
    if (encoded.toLowerCase() !== data.toLowerCase()) {
      throw new Error(MISMATCHED);
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
    shown: { abi, functionName, args, label, contractName },
  };
}

/** A call as its journal saves it: without its normalizer, a function. */
function unsaved({
  normalizeData: _normalizeData,
  ...call
}: ReviewedCall): ReviewedCall {
  return call;
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

function labelOf(call: ReviewedCall, index: number): string {
  return call.label ?? call.functionName ?? `Step ${index + 1}`;
}

/**
 * Whether a failed simulation is the call reverting, not the node failing:
 * EIP-1474 code 3, viem's contract-revert errors, or the node's own text
 * saying it reverted, in the error's first eight causes. A viem error is read
 * by its `details`, since its `message` quotes the request.
 */
function reverted(error: unknown): boolean {
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
  account: Address,
  calls: readonly ReviewedCall[],
  sent: readonly SentCall[],
  blocks: readonly (bigint | undefined)[],
  clientFor: (chainId: number) => PublicClient,
): Promise<ReviewSimulation> {
  const chains = [...new Set(sent.map((call) => call.chainId))];
  const perChain = chains.map(async (chainId): Promise<ReviewSimulation> => {
    const steps = sent.flatMap((call, index) =>
      call.chainId === chainId ? [index] : [],
    );
    let chainName = `chain ${chainId}`;
    try {
      const client = clientFor(chainId);
      chainName = client.chain?.name ?? chainName;
      if (steps.length > 1) {
        await simulateCallSequence(client, {
          from: account,
          chainName,
          calls: steps.map((index) => ({
            to: sent[index].to,
            data: sent[index].data,
            value: sent[index].value,
            gas: sent[index].gas,
            label: labelOf(calls[index], index),
            dependsOnPrior: calls[index].dependsOnPrior,
          })),
        });
      } else if (!(calls[steps[0]].dependsOnPrior && steps[0] > 0)) {
        const minimum = blocks[steps[0]];
        await simulateStateChangingTransaction(client, {
          from: account,
          to: sent[steps[0]].to,
          data: sent[steps[0]].data,
          value: sent[steps[0]].value,
          gas: sent[steps[0]].gas,
          ...(minimum === undefined
            ? {}
            : { blockNumber: await notBefore(client, minimum) }),
        });
      }
      return { status: "passed" };
    } catch (error) {
      const message =
        steps.length > 1
          ? revertDetail(error)
          : `${labelOf(calls[steps[0]], steps[0])} cannot run on ${chainName}: ${revertDetail(error)}`;
      return reverted(error)
        ? { status: "failed", message }
        : { status: "unavailable", message };
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

/** The write hold one step is sent under: its intent's, or its exact call's. */
export function openStepHold(
  hold: WriteHold,
  account: Address,
  safe: boolean,
  call: Pick<
    ReviewedCall,
    "chainId" | "to" | "data" | "value" | "intent" | "legacy"
  >,
) {
  return hold.open(
    {
      chainId: call.chainId,
      account,
      safe,
      call: { to: call.to, data: call.data, value: call.value ?? 0n },
      ...(call.intent ? { namespace: call.intent } : {}),
    },
    call.legacy ? { legacy: [...call.legacy] } : undefined,
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
    throw new Error(REVIEWED_SEQUENCE_MOVED_LINE);
  let expected = raw;
  const connected = deps.adapter.account();
  if (!connected) throw new Error("Connect a wallet first.");
  if (connected.toLowerCase() !== saved.account.toLowerCase())
    throw new Error(ACCOUNT_CHANGED);
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
      throw new Error(REVIEWED_SEQUENCE_UNCERTAIN_LINE);
    // Clear with no settlement: released by the user's exit, or a
    // settlement that could not be saved. Either may have run.
    if (!state.settled) throw new Error(REVIEWED_SEQUENCE_UNCERTAIN_LINE);
    delete saved.sending;
    delete saved.proposed;
    if (state.settled.result === "success") {
      // This sequence's own step: it is recorded, never offered again.
      await handle.acknowledge(state.settled);
      saved.completed.push(state.settled.hash);
    }
    if (saved.completed.length === saved.calls.length) {
      await removeReviewedSequence(saved, storage, expected);
      return { status: "done", hashes: saved.completed, receipts: [] };
    }
    expected = await saveReviewedSequence(saved, storage, expected);
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
  const { adapter, clientFor, hold, onProgress } = deps;
  action.guard?.();
  const { account } = action;
  const calls = [...action.calls];
  if (!calls.length) throw new Error("There is no transaction to review.");
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
  if (!connected) throw new Error("Connect a wallet first.");
  if (connected.toLowerCase() !== account.toLowerCase()) {
    throw new Error(ACCOUNT_CHANGED);
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
    calls: snapshots.map(({ sent: { gas, ...sent }, shown }) => ({
      ...sent,
      from: account,
      // A Safe app signs safeTxGas 0, never the app's gas.
      ...(safe ? { safeTxGas: 0n } : gas === undefined ? {} : { gas }),
      ...(shown.abi ? { abi: shown.abi } : {}),
      ...(shown.functionName ? { functionName: shown.functionName } : {}),
      ...(shown.args ? { args: shown.args } : {}),
      ...(shown.label ? { label: shown.label } : {}),
      ...(shown.contractName ? { contractName: shown.contractName } : {}),
    })),
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
      throw new Error("This wallet cannot review this transaction.");
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
        throw new Error(ACCOUNT_CHANGED);
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
    // Every step is told; a site's failure to record it never reads as unsent.
    const failures: unknown[] = [];
    for (const [step, call] of calls.entries())
      try {
        await action.onSubmitted?.(call, step, hash, {
          safe: false,
          adopted: false,
        });
      } catch (error) {
        failures.push(error);
      }
    if (failures.length)
      throw new SubmittedContractWriteError(hash, failures[0]);
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
    if (saved.record) throw new Error(REVIEWED_SEQUENCE_UNFINISHED_LINE);
    assertSavableCalls(calls.map(unsaved));
    expected = saved.raw;
  }
  /** Where the remaining steps start in the whole action. */
  const offset = resuming?.record.completed.length ?? 0;

  const safe = adapter.isSafe();
  const handles = calls.map((call, step) =>
    openStepHold(hold, account, safe, {
      intent: call.intent,
      legacy: call.legacy,
      ...sent[step],
    }),
  );
  // A step its hold already holds is refused before the review opens.
  for (const handle of handles) {
    const state = handle.peek();
    if (state.status !== "clear") throw new WriteHeldError(state);
  }
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
  const simulation = reviewSimulation(account, calls, run, blocks, clientFor);
  const enriched = Promise.all([
    enrichReviewModel(model, clientFor).catch(() => model),
    simulation,
  ]).then(([read, simulated]) => {
    const warning = simulationWarning(simulated);
    return warning ? { ...read, warnings: [...read.warnings, warning] } : read;
  });
  await promptReview(model, simulation, enriched);
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
          throw new Error(CHANGED);
        }
        if (!sameCall(now, sent[step])) throw new Error(CHANGED);
        if (generation(handles[step]) !== reviewedGenerations[step]) {
          throw new WriteHoldStaleReviewError();
        }
      });
    };
    signed = {
      signatures: await signPrepared(prepared, account, adapter, stillReviewed),
    };
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
          ...unsaved(call),
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
      let now: SentCall;
      try {
        now = exact(call).sent;
      } catch {
        throw new Error(CHANGED);
      }
      if (!sameCall(now, reviewed)) throw new Error(CHANGED);
    };
    const client = clientFor(reviewed.chainId);
    const prior = receipts[step - 1];
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
    const hash = await handles[step].send<Hex>(client, (gate) => {
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
          if (adapter.chainId() !== chainId) await adapter.switchChain(chainId);
        },
        currentAccount: () => adapter.account(),
        reverify: async () => {
          await action.reverify?.(call, at);
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
                  call.normalizeData,
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
          await gate.beforeSend();
          reserved = handles[step].peek().reservation;
          if (journal)
            try {
              const { reservation } = handles[step].peek();
              if (reservation === undefined) throw new Error(NOT_SAVED);
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
          action.assertWriteState?.();
          unchanged();
          if (adapter.isSafe() !== safe) {
            throw new Error(
              "Wallet connection changed. Review the transaction again.",
            );
          }
          if (adapter.chainId() !== reviewed.chainId) {
            throw new Error(
              "Your wallet changed networks. Review the transaction again.",
            );
          }
          // Last, after every callback and getter above could have run.
          if (adapter.account()?.toLowerCase() !== account.toLowerCase()) {
            throw new Error(ACCOUNT_CHANGED);
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
          adapter.sendTransaction({ chainId, to, data, value, gas }),
        onPhase: (phase) => progress(phase),
        guard: action.guard,
      });
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
    progress("receipt", hash);
    const receipt = await waitForTrackedReceipt(client, hash);
    // The hold checks the receipt itself and settles, so the same call (or
    // intent) can be reviewed and sent again without waiting on a view.
    // Only this send's own reservation's settlement speaks for it: a later
    // send of the same call or intent may have settled since.
    const settled = await handles[step]
      .state(client)
      .then((state) =>
        state.status === "clear" &&
        reserved !== undefined &&
        state.reservation === reserved
          ? state.settled
          : undefined,
      )
      .catch(() => undefined);
    if (receipt.status === "success" && settled?.result === "failed") {
      // It ran, and the hold proved it failed: a Safe's call that failed.
      if (journal) {
        delete journal.sending;
        await keep();
      }
      throw new Error(WRITE_HOLD_CALL_FAILED_LINE);
    }
    // A Safe's execTransaction is done only once its hold proved the Safe's
    // own success; until then the step stays in flight, held and journaled.
    if (
      receipt.status === "success" &&
      isSafeExecTransaction(reviewed.data) &&
      settled?.result !== "success"
    ) {
      throw new Error(WRITE_HOLD_SAFE_UNCONFIRMED_LINE);
    }
    if (receipt.status !== "success") {
      // It ran and reverted: nothing of it to resume.
      if (journal) {
        delete journal.sending;
        await keep();
      }
      throw new ReviewedCallRevertedError(at, hash, receipt);
    }
    receipts.push(receipt);
    if (journal) {
      delete journal.sending;
      journal.completed.push(hash);
      await keep();
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
