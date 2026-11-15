---
"@bananapus/nana-sdk-core": minor
---

`describeV4UnlockData` decodes the PositionManager `SETTLE` action (0x0b) with a stated amount as a `SETTLE` step (`currency`, `amount`, `payerIsCaller`), so a liquidity re-band that pays in a fixed cap and takes the rest keeps its decoded step list in review. A settle of a sentinel amount (0 or 2^255) stays undecoded.
