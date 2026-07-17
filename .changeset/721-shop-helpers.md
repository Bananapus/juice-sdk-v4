---
"@bananapus/nana-sdk-core": minor
---

Add v6 JB721 "shop" helpers and fix a silent-mint footgun in `build721PayMetadata`.

- `getProject721Shop(client, { chainId, projectId, isRevnet })` resolves a project's 721 tiers hook, its store, the metadata id target, the pricing context, and its tiers in one call (revnet and custom/omnichain hook resolution; returns `null` for projects with no shop, throws on RPC failure). Plus `get721MetadataIdTarget`, `effectiveTierPrice`, and `DISCOUNT_DENOMINATOR`.
- `build721CashOutMetadata({ metadataIdTarget, tokenIds })` builds the cash-out (NFT redeem) metadata — the mirror of `build721PayMetadata` — reusing the shared metadata packer.
- `build721PayMetadata` now takes `metadataIdTarget` (the hook's `METADATA_ID_TARGET` — the shared *implementation* address). `hookAddress` is kept as a deprecated alias. Passing a project's clone hook address as the target produces an id the hook never matches, so the payment silently mints ZERO NFTs; the new param name plus `get721MetadataIdTarget` make the correct target explicit. The metadata id formula is unchanged, so existing correct callers are unaffected.
