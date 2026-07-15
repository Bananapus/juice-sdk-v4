import {
  JBChainId,
  jbContractAddress,
  jbOmnichainDeployer4_1Abi,
  jbOmnichainDeployerAbi,
  jbOmnichainDeployerV5Abi,
} from "@bananapus/nana-sdk-core";
import { useJBContractContext } from "../../contexts/JBContractContext/JBContractContext";
import { isAddressEqual, zeroAddress } from "viem";
import { mainnet } from "viem/chains";
import { useReadContract } from "wagmi";

/**
 * Hook to resolve the actual dataHook address if it is the JBOmnichainDeployer address.
 *
 * @param dataHookAddress - The data hook address from the ruleset metadata
 * @param projectId - The project ID
 * @param chainId - The chain ID
 * @returns The resolved data hook address
 */
export function useResolveDataHook({
  dataHookAddress,
  projectId,
  chainId,
  rulesetId,
}: {
  dataHookAddress: `0x${string}` | undefined;
  projectId: bigint | undefined;
  chainId: JBChainId | undefined;
  rulesetId: bigint | undefined;
}) {
  const { version } = useJBContractContext();

  const omnichainDeployerAddress =
    version === 4
      ? jbContractAddress[4]["JBOmnichainDeployer4_1"][mainnet.id]
      : jbContractAddress[version]["JBOmnichainDeployer"][mainnet.id]; // same on all chains

  // Check if the data hook is JBOmnichainDeployer
  const dataHookIsOmnichainDeployer = Boolean(
    dataHookAddress &&
      isAddressEqual(dataHookAddress, omnichainDeployerAddress),
  );

  const args =
    projectId && rulesetId ? ([projectId, rulesetId] as const) : undefined;

  // v4/v5: the omnichain deployer stores a single data hook config.
  const legacyDataHookQuery = useReadContract({
    abi: version === 4 ? jbOmnichainDeployer4_1Abi : jbOmnichainDeployerV5Abi,
    functionName: "dataHookOf",
    address: omnichainDeployerAddress,
    chainId,
    args,
    query: {
      enabled: version !== 6 && !!dataHookIsOmnichainDeployer && !!projectId,
    },
  });

  // v6: the omnichain deployer stores the tiered 721 hook and an optional extra data hook separately.
  const tiered721HookQuery = useReadContract({
    abi: jbOmnichainDeployerAbi,
    functionName: "tiered721HookOf",
    address: omnichainDeployerAddress,
    chainId,
    args,
    query: {
      enabled: version === 6 && !!dataHookIsOmnichainDeployer && !!projectId,
    },
  });
  const extraDataHookQuery = useReadContract({
    abi: jbOmnichainDeployerAbi,
    functionName: "extraDataHookOf",
    address: omnichainDeployerAddress,
    chainId,
    args,
    query: {
      enabled: version === 6 && !!dataHookIsOmnichainDeployer && !!projectId,
    },
  });

  const isLoading =
    version === 6
      ? tiered721HookQuery.isLoading || extraDataHookQuery.isLoading
      : legacyDataHookQuery.isLoading;
  const error =
    version === 6
      ? (tiered721HookQuery.error ?? extraDataHookQuery.error)
      : legacyDataHookQuery.error;

  if (!dataHookAddress)
    return {
      resolvedDataHook: zeroAddress,
      dataHookIsOmnichainDeployer,
      isLoading,
      error,
    };

  // Resolve the actual data hook address.
  let resolvedDataHook = dataHookAddress;
  if (dataHookIsOmnichainDeployer) {
    if (version === 6) {
      const tiered721Hook = tiered721HookQuery.data?.[0];
      const extraDataHook = extraDataHookQuery.data?.dataHook;
      if (tiered721Hook && !isAddressEqual(tiered721Hook, zeroAddress)) {
        resolvedDataHook = tiered721Hook;
      } else if (extraDataHook && !isAddressEqual(extraDataHook, zeroAddress)) {
        resolvedDataHook = extraDataHook;
      }
    } else if (legacyDataHookQuery.data?.[2]) {
      resolvedDataHook = legacyDataHookQuery.data[2];
    }
  }

  return {
    resolvedDataHook,
    dataHookIsOmnichainDeployer,
    isLoading,
    error,
  };
}
