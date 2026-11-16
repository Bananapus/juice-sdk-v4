---
"@bananapus/nana-sdk-core": patch
---

A held write is read once a poll however many views show it: a view's follower hands it each checked answer, so the view's own timer no longer repeats the read. A held Safe proposal asks Safe's service once a read instead of twice (`lookAtSafeProposalEnd` takes the record its caller just read). A hidden tab asks nothing at the slow pace. `requestBendystraw` retries a rate-limited query once, no sooner than `Retry-After`, and `listPendingSafeTransactions` retries only a page the service failed.
