---
"@bananapus/nana-sdk-core": major
---

Review gaps found moving revnet and juicebox-money onto the reviewed path:

- `ReviewedCall.gas` sets the exact gas limit a call is sent with (revnet's saved pending-router envelope, its capped handle write). It is shown and bound in the review (changing it after review sends nothing), simulated at that gas, sent at that gas and never estimated or padded. A Safe app still proposes with `safeTxGas` 0, and a self-reviewing wallet gets it on its raw call. Unset, gas is estimated as before.
- `WalletAdapter.ready()` (and `viemWalletAdapter`'s `ready` option) settles once the adapter's kind and Safe mode can be trusted, as Safe{Wallet} over WalletConnect is known only once its peer metadata settles. Every reviewed send, signature, Relayr and Safe entry awaits it first, for at most 10 s. A rejection or timeout sends nothing (`WALLET_NOT_READY_LINE`) and never reads the wallet as a plain one.
- `ReviewedCall.adoptIgnoringArgs` (with `abi` and `functionName`) lists the arg indexes, such as a fresh deadline, in which a proposal its Safe already queued may differ and still be adopted instead of proposed twice. The SDK decodes both calls with the call's ABI: same function, the queued bytes its canonical encoding, every other arg equal, and the same target, value and CALL. No app code runs while matching. The list is bound into the review model id and saved with the step. Unset, adoption stays exact bytes; an invalid list sends nothing.
- A reviewed step mined and reverted throws `ReviewedCallRevertedError` (same line) with its `step`, `hash` and `receipt`, so a site can close its own record. The action can be reviewed and sent again.
- `useReviewedRun`:
  - **Breaking:** `run` resolves `{ status: "failed", error, failure }` when the run failed. Null now means only that the user cancelled. Check `status`, never truthiness.
  - A followed Safe proposal (or held step) ends its run once its hold settles it: `phase` "done" with `hash` and the new `receipt`, or the settlement's line in `error`. A release ends it too.
  - `error` shows a message only when the SDK raised it (`ReviewLineError`, which the review engine's errors and error classes now extend); the SDK's typed Relayr and Safe refusals show fixed lines (by `reason` for `RelayrPaymentRetryError`); anything else (a node, RPC, wallet, service, runtime or app error, however it reads) shows `NETWORK_ERROR_LINE`. `errorLine` is exported for other displays; `failure` keeps the raw value.
  - **Breaking:** its deps take `engine`, the loader of the send engine (review model, decoder and ABIs). Pass `() => import("@bananapus/nana-sdk-core/review")` and a page that mounts the hook no longer carries the engine in its first load (about 69 KB gzipped); the hook calls it once mounted, so a run does not wait on it. A loader that fails ends the run with `REVIEWED_ENGINE_LOAD_LINE` (nothing sent; reload), the loader's error as its cause.
- **Breaking:** a confirmed review whose simulation found a revert throws `REVIEWED_SIMULATION_FAILED_LINE`, with the detailed reason (shown in the review) as its `cause`. A send-time simulation failure is a plain error quoting the node. Signature validation lines no longer quote the rejected value.
- `openStepHold` moved to `writeHold.ts` and `REVIEWED_ACCOUNT_CHANGED_LINE` to `messages.ts`; both are still exported from `/review`.
- A review's raw JSON shows both the signatures and the authorization when a request carries both.
- `nana-wallet-check` flags a member `.request(...)` only when its method signs or is not written out (`{ method: "eth_call" }` and `request("lock-name", ...)` are reads), and counts `wallet_sendTransaction` as a signing method. Remove inventory rows the check now reports as stale.
