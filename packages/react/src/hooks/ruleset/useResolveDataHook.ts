import { JBChainId, jbOmnichainDeployer4_1Address } from "juice-sdk-core";
import { isAddressEqual, zeroAddress } from "viem";

import { useReadJbOmnichainDeployer4_1DataHookOf } from "juice-sdk-react";

/**
 * Hook to resolve the actual dataHook address if it is the JBOmnichainDeployer4_1 address.
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
  const omnichainDeployerAddress = jbOmnichainDeployer4_1Address[1]; // same on all chains

  // Check if the data hook is JBOmnichainDeployer4_1
  const dataHookIsOmnichainDeployer = Boolean(
    dataHookAddress &&
    isAddressEqual(dataHookAddress, omnichainDeployerAddress)
  );
  // Query the actual data hook from the omnichain deployer
  const actualDataHookQuery = useReadJbOmnichainDeployer4_1DataHookOf({
    chainId,
    args: projectId && rulesetId ? [projectId, rulesetId] : undefined,
    query: {
      enabled: !!dataHookIsOmnichainDeployer && !!projectId,
    },
  });

  if (!dataHookAddress) return {
    resolvedDataHook: zeroAddress,
    dataHookIsOmnichainDeployer,
    isLoading: actualDataHookQuery.isLoading,
    error: actualDataHookQuery.error,
  }
  // Return the resolved data hook address
  const resolvedDataHook = dataHookIsOmnichainDeployer && actualDataHookQuery.data?.[2] 
    ? actualDataHookQuery.data[2] 
    : dataHookAddress;

  return {
    resolvedDataHook,
    dataHookIsOmnichainDeployer,
    isLoading: actualDataHookQuery.isLoading,
    error: actualDataHookQuery.error,
  };
}
