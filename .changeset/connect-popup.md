---
"@bananapus/nana-sdk-connect": minor
---

Sign in with the passkey account in a popup window: the app page stays, the callback comes back by message, and the exchange finishes in the page. A blocked popup falls back to the full-page redirect. Adds `deliverCenterCallback` for the app's callback page and a `connected` hook on `passkeyOption`.
