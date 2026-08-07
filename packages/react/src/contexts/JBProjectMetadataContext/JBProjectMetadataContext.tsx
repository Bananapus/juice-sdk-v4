import {
  JBProjectMetadata,
  debug,
  getProjectMetadata,
} from "@bananapus/nana-sdk-core";
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

export const JBProjectMetadataContext = createContext<JBProjectMetadataContext>(
  {
    metadata: AsyncDataNone,
  },
);

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
    // The chain is part of the read's identity: the same project id resolves to
    // a different project on every chain, so omitting it lets one chain's name
    // and logo be served for another's project.
    queryKey: [
      "juice-sdk",
      "useProjectMetadata",
      chainId,
      projectId?.toString(),
      jbControllerAddress,
      ipfsGatewayHostname,
    ],
    enabled: !!chainId && !!projectId && !!jbControllerAddress,
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
        },
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
