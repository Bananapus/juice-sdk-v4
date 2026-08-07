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
import {
  jbCcipSuckerDeployerAddress,
  jbContractAddress,
  jbNativeSuckerDeployerAddress,
} from "./generated/juicebox.js";
import { JBChainId, JBSuckerContracts, JBVersion } from "./types.js";

/**
 * Representation of one ether.
 */
export const ONE_ETHER = parseEther("1");

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
export const MAX_PAYOUT_LIMIT = BigInt(
  "26959946667150639794667015087019630673637144422540572481103610249215",
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
} = {
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
  {},
);

export const DEFAULT_NATIVE_TOKEN_SYMBOL = "ETH";

type SuckerDeployerMap = {
  [k in JBChainId]?: {
    [k in JBChainId]?: Address;
  };
};

/**
 * CCIP sucker deployer addresses, keyed by version, then local chain, then remote chain.
 *
 * The `5` map is also used for v4 deployments.
 *
 * @see https://discord.com/channels/1139291093310132376/1139291094069301385/1337164727008366683
 */
export const CCIP_SUCKER_DEPLOYER_ADDRESSES: Record<5 | 6, SuckerDeployerMap> =
  {
    6: jbCcipSuckerDeployerAddress[6] as SuckerDeployerMap,
    5: {
      [sepolia.id]: {
        [optimismSepolia.id]:
          jbContractAddress[5][JBSuckerContracts.JBCCIPSuckerDeployer][
            sepolia.id
          ],
        [baseSepolia.id]:
          jbContractAddress[5][JBSuckerContracts.JBCCIPSuckerDeployer_1][
            sepolia.id
          ],
        [arbitrumSepolia.id]:
          jbContractAddress[5][JBSuckerContracts.JBCCIPSuckerDeployer_2][
            sepolia.id
          ],
      },
      [mainnet.id]: {
        [optimism.id]:
          jbContractAddress[5][JBSuckerContracts.JBCCIPSuckerDeployer][
            mainnet.id
          ],
        [base.id]:
          jbContractAddress[5][JBSuckerContracts.JBCCIPSuckerDeployer_1][
            mainnet.id
          ],
        [arbitrum.id]:
          jbContractAddress[5][JBSuckerContracts.JBCCIPSuckerDeployer_2][
            mainnet.id
          ],
      },

      [arbitrumSepolia.id]: {
        [sepolia.id]:
          jbContractAddress[5][JBSuckerContracts.JBCCIPSuckerDeployer][
            arbitrumSepolia.id
          ],
        [optimismSepolia.id]:
          jbContractAddress[5][JBSuckerContracts.JBCCIPSuckerDeployer_1][
            arbitrumSepolia.id
          ],
        [baseSepolia.id]:
          jbContractAddress[5][JBSuckerContracts.JBCCIPSuckerDeployer_2][
            arbitrumSepolia.id
          ],
      },
      [arbitrum.id]: {
        [mainnet.id]:
          jbContractAddress[5][JBSuckerContracts.JBCCIPSuckerDeployer][
            arbitrum.id
          ],
        [optimism.id]:
          jbContractAddress[5][JBSuckerContracts.JBCCIPSuckerDeployer_1][
            arbitrum.id
          ],
        [base.id]:
          jbContractAddress[5][JBSuckerContracts.JBCCIPSuckerDeployer_2][
            arbitrum.id
          ],
      },

      [optimismSepolia.id]: {
        [sepolia.id]:
          jbContractAddress[5][JBSuckerContracts.JBCCIPSuckerDeployer][
            optimismSepolia.id
          ],
        [arbitrumSepolia.id]:
          jbContractAddress[5][JBSuckerContracts.JBCCIPSuckerDeployer_1][
            optimismSepolia.id
          ],
        [baseSepolia.id]:
          jbContractAddress[5][JBSuckerContracts.JBCCIPSuckerDeployer_2][
            optimismSepolia.id
          ],
      },
      [optimism.id]: {
        [mainnet.id]:
          jbContractAddress[5][JBSuckerContracts.JBCCIPSuckerDeployer][
            optimism.id
          ],
        [arbitrum.id]:
          jbContractAddress[5][JBSuckerContracts.JBCCIPSuckerDeployer_1][
            optimism.id
          ],
        [base.id]:
          jbContractAddress[5][JBSuckerContracts.JBCCIPSuckerDeployer_2][
            optimism.id
          ],
      },

      [baseSepolia.id]: {
        [sepolia.id]:
          jbContractAddress[5][JBSuckerContracts.JBCCIPSuckerDeployer][
            baseSepolia.id
          ],
        [optimismSepolia.id]:
          jbContractAddress[5][JBSuckerContracts.JBCCIPSuckerDeployer_1][
            baseSepolia.id
          ],
        [arbitrumSepolia.id]:
          jbContractAddress[5][JBSuckerContracts.JBCCIPSuckerDeployer_2][
            baseSepolia.id
          ],
      },
      [base.id]: {
        [mainnet.id]:
          jbContractAddress[5][JBSuckerContracts.JBCCIPSuckerDeployer][base.id],
        [optimism.id]:
          jbContractAddress[5][JBSuckerContracts.JBCCIPSuckerDeployer_1][
            base.id
          ],
        [arbitrum.id]:
          jbContractAddress[5][JBSuckerContracts.JBCCIPSuckerDeployer_2][
            base.id
          ],
      },
    },
  };

/**
 * Native-bridge (OP/Base/Arbitrum standard bridge) sucker deployer addresses, keyed by
 * version, then local chain, then remote chain. Native bridges only connect Ethereum
 * with an L2, so only L1<->L2 edges exist. v6 only.
 */
export const NATIVE_SUCKER_DEPLOYER_ADDRESSES: Record<6, SuckerDeployerMap> = {
  6: jbNativeSuckerDeployerAddress[6] as SuckerDeployerMap,
};

/**
 * USDC contract addresses on supported chains.
 */
export const USDC_ADDRESSES: Record<JBChainId, Address> = {
  [sepolia.id]: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
  [mainnet.id]: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  [optimismSepolia.id]: "0x5fd84259d66Cd46123540766Be93DFE6D43130D7",
  [optimism.id]: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
  [baseSepolia.id]: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  [base.id]: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  [arbitrumSepolia.id]: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
  [arbitrum.id]: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
};
