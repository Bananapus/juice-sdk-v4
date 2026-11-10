---
"@bananapus/nana-sdk-core": minor
---

A write's settlement outlives the next reservation of its call or intent: the hold keeps the last 8 reservations' settlements by id. `handle.settlementOf(reservation)` reads it after a later reservation replaced it (another tab acknowledged it and reserved again), so a held-write view still delivers its own write's outcome, and `followHeldWrite(handle, client, { signal, reservation })` ends with that reservation's settlement instead of following the newer one.

`completeReviewedStep` takes an optional `signal`: once it aborts, it returns null with nothing recorded, told or acknowledged, so the success still warns the next run. Its new `acknowledge` argument (default true) set false leaves the acknowledgement to the caller, after it has shown the success. It completes a step from its own reservation's saved settlement after a later reservation replaced it. `useReviewedRun` acknowledges a run's last success only once its done has rendered, and never after the run was replaced, reset, dismissed or unmounted; the next run waits for that acknowledgement. A held-write view delivers its write's own settlement instead of reading a later reservation's release as its own.
