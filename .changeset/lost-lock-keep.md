---
"@bananapus/nana-sdk-core": minor
---

A wallet's answer that arrives after the site's lock was lost (an IndexedDB lease that lapsed while the user was in the wallet) is kept, not dropped.

- `keepOutcome(locks, write, later?)` (review entry): `write()` now; refused for a lost `browserLocks` lease, the outcome is kept and applied once the work under `locks` ended, under the same handles taken back. Without `later`, `write` runs again only if no other tab took the locks since. With `later`, which matches the attempt by its identity and merges into the latest record, it lands whenever the locks are free, keeping another tab's unrelated update. Otherwise the record stays as the lost lock left it.
- `sendReviewed`, `resumeReviewed` and `completeReviewedStep` keep `onUnsent` (a 4001 after the lapse ends the site's attempt instead of leaving it "sending"), and an `onSubmitted`/`onConfirmed` refused for the lost lock. `payRelayrReviewed` keeps `onSent`, the sped-up mined hash included, and gains `onUnsent` for a definite unsent after `onSending` began (a 4001, or the adapter's fence refusing before the wallet); the caller gets the wallet's error. `attemptScoped: true` on either opts the site's callbacks into the identity-matched mode. Safe Relayr's `fund()` uses the same mechanism.
- A released lease stays saved as its owner's, expired, so a later reclaim can tell nobody took it since.
- `LockLostError` shows `LOCK_LOST_LINE` through `errorLine` (its message stays for logs). `REVIEW_STOPPED_LINE` is the shared line for a stopped run.
- `useReviewedRun` follows only a write its run reserved, one this runner followed before (its own, though its calls changed), its saved sequence's, or the exact same call: a form refused by another form's write on a shared hold ends with the hold's line and adopts nothing, and a retry of the action whose write it still follows is refused without replacing that follow (read live, so a "Try again" that resets and runs from one render's handle follows it again). A retry of a single-call action whose earlier write succeeded, even if another reader acknowledged that success, closes as done on it and sends nothing: checked before preparing, after preparing and at the final send gate.
- A last step `dismiss` closed while it was followed (an EOA send or a Safe proposal) stays observed: a run of the same calls is refused with the hold's line while it confirms, and closes as done on its success (acknowledged once shown) instead of sending again. Different calls, or a later run, send.
- `keepOutcome` is exported from the review entry.
- `attachHash` returns `hashCheck`: `"attached"`, `"mismatch"` (read, and another transaction) or `"unverified"` (any read failure, retryable). `HELD_HASH_MISMATCH_LINE` and `HELD_HASH_UNVERIFIED_LINE` are the shared lines.
- `lapsingLocksForTests()` (`testing`): a lock manager whose lease can be made to lapse, to install as `navigator.locks` in a site's tests.
