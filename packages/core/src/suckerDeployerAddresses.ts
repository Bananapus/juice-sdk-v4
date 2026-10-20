import type { Address } from "viem";
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
  jbV5ContractAddress,
  jbNativeSuckerDeployerAddress,
} from "./generated/juicebox.js";
import { JBChainId, JBSuckerContracts } from "./types.js";

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
  /* @__PURE__ */ (() => ({
    6: jbCcipSuckerDeployerAddress[6] as SuckerDeployerMap,
    5: {
      [sepolia.id]: {
        [optimismSepolia.id]:
          jbV5ContractAddress[JBSuckerContracts.JBCCIPSuckerDeployer][
            sepolia.id
          ],
        [baseSepolia.id]:
          jbV5ContractAddress[JBSuckerContracts.JBCCIPSuckerDeployer_1][
            sepolia.id
          ],
        [arbitrumSepolia.id]:
          jbV5ContractAddress[JBSuckerContracts.JBCCIPSuckerDeployer_2][
            sepolia.id
          ],
      },
      [mainnet.id]: {
        [optimism.id]:
          jbV5ContractAddress[JBSuckerContracts.JBCCIPSuckerDeployer][
            mainnet.id
          ],
        [base.id]:
          jbV5ContractAddress[JBSuckerContracts.JBCCIPSuckerDeployer_1][
            mainnet.id
          ],
        [arbitrum.id]:
          jbV5ContractAddress[JBSuckerContracts.JBCCIPSuckerDeployer_2][
            mainnet.id
          ],
      },

      [arbitrumSepolia.id]: {
        [sepolia.id]:
          jbV5ContractAddress[JBSuckerContracts.JBCCIPSuckerDeployer][
            arbitrumSepolia.id
          ],
        [optimismSepolia.id]:
          jbV5ContractAddress[JBSuckerContracts.JBCCIPSuckerDeployer_1][
            arbitrumSepolia.id
          ],
        [baseSepolia.id]:
          jbV5ContractAddress[JBSuckerContracts.JBCCIPSuckerDeployer_2][
            arbitrumSepolia.id
          ],
      },
      [arbitrum.id]: {
        [mainnet.id]:
          jbV5ContractAddress[JBSuckerContracts.JBCCIPSuckerDeployer][
            arbitrum.id
          ],
        [optimism.id]:
          jbV5ContractAddress[JBSuckerContracts.JBCCIPSuckerDeployer_1][
            arbitrum.id
          ],
        [base.id]:
          jbV5ContractAddress[JBSuckerContracts.JBCCIPSuckerDeployer_2][
            arbitrum.id
          ],
      },

      [optimismSepolia.id]: {
        [sepolia.id]:
          jbV5ContractAddress[JBSuckerContracts.JBCCIPSuckerDeployer][
            optimismSepolia.id
          ],
        [arbitrumSepolia.id]:
          jbV5ContractAddress[JBSuckerContracts.JBCCIPSuckerDeployer_1][
            optimismSepolia.id
          ],
        [baseSepolia.id]:
          jbV5ContractAddress[JBSuckerContracts.JBCCIPSuckerDeployer_2][
            optimismSepolia.id
          ],
      },
      [optimism.id]: {
        [mainnet.id]:
          jbV5ContractAddress[JBSuckerContracts.JBCCIPSuckerDeployer][
            optimism.id
          ],
        [arbitrum.id]:
          jbV5ContractAddress[JBSuckerContracts.JBCCIPSuckerDeployer_1][
            optimism.id
          ],
        [base.id]:
          jbV5ContractAddress[JBSuckerContracts.JBCCIPSuckerDeployer_2][
            optimism.id
          ],
      },

      [baseSepolia.id]: {
        [sepolia.id]:
          jbV5ContractAddress[JBSuckerContracts.JBCCIPSuckerDeployer][
            baseSepolia.id
          ],
        [optimismSepolia.id]:
          jbV5ContractAddress[JBSuckerContracts.JBCCIPSuckerDeployer_1][
            baseSepolia.id
          ],
        [arbitrumSepolia.id]:
          jbV5ContractAddress[JBSuckerContracts.JBCCIPSuckerDeployer_2][
            baseSepolia.id
          ],
      },
      [base.id]: {
        [mainnet.id]:
          jbV5ContractAddress[JBSuckerContracts.JBCCIPSuckerDeployer][base.id],
        [optimism.id]:
          jbV5ContractAddress[JBSuckerContracts.JBCCIPSuckerDeployer_1][
            base.id
          ],
        [arbitrum.id]:
          jbV5ContractAddress[JBSuckerContracts.JBCCIPSuckerDeployer_2][
            base.id
          ],
      },
    },
  }))();

/**
 * Native-bridge (OP/Base/Arbitrum standard bridge) sucker deployer addresses, keyed by
 * version, then local chain, then remote chain. Native bridges only connect Ethereum
 * with an L2, so only L1<->L2 edges exist. v6 only.
 */
export const NATIVE_SUCKER_DEPLOYER_ADDRESSES: Record<6, SuckerDeployerMap> =
  /* @__PURE__ */ (() => ({
    6: jbNativeSuckerDeployerAddress[6] as SuckerDeployerMap,
  }))();
