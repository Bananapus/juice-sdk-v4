---
"@bananapus/nana-sdk-core": patch
---

`decodePayFailure` and `classifyCashOutExecutionError` name a revert only from revert data or from an error viem typed against the matching ABI item, never from an error name in text or an `Error(string)` reason. Amounts from a typed error count only when they have the ABI's types, and shortfall amounts only when what settled is below the minimum. A shortfall that settles nothing sets `zeroFill: true` and its message no longer suggests lowering the minimum. A new `adjustable` field (`"minimum"` or `"slippage"`, exported as `PayFailureAdjustable`) names the setting a payer can relax so a retry clears the failing check.
