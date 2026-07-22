---
"@bananapus/nana-sdk-core": patch
---

Calculate cash-out quotes against the full outstanding supply, including pending
reserved tokens, before applying the full-supply shortcut. This matches
`JBCashOuts.cashOutFrom` and prevents overstating reclaimable surplus. Reject
negative, fractional, or out-of-range inputs—including a combined supply which
would overflow `uint256`—instead of returning an impossible quote.
