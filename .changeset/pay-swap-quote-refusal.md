---
"@bananapus/nana-sdk-core": major
---

`prepareUserPay` refuses a payment the buyback hook would swap when its quote, or a read after it, fails twice, comes back empty, resolves to nothing or cannot be decoded, and when the minimum without a quote floors to zero. It throws `PaySwapQuoteFailedError` (`code` `PAY_SWAP_QUOTE_FAILED`, the read's error as `cause`) with `PAY_SWAP_QUOTE_FAILED_MESSAGE`, "The swap quote could not be loaded.", for the app to show as one line with Retry. It no longer returns a minimum set by a failed read, which could be zero. A pool that cannot fill the swap, a pool that loses to minting, and a swap the quoter cannot take (no quoter on the chain, an amount beyond uint128, which also sets `quoteFailed`) keep the mint minimum while it is above zero. Payments the hook would not swap, and payments with no buyback hook, are unchanged and still return `quoteFailed`.
