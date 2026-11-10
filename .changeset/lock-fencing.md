---
"@bananapus/nana-sdk-core": minor
---

Fence the `browserLocks()` IndexedDB lease, so a tab whose lease lapsed while it was suspended (as while the user is in a wallet app) can't keep writing, and check clients' locks at the SDK's wallet and signature boundaries.

- `browserLocks().request` takes `(name, work)` as well as `(name, options, work)`, as `navigator.locks` does.
- `work` gets a `LockHandle`: `name`, `mode`, `signal` (aborted once the lock is known lost), `held()` (a fresh read) and `assertHeld()`, which throws the exported `LockLostError` (`code: "LOCK_LOST"`). Native Web Locks never lose it. The IndexedDB lease gives each acquisition its own owner token, renews only while the lease is still its own and unexpired, and releases only its own.
- `assertLocksHeld(locks)` checks several handles in one line, right before a client's own journal write.
- `locks` on `sendReviewed`, `resumeReviewed`, `payRelayrReviewed`, `signReviewed` and `signReviewedForwardRequests`: the client's handles are checked, with the SDK's own, as the last await before every wallet call and every signature. A lost one sends or signs nothing and releases the step's hold, without calling `onUnsent`: the lock's new owner owns the site's journal.
- A release after a lost lock (a rejected or unsent step) leaves the record alone unless it is still the step's own unsent reservation, so it can't hide the next owner's write or settlement.
- `SafeRelayrStore.withLock(account, run)` hands `run` the locks it took (`run(locks)`); the controller checks them after every read and right before every `save` under the lock. A wallet rejection or payment hash that arrives after the lock was lost is saved under a fresh lock, only while the saved record is still that attempt's. Stores that call `run()` keep working, unfenced.
- The SDK's own holds check their locks right before a reservation, before a saved attempt's retirement, and as the last await before the wallet opens (`WriteHoldGate.assertHeld()`).
