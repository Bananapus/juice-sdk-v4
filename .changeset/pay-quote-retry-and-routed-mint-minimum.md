---
"@bananapus/nana-sdk-core": minor
---

`prepareUserPay` retries a failed pool quote once and returns `quoteFailed: true` when the retry fails too, so apps can tell the payer that the pool's rate is not protected. A hook rejecting the quoted minimum still falls back without the flag. Through a router terminal, a project without a buyback hook that accepts one token now gets its minimum from what minting the quoted conversion issues, instead of from the router's floor, which can sit far below the pool's price on large swaps.
