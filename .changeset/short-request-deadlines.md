---
"@bananapus/nana-sdk-core": minor
---

Shorter Relayr request deadlines, so an action held behind an abandoned session waits at most 2 hours (rulings R114 (g) and R117 otherwise unchanged).

Behavior changes:

- `RELAYR_FORWARDER_DEADLINE_SECONDS` is now 2 hours, not 47. `relayrForwarderDeadline({ seconds, nowSeconds })` returns the deadline to sign with and accepts 1 to 47 hours.
- `bindRelayrQuote` records the earliest signed request deadline as `requestsDeadline`. `relayrPaymentDetails` (with `requestsDeadline` or `expectedTransactions`) and `relayrPaymentOptions` refuse an option whose payment deadline is less than `RELAYR_REQUEST_RUN_MARGIN_SECONDS` (30 minutes) before it, so a paid bundle's requests can still run. Apps that refresh signatures before a quote must refresh once less than the payment window plus this margin is left.
- A quote saved without `requestsDeadline` gets the same margin from its `expectedTransactions`; a forwarded quote whose request deadlines can't be read offers no option.
