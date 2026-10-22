---
"@bananapus/nana-sdk-core": minor
---

More review gaps found moving juicebox-money onto the reviewed path:

- `ReviewCallModel` carries each call's exact `data`. The model's id already binds it. `buildTransactionReviewPrompt` also takes a `ReviewModel`, so a review dialog can run its fee check and copy the audit prompt from the model alone.
- `ReviewedAction` takes a wallet-boundary hook for a site's own records. `beforeWrite(call, step)` runs after the step's hold reserves it and its journal saves it, right before the wallet opens. A throw sends nothing and releases the step. `onReleased(call, step)` says nothing was sent: a gate refused, the hook threw, or the wallet rejected with 4001. `onSubmitted(call, step, hash)` says the wallet returned the step's hash. The hooks run around a self-reviewing wallet's submit too, and `resumeReviewed` passes them through.
- `ReviewedCall.simulationBlockNumber` simulates a lone call on the block where a prerequisite confirmed outside the run took effect. A resumed run uses the latest block.
- `useReviewedRun`'s `run` takes an `account`, the one the calls were built for. It refuses before the review unless that account is connected (`REVIEWED_ACCOUNT_CHANGED_LINE`).
- `useReviewedRun`'s `held` is now a full held-write view of the step in flight, with `exitAction` ("I checked my wallet") and `sendAgainAction`, the same ones `useHeldSend` gives.
