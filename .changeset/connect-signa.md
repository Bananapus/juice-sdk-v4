---
"@bananapus/nana-sdk-connect": minor
---

The Center wallet client now comes from `@me.jango/signa` 0.3.8, the renamed `@me.jango/center-wallet`. The re-exported surface keeps every earlier export, pins `sponsoredCallsCommitment` (already reachable through `^0.3.0`), and adds the `PayFailure` type: a reverted or refused payment can carry `payFailure` (on `RestClientError`, the payment status and its observation) saying which check failed and, for a shortfall, the received and minimum amounts.
