import {
  Address,
  Hex,
  PublicClient,
  decodeAbiParameters,
  encodeAbiParameters,
} from "viem";
import {
  jbMultiTerminalAbi,
  jbTerminalStoreAbi,
} from "../generated/juicebox.js";
import { JBChainId } from "../types.js";
import { createHookMetadata, hookMetadataId } from "../utils/hook.js";
import { NATIVE_TOKEN_CURRENCY_ID } from "./currency.js";
import { v6Address } from "./types.js";
import {
  buildUniswapV4ExactInputSwapTx,
  quoteUniswapV4ExactInputSingle,
  uniswapV4SwapDirection,
  type UniswapV4PoolKey,
  type UniswapV4SwapTxRequest,
} from "./uniswapV4.js";

/**
 * A prepared `cashOutTokensOf` transaction request, accepted as-is by viem's
 * `walletClient.writeContract` and wagmi's `writeContract`.
 */
export interface V6CashOutTxRequest {
  chainId: JBChainId;
  address: Address;
  abi: typeof jbMultiTerminalAbi;
  functionName: "cashOutTokensOf";
  args: readonly [Address, bigint, bigint, Address, bigint, Address, Hex];
}

/**
 * Build a `cashOutTokensOf(holder, projectId, cashOutCount, tokenToReclaim,
 * minTokensReclaimed, beneficiary, metadata)` transaction request for a v6 terminal.
 *
 * @param args.chainId The chain to cash out on.
 * @param args.terminal The terminal holding the project's `tokenToReclaim` balance.
 * @param args.holder The address whose project tokens are being cashed out.
 * @param args.projectId The project's id.
 * @param args.cashOutCount The number of project tokens to cash out, as a fixed point
 * number with 18 decimals.
 * @param args.tokenToReclaim The terminal token to reclaim from the project's surplus.
 * @param args.minTokensReclaimed The minimum `tokenToReclaim` amount that must be
 * reclaimed, else the transaction reverts. Defaults to 0.
 * @param args.beneficiary The address that receives the reclaimed tokens.
 * @param args.metadata Hook metadata. Defaults to "0x".
 * @returns The transaction request.
 */
export function buildCashOutTx({
  chainId,
  terminal,
  holder,
  projectId,
  cashOutCount,
  tokenToReclaim,
  minTokensReclaimed = 0n,
  beneficiary,
  metadata = "0x",
}: {
  chainId: JBChainId;
  terminal: Address;
  holder: Address;
  projectId: bigint;
  cashOutCount: bigint;
  tokenToReclaim: Address;
  minTokensReclaimed?: bigint;
  beneficiary: Address;
  metadata?: Hex;
}): V6CashOutTxRequest {
  return {
    chainId,
    address: terminal,
    abi: jbMultiTerminalAbi,
    functionName: "cashOutTokensOf",
    args: [
      holder,
      projectId,
      cashOutCount,
      tokenToReclaim,
      minTokensReclaimed,
      beneficiary,
      metadata,
    ],
  };
}

/**
 * Build cash-out metadata instructing a project's JB721 tiers hook to burn
 * specific NFTs and reclaim their share of surplus.
 *
 * The payload is `abi.encode(uint256[] tokenIds)`, keyed by the hook's cash-out
 * metadata id (`bytes4(bytes20(metadataIdTarget) ^ bytes20(keccak256("cashOut")))`)
 * and packed into the JBMetadataResolver word-offset-table format. This is the
 * cash-out mirror of {@link build721PayMetadata}. The NFTs are burned by the hook
 * itself, so no ERC-721 approval is needed; pass `cashOutCount: 0` to
 * `cashOutTokensOf` (fungible tokens cannot co-redeem in the same call).
 *
 * @param args.metadataIdTarget The hook's `METADATA_ID_TARGET` — the shared
 * *implementation* address, NOT the project's clone hook address (see
 * {@link get721MetadataIdTarget}). Passing the clone address makes the hook ignore
 * the token ids and no NFTs are burned.
 * @param args.tokenIds The token ids of the NFTs to redeem. Must be non-empty,
 * unique, and non-zero (a real NFT token id is never 0).
 * @returns The metadata to pass as `cashOutTokensOf`'s `metadata` argument.
 */
export function build721CashOutMetadata({
  metadataIdTarget,
  tokenIds,
}: {
  metadataIdTarget: Address;
  tokenIds: bigint[];
}): Hex {
  if (tokenIds.length === 0) {
    throw new Error("build721CashOutMetadata requires at least one token id");
  }
  if (new Set(tokenIds.map(String)).size !== tokenIds.length) {
    throw new Error("build721CashOutMetadata token ids must be unique");
  }
  if (tokenIds.some((tokenId) => tokenId <= 0n)) {
    throw new Error("build721CashOutMetadata token ids must be positive");
  }

  const payload = encodeAbiParameters([{ type: "uint256[]" }], [tokenIds]);

  return createHookMetadata(
    [hookMetadataId(metadataIdTarget, "cashOut")],
    [payload],
  ) as Hex;
}

/**
 * A cash out quote.
 */
export interface CashOutQuote {
  /**
   * The reclaimable surplus for the cash out count, before the protocol fee.
   */
  reclaimAmount: bigint;
  /**
   * The reclaim amount net of the 2.5% protocol cash out fee (`x - x / 40`),
   * computed via {@link cashOutProtocolFee}.
   *
   * The fee is conditional: with a non-zero cash-out tax rate every cash out
   * pays it in full; zero-tax cash outs pay it on
   * `min(reclaimAmount, feeFreeSurplusOf)`, which is often but NOT always
   * zero; feeless beneficiaries pay none. `undefined` when the gating inputs
   * (`cashOutTaxRate`, plus `feeFreeSurplus` for zero-tax rulesets) were not
   * supplied — an unknown fee is not fabricated as either extreme.
   */
  reclaimAmountAfterFee: bigint | undefined;
}

/**
 * Quote the surplus reclaimed by cashing out `cashOutCount` project tokens, via
 * `JBTerminalStore.currentReclaimableSurplusOf(projectId, cashOutCount, [], [],
 * decimals, currency)`. Passing empty terminal/token arrays uses all of the project's
 * terminals and tokens.
 *
 * @param client A viem public client on the given chain.
 * @param args.chainId The chain to quote on.
 * @param args.projectId The project's id.
 * @param args.cashOutCount The number of project tokens to cash out, as a fixed point
 * number with 18 decimals.
 * @param args.decimals The decimals to quote the reclaim amount in. Defaults to 18.
 * @param args.currency The currency to quote the reclaim amount in (an
 * accounting-context currency, `uint32(uint160(token))`). Defaults to the native
 * token's currency (61166).
 * @param args.cashOutTaxRate The ruleset's cash-out tax rate, used to gate the
 * protocol fee (see {@link cashOutProtocolFee}). When omitted,
 * `reclaimAmountAfterFee` is `undefined` rather than a fabricated value.
 * @param args.feeFreeSurplus The terminal's `feeFreeSurplusOf` for the reclaimed
 * token. Required to resolve the fee when `cashOutTaxRate` is zero.
 * @param args.beneficiaryIsFeeless Whether the beneficiary is feeless (pays no
 * protocol fee). Defaults to false.
 * @returns The raw reclaim amount and, when the fee inputs are resolved, the
 * amount net of the conditional 2.5% protocol fee.
 *
 * NOTE: the defaults quote in NATIVE terms (decimals 18, token-keyed native
 * currency). For a project whose accounting token is not the native token
 * (e.g. USDC), pass that token's `decimals` and `tokenCurrencyId(token)` to
 * quote in its own terms and avoid a price-feed conversion.
 *
 * The quote envelope is set by the CURRENCY CONVENTION of the project's
 * accounting contexts, not by which token it accounts in. `JBPrices` has no
 * native special-case (`JBPrices.sol:226-246` only short-circuits same-currency
 * pairs), so any cross-currency quote needs a registered feed. `deploy-all`
 * registers the project-0 defaults `{ETH(1), uint32(NATIVE)}` (an identity
 * feed) and `{ETH(1), USD(2)}` (`Deploy.s.sol:1546-1562`). So:
 *
 * - Native-context projects quote in ETH(1) fine.
 * - Projects using the USD(2) currency convention for their ERC-20 contexts
 *   quote in ETH(1) fine.
 * - Projects whose ERC-20 context is TOKEN-KEYED (`uint32(uint160(usdc))`)
 *   have no `{ETH(1), uint32(usdc)}` feed, so an ETH-denominated quote
 *   reverts.
 *
 * Prefer quoting each accounting context in its OWN currency
 * (`tokenCurrencyId(context.token)` with `context.decimals`), which never needs
 * a feed, and convert for display separately.
 */
export async function getCashOutQuote(
  client: PublicClient,
  {
    chainId,
    projectId,
    cashOutCount,
    decimals = 18n,
    currency = BigInt(NATIVE_TOKEN_CURRENCY_ID),
    cashOutTaxRate,
    feeFreeSurplus,
    beneficiaryIsFeeless = false,
  }: {
    chainId: JBChainId;
    projectId: bigint;
    cashOutCount: bigint;
    decimals?: bigint;
    currency?: bigint;
    cashOutTaxRate?: bigint;
    feeFreeSurplus?: bigint;
    beneficiaryIsFeeless?: boolean;
  },
): Promise<CashOutQuote> {
  const reclaimAmount = await client.readContract({
    address: v6Address("JBTerminalStore", chainId),
    abi: jbTerminalStoreAbi,
    functionName: "currentReclaimableSurplusOf",
    args: [projectId, cashOutCount, [], [], decimals, currency],
  });

  return {
    reclaimAmount,
    reclaimAmountAfterFee: resolvedReclaimAmountAfterFee({
      reclaimAmount,
      cashOutTaxRate,
      feeFreeSurplus,
      beneficiaryIsFeeless,
    }),
  };
}

/**
 * The reclaim net of the protocol fee, or `undefined` while the fee-gating
 * inputs are unresolved (never a fabricated value): the fee needs the ruleset's
 * `cashOutTaxRate`, and — when that rate is zero — the terminal's
 * `feeFreeSurplusOf` too. Feeless beneficiaries resolve without either.
 */
function resolvedReclaimAmountAfterFee({
  reclaimAmount,
  cashOutTaxRate,
  feeFreeSurplus,
  beneficiaryIsFeeless,
}: {
  reclaimAmount: bigint;
  cashOutTaxRate: bigint | undefined;
  feeFreeSurplus: bigint | undefined;
  beneficiaryIsFeeless: boolean;
}): bigint | undefined {
  if (beneficiaryIsFeeless) return reclaimAmount;
  if (cashOutTaxRate === undefined) return undefined;
  if (cashOutTaxRate === 0n && feeFreeSurplus === undefined) return undefined;
  return (
    reclaimAmount -
    cashOutProtocolFee({
      reclaimAmount,
      cashOutTaxRate,
      feeFreeSurplus: feeFreeSurplus ?? 0n,
    })
  );
}

/**
 * The default cash-out slippage tolerance, in basis points (1%).
 *
 * Quotes from {@link getHookAwareCashOutQuote} are exact against current state;
 * this tolerance only absorbs quote-to-inclusion drift (payments, other cash
 * outs, sucker snapshot syncs, or pool moves that land first).
 */
export const DEFAULT_CASH_OUT_SLIPPAGE_BPS = 100n;

const MAX_BPS = 10_000n;

function requireBps(slippageBps: bigint): bigint {
  if (slippageBps < 0n || slippageBps >= MAX_BPS) {
    throw new Error("Slippage basis points must be in [0, 10000)");
  }
  return slippageBps;
}

/**
 * Apply a slippage tolerance to a quoted output, flooring toward zero but
 * never below 1 for a positive quote (a zero minimum disables protection).
 *
 * @param quoted The quoted output amount.
 * @param slippageBps The tolerance in basis points. Defaults to
 * {@link DEFAULT_CASH_OUT_SLIPPAGE_BPS}.
 * @returns The minimum acceptable output.
 */
export function slippageFloor(
  quoted: bigint,
  slippageBps: bigint = DEFAULT_CASH_OUT_SLIPPAGE_BPS,
): bigint {
  requireBps(slippageBps);
  if (quoted <= 0n) return 0n;
  const floor = (quoted * (MAX_BPS - slippageBps)) / MAX_BPS;
  return floor > 0n ? floor : 1n;
}

/**
 * The exact protocol fee `JBMultiTerminal` deducts from a cash-out reclaim:
 * `reclaimAmount / 40` (2.5%, floor division — NOT `× 975 / 1000`, which can
 * differ by 1 wei and break an exact minimum).
 *
 * With a non-zero cash-out tax rate the fee applies to the full reclaim. With
 * a zero tax rate it applies only up to the project's fee-free surplus
 * (round-trip prevention). Feeless beneficiaries pay no fee.
 *
 * @param args.reclaimAmount The gross reclaim amount, before the terminal fee.
 * @param args.cashOutTaxRate The ruleset's cash-out tax rate.
 * @param args.beneficiaryIsFeeless Whether the beneficiary is feeless.
 * @param args.feeFreeSurplus The project's `feeFreeSurplusOf` counter for the
 * reclaimed token. Only consulted when the tax rate is zero.
 * @returns The fee amount the terminal will deduct.
 */
export function cashOutProtocolFee({
  reclaimAmount,
  cashOutTaxRate,
  beneficiaryIsFeeless = false,
  feeFreeSurplus = 0n,
}: {
  reclaimAmount: bigint;
  cashOutTaxRate: bigint;
  beneficiaryIsFeeless?: boolean;
  feeFreeSurplus?: bigint;
}): bigint {
  if (reclaimAmount <= 0n || beneficiaryIsFeeless) return 0n;
  if (cashOutTaxRate > 0n) return reclaimAmount / 40n;
  const feeable =
    reclaimAmount < feeFreeSurplus ? reclaimAmount : feeFreeSurplus;
  return feeable / 40n;
}

/**
 * The diagnostic payload the buyback hook packs into its cash-out hook
 * specification — the protocol's public preview API for the sell-side routing
 * decision (returned by `previewCashOutFrom` whether or not the pool route
 * wins).
 */
export interface BuybackCashOutSpec {
  minimumSwapAmountOut: bigint;
  cashOutCountToSell: bigint;
  netDirectCashOutAmount: bigint;
  twapTick: number;
  twapLiquidity: bigint;
  poolId: Hex;
  rawSwapQuote: bigint;
  hasUserSpecifiedMinimumSwapAmountOut: boolean;
}

const BUYBACK_CASH_OUT_SPEC_ABI = [
  { name: "minimumSwapAmountOut", type: "uint256" },
  { name: "cashOutCountToSell", type: "uint256" },
  { name: "netDirectCashOutAmount", type: "uint256" },
  { name: "twapTick", type: "int24" },
  { name: "twapLiquidity", type: "uint128" },
  { name: "poolId", type: "bytes32" },
  { name: "rawSwapQuote", type: "uint256" },
  { name: "hasUserSpecifiedMinimumSwapAmountOut", type: "bool" },
] as const;

/**
 * Decode the buyback hook's cash-out specification metadata (see
 * {@link BuybackCashOutSpec}).
 */
export function decodeBuybackCashOutSpec(metadata: Hex): BuybackCashOutSpec {
  const [
    minimumSwapAmountOut,
    cashOutCountToSell,
    netDirectCashOutAmount,
    twapTick,
    twapLiquidity,
    poolId,
    rawSwapQuote,
    hasUserSpecifiedMinimumSwapAmountOut,
  ] = decodeAbiParameters(BUYBACK_CASH_OUT_SPEC_ABI, metadata);
  return {
    minimumSwapAmountOut,
    cashOutCountToSell,
    netDirectCashOutAmount,
    twapTick,
    twapLiquidity,
    poolId,
    rawSwapQuote,
    hasUserSpecifiedMinimumSwapAmountOut,
  };
}

/**
 * Build the buyback hook's `cashOut` metadata entry:
 * `(uint256 minimumSwapAmountOut, bool skip)`.
 *
 * `minimumSwapAmountOut` is a hard floor on the net terminal-token output,
 * enforced by the hook on BOTH the pool route and the direct bonding-curve
 * fallback. Note an explicit non-zero minimum skips the hook's TWAP lookup:
 * a minimum at or below the direct net keeps execution on the terminal path,
 * a minimum above it routes through the pool. `skip: true` forces the
 * terminal path outright (the floor still applies).
 *
 * @param args.hook The hook address the terminal consults (from the preview's
 * hook specification).
 * @param args.minimumSwapAmountOut The net-output floor.
 * @param args.skip Force the direct terminal path. Defaults to false.
 * @returns The metadata to pass as `cashOutTokensOf`'s `metadata` argument.
 */
export function buildBuybackCashOutMetadata({
  hook,
  minimumSwapAmountOut,
  skip = false,
}: {
  hook: Address;
  minimumSwapAmountOut: bigint;
  skip?: boolean;
}): Hex {
  if (minimumSwapAmountOut < 0n) {
    throw new Error("Cash out minimum cannot be negative");
  }
  const payload = encodeAbiParameters(
    [{ type: "uint256" }, { type: "bool" }],
    [minimumSwapAmountOut, skip],
  );
  return createHookMetadata(
    [hookMetadataId(hook, "cashOut")],
    [payload],
  ) as Hex;
}

/** A hook specification tuple as returned by the terminal preview functions. */
export interface CashOutHookSpecification {
  hook: Address;
  noop: boolean;
  amount: bigint;
  metadata: Hex;
}

/**
 * A slippage-protected cash-out route: which venue the transaction should
 * expect, and the exact `minTokensReclaimed`/`metadata` pair to submit.
 */
export interface CashOutRoute {
  /** "treasury" = direct bonding-curve reclaim; "amm" = buyback pool sell. */
  route: "treasury" | "amm";
  /** The quoted net output on the chosen route. */
  expectedReturn: bigint;
  /** The slippage-floored minimum net output. */
  minimumReturn: bigint;
  /**
   * The `minTokensReclaimed` to pass to `cashOutTokensOf`. Non-zero only on
   * the treasury route — on the pool route the terminal itself reclaims
   * nothing (the hook pays the beneficiary), so the floor lives in
   * {@link CashOutRoute.metadata} instead.
   */
  terminalMinimum: bigint;
  /** The `metadata` to pass to `cashOutTokensOf`. */
  metadata: Hex;
  /** The gross direct reclaim, before the terminal fee. */
  treasuryGross: bigint;
  /** The terminal fee on the direct reclaim. */
  treasuryProtocolFee: bigint;
  /** The net direct reclaim after the terminal fee. */
  treasuryNet: bigint;
  /** The decoded buyback diagnostics, when the hook was consulted. */
  buyback: (BuybackCashOutSpec & { hook: Address }) | null;
}

/** A terminal cash out or a direct sale of already-claimed project ERC-20s. */
export type BestCashOutRoute =
  | {
      kind: "cash-out";
      expectedReturn: bigint;
      minimumReturn: bigint;
      cashOut: CashOutRoute;
    }
  | {
      kind: "direct-swap";
      expectedReturn: bigint;
      minimumReturn: bigint;
      /** The displaced terminal route, retained for comparison and fallback. */
      cashOut: CashOutRoute;
      poolKey: UniswapV4PoolKey;
      zeroForOne: boolean;
    };

/**
 * Pick the executable exit which guarantees the holder the most reclaim token.
 *
 * A direct pool sale can only spend claimed ERC-20s. Internal Juicebox credits
 * stay on the terminal route until they are claimed. The direct route must beat
 * the terminal's full expected output even after user slippage; an optimistic
 * pool quote alone is never enough to displace a deterministic cash out.
 */
export function chooseBestCashOutRoute({
  cashOut,
  directSwapQuote,
  directSwapPoolKey,
  directSwapZeroForOne,
  spendableProjectTokenCount = 0n,
  cashOutCount,
  slippageBps = DEFAULT_CASH_OUT_SLIPPAGE_BPS,
}: {
  cashOut: CashOutRoute;
  directSwapQuote?: bigint | null;
  directSwapPoolKey?: UniswapV4PoolKey;
  directSwapZeroForOne?: boolean;
  spendableProjectTokenCount?: bigint;
  cashOutCount: bigint;
  slippageBps?: bigint;
}): BestCashOutRoute {
  const cashOutCandidate: BestCashOutRoute = {
    kind: "cash-out",
    expectedReturn: cashOut.expectedReturn,
    minimumReturn: cashOut.minimumReturn,
    cashOut,
  };
  if (
    !directSwapQuote ||
    directSwapQuote <= 0n ||
    !directSwapPoolKey ||
    directSwapZeroForOne === undefined ||
    cashOutCount <= 0n ||
    spendableProjectTokenCount < cashOutCount
  ) {
    return cashOutCandidate;
  }

  const minimumReturn = slippageFloor(directSwapQuote, slippageBps);
  if (minimumReturn <= cashOut.expectedReturn) return cashOutCandidate;

  return {
    kind: "direct-swap",
    expectedReturn: directSwapQuote,
    minimumReturn,
    cashOut,
    poolKey: directSwapPoolKey,
    zeroForOne: directSwapZeroForOne,
  };
}

export interface DirectCashOutSwapArguments {
  poolKey: UniswapV4PoolKey;
  projectToken: Address;
  /** Claimed ERC-20 balance available to the Universal Router. */
  spendableProjectTokenCount: bigint;
}

export interface BestCashOutArguments extends HookAwareCashOutArguments {
  directSwap?: DirectCashOutSwapArguments;
}

/** Pool fee/impact already reflected by the buyback hook's executable quote. */
export function cashOutPoolBufferBps(
  route: CashOutRoute | null | undefined,
): bigint | null {
  const buyback = route?.route === "amm" ? route.buyback : null;
  if (!buyback || buyback.rawSwapQuote <= 0n) return null;
  const executableQuote =
    buyback.minimumSwapAmountOut > buyback.rawSwapQuote
      ? buyback.rawSwapQuote
      : buyback.minimumSwapAmountOut;
  return (
    ((buyback.rawSwapQuote - executableQuote) * MAX_BPS +
      buyback.rawSwapQuote -
      1n) /
    buyback.rawSwapQuote
  );
}

/** Machine-readable cash-out failures which clients can translate into copy. */
export type CashOutExecutionErrorCode =
  | "BUYBACK_SLIPPAGE_EXCEEDED"
  | "TERMINAL_UNDER_MIN";

export interface CashOutExecutionError {
  code: CashOutExecutionErrorCode;
  selector: Hex;
}

const CASH_OUT_EXECUTION_ERRORS: readonly (CashOutExecutionError & {
  matchers: readonly string[];
})[] = [
  {
    code: "BUYBACK_SLIPPAGE_EXCEEDED",
    selector: "0xe2d708a9",
    matchers: ["0xe2d708a9", "jbbuybackhook_specifiedslippageexceeded"],
  },
  {
    code: "TERMINAL_UNDER_MIN",
    selector: "0x6b2bb382",
    matchers: ["0x6b2bb382", "jbmultiterminal_undermin"],
  },
] as const;

function collectCashOutErrorText(
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
  ].flatMap((item) => collectCashOutErrorText(item, seen, depth + 1));
}

/** Classify known cash-out errors through viem/wallet nested error shapes. */
export function classifyCashOutExecutionError(
  error: unknown,
): CashOutExecutionError | null {
  const text = collectCashOutErrorText(error).join(" | ").toLowerCase();
  if (!text) return null;
  const matched = CASH_OUT_EXECUTION_ERRORS.find(({ matchers }) =>
    matchers.some((matcher) => text.includes(matcher)),
  );
  return matched ? { code: matched.code, selector: matched.selector } : null;
}

/**
 * Interpret a hook-aware `previewCashOutFrom` result and prepare a
 * slippage-protected route.
 *
 * On the treasury route the floor is enforced via `minTokensReclaimed`; if the
 * routing flips to the pool between quote and inclusion, the transaction
 * reverts rather than executing a stale path — re-quote and retry. On the pool
 * route the floor is moved into the hook's `cashOut` metadata (the terminal
 * minimum must be zero there), and if the floored pool quote no longer beats
 * the direct net, the route falls back to the treasury path.
 *
 * @param args.reclaimAmount `previewCashOutFrom`'s gross reclaim amount.
 * @param args.cashOutTaxRate `previewCashOutFrom`'s cash-out tax rate.
 * @param args.hookSpecifications `previewCashOutFrom`'s hook specifications.
 * @param args.buybackHookAddress The chain's `JBBuybackHook` address. Only a
 * specification from this exact hook is interpreted as the buyback route —
 * other data hooks (e.g. a 721 tiers hook) also emit specifications with
 * metadata, and decoding one as a buyback quote would submit a cash out with
 * a zero terminal minimum. When omitted, every specification is treated as
 * non-buyback and the deterministic treasury route (with its real
 * `minTokensReclaimed` floor) is returned.
 * @param args.beneficiaryIsFeeless Whether the beneficiary is feeless.
 * Defaults to false (conservative: assumes the fee applies).
 * @param args.feeFreeSurplus The terminal's `feeFreeSurplusOf` for the token.
 * Only consulted when the tax rate is zero. Defaults to 0.
 * @param args.slippageBps Tolerance for quote-to-inclusion drift. Defaults to
 * {@link DEFAULT_CASH_OUT_SLIPPAGE_BPS}.
 * @returns The protected route.
 */
export function resolveCashOutRoute({
  reclaimAmount,
  cashOutTaxRate,
  hookSpecifications,
  buybackHookAddress,
  beneficiaryIsFeeless = false,
  feeFreeSurplus = 0n,
  slippageBps = DEFAULT_CASH_OUT_SLIPPAGE_BPS,
}: {
  reclaimAmount: bigint;
  cashOutTaxRate: bigint;
  hookSpecifications: readonly CashOutHookSpecification[];
  buybackHookAddress?: Address;
  beneficiaryIsFeeless?: boolean;
  feeFreeSurplus?: bigint;
  slippageBps?: bigint;
}): CashOutRoute {
  requireBps(slippageBps);
  const treasuryProtocolFee = cashOutProtocolFee({
    reclaimAmount,
    cashOutTaxRate,
    beneficiaryIsFeeless,
    feeFreeSurplus,
  });
  const treasuryNet = reclaimAmount - treasuryProtocolFee;

  const buybackHook = buybackHookAddress?.toLowerCase() ?? null;
  const specification =
    (buybackHook &&
      hookSpecifications.find(
        (spec) =>
          spec.hook.toLowerCase() === buybackHook && spec.metadata !== "0x",
      )) ||
    null;
  const buyback = specification
    ? {
        hook: specification.hook,
        ...decodeBuybackCashOutSpec(specification.metadata),
      }
    : null;

  const treasuryRoute: CashOutRoute = {
    route: "treasury",
    expectedReturn: treasuryNet,
    minimumReturn: slippageFloor(treasuryNet, slippageBps),
    terminalMinimum: slippageFloor(treasuryNet, slippageBps),
    metadata: "0x",
    treasuryGross: reclaimAmount,
    treasuryProtocolFee,
    treasuryNet,
    buyback,
  };

  if (!specification || specification.noop || !buyback) return treasuryRoute;

  // The raw swap quote is an optimistic oracle quote used for display and
  // route comparison. The hook's minimumSwapAmountOut is the executable pool
  // quote after fee, liquidity, and price-impact constraints. User slippage
  // must be applied to that executable value; applying it to rawSwapQuote can
  // create a minimum the pool cannot satisfy.
  const quote =
    buyback.rawSwapQuote > 0n
      ? buyback.rawSwapQuote
      : buyback.minimumSwapAmountOut;
  const executableQuote =
    buyback.rawSwapQuote > 0n &&
    buyback.minimumSwapAmountOut > buyback.rawSwapQuote
      ? buyback.rawSwapQuote
      : buyback.minimumSwapAmountOut;
  const minimumReturn =
    buyback.rawSwapQuote > 0n && !buyback.hasUserSpecifiedMinimumSwapAmountOut
      ? slippageFloor(executableQuote, slippageBps)
      : buyback.minimumSwapAmountOut;

  // An explicit metadata minimum at or below the direct net routes execution
  // back to the terminal path anyway; take the deterministic treasury route.
  if (quote <= 0n || minimumReturn <= buyback.netDirectCashOutAmount) {
    return treasuryRoute;
  }

  return {
    route: "amm",
    expectedReturn: quote,
    minimumReturn,
    terminalMinimum: 0n,
    metadata: buildBuybackCashOutMetadata({
      hook: specification.hook,
      minimumSwapAmountOut: minimumReturn,
    }),
    treasuryGross: reclaimAmount,
    treasuryProtocolFee,
    treasuryNet,
    buyback,
  };
}

/**
 * Quote a cash out through `JBMultiTerminal.previewCashOutFrom` — the
 * hook-aware simulation of the REAL cash-out path (data hook, buyback
 * routing, cross-chain terms) — and prepare a slippage-protected route.
 *
 * Prefer this over {@link getCashOutQuote} for building transactions:
 * `currentReclaimableSurplusOf` skips the data hook entirely, so its result
 * can diverge from what `cashOutTokensOf` pays and is unsafe to use as a
 * minimum.
 *
 * @param client A viem public client on the given chain.
 * @param args.chainId The chain to quote on.
 * @param args.projectId The project's id.
 * @param args.holder The address whose tokens would be cashed out.
 * @param args.cashOutCount The number of project tokens to cash out.
 * @param args.tokenToReclaim The terminal token to reclaim.
 * @param args.beneficiary The reclaim beneficiary. Defaults to the holder.
 * @param args.terminal The terminal to quote against. Defaults to the chain's
 * canonical `JBMultiTerminal`.
 * @param args.buybackHookAddress The buyback hook whose specification may win
 * the pool route. Defaults to the chain's canonical `JBBuybackHook`; pass it
 * explicitly for a project whose `JBBuybackHookRegistry` entry points at a
 * custom hook. On a chain with no `JBBuybackHook` deployment, specifications
 * are treated as non-buyback and the treasury route is returned.
 * @param args.beneficiaryIsFeeless Whether the beneficiary is feeless.
 * Defaults to false.
 * @param args.slippageBps Tolerance for quote-to-inclusion drift. Defaults to
 * {@link DEFAULT_CASH_OUT_SLIPPAGE_BPS}.
 * @returns The protected route (see {@link CashOutRoute}).
 */
export interface HookAwareCashOutArguments {
  chainId: JBChainId;
  projectId: bigint;
  holder: Address;
  cashOutCount: bigint;
  tokenToReclaim: Address;
  beneficiary?: Address;
  terminal?: Address;
  buybackHookAddress?: Address;
  beneficiaryIsFeeless?: boolean;
  slippageBps?: bigint;
}

/** The protocol facts returned by one `previewCashOutFrom` call. */
export interface CashOutPreviewSnapshot {
  rulesetId: bigint | null;
  reclaimAmount: bigint;
  cashOutTaxRate: bigint;
  hookSpecifications: readonly CashOutHookSpecification[];
}

function rulesetIdOf(ruleset: unknown): bigint | null {
  const id =
    ruleset && typeof ruleset === "object" && "id" in ruleset
      ? (ruleset as { id?: unknown }).id
      : Array.isArray(ruleset)
        ? ruleset[0]
        : null;
  try {
    return id === null || id === undefined ? null : BigInt(id as string);
  } catch {
    return null;
  }
}

async function readCashOutPreviewSnapshot(
  client: PublicClient,
  {
    terminal,
    holder,
    projectId,
    cashOutCount,
    tokenToReclaim,
    beneficiary,
    metadata,
  }: {
    terminal: Address;
    holder: Address;
    projectId: bigint;
    cashOutCount: bigint;
    tokenToReclaim: Address;
    beneficiary: Address;
    metadata: Hex;
  },
): Promise<CashOutPreviewSnapshot> {
  const [ruleset, reclaimAmount, cashOutTaxRate, hookSpecifications] =
    await client.readContract({
      address: terminal,
      abi: jbMultiTerminalAbi,
      functionName: "previewCashOutFrom",
      args: [
        holder,
        projectId,
        cashOutCount,
        tokenToReclaim,
        beneficiary,
        metadata,
      ],
    });
  return {
    rulesetId: rulesetIdOf(ruleset),
    reclaimAmount,
    cashOutTaxRate,
    hookSpecifications,
  };
}

async function resolveCashOutPreviewSnapshot(
  client: PublicClient,
  preview: CashOutPreviewSnapshot,
  {
    terminal,
    projectId,
    tokenToReclaim,
    buybackHookAddress,
    beneficiaryIsFeeless,
    slippageBps,
  }: {
    terminal: Address;
    projectId: bigint;
    tokenToReclaim: Address;
    buybackHookAddress?: Address;
    beneficiaryIsFeeless: boolean;
    slippageBps: bigint;
  },
): Promise<CashOutRoute> {
  const feeFreeSurplus =
    preview.cashOutTaxRate === 0n
      ? await client.readContract({
          address: terminal,
          abi: jbMultiTerminalAbi,
          functionName: "feeFreeSurplusOf",
          args: [projectId, tokenToReclaim],
        })
      : 0n;

  return resolveCashOutRoute({
    reclaimAmount: preview.reclaimAmount,
    cashOutTaxRate: preview.cashOutTaxRate,
    hookSpecifications: preview.hookSpecifications,
    buybackHookAddress,
    beneficiaryIsFeeless,
    feeFreeSurplus,
    slippageBps,
  });
}

export async function getHookAwareCashOutQuote(
  client: PublicClient,
  {
    chainId,
    projectId,
    holder,
    cashOutCount,
    tokenToReclaim,
    beneficiary = holder,
    terminal,
    buybackHookAddress,
    beneficiaryIsFeeless = false,
    slippageBps = DEFAULT_CASH_OUT_SLIPPAGE_BPS,
  }: HookAwareCashOutArguments,
): Promise<CashOutRoute> {
  const terminalAddress = terminal ?? v6Address("JBMultiTerminal", chainId);
  const buybackHook =
    buybackHookAddress ?? optionalV6Address("JBBuybackHook", chainId);
  const preview = await readCashOutPreviewSnapshot(client, {
    terminal: terminalAddress,
    holder,
    projectId,
    cashOutCount,
    tokenToReclaim,
    beneficiary,
    metadata: "0x",
  });
  return resolveCashOutPreviewSnapshot(client, preview, {
    terminal: terminalAddress,
    projectId,
    tokenToReclaim,
    buybackHookAddress: buybackHook,
    beneficiaryIsFeeless,
    slippageBps,
  });
}

/**
 * Quote the best user exit across the terminal and a directly spendable pool.
 *
 * `previewCashOutFrom` remains the source of truth for terminal and buyback-hook
 * settlement. When a matching pool and sufficient claimed ERC-20 balance are
 * supplied, the V4 Quoter is read as well and a direct swap wins only when its
 * slippage-protected minimum exceeds the terminal route's full expected output.
 */
export async function getBestCashOutRoute(
  client: PublicClient,
  args: BestCashOutArguments,
): Promise<BestCashOutRoute> {
  const cashOut = await getHookAwareCashOutQuote(client, args);
  const directSwap = args.directSwap;
  if (
    !directSwap ||
    directSwap.spendableProjectTokenCount < args.cashOutCount ||
    args.cashOutCount <= 0n
  ) {
    return chooseBestCashOutRoute({
      cashOut,
      cashOutCount: args.cashOutCount,
      slippageBps: args.slippageBps,
    });
  }

  const zeroForOne = uniswapV4SwapDirection({
    poolKey: directSwap.poolKey,
    tokenIn: directSwap.projectToken,
    tokenOut: args.tokenToReclaim,
  });
  if (zeroForOne === null) {
    return chooseBestCashOutRoute({
      cashOut,
      cashOutCount: args.cashOutCount,
      slippageBps: args.slippageBps,
    });
  }

  let directSwapQuote: bigint;
  try {
    directSwapQuote = await quoteUniswapV4ExactInputSingle(client, {
      chainId: args.chainId,
      poolKey: directSwap.poolKey,
      zeroForOne,
      amountIn: args.cashOutCount,
    });
  } catch {
    // The direct pool is an optional optimization. A missing/reverting quoter
    // must not make an otherwise valid terminal cash out unavailable.
    return chooseBestCashOutRoute({
      cashOut,
      cashOutCount: args.cashOutCount,
      slippageBps: args.slippageBps,
    });
  }
  return chooseBestCashOutRoute({
    cashOut,
    directSwapQuote,
    directSwapPoolKey: directSwap.poolKey,
    directSwapZeroForOne: zeroForOne,
    spendableProjectTokenCount: directSwap.spendableProjectTokenCount,
    cashOutCount: args.cashOutCount,
    slippageBps: args.slippageBps,
  });
}

export class CashOutRouteChangedError extends Error {
  readonly code = "CASH_OUT_ROUTE_CHANGED";

  constructor() {
    super(
      "The cash-out route changed while its executable minimum was being locked.",
    );
    this.name = "CashOutRouteChangedError";
  }
}

/** A fresh quote, locked AMM preview, and matching transaction request. */
export interface PreparedHookAwareCashOut {
  route: CashOutRoute;
  transaction: V6CashOutTxRequest;
  preview: CashOutPreviewSnapshot;
  lockedPreview: CashOutPreviewSnapshot | null;
}

export type PreparedBestCashOut =
  | ({ kind: "cash-out" } & PreparedHookAwareCashOut)
  | {
      kind: "direct-swap";
      route: Extract<BestCashOutRoute, { kind: "direct-swap" }>;
      transaction: UniswapV4SwapTxRequest;
    };

/**
 * Prepare the exact hook-aware cash-out request a wallet should submit.
 *
 * Pool routes are re-previewed with their slippage metadata before the request
 * is returned. This proves the executable minimum still selects the same route
 * and avoids clients independently composing a stale quote and transaction.
 */
export async function prepareHookAwareCashOut(
  client: PublicClient,
  {
    chainId,
    projectId,
    holder,
    cashOutCount,
    tokenToReclaim,
    beneficiary = holder,
    terminal,
    buybackHookAddress,
    beneficiaryIsFeeless = false,
    slippageBps = DEFAULT_CASH_OUT_SLIPPAGE_BPS,
  }: HookAwareCashOutArguments,
): Promise<PreparedHookAwareCashOut> {
  const terminalAddress = terminal ?? v6Address("JBMultiTerminal", chainId);
  const buybackHook =
    buybackHookAddress ?? optionalV6Address("JBBuybackHook", chainId);
  const resolvePreview = (preview: CashOutPreviewSnapshot) =>
    resolveCashOutPreviewSnapshot(client, preview, {
      terminal: terminalAddress,
      projectId,
      tokenToReclaim,
      buybackHookAddress: buybackHook,
      beneficiaryIsFeeless,
      slippageBps,
    });

  const preview = await readCashOutPreviewSnapshot(client, {
    terminal: terminalAddress,
    holder,
    projectId,
    cashOutCount,
    tokenToReclaim,
    beneficiary,
    metadata: "0x",
  });
  const route = await resolvePreview(preview);
  let lockedPreview: CashOutPreviewSnapshot | null = null;

  if (route.route === "amm") {
    lockedPreview = await readCashOutPreviewSnapshot(client, {
      terminal: terminalAddress,
      holder,
      projectId,
      cashOutCount,
      tokenToReclaim,
      beneficiary,
      metadata: route.metadata,
    });
    const lockedRoute = await resolvePreview(lockedPreview);
    if (
      (preview.rulesetId !== null &&
        lockedPreview.rulesetId !== null &&
        lockedPreview.rulesetId !== preview.rulesetId) ||
      lockedRoute.route !== "amm" ||
      lockedRoute.minimumReturn !== route.minimumReturn ||
      lockedRoute.metadata.toLowerCase() !== route.metadata.toLowerCase()
    ) {
      throw new CashOutRouteChangedError();
    }
  }

  return {
    route,
    transaction: buildCashOutTx({
      chainId,
      terminal: terminalAddress,
      holder,
      projectId,
      cashOutCount,
      tokenToReclaim,
      minTokensReclaimed: route.terminalMinimum,
      beneficiary,
      metadata: route.metadata,
    }),
    preview,
    lockedPreview,
  };
}

/**
 * Freshly prepare the best executable cash-out or direct-swap transaction.
 *
 * A direct swap is freshly quoted and slippage-floored in the same operation
 * which builds its Universal Router request. If it cannot safely beat the
 * terminal, the terminal path is re-previewed and locked instead.
 */
export async function prepareBestCashOut(
  client: PublicClient,
  args: BestCashOutArguments & { directSwapDeadline: bigint },
): Promise<PreparedBestCashOut> {
  const best = await getBestCashOutRoute(client, args);
  if (best.kind === "direct-swap") {
    return {
      kind: "direct-swap",
      route: best,
      transaction: buildUniswapV4ExactInputSwapTx({
        chainId: args.chainId,
        poolKey: best.poolKey,
        zeroForOne: best.zeroForOne,
        amountIn: args.cashOutCount,
        minimumAmountOut: best.minimumReturn,
        recipient: args.beneficiary ?? args.holder,
        deadline: args.directSwapDeadline,
      }),
    };
  }

  return {
    kind: "cash-out",
    ...(await prepareHookAwareCashOut(client, args)),
  };
}

/**
 * `v6Address`, but returning undefined instead of throwing on a chain the
 * contract isn't deployed to.
 */
function optionalV6Address(
  contract: Parameters<typeof v6Address>[0],
  chainId: JBChainId,
): Address | undefined {
  try {
    return v6Address(contract, chainId);
  } catch {
    return undefined;
  }
}
