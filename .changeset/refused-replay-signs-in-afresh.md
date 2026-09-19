---
"@bananapus/nana-sdk-connect": patch
---

A stored sign-in record Center can no longer honour — a pending exchange it refuses to replay, a connection whose grant ran out, a record from an older client — is dropped and a fresh sign-in started in the same tap, instead of an error. The pending-exchange retry also runs when no `connected` hook is passed.
