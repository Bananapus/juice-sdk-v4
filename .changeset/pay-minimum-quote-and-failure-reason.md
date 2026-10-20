---
"@bananapus/nana-sdk-core": minor
---

`prepareUserPay` now quotes the buyback pool and sends the slippage-floored quote as the hook's explicit minimum on every quotable path, not only when the payer skips the reserved split. With `skipSplits` false, and always on buyback hook 1.1.1 (which ignores `skipSplits`), the minimum covers the whole issuance before the split, and `minReturnedTokens` is the beneficiary's share of it. The payer's mint share remains only for payments with no quote: no pool, a router converting the token first, or a failed quote.

Add `decodePayFailure`, which reads a simulation or transaction error (or raw revert data) and returns `{ reason, received?, minimum?, message }` for the terminal and buyback minimums, the buyback floor, the router's conversion, paused or unready projects, token approvals and balances, and NFT tiers. When a payment falls short of a minimum, `received` and `minimum` let the payer lower it and retry. `classifyCashOutExecutionError` reads the same table.
