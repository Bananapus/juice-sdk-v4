---
"@bananapus/nana-sdk-core": patch
---

Every write hold controller over the same tab storage now shares one subscriber registry, by storage key. A reservation, hash, receipt, settlement, acknowledgement or release made through any handle reaches every view of that write in the tab at once. Previously a receipt reported on a separately opened handle (an app's receipt hook or root follower) reached the sending view only on its next poll. Sending the same action again right after "Confirmed" was then refused with "This went through while you were away." Other tabs still hear changes through the storage event and polls.
