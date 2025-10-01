"use client";

import { debug, JBChainId } from "juice-sdk-core";
import { ProjectDocument } from "src/generated/graphql";
import { useBendystrawQuery } from "src/lib/bendystraw/useBendystrawQuery";
import {
  arbitrum,
  arbitrumSepolia,
  base,
  baseSepolia,
  mainnet,
  optimism,
  optimismSepolia,
  sepolia,
} from "viem/chains";
import { useJBChainId } from "../../contexts/JBChainContext/JBChainContext";
import { useJBContractContext } from "../../contexts/JBContractContext/JBContractContext";
import { useMemo } from "react";

/**
 * Preferred chain ordering
 */
const chainOrder = [
  mainnet.id,
  base.id,
  optimism.id,
  arbitrum.id,

  sepolia.id,
  baseSepolia.id,
  optimismSepolia.id,
  arbitrumSepolia.id,
];

/**
 * Return sucker pairs for the project ID in context.
 *
 */
export function useSuckers(args?: { enabled: boolean }) {
  const { enabled = true } = args ?? {};
  const { projectId, version } = useJBContractContext();
  const chainId = useJBChainId();

  debug("useSuckers::args", { projectId, chainId });

  const { data, ...rest } = useBendystrawQuery(ProjectDocument, {
    projectId: Number(projectId),
    chainId: Number(chainId),
    version,
    staleTime: Infinity,
    enabled: !!chainId && enabled,
  });

  const pairs = useMemo(
    () =>
      data?.project?.suckerGroup?.projects?.items
        .map((item) => ({
          peerChainId: item.chainId as JBChainId,
          projectId: BigInt(item.projectId),
        }))
        ?.sort((a, b) => {
          const aChainId = chainOrder.indexOf(a.peerChainId);
          const bChainId = chainOrder.indexOf(b.peerChainId);
          if (aChainId === -1 || bChainId === -1) return 0;
          return aChainId - bChainId;
        }),
    [data]
  );

  return { data: pairs, ...rest };
}
