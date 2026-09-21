---
"@bananapus/nana-sdk-connect": patch
---

The framed Center sign-in names Center's origin in the frame's `allow`. The frame has no `src` (Center's launch form posts into it by name), so a bare `publickey-credentials-get; publickey-credentials-create` delegated nothing and the browser refused every passkey prompt inside it. `ConnectOption.connect`'s `frame(name, origin)` now carries the origin, and `ConnectState.frameOrigin` holds it.
