---
"@bananapus/nana-sdk-core": patch
---

A Bendystraw refusal that is not JSON fails with its own status. The indexer's rate limiter answers in plain text, which `requestBendystraw` reported as a 502 "invalid content type", so `isRateLimited` missed a real rate limit. A refusal now also carries the wait it named as `retryAfter`, which `retryAfterOf` reads.

A fee review watches no blocks while its tab is hidden, and checks every call at once when the tab is shown again. `confirm` still reads fresh.
