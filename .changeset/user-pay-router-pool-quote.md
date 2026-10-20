---
"@bananapus/nana-sdk-core": minor
---

`prepareUserPay` quotes the buyback pool behind a router terminal too.

- When a router converts the paid token first (for example ETH to USDC for a project whose buyback pool is in USDC), `prepareUserPay` finds the pool among the tokens the project accepts. It quotes the router's conversion in the pool the router picks (Uniswap V3 or V4). It then previews the destination at that return to see what the hook receives (after any NFT split), quotes the buyback pool on it, and sends the floored quote as the hook's explicit minimum. The preview matches the fill. Before, it fell back to the payer's mint share, and large buys could mint instead of swapping.
- The minimum sits above what the hook would mint for the quoted conversion, so the hook swaps. If the conversion returns noticeably less, the payment reverts with the hook's reason. The payer can then prepare again with a larger `slippageBps`.
- The quoted payment is previewed again, and the quote is kept only if the hook still swaps in the same pool. Routes that are not a single swap of the whole payment, such as cashing out a project token first, keep the mint-share fallback.
- Add `quoteUniswapV3ExactInputSingle` and `UNISWAP_V3_QUOTER_V2_ADDRESSES`. Each quoter's factory and WETH9 match the router terminal's on every supported chain.
