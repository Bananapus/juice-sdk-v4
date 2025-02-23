import { Address, Chain, Hash, parseEther, parseUnits } from "viem";
import {
  arbitrum,
  arbitrumSepolia,
  base,
  baseSepolia,
  mainnet,
  optimism,
  optimismSepolia,
  sepolia,
} from "viem/chains";
import { JBChainId } from "./types.js";
import {
  jbccipSuckerDeployerAddress,
  jbccipSuckerDeployer_1Address,
  jbccipSuckerDeployer_2Address,
} from "./generated/juicebox.js";

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
  etherscanHostname: string;
};

export const JB_CHAINS: Record<JBChainId, JBChainMetadata> = {
  [sepolia.id]: {
    chain: sepolia,
    name: "Sepolia",
    slug: "sep",
    nativeTokenSymbol: "SepETH",
    etherscanHostname: "sepolia.etherscan.io",
  },
  [optimismSepolia.id]: {
    chain: optimismSepolia,
    name: "Optimism Sepolia",
    slug: "opsep",
    nativeTokenSymbol: "OPSepETH",
    etherscanHostname: "sepolia-optimism.etherscan.io",
  },
  [baseSepolia.id]: {
    chain: baseSepolia,
    name: "Base Sepolia",
    slug: "basesep",
    nativeTokenSymbol: "ArbSepETH",
    etherscanHostname: "sepolia.basescan.org",
  },
  [arbitrumSepolia.id]: {
    chain: arbitrumSepolia,
    name: "Arbitrum Sepolia",
    slug: "arbsep",
    nativeTokenSymbol: "BaseSepETH",
    etherscanHostname: "sepolia.arbiscan.io",
  },
  [mainnet.id]: {
    chain: mainnet,
    name: "Ethereum",
    slug: "eth",
    nativeTokenSymbol: "ETH",
    etherscanHostname: "etherscan.io",
  },
  [optimism.id]: {
    chain: optimism,
    name: "Optimism",
    slug: "op",
    nativeTokenSymbol: "ETH",
    etherscanHostname: "optimism.etherscan.io",
  },
  [base.id]: {
    chain: base,
    name: "Base",
    slug: "base",
    nativeTokenSymbol: "ETH",
    etherscanHostname: "basescan.org",
  },
  [arbitrum.id]: {
    chain: arbitrum,
    name: "Arbitrum",
    slug: "arb",
    nativeTokenSymbol: "ETH",
    etherscanHostname: "arbiscan.io",
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

type CCIPMap = {
  [k in JBChainId]?: {
    [k in JBChainId]?: Address;
  };
};

/**
 * @see https://discord.com/channels/1139291093310132376/1139291094069301385/1337164727008366683
 */
export const CCIP_SUCKER_DEPLOYER_ADDRESSES: CCIPMap = {
  [sepolia.id]: {
    [optimismSepolia.id]: jbccipSuckerDeployerAddress[sepolia.id],
    [baseSepolia.id]: jbccipSuckerDeployer_1Address[sepolia.id],
    [arbitrumSepolia.id]: jbccipSuckerDeployer_2Address[sepolia.id],
  },
  [mainnet.id]: {
    [optimism.id]: jbccipSuckerDeployerAddress[mainnet.id],
    [base.id]: jbccipSuckerDeployer_1Address[mainnet.id],
    [arbitrum.id]: jbccipSuckerDeployer_2Address[mainnet.id],
  },

  [arbitrumSepolia.id]: {
    [sepolia.id]: jbccipSuckerDeployerAddress[arbitrumSepolia.id],
    [optimismSepolia.id]: jbccipSuckerDeployer_1Address[arbitrumSepolia.id],
    [baseSepolia.id]: jbccipSuckerDeployer_2Address[arbitrumSepolia.id],
  },
  [arbitrum.id]: {
    [sepolia.id]: jbccipSuckerDeployerAddress[arbitrum.id],
    [optimism.id]: jbccipSuckerDeployer_1Address[arbitrum.id],
    [base.id]: jbccipSuckerDeployer_2Address[arbitrum.id],
  },

  [optimismSepolia.id]: {
    [sepolia.id]: jbccipSuckerDeployerAddress[optimismSepolia.id],
    [arbitrumSepolia.id]: jbccipSuckerDeployer_1Address[optimismSepolia.id],
    [baseSepolia.id]: jbccipSuckerDeployer_2Address[optimismSepolia.id],
  },
  [optimism.id]: {
    [sepolia.id]: jbccipSuckerDeployerAddress[optimism.id],
    [arbitrum.id]: jbccipSuckerDeployer_1Address[optimism.id],
    [base.id]: jbccipSuckerDeployer_2Address[optimism.id],
  },

  [baseSepolia.id]: {
    [sepolia.id]: jbccipSuckerDeployerAddress[baseSepolia.id],
    [optimismSepolia.id]: jbccipSuckerDeployer_1Address[baseSepolia.id],
    [arbitrumSepolia.id]: jbccipSuckerDeployer_2Address[baseSepolia.id],
  },
  [base.id]: {
    [sepolia.id]: jbccipSuckerDeployerAddress[base.id],
    [optimism.id]: jbccipSuckerDeployer_1Address[base.id],
    [arbitrum.id]: jbccipSuckerDeployer_2Address[base.id],
  },
};
