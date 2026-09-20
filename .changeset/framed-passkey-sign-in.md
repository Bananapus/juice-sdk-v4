---
"@bananapus/nana-sdk-connect": minor
---

`passkeyOption({ frame: true })` opens Center in a frame the app shows instead of a popup: the option asks the controller for a frame by name (`ConnectState.frameName`, `connect({ frame })`), `JBConnectModal` renders it (`allow="publickey-credentials-get"`, sized by the page inside), Center's launch form targets it, and `deliverCenterCallback` now hands a callback up to a same-origin framing page as well as to an opener. Center serves the sign-in framed only for apps its operator admits.
