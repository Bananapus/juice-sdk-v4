---
"@bananapus/nana-sdk-core": major
---

Review gaps found moving sticky onto 4.0:

- `useReviewedRun` state has `settled: { step, finished }` once a followed step (a Safe proposal, a held step) settles successfully. Only the action's last step (or a Safe app batch) ends the run as `done`; an earlier one (an approval) leaves it `idle`, and running the action again resumes it.
- `useReviewedRun().discard(scope, account?)` drops the sequence saved for `account`, the one that sent it, which may no longer be the connected one.
- A failed simulation never shows viem's or the node's text. A payment revert the SDK decodes (`decodePayFailure`) shows its line; any other revert shows "This transaction would fail. Check the amounts and try again." (`REVERT_UNKNOWN_LINE`). `ReviewSimulation`'s failed result has `explained` when its message says why, and the refusal after the review says "the review shows why" (`REVIEWED_SIMULATION_FAILED_LINE`) only then; otherwise `REVIEWED_SIMULATION_UNEXPLAINED_LINE`. `revertDetail` no longer reads error text. A sequence's or a step's revert now throws the SDK's line (a `ReviewLineError`), so `errorLine` shows it instead of the network line.
- `errorLine` no longer carries the lines of the SDK's typed Relayr and Safe errors: each error class carries its own `line` (they extend `ReviewFixedLineError`), so a page that imports `errorLine` loads about 1 KB less. A plain error renamed to look like one gets the network line.
- A sequence step whose hold the user released by its exit ("I checked my wallet"), or that was released because nothing was sent, is no longer a `REVIEWED_SEQUENCE_UNCERTAIN_LINE` dead end: resuming reviews the remaining steps, that one included, once and sends them. A step cleared with no settlement and no release (a settlement that could not be saved) is still refused. Write holds expose `released(reservation)`.
