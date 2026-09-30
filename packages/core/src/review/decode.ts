import {
  decodeAbiParameters,
  decodeFunctionData,
  encodeAbiParameters,
  encodeFunctionData,
  erc20Abi,
  formatEther,
  toFunctionSelector,
  zeroAddress,
  type Abi,
  type AbiFunction,
  type Address,
  type Hex,
} from "viem";
import { SPLITS_TOTAL_PERCENT, USDC_ADDRESSES } from "../constants.js";
import {
  jbBuybackHookAbi,
  jbBuybackHookRegistryAbi,
  jbContractAddress,
  jbContractAddressHistory,
  jbControllerAbi,
  jbDirectoryAbi,
  jbMultiTerminalAbi,
  jbPermissionsAbi,
  jbProjectsAbi,
  jbRouterTerminalGatewayAbi,
  jbRouterTerminalRegistryAbi,
  jbSplitsAbi,
  jbTokensAbi,
} from "../generated/juicebox.js";
import type { JBChainId } from "../types.js";
import { permissionKeyV6 } from "../v6/permissions.js";
import { describeStickySplit, isStickySplit } from "../v6/sticky.js";
import {
  UNISWAP_PERMIT2_ADDRESS,
  UNISWAP_V4_UNIVERSAL_ROUTER_ADDRESSES,
} from "../v6/uniswapV4Deployments.js";
import type {
  TransactionReviewCall,
  TransactionReviewRequest,
} from "./transactionReview.js";

// The pure half of the transaction review dialog. Every decoder is strict: it
// re-encodes what it decoded and compares bytes, or validates the full
// structure, before claiming an interpretation. It returns null on any
// mismatch so the raw argument view shows instead. A readable rendering must
// never paper over bytes it cannot fully account for.

/** A decoded argument: numbered steps of `Label: value` rows. */
export type PrettyStep = { title: string; rows: [string, string][] };

// ── Known addresses ──────────────────────────────────────────────────────────

type AddressTable = Readonly<Record<string, string>>;

let addressNames: Map<string, string> | undefined;

const addressKey = (chainId: number | string, address: string) =>
  `${chainId}:${address.toLowerCase()}`;

/** Every named deployment by chain and address, built on first use. */
function namedAddresses(): Map<string, string> {
  if (addressNames) return addressNames;
  const names = new Map<string, string>();
  // A later table takes precedence for an address two tables share.
  const add = (table: AddressTable, name: string) => {
    for (const [chainId, address] of Object.entries(table)) {
      names.set(addressKey(chainId, address), name);
    }
  };
  const history = jbContractAddressHistory["6"] as Readonly<
    Record<string, Readonly<Record<string, AddressTable>>>
  >;
  for (const [contract, table] of Object.entries(
    jbContractAddress["6"] as Readonly<Record<string, AddressTable>>,
  )) {
    add(table, contract in history ? `${contract} (current)` : contract);
  }
  // A retired generation keeps its name, so a project that still selects it
  // reads as "JBRouterTerminal (previous)" rather than as an unknown address.
  for (const [contract, generations] of Object.entries(history)) {
    for (const [generation, table] of Object.entries(generations)) {
      add(table, `${contract} (${generation})`);
    }
  }
  add(USDC_ADDRESSES, "USDC");
  add(
    UNISWAP_V4_UNIVERSAL_ROUTER_ADDRESSES as AddressTable,
    "Uniswap Universal Router",
  );
  return (addressNames = names);
}

/**
 * The name of a Juicebox V6 deployment, Permit2, the Uniswap Universal Router
 * or USDC at `value` on `chainId`, or null. A contract with retired
 * generations names the generation: "JBBuybackHook (current)",
 * "JBBuybackHook (previous)".
 */
export function knownAddressName(
  chainId: number,
  value: unknown,
): string | null {
  if (typeof value !== "string" || !/^0x[0-9a-f]{40}$/iu.test(value)) {
    return null;
  }
  if (value.toLowerCase() === UNISWAP_PERMIT2_ADDRESS.toLowerCase()) {
    return "Permit2";
  }
  return namedAddresses().get(addressKey(chainId, value)) ?? null;
}

/** "Name | 0x…" for a known address, otherwise the address. */
function addressLabel(chainId: number, address: string): string {
  const name = knownAddressName(chainId, address);
  return name ? `${name} | ${address}` : address;
}

/** Like {@link addressLabel}, for a Uniswap currency, where address zero is native ETH. */
function currencyLabel(chainId: number, currency: string): string {
  return currency.toLowerCase() === zeroAddress
    ? `native ETH | ${currency}`
    : addressLabel(chainId, currency);
}

// ── Argument values ──────────────────────────────────────────────────────────

function stringify(value: unknown): string {
  try {
    return (
      JSON.stringify(
        value,
        (_, item) => (typeof item === "bigint" ? item.toString() : item),
        2,
      ) ?? String(value)
    );
  } catch {
    return String(value);
  }
}

/**
 * One ABI value as review text. An address carries its known name
 * ("JBController | 0x…"), and long bytes are shortened; the raw payload keeps
 * the full value.
 */
export function readableValue(
  type: string,
  value: unknown,
  chainId: number,
): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "boolean" || typeof value === "number") {
    return String(value);
  }
  if (typeof value === "string") {
    if (type === "address") return addressLabel(chainId, value);
    if (type.startsWith("bytes") && value.length > 50) {
      return `${value.slice(0, 22)}…${value.slice(-12)}`;
    }
    return value;
  }
  return stringify(value);
}

/** A tuple component's value, from a positional array or a named object. */
export function namedValue(
  value: unknown,
  name: string,
  index: number,
): unknown {
  if (Array.isArray(value)) return value[index];
  if (value && typeof value === "object") {
    const row = value as Record<string, unknown>;
    return row[name] ?? row[index];
  }
  return undefined;
}

/** A native amount as "0.5 ETH | 500000000000000000 wei". */
export function nativeValue(value = 0n): string {
  return `${formatEther(value)} ETH | ${value.toString()} wei`;
}

/**
 * The ABI function a reviewed call actually invokes: the item named
 * `functionName` whose selector is the calldata's first four bytes, or null.
 * A name alone never matches, so the review cannot show a function the bytes
 * do not call.
 */
export function functionFromCall(
  call: Pick<TransactionReviewCall, "abi" | "data" | "functionName">,
): AbiFunction | null {
  if (!call.abi || !call.functionName) return null;
  const selector = call.data.slice(0, 10).toLowerCase();
  return (
    call.abi.find(
      (item): item is AbiFunction =>
        item.type === "function" &&
        item.name === call.functionName &&
        toFunctionSelector(item) === selector,
    ) ?? null
  );
}

/**
 * The review's lead paragraph. Callers assemble descriptions from optional
 * parts, so a blank one falls back to the standing guidance instead of an
 * empty banner.
 */
export function reviewDescription(
  request: Pick<TransactionReviewRequest, "calls" | "description" | "kind">,
): string {
  const description = request.description?.trim();
  if (description) return description;
  if (request.kind === "authorization") {
    return "This authorization commits to the exact destination, native value, and calldata below. A Safe or relayer can submit that call onchain after you continue.";
  }
  return `This is the exact destination, native value, and calldata the app will ask your wallet to send. ${
    request.calls.every(
      (call) => call.gas !== undefined || call.safeTxGas !== undefined,
    )
      ? "Your wallet adds the nonce and network fees."
      : "Your wallet shows the gas limit and network fees before you send."
  }`;
}

// ── Uniswap V4 PositionManager plans ─────────────────────────────────────────

export type V4PlanStep =
  | {
      action: "INCREASE_LIQUIDITY";
      position: string;
      liquidity: bigint;
      maximumIn: { currency0: bigint; currency1: bigint };
    }
  | {
      action: "DECREASE_LIQUIDITY";
      position: string;
      liquidity: bigint;
      minimumOut: { currency0: bigint; currency1: bigint };
    }
  | {
      action: "MINT_POSITION";
      owner: string;
      pool: {
        currency0: string;
        currency1: string;
        fee: number;
        tickSpacing: number;
        hook: string;
      };
      ticks: { lower: number; upper: number };
      liquidity: bigint;
      maximumIn: { currency0: bigint; currency1: bigint };
    }
  | {
      action: "BURN_POSITION";
      position: string;
      minimumOut: { currency0: bigint; currency1: bigint };
    }
  | {
      action: "TAKE_PAIR";
      currency0: string;
      currency1: string;
      recipient: string;
    }
  | { action: "CLOSE_CURRENCY"; currency: string }
  | { action: "SWEEP"; currency: string; recipient: string };

const POOL_KEY = {
  type: "tuple",
  components: [
    { type: "address" },
    { type: "address" },
    { type: "uint24" },
    { type: "int24" },
    { type: "address" },
  ],
} as const;

/** A position change: `(tokenId, liquidity, amount0, amount1, hookData)`. */
const MODIFY_LIQUIDITY = [
  { type: "uint256" },
  { type: "uint256" },
  { type: "uint128" },
  { type: "uint128" },
  { type: "bytes" },
] as const;

/**
 * Decode a Uniswap V4 PositionManager `unlockData` plan into typed steps.
 * It covers the actions the apps build (increase, decrease, mint, burn, take
 * pair, close, sweep) with empty hook data; anything else is null. Amounts stay
 * in raw token units and addresses stay raw, since the dialog shows the exact
 * payload.
 */
export function describeV4UnlockData(value: unknown): V4PlanStep[] | null {
  if (typeof value !== "string" || !value.startsWith("0x")) return null;
  try {
    const [actions, params] = decodeAbiParameters(
      [{ type: "bytes" }, { type: "bytes[]" }],
      value as Hex,
    );
    const codes = actions.slice(2).match(/.{2}/g) ?? [];
    if (!codes.length || codes.length !== params.length) return null;
    const steps: V4PlanStep[] = [];
    for (const [index, byte] of codes.entries()) {
      const data = params[index];
      switch (parseInt(byte, 16)) {
        case 0x00: {
          const [tokenId, liquidity, amount0Max, amount1Max, hookData] =
            decodeAbiParameters(MODIFY_LIQUIDITY, data);
          if (hookData !== "0x") return null;
          steps.push({
            action: "INCREASE_LIQUIDITY",
            position: `#${tokenId}`,
            liquidity,
            maximumIn: { currency0: amount0Max, currency1: amount1Max },
          });
          break;
        }
        case 0x01: {
          // The liquidity word is a uint256 in the PositionManager's decoder.
          const [tokenId, liquidity, amount0Min, amount1Min, hookData] =
            decodeAbiParameters(MODIFY_LIQUIDITY, data);
          if (hookData !== "0x") return null;
          steps.push({
            action: "DECREASE_LIQUIDITY",
            position: `#${tokenId}`,
            liquidity,
            minimumOut: { currency0: amount0Min, currency1: amount1Min },
          });
          break;
        }
        case 0x02: {
          const [
            key,
            tickLower,
            tickUpper,
            liquidity,
            amount0Max,
            amount1Max,
            owner,
            hookData,
          ] = decodeAbiParameters(
            [
              POOL_KEY,
              { type: "int24" },
              { type: "int24" },
              { type: "uint256" },
              { type: "uint128" },
              { type: "uint128" },
              { type: "address" },
              { type: "bytes" },
            ],
            data,
          );
          if (hookData !== "0x") return null;
          steps.push({
            action: "MINT_POSITION",
            owner,
            pool: {
              currency0: key[0],
              currency1: key[1],
              fee: key[2],
              tickSpacing: key[3],
              hook: key[4],
            },
            ticks: { lower: tickLower, upper: tickUpper },
            liquidity,
            maximumIn: { currency0: amount0Max, currency1: amount1Max },
          });
          break;
        }
        case 0x03: {
          const [tokenId, amount0Min, amount1Min, hookData] =
            decodeAbiParameters(
              [
                { type: "uint256" },
                { type: "uint128" },
                { type: "uint128" },
                { type: "bytes" },
              ],
              data,
            );
          if (hookData !== "0x") return null;
          steps.push({
            action: "BURN_POSITION",
            position: `#${tokenId}`,
            minimumOut: { currency0: amount0Min, currency1: amount1Min },
          });
          break;
        }
        case 0x11: {
          const [currency0, currency1, recipient] = decodeAbiParameters(
            [{ type: "address" }, { type: "address" }, { type: "address" }],
            data,
          );
          steps.push({ action: "TAKE_PAIR", currency0, currency1, recipient });
          break;
        }
        case 0x12: {
          const [currency] = decodeAbiParameters([{ type: "address" }], data);
          steps.push({ action: "CLOSE_CURRENCY", currency });
          break;
        }
        case 0x14: {
          const [currency, recipient] = decodeAbiParameters(
            [{ type: "address" }, { type: "address" }],
            data,
          );
          steps.push({ action: "SWEEP", currency, recipient });
          break;
        }
        default:
          return null;
      }
    }
    return steps;
  } catch {
    return null;
  }
}

// ── Uniswap Universal Router ─────────────────────────────────────────────────

/** Universal Router sentinels the direct-pay swap builders use. */
const UR_MSG_SENDER = "0x0000000000000000000000000000000000000001";
const UR_ADDRESS_THIS = "0x0000000000000000000000000000000000000002";
const UR_CONTRACT_BALANCE =
  0x8000000000000000000000000000000000000000000000000000000000000000n;

function urRecipient(chainId: number, address: string): string {
  if (address.toLowerCase() === UR_MSG_SENDER) return "you (msg.sender)";
  if (address.toLowerCase() === UR_ADDRESS_THIS) {
    return "the router (kept for the next step)";
  }
  return addressLabel(chainId, address);
}

function urAmount(value: bigint): string {
  if (value === UR_CONTRACT_BALANCE) {
    return "the router's entire balance from the previous step";
  }
  if (value === 0n) return "0 (the open amount from the previous step)";
  return value.toString();
}

/** A packed V3 path: 20-byte token, 3-byte fee, 20-byte token, … */
function urV3Path(chainId: number, path: string): string | null {
  const raw = path.slice(2);
  if (raw.length < 86 || (raw.length - 40) % 46 !== 0) return null;
  const parts: string[] = [addressLabel(chainId, `0x${raw.slice(0, 40)}`)];
  for (let offset = 40; offset < raw.length; offset += 46) {
    const fee = parseInt(raw.slice(offset, offset + 6), 16);
    parts.push(
      `-${fee / 10_000}%→`,
      addressLabel(chainId, `0x${raw.slice(offset + 6, offset + 46)}`),
    );
  }
  return parts.join(" ");
}

/** The V4_SWAP command's inner action plan, in the shapes the pay builders emit. */
function urV4SwapSteps(chainId: number, input: Hex): PrettyStep[] | null {
  const [actions, params] = decodeAbiParameters(
    [{ type: "bytes" }, { type: "bytes[]" }],
    input,
  );
  const codes = actions.slice(2).match(/.{2}/g) ?? [];
  if (!codes.length || codes.length !== params.length) return null;
  const steps: PrettyStep[] = [];
  for (const [index, byte] of codes.entries()) {
    const data = params[index];
    switch (parseInt(byte, 16)) {
      case 0x06: {
        const [swap] = decodeAbiParameters(
          [
            {
              type: "tuple",
              components: [
                POOL_KEY,
                { type: "bool" },
                { type: "uint128" },
                { type: "uint128" },
                { type: "bytes" },
              ],
            },
          ],
          data,
        );
        const [key, zeroForOne, amountIn, minimumOut, hookData] = swap;
        if (hookData !== "0x") return null;
        steps.push({
          title: "Swap in the project's V4 pool (exact input)",
          rows: [
            ["Sell", currencyLabel(chainId, zeroForOne ? key[0] : key[1])],
            ["Buy", currencyLabel(chainId, zeroForOne ? key[1] : key[0])],
            ["Amount in", urAmount(amountIn)],
            ["Minimum out", `${minimumOut} — reverts below this`],
            ["Fee", `${key[2]} (${key[2] / 10_000}%) | tick spacing ${key[3]}`],
            ["Hook", addressLabel(chainId, key[4])],
          ],
        });
        break;
      }
      case 0x0b: {
        const [currency, amount] = decodeAbiParameters(
          [{ type: "address" }, { type: "uint256" }, { type: "bool" }],
          data,
        );
        steps.push({
          title: "Pay the pool",
          rows: [
            ["Currency", currencyLabel(chainId, currency)],
            ["Amount", urAmount(amount)],
          ],
        });
        break;
      }
      case 0x0c: {
        const [currency, maximum] = decodeAbiParameters(
          [{ type: "address" }, { type: "uint256" }],
          data,
        );
        steps.push({
          title: "Pay the pool everything owed",
          rows: [
            ["Currency", currencyLabel(chainId, currency)],
            ["At most", maximum.toString()],
          ],
        });
        break;
      }
      case 0x0e: {
        const [currency, recipient, amount] = decodeAbiParameters(
          [{ type: "address" }, { type: "address" }, { type: "uint256" }],
          data,
        );
        steps.push({
          title: "Take the swap output",
          rows: [
            ["Currency", currencyLabel(chainId, currency)],
            ["Recipient", urRecipient(chainId, recipient)],
            ["Amount", urAmount(amount)],
          ],
        });
        break;
      }
      default:
        return null;
    }
  }
  return steps;
}

/**
 * Decode a Uniswap Universal Router `execute(commands, inputs, deadline)` into
 * readable steps. It covers the command shapes the pay flow builds (Permit2
 * permit, wrap, V3 hop, unwrap, V4 swap); anything else is null.
 */
export function describeUniversalRouterExecute(
  chainId: number,
  args: readonly unknown[] | undefined,
): PrettyStep[] | null {
  if (!args || args.length < 2) return null;
  const [commands, inputs] = args;
  if (
    typeof commands !== "string" ||
    !commands.startsWith("0x") ||
    !Array.isArray(inputs)
  ) {
    return null;
  }
  try {
    const codes = commands.slice(2).match(/.{2}/g) ?? [];
    if (!codes.length || codes.length !== inputs.length) return null;
    const steps: PrettyStep[] = [];
    for (const [index, byte] of codes.entries()) {
      const data = inputs[index] as Hex;
      switch (parseInt(byte, 16)) {
        case 0x00: {
          const [recipient, amountIn, minimumOut, path, payerIsUser] =
            decodeAbiParameters(
              [
                { type: "address" },
                { type: "uint256" },
                { type: "uint256" },
                { type: "bytes" },
                { type: "bool" },
              ],
              data,
            );
          const route = urV3Path(chainId, path);
          if (!route) return null;
          steps.push({
            title: "Swap through a V3 pool (exact input)",
            rows: [
              ["Route", route],
              ["Amount in", urAmount(amountIn)],
              [
                "Minimum out",
                minimumOut === 0n
                  ? "0 — the final V4 minimum below is the real floor"
                  : minimumOut.toString(),
              ],
              [
                "Paid by",
                payerIsUser ? "you (via Permit2)" : "the router's balance",
              ],
              ["Recipient", urRecipient(chainId, recipient)],
            ],
          });
          break;
        }
        case 0x0a: {
          const [permit] = decodeAbiParameters(
            [
              {
                type: "tuple",
                components: [
                  {
                    type: "tuple",
                    components: [
                      { type: "address" },
                      { type: "uint160" },
                      { type: "uint48" },
                      { type: "uint48" },
                    ],
                  },
                  { type: "address" },
                  { type: "uint256" },
                ],
              },
              { type: "bytes" },
            ],
            data,
          );
          const [details, spender, sigDeadline] = permit;
          steps.push({
            title: "Apply your signed Permit2 authorization",
            rows: [
              ["Token", addressLabel(chainId, details[0])],
              ["Amount", details[1].toString()],
              ["Spender", addressLabel(chainId, spender)],
              ["Expires", new Date(details[2] * 1000).toLocaleString()],
              [
                "Signature deadline",
                new Date(Number(sigDeadline) * 1000).toLocaleString(),
              ],
            ],
          });
          break;
        }
        case 0x0b: {
          const [recipient, amount] = decodeAbiParameters(
            [{ type: "address" }, { type: "uint256" }],
            data,
          );
          steps.push({
            title: "Wrap ETH into WETH",
            rows: [
              ["Amount", urAmount(amount)],
              ["Recipient", urRecipient(chainId, recipient)],
            ],
          });
          break;
        }
        case 0x0c: {
          const [recipient, minimum] = decodeAbiParameters(
            [{ type: "address" }, { type: "uint256" }],
            data,
          );
          steps.push({
            title: "Unwrap WETH back to ETH",
            rows: [
              ["Minimum", urAmount(minimum)],
              ["Recipient", urRecipient(chainId, recipient)],
            ],
          });
          break;
        }
        case 0x10: {
          const inner = urV4SwapSteps(chainId, data);
          if (!inner) return null;
          steps.push(...inner);
          break;
        }
        default:
          return null;
      }
    }
    return steps;
  } catch {
    return null;
  }
}

// ── JB hook metadata (JBMetadataResolver envelope) ───────────────────────────

const bigintJson = (value: unknown) =>
  JSON.stringify(value, (_, item) =>
    typeof item === "bigint" ? item.toString() : item,
  );

/** Strict decode and byte-exact re-encode, else null. */
function roundTripDecode<T extends readonly unknown[]>(
  types: Parameters<typeof decodeAbiParameters>[0],
  payload: Hex,
): T | null {
  try {
    const decoded = decodeAbiParameters(types, payload);
    const reencoded = encodeAbiParameters(types, decoded);
    if (reencoded.toLowerCase() !== payload.toLowerCase()) return null;
    return decoded as unknown as T;
  } catch {
    return null;
  }
}

/**
 * Parse the JBMetadataResolver layout exactly as `getDataFor` reads it: a
 * 32-byte reserved word, a word-padded table of `(bytes4 id, uint8 wordOffset)`
 * entries, then word-aligned payload segments. Offsets must strictly increase
 * and the segments must tile the rest of the bytes.
 */
function parseHookMetadataEnvelope(
  value: unknown,
): { reserved: Hex; entries: { id: Hex; payload: Hex }[] } | null {
  if (typeof value !== "string" || !/^0x([0-9a-fA-F]{2})+$/.test(value)) {
    return null;
  }
  const body = value.slice(2).toLowerCase();
  if (body.length % 64 !== 0) return null;
  const totalWords = body.length / 64;
  // A reserved word, a table word, and at least one payload word.
  if (totalWords < 3) return null;
  const firstOffset = parseInt(body.slice(64 + 8, 64 + 10), 16);
  const tableWords = firstOffset - 1;
  if (tableWords < 1 || firstOffset >= totalWords) return null;
  const tableArea = body.slice(64, 64 + tableWords * 64);
  const entries: { id: Hex; offset: number }[] = [];
  let cursor = 0;
  while (cursor + 10 <= tableArea.length) {
    const chunk = tableArea.slice(cursor, cursor + 10);
    if (/^0+$/.test(chunk)) break;
    const id = chunk.slice(0, 8);
    const offset = parseInt(chunk.slice(8, 10), 16);
    // A zero id with a nonzero offset is malformed.
    if (/^0+$/.test(id)) return null;
    entries.push({ id: `0x${id}`, offset });
    cursor += 10;
  }
  // The rest of the table must be zero padding.
  if (!/^0*$/.test(tableArea.slice(cursor))) return null;
  // The entry count must be what sized the table.
  if (Math.ceil((entries.length * 5) / 32) !== tableWords) return null;
  // Offsets must ascend and the payloads must tile the remaining bytes exactly.
  for (let i = 0; i < entries.length; i++) {
    if (entries[i].offset >= totalWords) return null;
    if (i > 0 && entries[i].offset <= entries[i - 1].offset) return null;
  }
  const segments = entries.map((entry, i) => {
    const start = entry.offset * 64;
    const end =
      i + 1 < entries.length ? entries[i + 1].offset * 64 : body.length;
    return { id: entry.id, payload: `0x${body.slice(start, end)}` as Hex };
  });
  return { reserved: `0x${body.slice(0, 64)}`, entries: segments };
}

/** Repeated tier ids as "2× #4", in first-seen order. */
function tierIdCounts(tierIds: readonly number[]): string {
  const counts = new Map<number, number>();
  for (const id of tierIds) counts.set(id, (counts.get(id) ?? 0) + 1);
  return [...counts.entries()]
    .map(([id, count]) => (count > 1 ? `${count}× #${id}` : `#${id}`))
    .join(", ");
}

/**
 * Decode a `pay`/`addToBalanceOf`/`cashOutTokensOf` `metadata` argument into
 * its hook entries, reading the payload shapes the ecosystem's builders
 * produce (721 mints and redeems, buyback routing). A payload that matches
 * several shapes is reported as ambiguous instead of picking one.
 */
export function describeJBHookMetadata(
  context: "pay" | "cashOut",
  value: unknown,
): PrettyStep[] | null {
  const envelope = parseHookMetadataEnvelope(value);
  if (!envelope) return null;
  const steps: PrettyStep[] = [];
  if (!/^0x0+$/.test(envelope.reserved)) {
    steps.push({
      title: "Protocol-reserved word (nonzero)",
      rows: [["Value", envelope.reserved]],
    });
  }
  for (const entry of envelope.entries) {
    const payloadWords = (entry.payload.length - 2) / 64;
    const base: [string, string][] = [["Hook lookup id", entry.id]];
    // Every known shape that round-trips byte for byte. Exactly one is an
    // interpretation; several (degenerate payloads such as empty arrays) are
    // ambiguous.
    const readings: PrettyStep[] = [];
    if (context === "pay") {
      const mint = roundTripDecode<readonly [boolean, readonly number[]]>(
        [{ type: "bool" }, { type: "uint16[]" }],
        entry.payload,
      );
      if (mint) {
        readings.push({
          title: "721 shop mint instructions",
          rows: [
            ...base,
            [
              "Tier IDs to mint",
              mint[1].length ? tierIdCounts(mint[1]) : "none (credits only)",
            ],
            [
              "Allow overspending",
              mint[0]
                ? "yes — excess becomes pay credits"
                : "no — any excess reverts",
            ],
          ],
        });
      }
      if (payloadWords === 3) {
        const buyback = roundTripDecode<readonly [bigint, bigint, boolean]>(
          [{ type: "uint256" }, { type: "uint256" }, { type: "bool" }],
          entry.payload,
        );
        if (buyback) {
          readings.push({
            title: "Buyback hook swap instructions",
            rows: [
              ...base,
              ["Amount to swap", buyback[0].toString()],
              ["Minimum swap output", `${buyback[1]} — reverts below this`],
              ["Skip splits on swapped tokens", buyback[2] ? "yes" : "no"],
            ],
          });
        }
      }
    } else {
      if (payloadWords === 2) {
        const buyback = roundTripDecode<readonly [bigint, boolean]>(
          [{ type: "uint256" }, { type: "bool" }],
          entry.payload,
        );
        if (buyback) {
          readings.push({
            title: "Buyback hook cash-out routing",
            rows: [
              ...base,
              ["Minimum swap output", buyback[0].toString()],
              [
                "Force the direct terminal path",
                buyback[1] ? "yes — never route through the pool" : "no",
              ],
            ],
          });
        }
      }
      const redeem = roundTripDecode<readonly [readonly bigint[]]>(
        [{ type: "uint256[]" }],
        entry.payload,
      );
      if (redeem) {
        readings.push({
          title: "721 shop items to redeem",
          rows: [
            ...base,
            [
              "Token IDs",
              redeem[0].length
                ? redeem[0].map((id) => `#${id}`).join(", ")
                : "none",
            ],
          ],
        });
      }
    }
    if (readings.length === 1) {
      steps.push(readings[0]);
    } else if (readings.length > 1) {
      steps.push({
        title:
          "Payload matches multiple known shapes — verify against the raw bytes",
        rows: [
          ...base,
          ...readings.map(
            (reading, i) =>
              [
                `Reading ${i + 1}`,
                `${reading.title}: ${reading.rows
                  .slice(base.length)
                  .map(([label, val]) => `${label.toLowerCase()}: ${val}`)
                  .join("; ")}`,
              ] as [string, string],
          ),
        ],
      });
    } else {
      steps.push({
        title: `Unrecognized hook payload (${payloadWords} word${payloadWords === 1 ? "" : "s"})`,
        rows: [...base, ["Payload", entry.payload]],
      });
    }
  }
  return steps;
}

// ── Sucker bridge claim ──────────────────────────────────────────────────────

/** A bytes32 that is a left-padded address reads as the address. */
function paddedAddress(value: string): string {
  if (/^0x000000000000000000000000[0-9a-fA-F]{40}$/.test(value)) {
    return `0x${value.slice(26)}`;
  }
  return value;
}

/** A sucker `claim` argument: its leaf, with the 32-hash proof summarized. */
export function describeSuckerClaim(
  chainId: number,
  value: unknown,
): PrettyStep[] | null {
  const claim = value as {
    token?: unknown;
    leaf?: {
      index?: unknown;
      beneficiary?: unknown;
      projectTokenCount?: unknown;
      terminalTokenAmount?: unknown;
      metadata?: unknown;
    };
    proof?: unknown;
  } | null;
  if (
    !claim ||
    typeof claim.token !== "string" ||
    !claim.leaf ||
    typeof claim.leaf.beneficiary !== "string" ||
    typeof claim.leaf.index !== "bigint" ||
    typeof claim.leaf.projectTokenCount !== "bigint" ||
    typeof claim.leaf.terminalTokenAmount !== "bigint" ||
    !Array.isArray(claim.proof) ||
    claim.proof.length !== 32 ||
    !claim.proof.every(
      (hash) => typeof hash === "string" && /^0x[0-9a-fA-F]{64}$/.test(hash),
    )
  ) {
    return null;
  }
  const rows: [string, string][] = [
    ["Terminal token", addressLabel(chainId, claim.token)],
    ["Leaf index", claim.leaf.index.toString()],
    ["Beneficiary", paddedAddress(claim.leaf.beneficiary)],
    ["Project tokens", claim.leaf.projectTokenCount.toString()],
    ["Terminal token amount", claim.leaf.terminalTokenAmount.toString()],
  ];
  if (
    typeof claim.leaf.metadata === "string" &&
    !/^0x0+$/.test(claim.leaf.metadata)
  ) {
    rows.push(["Leaf metadata", claim.leaf.metadata]);
  }
  rows.push([
    "Merkle proof",
    "32 hashes — exact bytes in the raw payload below",
  ]);
  return [
    { title: "Claim a bridged balance from the sucker's inbox tree", rows },
  ];
}

// ── Safe execTransaction inner call ──────────────────────────────────────────

let safeInnerAbis: ReadonlyMap<string, Abi> | undefined;

/** The ABI a queued Safe call to a Juicebox deployment is read with, by deployment name. */
function safeInnerAbiOf(contract: string): Abi | undefined {
  safeInnerAbis ??= new Map<string, Abi>([
    ["JBController", jbControllerAbi],
    ["JBMultiTerminal", jbMultiTerminalAbi],
    ["JBDirectory", jbDirectoryAbi],
    ["JBTokens", jbTokensAbi],
    ["JBPermissions", jbPermissionsAbi],
    ["JBSplits", jbSplitsAbi],
    ["JBProjects", jbProjectsAbi],
    ["JBBuybackHookRegistry", jbBuybackHookRegistryAbi],
    ["JBBuybackHook", jbBuybackHookAbi],
    ["JBRouterTerminalRegistry", jbRouterTerminalRegistryAbi],
    ["JBRouterTerminalGateway", jbRouterTerminalGatewayAbi],
  ]);
  return safeInnerAbis.get(contract);
}

/**
 * The call a Safe `execTransaction` makes: `data` sent to `to`. Several of
 * these contracts share selectors (`pay` on the terminal and the router
 * gateway, `approve` on JBProjects and any ERC-20), so the ABI comes from the
 * target. A known Juicebox deployment, a retired generation included, is read
 * with its contract's ABI; USDC and unknown targets are read as ERC-20. Any
 * other target, a selector its ABI lacks, or a non-canonical encoding is null.
 */
export function describeSafeInnerCall(
  chainId: number,
  to: unknown,
  data: unknown,
): PrettyStep[] | null {
  if (
    typeof data !== "string" ||
    !/^0x(?:[0-9a-f]{2})+$/iu.test(data) ||
    data.length < 10
  ) {
    return null;
  }
  if (typeof to !== "string" || !/^0x[0-9a-f]{40}$/iu.test(to)) return null;
  const target = knownAddressName(chainId, to);
  const abi =
    target === null || target === "USDC"
      ? (erc20Abi as Abi)
      : safeInnerAbiOf(target.replace(/ \([^)]*\)$/u, ""));
  if (!abi) return null;
  const selector = data.slice(0, 10).toLowerCase();
  const item = abi.find(
    (entry): entry is AbiFunction =>
      entry.type === "function" && toFunctionSelector(entry) === selector,
  );
  if (!item) return null;
  let args: readonly unknown[];
  try {
    args = decodeFunctionData({ abi: [item], data: data as Hex }).args ?? [];
    const canonical = encodeFunctionData({
      abi: [item],
      functionName: item.name,
      args,
    });
    if (canonical.toLowerCase() !== data.toLowerCase()) return null;
  } catch {
    return null;
  }
  const rows: [string, string][] = args.map((argument, index) => [
    item.inputs[index].name || `argument ${index + 1}`,
    bigintJson(argument),
  ]);
  return [
    {
      title: `Queued call — ${target ?? "ERC-20"}.${item.name}(…)`,
      rows: rows.length ? rows : [["Arguments", "none"]],
    },
  ];
}

// ── Safe proxy initializer ───────────────────────────────────────────────────

const safeSetupAbi = [
  {
    type: "function",
    name: "setup",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_owners", type: "address[]" },
      { name: "_threshold", type: "uint256" },
      { name: "to", type: "address" },
      { name: "data", type: "bytes" },
      { name: "fallbackHandler", type: "address" },
      { name: "paymentToken", type: "address" },
      { name: "payment", type: "uint256" },
      { name: "paymentReceiver", type: "address" },
    ],
    outputs: [],
  },
] as const;

const safeToL2SetupAbi = [
  {
    type: "function",
    name: "setupToL2",
    stateMutability: "nonpayable",
    inputs: [{ name: "l2Singleton", type: "address" }],
    outputs: [],
  },
] as const;

/** A Safe proxy `initializer`: owners, threshold, setup hook and any payment. */
export function describeSafeInitializer(
  chainId: number,
  value: unknown,
): PrettyStep[] | null {
  if (typeof value !== "string" || !value.startsWith("0x")) return null;
  const args = (() => {
    try {
      return decodeFunctionData({ abi: safeSetupAbi, data: value as Hex }).args;
    } catch {
      return null;
    }
  })();
  if (!args) return null;
  // A noncanonical encoding could make the summary disagree with the bytes.
  const canonical = encodeFunctionData({
    abi: safeSetupAbi,
    functionName: "setup",
    args,
  });
  if (canonical.toLowerCase() !== value.toLowerCase()) return null;
  const [
    owners,
    threshold,
    to,
    data,
    fallbackHandler,
    paymentToken,
    payment,
    paymentReceiver,
  ] = args;
  const rows: [string, string][] = [
    ["Owners", owners.join(", ") || "none"],
    ["Threshold", `${threshold} of ${owners.length}`],
    ["Fallback handler", addressLabel(chainId, fallbackHandler)],
  ];
  if (to.toLowerCase() === zeroAddress) {
    // Safe runs the setup delegatecall only when `to` is set.
    rows.push([
      "Setup hook",
      data === "0x"
        ? "none"
        : "none — Safe ignores the setup data when `to` is zero",
    ]);
  } else {
    let hook = `DELEGATECALL to ${to} — data in the raw payload below`;
    try {
      const inner = decodeFunctionData({ abi: safeToL2SetupAbi, data });
      const canonicalInner = encodeFunctionData({
        abi: safeToL2SetupAbi,
        functionName: "setupToL2",
        args: inner.args,
      });
      if (canonicalInner.toLowerCase() === data.toLowerCase()) {
        hook = `SafeToL2Setup.setupToL2(${inner.args[0]}) via ${to}`;
      }
    } catch {
      // Keep the generic delegatecall warning.
    }
    rows.push(["Setup hook", hook]);
  }
  if (payment !== 0n || paymentToken.toLowerCase() !== zeroAddress) {
    rows.push([
      "Deployment payment",
      `${payment} of ${currencyLabel(chainId, paymentToken)} to ${paymentReceiver} — unusual, verify`,
    ]);
  }
  return [{ title: "Safe setup", rows }];
}

// ── Permission grants ────────────────────────────────────────────────────────

/** A `setPermissionsFor` grant, naming each permission id from the V6 catalog. */
export function describePermissionsData(
  chainId: number,
  value: unknown,
): PrettyStep[] | null {
  const data = value as {
    operator?: unknown;
    projectId?: unknown;
    permissionIds?: unknown;
  } | null;
  if (
    !data ||
    typeof data.operator !== "string" ||
    (typeof data.projectId !== "bigint" &&
      typeof data.projectId !== "number") ||
    !Array.isArray(data.permissionIds) ||
    !data.permissionIds.every(
      (id) => typeof id === "number" && Number.isInteger(id),
    )
  ) {
    return null;
  }
  const permissionIds = data.permissionIds as number[];
  const projectId = BigInt(data.projectId);
  const names = permissionIds.map((id) => {
    const name = permissionKeyV6(id);
    return name ? `${name} (${id})` : `UNKNOWN PERMISSION (${id})`;
  });
  const rows: [string, string][] = [
    ["Operator", addressLabel(chainId, data.operator)],
    [
      "Scope",
      projectId === 0n
        ? "project 0 — EVERY project this account ever owns"
        : `project #${projectId}`,
    ],
    [
      "Permissions",
      names.length
        ? names.join(", ")
        : "none — revokes everything previously granted",
    ],
  ];
  if (permissionIds.includes(1)) {
    rows.push([
      "Warning",
      "ROOT grants every permission across all Juicebox contracts",
    ]);
  }
  return [{ title: "Set operator permissions", rows }];
}

// ── Split groups ─────────────────────────────────────────────────────────────

function splitPercent(percent: number): string {
  const share = (percent * 100) / SPLITS_TOTAL_PERCENT;
  return `${Number(share.toFixed(4))}%`;
}

/** Whether `hook` is this chain's StickyDistributor (false where Sticky is not deployed). */
function isStickyHook(hook: string, chainId: number): boolean {
  try {
    return isStickySplit({ hook: hook as Address }, chainId as JBChainId);
  } catch {
    return false;
  }
}

/**
 * `setSplitGroupsOf` groups: each split's share, recipient, hook and lock,
 * with an honest total. A Sticky split names the holder group it pays.
 */
export function describeSplitGroups(
  chainId: number,
  value: unknown,
): PrettyStep[] | null {
  if (!Array.isArray(value)) return null;
  const steps: PrettyStep[] = [];
  for (const group of value as {
    groupId?: unknown;
    splits?: {
      percent?: unknown;
      projectId?: unknown;
      beneficiary?: unknown;
      preferAddToBalance?: unknown;
      lockedUntil?: unknown;
      hook?: unknown;
    }[];
  }[]) {
    if (typeof group?.groupId !== "bigint" || !Array.isArray(group.splits)) {
      return null;
    }
    const groupLabel =
      group.groupId === 1n
        ? "Reserved tokens"
        : group.groupId < 1n << 160n
          ? `Payouts of ${addressLabel(chainId, `0x${group.groupId.toString(16).padStart(40, "0")}`)}`
          : `Group ${group.groupId}`;
    const rows: [string, string][] = [];
    let total = 0;
    for (const [index, split] of group.splits.entries()) {
      if (
        typeof split?.percent !== "number" ||
        typeof split.beneficiary !== "string" ||
        typeof split.projectId !== "bigint"
      ) {
        return null;
      }
      total += split.percent;
      // A Sticky split's projectId is its holder group and its beneficiary is the Sticky token.
      const sticky =
        typeof split.hook === "string" && isStickyHook(split.hook, chainId);
      const parts = [
        sticky
          ? `${describeStickySplit({ projectId: split.projectId })} → Sticky token ${addressLabel(chainId, split.beneficiary)}`
          : split.projectId !== 0n
            ? `project #${split.projectId} (beneficiary ${split.beneficiary})`
            : addressLabel(chainId, split.beneficiary),
      ];
      if (sticky) {
        parts.push(`via StickyDistributor ${split.hook}`);
      } else if (
        typeof split.hook === "string" &&
        split.hook.toLowerCase() !== zeroAddress
      ) {
        parts.push(`via hook ${split.hook}`);
      }
      if (split.preferAddToBalance === true) {
        parts.push("prefers add-to-balance");
      }
      if (typeof split.lockedUntil === "number" && split.lockedUntil > 0) {
        parts.push(
          `locked until ${new Date(split.lockedUntil * 1000).toLocaleString()}`,
        );
      }
      rows.push([
        `Split ${index + 1} — ${splitPercent(split.percent)}`,
        parts.join(" | "),
      ]);
    }
    rows.push([
      "Total",
      `${splitPercent(total)}${total === SPLITS_TOTAL_PERCENT ? "" : " — the remainder follows the ruleset's default"}`,
    ]);
    steps.push({
      title: groupLabel,
      rows: rows.length > 1 ? rows : [["Splits", "none"]],
    });
  }
  return steps.length ? steps : null;
}
