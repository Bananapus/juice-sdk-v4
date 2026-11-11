---
"@bananapus/nana-sdk-core": patch
---

useReviewedRun: a payment under an intent that went through while its form was away is never a dead end. A fresh runner of that exact call (matched against the reservation's saved outcome) shows it with "Send it again", which sends it once. Another form's different call under the same intent is never adopted: its refused run shows that success with "Send it again" (`held`, `sendAgainAction`), not followed or completed as its own, after which it sends its own call.
