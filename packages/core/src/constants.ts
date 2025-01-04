import { Address, Chain, Hash, parseEther, parseUnits } from "viem";
import {
  arbitrumSepolia,
  baseSepolia,
  optimismSepolia,
  sepolia,
} from "viem/chains";
import { JBChainId } from "./types.js";

/**
 * Representation of one ether.
 */
export const ONE_ETHER = parseEther("1");

/**
 * Default value for `memo` arguments in Juicebox transactions.
 */
export const DEFAULT_MEMO = "";

/**
 * Default value for `metadata` arguments in Juicebox transactions.
 */
export const DEFAULT_METADATA = "0x0" as Hash;
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
 * @link JBConstants.sol
 */
export const MAX_FEE = 1_000_000_000;

/**
 * @link JBConstants.sol
 */
export const MAX_FEE_DISCOUNT = 1_000_000_000;

// uint 224, probably a better way lol
export const MAX_PAYOUT_LIMIT = BigInt(
  "26959946667150639794667015087019630673637144422540572481103610249215"
);

/**
 * The 100% representation for a ruleset's Splits.
 *
 * The sum of all Splits should total this value.
 *
 * @link JBConstants.sol
 */
export const SPLITS_TOTAL_PERCENT = 1_000_000_000;

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
export const ONE_JB_TOKEN = parseUnits("1", JB_TOKEN_DECIMALS);

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
 * Within Juicebox contracts, 0 is used to represent the native currency.
 *
 * @link JBCurrencyIds.sol
 * @note 61166n
 */
export const NATIVE_CURRENCY_ID = Number(BigInt(NATIVE_TOKEN));

/**
 * Amount of decimals to use for native token fixed-point representation.
 *
 * 18 is assumed to be the default for most EVM-based chains.
 */
export const NATIVE_TOKEN_DECIMALS = 18 as const;

/**
 * The fee percentage taken by Juicebox DAO on cashing out Tokens.
 */
export const JBDAO_CASHOUT_FEE_PERCENT = 0.025;

type JBChainMetadata = {
  chain: Chain;
  name: string;
  slug: string;
  nativeTokenSymbol: string;
};

export const JB_CHAINS: Record<JBChainId, JBChainMetadata> = {
  [sepolia.id]: {
    chain: sepolia,
    name: "Sepolia",
    slug: "sepolia",
    nativeTokenSymbol: "SepETH",
  },
  [optimismSepolia.id]: {
    chain: optimismSepolia,
    name: "Optimism Sepolia",
    slug: "opsepolia",
    nativeTokenSymbol: "OPSepETH",
  },
  [baseSepolia.id]: {
    chain: baseSepolia,
    name: "Base Sepolia",
    slug: "basesepolia",
    nativeTokenSymbol: "ArbSepETH",
  },
  [arbitrumSepolia.id]: {
    chain: arbitrumSepolia,
    name: "Arbitrum Sepolia",
    slug: "arbsepolia",
    nativeTokenSymbol: "BaseSepETH",
  },
};

/**
 * Map of JBChain slugs to chains.
 * Useful when getting the chain for a particular url path.
 */
export const JB_CHAIN_SLUGS = Object.values(JB_CHAINS).reduce(
  (slugs: Record<string, JBChainMetadata>, chainMetadata) => {
    slugs[chainMetadata.slug] = chainMetadata;
    return slugs;
  },
  {}
);

export const DEFAULT_NATIVE_TOKEN_SYMBOL = "ETH";
