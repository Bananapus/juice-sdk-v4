import { Hex, decodeAbiParameters } from "viem";

/** What a viem or wallet error says about a revert, however deeply nested. */
interface RevertEvidence {
  /** Revert data the error carries as a value of its own. */
  payloads: string[];
  /** Decoded errors, with their arguments when the decoder kept them. */
  decoded: { name: string; args?: readonly unknown[] }[];
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
    evidence.decoded.push({
      name: record.errorName,
      ...(Array.isArray(record.args) ? { args: record.args } : {}),
    });
  }
  const next = (item: unknown, message: boolean) =>
    collectEvidence(item, evidence, message, seen, depth + 1);
  for (const item of [record.raw, record.data, record.signature]) {
    next(item, false);
  }
  for (const item of [record.shortMessage, record.message, record.details]) {
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
const ALLOWANCE_MESSAGE =
  "The token approval is less than the payment, so approve the full amount and try again.";
const UNEXPECTED_ETH_MESSAGE = "A payment in this token cannot also send ETH.";

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

/**
 * The first known revert in an error. Revert data, in its own field or quoted
 * in the error's text, counts only as a bare selector or a selector with
 * exactly its arguments, never as the start of a longer value such as an
 * address or calldata, and the request viem quotes is left out. Amounts come
 * from revert data or a decoded error; otherwise a selector or a whole error
 * name names the reason alone.
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
  // viem quotes the request (its body, and the call and its arguments); only
  // the rest describes the revert.
  const text = messages
    .join("\n")
    .replace(/request body:[^\n]*/gi, "")
    .replace(
      /(?:contract call|raw call arguments):[\s\S]*?(?:\n\s*\n|$)/gi,
      "",
    );
  const quoted = [
    ...text.matchAll(
      /(?<![0-9a-fx])0x[0-9a-f]{8}(?:[0-9a-f]{64})*(?![0-9a-f])/gi,
    ),
  ].map(([hex]) => hex);
  const found = [...payloads, ...quoted].map(exact).filter((m) => !!m);
  const withArgs = found.find((m) => m.args);
  if (withArgs) return withArgs;
  for (const { name, args } of decoded) {
    const match = known.find(
      (k) => k.name.toLowerCase() === name.toLowerCase(),
    );
    if (match) return { known: match, ...(args ? { args } : {}) };
  }
  if (found[0]) return found[0];
  const match = known.find((k) =>
    new RegExp(`\\b${k.name}\\b`, "i").test(text),
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
