---
"@bananapus/nana-sdk-core": major
---

Review gaps found moving sticky, juicebox-money and revnet onto the reviewed path:

- **Breaking:** the boolean review API is gone: `registerTransactionReviewHandler`, `requestTransactionReview`, `requireTransactionReview`, `requestContractTransactionReview`, `requireContractTransactionReview` and the `ContractTransactionReviewCall` and `TransactionReviewOptions` types. Every review goes through core's prompt (`registerReviewHandler`) and its minted confirmation. `nana-wallet-check` now inventories `registerReviewHandler` calls in its place: a client's inventory needs a row for its review provider's registration, and its old `registerTransactionReviewHandler` rows become stale.
- `/testing` exports `promptReviewForTests(request, { simulation?, signal? })`: it prompts the registered review handler with core's model, as a send does, and returns `{ model, outcome }`.
- `ReviewedAction.reverify(call, index, prior)` gets `prior`, the chain, block number and block hash where the previous step confirmed (this run's receipt, or a resumed run's last completed step), or undefined for the first step.
- A `kind: "message"` signature takes `calls`, the calls the message lets someone run. They are validated, decoded with the transaction decoder and bound into the review model.
- `ReviewedAction.signal` (and `signReviewed`'s `signal`) withdraws an open review: the run ends as cancelled with nothing sent, and `ReviewPrompt.signal` aborts so the dialog closes. Once confirmed, it changes nothing.
- `ReviewedAction.onConfirmed(call, step, receipt)` is awaited after each step's receipt succeeds and is saved; its throw is ignored.
- A resumed run whose steps all settled while away reports the `done` progress.
- `useReviewedRun` returns `preload()`, which loads the engine once (again only after a failed load) and is shared with `run`, so a site can preload on hover or focus; and `discard(scope)`, which drops a released sequence. It is refused while a step is held or a run of the hook is open (`REVIEWED_RUN_BUSY_LINE`).
- `ReviewLineError` and `ReviewedCallRevertedError` are exported from `/review` without the send engine, so a site can throw its own refusal line from `reverify`, `assertWriteState` or `beforeWallet` and recognize a mined revert statically. The Defifa preparations throw `ReviewLineError`, so their reasons show.
- Fixed lines name the next step: the network line, a failed Safe call, an expired Safe proposal, a mined result that can't be read, and the saved-attempt check line.
