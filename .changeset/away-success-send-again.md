---
"@bananapus/nana-sdk-core": patch
---

useReviewedRun: a payment under an intent that went through while its form was away is never a dead end. A fresh runner refused by it shows it as `held` with `sendAgainAction`, whether it brings that exact call or another form's under the same intent, and after Send it again sends its own call once. That success is never adopted: it is not followed, completed or told as the form's own, so dismissing it never closes a changed payment as done.
