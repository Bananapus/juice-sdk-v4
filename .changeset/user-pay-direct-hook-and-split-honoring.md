---
"@bananapus/nana-sdk-core": minor
---

`prepareUserPay` keys its quote to the buyback hook a payment actually reaches, and can honor the reserved split.

- When a ruleset calls buyback hook 1.4 directly, or through the omnichain deployer's extra data hook, instead of through the registry, `prepareUserPay` now keys the quote to the hook and reads its pay specification. Before, the hook ignored the registry-keyed entry, so the payment did not skip the split, and a project with no registry assignment got a zero minimum.
- `previewPay` recognizes that hook's specification too, but sends the metadata it is given unchanged; a direct hook ignores a registry-keyed entry.
- Add `skipSplits` to `prepareUserPay` and `buildUserPayMetadata`. It defaults to true, as before. Swapped tokens skip the reserved split only with true. Pass false for payments that should honor the project's splits, such as fees or revenue routed into a project. The minimum is then the beneficiary's share of the mint entitlement, with no pool quote.
- Add `hook` to `buildUserPayMetadata`, to key the quote to a buyback hook the ruleset calls directly.
