---
"@bananapus/nana-sdk-core": patch
---

Two held-write view fixes Sticky found on 2.41.1, so no app needs a workaround:

- A send that starts while its own view is reading the hold (on mount, focus, a poll or the read after the previous send) now waits for that read and its lock instead of refusing as busy. Another writer holding the call still refuses it.
- A direct write whose hash is mined but whose result can't be read yet shows the confirming line during the normal confirmation window. "Your transaction is onchain, but its result can't be read yet." appears only after the existing two-minute wait, as the wallet's pending line does.
