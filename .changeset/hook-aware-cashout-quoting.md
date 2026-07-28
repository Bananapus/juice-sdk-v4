---
"@bananapus/nana-sdk-core": minor
---

Add hook-aware cash-out quoting and slippage-protected routing: `getHookAwareCashOutQuote` / `resolveCashOutRoute` quote through `JBMultiTerminal.previewCashOutFrom` (the exact, data-hook-inclusive path) and return the `minTokensReclaimed`/`metadata` pair to submit — terminal minimum on the treasury route, buyback `cashOut` metadata floor (terminal minimum zero) on the AMM route. Also adds `slippageFloor`, exact `/40` `cashOutProtocolFee` (including the zero-tax fee-free-surplus and feeless branches), `buildBuybackCashOutMetadata`, `decodeBuybackCashOutSpec`, and `DEFAULT_CASH_OUT_SLIPPAGE_BPS` (1%). Prefer these over `getCashOutQuote` for building transactions: `currentReclaimableSurplusOf` skips the data hook, so an exact minimum derived from it reverts with `JBMultiTerminal_UnderMin`.
