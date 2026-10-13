---
"@bananapus/nana-sdk-core": minor
---

One controller for held wallet writes, so each app's send hook becomes thin wiring (ruling R119).

- `createWriteHold({ storage, locks, safeService })` opens a hold per exact call with `send(client, run)` (its gate's `beforeSend`, `afterSubmit` and `onRejected` go to the wallet boundary), `onReceipt`, `onExecuted`, `exit(snapshot, { checkedWallet: true }, client)`, `state(client)`, `peek()` and `subscribe(listener)`. States: `clear`, `pending-known-hash`, `held-no-hash`, `dropped-proven` (proven from the nonce the hash was sent at, never the pre-wallet hint), `held-unchecked` (a record saved without a nonce: the exit, with `WRITE_HOLD_UNCHECKED_LINE`) and `ran-executed`. `WriteHeldError` and `WriteHoldBusyError` refuse a held or already-open call; `WriteHoldNonceError` stops a send whose account nonce can't be read after one retry, before the wallet opens.
- `createHeldWriteStorage` keeps holds in the browser's storage, or this tab's memory where storage is refused, reads both and moves memory holds into storage once it can be written. `WRITE_HOLD_IN_TAB_LINE`, `WRITE_HOLD_PENDING_LINE` and `WRITE_HOLD_REVERTED_LINE` are the lines.
- A verified success releases at once; a revert, including a Safe execution returned at once that failed, holds until final; a Safe proposal proven executed is saved (`executed`, `executionHash` on the record), refuses `abandon`, and settles from its execution's receipt. Replaced or proven-expired proposals release.
- `lookAtSafeProposalEnd` and `watchSafeProposalEnd` return the execution the canonical ExecutionSuccess or ExecutionFailure log names, and read the chain's proof even when Safe's service already lists the proposal executed. `lookAtSafeProposal` and `watchSafeProposal` keep their return values.
- `checkReviewedWrite` and `resolve` report `{ status: "pending", usedBy }` when a canonical finalized block shows another transaction used the nonce of a write the node doesn't know.
- The per-tab lock fallback and the tab memory are shared by every copy of the module loaded in a tab.
