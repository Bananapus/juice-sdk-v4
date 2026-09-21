# @bananapus/nana-sdk-connect

## 0.5.1

### Patch Changes

- 408ad68: The framed Center sign-in delegates `publickey-credentials-create` to the frame as well, so a new user can sign up inside it.

## 0.5.0

### Minor Changes

- 81f64f7: The framed Center sign-in takes the app's theme: `JBConnectModal` answers each of the frame's size reports with its resolved `--jb-connect-*` tokens and font (`themeOf(dialog)`), which Center applies inside the frame. The modal's cancel button reads "Cancel" throughout.

## 0.4.0

### Minor Changes

- 046cc8c: `passkeyOption({ frame: true })` opens Center in a frame the app shows instead of a popup: the option asks the controller for a frame by name (`ConnectState.frameName`, `connect({ frame })`), `JBConnectModal` renders it (`allow="publickey-credentials-get"`, sized by the page inside), Center's launch form targets it, and `deliverCenterCallback` now hands a callback up to a same-origin framing page as well as to an opener. Center serves the sign-in framed only for apps its operator admits.

## 0.3.4

### Patch Changes

- 6d96d94: A stored sign-in record Center can no longer honour — a pending exchange it refuses to replay, a connection whose grant ran out, a record from an older client — is dropped and a fresh sign-in started in the same tap, instead of an error. The pending-exchange retry also runs when no `connected` hook is passed.

## 0.3.3

### Patch Changes

- 012d93d: A Center payment that expired before the chain included it no longer blocks signing in again.
- 012d93d: A sign-in whose exchange was left pending by an earlier hand-back is completed in place even when no popup is used; the customer no longer sees "Recover the pending exchange" with nothing to do about it.

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
