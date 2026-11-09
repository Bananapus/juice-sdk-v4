---
"@bananapus/nana-sdk-core": minor
"@bananapus/nana-sdk-react": minor
"@bananapus/nana-sdk-connect": minor
---

One owner for the send, read and sign-in states every client shows.

- Core: `reviewedRunStatus(run)` maps a reviewed run's `ReviewedProgress` phase, error, settled step and held view (`HeldWritePhase`) to one `ReviewedRunStatus` (`idle`, `review`, `simulating`, `signing`, `receipt`, `proposed`, `held`, `settled`, `done`, `failed`, `cancelled`) and `busy`. `useReviewedRun` returns `status` and `busy` from it, and `run` takes `onCancelled`, told once when the run ends with nothing sent and nothing held. Existing fields are unchanged.
- Core: named unions `SafeRelayrResultState`, `SafeRelayrRecoveryReason`, `SafeRelayrNonceCheckState`, `SafeRelayrExecutionCheckState`, `SafeRelayrExecutionStatus` and `JBCenterDeployStatus`. `getSuckerMovements` returns `JBSuckerMovementByStatus`, a `JBSuckerMovement` narrowed by `status`: only `claimable` carries a proof, only `pending` can execute.
- Core: `pollRelayrBundle` removes each wait's abort listener when its timer fires.
- React: `useGetRelayrTxBundle` decides completion with core's case-insensitive `relayrProgress`, takes `startPolling(uuid, expectedCount?)`, polls through failed reads, stops after five minutes (`timedOut`) and returns `progress`. A bundle Relayr reports as `success` no longer polls forever.
- React: context `AsyncData` has `error`. A failed read, or a read waiting on one that failed, is no longer "none". `JBTerminalProvider` takes `upstream`, and `JBPrimaryNativeTerminalProvider` passes the terminal lookup's loading and error, so `store` and `accountingContexts` no longer say "none" while the terminal resolves.
- Connect: `ConnectState.status` (`ConnectStatus`: `idle`, `connecting`, `connected`, `failed`). The passkey option treats a `refused` Center payment as settled, as Signa does.
