import { pad, zeroHash } from "viem";
import {
  CCIP_SUCKER_DEPLOYER_ADDRESSES,
  NATIVE_SUCKER_DEPLOYER_ADDRESSES,
  NATIVE_TOKEN,
  USDC_ADDRESSES,
} from "../constants.js";
import { JBChainId, JBVersion } from "../types.js";
import { createSalt } from "./tx.js";

// NOTE: A default of `0` is safe as long as we are deploying CCIP suckers, this is not a safe default for non-ccip suckers.
// v4/v5 deployments (which take a min bridge amount) are CCIP-only, so this is a safe default.
const DEFAULT_MIN_BRIDGE_AMOUNT = BigInt(0);

// Assets that the SDK has built-in support for mapping.
export enum MappableAsset {
  NATIVE,
  USDC,
}

/**
 * The bridge infrastructure to deploy v6 suckers on:
 *
 * - `"ccip"`: Chainlink CCIP suckers. Connect any pair of supported chains and can map
 *   any supported asset (USDC bridges as canonical USDC via CCTP).
 * - `"native"`: OP/Base/Arbitrum standard-bridge suckers. Strongest trust guarantees, but
 *   only connect Ethereum with an L2 (never L2<->L2), only map the native token, and
 *   L2->L1 exits wait out the bridge's ~7-day challenge period.
 * - `"both"`: one native sucker AND one CCIP sucker per pair, for redundancy. Pairs or
 *   assets native bridges can't serve are covered by the CCIP sucker alone.
 */
export type JBSuckerBridge = "ccip" | "native" | "both";

export function parseSuckerDeployerConfig(
  targetChainId: JBChainId,
  chains: JBChainId[],
  assets: MappableAsset[] = [MappableAsset.NATIVE],
  opts: {
    salt?: `0x${string}`;
    /**
     * The JB protocol version being deployed. Defaults to 5, which is also used for v4 deployments.
     */
    version?: JBVersion;
    /**
     * The bridge infrastructure to deploy suckers on. Defaults to "ccip".
     * "native" and "both" are v6-only.
     */
    bridge?: JBSuckerBridge;
  } = {},
) {
  const bridge = opts.bridge ?? "ccip";
  if (bridge !== "ccip" && opts.version !== 6) {
    throw new Error(`Native-bridge suckers are only supported for v6 deployments`);
  }

  const ccipDeployers =
    CCIP_SUCKER_DEPLOYER_ADDRESSES[opts.version === 6 ? 6 : 5];
  const suckerChains = chains.filter((chainId) => chainId !== targetChainId);

  const getCcipDeployer = (chainId: JBChainId) => {
    const deployer = ccipDeployers[targetChainId]?.[chainId];
    if (!deployer) {
      throw new Error(`No deployer found for ${targetChainId} -> ${chainId}`);
    }
    return deployer;
  };

  const getTokens = (asset: MappableAsset, chainId: JBChainId) => {
    switch (asset) {
      case MappableAsset.NATIVE:
        return { localToken: NATIVE_TOKEN, remoteToken: NATIVE_TOKEN };
      case MappableAsset.USDC:
        return {
          localToken: USDC_ADDRESSES[targetChainId],
          remoteToken: USDC_ADDRESSES[chainId],
        };
    }
  };

  // v6 mappings identify remote tokens as bytes32 and no longer take a min bridge amount.
  const toV6Mapping = (asset: MappableAsset, chainId: JBChainId) => {
    const { localToken, remoteToken } = getTokens(asset, chainId);
    return {
      localToken,
      minGas: 200_000,
      remoteToken: pad(remoteToken),
    };
  };

  // The native-bridge sucker config for one (local -> remote) pair, or undefined when
  // the pair/assets can't go native but the CCIP sucker covers them (bridge "both").
  const v6NativeConfigFor = (chainId: JBChainId) => {
    const deployer = NATIVE_SUCKER_DEPLOYER_ADDRESSES[6][targetChainId]?.[chainId];
    // Standard bridges deliver bridge-wrapped tokens (USDC.e, never canonical USDC),
    // which would strand funds on the remote sucker — only map the native token.
    const nativeAssets = assets.filter(
      (asset) => asset === MappableAsset.NATIVE,
    );
    if (deployer && nativeAssets.length > 0) {
      return {
        deployer,
        peer: zeroHash,
        mappings: nativeAssets.map((asset) => toV6Mapping(asset, chainId)),
      };
    }
    if (bridge === "both") return undefined;
    throw new Error(
      deployer
        ? `Only the native token can bridge over native bridges (they deliver bridge-wrapped tokens like USDC.e); use bridge "ccip" or "both" to map other assets`
        : `No native bridge between ${targetChainId} and ${chainId} (native bridges only connect Ethereum with an L2); use bridge "ccip" or "both"`,
    );
  };

  // v6 configs identify remote tokens/peers as bytes32 (a zero peer means the default
  // same-address deterministic peer). One config per (remote chain, bridge kind) pair.
  const deployerConfigurations =
    opts.version === 6
      ? suckerChains.flatMap((chainId) => {
          const native =
            bridge === "ccip" ? undefined : v6NativeConfigFor(chainId);
          const ccip =
            bridge === "native"
              ? undefined
              : {
                  deployer: getCcipDeployer(chainId),
                  peer: zeroHash,
                  mappings: assets.map((asset) => toV6Mapping(asset, chainId)),
                };
          return [...(native ? [native] : []), ...(ccip ? [ccip] : [])];
        })
      : suckerChains.map((chainId) => ({
          deployer: getCcipDeployer(chainId),
          mappings: assets.map((asset) => ({
            ...getTokens(asset, chainId),
            minGas: 200_000,
            minBridgeAmount: DEFAULT_MIN_BRIDGE_AMOUNT,
          })),
        }));

  return {
    deployerConfigurations,
    salt: opts.salt ?? createSalt(),
  };
}
