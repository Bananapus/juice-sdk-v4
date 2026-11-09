# @bananapus/nana-sdk-connect

The one owner of the connect logic every client shares: `createConnectController` (with
`ConnectState.status`), `passkeyOption`, the popup and frame sign-in, `completeCenterCallback`
(`/core`) and the read-only wagmi connector (`/wagmi`). Signa keeps its connect modal and builds it on
these.

0.6.1 was published as a pointer to `@me.jango/signa`, which then held a copy of this logic. That
copy and this one are converging here; Signa's adoption follows in its own release. Until then, apps
on `@me.jango/signa` keep importing from it.

React and wagmi are optional peers. Option ids and message types (`juicebox-center`,
`juicebox-center:*`) are unchanged. A payment can end `refused`: Signa retired the approval and never
sends it, so it counts as settled.
