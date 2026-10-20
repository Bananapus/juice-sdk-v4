import {
  Address,
  Hex,
  PublicClient,
  encodeAbiParameters,
  getAddress,
  zeroAddress,
} from "viem";
import {
  DEFAULT_ALLOW_OVERSPENDING,
  MAX_RESERVED_PERCENT,
  NATIVE_TOKEN,
} from "../constants.js";
import {
  jbBuybackHookRegistryAbi,
  jbMultiTerminalAbi,
} from "../generated/juicebox.js";
import { JBChainId } from "../types.js";
import { createHookMetadata, hookMetadataId } from "../utils/hook.js";
import { slippageFloor } from "./cashOut.js";
import { v6Address } from "./types.js";
import {
  quoteUniswapV4ExactInputSingle,
  uniswapV4PoolId,
} from "./uniswapV4.js";

/**
 * A prepared `pay` transaction request, accepted as-is by viem's
 * `walletClient.writeContract` and wagmi's `writeContract`.
 */
export interface V6PayTxRequest {
  chainId: JBChainId;
  address: Address;
  abi: typeof jbMultiTerminalAbi;
  functionName: "pay";
  args: readonly [bigint, Address, bigint, Address, bigint, string, Hex];
  value: bigint;
}

/**
 * Build a `pay(projectId, token, amount, beneficiary, minReturnedTokens, memo,
 * metadata)` transaction request for a v6 terminal.
 *
 * When `token` is the native token, `value` is set to `amount` (the terminal reads the
 * paid amount from `msg.value`); for ERC-20 payments `value` is 0 and the terminal must
 * be approved to pull `amount` beforehand.
 *
 * @param args.chainId The chain to pay on.
 * @param args.terminal The terminal to pay (resolve with `resolvePaymentTerminal`).
 * @param args.projectId The project's id.
 * @param args.token The token being paid.
 * @param args.amount The amount being paid, as a fixed point number with the token's
 * decimals.
 * @param args.beneficiary The address that receives the minted project tokens.
 * @param args.minReturnedTokens The minimum project token count the beneficiary must
 * receive, else the transaction reverts. Defaults to 0.
 * @param args.memo A memo included in the Pay event. Defaults to "".
 * @param args.metadata Hook metadata (e.g. from {@link build721PayMetadata}). Defaults
 * to "0x".
 * @returns The transaction request.
 */
export function buildPayTx({
  chainId,
  terminal,
  projectId,
  token,
  amount,
  beneficiary,
  minReturnedTokens = 0n,
  memo = "",
  metadata = "0x",
}: {
  chainId: JBChainId;
  terminal: Address;
  projectId: bigint;
  token: Address;
  amount: bigint;
  beneficiary: Address;
  minReturnedTokens?: bigint;
  memo?: string;
  metadata?: Hex;
}): V6PayTxRequest {
  const isNative = token.toLowerCase() === NATIVE_TOKEN.toLowerCase();

  return {
    chainId,
    address: terminal,
    abi: jbMultiTerminalAbi,
    functionName: "pay",
    args: [
      projectId,
      token,
      amount,
      beneficiary,
      minReturnedTokens,
      memo,
      metadata,
    ],
    value: isNative ? amount : 0n,
  };
}

/**
 * The result of previewing a payment.
 */
export interface PayPreview {
  /**
   * The project token count the beneficiary would receive.
   */
  beneficiaryTokenCount: bigint;
  /**
   * The project token count that would be reserved for the project's reserved splits.
   */
  reservedTokenCount: bigint;
}

/**
 * Preview the project tokens a payment puts in the beneficiary's hands, via the
 * terminal's `previewPayFor(projectId, token, amount, beneficiary, metadata)`.
 *
 * When the buyback hook wins the route, the terminal mints nothing itself and
 * reports zero; the hook's pay specification carries the swap quote. This folds
 * it in with the router terminal's scoring rule (see
 * {@link effectivePayPreview}), for the hook the buyback registry resolves for
 * the project, 1.4 or 1.1.1, or for buyback 1.4 when the ruleset calls it
 * directly. The swap figure ignores pool fees and price
 * impact, so use {@link prepareUserPay} for a payment's minimum.
 *
 * @param client A viem public client on the given chain.
 * @param args.chainId The chain to preview on.
 * @param args.terminal The terminal that would be paid.
 * @param args.projectId The project's id.
 * @param args.token The token being paid.
 * @param args.amount The amount being paid, as a fixed point number with the token's
 * decimals.
 * @param args.beneficiary The address that would receive the project tokens.
 * @param args.metadata Hook metadata. Defaults to "0x".
 * @returns The previewed token counts.
 */
export async function previewPay(
  client: PublicClient,
  args: PayArgs & { metadata?: Hex },
): Promise<PayPreview> {
  return (await readPay(client, args)).preview;
}

interface PayArgs {
  chainId: JBChainId;
  terminal: Address;
  projectId: bigint;
  token: Address;
  amount: bigint;
  beneficiary: Address;
}

/** The fields of a buyback pay specification the SDK reads. */
interface BuybackPaySpec {
  hook: Address;
  noop: boolean;
  projectTokenIs0: boolean;
  amountToMintWith: bigint;
  minimumSwapAmountOut: bigint;
  tokenCountWithoutHook: bigint;
  weightRatio: bigint;
  amountToSwapWith: bigint;
  poolId: Hex;
  rawSwapQuote: bigint;
  oracleUnseeded: boolean;
  skipSplits: boolean;
  reservedPercent: bigint;
}

type PayHookSpecification = {
  hook: Address;
  noop: boolean;
  metadata: Hex;
};

/**
 * Decode a buyback pay specification: 17 words on 1.4, 15 on 1.1.1, which
 * share the first 15. 1.1.1 has no `skipSplits` and reports no reserved
 * percent, so the ruleset's is used.
 */
function decodeBuybackPaySpec(
  spec: PayHookSpecification,
  rulesetReservedPercent: bigint,
): BuybackPaySpec | null {
  const words = (spec.metadata.length - 2) / 64;
  if (words !== 15 && words < 17) return null;
  const word = (i: number) =>
    `0x${spec.metadata.slice(2 + i * 64, 2 + (i + 1) * 64)}` as Hex;
  const uint = (i: number) => BigInt(word(i));
  return {
    hook: spec.hook,
    noop: spec.noop,
    projectTokenIs0: uint(0) !== 0n,
    amountToMintWith: uint(1),
    minimumSwapAmountOut: uint(2),
    tokenCountWithoutHook: uint(5),
    weightRatio: uint(6),
    amountToSwapWith: uint(7),
    poolId: word(10),
    rawSwapQuote: uint(13),
    oracleUnseeded: uint(14) !== 0n,
    skipSplits: words >= 17 && uint(15) !== 0n,
    reservedPercent: words >= 17 ? uint(16) : rulesetReservedPercent,
  };
}

/** The controller's beneficiary share of a split mint, rounded the same way. */
function splitOf(tokenCount: bigint, reservedPercent: bigint): PayPreview {
  const max = BigInt(MAX_RESERVED_PERCENT);
  const beneficiaryTokenCount = (tokenCount * (max - reservedPercent)) / max;
  return {
    beneficiaryTokenCount,
    reservedTokenCount: tokenCount - beneficiaryTokenCount,
  };
}

/** Tokens the hook's direct-mint leg issues, as the hook computes them. */
function directMintOf(spec: BuybackPaySpec, weight: bigint): bigint {
  return spec.amountToMintWith !== 0n && spec.weightRatio !== 0n
    ? (spec.amountToMintWith * weight) / spec.weightRatio
    : 0n;
}

/**
 * Fold the buyback hook's pay specification into a terminal preview, with the
 * rule `JBPayRouteResolver._effectivePreviewPayTokenCounts` scores routes by.
 * The swap leg uses the hook's raw quote: the TWAP price times the amount, with
 * no pool fee or price impact. It is a ranking figure, not a minimum.
 */
export function effectivePayPreview({
  buybackHook,
  beneficiaryTokenCount,
  reservedTokenCount,
  weight,
  reservedPercent = 0n,
  hookSpecifications,
}: {
  buybackHook: Address | null;
  beneficiaryTokenCount: bigint;
  reservedTokenCount: bigint;
  weight: bigint;
  /** The ruleset's reserved percent, for 1.1.1 specs. */
  reservedPercent?: bigint;
  hookSpecifications: readonly PayHookSpecification[];
}): PayPreview {
  let best: PayPreview = { beneficiaryTokenCount, reservedTokenCount };
  if (
    !buybackHook ||
    beneficiaryTokenCount !== 0n ||
    reservedTokenCount !== 0n
  ) {
    return best;
  }
  for (const spec of hookSpecifications) {
    if (spec.noop || spec.hook.toLowerCase() !== buybackHook.toLowerCase()) {
      continue;
    }
    const decoded = decodeBuybackPaySpec(spec, reservedPercent);
    if (!decoded) continue;

    const directMintTokenCount = directMintOf(decoded, weight);
    const swapTokenCount =
      !decoded.oracleUnseeded &&
      decoded.rawSwapQuote > decoded.minimumSwapAmountOut
        ? decoded.rawSwapQuote
        : decoded.minimumSwapAmountOut;
    const candidate = splitOf(
      decoded.skipSplits
        ? directMintTokenCount
        : swapTokenCount + directMintTokenCount,
      decoded.reservedPercent,
    );
    if (decoded.skipSplits) candidate.beneficiaryTokenCount += swapTokenCount;

    if (
      candidate.beneficiaryTokenCount > best.beneficiaryTokenCount ||
      (candidate.beneficiaryTokenCount === best.beneficiaryTokenCount &&
        candidate.reservedTokenCount > best.reservedTokenCount)
    ) {
      best = candidate;
    }
  }
  return best;
}

/**
 * What the payer receives if the hook mints instead of swapping. The hook
 * swaps only while the pool beats this rate, and unwinds to it when a swap
 * underfills, so every honest settlement clears it.
 */
function mintEntitlementOf(spec: BuybackPaySpec, weight: bigint): bigint {
  const swapLeg = spec.skipSplits
    ? spec.tokenCountWithoutHook
    : splitOf(spec.tokenCountWithoutHook, spec.reservedPercent)
        .beneficiaryTokenCount;
  return (
    swapLeg +
    splitOf(directMintOf(spec, weight), spec.reservedPercent)
      .beneficiaryTokenCount
  );
}

/** One terminal preview, with the project's buyback spec decoded. */
async function readPay(
  client: PublicClient,
  {
    chainId,
    terminal,
    projectId,
    token,
    amount,
    beneficiary,
    metadata = "0x",
  }: PayArgs & { metadata?: Hex },
): Promise<{
  preview: PayPreview;
  terminalBeneficiaryTokenCount: bigint;
  weight: bigint;
  buyback: BuybackPaySpec | null;
  /** The project's hook swaps with a spec this SDK cannot read. */
  unreadableSwap: boolean;
  /** The buyback hook the ruleset calls directly, not through the registry. */
  directBuybackHook: Address | null;
}> {
  const [
    ruleset,
    beneficiaryTokenCount,
    reservedTokenCount,
    hookSpecifications,
  ] = await client.readContract({
    address: terminal,
    abi: jbMultiTerminalAbi,
    functionName: "previewPayFor",
    args: [projectId, token, amount, beneficiary, metadata],
  });
  // Only a payment with hook specs needs to know which one is the buyback hook.
  const directBuybackHook =
    hookSpecifications.length > 0
      ? await directBuybackHookOf(client, chainId, projectId, ruleset)
      : null;
  const buybackHook =
    directBuybackHook ??
    (hookSpecifications.length > 0
      ? await resolvedBuybackHookOf(client, chainId, projectId)
      : null);
  const reservedPercent = (ruleset.metadata >> 4n) & 0xffffn;
  const spec = buybackHook
    ? hookSpecifications.find(
        (s) => s.hook.toLowerCase() === buybackHook.toLowerCase(),
      )
    : undefined;
  return {
    preview: effectivePayPreview({
      buybackHook,
      beneficiaryTokenCount,
      reservedTokenCount,
      weight: ruleset.weight,
      reservedPercent,
      hookSpecifications,
    }),
    terminalBeneficiaryTokenCount: beneficiaryTokenCount,
    weight: ruleset.weight,
    buyback: spec ? decodeBuybackPaySpec(spec, reservedPercent) : null,
    unreadableSwap:
      !!spec && !spec.noop && !decodeBuybackPaySpec(spec, reservedPercent),
    directBuybackHook,
  };
}

/**
 * The buyback hook 1.4 when the ruleset's pay data hook is that hook itself, or
 * the omnichain deployer forwarding to it, rather than the registry. The hook
 * then reads only metadata keyed to its own address.
 */
// Only this read of the omnichain deployer: its full ABI would weigh on every pay card.
const extraDataHookOfAbi = [
  {
    type: "function",
    name: "extraDataHookOf",
    stateMutability: "view",
    inputs: [
      { name: "projectId", type: "uint256" },
      { name: "rulesetId", type: "uint256" },
    ],
    outputs: [
      {
        name: "hook",
        type: "tuple",
        components: [
          { name: "dataHook", type: "address" },
          { name: "useDataHookForPay", type: "bool" },
          { name: "useDataHookForCashOut", type: "bool" },
        ],
      },
    ],
  },
] as const;

async function directBuybackHookOf(
  client: PublicClient,
  chainId: JBChainId,
  projectId: bigint,
  ruleset: { id: number | bigint; metadata: bigint },
): Promise<Address | null> {
  if (((ruleset.metadata >> 80n) & 1n) === 0n) return null;
  let buyback: Address, omnichain: Address;
  try {
    buyback = v6Address("JBBuybackHook", chainId);
    omnichain = v6Address("JBOmnichainDeployer", chainId);
  } catch {
    return null;
  }
  const is = (a: Address, b: Address) => a.toLowerCase() === b.toLowerCase();
  const dataHook = getAddress(
    `0x${(ruleset.metadata >> 82n).toString(16).padStart(40, "0").slice(-40)}`,
  );
  if (is(dataHook, buyback)) return buyback;
  if (!is(dataHook, omnichain)) return null;
  const extra = await client.readContract({
    address: omnichain,
    abi: extraDataHookOfAbi,
    functionName: "extraDataHookOf",
    args: [projectId, BigInt(ruleset.id)],
  });
  return extra.useDataHookForPay && is(extra.dataHook, buyback)
    ? buyback
    : null;
}

/** The buyback hook the registry resolves for a project, or null. */
async function resolvedBuybackHookOf(
  client: PublicClient,
  chainId: JBChainId,
  projectId: bigint,
): Promise<Address | null> {
  let registry: Address;
  try {
    registry = v6Address("JBBuybackHookRegistry", chainId);
  } catch {
    return null;
  }
  // A failed read throws: guessing "no hook" would drop the payment's minimum.
  const hook = await client.readContract({
    address: registry,
    abi: jbBuybackHookRegistryAbi,
    functionName: "hookOf",
    args: [projectId],
  });
  return hook === zeroAddress ? null : hook;
}

const maxBigInt = (a: bigint, b: bigint) => (a > b ? a : b);

/** A pay card's whole payment: what to send, what to show, what to require. */
export interface PreparedUserPay {
  metadata: Hex;
  preview: PayPreview;
  minReturnedTokens: bigint;
}

const poolKeyOfAbi = [
  {
    type: "function",
    name: "poolKeyOf",
    stateMutability: "view",
    inputs: [
      { name: "projectId", type: "uint256" },
      { name: "terminalToken", type: "address" },
    ],
    outputs: [
      {
        name: "key",
        type: "tuple",
        components: [
          { name: "currency0", type: "address" },
          { name: "currency1", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "tickSpacing", type: "int24" },
          { name: "hooks", type: "address" },
        ],
      },
    ],
  },
] as const;

/**
 * Prepare a person's payment with {@link buildUserPayMetadata}: preview it,
 * and set the minimum the terminal enforces on the beneficiary's balance.
 *
 * When the project's buyback hook honors `skipSplits` and its pool is in the
 * paid token, this quotes that pool (fee and price impact included) and sends
 * the slippage-floored quote as an explicit minimum. The hook then swaps
 * whenever the pool beats the payer's share of a mint, and reverts below the
 * floor. Without it the hook routes by its TWAP floor, which reaches zero on
 * large buys against a thin pool and sends them to minting even when the pool
 * pays far more.
 *
 * Otherwise (no pool, hook 1.1.1, a router converting the token first, or a
 * failed quote) the hook routes by TWAP. The minimum is then the payer's mint
 * entitlement when the hook would swap, since the hook never settles below it,
 * and the terminal's own issuance when it would not.
 *
 * When the ruleset calls buyback hook 1.4 directly (or through the omnichain
 * deployer) instead of through the registry, the metadata is keyed to the hook,
 * which reads nothing else.
 *
 * @param args.slippageBps Tolerance on the pool quote and on the fallback
 * minimum. Defaults to 100 (1%).
 * @param args.skipSplits Whether the beneficiary keeps the swapped tokens
 * without the reserved split. Defaults to true, as a person's pay card does;
 * pass false for payments that should honor the project's splits, such as
 * fees or revenue routed into a project.
 */
export async function prepareUserPay(
  client: PublicClient,
  {
    tiers,
    slippageBps = 100n,
    skipSplits = true,
    ...args
  }: PayArgs & {
    tiers?: UserPayTiers;
    slippageBps?: bigint;
    skipSplits?: boolean;
  },
): Promise<PreparedUserPay> {
  const { chainId, projectId, token } = args;
  let metadata = buildUserPayMetadata({ chainId, tiers, skipSplits });
  let read = await readPay(client, { ...args, metadata });
  // The direct hook ignores the registry's entry: preview again with its own.
  const hook = read.directBuybackHook;
  if (hook) {
    metadata = buildUserPayMetadata({ chainId, tiers, skipSplits, hook });
    read = await readPay(client, { ...args, metadata });
  }
  const {
    preview,
    terminalBeneficiaryTokenCount,
    weight,
    buyback,
    unreadableSwap,
  } = read;
  if (unreadableSwap) {
    throw new Error(
      "The project's buyback hook swaps with an unknown specification, so no safe minimum can be set.",
    );
  }
  const fallback: PreparedUserPay = {
    metadata,
    preview,
    minReturnedTokens: slippageFloor(
      buyback && !buyback.noop
        ? // The swap and the leftover mint each round down once.
          maxBigInt(mintEntitlementOf(buyback, weight) - 2n, 0n)
        : terminalBeneficiaryTokenCount,
      slippageBps,
    ),
  };
  if (!buyback?.skipSplits || buyback.amountToSwapWith === 0n) return fallback;

  try {
    const poolKey = await client.readContract({
      address: buyback.hook,
      abi: poolKeyOfAbi,
      functionName: "poolKeyOf",
      args: [
        projectId,
        token.toLowerCase() === NATIVE_TOKEN.toLowerCase()
          ? zeroAddress
          : token,
      ],
    });
    // A router converts the paid token first, so its pool is a different one.
    if (uniswapV4PoolId(poolKey) !== buyback.poolId) return fallback;
    const quote = await quoteUniswapV4ExactInputSingle(client, {
      chainId,
      poolKey,
      zeroForOne: !buyback.projectTokenIs0,
      amountIn: buyback.amountToSwapWith,
    });
    const minimumSwapAmountOut = slippageFloor(quote, slippageBps);
    // The pool loses to minting: leave the payment on the mint path.
    if (minimumSwapAmountOut <= buyback.tokenCountWithoutHook) return fallback;
    const directMint = splitOf(
      directMintOf(buyback, weight),
      buyback.reservedPercent,
    );
    return {
      metadata: buildUserPayMetadata({
        chainId,
        tiers,
        minimumSwapAmountOut,
        skipSplits,
        ...(hook ? { hook } : {}),
      }),
      preview: {
        beneficiaryTokenCount: quote + directMint.beneficiaryTokenCount,
        reservedTokenCount: directMint.reservedTokenCount,
      },
      minReturnedTokens: minimumSwapAmountOut,
    };
  } catch {
    return fallback;
  }
}

/**
 * Build pay metadata instructing a project's JB721 tiers hook to mint specific tiers.
 *
 * The tier payload is `abi.encode(bool allowOverspending, uint16[] tierIdsToMint)`,
 * keyed by the hook's metadata id (`bytes4(bytes20(metadataIdTarget) ^
 * bytes20(keccak256("pay")))`) and packed into the JBMetadataResolver
 * word-offset-table format.
 *
 * @param args.metadataIdTarget The hook's `METADATA_ID_TARGET` — the shared
 * *implementation* address, NOT the project's clone hook address (see
 * {@link get721MetadataIdTarget}). Passing the clone address makes the hook ignore
 * the tiers and the payment mints ZERO NFTs (it succeeds, minting only tokens).
 * @param args.hookAddress Deprecated alias for `metadataIdTarget`. Only correct
 * when it already holds `METADATA_ID_TARGET`; prefer `metadataIdTarget`.
 * @param args.tierIdsToMint The tier ids to mint, one entry per NFT.
 * @param args.allowOverspending Whether payment beyond the tiers' total price is
 * allowed (excess mints no NFT). Defaults to true. Note the hook still gates this
 * on its store's `preventOverspending` flag.
 * @returns The metadata to pass as `pay`'s `metadata` argument.
 */
export function build721PayMetadata({
  metadataIdTarget,
  hookAddress,
  tierIdsToMint,
  allowOverspending = DEFAULT_ALLOW_OVERSPENDING,
}: {
  metadataIdTarget?: Address;
  /** @deprecated Use `metadataIdTarget`. */
  hookAddress?: Address;
  tierIdsToMint: bigint[];
  allowOverspending?: boolean;
}): Hex {
  const target = metadataIdTarget ?? hookAddress;
  if (!target) {
    throw new Error("build721PayMetadata requires metadataIdTarget");
  }

  const tierPayload = encodeAbiParameters(
    [{ type: "bool" }, { type: "uint16[]" }],
    [allowOverspending, tierIdsToMint.map(Number)],
  );

  return createHookMetadata(
    [hookMetadataId(target, "pay")],
    [tierPayload],
  ) as Hex;
}

/**
 * Encode the three-word pay quote required by buyback hook 1.4.0.
 * An explicit minimum is a settlement guarantee; zero uses the oracle floor,
 * whose underfill unwinds the swap and falls back to minting. Resolve the
 * project's actual hook before selecting this metadata target.
 */
export function buildBuybackPayMetadata({
  hook,
  amountToSwapWith,
  minimumSwapAmountOut,
  skipSplits = false,
}: {
  hook: Address;
  amountToSwapWith: bigint;
  minimumSwapAmountOut: bigint;
  skipSplits?: boolean;
}): Hex {
  return createHookMetadata(
    [hookMetadataId(hook, "pay")],
    [
      encodeAbiParameters(
        [{ type: "uint256" }, { type: "uint256" }, { type: "bool" }],
        [amountToSwapWith, minimumSwapAmountOut, skipSplits],
      ),
    ],
  );
}

/** The 721 tiers a payment buys. */
export interface UserPayTiers {
  metadataIdTarget: Address;
  tierIdsToMint: bigint[];
  allowOverspending?: boolean;
}

/**
 * The pay metadata a person's pay card sends: the buyback registry's quote
 * `(0, minimumSwapAmountOut, skipSplits)`, plus the 721 tiers when the
 * payment buys NFTs. Prefer {@link prepareUserPay}, which picks the minimum
 * and the hook. `hook` keys the quote to a buyback hook the ruleset calls
 * directly instead of to the registry.
 *
 * The registry rekeys its quote to the project's resolved hook. On buyback 1.4
 * the hook buys from the pool only when that gives the payer more than their
 * share of a mint, and hands the swapped tokens over without the reserved
 * split. Minting still goes through the split. A zero swap amount swaps the
 * whole payment. A zero minimum routes by the hook's TWAP floor; a nonzero one
 * replaces it and reverts below it. The terminal's `minReturnedTokens` checks
 * the beneficiary's balance change, which counts the swapped tokens.
 */
export function buildUserPayMetadata({
  chainId,
  tiers,
  minimumSwapAmountOut = 0n,
  skipSplits = true,
  hook = v6Address("JBBuybackHookRegistry", chainId),
}: {
  chainId: JBChainId;
  tiers?: UserPayTiers;
  minimumSwapAmountOut?: bigint;
  skipSplits?: boolean;
  hook?: Address;
}): Hex {
  const ids = [hookMetadataId(hook, "pay")];
  const data: Hex[] = [
    encodeAbiParameters(
      [{ type: "uint256" }, { type: "uint256" }, { type: "bool" }],
      [0n, minimumSwapAmountOut, skipSplits],
    ),
  ];
  if (tiers && tiers.tierIdsToMint.length > 0) {
    ids.push(hookMetadataId(tiers.metadataIdTarget, "pay"));
    data.push(
      encodeAbiParameters(
        [{ type: "bool" }, { type: "uint16[]" }],
        [
          tiers.allowOverspending ?? DEFAULT_ALLOW_OVERSPENDING,
          tiers.tierIdsToMint.map(Number),
        ],
      ),
    );
  }
  return createHookMetadata(ids, data);
}
