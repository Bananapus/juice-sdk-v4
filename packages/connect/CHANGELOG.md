# @bananapus/nana-sdk-connect

## 0.3.2

### Patch Changes

- 3504aed: When the tab's saved connection state changed underneath preparing (an earlier attempt settling), the passkey option prepares once more instead of showing "This tab changed its wallet connection".

## 0.3.1

### Patch Changes

- 0ffba53: Popup sign-in hardening: the callback page keeps offering its result to a same-origin opener until acknowledged (a backgrounded phone tab no longer completes the exchange twice), a popup closed while preparing ends the attempt quietly, an already-connected tab reports its connection instead of failing, and the Center request now lives fifteen minutes (`@me.jango/center-wallet` 0.3.0) so a signup started from an app can finish and return.

## 0.3.0

### Minor Changes

- 9a63d72: Sign in with the passkey account in a popup window: the app page stays, the callback comes back by message, and the exchange finishes in the page. A blocked popup falls back to the full-page redirect. Adds `deliverCenterCallback` for the app's callback page and a `connected` hook on `passkeyOption`.

## 0.2.1

### Patch Changes

- c216ef3: Name the platform's prompt on the passkey button: "Continue with Touch ID" on Mac and iPad, "Continue with Face ID" on iPhone, "Continue with Windows Hello" on Windows, and "Continue with a passkey" elsewhere. A `passkeyLabel` prop overrides it, and the `passkeyLabel()` helper is exported.

## 0.2.0

### Minor Changes

- abad7c4: Add the connect package: a headless connect controller with a built-in Juicebox Center passkey option, a read-only wagmi connector for the passkey account on Base, a callback helper for the app's `/center/callback` page, and a themeable `JBConnectModal`.
