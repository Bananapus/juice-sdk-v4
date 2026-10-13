---
"@bananapus/nana-sdk-core": minor
---

Shorter Relayr request deadlines and superseding an unpaid session (ruling R119, amending R114 (g) and R117).

Behavior changes:

- `RELAYR_FORWARDER_DEADLINE_SECONDS` is now 2 hours, not 47. A launch held behind an abandoned session waits at most 2 hours. `relayrForwarderDeadline({ seconds, nowSeconds })` returns the deadline to sign with and accepts 1 to 47 hours.
- `bindRelayrQuote` records the earliest signed request deadline as `requestsDeadline`. `relayrPaymentDetails` (with `requestsDeadline`) and `relayrPaymentOptions` refuse an option whose payment deadline is less than `RELAYR_REQUEST_RUN_MARGIN_SECONDS` (30 minutes) before it, so a paid bundle's requests can still run. Apps that refresh signatures before a quote must refresh once less than the payment window plus this margin is left.
- Payment options and details also read the requests' deadline from a quote's `expectedTransactions`, so a quote saved before `requestsDeadline` gets the same margin; a forwarded quote whose deadlines can't be read offers no option.
- New `relayrSupersede(clientFor, requests, { bundleUuid, options, expectedTransactions, quotedAt, destinationChainIds, paymentAttempted, launch, fetch })` returns `released`, `hold` or `supersede` with the saved nonces to sign the new calls at. It supersedes only an ordinary (non-launch) session with no payment attempted and every request live and unmoved, once the chain proves the quote unpaid (a finalized block past each option's deadline and no `Prepayment` log for the bundle since the quote), the latest nonce is still the saved one, and Relayr's fresh record matches the saved options and calls, unpaid and pending. Its client also needs `getLogs`.
- A supersede held only by finality past the quote's deadline returns `hold` with `reason: "finality"`; every other check has passed.
- New copy on `/review`: `relayrSupersededLine(action)`, `RELAYR_FINALITY_HOLD_LINE` ("Try again in a few minutes.") and `relayrSupersedeHeldMessage(hold, options)`, which shows that line for a finality hold and `relayrHeldMessage(until)` otherwise.
