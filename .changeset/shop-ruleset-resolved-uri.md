---
"@bananapus/nana-sdk-core": minor
---

`getProject721Shop` now returns the current ruleset it already read for non-revnet projects (`ruleset`, `null` for revnets) so callers stop repeating `getCurrentRuleset`, and takes `includeResolvedUri` (default `false`). Resolver URIs were always requested before, which makes `tiersOf` fail through RPC gateways on large shops; pass `includeResolvedUri: true` to restore the old behavior.
