import {
  CCIP_SUCKER_DEPLOYER_ADDRESSES,
  NATIVE_TOKEN,
  USDC_ADDRESSES,
} from "../constants.js";
import { JBChainId } from "../types.js";
import { createSalt } from "./tx.js";

// NOTE: A default of `0` is safe as long as we are deploying CCIP suckers, this is not a safe default for non-ccip suckers.
// Currently the SDK is only able to deploy CCIP suckers so this is a safe default, but in case that changes this should be refactored.
const DEFAULT_MIN_BRIDGE_AMOUNT = BigInt(0);

// Assets that the SDK has built-in support for mapping.
export enum MappableAsset {
  NATIVE,
  USDC,
}

export function parseSuckerDeployerConfig(
  targetChainId: JBChainId,
  chains: JBChainId[],
  assets: MappableAsset[] = [MappableAsset.NATIVE],
  opts: {
    salt?: `0x${string}`;
  } = {},
) {
  const suckerChains = chains.filter((chainId) => chainId !== targetChainId);
  const deployerConfigurations =
    suckerChains?.map((chainId) => {
      const deployer = CCIP_SUCKER_DEPLOYER_ADDRESSES[targetChainId]?.[chainId];
      if (!deployer) {
        throw new Error(`No deployer found for ${targetChainId} -> ${chainId}`);
      }

      return {
        deployer,
        mappings: assets.map((asset) => {
          switch (asset) {
            case MappableAsset.NATIVE:
              return {
                localToken: NATIVE_TOKEN,
                remoteToken: NATIVE_TOKEN,
                minGas: 200_000,
                minBridgeAmount: DEFAULT_MIN_BRIDGE_AMOUNT,
              };
            case MappableAsset.USDC:
              return {
                localToken: USDC_ADDRESSES[targetChainId],
                remoteToken: USDC_ADDRESSES[chainId],
                minGas: 200_000,
                minBridgeAmount: DEFAULT_MIN_BRIDGE_AMOUNT,
              };
          }
        }),
      };
    }) ?? [];

  return {
    deployerConfigurations,
    salt: opts.salt ?? createSalt(),
  };
}
