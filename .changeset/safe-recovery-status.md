---
"@bananapus/nana-sdk-core": patch
---

Report canonical Safe nonce evidence when a saved Relayr selection lacks its quote.
Check all exact saved identities concurrently at finalized blocks. Release only
unfunded selections whose nonces are all consumed, while preserving incomplete
identities and uncertain funding for explicit recovery. Distinguish obsolete
Safe selections from expired unpaid quotes and successful executions.
