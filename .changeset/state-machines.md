---
"@bananapus/nana-sdk-core": minor
"@bananapus/nana-sdk-react": minor
---

One owner for the send and read states every client shows.

- Core: `reviewedRunStatus(run)` maps a reviewed run's `ReviewedProgress` phase, error, settled step and held view (`HeldWritePhase`) to one `ReviewedRunStatus` (`idle`, `review`, `simulating`, `signing`, `receipt`, `proposed`, `held`, `settled`, `done`, `failed`, `cancelled`) and `busy`. `useReviewedRun` returns `status` and `busy` from it, and `run` takes `onCancelled`, told once when the run ends with nothing sent and nothing held. Existing fields are unchanged.
- Core: named unions `SafeRelayrResultState`, `SafeRelayrRecoveryReason`, `SafeRelayrNonceCheckState`, `SafeRelayrExecutionCheckState`, `SafeRelayrExecutionStatus` and `JBCenterDeployStatus`. `getSuckerMovements` returns `JBSuckerMovementByStatus`, a `JBSuckerMovement` narrowed by `status`: only `claimable` carries a proof, only `pending` can execute.
- Core: `pollRelayrBundle` removes each wait's abort listener when its timer fires.
- React: `useGetRelayrTxBundle` decides completion with core's case-insensitive `relayrProgress`, takes `startPolling(uuid, expectedCount?)`, polls through failed reads, stops after five minutes (`timedOut`) and returns `progress`. A bundle Relayr reports as `success` no longer polls forever.
- React: context `AsyncData` has `error`. A failed read, or a read waiting on one that failed, is no longer "none". `JBTerminalProvider` takes `upstream`, and `JBPrimaryNativeTerminalProvider` passes the terminal lookup's loading and error, so `store` and `accountingContexts` no longer say "none" while the terminal resolves.
- Core: `useReviewedRun` returns `lastSubmittedStep`, the highest step whose hash the wallet returned in the run (resumed sent steps count); `reset` clears it.
- Core: `createReviewQueue()` (one review dialog at a time, bound to the project scope and account it opened under, re-proving its scope before an approval resolves; a scope or account change cancels what no longer belongs and advances).
- Core: `createFeeBuybackReview(calls, context, changed)` and `useFeeBuybackReview(calls, context)`, with `status` (`checking`, `ready`, `fallback`, `unknown`, `none`, `confirming`), `confirm`, `retry` and `wait`.
- Core: `useSavedAttempt` returns `clear` and takes `completion`, `onDone`, `onRetired` and `recheckMs`.
- Core: the Safe Relayr controller has `getState`, `subscribe` and `reset` (`SafeRelayrView`).
- Core: `RelayrLaunchJournal`, `RELAYR_LAUNCH_PHASES`, `isRelayrLaunchPhase`, `relayrLaunchPaying`, `relayrLaunchUnfunded`, `relayrLaunchInFlight`, `advanceRelayrLaunch` and `resignedRelayrLaunch`.
- Core: `useStartOnce(open, preparing, start?, startKey?, blocked?)`, `useMobileWallet()` and `isMobileDevice(nav)` in `review/react`.
- Core: light subpaths `review/locks` (`browserLocks`, `BrowserLocks`) and `review/machines` (`reviewedRunStatus`, `createReviewQueue`, the Relayr launch journal) load no Safe, Relayr or decoding code. `/review` still exports them.
- Core: `gasWithHeadroom(estimate, cap?)` stops the doubled estimate at `TRANSACTION_GAS_CAP` (2^24, EIP-7825) when the estimate fits under it.
