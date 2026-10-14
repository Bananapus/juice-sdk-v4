---
"@bananapus/nana-sdk-core": minor
---

Keep a held write's settlement for every reader, not just the caller that saw it.

- When a hold clears on authenticated evidence (a verified receipt, or a Safe proposal's canonical execution), the settlement is saved in the hold's storage, with the same memory fallback and tab-shared evidence. A later `state()` or `peek()` for that call, from another tab, a reload or after the SDK's own follow timer settled it, returns `clear` with the same `settled: { result, hash }` until the next write on the call is reserved. Each settlement is bound to the reservation it settles, and is read only while that is the call's latest reservation (kept after a rejection or exit), so an older settlement never comes back, whether its removal failed or another tab's memory still holds it.
- A clear released by the user's exit never carries `settled`, and a proven expiry reports it only to the caller that saw it. Holding and exits are unchanged.
- Low level: `createBrowserWriteRecovery(...).markSettled(record, settlement)` and `.settled()`, with the `ReviewedWriteSettlement` type.
- A Safe write whose returned hash, or any candidate hash the hold has seen, is a known pending transaction reads as `pending-known-hash` with no exit, in `state()` and in the exit's recheck, so a second submission can't follow while the first is still pending.
- `onExecuted(client, hash)` no longer saves `executed` on the app's word. The hash is kept as a candidate (`candidates` on the record) and settles the write only once its own receipt proves this Safe's execution of the exact proposal or call. A candidate that fails verification leaves the hold free to reach `onUnproven` and its exit.
- `subscribe(listener)` calls the listener at once with the hold's latest state, when it has one, so a subscriber that arrives after the hold spoke (as a React effect does) doesn't miss it.
