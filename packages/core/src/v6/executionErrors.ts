import { Hex, decodeAbiParameters } from "viem";

/** Every message, error name and revert payload in a viem or wallet error, however deeply nested. */
function collectErrorText(
  value: unknown,
  seen = new Set<unknown>(),
  depth = 0,
): string[] {
  if (depth > 8 || value === null || value === undefined || seen.has(value)) {
    return [];
  }
  if (typeof value === "string") return [value];
  if (typeof value !== "object") return [];
  seen.add(value);
  const record = value as Record<string, unknown>;
  return [
    record.shortMessage,
    record.message,
    record.details,
    record.errorName,
    record.signature,
    record.raw,
    record.data,
    record.cause,
    record.error,
  ].flatMap((item) => collectErrorText(item, seen, depth + 1));
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
  | "BALANCE_TOO_LOW"
  | "UNEXPECTED_ETH"
  | "NFT_SOLD_OUT"
  | "NFT_UNAVAILABLE"
  | "NFT_PRICE_ABOVE_PAYMENT"
  | "NFT_OVERSPENDING";

/**
 * A decoded payment revert. `received` and `minimum` are set when the
 * payment fell short of a minimum: the payer can lower `minReturnedTokens`
 * (or raise the slippage it was floored by) and retry.
 */
export interface PayFailure {
  reason: PayFailureReason;
  /** What the payment would have settled, in the minimum's units. */
  received?: bigint;
  /** The minimum it fell short of. */
  minimum?: bigint;
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
}

const LOWER_MINIMUM = "so lower your minimum or try again.";

const KNOWN_REVERTS: readonly KnownRevert[] = [
  {
    reason: "BUYBACK_SLIPPAGE_EXCEEDED",
    name: "JBBuybackHook_SpecifiedSlippageExceeded",
    selector: "0xe2d708a9",
    params: ["uint256", "uint256"],
    shortfall: [0, 1],
    message: `The price moved and this payment would get fewer tokens than your minimum, ${LOWER_MINIMUM}`,
  },
  {
    reason: "TERMINAL_UNDER_MIN",
    name: "JBMultiTerminal_UnderMin",
    selector: "0x6b2bb382",
    params: ["uint256", "uint256"],
    shortfall: [0, 1],
    message: `This payment would get fewer tokens than your minimum, ${LOWER_MINIMUM}`,
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
    message:
      "The price moved while converting your payment, so raise your slippage or try again.",
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
    message:
      "The token approval is less than the payment, so approve the full amount and try again.",
  },
  {
    reason: "ALLOWANCE_TOO_LOW",
    name: "ERC20InsufficientAllowance",
    selector: "0xfb8f41b2",
    params: ["address", "uint256", "uint256"],
    message:
      "The token approval is less than the payment, so approve the full amount and try again.",
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
    message: "A payment in this token cannot also send ETH.",
  },
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

/**
 * The first known revert in an error: its full revert data when present, so
 * the amounts decode, else its selector or error name alone.
 */
export function matchKnownRevert(
  error: unknown,
  reasons?: readonly PayFailureReason[],
): { known: KnownRevert; args?: readonly unknown[] } | null {
  const known = reasons
    ? KNOWN_REVERTS.filter((k) => reasons.includes(k.reason))
    : KNOWN_REVERTS;
  const text = collectErrorText(error).join(" | ").toLowerCase();
  if (!text) return null;
  for (const [hex] of text.matchAll(/0x[0-9a-f]{8,}/g)) {
    const match = known.find((k) => hex.startsWith(k.selector));
    const end = 10 + 64 * (match?.params.length ?? 0);
    if (!match || hex.length < end) continue;
    const args = decodeAbiParameters(
      match.params.map((type) => ({ type })),
      `0x${hex.slice(10, end)}`,
    );
    return { known: match, args };
  }
  const match = known.find(
    (k) => text.includes(k.selector) || text.includes(k.name.toLowerCase()),
  );
  return match ? { known: match } : null;
}

/**
 * Decode why a payment reverted, from a simulation or transaction error
 * (viem or wallet, however nested) or raw revert data. Covers the terminal's
 * minimum, the buyback hook's minimum and floor, the router's conversion,
 * paused or unready projects, token approvals and balances, and NFT tiers.
 * A shortfall carries `received` and `minimum`, so the payer can lower the
 * minimum and retry. Unknown reverts return null.
 */
export function decodePayFailure(error: unknown): PayFailure | null {
  const matched = matchKnownRevert(error);
  if (!matched) return null;
  const { known, args } = matched;
  const failure: PayFailure = { reason: known.reason, message: known.message };
  if (known.shortfall && args) {
    failure.received = args[known.shortfall[0]] as bigint;
    failure.minimum = args[known.shortfall[1]] as bigint;
  }
  return failure;
}
