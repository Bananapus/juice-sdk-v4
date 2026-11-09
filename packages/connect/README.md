# @bananapus/nana-sdk-connect (moved)

This package moved to [`@me.jango/signa`](https://www.npmjs.com/package/@me.jango/signa) 0.4.0 and is
deprecated. It gets no further releases. The export names are the same, so moving over only changes the
import specifier:

| Before                              | After                   |
| ----------------------------------- | ----------------------- |
| `@bananapus/nana-sdk-connect/core`  | `@me.jango/signa/core`  |
| `@bananapus/nana-sdk-connect/wagmi` | `@me.jango/signa/wagmi` |
| `@bananapus/nana-sdk-connect/react` | `@me.jango/signa/react` |

```sh
npm uninstall @bananapus/nana-sdk-connect
npm install @me.jango/signa
```

React and wagmi stay optional peers. The sign-in copy now says Signa ("Powered by Signa", "Signa
account"); option ids and message types (`juicebox-center`, `juicebox-center:*`) are unchanged.
Two wallet-client changes arrive in the same switch. A payment can end `refused`: Signa retired the
approval and never sends it, so clear it and review a fresh one. And `payFailure` is the SDK's own
`PayFailure` (bigint amounts, with `zeroFill` and `adjustable`), ready for `payRetrySlippageBps`.

Source and docs: https://github.com/mejango/signa/tree/main/wallet-client
