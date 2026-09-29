---
"@bananapus/nana-sdk-core": minor
---

Safe tracking works for Safe{Wallet} connected over WalletConnect:

- `waitForSafeExecutionHash` takes an optional `client` for the chain. A hash
  the chain already knows is returned as the execution, because Safe{Wallet}
  answers over WalletConnect with the execution's own hash when the owner
  executes at once. On a chain without a hosted transaction service, the
  client keeps checking until it gives up.
- `isSafeWalletPeer(url)` says whether a WalletConnect peer is Safe{Wallet}.
  Apps use it to treat that connection as a Safe: the gas a dapp sends becomes
  the proposal's `safeTxGas`, and the reply is usually a Safe transaction hash.
