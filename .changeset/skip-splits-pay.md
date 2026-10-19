---
"@bananapus/nana-sdk-core": major
---

Pay cards pay through the terminal with the buyback hook's `skipSplits` instead of buying from Uniswap directly.

- Add `prepareUserPay`, which returns a payment's metadata, preview and `minReturnedTokens` together. It sends the buyback registry a `(0, minimum, skipSplits=true)` quote, so buyback 1.4 buys from the pool when that beats the payer's share of a mint and hands the swapped tokens over without the reserved split. When the hook's pool is in the paid token, the minimum is the slippage-floored pool quote. Without it the hook's TWAP floor reaches zero on large buys and sends them to minting.
- Add `buildUserPayMetadata` and `effectivePayPreview`.
- `previewPay` now folds the buyback hook's 1.4 pay specification into its counts, using the router terminal's scoring rule. It used to report zero tokens whenever the hook swapped.
- Breaking: remove the `./v6/direct-pay` entry point (`quoteDirectPaySwap`, `buildDirectPaySwapTx`, `addPermit2SignatureToDirectPaySwap`, `NATIVE_SWAP_BY_CHAIN`) and `chooseBestPayRoute` with its route types. Sell-side direct swaps (`chooseBestCashOutRoute`, `buildUniswapV4ExactInputSwapTx`) are unchanged.
