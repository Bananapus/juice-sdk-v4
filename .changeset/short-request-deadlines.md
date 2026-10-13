---
"@bananapus/nana-sdk-core": minor
---

Shorter Relayr request deadlines and superseding an unpaid session (ruling R119, amending R114 (g) and R117).

Behavior changes:

- `RELAYR_FORWARDER_DEADLINE_SECONDS` is now 2 hours, not 47. A launch held behind an abandoned session waits at most 2 hours. `relayrForwarderDeadline({ seconds, nowSeconds })` returns the deadline to sign with and accepts 1 to 47 hours.
- `bindRelayrQuote` records the earliest signed request deadline as `requestsDeadline`. `relayrPaymentDetails` (with `requestsDeadline`) and `relayrPaymentOptions` refuse an option whose payment deadline is less than `RELAYR_REQUEST_RUN_MARGIN_SECONDS` (30 minutes) before it, so a paid bundle's requests can still run. Apps that refresh signatures before a quote must refresh once less than the payment window plus this margin is left.
- New `relayrSupersede(clientFor, requests, { bundleUuid, options, destinationChainIds, paymentAttempted, launch, fetch })` returns `released`, `hold` or `supersede` with the saved nonces to sign the new calls at. It supersedes only an ordinary (non-launch) session with no payment attempted, every request live and unmoved, every quote deadline more than a minute past at the latest block, the latest nonce still the saved one, and Relayr reporting the bundle unpaid with every call pending.
- New copy on `/review`: `relayrSupersededLine(action)`.
