---
"@bananapus/nana-sdk-core": minor
---

Juicebox Money, Homerun and revnet.money each kept a copy of the review
dialog's decoders, the receipt fallback, the raw transaction preflight and the
fee return helpers. One copy of each now ships here, with revnet.money's
stricter checks where the copies differed:

- `@bananapus/nana-sdk-core/review/decode`, a new entry point for the lazily
  loaded review dialog: `describeV4UnlockData`,
  `describeUniversalRouterExecute`, `describeJBHookMetadata`,
  `describeSuckerClaim`, `describeSafeInnerCall`, `describeSafeInitializer`,
  `describePermissionsData`, `describeSplitGroups`, `functionFromCall`,
  `readableValue`, `namedValue`, `nativeValue`, `knownAddressName` and
  `reviewDescription`.
  - `functionFromCall` matches the ABI item whose selector the calldata
    carries, never a name alone.
  - `knownAddressName` names retired generations from
    `jbContractAddressHistory`: "JBRouterTerminal (previous)",
    "JBBuybackHook (current)".
  - `describeSafeInnerCall(chainId, to, data)` reads a queued Safe call with
    its target's ABI, the buyback hook, buyback registry, router registry and
    router gateway included, so a selector several contracts share (`pay`,
    `approve`) is never credited to the wrong one. USDC and unknown targets
    read as ERC-20.
  - The Uniswap decoders return null for hook data they would not show, and
    address zero reads as native ETH only where it is a currency.
  - `reviewDescription` falls back to the standing guidance when a caller's
    description is blank.
- `@bananapus/nana-sdk-core/review`: `waitForTrackedReceipt` and
  `TransactionReceiptUnavailableError`; `simulateStateChangingTransaction`, a
  raw `eth_call` that never follows CCIP-read, with gas and return data
  bounds and an optional block; `simulateCallSequence`, an ordered
  `eth_simulateV1` with a per-call fallback; and `isDefiniteWalletRejection`.
  `submitReviewedContractWrite` uses it too, so a raw EIP-1193 rejection
  (code 4001) from the wallet now clears the caller's persisted intent.
- `@bananapus/nana-sdk-core/v6/fee-buyback`: `isFeePayingCall`,
  `combineFeeResults`, `feeReviewConfirmLabel` and `feeBuybackOptions`, which
  trusts every buyback hook generation in the SDK's address tables.
