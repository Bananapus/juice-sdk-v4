---
"@bananapus/nana-sdk-core": minor
---

A reviewed action with a `scope` is saved as a sequence once its review is confirmed, before the first wallet call, and advanced as each step's receipt lands. `findReviewedSequence(scope, account)` finds an unfinished one (a step sent or in flight), `resumeReviewed` finishes it: the step whose wallet call opened is decided by its write hold first (still held is refused, a settled success counts as completed), then only the remaining steps are reviewed once and sent, with `reverify` given each step's original index. A completed step is never sent again, only the account that started a sequence can resume it, and a fresh run of the same scope is refused while one is unfinished. A Safe-connected step's proposal is recorded and the sequence resumes once it runs. `discardReviewedSequence` drops one, refused while any remaining step is held.

`useReviewedRun` (`@bananapus/nana-sdk-core/review/react`) is the one reviewed-send hook every site shares: it resumes a scope's unfinished sequence, reports each step's phase, maps error lines through `transactionMessage`, treats a closed review or a 4001 as a cancel, and refuses a multi-step run without a scope. A site's own hook only builds its deps from its wallet library.
