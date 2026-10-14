---
"@bananapus/nana-sdk-core": minor
---

Record a Safe follower that ends without proof (ruling R119, the Safe replaced ruling).

- `onUnproven(client, proposalHash?)` on an opened write hold saves the end on the record (`unproven`, durable through reloads) when the app's Safe follower gives up or Safe's service loses the proposal. `proposalHash`, when given, must name the held proposal.
- `state()` then returns `safe-unproven`, with the exit at once, `WRITE_HOLD_SAFE_UNPROVEN_LINE` ("This Safe transaction couldn't be confirmed here. Check your Safe, then send again.") and the warning. `exit()` follows the usual snapshot rules.
- Authenticated evidence that arrives later (this proposal's canonical execution log, or its receipt) still settles it. A proven execution or replacement keeps its own state.
