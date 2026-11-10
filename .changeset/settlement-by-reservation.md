---
"@bananapus/nana-sdk-core": minor
---

A write's settlement outlives the next reservation of its call or intent: the hold keeps the last 8 reservations' settlements by id. `handle.settlementOf(reservation)` reads it after a later reservation replaced it (another tab acknowledged it and reserved again), so a held-write view still delivers its own write's outcome, and `followHeldWrite(handle, client, { signal, reservation })` ends with that reservation's settlement instead of following the newer one.
