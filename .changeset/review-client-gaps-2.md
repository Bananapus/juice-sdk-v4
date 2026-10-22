---
"@bananapus/nana-sdk-core": minor
---

More review gaps found moving juicebox-money and sticky onto the reviewed path:

- `ReviewCallModel` carries each call's exact `data`. The model's id already binds it. `buildTransactionReviewPrompt` also takes a `ReviewModel`, so a review dialog can run its fee check and copy the audit prompt from the model alone.
- `ReviewedAction` takes three awaited per-step hooks at the wallet boundary, one design for every client's own journals (jbm's launch, multisig, mint and Defifa records; sticky's bridge, collector and launch session):
  - `beforeWallet(call, step)` runs after the step's hold reserves it and its journal saves it, right before the wallet opens. A throw sends nothing and releases the step.
  - `onUnsent(call, step)` runs only when nothing was sent: a gate refused, the hook threw, or the wallet rejected with 4001. It never runs after an ambiguous failure.
  - `onSubmitted(call, step, hash, { safe, adopted })` runs once the wallet or an adopted Safe proposal returns the hash, before the receipt wait. A throw keeps the step pending, never unsent.

  The hooks run around a self-reviewing wallet's submit too, which then checks the account once more after them. `resumeReviewed` passes them through.

- `ReviewedCall.simulationBlockNumber` names the block where a prerequisite confirmed outside the run took effect. A lone call is simulated on the latest block, or on that block while the node is behind it, so it never sees state from before the prerequisite or stale state after it. A resumed run uses the latest block.
- `ReviewedCall.legacy` takes the hold's own legacy sources (`WriteHoldLegacySource`, now exported): an old namespace, `{ call }` or `{ match: { to, selector } }`. The journal saves them, and `discardReviewedSequence` stays refused while a write under any of them is held.
- `payRelayrReviewed` takes `onSending` (after the hold reserves, before the wallet; a throw sends nothing) and `onSent` (every hash the payment is known by). It also lets a Safe app pay by proposal: zero `safeTxGas`, `{ safeTxHash }` returned, and the hold following it to the Safe's execution.
- `nana-wallet-check` scans every source file under a root, generated and test files included, unless `--exclude <glob>` names it. Clients that relied on the old implicit skips add `--exclude "**/generated/**" --exclude "**/*.test.*" --exclude "**/*.spec.*"`.
- `useReviewedRun`'s `run` takes an `account`, the one the calls were built for. It refuses before the review unless that account is connected (`REVIEWED_ACCOUNT_CHANGED_LINE`).
- `useReviewedRun`'s `held` is now a full held-write view of the step in flight, with `exitAction` ("I checked my wallet") and `sendAgainAction`, the same ones `useHeldSend` gives.
