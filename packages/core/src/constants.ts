import { Address, Chain, parseEther, parseUnits } from "viem";
import {
  arbitrum,
  arbitrumSepolia,
  base,
  baseSepolia,
  mainnet,
  optimism,
  optimismSepolia,
  sepolia,
} from "./chains.js";
import { JBChainId, JBVersion } from "./types.js";

/**
 * Representation of one ether.
 */
export const ONE_ETHER = /* @__PURE__ */ parseEther("1");

/**
 * Default value for `memo` arguments in Juicebox transactions.
 */
export const DEFAULT_MEMO = "";

export const DEFAULT_MIN_RETURNED_TOKENS = 0n;
export const DEFAULT_ALLOW_OVERSPENDING = true;

/**
 * The maximum value for a ruleset's Reserved Rate.
 *
 * @link JBConstants.sol
 */
export const MAX_RESERVED_PERCENT = 10_000;

/**
 * The maximum value for a ruleset's Cash Out Tax Rate.
 *
 * @link JBConstants.sol
 */
export const MAX_CASH_OUT_TAX_RATE = 10_000;

/**
 * The maximum value for a ruleset's Decay Rate.
 *
 * @link JBConstants.sol
 */
export const MAX_WEIGHT_CUT_PERCENT = 1_000_000_000;

/**
 * The per-billion (1e9) denominator used by the legacy fixed-point fee helpers.
 *
 * NOT `JBConstants.MAX_FEE`, which is `1000` in v4, v5 and v6 alike — the
 * protocol fee is `STANDARD_FEE / MAX_FEE` = `25 / 1000`. For the contract
 * denominator use `MAX_FEE` from `@bananapus/nana-sdk-core/v6`, and for the
 * per-billion rate use `TERMINAL_FEE_PER_BILLION` from the same entry point.
 *
 * @deprecated Use `MAX_FEE` / `TERMINAL_FEE_PER_BILLION` from
 * `@bananapus/nana-sdk-core/v6`.
 */
export const MAX_FEE_PER_BILLION = 1_000_000_000;

/**
 * @link JBConstants.sol
 */
export const MAX_FEE_DISCOUNT = 1_000_000_000;

// uint 224, probably a better way lol
export const MAX_PAYOUT_LIMIT = /* @__PURE__ */ BigInt(
  "26959946667150639794667015087019630673637144422540572481103610249215",
);

export { SPLITS_TOTAL_PERCENT, USDC_ADDRESSES } from "./pureConstants.js";

/**
 * The number of decimals that the internal JB Token has.
 *
 * JB Token are internal to the Juicebox contracts.
 * They keep track of a given address's share of a treasury.
 * At a later time, a wallet can claim their ERC-20 tokens based on the JB Token they hold.
 *
 */
export const JB_TOKEN_DECIMALS = 18 as const;

/**
 * One JB project token as a fixed-point representation.
 */
export const ONE_JB_TOKEN = /* @__PURE__ */ parseUnits("1", JB_TOKEN_DECIMALS);

/**
 * An address representation of the network's 'native' token (e.g. ETH, OP).
 * Within Juicebox contracts, each chain's native token address is represented by this address.
 *
 * @link JBConstants.sol
 */
export const NATIVE_TOKEN: Address =
  "0x000000000000000000000000000000000000EEEe";

/**
 * The ID that represents the network's 'native' currency (e.g. ETH, OP).
 *
 * @link https://github.com/Bananapus/nana-core/blob/main/src/libraries/JBCurrencyIds.sol
 */
export const ETH_CURRENCY_ID = 1;
/**
 * The ID that represents USD currencies. Use this when specifying USD-deonominated payouts.
 *
 * @link https://github.com/Bananapus/nana-core/blob/main/src/libraries/JBCurrencyIds.sol
 */
export const USD_CURRENCY_ID = (version: JBVersion) => (version === 4 ? 3 : 2);

/**
 * Amount of decimals to use for native token fixed-point representation.
 *
 * 18 is assumed to be the default for most EVM-based chains.
 */
export const NATIVE_TOKEN_DECIMALS = 18 as const;

/**
 * The fee percentage taken by Juicebox DAO on cashing out Tokens.
 *
 * @deprecated Use `cashOutProtocolFee` from `@bananapus/nana-sdk-core/v6/cash-out`.
 * The contract fee is `reclaimAmount / 40` (floor division, NOT a float
 * multiply), it is skipped for feeless beneficiaries, and zero-tax cash outs
 * pay it only on `min(reclaimAmount, feeFreeSurplusOf)`. A float percentage
 * cannot express any of that.
 */
export const JBDAO_CASHOUT_FEE_PERCENT = 0.025;

type JBChainMetadata<ChainId extends JBChainId = JBChainId> = {
  chain: Chain & { id: ChainId };
  name: string;
  slug: string;
  nativeTokenSymbol: string;
  etherscanHostname: string;
};

/**
 * A chain's block-explorer hostname, derived from the chain definition's own
 * `blockExplorers` entry so it can never diverge from the explorer URL the
 * chain object carries (a hand-maintained copy once shipped the DNS-dead
 * `optimism.etherscan.io` while the chain definition had the correct
 * `optimistic.etherscan.io`).
 */
const explorerHostname = (chain: Chain): string =>
  new URL(chain.blockExplorers!.default.url).hostname;

/**
 * The chain-agnostic half of a `JB_CHAINS` entry: everything derivable from the
 * chain definition itself. `name` is the chain object's own `name`, so the
 * display string can never drift from what wallets and `chains.ts` report (a
 * hand-maintained copy once read "Optimism"/"Arbitrum" while the definitions
 * said "OP Mainnet"/"Arbitrum One").
 */
const derivedChainMetadata = <ChainId extends JBChainId>(
  chain: Chain & { id: ChainId },
) => ({
  chain,
  name: chain.name,
  etherscanHostname: explorerHostname(chain),
});

export const JB_CHAINS: {
  [ChainId in JBChainId]: JBChainMetadata<ChainId>;
} = /* @__PURE__ */ (() => ({
  [sepolia.id]: {
    ...derivedChainMetadata(sepolia),
    slug: "sep",
    nativeTokenSymbol: "SepETH",
  },
  [optimismSepolia.id]: {
    ...derivedChainMetadata(optimismSepolia),
    slug: "opsep",
    nativeTokenSymbol: "OPSepETH",
  },
  [baseSepolia.id]: {
    ...derivedChainMetadata(baseSepolia),
    slug: "basesep",
    nativeTokenSymbol: "BaseSepETH",
  },
  [arbitrumSepolia.id]: {
    ...derivedChainMetadata(arbitrumSepolia),
    slug: "arbsep",
    nativeTokenSymbol: "ArbSepETH",
  },
  [mainnet.id]: {
    ...derivedChainMetadata(mainnet),
    slug: "eth",
    nativeTokenSymbol: "ETH",
  },
  [optimism.id]: {
    ...derivedChainMetadata(optimism),
    slug: "op",
    nativeTokenSymbol: "ETH",
  },
  [base.id]: {
    ...derivedChainMetadata(base),
    slug: "base",
    nativeTokenSymbol: "ETH",
  },
  [arbitrum.id]: {
    ...derivedChainMetadata(arbitrum),
    slug: "arb",
    nativeTokenSymbol: "ETH",
  },
}))();

/**
 * Map of JBChain slugs to chains.
 * Useful when getting the chain for a particular url path.
 */
export const JB_CHAIN_SLUGS = /* @__PURE__ */ (() =>
  Object.values(JB_CHAINS).reduce(
    (slugs: Record<string, JBChainMetadata>, chainMetadata) => {
      slugs[chainMetadata.slug] = chainMetadata;
      return slugs;
    },
    {},
  ))();

export const DEFAULT_NATIVE_TOKEN_SYMBOL = "ETH";

export {
  CCIP_SUCKER_DEPLOYER_ADDRESSES,
  NATIVE_SUCKER_DEPLOYER_ADDRESSES,
} from "./suckerDeployerAddresses.js";
