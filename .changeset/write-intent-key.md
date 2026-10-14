---
"@bananapus/nana-sdk-core": minor
---

One home for write intents, in place of each app's `write-intent.ts`.

- `writeIntentKey(action, params)` in `/review` returns the write hold namespace for a write whose calldata regenerates on retry. Params are canonically encoded (sorted keys, decimal integers, exact strings) and hashed behind a readable `intent:<action>:` prefix. Addresses and hex are normalized only when tagged with `intent.address()` or `intent.hex()`; plain strings stay case-sensitive, so memos "ABC" and "abc" no longer collide. Non-integer numbers are refused.
- `holds.open(call, { legacy })`: under an intent namespace, the current exact call and every legacy key (an old namespace, or `{ call }`) are checked. An unresolved hold there is adopted into the intent under the lock, keeping its identity, evidence and exit requirement, or the send is refused with its state. It is never released.
- Every emitted, subscribed and returned state carries `reservation`, the id of the reservation it belongs to; a clear names the one that ended.
- Low level: `createBrowserWriteRecovery(...).latestReservation()`, `.adopt(record)` and `.handOff(record)`.
