---
"@bananapus/nana-sdk-core": patch
---

Fence the `browserLocks()` IndexedDB lease, so a tab whose lease lapsed while it was suspended (as while the user is in a wallet app) can't keep writing.

- `browserLocks().request` takes `(name, work)` as well as `(name, options, work)`, as `navigator.locks` does.
- `work` gets a `LockHandle`: `name`, `mode`, `signal` (aborted once the lock is known lost), `held()` (a fresh read) and `assertHeld()`, which throws the exported `LockLostError` (`code: "LOCK_LOST"`). Native Web Locks never lose it. The IndexedDB lease gives each acquisition its own owner token, renews only while the lease is still its own and unexpired, and releases only its own. Call `assertHeld()` immediately before every journal write and every wallet submission inside the lock.
- The SDK's own holds check their locks right before a reservation, before a saved attempt's retirement, and as the last await before the wallet opens (`WriteHoldGate.assertHeld()`, used by `sendReviewed` and Relayr payments). A lost lock releases the unsent step and refuses with `LockLostError`.
