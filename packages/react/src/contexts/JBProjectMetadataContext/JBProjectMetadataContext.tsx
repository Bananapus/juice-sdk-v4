import { JBProjectMetadata, getProjectMetadata } from "juice-sdk-core";
import { createContext, useContext } from "react";
import { Address } from "viem";
import { useChainId, usePublicClient } from "wagmi";
import { useReadJbContractContext } from "../JBContractContext/JBContractContext";
import { AsyncData, AsyncDataNone } from "../types";
import { useQuery } from "wagmi/dist/types/utils/query";

export type JBProjectMetadataContext = {
  metadata: AsyncData<JBProjectMetadata>;
};

export const JBProjectMetadataContext = createContext<JBProjectMetadataContext>(
  {
    metadata: AsyncDataNone,
  }
);

export function useReadJbProjectMetadataContext() {
  return useContext(JBProjectMetadataContext);
}

export function useProjectMetadata({
  projectId,
  jbControllerAddress,
  ipfsGatewayHostname,
}: {
  projectId: bigint | undefined;
  jbControllerAddress: Address | undefined;
  ipfsGatewayHostname?: string;
}) {
  const chainId = useChainId();
  const publicClient = usePublicClient({ chainId });

  return useQuery({
    queryKey: [
      "juice-sdk",
      "useProjectMetadata",
      projectId?.toString(),
      jbControllerAddress,
      ipfsGatewayHostname,
    ],
    queryFn: async () => {
      if (!projectId || !jbControllerAddress) return null;

      const response = await getProjectMetadata(
        publicClient,
        {
          projectId,
          jbControllerAddress,
        },
        {
          ipfsGatewayHostname,
        }
      );

      return response;
    },
  });
}

export type JBProjectMetadataProviderProps = {
  ipfsGatewayHostname?: string;
};

/**
 * Provides the metadata for the project in context.
 *
 * @note depends on JBContractContext
 */
export const JBProjectMetadataProvider = ({
  children,
  ipfsGatewayHostname,
}: {
  children: React.ReactNode;
} & JBProjectMetadataProviderProps) => {
  const { projectId, contracts } = useReadJbContractContext();
  const metadata = useProjectMetadata({
    projectId,
    jbControllerAddress: contracts.controller.data ?? undefined,
    ipfsGatewayHostname,
  });

  return (
    <JBProjectMetadataContext.Provider
      value={{
        metadata,
      }}
    >
      {children}
    </JBProjectMetadataContext.Provider>
  );
};
