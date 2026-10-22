import {
  erc20Abi,
  keccak256,
  toHex,
  type AbiFunction,
  type AbiParameter,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";
import { NATIVE_TOKEN } from "../constants.js";
import { USDC_ADDRESSES } from "../pureConstants.js";
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
  namedValue,
  nativeValue,
  readableValue,
  reviewDescription,
  unixTime,
  type PrettyStep,
  type V4PlanStep,
} from "./decode.js";
import {
  transactionReviewJson,
  type TransactionReviewCall,
  type TransactionReviewRequest,
  type TransactionReviewSignature,
} from "./transactionReview.js";

/** A row the site shows above the calls, marked as the site's own summary. */
export type ReviewContextRow = {
  label: string;
  value: string;
  /** Further lines of the value, shown under it in order (each signer, say). */
  lines?: readonly string[];
  /** A short note under the row, such as what the action leaves to do. */
  note?: string;
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
  | "possible-token-id"
  | "simulation-failed"
  | "simulation-unavailable"
  | "unreadable";

export type ReviewWarning = { code: ReviewWarningCode; text: string };

/**
 * One ABI value. `text` is {@link readableValue}'s output. A tuple's
 * `children` are its components, by name; an array's are its elements, named
 * `[0]`, `[1]`, …. Any other value has none.
 */
export type ReviewValue = {
  name: string;
  type: string;
  text: string;
  children: ReviewValue[] | null;
};

/**
 * One ABI input of a decoded call. `text` is {@link readableValue}'s output,
 * except where the review states it more precisely (a Safe `operation`, a
 * Universal Router deadline). A decoder's readable view rides along in
 * `steps`, `v4Plan` or `nested`; a Universal Router `execute` plan rides on
 * its `commands` argument.
 */
export type ReviewArgument = ReviewValue & {
  steps: PrettyStep[] | null;
  v4Plan: V4PlanStep[] | null;
  nested: ReviewCallModel[] | null;
};

/** An address the call gives a part, read from the argument's name. */
export type ReviewRole = {
  role: "spender" | "recipient" | "beneficiary" | "owner" | "operator";
  address: Address;
  name: string | null;
};

/**
 * An amount of a token the call moves or approves, in base units. `decimals`
 * and `symbol` are null until known: native ETH and USDC are known at once,
 * any other token after {@link enrichReviewModel} reads it.
 */
export type ReviewTokenAmount = {
  token: Address | "native";
  amount: bigint;
  decimals: number | null;
  symbol: string | null;
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
  roles: ReviewRole[];
  tokenAmounts: ReviewTokenAmount[];
  /** The NFT an ERC-721 `approve` or `transferFrom` names: its last argument is a token ID, not an amount. */
  nft: { token: Address; tokenId: bigint } | null;
  warnings: ReviewWarning[];
};

/** One signature the action asks for, as the review shows it. */
export type ReviewSignatureModel = {
  kind: TransactionReviewSignature["kind"];
  chainId: number;
  /** A copy of the exact EIP-712 typed data signed; null for a message. */
  typedData: unknown | null;
  /** The exact text signed; null for typed data. */
  message: string | null;
  /** The calls the signature lets someone run, decoded. */
  calls: ReviewCallModel[];
  /** What it authorizes, in rows (Permit2's token, amount, spender and expiry). */
  steps: PrettyStep[];
};

export type ReviewModel = {
  /**
   * keccak256 of the canonical JSON of the binding fields only: kind, each
   * call's chainId, from, to, value, gas, safeTxGas and data (and the same for
   * the decoded calls it shows inside), authorization, message, context, and
   * each signature's kind, chain, typed data, text and calls. Enrichment,
   * warnings and simulation are excluded and may change after mint.
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
  /** A copy of the exact typed data (or message envelope) a signature commits to. */
  authorization: unknown | null;
  /** The exact personal_sign text, when the action signs one message. */
  message: string | null;
  /** The signatures the action asks for, signed after confirm and before any call is sent. */
  signatures: ReviewSignatureModel[];
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

const UNKNOWN_CONTRACT =
  "This destination is not a contract the app recognizes. Check the address before continuing.";
const UNLIMITED_APPROVAL =
  "Unlimited approval: the spender can move all of this token you hold, now and later.";
const OWNER_ACTION =
  "This changes who or what controls this contract or project.";
const PERMISSION_GRANT = "This lets another address act for you.";
const DECIMALS_UNKNOWN =
  "The token's decimals could not be read, so its amount shows in base units.";
const UNREADABLE =
  "Part of this request can't be read here. Check it in your wallet before continuing.";
const POSSIBLE_TOKEN_ID =
  "ERC-721 NFTs use this same function, so this number may be an NFT's token ID rather than an amount.";

/** Address arguments that give the address a part, by argument name. */
const ROLE_OF: Readonly<Record<string, ReviewRole["role"]>> = {
  spender: "spender",
  recipient: "recipient",
  beneficiary: "beneficiary",
  owner: "owner",
  newOwner: "owner",
  operator: "operator",
};

/** Where a token call's arguments sit, by position, so ABI names never decide them. */
type TokenCall = {
  token?: number;
  spender?: number;
  recipient?: number;
  amount?: number;
  /** Where ERC-721 reads the amount as a token ID. */
  tokenId?: number;
  /** ERC-721 has the same signature, so only the contract tells which it is. */
  sharedWithErc721?: true;
};

/**
 * ERC-20, ERC-2612 and Permit2 approvals and transfers by signature.
 * ERC-721 shares `approve(address,uint256)` and
 * `transferFrom(address,address,uint256)`; where the ABI names the last
 * argument `tokenId`, it is a token ID, not an amount.
 */
const TOKEN_CALLS: Readonly<Record<string, TokenCall>> = {
  "approve(address,uint256)": {
    spender: 0,
    amount: 1,
    sharedWithErc721: true,
  },
  "increaseAllowance(address,uint256)": { spender: 0, amount: 1 },
  "transfer(address,uint256)": { recipient: 0, amount: 1 },
  "transferFrom(address,address,uint256)": {
    recipient: 1,
    amount: 2,
    sharedWithErc721: true,
  },
  "permit(address,address,uint256,uint256,uint8,bytes32,bytes32)": {
    spender: 1,
    amount: 2,
  },
  "approve(address,address,uint160,uint48)": {
    token: 0,
    spender: 1,
    amount: 2,
  },
};

/** The token call `fn` is, with no amount for an ERC-721 token ID; null for any other function. */
function tokenCallOf(fn: AbiFunction): TokenCall | null {
  const shape =
    TOKEN_CALLS[
      `${fn.name}(${fn.inputs.map((input) => input.type).join(",")})`
    ];
  if (!shape) return null;
  return shape.amount !== undefined &&
    fn.inputs[shape.amount].name === "tokenId"
    ? { ...shape, amount: undefined, tokenId: shape.amount }
    : shape;
}

/**
 * Calls that change a contract's owner, a Safe's owners or threshold, what
 * else can act as the Safe, or a project's controller or terminals.
 */
const OWNER_ACTIONS = new Set([
  "transferOwnership",
  "renounceOwnership",
  "addOwnerWithThreshold",
  "removeOwner",
  "swapOwner",
  "changeThreshold",
  "enableModule",
  "setGuard",
  "setFallbackHandler",
  "transferOwnershipToProject",
  "setControllerOf",
  "setTerminalsOf",
]);

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

function reviewValue(
  parameter: AbiParameter,
  value: unknown,
  chainId: number,
): ReviewValue {
  return {
    name: parameter.name ?? "",
    type: parameter.type,
    text: readableValue(parameter.type, value, chainId),
    children: reviewChildren(parameter, value, chainId),
  };
}

function reviewChildren(
  parameter: AbiParameter,
  value: unknown,
  chainId: number,
): ReviewValue[] | null {
  const array = /^(.*)\[\d*\]$/u.exec(parameter.type);
  if (array && Array.isArray(value)) {
    return value.map((item, index) =>
      reviewValue(
        { ...parameter, name: `[${index}]`, type: array[1] } as AbiParameter,
        item,
        chainId,
      ),
    );
  }
  if ("components" in parameter && Array.isArray(parameter.components)) {
    return parameter.components.map((component, index) =>
      reviewValue(
        component,
        namedValue(value, component.name ?? "", index),
        chainId,
      ),
    );
  }
  return null;
}

/** Every address argument, a tuple's components and an array's elements included, under its own name. */
function addressArguments(
  parameter: AbiParameter,
  value: unknown,
): [string, unknown][] {
  const array = /^(.*)\[\d*\]$/u.exec(parameter.type);
  if (array && Array.isArray(value)) {
    const item = { ...parameter, type: array[1] } as AbiParameter;
    return value.flatMap((element) => addressArguments(item, element));
  }
  if ("components" in parameter && Array.isArray(parameter.components)) {
    return parameter.components.flatMap((component, index) =>
      addressArguments(
        component,
        namedValue(value, component.name ?? "", index),
      ),
    );
  }
  return parameter.type === "address" ? [[parameter.name ?? "", value]] : [];
}

function reviewRoles(
  call: TransactionReviewCall,
  fn: AbiFunction,
): ReviewRole[] {
  const roles: ReviewRole[] = [];
  const seen = new Set<string>();
  const add = (role: ReviewRole["role"] | undefined, address: unknown) => {
    if (!role || typeof address !== "string") return;
    const key = `${role}:${address.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    roles.push({
      role,
      address: address as Address,
      name: knownAddressName(call.chainId, address),
    });
  };
  const tokenCall = tokenCallOf(fn);
  if (tokenCall?.spender !== undefined) {
    add("spender", call.args?.[tokenCall.spender]);
  }
  if (tokenCall?.recipient !== undefined) {
    add("recipient", call.args?.[tokenCall.recipient]);
  }
  fn.inputs.forEach((input, index) => {
    for (const [name, address] of addressArguments(input, call.args?.[index])) {
      add(ROLE_OF[name], address);
    }
  });
  return roles;
}

/** Native ETH and USDC need no read. */
function knownToken(
  chainId: number,
  token: Address | "native",
): Pick<ReviewTokenAmount, "decimals" | "symbol"> {
  if (token === "native") return { decimals: 18, symbol: "ETH" };
  const usdc = USDC_ADDRESSES[chainId as keyof typeof USDC_ADDRESSES];
  return usdc?.toLowerCase() === token.toLowerCase()
    ? { decimals: 6, symbol: "USDC" }
    : { decimals: null, symbol: null };
}

function tokenAmount(
  chainId: number,
  address: unknown,
  amount: unknown,
): ReviewTokenAmount | null {
  if (typeof address !== "string" || typeof amount !== "bigint") return null;
  const token =
    address.toLowerCase() === NATIVE_TOKEN.toLowerCase()
      ? "native"
      : (address as Address);
  return { token, amount, ...knownToken(chainId, token) };
}

/**
 * What a terminal payment sends, or what an ERC-20 or Permit2 approval or
 * transfer moves. A native payment sends the call's value, whatever its
 * `amount` argument says.
 */
function tokenAmountOf(
  call: TransactionReviewCall,
  fn: AbiFunction,
): ReviewTokenAmount | null {
  const args = call.args ?? [];
  if (fn.name === "pay" || fn.name === "addToBalanceOf") {
    const token = fn.inputs.findIndex((input) => input.name === "token");
    const amount = fn.inputs.findIndex((input) => input.name === "amount");
    if (token < 0 || amount < 0) return null;
    const native =
      typeof args[token] === "string" &&
      (args[token] as string).toLowerCase() === NATIVE_TOKEN.toLowerCase();
    return tokenAmount(
      call.chainId,
      args[token],
      native ? (call.value ?? 0n) : args[amount],
    );
  }
  const tokenCall = tokenCallOf(fn);
  if (tokenCall?.amount === undefined) return null;
  return tokenAmount(
    call.chainId,
    tokenCall.token === undefined ? call.to : args[tokenCall.token],
    args[tokenCall.amount],
  );
}

/** An approval of the type's largest amount, which never runs down. */
function isUnlimitedApproval(
  call: TransactionReviewCall,
  fn: AbiFunction,
): boolean {
  const tokenCall = tokenCallOf(fn);
  if (tokenCall?.spender === undefined || tokenCall.amount === undefined) {
    return false;
  }
  const bits = BigInt(fn.inputs[tokenCall.amount].type.slice(4) || 256);
  return call.args?.[tokenCall.amount] === (1n << bits) - 1n;
}

/** An address the app does not name, other than zero, which grants nothing. */
function isUnnamed(chainId: number, address: unknown): boolean {
  return (
    typeof address === "string" &&
    !/^0x0{40}$/iu.test(address) &&
    knownAddressName(chainId, address) === null
  );
}

/**
 * An operator grant, or an approval, permit or approval for all that lets an
 * address the app does not name move the signer's tokens. A zero ERC-20
 * approval revokes and grants nothing, but only once the token is known to
 * be ERC-20: to ERC-721, zero is a token ID. {@link enrichReviewModel}
 * clears the grant when it confirms the token.
 */
function grantsPermission(
  call: TransactionReviewCall,
  fn: AbiFunction,
): boolean {
  if (fn.name === "setPermissionsFor") return true;
  if (fn.name === "setApprovalForAll") {
    return call.args?.[1] === true && isUnnamed(call.chainId, call.args[0]);
  }
  const tokenCall = tokenCallOf(fn);
  if (tokenCall?.spender === undefined) return false;
  return (
    isUnnamed(call.chainId, call.args?.[tokenCall.spender]) &&
    (tokenCall.amount === undefined ||
      call.args?.[tokenCall.amount] !== 0n ||
      mayBeTokenId(call, fn))
  );
}

/** An ERC-20 reading of a call ERC-721 shares, to a contract the SDK does not know. */
function mayBeTokenId(call: TransactionReviewCall, fn: AbiFunction): boolean {
  const tokenCall = tokenCallOf(fn);
  return (
    tokenCall?.sharedWithErc721 === true &&
    tokenCall.amount !== undefined &&
    knownAddressName(call.chainId, call.to) === null
  );
}

/** The NFT a call names where its ABI calls the argument a token ID. */
function nftOf(
  call: TransactionReviewCall,
  fn: AbiFunction,
): ReviewCallModel["nft"] {
  const tokenCall = tokenCallOf(fn);
  const tokenId =
    tokenCall?.tokenId === undefined ? null : call.args?.[tokenCall.tokenId];
  return typeof tokenId === "bigint" ? { token: call.to, tokenId } : null;
}

function reviewArguments(
  call: TransactionReviewCall,
  fn: AbiFunction,
): ReviewArgument[] {
  const values = call.args ?? [];
  const plain = fn.inputs.map(
    (input, index): ReviewArgument => ({
      ...reviewValue(input, values[index], call.chainId),
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
  const contractName =
    call.contractName ?? knownAddressName(call.chainId, call.to);
  if (contractName === null && call.data.length >= 10) {
    warnings.push({ code: "unknown-contract", text: UNKNOWN_CONTRACT });
  }
  if (fn && isUnlimitedApproval(call, fn)) {
    warnings.push({ code: "unlimited-approval", text: UNLIMITED_APPROVAL });
  }
  if (fn && OWNER_ACTIONS.has(fn.name)) {
    warnings.push({ code: "owner-action", text: OWNER_ACTION });
  }
  if (fn && grantsPermission(call, fn)) {
    warnings.push({ code: "permission-grant", text: PERMISSION_GRANT });
  }
  if (fn && mayBeTokenId(call, fn)) {
    warnings.push({ code: "possible-token-id", text: POSSIBLE_TOKEN_ID });
  }
  const amount = fn ? tokenAmountOf(call, fn) : null;
  const tokenAmounts = amount ? [amount] : [];
  return {
    chainId: call.chainId,
    from: call.from ?? null,
    to: call.to,
    contractName,
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
    roles: fn ? reviewRoles(call, fn) : [],
    tokenAmounts,
    nft: fn ? nftOf(call, fn) : null,
    warnings: withDecimalsWarning(warnings, tokenAmounts),
  };
}

/**
 * JSON-ready data with object keys sorted at every depth, so equal data
 * encodes alike, and a bigint tagged as `{ $bigint }` so it never encodes like
 * a string. A key that starts with `$` gains another, so no input can forge
 * the tag. Anything JSON would not keep exactly (a boxed primitive, a class
 * instance, a non-finite number) throws rather than bind as something else.
 */
function canonical(value: unknown): unknown {
  if (typeof value === "bigint") return { $bigint: value.toString() };
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new Error(`The review cannot bind the number ${value}.`);
  }
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error("The review can only bind plain data.");
    }
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [
          key.startsWith("$") ? `$${key}` : key,
          canonical((value as Record<string, unknown>)[key]),
        ]),
    );
  }
  return value;
}

/** What a call sends, and the decoded calls the review shows inside it. */
function bindingCall(call: TransactionReviewCall): unknown {
  return {
    chainId: call.chainId,
    from: call.from ?? null,
    to: call.to,
    value: call.value ?? 0n,
    gas: call.gas ?? null,
    safeTxGas: call.safeTxGas ?? null,
    data: call.data,
    calls: call.calls?.length ? call.calls.map(bindingCall) : null,
  };
}

/**
 * The plain-data review of a request: what every client's review dialog
 * shows, decoded once. `context` is display only and never feeds `calls`.
 * It never throws: a request it can't read or bind exactly gets a model with
 * an `unreadable` warning, showing what it can read, and an id that matches
 * no other model. Core's own prompts refuse such a model: it confirms nothing.
 */
export function buildReviewModel(
  request: TransactionReviewRequest,
): ReviewModel {
  try {
    return readModel(request);
  } catch {
    try {
      return unreadableModel(request);
    } catch {
      // Even its parts can't be read: the warning alone.
      return unreadableModel(null);
    }
  }
}

function readModel(request: TransactionReviewRequest): ReviewModel {
  // Copies, so the request changing after review never changes what the model shows.
  const signatures = (request.signatures ?? []).map(reviewSignature);
  const signsMessage =
    (request.authorization as { kind?: unknown } | undefined)?.kind ===
    "message";
  const kind =
    request.kind === "authorization"
      ? signsMessage
        ? "message"
        : "authorization"
      : !request.calls.length && signatures.length
        ? signatures.every((signature) => signature.kind === "message")
          ? "message"
          : "authorization"
        : "transaction";
  const context = (request.context ?? []).map((row) => ({
    ...row,
    ...(row.lines ? { lines: [...row.lines] } : {}),
  }));
  const authorization = structuredClone(request.authorization ?? null);
  const messages = signatures.filter((signature) => signature.message !== null);
  const message = messages.length === 1 ? messages[0].message : null;
  const binding = {
    kind,
    calls: request.calls.map(bindingCall),
    authorization,
    message,
    context,
    ...(signatures.length
      ? {
          signatures: signatures.map((signature, index) => ({
            kind: signature.kind,
            chainId: signature.chainId,
            typedData: signature.typedData,
            message: signature.message,
            calls: (request.signatures![index].calls ?? []).map(bindingCall),
          })),
        }
      : {}),
  };
  return {
    id: keccak256(toHex(JSON.stringify(canonical(binding)))),
    kind,
    title: request.title ?? null,
    description: reviewDescription(request),
    confirmLabel: request.confirmLabel ?? null,
    context,
    calls: request.calls.map(reviewCall),
    authorization,
    message,
    signatures,
    rawJson: transactionReviewJson(request),
    warnings: [],
  };
}

/** `read()`, or `fallback` when it throws. */
function attempt<T>(read: () => T, fallback: T): T {
  try {
    return read();
  } catch {
    return fallback;
  }
}

const text = (value: unknown): string =>
  typeof value === "string" ? value : "";

/** The parts of a request {@link readModel} could not take whole, each read on its own. */
function unreadableModel(input: unknown): ReviewModel {
  const request = (input && typeof input === "object" ? input : {}) as Record<
    string,
    unknown
  >;
  const list = (value: unknown): unknown[] =>
    Array.isArray(value) ? value : [];
  const warning: ReviewWarning = { code: "unreadable", text: UNREADABLE };
  return {
    id: keccak256(toHex(globalThis.crypto.randomUUID())),
    kind: request.kind === "authorization" ? "authorization" : "transaction",
    title: typeof request.title === "string" ? request.title : null,
    description: attempt(
      () => reviewDescription(request as TransactionReviewRequest),
      "",
    ),
    confirmLabel:
      typeof request.confirmLabel === "string" ? request.confirmLabel : null,
    context: list(request.context).map((row) => {
      const item = (row ?? {}) as Record<string, unknown>;
      return {
        label: text(item.label),
        value: text(item.value),
        ...(Array.isArray(item.lines) ? { lines: item.lines.map(text) } : {}),
        ...(typeof item.note === "string" ? { note: item.note } : {}),
        ...(item.strong === true ? { strong: true } : {}),
        ...(item.mono === true ? { mono: true } : {}),
      };
    }),
    calls: list(request.calls).map(
      (call) =>
        attempt<ReviewCallModel | null>(
          () => reviewCall(call as TransactionReviewCall),
          null,
        ) ?? rawCall(call),
    ),
    authorization: attempt(
      () => structuredClone(request.authorization ?? null),
      null,
    ),
    message: null,
    signatures: list(request.signatures).flatMap((signature) =>
      attempt(
        () => [reviewSignature(signature as TransactionReviewSignature)],
        [],
      ),
    ),
    rawJson: attempt(
      () => transactionReviewJson(request as TransactionReviewRequest),
      "",
    ),
    warnings: [warning],
  };
}

/** A call {@link reviewCall} could not read: its destination, value and bytes, as far as they read. */
function rawCall(input: unknown): ReviewCallModel {
  const call = (input ?? {}) as Record<string, unknown>;
  const data =
    typeof call.data === "string" && /^0x[\da-f]*$/iu.test(call.data)
      ? (call.data as Hex)
      : "0x";
  const value = typeof call.value === "bigint" ? call.value : 0n;
  return {
    chainId: typeof call.chainId === "number" ? call.chainId : 0,
    from: null,
    to: text(call.to) as Address,
    contractName: null,
    value,
    valueText: nativeValue(value),
    gas: null,
    safeTxGas: null,
    label: typeof call.label === "string" ? call.label : null,
    functionName: null,
    selector: data.slice(0, 10) as Hex,
    byteLength: (data.length - 2) / 2,
    args: null,
    calls: null,
    roles: [],
    tokenAmounts: [],
    nft: null,
    warnings: [{ code: "unreadable", text: UNREADABLE }],
  };
}

function reviewSignature(
  signature: TransactionReviewSignature,
): ReviewSignatureModel {
  return {
    kind: signature.kind,
    chainId: signature.chainId,
    typedData: structuredClone(signature.typedData ?? null),
    message: signature.message ?? null,
    calls: (signature.calls ?? []).map(reviewCall),
    steps: structuredClone([...(signature.steps ?? [])]),
  };
}

/** `warnings` with one `decimals-unknown` last when any amount's decimals are unknown. */
function withDecimalsWarning(
  warnings: readonly ReviewWarning[],
  tokenAmounts: readonly ReviewTokenAmount[],
): ReviewWarning[] {
  const kept = warnings.filter(
    (warning) => warning.code !== "decimals-unknown",
  );
  return tokenAmounts.some((amount) => amount.decimals === null)
    ? [...kept, { code: "decimals-unknown", text: DECIMALS_UNKNOWN }]
    : kept;
}

type TokenReader = Pick<PublicClient, "readContract">;

const ERC165_ABI = [
  {
    type: "function",
    name: "supportsInterface",
    stateMutability: "view",
    inputs: [{ name: "interfaceId", type: "bytes4" }],
    outputs: [{ type: "bool" }],
  },
] as const;

const ERC721_INTERFACE_ID = "0x80ac58cd";

type TokenRead = Pick<ReviewTokenAmount, "decimals" | "symbol"> & {
  /** Whether the contract says it is ERC-721; null when not asked or it did not answer. */
  erc721: boolean | null;
};

/**
 * A token's decimals and symbol, and when `probe` is set whether it is
 * ERC-721. Each is null when its read fails or returns something else.
 */
async function readToken(
  client: TokenReader | undefined,
  token: Address,
  probe: boolean,
): Promise<TokenRead> {
  if (!client) return { decimals: null, symbol: null, erc721: null };
  const read = async (request: () => Promise<unknown>): Promise<unknown> => {
    try {
      return await request();
    } catch {
      return null;
    }
  };
  const [decimals, symbol, erc721] = await Promise.all([
    read(() =>
      client.readContract({
        address: token,
        abi: erc20Abi,
        functionName: "decimals",
      }),
    ),
    read(() =>
      client.readContract({
        address: token,
        abi: erc20Abi,
        functionName: "symbol",
      }),
    ),
    probe
      ? read(() =>
          client.readContract({
            address: token,
            abi: ERC165_ABI,
            functionName: "supportsInterface",
            args: [ERC721_INTERFACE_ID],
          }),
        )
      : null,
  ]);
  return {
    erc721: typeof erc721 === "boolean" ? erc721 : null,
    decimals:
      typeof decimals === "number" &&
      Number.isInteger(decimals) &&
      decimals >= 0 &&
      decimals <= 255
        ? decimals
        : null,
    symbol:
      typeof symbol === "string" && symbol.trim() && symbol.length <= 32
        ? symbol.trim()
        : null,
  };
}

/** Every call the model shows, the ones inside other calls and arguments included. */
function eachCall(
  calls: readonly ReviewCallModel[],
  visit: (call: ReviewCallModel) => void,
): void {
  for (const call of calls) {
    visit(call);
    eachCall(call.calls ?? [], visit);
    for (const argument of call.args ?? []) {
      eachCall(argument.nested ?? [], visit);
    }
  }
}

/**
 * The model with each token's decimals and symbol read from the token, once
 * per token per chain. A failed read leaves them null, never zero, and keeps
 * the `decimals-unknown` warning. A call ERC-721 shares, to an unknown
 * contract, also asks the contract whether it is ERC-721: a yes shows the
 * number as the NFT's token ID; a no, or decimals it answers, clears
 * `possible-token-id`; no answer keeps it. The id is unchanged: the reads
 * only explain the calls already bound.
 */
export async function enrichReviewModel(
  model: ReviewModel,
  clientFor: (chainId: number) => TokenReader | undefined,
): Promise<ReviewModel> {
  const wanted = new Map<
    string,
    { chainId: number; token: Address; probe: boolean }
  >();
  const key = (chainId: number, token: Address) =>
    `${chainId}:${token.toLowerCase()}`;
  const probes = (call: ReviewCallModel) =>
    call.warnings.some((warning) => warning.code === "possible-token-id");
  const signed = model.signatures.flatMap((signature) => signature.calls);
  eachCall([...model.calls, ...signed], (call) => {
    for (const { token, decimals, symbol } of call.tokenAmounts) {
      if (token === "native" || (decimals !== null && symbol !== null)) {
        continue;
      }
      const id = key(call.chainId, token);
      const probe =
        probes(call) && token.toLowerCase() === call.to.toLowerCase();
      const seen = wanted.get(id);
      wanted.set(id, {
        chainId: call.chainId,
        token,
        probe: probe || (seen?.probe ?? false),
      });
    }
  });
  const read = new Map(
    await Promise.all(
      [...wanted].map(async ([id, { chainId, token, probe }]) => {
        let client: TokenReader | undefined;
        try {
          client = clientFor(chainId);
        } catch {
          client = undefined;
        }
        return [id, await readToken(client, token, probe)] as const;
      }),
    ),
  );
  const enrich = (call: ReviewCallModel): ReviewCallModel => {
    const nested = {
      args:
        call.args?.map((argument) =>
          argument.nested
            ? { ...argument, nested: argument.nested.map(enrich) }
            : argument,
        ) ?? null,
      calls: call.calls?.map(enrich) ?? null,
    };
    const target = probes(call) ? read.get(key(call.chainId, call.to)) : null;
    if (target?.erc721 === true) {
      const [{ amount: tokenId }] = call.tokenAmounts;
      const cleared = new Set<ReviewWarningCode>([
        "possible-token-id",
        "unlimited-approval",
        "decimals-unknown",
      ]);
      return {
        ...call,
        ...nested,
        tokenAmounts: [],
        nft: { token: call.to, tokenId },
        warnings: call.warnings.filter((warning) => !cleared.has(warning.code)),
      };
    }
    // Decimals it answers, and no ERC-721 yes, confirm ERC-20: a zero
    // approval then revokes rather than grants.
    const revokes =
      target?.decimals !== null &&
      target?.decimals !== undefined &&
      call.tokenAmounts[0]?.amount === 0n;
    const warnings =
      target && (target.erc721 === false || target.decimals !== null)
        ? call.warnings.filter(
            (warning) =>
              warning.code !== "possible-token-id" &&
              !(revokes && warning.code === "permission-grant"),
          )
        : call.warnings;
    const tokenAmounts = call.tokenAmounts.map((amount) => {
      const found =
        amount.token === "native"
          ? undefined
          : read.get(key(call.chainId, amount.token));
      return found
        ? {
            ...amount,
            decimals: amount.decimals ?? found.decimals,
            symbol: amount.symbol ?? found.symbol,
          }
        : amount;
    });
    return {
      ...call,
      ...nested,
      tokenAmounts,
      warnings: withDecimalsWarning(warnings, tokenAmounts),
    };
  };
  return {
    ...model,
    calls: model.calls.map(enrich),
    signatures: model.signatures.map((signature) => ({
      ...signature,
      calls: signature.calls.map(enrich),
    })),
  };
}
