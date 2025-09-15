import { JBProjectMetadata, debug, getProjectMetadata } from "juice-sdk-core";
import { createContext, useContext } from "react";
import { Address } from "viem";
import { usePublicClient } from "wagmi";
import { useQuery } from "wagmi/query";
import { useJBChainId } from "../JBChainContext/JBChainContext";
import { useJBContractContext } from "../JBContractContext/JBContractContext";
import { AsyncData, AsyncDataNone } from "../types";

export type JBProjectMetadataContext = {
  metadata: AsyncData<JBProjectMetadata>;
};

export const JBProjectMetadataContext = createContext<JBProjectMetadataContext>({
  metadata: AsyncDataNone,
});

export function useJBProjectMetadataContext() {
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
  const chainId = useJBChainId();
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

      if (!publicClient) {
        throw new Error("Public client not available.");
      }

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

      return response ?? null;
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
  const { projectId, contracts } = useJBContractContext();
  const metadata = useProjectMetadata({
    projectId,
    jbControllerAddress: contracts.controller.data ?? undefined,
    ipfsGatewayHostname,
  });

  debug("JBProjectMetadataContext", {
    projectId,
    ipfsGatewayHostname,
    contracts,
    metadata,
  });

  return (
    <JBProjectMetadataContext.Provider
      value={{ metadata: metadata as AsyncData<JBProjectMetadata> }}
    >
      {children}
    </JBProjectMetadataContext.Provider>
  );
};
