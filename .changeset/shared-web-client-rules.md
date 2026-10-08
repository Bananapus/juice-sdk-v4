---
"@bananapus/nana-sdk-core": minor
---

Share Safe app proposal confirmation, exact reviewed-call binding, pending-call deduplication and recovery readers across web clients. Export destination records before Relayr execution hashes arrive and a presentation-only transaction message formatter.

Add paced JB Center admission to the existing limiter so requests on independent chains start without waiting for earlier responses, and rate-limit waits do not consume their network timeout. Existing finite-slot limiter behavior remains unchanged.

Authenticate a prepared intent's canonical envelope hash before requesting its signature and preserve that same envelope through publication. Add a final synchronous app-specific guard after all awaited write preparation, retaining recovery locks for ambiguous wallet submissions.
