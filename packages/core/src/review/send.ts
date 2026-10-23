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
  submitReviewedContractWrite,
  type ReviewedWritePhase,
} from "./contractWrite.js";
import { gasWithHeadroom } from "./gas.js";
import { WRITE_HOLD_REVERTED_LINE } from "./messages.js";
import {
  buildReviewModel,
  enrichReviewModel,
  type ReviewContextRow,
  type ReviewModel,
  type ReviewWarning,
} from "./model.js";
import { waitForTrackedReceipt } from "./receipt.js";
import {
  revertDetail,
  simulateCallSequence,
  simulateStateChangingTransaction,
} from "./simulation.js";
import type { TransactionReviewRequest } from "./transactionReview.js";
import type { WalletAdapter } from "./wallet.js";
import {
  WriteHeldError,
  WriteHoldStaleReviewError,
  type WriteHold,
} from "./writeHold.js";

export type ReviewedCall = {
  chainId: number;
  to: Address;
  data: Hex;
  value?: bigint;
  /** When given, `data` must be exactly this function's encoding of `args`. */
  abi?: Abi;
  functionName?: string;
  args?: readonly unknown[];
  label?: string;
  contractName?: string;
  /** The hold namespace, as `useSafeTx`'s `TxSendOptions` today. */
  intent?: string;
  legacy?: readonly string[];
  /** Simulate on the previous step's receipt block. */
  dependsOnPrior?: boolean;
};

export type ReviewedAction = {
  account: Address;
  calls: readonly ReviewedCall[];
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
};

export type ReviewedSendDeps = {
  adapter: WalletAdapter;
  clientFor: (chainId: number) => PublicClient;
  hold: WriteHold;
  onProgress?: (progress: ReviewedProgress) => void;
  /** Self-reviewing adapters only: the model core would have shown. */
  onPreview?: (model: ReviewModel) => void;
};

export type ReviewedProgress = {
  step: number;
  total: number;
  phase: ReviewedWritePhase | "receipt" | "proposed" | "done";
  hash?: Hex;
};

export type ReviewedResult =
  | { status: "done"; hashes: Hex[]; receipts: TransactionReceipt[] }
  | { status: "proposed"; step: number; safeTxHash: Hex };

/** The exact bytes a step sends. */
type SentCall = Readonly<{
  chainId: number;
  to: Address;
  data: Hex;
  value: bigint;
}>;

const CHANGED =
  "Transaction data changed after review. Nothing was sent; review it again.";
const MISMATCHED =
  "This call's data does not match its arguments. Nothing was sent.";
const ACCOUNT_CHANGED = "The connected account changed. Review again.";
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
  const { chainId, to, data, value, abi, functionName, args, label } = call;
  const { contractName } = call;
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
    sent: Object.freeze({ chainId, to, data, value: value ?? 0n }),
    shown: { abi, functionName, args, label, contractName },
  };
}

function sameCall(a: SentCall, b: SentCall): boolean {
  return (
    a.chainId === b.chainId &&
    a.to.toLowerCase() === b.to.toLowerCase() &&
    a.data.toLowerCase() === b.data.toLowerCase() &&
    a.value === b.value
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
            label: labelOf(calls[index], index),
            dependsOnPrior: calls[index].dependsOnPrior,
          })),
        });
      } else if (!(calls[steps[0]].dependsOnPrior && steps[0] > 0)) {
        await simulateStateChangingTransaction(client, {
          from: account,
          to: sent[steps[0]].to,
          data: sent[steps[0]].data,
          value: sent[steps[0]].value,
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
 * Only an explicit wallet rejection (EIP-1193 4001) releases a step's hold;
 * any other failure once the wallet opened keeps it held.
 *
 * A self-reviewing adapter (Signa) is never prompted: `onPreview` gets the
 * model, and the adapter gets the raw calls to review on its own page.
 */
export async function sendReviewed(
  action: ReviewedAction,
  deps: ReviewedSendDeps,
): Promise<ReviewedResult> {
  const { adapter, clientFor, hold, onProgress } = deps;
  action.guard?.();
  const { account } = action;
  const calls = [...action.calls];
  if (!calls.length) throw new Error("There is no transaction to review.");
  const snapshots = calls.map(exact);
  const sent = snapshots.map(({ sent }) => sent);
  const connected = adapter.account();
  if (!connected) throw new Error("Connect a wallet first.");
  if (connected.toLowerCase() !== account.toLowerCase()) {
    throw new Error(ACCOUNT_CHANGED);
  }

  const request = (safe: boolean): TransactionReviewRequest => ({
    calls: snapshots.map(({ sent, shown }) => ({
      ...sent,
      from: account,
      ...(safe ? { safeTxGas: 0n } : {}),
      ...(shown.abi ? { abi: shown.abi } : {}),
      ...(shown.functionName ? { functionName: shown.functionName } : {}),
      ...(shown.args ? { args: shown.args } : {}),
      ...(shown.label ? { label: shown.label } : {}),
      ...(shown.contractName ? { contractName: shown.contractName } : {}),
    })),
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
    const hash = await adapter.submitToReviewer({
      account,
      calls: sent.map((call) => ({ ...call })),
    });
    return { status: "done", hashes: [hash], receipts: [] };
  }

  const safe = adapter.isSafe();
  const handles = calls.map((call, step) =>
    hold.open(
      {
        chainId: sent[step].chainId,
        account,
        safe,
        call: {
          to: sent[step].to,
          data: sent[step].data,
          value: sent[step].value,
        },
        ...(call.intent ? { namespace: call.intent } : {}),
      },
      call.legacy ? { legacy: [...call.legacy] } : undefined,
    ),
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
  const simulation = reviewSimulation(account, calls, sent, clientFor);
  const enriched = Promise.all([
    enrichReviewModel(model, clientFor).catch(() => model),
    simulation,
  ]).then(([read, simulated]) => {
    const warning = simulationWarning(simulated);
    return warning ? { ...read, warnings: [...read.warnings, warning] } : read;
  });
  await promptReview(model, simulation, enriched);

  const hashes: Hex[] = [];
  const receipts: TransactionReceipt[] = [];
  const total = calls.length;
  for (const [step, call] of calls.entries()) {
    const reviewed = sent[step];
    const progress = (phase: ReviewedProgress["phase"], hash?: Hex) =>
      onProgress?.({ step, total, phase, ...(hash ? { hash } : {}) });
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
    const blockNumber =
      call.dependsOnPrior &&
      prior &&
      sent[step - 1].chainId === reviewed.chainId
        ? prior.blockNumber
        : undefined;
    const hash = await handles[step].send<Hex>(client, (gate) => {
      // Under the hold's own check of the call, before anything reserves.
      if (generation(handles[step]) !== reviewedGenerations[step]) {
        throw new WriteHoldStaleReviewError();
      }
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
          await action.reverify?.(call, step);
          unchanged();
        },
        simulate: async (sending) => {
          const tx = {
            to: sending.to,
            data: sending.data,
            value: sending.value,
            ...(blockNumber === undefined ? {} : { blockNumber }),
          };
          const [, estimate] = await Promise.all([
            simulateStateChangingTransaction(client, { from: account, ...tx }),
            // A Safe app signs the sent gas as safeTxGas; 0 makes a failed call revert.
            safe ? undefined : client.estimateGas({ account, ...tx }),
          ]);
          return {
            ...sending,
            gas: estimate === undefined ? 0n : gasWithHeadroom(estimate),
          };
        },
        beforeWrite: () => gate.beforeSend(),
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
        onBeforeWriteAborted: () => gate.onRejected(),
        onWriteRejected: () => gate.onRejected(),
        onWriteSubmitted: (submitted) => gate.afterSubmit(submitted),
        write: ({ chainId, to, data, value, gas }) =>
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
      progress("proposed", hash);
      return { status: "proposed", step, safeTxHash: hash };
    }
    progress("receipt", hash);
    const receipt = await waitForTrackedReceipt(client, hash);
    // The hold checks the receipt itself and settles, so the same call (or
    // intent) can be reviewed and sent again without waiting on a view.
    await handles[step].state(client).catch(() => undefined);
    if (receipt.status !== "success") throw new Error(WRITE_HOLD_REVERTED_LINE);
    receipts.push(receipt);
  }
  onProgress?.({ step: total - 1, total, phase: "done" });
  return { status: "done", hashes, receipts };
}
