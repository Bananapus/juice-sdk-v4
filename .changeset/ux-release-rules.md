---
"@bananapus/nana-sdk-core": minor
---

Release holds that left users stuck, following revnet.money (ruling R119). Hold only where a second run could cost money the chain would not refuse.

Behavior changes:

- Write recovery holds an ordinary write by its exact call (account, chain, target, value and calldata), not by target and selector. A changed amount or quote is no longer held; a `namespace` still holds a whole action. Records under the old key still hold their exact call.
- `reserve(call, evidence)` records the account's next nonce (`readReviewedWriteNonce`). `resolve` and `checkReviewedWrite` read only the record's chain and release on proof: the saved hash's own transaction binds the nonce it was sent at (`sentNonce`) and counts as sent wherever it ran, wallet wrappers included; the exact call at that nonce is adopted after a speed-up; another transaction there releases the write only when it calls an address with no code (a cancel); the app's `effect` read shows it ran. A nonce sampled before the wallet opened never proves a replacement. `abandon(record, { checkedWallet: true })` is the user's exit.
- `withLock` no longer refuses without Web Locks: the origin's tabs share an IndexedDB lease per action (claimed in one atomic transaction, renewed while held, lapsing 15 seconds after a tab closes), or, with no IndexedDB either, a lock within the tab, with one console note. `browserLocks()` exports the same fallback.
- `lookAtSafeProposal` returns `executed` or `replaced`, and `watchSafeProposal` ends with them, once the Safe's nonce is past a proposal at a finalized block: a search of the Safe's nonce at past blocks finds the block where it was used, and the Safe's execution events there decide. Before, a passed proposal was watched forever.
- A payment through a wallet contract that reverted now counts as reverted for `revertedRelayrQuote`, so the Safe Relayr controller releases its session once the deadlines are final and the bundle is unpaid, instead of leaving it pending with no exit.
- New shared copy on `/review`: `relayrHeldMessage`, `relayrDiscardLine`, `writeHeldMessage`, `writeExitMessage`, `WRITE_EXIT_LABEL`, `SAFE_PROPOSAL_REPLACED_LINE`, `SAFE_PROPOSAL_EXECUTED_LINE`, `RELAYR_PAYMENT_RELEASED_LINE`.
- `transactionMessage` writes "Relayr's" as "the" and a bare "Relayr" as "the network", instead of "the execution service". `SafeRelayrRecoveryError`'s default message no longer names Relayr.
