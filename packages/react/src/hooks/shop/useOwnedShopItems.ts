"use client";

import { useMemo } from "react";
import { useJBChainId } from "../../contexts/JBChainContext/JBChainContext";
import { useJBContractContext } from "../../contexts/JBContractContext/JBContractContext";
import {
  OwnedShopItemsDocument,
  type OwnedShopItem,
} from "../../lib/bendystraw/queries/shop";
import { useBendystrawQuery } from "../../lib/bendystraw/useBendystrawQuery";

/**
 * The 721 store items `owner` currently holds for the project in context,
 * newest first — the basis for a redeem/cash-out list. Reads bendystraw `nfts`
 * for the context chain.
 *
 * The index can lag chain state, so verify ownership on-chain (`ownerOf`) before
 * offering or sending a redemption.
 *
 * @param args.owner The holder whose items to list. The query is disabled until set.
 * @param args.limit Page size. Defaults to 100.
 * @param args.offset Page offset for pagination. Defaults to 0.
 * @param args.enabled Whether to run the query. Defaults to true.
 */
export function useOwnedShopItems(args: {
  owner: string | undefined;
  limit?: number;
  offset?: number;
  enabled?: boolean;
}) {
  const { owner, limit = 100, offset = 0, enabled = true } = args;
  const { projectId, version } = useJBContractContext();
  const chainId = useJBChainId();

  const { data, ...rest } = useBendystrawQuery(
    OwnedShopItemsDocument,
    {
      where: {
        projectId: Number(projectId),
        chainId: Number(chainId),
        version: Number(version),
        owner: (owner ?? "").toLowerCase(),
      },
      limit,
      offset,
    },
    { enabled: !!chainId && !!projectId && !!owner && enabled },
  );

  const items: OwnedShopItem[] | undefined = useMemo(
    () =>
      data?.nfts.items.map((item) => ({
        chainId: Number(item.chainId),
        projectId: Number(item.projectId),
        createdAt: Number(item.createdAt),
        mintTx: item.mintTx,
        hook: item.hook?.address ?? "",
        tokenId: String(item.tokenId),
        owner: String(item.owner).toLowerCase(),
        tierId: Number(item.tierId),
      })),
    [data],
  );

  return {
    data: items,
    totalCount: data?.nfts.totalCount,
    ...rest,
  };
}
