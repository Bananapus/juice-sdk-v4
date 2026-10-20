---
"@bananapus/nana-sdk-core": minor
---

`prepareUserPay` keys its quote to the buyback hook a payment actually reaches, and can honor the reserved split.

- When a ruleset calls buyback hook 1.4 directly, or through the omnichain deployer's extra data hook, instead of through the registry, `prepareUserPay` and `previewPay` now key the quote to the hook and read its pay specification. Before, the hook ignored the registry-keyed entry, so the payment did not skip the split, and a project with no registry assignment got a zero minimum.
- Add `skipSplits` to `prepareUserPay` and `buildUserPayMetadata`. It defaults to true, as before. Pass false for payments that should honor the project's splits, such as fees or revenue routed into a project. The minimum is then the beneficiary's share of the mint entitlement, with no pool quote.
- Add `hook` to `buildUserPayMetadata`, to key the quote to a buyback hook the ruleset calls directly.
