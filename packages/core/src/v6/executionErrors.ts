import { Hex, decodeAbiParameters, isAddress, maxUint256 } from "viem";

/** What a viem or wallet error says about a revert, however deeply nested. */
interface RevertEvidence {
  /** Revert data the error carries as a value of its own. */
  payloads: string[];
  /** Errors a decoder such as viem typed, with the ABI item it decoded against. */
  decoded: { abiItem: unknown; args: unknown }[];
  /** Human-readable text, which can quote the request as well as the revert. */
  messages: string[];
}

const HEX = /^0x[0-9a-f]*$/i;

function collectEvidence(
  value: unknown,
  evidence: RevertEvidence,
  asMessage = false,
  seen = new Set<unknown>(),
  depth = 0,
): RevertEvidence {
  if (depth > 8 || value === null || value === undefined || seen.has(value)) {
    return evidence;
  }
  if (typeof value === "string") {
    (!asMessage && HEX.test(value)
      ? evidence.payloads
      : evidence.messages
    ).push(value);
    return evidence;
  }
  if (typeof value !== "object") return evidence;
  seen.add(value);
  const record = value as Record<string, unknown>;
  if (typeof record.errorName === "string") {
    evidence.decoded.push({ abiItem: record.abiItem, args: record.args });
  }
  const next = (item: unknown, message: boolean) =>
    collectEvidence(item, evidence, message, seen, depth + 1);
  for (const item of [record.raw, record.data, record.signature]) {
    next(item, false);
  }
  // A viem error's full message repeats the call it made, arguments and all;
  // its short message and details are the error itself.
  const message =
    typeof record.shortMessage === "string" ? undefined : record.message;
  for (const item of [record.shortMessage, message, record.details]) {
    next(item, true);
  }
  next(record.cause, false);
  next(record.error, false);
  return evidence;
}

/** Why a payment reverted, as a stable code apps and agents branch on. */
export type PayFailureReason =
  | "TERMINAL_UNDER_MIN"
  | "BUYBACK_SLIPPAGE_EXCEEDED"
  | "BUYBACK_DERIVED_FLOOR_NOT_MET"
  | "BUYBACK_SWAP_AMOUNT_TOO_HIGH"
  | "ROUTER_SLIPPAGE_EXCEEDED"
  | "ROUTER_NO_ROUTE"
  | "TOKEN_NOT_ACCEPTED"
  | "PAYMENTS_PAUSED"
  | "NO_RULESET"
  | "ALLOWANCE_TOO_LOW"
  | "ALLOWANCE_EXPIRED"
  | "BALANCE_TOO_LOW"
  | "UNEXPECTED_ETH"
  | "NFT_SOLD_OUT"
  | "NFT_UNAVAILABLE"
  | "NFT_PRICE_ABOVE_PAYMENT"
  | "NFT_OVERSPENDING";

/**
 * The setting a payer can change so a retry clears the failing check:
 * `minimum` is the payer's token minimum (the terminal's `minReturnedTokens`
 * or the buyback hook's explicit minimum, both floored by the slippage
 * `prepareUserPay` takes); `slippage` is the minimum the router
 * converts the paid token at (the payer's conversion quote; when the router
 * derived it from its own price oracle, only waiting helps).
 */
export type PayFailureAdjustable = "minimum" | "slippage";

/**
 * A decoded payment revert. `received` and `minimum` are set when the
 * payment fell short of a minimum, and `adjustable` names the setting a
 * retry can relax, if any.
 */
export interface PayFailure {
  reason: PayFailureReason;
  /** What the payment would have settled, in the minimum's units. */
  received?: bigint;
  /** The minimum it fell short of. */
  minimum?: bigint;
  /**
   * Set with `received`: true when the payment would settle nothing, so a
   * lower minimum is no fix and `message` does not suggest one.
   */
  zeroFill?: boolean;
  /**
   * Set only with a nonzero `received` below `minimum`: the setting the payer
   * can relax so a retry clears the failing check. Absent when no setting
   * the payer controls would help.
   */
  adjustable?: PayFailureAdjustable;
  /** One plain sentence to show the payer. */
  message: string;
}

interface KnownRevert {
  reason: PayFailureReason;
  name: string;
  selector: Hex;
  params: readonly ("uint256" | "address")[];
  /** Argument positions of the settled amount and the minimum it missed. */
  shortfall?: readonly [number, number];
  message: string;
  /** The setting the payer can relax, which `message` suggests. */
  adjustable?: PayFailureAdjustable;
  /** The message when the shortfall settled nothing, since relaxing `adjustable` would not help. */
  zeroMessage?: string;
}

const LOWER_MINIMUM = "so lower your minimum or try again.";
const ALLOWANCE_MESSAGE =
  "The token approval is less than the payment, so approve the full amount and try again.";
const NO_TOKENS_MESSAGE = "This payment would return no tokens.";
const UNEXPECTED_ETH_MESSAGE = "A payment in this token cannot also send ETH.";

const KNOWN_REVERTS: readonly KnownRevert[] = [
  {
    reason: "BUYBACK_SLIPPAGE_EXCEEDED",
    name: "JBBuybackHook_SpecifiedSlippageExceeded",
    selector: "0xe2d708a9",
    params: ["uint256", "uint256"],
    shortfall: [0, 1],
    adjustable: "minimum",
    message: `The price moved and this payment would get fewer tokens than your minimum, ${LOWER_MINIMUM}`,
    zeroMessage: NO_TOKENS_MESSAGE,
  },
  {
    reason: "TERMINAL_UNDER_MIN",
    name: "JBMultiTerminal_UnderMin",
    selector: "0x6b2bb382",
    params: ["uint256", "uint256"],
    shortfall: [0, 1],
    adjustable: "minimum",
    message: `This payment would get fewer tokens than your minimum, ${LOWER_MINIMUM}`,
    zeroMessage: NO_TOKENS_MESSAGE,
  },
  {
    reason: "BUYBACK_DERIVED_FLOOR_NOT_MET",
    name: "JBBuybackHook_DerivedFloorNotMet",
    selector: "0xe490a239",
    params: ["uint256", "uint256"],
    shortfall: [0, 1],
    message:
      "The token's price moved too fast to buy safely, so wait a few minutes and try again.",
  },
  {
    reason: "ROUTER_SLIPPAGE_EXCEEDED",
    name: "JBRouterTerminal_SlippageExceeded",
    selector: "0x1dbd2ab5",
    params: ["uint256", "uint256"],
    shortfall: [0, 1],
    adjustable: "slippage",
    message:
      "The price moved while converting your payment, so raise your slippage or try again.",
    zeroMessage: "Converting this payment would return nothing.",
  },
  {
    reason: "BUYBACK_SWAP_AMOUNT_TOO_HIGH",
    name: "JBBuybackHook_InsufficientPayAmount",
    selector: "0xcc8704dd",
    params: ["uint256", "uint256"],
    message: "The amount set aside to buy tokens is more than the payment.",
  },
  {
    reason: "ROUTER_NO_ROUTE",
    name: "JBRouterTerminal_NoRouteFound",
    selector: "0x52027b4a",
    params: ["uint256", "address"],
    message: "This token cannot be converted into one the project accepts.",
  },
  {
    reason: "ROUTER_NO_ROUTE",
    name: "JBRouterTerminal_NoPoolFound",
    selector: "0x04400f4a",
    params: ["address", "address"],
    message: "This token cannot be converted into one the project accepts.",
  },
  {
    reason: "TOKEN_NOT_ACCEPTED",
    name: "JBMultiTerminal_TokenNotAccepted",
    selector: "0xecb6c1d6",
    params: ["address"],
    message: "This project does not accept this token.",
  },
  {
    reason: "PAYMENTS_PAUSED",
    name: "JBTerminalStore_RulesetPaymentPaused",
    selector: "0x8dc14446",
    params: ["uint256", "uint256"],
    message: "This project is not accepting payments right now.",
  },
  {
    reason: "NO_RULESET",
    name: "JBTerminalStore_RulesetNotFound",
    selector: "0x453ebd8f",
    params: ["uint256"],
    message: "This project is not set up to accept payments yet.",
  },
  {
    reason: "ALLOWANCE_TOO_LOW",
    name: "JBMultiTerminal_PermitAllowanceNotEnough",
    selector: "0xc7e994ba",
    params: ["uint256", "uint256"],
    message: ALLOWANCE_MESSAGE,
  },
  {
    reason: "ALLOWANCE_TOO_LOW",
    name: "ERC20InsufficientAllowance",
    selector: "0xfb8f41b2",
    params: ["address", "uint256", "uint256"],
    message: ALLOWANCE_MESSAGE,
  },
  ...(
    [
      ["JBRouterTerminal_PermitAllowanceNotEnough", "0x7686b38a"],
      ["JBRouterTerminalRegistry_PermitAllowanceNotEnough", "0x3a521783"],
      ["JBRouterTerminalGateway_PermitAllowanceNotEnough", "0x0f420d6e"],
    ] as const
  ).map(
    ([name, selector]): KnownRevert => ({
      reason: "ALLOWANCE_TOO_LOW",
      name,
      selector,
      params: ["uint256", "uint256"],
      message: ALLOWANCE_MESSAGE,
    }),
  ),
  {
    reason: "ALLOWANCE_TOO_LOW",
    name: "InsufficientAllowance",
    selector: "0xf96fb071",
    params: ["uint256"],
    message: ALLOWANCE_MESSAGE,
  },
  {
    reason: "ALLOWANCE_EXPIRED",
    name: "AllowanceExpired",
    selector: "0xd81b2f2e",
    params: ["uint256"],
    message: "The token approval has expired, so approve it again and retry.",
  },
  {
    reason: "BALANCE_TOO_LOW",
    name: "ERC20InsufficientBalance",
    selector: "0xe450d38c",
    params: ["address", "uint256", "uint256"],
    message: "Your token balance is less than the payment.",
  },
  {
    reason: "UNEXPECTED_ETH",
    name: "JBMultiTerminal_NoMsgValueAllowed",
    selector: "0x3ad385fd",
    params: ["uint256"],
    message: UNEXPECTED_ETH_MESSAGE,
  },
  ...(
    [
      ["JBRouterTerminal_NoMsgValueAllowed", "0x90b2b3e2"],
      ["JBRouterTerminalRegistry_NoMsgValueAllowed", "0x0fa1a882"],
      ["JBRouterTerminalGateway_NoMsgValueAllowed", "0x49ce25f0"],
    ] as const
  ).map(
    ([name, selector]): KnownRevert => ({
      reason: "UNEXPECTED_ETH",
      name,
      selector,
      params: ["uint256"],
      message: UNEXPECTED_ETH_MESSAGE,
    }),
  ),
  {
    reason: "NFT_SOLD_OUT",
    name: "JB721TiersHookStore_InsufficientSupplyRemaining",
    selector: "0x90a08e24",
    params: ["uint256"],
    message: "One of the NFTs you picked is sold out.",
  },
  {
    reason: "NFT_UNAVAILABLE",
    name: "JB721TiersHookStore_TierRemoved",
    selector: "0x8145a027",
    params: ["uint256"],
    message: "One of the NFTs you picked is no longer available.",
  },
  {
    reason: "NFT_UNAVAILABLE",
    name: "JB721TiersHookStore_UnrecognizedTier",
    selector: "0xa6fe1eee",
    params: ["uint256"],
    message: "One of the NFTs you picked is no longer available.",
  },
  {
    reason: "NFT_PRICE_ABOVE_PAYMENT",
    name: "JB721TiersHookStore_PriceExceedsAmount",
    selector: "0xee890b46",
    params: ["uint256", "uint256"],
    message: "The payment is less than the price of the NFTs you picked.",
  },
  {
    reason: "NFT_OVERSPENDING",
    name: "JB721TiersHook_Overspending",
    selector: "0x42b9988e",
    params: ["uint256"],
    message: "This project takes only the exact price of the NFTs you pick.",
  },
];

/** A selector alone, or a selector and whole 32-byte words. */
const REVERT_SHAPE = /^0x[0-9a-f]{8}(?:[0-9a-f]{64})*$/i;

/** Arguments that have exactly the known revert's ABI types, or undefined. */
function typedArgs(known: KnownRevert, args: unknown) {
  if (!Array.isArray(args) || args.length !== known.params.length) return;
  const typed = known.params.every((type, i) =>
    type === "address"
      ? typeof args[i] === "string" && isAddress(args[i], { strict: false })
      : typeof args[i] === "bigint" && args[i] >= 0n && args[i] <= maxUint256,
  );
  return typed ? (args as readonly unknown[]) : undefined;
}

/**
 * The first known revert in an error. Only revert data or an error a decoder
 * typed against the known ABI item names a revert, never an error name in
 * text, which an `Error(string)` reason can spell. Revert data counts only
 * as a bare selector or a selector with exactly its arguments, never as the
 * start of a longer value such as an address or calldata. Revert data quoted
 * in an error's text counts only when the error carries none of its own, and
 * the call or request viem quotes is left out. Amounts come from revert data,
 * or from a typed error whose arguments have the ABI's types.
 */
export function matchKnownRevert(
  error: unknown,
  reasons?: readonly PayFailureReason[],
): { known: KnownRevert; args?: readonly unknown[] } | null {
  const known = reasons
    ? KNOWN_REVERTS.filter((k) => reasons.includes(k.reason))
    : KNOWN_REVERTS;
  const { payloads, decoded, messages } = collectEvidence(error, {
    payloads: [],
    decoded: [],
    messages: [],
  });
  // A revert is its selector alone, or its selector and exactly its arguments.
  const exact = (hex: string) => {
    const lower = hex.toLowerCase();
    const match = known.find((k) => lower.startsWith(k.selector));
    if (!match) return null;
    if (lower.length === 10) return { known: match };
    if (lower.length !== 10 + 64 * match.params.length) return null;
    const args = decodeAbiParameters(
      match.params.map((type) => ({ type })),
      `0x${lower.slice(10)}`,
    );
    return { known: match, args };
  };
  // Text is a fallback for errors that carry no revert data, such as an
  // Error(string) whose reason quotes a selector. An HTTP error's details can
  // quote the request body.
  const quoted = payloads.some((hex) => REVERT_SHAPE.test(hex))
    ? []
    : [
        ...messages
          .join("\n")
          .replace(/request body:[^\n]*/gi, "")
          .matchAll(
            /(?<![0-9a-fx])0x[0-9a-f]{8}(?:[0-9a-f]{64})*(?![0-9a-f])/gi,
          ),
      ].map(([hex]) => hex);
  const found = [...payloads, ...quoted].map(exact).filter((m) => !!m);
  const withArgs = found.find((m) => m.args);
  if (withArgs) return withArgs;
  for (const { abiItem, args } of decoded) {
    const item = abiItem as {
      type?: unknown;
      name?: unknown;
      inputs?: { type?: unknown }[];
    } | null;
    const match = known.find(
      (k) =>
        item?.type === "error" &&
        item.name === k.name &&
        Array.isArray(item.inputs) &&
        item.inputs.length === k.params.length &&
        item.inputs.every((input, i) => input?.type === k.params[i]),
    );
    if (!match) continue;
    const typed = typedArgs(match, args);
    return { known: match, ...(typed ? { args: typed } : {}) };
  }
  return found[0] ?? null;
}

/**
 * Decode why a payment reverted, from a simulation or transaction error
 * (viem or wallet, however nested) or raw revert data. Covers the terminal's
 * minimum, the buyback hook's minimum and floor, the router's conversion,
 * paused or unready projects, token approvals and balances, and NFT tiers.
 * A shortfall carries `received` and `minimum`, and `adjustable` when the
 * payer can relax a setting and retry; `zeroFill` says the payment would
 * settle nothing, which no setting fixes.
 * Unknown reverts return null.
 */
export function decodePayFailure(error: unknown): PayFailure | null {
  const matched = matchKnownRevert(error);
  if (!matched) return null;
  const { known, args } = matched;
  const failure: PayFailure = { reason: known.reason, message: known.message };
  const received = known.shortfall && (args?.[known.shortfall[0]] as bigint);
  const minimum = known.shortfall && (args?.[known.shortfall[1]] as bigint);
  // Every shortfall reverts only below its minimum; other amounts are not one.
  if (typeof received === "bigint" && typeof minimum === "bigint") {
    if (received < minimum) {
      Object.assign(failure, { received, minimum, zeroFill: received === 0n });
      if (received === 0n && known.zeroMessage) {
        failure.message = known.zeroMessage;
      } else if (received !== 0n && known.adjustable) {
        failure.adjustable = known.adjustable;
      }
    }
  }
  return failure;
}
