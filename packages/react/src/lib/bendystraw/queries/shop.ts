import type { TypedDocumentNode } from "@graphql-typed-document-node/core";
import { parse } from "graphql";

/**
 * Hand-written typed documents for the 721 "shop" bendystraw queries, kept out
 * of the codegen'd `graphql.ts` so they can be added without refreshing the
 * whole generated schema. The field selections match the deployed
 * `bendystraw.xyz` schema (`nft.hook` is a relation, hence `hook { address }`).
 */

/** A store-item purchase (a `mintNftEvent`). */
export interface ShopPurchase {
  chainId: number;
  projectId: number;
  timestamp: number;
  txHash: string;
  beneficiary: string;
  tierId: number;
  tokenId: string;
  totalAmountPaid: string;
  hook: string;
}

/** A currently-held store item (an indexed `nft`). */
export interface OwnedShopItem {
  chainId: number;
  projectId: number;
  createdAt: number;
  mintTx: string;
  hook: string;
  tokenId: string;
  owner: string;
  tierId: number;
}

/** Filter on a bendystraw list query. Only the fields the shop hooks set. */
export interface ShopEventFilter {
  projectId?: number;
  chainId?: number;
  version?: number;
  beneficiary?: string;
  owner?: string;
}

export interface ShopPurchasesResult {
  mintNftEvents: {
    totalCount: number;
    items: ShopPurchase[];
  };
}

export interface OwnedShopItemsResult {
  nfts: {
    totalCount: number;
    items: (Omit<OwnedShopItem, "hook"> & { hook: { address: string } | null })[];
  };
}

export interface ShopQueryVariables {
  where?: ShopEventFilter;
  limit?: number;
  offset?: number;
}

export const ShopPurchasesDocument = parse(/* GraphQL */ `
  query ShopPurchases($where: mintNftEventFilter, $limit: Int, $offset: Int) {
    mintNftEvents(
      where: $where
      orderBy: "timestamp"
      orderDirection: "desc"
      limit: $limit
      offset: $offset
    ) {
      totalCount
      items {
        chainId
        projectId
        timestamp
        txHash
        beneficiary
        tierId
        tokenId
        totalAmountPaid
        hook
      }
    }
  }
`) as TypedDocumentNode<ShopPurchasesResult, ShopQueryVariables>;

export const OwnedShopItemsDocument = parse(/* GraphQL */ `
  query OwnedShopItems($where: nftFilter, $limit: Int, $offset: Int) {
    nfts(
      where: $where
      orderBy: "createdAt"
      orderDirection: "desc"
      limit: $limit
      offset: $offset
    ) {
      totalCount
      items {
        chainId
        projectId
        createdAt
        mintTx
        hook {
          address
        }
        tokenId
        owner
        tierId
      }
    }
  }
`) as TypedDocumentNode<OwnedShopItemsResult, ShopQueryVariables>;
