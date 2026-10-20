---
"@bananapus/nana-sdk-core": minor
---

`prepareUserPay` quotes the buyback pool behind a router terminal too.

- When a router converts the paid token first (for example ETH to USDC for a project whose buyback pool is in USDC), `prepareUserPay` finds the pool among the tokens the project accepts, quotes it on the router's slippage-floored conversion, and sends the floored quote as the hook's explicit minimum. Before, it fell back to the payer's mint share, and large buys could mint instead of swapping.
- The quoted payment is previewed again and keeps the quote only if the hook still swaps in the same pool; otherwise the mint-share fallback stays.
