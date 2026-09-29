"use client";

import { encodeFunctionData, type Abi, type Address, type Hex } from "viem";
import { JB_CHAINS } from "../constants.js";
import type { JBChainId } from "../types.js";

/** How review prompts name a chain and link its explorer. Apps pass their own to keep their wording. */
export type TransactionReviewDisplay = {
  chainName?: (chainId: number) => string;
  explorerOrigin?: (chainId: number) => string | null;
};

function defaultChainName(chainId: number): string {
  return JB_CHAINS[chainId as JBChainId]?.name ?? `Chain ${chainId}`;
}

function defaultExplorerOrigin(chainId: number): string | null {
  const hostname = JB_CHAINS[chainId as JBChainId]?.etherscanHostname;
  return hostname ? `https://${hostname}` : null;
}

export type TransactionReviewCall = {
  chainId: number;
  to: Address;
  data: Hex;
  value?: bigint;
  from?: Address;
  abi?: Abi;
  functionName?: string;
  args?: readonly unknown[];
  /** Plain-language action shown above the decoded call. */
  label?: string;
  /** Optional known contract name. The full address is always shown too. */
  contractName?: string;
  /** The calls a batching destination (MultiSend) makes in order, decoded by the caller. */
  calls?: readonly TransactionReviewCall[];
};

export type TransactionReviewRequest = {
  calls: readonly TransactionReviewCall[];
  title?: string;
  description?: string;
  confirmLabel?: string;
  /** Distinguishes a wallet transaction from an authorization which a relayer/Safe will submit. */
  kind?: "transaction" | "authorization";
  /** Exact typed data committed by a Safe/relayer signature, when applicable. */
  authorization?: unknown;
};

export type ContractTransactionReviewCall = {
  chainId: number;
  address: Address;
  abi: Abi;
  functionName: string;
  args?: readonly unknown[];
  value?: bigint;
  account?: Address;
};

export type TransactionReviewOptions = Omit<
  TransactionReviewRequest,
  "calls"
> & {
  label?: string;
  contractName?: string;
};

type TransactionReviewHandler = (
  request: TransactionReviewRequest,
) => Promise<boolean>;

const transactionReviewHandlers: TransactionReviewHandler[] = [];

export type FundingChainOption = {
  chainId: number;
  /** The chain name and quoted funding cost shown to the user. */
  label: string;
};

type FundingChainSelectionHandler = (
  options: readonly FundingChainOption[],
) => Promise<number | null>;

const fundingChainSelectionHandlers: FundingChainSelectionHandler[] = [];

export function registerFundingChainSelectionHandler(
  handler: FundingChainSelectionHandler,
): () => void {
  fundingChainSelectionHandlers.push(handler);
  return () => {
    const index = fundingChainSelectionHandlers.lastIndexOf(handler);
    if (index >= 0) fundingChainSelectionHandlers.splice(index, 1);
  };
}

/** Funding always requires an explicit choice, even with one quoted option. */
export async function requireFundingChainSelection(
  options: readonly FundingChainOption[],
): Promise<number> {
  const snapshot = options.map((option) => ({ ...option }));
  const chainIds = new Set(snapshot.map((option) => option.chainId));
  if (
    !snapshot.length ||
    chainIds.size !== snapshot.length ||
    snapshot.some(
      (option) =>
        !Number.isSafeInteger(option.chainId) ||
        option.chainId <= 0 ||
        !option.label.trim(),
    )
  ) {
    throw new Error(
      "No valid funding chain choices are available. Request a new quote.",
    );
  }
  const handler =
    fundingChainSelectionHandlers[fundingChainSelectionHandlers.length - 1];
  if (!handler) {
    throw new Error(
      "Funding chain selection is unavailable. Reload the page before continuing.",
    );
  }
  const selected = await handler(snapshot);
  if (selected === null) {
    throw new Error("Funding chain selection cancelled. Nothing was sent.");
  }
  if (!chainIds.has(selected)) {
    throw new Error(
      "The selected funding chain is not available in this quote.",
    );
  }
  return selected;
}

/**
 * The provider registers the only UI capable of approving a transaction.
 * Keeping the entry point in a small client module lets non-React wallet
 * helpers (Safe and Relayr) use the same mandatory review queue.
 */
export function registerTransactionReviewHandler(
  handler: TransactionReviewHandler,
): () => void {
  transactionReviewHandlers.push(handler);
  return () => {
    const index = transactionReviewHandlers.lastIndexOf(handler);
    if (index >= 0) transactionReviewHandlers.splice(index, 1);
  };
}

async function requestTransactionReview(
  request: TransactionReviewRequest,
): Promise<boolean> {
  if (!request.calls.length && !request.authorization) {
    throw new Error("There is no transaction to review.");
  }
  const transactionReviewHandler =
    transactionReviewHandlers[transactionReviewHandlers.length - 1];
  if (!transactionReviewHandler) {
    throw new Error(
      "Transaction review is unavailable. Reload the page before continuing.",
    );
  }
  return transactionReviewHandler(request);
}

/** Encode once for review using the same ABI/function/args passed to wagmi. */
function contractCallForReview(
  call: ContractTransactionReviewCall,
  options: Pick<TransactionReviewOptions, "label" | "contractName"> = {},
): TransactionReviewCall {
  const data = encodeFunctionData({
    abi: call.abi,
    functionName: call.functionName,
    args: call.args,
  });
  return {
    chainId: call.chainId,
    to: call.address,
    data,
    value: call.value,
    from: call.account,
    abi: call.abi,
    functionName: call.functionName,
    args: call.args,
    label: options.label,
    contractName: options.contractName,
  };
}

export function requestContractTransactionReview(
  call: ContractTransactionReviewCall,
  options: TransactionReviewOptions = {},
): Promise<boolean> {
  const { label, contractName, ...requestOptions } = options;
  const reviewed = contractCallForReview(call, { label, contractName });
  return requestTransactionReview({
    ...requestOptions,
    calls: [reviewed],
  }).then((approved) => {
    if (!approved) return false;
    const current = contractCallForReview(call, { label, contractName });
    if (
      current.chainId !== reviewed.chainId ||
      current.to.toLowerCase() !== reviewed.to.toLowerCase() ||
      (current.value ?? 0n) !== (reviewed.value ?? 0n) ||
      current.data !== reviewed.data
    ) {
      throw new Error(
        "Transaction data changed after review. Nothing was sent; review it again.",
      );
    }
    return true;
  });
}

class TransactionReviewCancelledError extends Error {
  constructor() {
    super("Review closed. Nothing was sent.");
    this.name = "TransactionReviewCancelledError";
  }
}

export async function requireTransactionReview(
  request: TransactionReviewRequest,
): Promise<void> {
  if (!(await requestTransactionReview(request))) {
    throw new TransactionReviewCancelledError();
  }
}

export async function requireContractTransactionReview(
  call: ContractTransactionReviewCall,
  options: TransactionReviewOptions = {},
): Promise<void> {
  if (!(await requestContractTransactionReview(call, options))) {
    throw new TransactionReviewCancelledError();
  }
}

export function transactionReviewJson(
  request: TransactionReviewRequest,
): string {
  const transactions = request.calls.map((call) => ({
    chainId: call.chainId,
    from: call.from,
    to: call.to,
    value: `0x${(call.value ?? 0n).toString(16)}`,
    data: call.data,
  }));
  const calls = transactions.length === 1 ? transactions[0] : { transactions };
  const payload = request.authorization
    ? transactions.length > 0
      ? { authorization: request.authorization, resultingCall: calls }
      : { authorization: request.authorization }
    : calls;
  return JSON.stringify(
    payload,
    (_, value) => (typeof value === "bigint" ? value.toString() : value),
    2,
  );
}

/** A website/-style prompt which keeps the exact reviewed RPC call intact. */
const ETHERSCAN_SKILL_LINE =
  "If your agent has Etherscan's skills installed (`npx skills add etherscan/skills`), run `etherscan-contract-review` on each target address to pull its verified source, proxy roles, and privileged controls before decoding. Otherwise work from the explorer pages.";

/**
 * The post-transaction counterpart of the review prompt: a mined tx the user
 * wants explained (or diagnosed) from explorer evidence. Points at Etherscan's
 * transaction-debugger skill when the reader's agent has it, and degrades to
 * the explorer page when it doesn't.
 */
export function buildTransactionDebugPrompt(
  calls: { chainId: number; txHash: string }[],
  display: TransactionReviewDisplay = {},
): string {
  const explorerOrigin = display.explorerOrigin ?? defaultExplorerOrigin;
  const displayChainName = display.chainName ?? defaultChainName;
  const lines = [
    "A Juicebox V6 transaction (the nana V6 / revnet V6 protocol release, not an older Juicebox version) was mined. Explain what happened in it and whether it did what a Juicebox user would expect.",
    "",
  ];
  calls.forEach((call) => {
    const explorer = explorerOrigin(call.chainId);
    lines.push(
      `- ${displayChainName(call.chainId)} (chain ${call.chainId}): ${explorer ? `${explorer}/tx/${call.txHash}` : call.txHash}`,
    );
  });
  lines.push(
    "",
    "If your agent has Etherscan's skills installed (`npx skills add etherscan/skills`), use `etherscan-transaction-debugger` in security mode on each hash. Otherwise work from the explorer page: receipt status, decoded input, event logs, and internal transactions.",
    "",
    "Verify contract source only against the Juicebox V6 repositories: https://github.com/Bananapus/version-6 (repositories ending in `-v6`; same-named repositories without that suffix are older versions).",
    "",
    "Report the decoded method and arguments, every native and token movement with its recipient, every permission, ownership, or ruleset change, and, if it reverted, the narrowest root cause the evidence supports. Mark each claim observed, derived, or inferred. Never invent a function name, amount, or revert reason. End with one line: what the transaction did in plain English, and anything that looks wrong.",
  );
  return lines.join("\n");
}

export function buildTransactionReviewPrompt(
  request: TransactionReviewRequest,
  display: TransactionReviewDisplay = {},
): string {
  const explorerOrigin = display.explorerOrigin ?? defaultExplorerOrigin;
  const lines: string[] = [
    "I'm about to authorize a blockchain transaction in the Juicebox V6 app (the nana V6 / revnet V6 protocol release, not an older Juicebox version). Act as a careful security reviewer. Independently verify the payload against the deployed contracts and V6 source, confirm it matches my intent, and give a go/no-go. Assume the UI could be spoofed; trust the onchain call and verified V6 source over the page.",
    "",
    "Exact app-controlled transaction payload:",
    "```json",
    transactionReviewJson(request),
    "```",
    "",
  ];

  if (typeof window !== "undefined") {
    lines.push("Audit the app build I am using:");
    lines.push(`- Page: ${window.location.href}`);
    lines.push(
      "- Confirm this page builds exactly the destination, native value, and calldata above, with no hidden or substituted call.",
    );
    lines.push("");
  }

  lines.push("Verify the contracts and protocol version:");
  lines.push(
    "- Juicebox V6 ecosystem source: https://github.com/Bananapus/version-6",
  );
  lines.push(
    "- Use only V6 repositories (normally ending in `-v6`); same-named repositories without that suffix may be older and incompatible.",
  );
  lines.push(`- ${ETHERSCAN_SKILL_LINE}`);
  request.calls.forEach((call, index) => {
    // Apps pass their one explorer registry; a second copy once drifted on OP mainnet.
    const explorer = explorerOrigin(call.chainId);
    const prefix =
      request.calls.length > 1 ? `Transaction ${index + 1}` : "Target";
    lines.push(
      explorer
        ? `- ${prefix} onchain: ${explorer}/address/${call.to}`
        : `- ${prefix}: chain ${call.chainId}, address ${call.to}`,
    );
  });
  lines.push("");
  lines.push("Check specifically:");
  lines.push(
    "1. Decode the calldata selector and every argument. Explain in plain English what state, permissions, ownership, tokens, or funds can change.",
  );
  lines.push(
    "2. Verify the chain ID, `to` address, native `value`, and calldata exactly. Flag any unexpected non-zero value or unknown target.",
  );
  lines.push(
    "3. Identify every beneficiary, recipient, spender, operator, owner, hook, terminal, and permission-bearing address in the decoded arguments.",
  );
  lines.push(
    "4. Warn about unlimited approvals, arbitrary-call capability, delegatecalls, ownership transfers, permission grants, upgradeability, or drain paths.",
  );
  lines.push(
    "5. For multiple chains, confirm the intended change is consistent and that no extra chain or call was added.",
  );
  lines.push("");
  lines.push(
    "Before your verdict, quiz me with 2–4 short plain-English questions about what I expect to happen (what changes, who receives or controls what, how much value moves, and on which chain). Wait for my answers, compare them with the decoded payload, and flag every mismatch.",
  );
  lines.push("");
  lines.push(
    "End with one verdict: SAFE TO SIGN / DO NOT SIGN / NEEDS MORE INFO, followed by the most important reasons. If the target is not a recognizable verified Juicebox V6 deployment, say so explicitly.",
  );
  return lines.join("\n");
}
