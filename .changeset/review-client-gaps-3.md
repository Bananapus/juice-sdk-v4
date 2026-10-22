---
"@bananapus/nana-sdk-core": major
---

Review gaps found moving revnet and juicebox-money onto the reviewed path:

- `ReviewedCall.gas` sets the exact gas limit a call is sent with (revnet's saved pending-router envelope, its capped handle write). It is shown and bound in the review (changing it after review sends nothing), simulated at that gas, sent at that gas and never estimated or padded. A Safe app still proposes with `safeTxGas` 0, and a self-reviewing wallet gets it on its raw call. Unset, gas is estimated as before.
- `WalletAdapter.ready()` (and `viemWalletAdapter`'s `ready` option) settles once the adapter's kind and Safe mode can be trusted, as Safe{Wallet} over WalletConnect is known only once its peer metadata settles. Every reviewed send, signature, Relayr and Safe entry awaits it first, for at most 10 s. A rejection or timeout sends nothing (`WALLET_NOT_READY_LINE`) and never reads the wallet as a plain one.
- `ReviewedCall.normalizeData` lets a Safe app adopt a proposal its Safe already queued whose calldata differs only by what the app normalizes away (a fresh deadline). The target, value and zero-refund CALL still match exactly. Unset, adoption stays exact bytes. It is never saved, so a resumed step compares exact bytes.
- A reviewed step mined and reverted throws `ReviewedCallRevertedError` (same line) with its `step`, `hash` and `receipt`, so a site can close its own record. The action can be reviewed and sent again.
- `useReviewedRun`:
  - **Breaking:** `run` resolves `{ status: "failed", error, failure }` when the run failed. Null now means only that the user cancelled. Check `status`, never truthiness.
  - A followed Safe proposal (or held step) ends its run once its hold settles it: `phase` "done" with `hash` and the new `receipt`, or the settlement's line in `error`. A release ends it too.
  - `error` shows a raw node, RPC or wallet error (a viem error, a JSON-RPC code, "header not found") as `NETWORK_ERROR_LINE`, never its own text. `errorLine` is exported for other displays; `failure` keeps the raw value.
  - **Breaking:** its deps take `engine`, the loader of the send engine (review model, decoder and ABIs). Pass `() => import("@bananapus/nana-sdk-core/review")` and a page that mounts the hook no longer carries the engine in its first load (about 69 KB gzipped); the hook calls it once mounted, so a run does not wait on it.
- `openStepHold` moved to `writeHold.ts` and `REVIEWED_ACCOUNT_CHANGED_LINE` to `messages.ts`; both are still exported from `/review`.
- A review's raw JSON shows both the signatures and the authorization when a request carries both.
- `nana-wallet-check` flags a member `.request(...)` only when its method signs or is not written out (`{ method: "eth_call" }` and `request("lock-name", ...)` are reads), and counts `wallet_sendTransaction` as a signing method. Remove inventory rows the check now reports as stale.
