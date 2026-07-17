"use client";

import { useMemo } from "react";
import { useJBChainId } from "../../contexts/JBChainContext/JBChainContext";
import { useJBContractContext } from "../../contexts/JBContractContext/JBContractContext";
import {
  ShopPurchasesDocument,
  type ShopPurchase,
} from "../../lib/bendystraw/queries/shop";
import { useBendystrawQuery } from "../../lib/bendystraw/useBendystrawQuery";

/**
 * Store-item purchases (721 tier mints) for the project in context, newest
 * first — the "customers" feed. Reads bendystraw `mintNftEvents` for the
 * context chain.
 *
 * @param args.beneficiary Only purchases whose beneficiary is this address (the
 * connected wallet's own purchases). Omit for all buyers.
 * @param args.limit Page size. Defaults to 100.
 * @param args.offset Page offset for pagination. Defaults to 0.
 * @param args.enabled Whether to run the query. Defaults to true.
 */
export function useShopPurchases(args?: {
  beneficiary?: string;
  limit?: number;
  offset?: number;
  enabled?: boolean;
}) {
  const { beneficiary, limit = 100, offset = 0, enabled = true } = args ?? {};
  const { projectId, version } = useJBContractContext();
  const chainId = useJBChainId();

  const { data, ...rest } = useBendystrawQuery(
    ShopPurchasesDocument,
    {
      where: {
        projectId: Number(projectId),
        chainId: Number(chainId),
        version: Number(version),
        ...(beneficiary ? { beneficiary: beneficiary.toLowerCase() } : {}),
      },
      limit,
      offset,
    },
    { enabled: !!chainId && !!projectId && enabled },
  );

  const purchases: ShopPurchase[] | undefined = useMemo(
    () =>
      data?.mintNftEvents.items.map((item) => ({
        ...item,
        chainId: Number(item.chainId),
        projectId: Number(item.projectId),
        timestamp: Number(item.timestamp),
        tierId: Number(item.tierId),
        tokenId: String(item.tokenId),
        totalAmountPaid: String(item.totalAmountPaid),
      })),
    [data],
  );

  return {
    data: purchases,
    totalCount: data?.mintNftEvents.totalCount,
    ...rest,
  };
}
