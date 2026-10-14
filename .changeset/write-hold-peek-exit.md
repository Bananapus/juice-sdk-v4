---
"@bananapus/nana-sdk-core": patch
---

Only the gate offers an exit. Every method that has a client (`state`, `exit`, `onReceipt`, `onUnproven`, `onExecuted`, `attachHash`, and a send's refusal) returns, emits or embeds in its error only the gate's answer, so an exit appears at once where the gate allows it and never where `state()` would refuse it. `peek()`, a subscriber's replay and every other emitted state that didn't pass through the gate in `state()` or `exit()` (a send's progress, another tab's change) now keep the status and line with `exit: false`, so a UI can't unlock a retry from a stale exit, for example after the original hash became pending again. The exit appears once `state(client)` or `exit()` runs the gate. The `exit` field of the exit-capable states is now typed `boolean`.
