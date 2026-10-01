---
"@bananapus/nana-sdk-core": minor
---

Juicebox Money, Homerun and revnet.money each kept their own copy of the Relayr
checks that run around a relayed bundle. One copy now ships on a new entry
point, `@bananapus/nana-sdk-core/review/relayr`, with the stricter check where
the copies differed. Nothing in it signs or sends:

- Constants: `RELAYR_API`, `RELAYR_PAYMENT_ADDRESS`, `RELAYR_PAYMENT_SELECTOR`,
  `RELAYR_PAYMENT_CODE_HASH`, `RELAYR_NATIVE_TOKEN`, `RELAYR_PAYMENT_GAS`,
  `RELAYR_FORWARDER_DEADLINE_SECONDS`, `TRUSTED_FORWARDER_ABI` and
  `FORWARD_REQUEST_TYPES`.
- Network families: `relayrSupportsChain`, `relayrSupportsChains` and
  `relayrPaymentChains`. A bundle is funded only within its destinations'
  family, mainnets or testnets.
- Quotes: `relayrBundleRequest` builds the posted body, with virtual nonces
  counted per chain (`ChainIndependent`). `bindRelayrQuote` authenticates
  Relayr's response. It accepts `tx_uuids` or the legacy `txn_uuids`, refuses
  both when they differ, and binds each posted transaction to the one quoted ID
  whose record carries its exact request: chain, target, calldata, value and
  virtual nonce. Relayr lists IDs out of request order, so an ID is never bound
  by its position. The bundle is read when the quote leaves its records out,
  and its records must be exactly the quoted IDs, one each.
- Payments: `relayrPaymentDetails` takes the destinations and refuses a payment
  chain outside their family, a contract or token other than Relayr's, and
  calldata other than a payment for this bundle with the quoted deadline. A
  quoted deadline is integer seconds or an RFC 3339 time with an offset, never
  a time read in the local timezone. Also `relayrPaymentOptions`,
  `requireRelayrPaymentRuntime` (the payment contract's code hash) and
  `simulateRelayrPayment` (a raw, gas-bounded `eth_call`).
- Status: `relayrStateIsSuccess`, `relayrStateIsFailed`, `relayrProgress`,
  `relayrDestinationHash` and `relayrRecordChain`. Only `failed` is a failure;
  receipts are the proof.
- Proofs: `verifyRelayrPayment`, `verifyRelayrDestination`,
  `verifyRelayrDestinations` and `relayrForwardRequest`, with any viem
  `PublicClient` (`RelayrProofClient`). A payment or destination is proven
  from the chain: the transaction at its hash is exactly the expected one (its
  sender for a payment, target, calldata, value and chain), its receipt is in
  the canonical block, and it succeeded. A saved payment may carry its amount
  as the decimal string JSON restores. `RelayrProofError` reports a
  transaction that is not the expected one: never pay again. Its subclasses
  report a canonical revert: `RelayrDestinationRevertedError` for a
  destination, and `RelayrPaymentRevertedError` for a payment, which shows
  only that this one transaction paid nothing. Any other error means the proof
  is not available yet. RPC failures are reported with a fixed message; the
  RPC error stays in a non-enumerable `cause`, so neither the message nor a
  serialized error carries the RPC URL.
- Retrying a payment: `requireRelayrPaymentRetry` takes every payment hash the
  session sent for the quote. It clears the quote to be paid once more only when
  all of the following hold; an empty list never clears it:
  - every one of those payments canonically reverted;
  - the quote's deadline is more than 15 seconds away;
  - Relayr's bundle, read without any HTTP cache, reports
    `payment_received: false`;
  - every record of the bundle is still pending, with no destination hash.

  The payment contract keeps no state and Relayr keeps every payment it
  receives, so a revert alone never shows that the bundle is unpaid. Every
  Relayr bundle read in the module skips the HTTP cache.
