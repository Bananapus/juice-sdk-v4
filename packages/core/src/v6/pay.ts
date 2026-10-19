import {
  Address,
  Hex,
  PublicClient,
  encodeAbiParameters,
  zeroAddress,
} from "viem";
import {
  DEFAULT_ALLOW_OVERSPENDING,
  MAX_RESERVED_PERCENT,
  NATIVE_TOKEN,
} from "../constants.js";
import { jbMultiTerminalAbi } from "../generated/juicebox.js";
import { JBChainId } from "../types.js";
import { getJBContractAddress } from "../utils/contracts.js";
import { createHookMetadata, hookMetadataId } from "../utils/hook.js";
import { slippageFloor } from "./cashOut.js";
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
 * reports zero; the hook's 1.4 pay specification carries the swap quote. This
 * reads it with the same rule the router terminal scores routes by
 * (`JBPayRouteResolver._effectivePreviewPayTokenCounts`), so direct and routed
 * previews agree. Older hooks' shorter specifications are ignored, as the router
 * ignores them.
 *
 * @param client A viem public client on the given chain.
 * @param args.chainId The chain to preview on.
 * @param args.terminal The terminal that would be paid.
 * @param args.projectId The project's id.
 * @param args.token The token being paid.
 * @param args.amount The amount being paid, as a fixed point number with the token's
 * decimals.
 * @param args.beneficiary The address that would receive the project tokens.
 * @param args.metadata Hook metadata (e.g. from {@link buildUserPayMetadata}).
 * Defaults to "0x".
 * @returns The previewed token counts.
 */
export async function previewPay(
  client: PublicClient,
  {
    chainId,
    terminal,
    projectId,
    token,
    amount,
    beneficiary,
    metadata = "0x",
  }: {
    chainId: JBChainId;
    terminal: Address;
    projectId: bigint;
    token: Address;
    amount: bigint;
    beneficiary: Address;
    metadata?: Hex;
  },
): Promise<PayPreview> {
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

  return effectivePayPreview({
    buybackHook: buybackHookOf(chainId),
    beneficiaryTokenCount,
    reservedTokenCount,
    weight: ruleset.weight,
    hookSpecifications,
  });
}

function buybackHookOf(chainId: JBChainId): Address | null {
  try {
    return getJBContractAddress("JBBuybackHook", 6, chainId);
  } catch {
    return null;
  }
}

/** The fields of buyback 1.4's 17-word pay specification the SDK reads. */
interface BuybackPaySpec {
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

/** Decode a 1.4 buyback pay spec; older hooks' 15-word specs return null. */
function decodeBuybackPaySpec(metadata: Hex): BuybackPaySpec | null {
  if ((metadata.length - 2) / 64 < 17) return null;
  const word = (i: number) =>
    `0x${metadata.slice(2 + i * 64, 2 + (i + 1) * 64)}` as Hex;
  const uint = (i: number) => BigInt(word(i));
  return {
    projectTokenIs0: uint(0) !== 0n,
    amountToMintWith: uint(1),
    minimumSwapAmountOut: uint(2),
    tokenCountWithoutHook: uint(5),
    weightRatio: uint(6),
    amountToSwapWith: uint(7),
    poolId: word(10),
    rawSwapQuote: uint(13),
    oracleUnseeded: uint(14) !== 0n,
    skipSplits: uint(15) !== 0n,
    reservedPercent: uint(16),
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

/**
 * Fold the buyback hook's pay specification into a terminal preview. Mirrors
 * `JBPayRouteResolver._effectivePreviewPayTokenCounts` and
 * `_hookPreviewPayTokenCounts`.
 *
 * `floorOnly` scores the swap leg at the hook's TWAP floor instead of its raw
 * quote. The raw quote is the TWAP price times the amount, with no pool fee or
 * price impact, so only the floor is safe as a `minReturnedTokens`.
 */
export function effectivePayPreview({
  buybackHook,
  beneficiaryTokenCount,
  reservedTokenCount,
  weight,
  hookSpecifications,
  floorOnly = false,
}: {
  buybackHook: Address | null;
  beneficiaryTokenCount: bigint;
  reservedTokenCount: bigint;
  weight: bigint;
  hookSpecifications: readonly PayHookSpecification[];
  floorOnly?: boolean;
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
    const decoded = decodeBuybackPaySpec(spec.metadata);
    if (!decoded) continue;

    const directMintTokenCount =
      decoded.amountToMintWith !== 0n && decoded.weightRatio !== 0n
        ? (decoded.amountToMintWith * weight) / decoded.weightRatio
        : 0n;
    const swapTokenCount =
      !floorOnly &&
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
 * When the buyback hook's pool is in the paid token, this quotes that pool
 * (fee and price impact included) and sends the slippage-floored quote as an
 * explicit minimum. The hook then swaps whenever the pool beats the payer's
 * share of a mint, and reverts below the floor. Without it the hook routes by
 * its TWAP floor, which reaches zero on large buys against a thin pool and
 * sends them to minting even when the pool pays far more. Otherwise (no pool,
 * an older hook, or a router converting the token first) the hook routes by
 * TWAP and the minimum is its floor.
 *
 * @param args.slippageBps Tolerance on the pool quote and on non-swap
 * previews. Defaults to 100 (1%).
 */
export async function prepareUserPay(
  client: PublicClient,
  {
    chainId,
    terminal,
    projectId,
    token,
    amount,
    beneficiary,
    tiers,
    slippageBps = 100n,
  }: {
    chainId: JBChainId;
    terminal: Address;
    projectId: bigint;
    token: Address;
    amount: bigint;
    beneficiary: Address;
    tiers?: UserPayTiers;
    slippageBps?: bigint;
  },
): Promise<PreparedUserPay> {
  const metadata = buildUserPayMetadata({ chainId, tiers });
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
  const fold = (floorOnly: boolean) =>
    effectivePayPreview({
      buybackHook: buybackHookOf(chainId),
      beneficiaryTokenCount,
      reservedTokenCount,
      weight: ruleset.weight,
      hookSpecifications,
      floorOnly,
    });
  const preview = fold(false);
  const fallback: PreparedUserPay = {
    metadata,
    preview,
    minReturnedTokens: slippageFloor(
      fold(true).beneficiaryTokenCount,
      slippageBps,
    ),
  };

  const buybackHook = buybackHookOf(chainId);
  const spec = hookSpecifications.find(
    (s) => !!buybackHook && s.hook.toLowerCase() === buybackHook.toLowerCase(),
  );
  const decoded = spec ? decodeBuybackPaySpec(spec.metadata) : null;
  if (!spec || !decoded || decoded.amountToSwapWith === 0n) return fallback;

  try {
    const poolKey = await client.readContract({
      address: spec.hook,
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
    if (uniswapV4PoolId(poolKey) !== decoded.poolId) return fallback;
    const quote = await quoteUniswapV4ExactInputSingle(client, {
      chainId,
      poolKey,
      zeroForOne: !decoded.projectTokenIs0,
      amountIn: decoded.amountToSwapWith,
    });
    const minimumSwapAmountOut = slippageFloor(quote, slippageBps);
    // The pool loses to minting: leave the payment on the mint path.
    if (minimumSwapAmountOut <= decoded.tokenCountWithoutHook) return fallback;
    return {
      metadata: buildUserPayMetadata({ chainId, tiers, minimumSwapAmountOut }),
      preview: { beneficiaryTokenCount: quote, reservedTokenCount: 0n },
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
 * `(0, minimumSwapAmountOut, skipSplits=true)`, plus the 721 tiers when the
 * payment buys NFTs. Prefer {@link prepareUserPay}, which picks the minimum.
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
}: {
  chainId: JBChainId;
  tiers?: UserPayTiers;
  minimumSwapAmountOut?: bigint;
}): Hex {
  const ids = [
    hookMetadataId(
      getJBContractAddress("JBBuybackHookRegistry", 6, chainId),
      "pay",
    ),
  ];
  const data: Hex[] = [
    encodeAbiParameters(
      [{ type: "uint256" }, { type: "uint256" }, { type: "bool" }],
      [0n, minimumSwapAmountOut, true],
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
