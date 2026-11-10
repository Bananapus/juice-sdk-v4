---
"@bananapus/nana-sdk-core": minor
---

`useReviewedRun` owns the run rules every site's wrapper re-derived:

- A run closed after an earlier step was sent (here, in a resumed sequence, or in the continuation a late approval receipt reopened) ends `stopped`, a new `ReviewedRunStatus` beside `cancelled`, with `lastSubmittedStep`. The action's new `onStopped(step)` is told once that state has rendered, as `onCancelled` is.
- `dismiss()` closes a run's confirm and says whether it closed (never while its review or wallet is open). A held step before the last ends the run there: nothing more is reviewed, the hold keeps the step, and it is followed detached; the new `onDismissedSettled(call)` dep hears its success. A held last step only stops the run's wait (`ended()` is null): it stays followed and shown. Otherwise it resets, still following any hold it showed.
- `following` is true while the run only follows a sent step's hold, and `busy` is now false then: the confirm can close.
- A run whose engine failed to load or whose send threw is free to run again (now covered by a test).
