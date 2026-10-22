import {
  keccak256,
  toHex,
  type AbiFunction,
  type Address,
  type Hex,
} from "viem";
import {
  describeJBHookMetadata,
  describePermissionsData,
  describeSafeInitializer,
  describeSafeInnerCall,
  describeSplitGroups,
  describeSuckerClaim,
  describeUniversalRouterExecute,
  describeV4UnlockData,
  functionFromCall,
  knownAddressName,
  nativeValue,
  readableValue,
  reviewDescription,
  unixTime,
  type PrettyStep,
  type V4PlanStep,
} from "./decode.js";
import {
  bigintAsString,
  transactionReviewJson,
  type TransactionReviewCall,
  type TransactionReviewRequest,
} from "./transactionReview.js";

/** A row the site shows above the calls, marked as the site's own summary. */
export type ReviewContextRow = {
  label: string;
  value: string;
  strong?: boolean;
  mono?: boolean;
};

export type ReviewWarningCode =
  | "safe-gas-nonzero"
  | "delegatecall"
  | "abi-unavailable"
  | "unknown-contract"
  | "unlimited-approval"
  | "owner-action"
  | "permission-grant"
  | "decimals-unknown"
  | "simulation-failed"
  | "simulation-unavailable";

export type ReviewWarning = { code: ReviewWarningCode; text: string };

/**
 * One ABI input of a decoded call. `text` is {@link readableValue}'s output,
 * except where the review states it more precisely (a Safe `operation`, a
 * Universal Router deadline). A decoder's readable view rides along in
 * `steps`, `v4Plan` or `nested`; a Universal Router `execute` plan rides on
 * its `commands` argument.
 */
export type ReviewArgument = {
  name: string;
  type: string;
  text: string;
  steps: PrettyStep[] | null;
  v4Plan: V4PlanStep[] | null;
  nested: ReviewCallModel[] | null;
};

export type ReviewCallModel = {
  chainId: number;
  from: Address | null;
  to: Address;
  contractName: string | null;
  value: bigint;
  valueText: string;
  gas: bigint | null;
  safeTxGas: bigint | null;
  label: string | null;
  functionName: string | null;
  selector: Hex;
  byteLength: number;
  /** Null when the ABI is unavailable or the arguments don't encode to the calldata. */
  args: ReviewArgument[] | null;
  /** The calls a batching destination makes, in order. A MultiSend's show in its `transactions` argument instead. */
  calls: ReviewCallModel[] | null;
  warnings: ReviewWarning[];
};

export type ReviewModel = {
  /**
   * keccak256 of the canonical JSON of the binding fields only: kind, each
   * call's chainId, from, to, value and data, authorization, message and
   * context. Enrichment, warnings and simulation are excluded and may change
   * after mint.
   */
  id: Hex;
  /** "message" is an authorization signed as a plain message rather than typed data. */
  kind: "transaction" | "authorization" | "message";
  title: string | null;
  description: string;
  confirmLabel: string | null;
  /** The site's summary rows, in the order given, shown first. */
  context: ReviewContextRow[];
  calls: ReviewCallModel[];
  /** The exact typed data (or message envelope) a signature commits to. */
  authorization: unknown | null;
  /** The exact personal_sign text, when the request carries it. */
  message: string | null;
  /** {@link transactionReviewJson} of the request. */
  rawJson: string;
  warnings: ReviewWarning[];
};

const SAFE_GAS_NONZERO =
  "If this call fails, the Safe still executes and uses this nonce.";
const DELEGATECALL =
  "DELEGATECALL: runs foreign code with the Safe's own storage and funds";
const ABI_UNAVAILABLE =
  "This call’s ABI is not available in this flow. Check the complete calldata in Raw before continuing.";

/** MultiSend's `transactions` argument is where its decoded calls show. */
function nestsCallsInArgument(fn: AbiFunction | null): boolean {
  return (
    fn?.name === "multiSend" &&
    fn.inputs.some((input) => input.name === "transactions")
  );
}

function isOne(value: unknown): boolean {
  return value === 1 || value === 1n;
}

/** A decoder's view of one argument, or null for {@link readableValue}'s text alone. */
function specialArgument(
  call: TransactionReviewCall,
  fn: AbiFunction,
  inputName: string,
  value: unknown,
): Partial<ReviewArgument> | null {
  const steps = (found: PrettyStep[] | null) =>
    found ? { steps: found } : null;
  switch (fn.name) {
    case "modifyLiquidities": {
      if (inputName !== "unlockData") return null;
      const v4Plan = describeV4UnlockData(value);
      return v4Plan ? { v4Plan } : null;
    }
    case "pay":
    case "addToBalanceOf":
      return inputName === "metadata"
        ? steps(describeJBHookMetadata("pay", value))
        : null;
    case "cashOutTokensOf":
      return inputName === "metadata"
        ? steps(describeJBHookMetadata("cashOut", value))
        : null;
    case "claim":
      return steps(describeSuckerClaim(call.chainId, value));
    case "execTransaction":
      if (inputName === "data") {
        return steps(
          describeSafeInnerCall(call.chainId, call.args?.[0], value),
        );
      }
      if (inputName !== "operation") return null;
      return {
        text: isOne(value)
          ? `1 — ${DELEGATECALL}`
          : value === 0 || value === 0n
            ? "0 — CALL"
            : String(value),
      };
    case "createProxyWithNonce":
      return inputName === "initializer"
        ? steps(describeSafeInitializer(call.chainId, value))
        : null;
    case "setPermissionsFor":
      return inputName === "permissionsData"
        ? steps(describePermissionsData(call.chainId, value))
        : null;
    case "setSplitGroupsOf":
      return inputName === "splitGroups"
        ? steps(describeSplitGroups(call.chainId, value))
        : null;
  }
  return inputName === "transactions" &&
    nestsCallsInArgument(fn) &&
    call.calls?.length
    ? { nested: call.calls.map(reviewCall) }
    : null;
}

function reviewArguments(
  call: TransactionReviewCall,
  fn: AbiFunction,
): ReviewArgument[] {
  const values = call.args ?? [];
  const plain = fn.inputs.map(
    (input, index): ReviewArgument => ({
      name: input.name ?? "",
      type: input.type,
      text: readableValue(input.type, values[index], call.chainId),
      steps: null,
      v4Plan: null,
      nested: null,
    }),
  );
  const plan =
    fn.name === "execute"
      ? describeUniversalRouterExecute(call.chainId, values)
      : null;
  if (plan) {
    plain[0].steps = plan;
    const deadline = values[2];
    if (
      plain[2] &&
      (typeof deadline === "bigint" || typeof deadline === "number")
    ) {
      plain[2].text = unixTime(deadline);
    }
    return plain;
  }
  return plain.map((argument, index) => ({
    ...argument,
    ...specialArgument(call, fn, argument.name, values[index]),
  }));
}

function reviewCall(call: TransactionReviewCall): ReviewCallModel {
  const fn = functionFromCall(call);
  const args = fn ? reviewArguments(call, fn) : null;
  const batched =
    call.calls?.length && !nestsCallsInArgument(fn) ? call.calls : null;
  const warnings: ReviewWarning[] = [];
  if (call.safeTxGas !== undefined && call.safeTxGas !== 0n) {
    warnings.push({ code: "safe-gas-nonzero", text: SAFE_GAS_NONZERO });
  }
  if (!fn) {
    warnings.push({ code: "abi-unavailable", text: ABI_UNAVAILABLE });
  } else if (fn.name === "execTransaction") {
    const operation = fn.inputs.findIndex(
      (input) => input.name === "operation",
    );
    if (isOne(call.args?.[operation])) {
      warnings.push({ code: "delegatecall", text: DELEGATECALL });
    }
  }
  return {
    chainId: call.chainId,
    from: call.from ?? null,
    to: call.to,
    contractName: call.contractName ?? knownAddressName(call.chainId, call.to),
    value: call.value ?? 0n,
    valueText: nativeValue(call.value),
    gas: call.gas ?? null,
    safeTxGas: call.safeTxGas ?? null,
    label: call.label ?? null,
    functionName: fn?.name ?? null,
    selector: call.data.slice(0, 10) as Hex,
    byteLength: Math.max(0, (call.data.length - 2) / 2),
    args,
    calls: batched ? batched.map(reviewCall) : null,
    warnings,
  };
}

/** Objects with their keys sorted at every depth, so equal data encodes alike. */
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [
          key,
          canonical((value as Record<string, unknown>)[key]),
        ]),
    );
  }
  return value;
}

/**
 * The plain-data review of a request: what every client's review dialog
 * shows, decoded once. `context` is display only and never feeds `calls`.
 */
export function buildReviewModel(
  request: TransactionReviewRequest,
): ReviewModel {
  const signsMessage =
    (request.authorization as { kind?: unknown } | undefined)?.kind ===
    "message";
  const kind =
    request.kind === "authorization"
      ? signsMessage
        ? "message"
        : "authorization"
      : "transaction";
  const context = (request.context ?? []).map((row) => ({ ...row }));
  const authorization = request.authorization ?? null;
  const message = null;
  const binding = {
    kind,
    calls: request.calls.map((call) => ({
      chainId: call.chainId,
      from: call.from ?? null,
      to: call.to,
      value: call.value ?? 0n,
      data: call.data,
    })),
    authorization,
    message,
    context,
  };
  return {
    id: keccak256(toHex(JSON.stringify(canonical(binding), bigintAsString))),
    kind,
    title: request.title ?? null,
    description: reviewDescription(request),
    confirmLabel: request.confirmLabel ?? null,
    context,
    calls: request.calls.map(reviewCall),
    authorization,
    message,
    rawJson: transactionReviewJson(request),
    warnings: [],
  };
}
