---
"@bananapus/nana-sdk-core": minor
---

`prepareUserPay` retries a failed pool quote once and returns `quoteFailed: true` when the retry fails too, so apps can tell the payer that the pool's rate is not protected. A hook rejecting the quoted minimum still falls back without the flag. Paid through the router terminal, its registry or its gateway, a project without a buyback hook now gets its minimum from what minting the quoted conversion issues, instead of from the router's floor, which can sit far below the pool's price on large swaps. This applies only when the router has one route: the project's one terminal is the multi-terminal, accepting one other token, and the payment reaches the current router. Native-to-wrapped payments, which the router wraps 1:1, keep the floor.

Add `PAY_QUOTE_FAILED_MESSAGE`, the one line apps and agents show when `quoteFailed` is set.
