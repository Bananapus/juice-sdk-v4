---
"@bananapus/nana-sdk-core": minor
---

Release holds that left users stuck, following revnet.money (ruling R119). Hold only where a second run could cost money the chain would not refuse.

Behavior changes:

- Write recovery holds an ordinary write by its exact call (account, chain, target, value and calldata), not by target and selector. A changed amount or quote is no longer held; a `namespace` still holds a whole action. Records under the old key still hold their exact call.
- `reserve(call, evidence)` records the account's next nonce (`readReviewedWriteNonce`). `resolve` and `checkReviewedWrite` release a held write once a finalized block shows another transaction used that nonce, adopt the hash when the exact call used it (including a wallet speed-up), and release when the app's `effect` read shows it ran. `abandon(record, { checkedWallet: true })` is the user's exit.
- `withLock` no longer refuses without Web Locks: it falls back to a lock within the tab with one console note. `browserLocks()` exports the same fallback.
- `lookAtSafeProposal` returns `executed` or `replaced`, and `watchSafeProposal` ends with them, once the Safe's nonce is past a proposal at a finalized block, decided by the Safe's execution events. Before, a passed proposal was watched forever.
- A payment through a wallet contract that reverted now counts as reverted for `revertedRelayrQuote`, so the Safe Relayr controller releases its session once the deadlines are final and the bundle is unpaid, instead of leaving it pending with no exit.
- New shared copy on `/review`: `relayrHeldMessage`, `relayrDiscardLine`, `writeHeldMessage`, `writeExitMessage`, `WRITE_EXIT_LABEL`, `SAFE_PROPOSAL_REPLACED_LINE`, `SAFE_PROPOSAL_EXECUTED_LINE`, `RELAYR_PAYMENT_RELEASED_LINE`.
- `transactionMessage` writes "Relayr's" as "the" and a bare "Relayr" as "the network", instead of "the execution service". `SafeRelayrRecoveryError`'s default message no longer names Relayr.
