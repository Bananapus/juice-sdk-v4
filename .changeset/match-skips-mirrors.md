---
"@bananapus/nana-sdk-core": patch
---

A legacy `{ match: { to, selector } }` no longer lets two intents through the same target and selector block each other. At a key a match found, only a true pre-intent exact-call record holds: any intent's mirror there is skipped, including one an older version left, and no intent writes its mirror there. Each intent's own namespace already holds its own writes. A pay to project A no longer blocks a pay to project B through the same terminal, and one LP position no longer blocks another.
