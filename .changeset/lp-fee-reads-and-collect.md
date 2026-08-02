---
"@bananapus/nana-sdk-core": minor
---

Add Uniswap V4 LP fee reads and a fee-collect transaction builder.

`readUniswapV4PositionFees` reports a position's unclaimed fees through the
canonical StateView lens (now in `UNISWAP_V4_STATE_VIEW_ADDRESSES` and
`uniswapV4Deployment`), and `buildCollectUniswapV4FeesTx` encodes the
zero-liquidity decrease that sweeps them without touching the position.
`uniswapV4FeesOwed` and `uniswapV4PositionId` expose the underlying math.
