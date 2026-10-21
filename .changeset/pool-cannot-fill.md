---
"@bananapus/nana-sdk-core": patch
---

`prepareUserPay` no longer sets `quoteFailed` when the V4 quoter reverts with `NotEnoughLiquidity` because the pool cannot fill the swap. That is the pool's state, not a failed read: the payment keeps the mint-rate minimum the hook settles at, without a retry or a warning the payer cannot clear.
