import { print } from "graphql";
import { describe, expect, test } from "vitest";
import { OwnedShopItemsDocument, ShopPurchasesDocument } from "./shop";

describe("shop query contracts", () => {
  test("purchase history pins ordering, pagination, identity, and payment fields", () => {
    const query = print(ShopPurchasesDocument);
    expect(query).toContain(
      "query ShopPurchases($where: mintNftEventFilter, $limit: Int, $offset: Int)",
    );
    expect(query).toContain('orderBy: "timestamp"');
    expect(query).toContain('orderDirection: "desc"');
    for (const field of [
      "chainId",
      "projectId",
      "timestamp",
      "txHash",
      "beneficiary",
      "tierId",
      "tokenId",
      "totalAmountPaid",
      "hook",
    ]) {
      expect(query).toMatch(new RegExp(`\\b${field}\\b`));
    }
  });

  test("owned inventory reads the hook relation and current owner", () => {
    const query = print(OwnedShopItemsDocument);
    expect(query).toContain(
      "query OwnedShopItems($where: nftFilter, $limit: Int, $offset: Int)",
    );
    expect(query).toContain('orderBy: "createdAt"');
    expect(query).toMatch(/hook\s*\{\s*address\s*\}/);
    expect(query).toMatch(/\bowner\b/);
    expect(query).toMatch(/\btokenId\b/);
  });
});
