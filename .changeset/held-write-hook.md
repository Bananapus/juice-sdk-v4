---
"@bananapus/nana-sdk-core": minor
"@bananapus/nana-sdk-react": minor
---

One held write, the same in every app.

- Core `/review`: `createHeldWriteView` (framework-free) and `followHeldWrite`. The view gives a held write's phase (`clear`, `awaiting`, `confirming`, `held`, `settled`, `released`), its one line, its exit, its send under the hold, the watch, one shared follower per reservation, and the adoption of a previous deploy's record before any send.
  - Once a write is confirming it never goes back to awaiting.
  - A read the chain didn't check never hides an exit already shown.
  - `onSettled` fires once, only for what the view saw held.
  - A release reads as released, by the user's exit or neutrally by another window, never as a result.
  - The follower ends only on the hold's authenticated settlement or the user's exit.
- `hold.list({ account, chainId })` lists every write held for an account, intent and exact-call alike, never a mirror. Each comes with its handle at the key it was saved under. `listReviewedWrites` is the storage read.
- New lines: `HELD_CONFIRMING_LINE`, `HELD_RELEASED_LINE`, `HELD_RELEASED_ELSEWHERE_LINE`, `HELD_EXIT_LABEL`, `HELD_RELEASE_LABEL`, `HELD_SUCCESS_LINE` and `HELD_EXPIRED_LINE`. `hidesShownExit` and `settledLine` move into the SDK.
- React: `useHeldWrite` binds the view. Its exit only releases, and `onReleased("user")` is where the app reopens its review. `useHeldIntents`, `useHeldWrites` (from `hold.list`) and `HeldWritesNotice` make one app-wide notice.
