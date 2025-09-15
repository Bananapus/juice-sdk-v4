import {
  JBChainId,
  jbContractAddress,
  jbOmnichainDeployer4_1Abi,
  jbOmnichainDeployerAbi,
} from "juice-sdk-core";
import { useJBContractContext } from "src/contexts/JBContractContext/JBContractContext";
import { isAddressEqual, zeroAddress } from "viem";
import { mainnet } from "viem/chains";
import { useReadContract } from "wagmi";

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
  const { version } = useJBContractContext();

  const omnichainDeployerAddress =
    version === 4
      ? jbContractAddress[4]["JBOmnichainDeployer4_1"][mainnet.id]
      : jbContractAddress[version]["JBOmnichainDeployer"][mainnet.id]; // same on all chains

  // Check if the data hook is JBOmnichainDeployer
  const dataHookIsOmnichainDeployer = Boolean(
    dataHookAddress && isAddressEqual(dataHookAddress, omnichainDeployerAddress)
  );

  // Query the actual data hook from the omnichain deployer
  const actualDataHookQuery = useReadContract({
    abi: version === 4 ? jbOmnichainDeployer4_1Abi : jbOmnichainDeployerAbi,
    functionName: "dataHookOf",
    address: omnichainDeployerAddress,
    chainId,
    args: projectId && rulesetId ? [projectId, rulesetId] : undefined,
    query: {
      enabled: !!dataHookIsOmnichainDeployer && !!projectId,
    },
  });

  if (!dataHookAddress)
    return {
      resolvedDataHook: zeroAddress,
      dataHookIsOmnichainDeployer,
      isLoading: actualDataHookQuery.isLoading,
      error: actualDataHookQuery.error,
    };
  // Return the resolved data hook address
  const resolvedDataHook =
    dataHookIsOmnichainDeployer && actualDataHookQuery.data?.[2]
      ? actualDataHookQuery.data[2]
      : dataHookAddress;

  return {
    resolvedDataHook,
    dataHookIsOmnichainDeployer,
    isLoading: actualDataHookQuery.isLoading,
    error: actualDataHookQuery.error,
  };
}
