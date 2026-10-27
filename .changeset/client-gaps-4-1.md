---
"@bananapus/nana-sdk-core": minor
---

Gaps the four client landings on 4.0 found:

- `sendReviewed` and `resumeReviewed` report `done` only once the step's write hold verified its receipt. A receipt the hold has not verified yet (a lagging node, a same-nonce replacement, a block since reorged out) throws `ReviewedReceiptUnverifiedError` ("Confirming your transaction."); the step stays held, and in flight in its journal, until the hold settles it. `useReviewedRun` stays at `receipt`, follows the hold, and ends `done` when it settles.
- A run is refused before its review while the action's last success is unacknowledged (`WriteHoldUnacknowledgedSuccessError`, "This went through while you were away.", with `success`), so a double click or a remount can't send it twice. `useReviewedRun` acknowledges a `done` it shows, and offers one it could not show as `sendAgainAction`; a direct caller acknowledges with the hold handle's `acknowledge(error.success)`.
- A payment the review-time simulation refused keeps the revert as its `cause` (the review's line, with the node's error and its revert data inside), so `decodePayFailure` reads it and the allowed-decrease retry works for that attempt.
- `viemWalletAdapter` takes `connector`, the connected connector's identity: a connector that changes while the wallet client loads is fetched again (three tries, then "Wallet connection changed"), and every wallet call is invoked in the same continuation as its last check. Its refusals before the wallet is called (the connection, account, chain or Safe mode changed) are `WalletNotInvokedError`: core counts them as unsent and releases the held step, and the site sees the refusal's own line, not a cancel. Only that class counts, never a field a provider sets.
- `signReviewed` hands a self-reviewing wallet the raw typed data or text to review on its own page, with no in-app prompt (`onPreview` gets the model). `selfReviewingAdapter` takes `signTypedData` and `signMessage`; without them it still refuses with 4200.
- `nana-wallet-check` also catches `signaWalletAdapter`, `selfReviewingAdapter` and `registerReviewHandler` called through `.call`, `.apply` or `.bind`.
