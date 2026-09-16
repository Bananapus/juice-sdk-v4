# @bananapus/nana-sdk-connect

## 0.2.1

### Patch Changes

- c216ef3: Name the platform's prompt on the passkey button: "Continue with Touch ID" on Mac and iPad, "Continue with Face ID" on iPhone, "Continue with Windows Hello" on Windows, and "Continue with a passkey" elsewhere. A `passkeyLabel` prop overrides it, and the `passkeyLabel()` helper is exported.

## 0.2.0

### Minor Changes

- abad7c4: Add the connect package: a headless connect controller with a built-in Juicebox Center passkey option, a read-only wagmi connector for the passkey account on Base, a callback helper for the app's `/center/callback` page, and a themeable `JBConnectModal`.
