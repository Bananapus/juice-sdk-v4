---
"@bananapus/nana-sdk-connect": patch
---

Popup sign-in hardening: the callback page keeps offering its result to a same-origin opener until acknowledged (a backgrounded phone tab no longer completes the exchange twice), a popup closed while preparing ends the attempt quietly, an already-connected tab reports its connection instead of failing, and the Center request now lives fifteen minutes (`@me.jango/center-wallet` 0.3.0) so a signup started from an app can finish and return.
