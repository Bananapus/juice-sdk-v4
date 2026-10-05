---
"@bananapus/nana-sdk-core": minor
---

Add read-only, block-pinned, JSON-safe deployment diagnostics for canonical Revnets, omnichain/direct 721 hooks, and ordinary Juicebox projects. Checks distinguish confirmed binding mismatches from unavailable reads and unsupported custom contracts, report pricing without treating unconventional precision as invalid, and optionally inspect operator powers. Add shared wording for independent indexer evidence and runnable read-only inspection/preparation examples.

Add shared `resolve721PricingContext`, `buildRevnet721Config`, optional Revnet `default721Config`, and deployment overload selection. Omitted shop configuration retains the existing contract-default behavior; no new acknowledgement is required. Explicit pricing and permission choices are preserved. Validate unsupported precision and conflicting configuration, and reject allowed posts when no explicit shop config can encode them. Omnichain ruleset queue semantics remain unchanged.
