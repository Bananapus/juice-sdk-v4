---
"@bananapus/nana-sdk-core": minor
---

Fence the `browserLocks()` IndexedDB lease, so a tab whose lease lapsed while it was suspended (as while the user is in a wallet app) can't keep writing, and check clients' locks at the SDK's wallet and signature boundaries.

- `browserLocks().request` takes `(name, work)` as well as `(name, options, work)`, as `navigator.locks` does.
- `work` gets a `LockHandle`: `name`, `mode`, `signal` (aborted once the lock is known lost), `held()` (a fresh read) and `assertHeld()`, which throws the exported `LockLostError` (`code: "LOCK_LOST"`). Native Web Locks never lose it. The IndexedDB lease gives each acquisition its own owner token, renews only while the lease is still its own and unexpired, and releases only its own.
- `assertLocksHeld(locks)` checks several handles in one line, right before a client's own journal write.
- `locks` on `sendReviewed`, `resumeReviewed`, `payRelayrReviewed`, `signReviewed` and `signReviewedForwardRequests`: the client's handles are checked before `beforeWallet`/`onSending`, and, with the SDK's own, as the last await before every request that sends or signs. A lost one sends or signs nothing and releases the step's hold. `onUnsent` runs only while every one of `locks` reads as held, read fresh right before each step's callback, so a wallet rejection that arrives after the lock lapsed never clears the next owner's record. A loss of only the SDK's own lock still calls `onUnsent`.
- `WalletAdapter` calls that send or sign take an optional `fence` (`sendTransaction`'s `{ fence }`, and a `WalletRequestOptions` second argument on `signTypedData`, `signMessage`, `sendCalls` and `submitToReviewer`). `viemWalletAdapter` awaits it as the last await before forwarding each sending or signing request, after loading its wallet client, and `selfReviewingAdapter` right before handing the request over; its refusal is a `WalletNotInvokedError`. A custom adapter that ignores it keeps working, checked by the SDK just before the adapter is called; to close the window inside the adapter, await `fence` right before the wallet request.
- `assertLocksHeld` takes anything with `assertHeld()`.
- A Relayr payment refused before the wallet once the app's `onSending` began (including its own save refused for a lost lock) fails as not sent (`RelayrPaymentNotSentError`), so the app's record restores instead of staying pending.
- A release after a lost lock (a rejected or unsent step) leaves the record alone unless it is still the step's own unsent reservation, so it can't hide the next owner's write or settlement.
- `SafeRelayrStore.withLock(account, run)` hands `run` the locks it took (`run(locks)`); the controller checks them after every read and right before every `save` under the lock. A wallet rejection or payment hash that arrives after the lock was lost is saved under a fresh lock, only while the saved record is still that attempt's. Stores that call `run()` keep working, unfenced.
- The SDK's own holds check their locks right before a reservation, before a saved attempt's retirement, and as the last await before the wallet opens (`WriteHoldGate.assertHeld()`).
