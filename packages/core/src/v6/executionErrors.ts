import {
  Hex,
  decodeAbiParameters,
  encodeAbiParameters,
  isAddress,
  keccak256,
  maxUint256,
} from "viem";

/** Nonempty hex: revert data, well formed or not, even short of a selector. */
const REVERT_DATA = /^0x[0-9a-f]+$/i;

/**
 * What a viem or wallet error carries about a revert, however deeply nested:
 * revert data in its own fields, and errors a decoder such as viem typed.
 * Text is never read: an `Error(string)` reason, a request or a call's
 * arguments can spell any error name or revert data.
 */
function collectEvidence(
  value: unknown,
  evidence: {
    payloads: string[];
    decoded: { errorName: string; abiItem: unknown; args: unknown }[];
  } = { payloads: [], decoded: [] },
  seen = new Set<unknown>(),
  depth = 0,
) {
  if (depth > 8 || value === null || value === undefined || seen.has(value)) {
    return evidence;
  }
  if (typeof value === "string") {
    if (REVERT_DATA.test(value)) evidence.payloads.push(value);
    return evidence;
  }
  if (typeof value !== "object") return evidence;
  seen.add(value);
  const record = value as Record<string, unknown>;
  if (typeof record.errorName === "string") {
    evidence.decoded.push({
      errorName: record.errorName,
      abiItem: record.abiItem,
      args: record.args,
    });
  }
  for (const item of [record.raw, record.data, record.cause, record.error]) {
    collectEvidence(item, evidence, seen, depth + 1);
  }
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
 * The setting a payer can relax so a retry clears the failing check.
 * `minimum` is the payer's token minimum: the terminal's `minReturnedTokens`
 * (`TERMINAL_UNDER_MIN`) or the buyback hook's explicit minimum in the pay
 * metadata (`BUYBACK_SLIPPAGE_EXCEEDED`). `prepareUserPay` floors both by its
 * `slippageBps`, so the fix is preparing again with the larger tolerance
 * {@link payRetrySlippageBps} gives; lowering only `minReturnedTokens` leaves
 * the hook's minimum where it was. Buyback hooks before 1.4 raise the same
 * error for a floor they derive from their own price oracle, which no
 * tolerance moves: the fresh preparation's simulation shows that. The
 * router's conversion minimum is never adjustable: the router can derive it
 * itself.
 */
export type PayFailureAdjustable = "minimum";

/**
 * A decoded payment revert. `received` and `minimum` are set when the
 * payment fell short of a minimum, in that check's units (for the router,
 * the token it converts into), and `adjustable` names the setting a retry
 * can relax, if any.
 */
export interface PayFailure {
  reason: PayFailureReason;
  /** What the payment would have settled, in the minimum's units. */
  received?: bigint;
  /** The minimum it fell short of. */
  minimum?: bigint;
  /**
   * Set with `received`: true when the failing check settled nothing, so a
   * lower minimum is no fix and `message` does not suggest one. For the
   * buyback hook that is the part it checked, not always the whole payment.
   * Absent means unknown, not a fill.
   */
  zeroFill?: boolean;
  /**
   * Set only with a nonzero `received` below `minimum`: the setting the payer
   * can relax so a retry clears the failing check. Absent when no setting
   * the payer controls would help; never relax anything without it.
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
  /** Argument positions of the settled amount and the minimum it missed, which every such revert has below the minimum. */
  shortfall?: readonly [number, number];
  message: string;
  /** The setting the payer can relax, which `message` suggests. */
  adjustable?: PayFailureAdjustable;
  /** The message when the shortfall settled nothing, since relaxing `adjustable` would not help. */
  zeroMessage?: string;
}

const PERMIT_MESSAGE =
  "The signed token permit covers less than the payment, so sign it again for the full amount.";
/** A shortfall known only by its selector: no amounts to say a lower minimum helps. */
const SHORTFALL_MESSAGE =
  "This payment would get fewer tokens than its minimum, so try again.";
/** `JBRouterTerminalGateway_RouteFailed(bytes32 errorHash)`: the hash is the inner revert's selector's. */
const ROUTE_FAILED = "0xa4ceb15e";
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
    message:
      "The price moved and this payment would get fewer tokens than your minimum, so lower your minimum or try again.",
    // The hook checks only the part it buys with; the rest can still mint.
    zeroMessage:
      "The price moved and the part of this payment that buys tokens would get none, so try again.",
  },
  {
    reason: "TERMINAL_UNDER_MIN",
    name: "JBMultiTerminal_UnderMin",
    selector: "0x6b2bb382",
    params: ["uint256", "uint256"],
    shortfall: [0, 1],
    adjustable: "minimum",
    message:
      "This payment would get fewer tokens than your minimum, so lower your minimum or try again.",
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
    message: "The price moved while converting your payment, so try again.",
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
    message: PERMIT_MESSAGE,
  },
  {
    reason: "ALLOWANCE_TOO_LOW",
    name: "ERC20InsufficientAllowance",
    selector: "0xfb8f41b2",
    params: ["address", "uint256", "uint256"],
    message:
      "The token approval is less than the payment, so approve the full amount and try again.",
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
      message: PERMIT_MESSAGE,
    }),
  ),
  {
    reason: "ALLOWANCE_TOO_LOW",
    name: "InsufficientAllowance",
    selector: "0xf96fb071",
    params: ["uint256"],
    message:
      "The Permit2 allowance is less than the payment, so approve the full amount again.",
  },
  {
    reason: "ALLOWANCE_EXPIRED",
    name: "AllowanceExpired",
    selector: "0xd81b2f2e",
    params: ["uint256"],
    message: "The Permit2 approval has expired, so approve it again and retry.",
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
    message:
      "This payment, with any NFT credits you hold, is more than the NFTs you picked cost, and the extra is not allowed.",
  },
];

/**
 * Arguments that have exactly the known revert's ABI types, and for a
 * shortfall a settled amount below its minimum, or undefined.
 */
function validArgs(known: KnownRevert, args: unknown) {
  if (!Array.isArray(args) || args.length !== known.params.length) return;
  const typed = known.params.every((type, i) =>
    type === "address"
      ? typeof args[i] === "string" && isAddress(args[i], { strict: false })
      : typeof args[i] === "bigint" && args[i] >= 0n && args[i] <= maxUint256,
  );
  if (!typed) return;
  if (known.shortfall && args[known.shortfall[0]] >= args[known.shortfall[1]]) {
    return;
  }
  return args as readonly unknown[];
}

/**
 * The first known revert in an error: revert data that is a known selector
 * and exactly its canonically encoded arguments, or the router gateway's
 * `RouteFailed` naming a known selector (with no arguments), or, when the error carries
 * no revert data, an error viem typed against the known ABI item (same name
 * and input types) with arguments of those types. Either way a shortfall
 * must settle below its minimum. Text never counts.
 */
export function matchKnownRevert(
  error: unknown,
  reasons?: readonly PayFailureReason[],
): { known: KnownRevert; args?: readonly unknown[] } | null {
  const known = reasons
    ? KNOWN_REVERTS.filter((k) => reasons.includes(k.reason))
    : KNOWN_REVERTS;
  const { payloads, decoded } = collectEvidence(error);
  for (const hex of payloads) {
    const lower = hex.toLowerCase();
    // The router gateway wraps a failed route, keeping only its selector.
    if (lower.startsWith(ROUTE_FAILED) && lower.length === 10 + 64) {
      const errorHash = `0x${lower.slice(10)}`;
      const wrapped = known.find((k) => keccak256(k.selector) === errorHash);
      if (wrapped) return { known: wrapped };
      continue;
    }
    const match = known.find(
      (k) =>
        lower.startsWith(k.selector) &&
        lower.length === 10 + 64 * k.params.length,
    );
    if (!match) continue;
    const params = match.params.map((type) => ({ type }));
    const data = `0x${lower.slice(10)}` as const;
    const args = validArgs(match, decodeAbiParameters(params, data));
    // Canonical encoding only: an address word with nonzero padding is not one.
    if (args && encodeAbiParameters(params, args as never) === data) {
      return { known: match, args };
    }
  }
  // Revert data, when the error carries any, is the evidence: viem types an
  // error from data with padding or trailing bytes this table rejects, even
  // bytes short of a word.
  if (payloads.length) return null;
  for (const { errorName, abiItem, args } of decoded) {
    const item = abiItem as {
      type?: unknown;
      name?: unknown;
      inputs?: { type?: unknown }[];
    } | null;
    const match = known.find(
      (k) =>
        errorName === k.name &&
        item?.type === "error" &&
        item.name === k.name &&
        Array.isArray(item.inputs) &&
        item.inputs.length === k.params.length &&
        k.params.every((type, i) => item.inputs?.[i]?.type === type),
    );
    const valid = match && validArgs(match, args);
    if (match && valid) return { known: match, args: valid };
  }
  return null;
}

/**
 * Decode why a payment reverted, from a simulation or transaction error
 * (viem or wallet, however nested) or raw revert data. Covers the terminal's
 * minimum, the buyback hook's minimum and floor, the router's conversion,
 * paused or unready projects, token approvals and balances, and NFT tiers.
 * A shortfall carries `received` and `minimum`, and `adjustable` when the
 * payer can relax a setting and retry; `zeroFill` says the failing check
 * settled nothing, which no setting fixes. Unknown reverts return null.
 */
export function decodePayFailure(error: unknown): PayFailure | null {
  const matched = matchKnownRevert(error);
  if (!matched) return null;
  const { known, args } = matched;
  if (!known.shortfall) return { reason: known.reason, message: known.message };
  if (!args) {
    return {
      reason: known.reason,
      message: known.adjustable ? SHORTFALL_MESSAGE : known.message,
    };
  }
  const received = args[known.shortfall[0]] as bigint;
  const minimum = args[known.shortfall[1]] as bigint;
  const zeroFill = received === 0n;
  return {
    reason: known.reason,
    received,
    minimum,
    zeroFill,
    ...(!zeroFill && known.adjustable ? { adjustable: known.adjustable } : {}),
    message: (zeroFill && known.zeroMessage) || known.message,
  };
}

/**
 * The most tolerance {@link payRetrySlippageBps} offers: 49.5%, so a
 * loosened minimum stays above half the quote and never nears zero. Only
 * that helper applies it; `prepareUserPay`
 * takes any tolerance it is given.
 */
export const PAY_MAX_SLIPPAGE_BPS = 4_950n;

/**
 * A candidate slippage tolerance, in basis points, for retrying a payment
 * that `prepareUserPay` prepared with `currentBps` and that fell short of its
 * minimum: the current tolerance plus the shortfall, rounded up to a half
 * percent and capped at {@link PAY_MAX_SLIPPAGE_BPS}. Below the cap, a
 * terminal minimum that is one slippage floor of a quote (the fallback
 * minimum) would have been floored at or below what settled. A terminal
 * minimum that adds issuance to a floored quote, and any candidate at the
 * cap, may still fall short. Null unless the failure is `adjustable` by the
 * minimum with a nonzero shortfall, or when the cap leaves nothing looser.
 *
 * It is a candidate, not permission: pass the tolerance of the attempt that
 * failed (never reapply one failure to the last result, which ratchets to the
 * cap), offer it only within what the payer agreed to, show the new minimum,
 * and prepare and simulate the payment again before sending it.
 */
export function payRetrySlippageBps(
  failure: PayFailure | null,
  currentBps: bigint,
): bigint | null {
  if (failure?.adjustable !== "minimum" || currentBps < 0n) return null;
  const { received, minimum } = failure;
  if (
    typeof received !== "bigint" ||
    typeof minimum !== "bigint" ||
    received <= 0n ||
    received >= minimum
  ) {
    return null;
  }
  const shortfallBps =
    ((minimum - received) * 10_000n + minimum - 1n) / minimum;
  const stepped = ((currentBps + shortfallBps + 49n) / 50n) * 50n;
  const next = stepped < PAY_MAX_SLIPPAGE_BPS ? stepped : PAY_MAX_SLIPPAGE_BPS;
  return next > currentBps ? next : null;
}
