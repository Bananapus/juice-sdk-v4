import { isAddressEqual, zeroAddress } from "viem";
import {
  jbOmnichainDeployer4_1Address,
  useReadJbOmnichainDeployer4_1DataHookOf,
} from "../../generated/juicebox";

import { JBChainId } from "juice-sdk-core";

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
}: {
  dataHookAddress: `0x${string}` | undefined;
  projectId: bigint | undefined;
  chainId: JBChainId | undefined;
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
    args: projectId && chainId ? [projectId, chainId] : undefined,
    query: {
      enabled: !!dataHookIsOmnichainDeployer && !!projectId && !!chainId,
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
