---
"@bananapus/nana-sdk-core": minor
---

`getRegisteredSucker` returns a project's sucker as the JBSuckerRegistry lists it (active or deprecated), bridging to the named chain, so a queued movement's Execute sends `toRemote` to the registry's address and never to an indexer's. It throws `UnverifiedSuckerError` (`code` `SUCKER_UNVERIFIED`) with `reason` `unregistered` when the registry doesn't list the address for the project or the sucker bridges elsewhere, and `unreadable`, carrying the read error as `cause`, when a read fails. Its `message` is one line an app can show.
