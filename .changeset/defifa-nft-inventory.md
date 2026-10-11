---
"@bananapus/nana-sdk-core": minor
---

Add `getProjectNftInventory` for shared, read-only discovery of Defifa and JB721 NFT tiers. Defifa results expose native tier names, current supply, exact pricing and phase context, including countdown and pay-disabled games, and explicitly disable generic JB721 transaction capabilities. Reads verify supported native deployments and project bindings at one block, propagate RPC errors, and provide bounded sorted-tier pagination. Legacy shop discovery and calldata behavior remain unchanged.
