---
"@bananapus/nana-sdk-core": minor
---

One home for write intents, in place of each app's `write-intent.ts`.

- `writeIntentKey(action, params)` in `/review` returns the write hold namespace for a write whose calldata regenerates on retry. Params are canonically encoded (sorted keys, decimal integers, exact strings) and hashed behind a readable `intent:<action>:` prefix. Addresses and hex are normalized only when tagged with `intent.address()` or `intent.hex()`; plain strings stay case-sensitive, so memos "ABC" and "abc" no longer collide. Every value type has its own tag (a number never equals a bigint; pass amounts as bigint), and non-integer numbers and sparse arrays are refused.
- `holds.open(call, { legacy })`: under an intent namespace, the current exact call and every legacy key (an old namespace, or `{ call }`) are checked, each alone under its own lock, never two at once. While one holds an unresolved write, the intent handle is that hold: `state()` returns its gated state, `send()` refuses with it, and `exit()` runs its own exit; it stays where it is and settles or exits in place. Only when all are clear does the intent's own record apply, and they are checked again right before a send reserves.
- Every emitted, subscribed and returned state carries `reservation`, the id of the reservation it belongs to; a clear names the one that ended, even when its latest-reservation marker couldn't be saved. A late subscriber's replay is matched by reservation too.
- Low level: `createBrowserWriteRecovery(...).latestReservation()`.
