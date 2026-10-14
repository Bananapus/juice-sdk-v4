---
"@bananapus/nana-sdk-core": minor
---

Shared write intents, so every web client keys the same user action the same way.

- `/review` exports `payIntent`, `cashOutIntent`, `loanIntent`, `borrowIntent`, `bridgeIntent`, `approvalIntent`, `launchIntent` and `liquidityIntent`. Each returns a write hold namespace from identity plus explicit user choices, never derived, quoted, routed or auto-filled values, and reads only the fields it names. Every value is normalized first, in one place: a safe integer and a bigint are one value (1000 and 1000n give one key, ids and `launchIntent`'s config alike), addresses and hex compare case-blind, and other strings stay as typed. A list it takes (liquidity `positions`) is a set: sorted and deduplicated, so order and repeats never change the key. A coarse key may make a second action of the same kind wait on an unresolved first one, but never sends twice.
- `resetWriteHoldsForTests()` and `resetWriteRecoveryForTests()` empty the tab's lock queues and held-write memory in place, so a controller made at module scope before the reset no longer keeps old holds.
- A candidate execution reported with `onExecuted` keeps its 30-minute unseen window through failing chain reads after `onUnproven`, until the chain first shows it pending or mined: no exit at once. Its report time is saved as `candidateSeenAt`.
