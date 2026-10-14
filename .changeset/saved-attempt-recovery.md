---
"@bananapus/nana-sdk-core": minor
"@bananapus/nana-sdk-react": minor
---

One saved-attempt recovery, the same in every app.

- Core `/review`: `createSavedAttemptRecovery({ hold, storage?, locks? })` with `recover(attempt, client)`, `retire(attempt, reason)` and `canDiscard(attempt)`. An app describes a saved attempt by its intent namespaces (legacy ones included), what it saved (`started`, `hash`, `safeTxHash`, `safeNonce`, nonce evidence, `submittedAt`, `before`) and its `authenticate(hash)` domain check (`proven`, `not-this` or `unknown`).
- `recover` returns exactly one of `held`, `done` (`success` shown by the app's check, or the hold's proven `failed`), `check` or `none`, and never throws. It needs only what was saved, so it runs before any fresh-send preparation. A missing hold record with a started send, a refused or unreadable adoption, an empty search, holds kept only in this tab and every exception are `check`. A settled success always wins; one the app's check can't show is `check` with `settled`, never a send.
- `retire` saves the user's exit, the user's check action or a followed settlement under every namespace's hold lock, for every tab and reload, bound to the hold evidence it saw: a later reservation or settlement is never covered. A followed success is acknowledged on the hold.
- A reservation the SDK drops on a definite wallet rejection or an abort before the wallet opened is now recorded (`rejectedReservation()` on the write recovery), so its saved attempt retires on its own (`none` with `retired: "rejected"`) instead of asking for a check.
- `canDiscard` is false while the attempt is held, or while a success it settled hasn't been followed.
- New copy: `SAVED_ATTEMPT_CHECK_LINE`, `SAVED_ATTEMPT_CHECK_WARNING` and `checkedItLabel(next)` ("I checked it. Review it again.").
- React: `useSavedAttempt({ recovery, attempt, client, checkNext })`, with lifecycle-scoped answers and the one `checkAction`.
