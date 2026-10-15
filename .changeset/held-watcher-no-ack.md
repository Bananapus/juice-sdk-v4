---
"@bananapus/nana-sdk-core": patch
---

Two more held-write view fixes found validating the candidate against jbm:

- A send made in the same tick as its view's start (as `useHeldSend` does) waits for the start's first read and for the view's follower read, so an earlier held send refuses it as held, never as busy.
- A view acknowledges a success only when it delivered it to an `onSettled` callback. A watcher with no callback (`useHeldWrites`, `HeldWritesNotice`, app-wide followers) leaves the success unacknowledged, so the gate keeps blocking, the view shows `succeeded`, and the notice offers "Send it again" until the user acts.
