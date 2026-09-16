# @bananapus/nana-sdk-connect

Two ways into a Juicebox app: a passkey account powered by Juicebox Center, or an external wallet.

- `@bananapus/nana-sdk-connect/core`: `createConnectController(options)` (headless, no React or wagmi), `passkeyOption({ wallet })`, `completeCenterCallback(wallet, url)` for the app's `/center/callback` page.
- `@bananapus/nana-sdk-connect/wagmi`: `centerAccountConnector({ wallet, read })`, a read-only Base connector for the passkey account.
- `@bananapus/nana-sdk-connect/react`: `<JBConnectModal open controller onClose />`, themed with `--jb-connect-*` custom properties.

The passkey account signs nothing in the app. Payments go through Center's review flow.
