---
"@bananapus/nana-sdk-core": patch
---

A held Safe proposal sent more than a minute ago is followed at the slow pace from its first look: one awaiting its signers asks Safe's service for its execution once a minute instead of every 5 seconds, and gets no fast looks on a later visit. `waitForSafeExecutionHash` takes a function of the poll index as `pollingIntervalMs`. A 429 retry waits up to a second more, chosen at random, so requests refused together don't retry together.
