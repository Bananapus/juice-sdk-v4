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
import { applyJbDaoCashOutFee } from "../utils/fee.js";
import { createHookMetadata, hookMetadataId } from "../utils/hook.js";
import { NATIVE_TOKEN_CURRENCY_ID } from "./currency.js";
import { v6Address } from "./types.js";

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
   * The reclaim amount net of the 2.5% protocol cash out fee.
   *
   * The fee only applies when the ruleset's cash out tax rate is non-zero — for
   * zero-tax rulesets the full {@link CashOutQuote.reclaimAmount} is paid out.
   */
  reclaimAmountAfterFee: bigint;
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
 * @returns The raw reclaim amount and the amount net of the 2.5% protocol fee.
 *
 * NOTE: the defaults quote in NATIVE terms (decimals 18, token-keyed native
 * currency). For a project whose accounting token is not the native token
 * (e.g. USDC), pass that token's `decimals` and `tokenCurrencyId(token)` to
 * quote in its own terms and avoid a price-feed conversion.
 */
export async function getCashOutQuote(
  client: PublicClient,
  {
    chainId,
    projectId,
    cashOutCount,
    decimals = 18n,
    currency = BigInt(NATIVE_TOKEN_CURRENCY_ID),
  }: {
    chainId: JBChainId;
    projectId: bigint;
    cashOutCount: bigint;
    decimals?: bigint;
    currency?: bigint;
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
    reclaimAmountAfterFee: applyJbDaoCashOutFee(reclaimAmount),
  };
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
  beneficiaryIsFeeless = false,
  feeFreeSurplus = 0n,
  slippageBps = DEFAULT_CASH_OUT_SLIPPAGE_BPS,
}: {
  reclaimAmount: bigint;
  cashOutTaxRate: bigint;
  hookSpecifications: readonly CashOutHookSpecification[];
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

  const specification =
    hookSpecifications.find((spec) => spec.metadata !== "0x") ?? null;
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

  // The pool route won the preview. Re-previews with an explicit metadata
  // minimum report that already-protected floor and no raw quote — preserve
  // it instead of discounting a second time.
  const quote =
    buyback.rawSwapQuote > 0n
      ? buyback.rawSwapQuote
      : buyback.minimumSwapAmountOut;
  const minimumReturn =
    buyback.rawSwapQuote > 0n && !buyback.hasUserSpecifiedMinimumSwapAmountOut
      ? slippageFloor(quote, slippageBps)
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
 * @param args.beneficiaryIsFeeless Whether the beneficiary is feeless.
 * Defaults to false.
 * @param args.slippageBps Tolerance for quote-to-inclusion drift. Defaults to
 * {@link DEFAULT_CASH_OUT_SLIPPAGE_BPS}.
 * @returns The protected route (see {@link CashOutRoute}).
 */
export async function getHookAwareCashOutQuote(
  client: PublicClient,
  {
    chainId,
    projectId,
    holder,
    cashOutCount,
    tokenToReclaim,
    beneficiary,
    terminal,
    beneficiaryIsFeeless = false,
    slippageBps = DEFAULT_CASH_OUT_SLIPPAGE_BPS,
  }: {
    chainId: JBChainId;
    projectId: bigint;
    holder: Address;
    cashOutCount: bigint;
    tokenToReclaim: Address;
    beneficiary?: Address;
    terminal?: Address;
    beneficiaryIsFeeless?: boolean;
    slippageBps?: bigint;
  },
): Promise<CashOutRoute> {
  const terminalAddress = terminal ?? v6Address("JBMultiTerminal", chainId);
  const [, reclaimAmount, cashOutTaxRate, hookSpecifications] =
    await client.readContract({
      address: terminalAddress,
      abi: jbMultiTerminalAbi,
      functionName: "previewCashOutFrom",
      args: [
        holder,
        projectId,
        cashOutCount,
        tokenToReclaim,
        beneficiary ?? holder,
        "0x",
      ],
    });

  // The fee-free surplus counter only matters on zero-tax rulesets.
  const feeFreeSurplus =
    cashOutTaxRate === 0n
      ? await client.readContract({
          address: terminalAddress,
          abi: jbMultiTerminalAbi,
          functionName: "feeFreeSurplusOf",
          args: [projectId, tokenToReclaim],
        })
      : 0n;

  return resolveCashOutRoute({
    reclaimAmount,
    cashOutTaxRate,
    hookSpecifications,
    beneficiaryIsFeeless,
    feeFreeSurplus,
    slippageBps,
  });
}
