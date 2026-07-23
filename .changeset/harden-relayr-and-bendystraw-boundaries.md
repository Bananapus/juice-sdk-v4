---
"@bananapus/nana-sdk-react": patch
---

Harden Relayr bundle submission and polling with explicit terminal status,
`hasFailed` and `isFetching` state, quote validation, destination-chain and
signature validation, and propagated Relayr errors. Scope Bendystraw cache
entries by service URL so clients configured for different endpoints cannot
share stale data. Declare React 19 as a supported peer alongside React 18.
