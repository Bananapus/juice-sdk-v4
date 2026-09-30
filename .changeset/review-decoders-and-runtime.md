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
  `reviewDescription`. The decoded view never differs from the signed bytes:
  - `functionFromCall` matches the ABI item whose selector the calldata
    carries, and only when the call's `args` encode to exactly that calldata.
    A raw review whose `args` and `data` disagree shows the raw call.
  - `knownAddressName` names retired generations from
    `jbContractAddressHistory`: "JBRouterTerminal (previous)",
    "JBBuybackHook (current)".
  - `describeSafeInnerCall(chainId, to, data)` reads a queued Safe call with
    its target's ABI, the buyback hook, buyback registry, router registry and
    router gateway included, so a selector several contracts share (`pay`,
    `approve`) is never credited to the wrong one. USDC reads as ERC-20. An
    unknown target reads as ERC-20 and is titled as unrecognized, except
    `approve` and `transferFrom`, which ERC-721 shares: those show raw.
  - The Uniswap V4 and Universal Router decoders require each parameter's
    canonical encoding and empty hook data. A V4 settle shows who pays it.
    Each amount reads the way its command does: 0 is the open delta only in
    V4 swaps, takes and settles, and the contract-balance sentinel only in
    settles, wraps and V3 swaps. An unwrap minimum of 0 reads as no minimum.
  - Times show in UTC with their raw seconds, the same in every locale. A
    Permit2 expiration of 0 reads as this block only, and a value past the
    last calendar date as its raw number.
  - Address zero reads as native ETH only where it is a currency.
  - A Safe setup labels a `setupToL2` delegatecall only when it targets the
    canonical SafeToL2Setup; any other target keeps the delegatecall warning.
  - Hook metadata with a repeated lookup id shows raw, since the hook reads
    only the first entry for an id.
  - `reviewDescription` falls back to the standing guidance when a caller's
    description is blank.
- `@bananapus/nana-sdk-core/review`: `waitForTrackedReceipt` and
  `TransactionReceiptUnavailableError`, whose `cause` is not enumerable, so
  serializing it leaves out the RPC error; `simulateStateChangingTransaction`,
  a raw `eth_call` that never follows CCIP-read, with gas and return data
  bounds and an optional block; `simulateCallSequence`, an ordered
  `eth_simulateV1` that falls back to one call at a time only when the node
  reports the method missing (-32601, -32004, or its own error text saying
  so); a revert, a lagging node or bad parameters stop the simulation; and
  `isDefiniteWalletRejection`. `submitReviewedContractWrite` uses it too, so a
  raw EIP-1193 rejection (code 4001) from the wallet now clears the caller's
  persisted intent.
- `@bananapus/nana-sdk-core/v6/fee-buyback`: `isFeePayingCall`,
  `combineFeeResults`, `feeReviewConfirmLabel` and `feeBuybackOptions`, which
  trusts every buyback hook generation in the SDK's address tables.
