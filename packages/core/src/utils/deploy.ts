import { CCIP_SUCKER_DEPLOYER_ADDRESSES, NATIVE_TOKEN } from "../constants.js";
import { JBChainId } from "../types.js";
import { createSalt } from "./tx.js";

// NOTE: A default of `0` is safe as long as we are deploying CCIP suckers, this is not a safe default for non-ccip suckers.
// Currently the SDK is only able to deploy CCIP suckers so this is a safe default, but in case that changes this should be refactored.
const DEFAULT_MIN_BRIDGE_AMOUNT = BigInt(0);

export function parseSuckerDeployerConfig(
  targetChainId: JBChainId,
  chains: JBChainId[],
  opts: {
    minBridgeAmount?: bigint;
  } = {}
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
        mappings: [
          {
            localToken: NATIVE_TOKEN,
            remoteToken: NATIVE_TOKEN,
            minGas: 200_000, // idk lol
            minBridgeAmount: opts.minBridgeAmount ?? DEFAULT_MIN_BRIDGE_AMOUNT,
          },
        ],
      };
    }) ?? [];

  return {
    deployerConfigurations,
    salt: createSalt(),
  };
}
