# @bananapus/nana-sdk-connect

Two ways into a Juicebox app: a passkey account powered by Juicebox Center, or an external wallet.

- `@bananapus/nana-sdk-connect/core`: `createConnectController(options)` (headless, no React or wagmi), `passkeyOption({ wallet, connected })`, and for the app's `/center/callback` page `deliverCenterCallback(url, { window })` then `completeCenterCallback(wallet, url)`. The passkey account opens Center in a popup and the page stays; the callback page hands its URL back to the page, which finishes the exchange and runs `connected`. A blocked popup falls back to a full-page redirect, where the callback page completes the exchange itself.
- `@bananapus/nana-sdk-connect/wagmi`: `centerAccountConnector({ wallet, read })`, a read-only Base connector for the passkey account.
- `@bananapus/nana-sdk-connect/react`: `<JBConnectModal open controller onClose />`, themed with `--jb-connect-*` custom properties; the primary button names the platform prompt (Touch ID, Face ID, Windows Hello) unless `passkeyLabel` overrides it.

The passkey account signs nothing in the app. Payments go through Center's review flow.
