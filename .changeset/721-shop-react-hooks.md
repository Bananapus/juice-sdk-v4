---
"@bananapus/nana-sdk-react": minor
---

Add `useShopPurchases` and `useOwnedShopItems` hooks for a project's 721 "shop": the customers/purchases feed (bendystraw `mintNftEvents`) and a holder's currently-owned store items (bendystraw `nfts`), for the project + chain in context. `useOwnedShopItems` is the basis for a redeem/cash-out list (verify `ownerOf` on-chain before offering a redemption). The typed query documents are hand-written (self-contained) rather than codegen'd, so they add no generated-schema churn.
