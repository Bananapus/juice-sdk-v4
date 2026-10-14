---
"@bananapus/nana-sdk-core": minor
---

Keep a held write's settlement for every reader, not just the caller that saw it.

- When a hold clears on authenticated evidence (a verified receipt, or a Safe proposal's canonical execution), the settlement is saved in the hold's storage, with the same memory fallback and tab-shared evidence. A later `state()` or `peek()` for that call, from another tab, a reload or after the SDK's own follow timer settled it, returns `clear` with the same `settled: { result, hash }` until the next write on the call is reserved, which replaces it.
- A clear released by the user's exit never carries `settled`, and a proven expiry reports it only to the caller that saw it. Holding and exits are unchanged.
- Low level: `createBrowserWriteRecovery(...).markSettled(settlement)` and `.settled()`, with the `ReviewedWriteSettlement` type.
