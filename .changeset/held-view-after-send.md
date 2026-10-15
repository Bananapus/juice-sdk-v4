---
"@bananapus/nana-sdk-core": patch
---

Held-write view fixes found by the Homerun migration:

- A started view keeps hearing its hold after a send: the send subscribes its own listener, so unsubscribing it no longer removes the view's.
- Every send that went out ends with one checked read, so a write mined during the send shows its settlement without waiting for the poll or focus.
- A reservation the view's own send withdrew before the wallet (`onRejected`), or a clear read begun before the view saw that reservation, is never reported as released by another window.
