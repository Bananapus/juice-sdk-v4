---
"@bananapus/nana-sdk-core": minor
"@bananapus/nana-sdk-react": patch
---

The held-write hooks (`useHeldWrite`, `useHeldIntents`, `useHeldWrites`, `HeldWritesNotice` and `useSavedAttempt`) now live in core at `@bananapus/nana-sdk-core/review/react`, which imports React and no wagmi, so apps on wagmi 3 can use them. React is an optional peer of core. `@bananapus/nana-sdk-react` re-exports them, so existing imports keep working.

A send now refuses when its own pre-wallet check finds an earlier success: only a success already delivered through `onSettled` before the send, with its acknowledgement under way, lets it through.

Settlements saved before 2.39 (a latest marker with no time) read as acknowledged, so returning users meet no extra "Send it again" prompt.
