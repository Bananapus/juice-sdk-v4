---
"@bananapus/nana-sdk-core": minor
---

Juicebox Money, revnet.money and Homerun each decide when a Relayr quote whose
payment reverted is funded by another payment, payable again or released, and
what a failed payment attempt leaves (ruling R104). Those rules move into
`@bananapus/nana-sdk-core/review/relayr`, so the three apps take one copy.
Behavior is Juicebox Money's at 27c40e98, with the differences listed at the
end.

`@bananapus/nana-sdk-core/review/relayr`:

- `revertedRelayrQuote(clientFor, quote, { fetch, nowMs })` reads the bundle
  once, never from a cache, and resolves `funded` (Relayr reports a payment or
  a call running or run), `payable` (the latest payment's quote is still open)
  or `released`. `quote` is the saved `bundleUuid`, `payments`, `options`,
  `destinationChainIds` and `account`. A release needs every payment sent
  proven canonically reverted, every deadline of those payments and of the
  quote's options passed at a canonical finalized block, and
  `requireRelayrBundleUnpaid` on one more read. The clock, by default, is
  read after the bundle. Anything else throws, and the quote holds.
- `relayrRetryOption(payments, options)`: the option a quote paid before is
  paid again with, exactly the one its latest payment used. An option on that
  chain with that calldata whose amount can't be read, coming first, ends the
  search refused.
- `relayrPaymentAttemptOutcome(error, { sending, paid })`: `reverted`,
  `unpaid`, or null to keep the journal as it is.
- `requireRelayrRetry(clientFor, { payments, from, bundleUuid }, options)`
  groups the payments sent for a quote by the option each used (its chain,
  calldata in any case, and amount) and runs `requireRelayrPaymentRetry`, with
  the same `fetch` and `nowSeconds` options, for each group on its chain.
  Before reading anything it refuses, as `invalid`, payments that are not a
  list, an empty list, and any list `relayrSentPaymentsSnapshot` refuses: more
  than 16 payments, or a payment that is not an object or has a missing or
  malformed field, such as `[null]`, `[{}]` or `[{ bundleUuid }]`. It refuses
  a payment of another bundle, and a chain without a client as `unknown`.
- `proveSavedRelayrPayment(clientFor, payments, account, onReverted)` proves a
  resumed session's latest payment: true once it succeeded, false while that
  can't be proven, and on a canonical revert it runs `onReverted` and throws,
  as it throws any other `RelayrProofError`.
- `relayrPaidQuoteOpen(payments, nowMs)` and `relayrQuotedOptions`.
- `sentRelayrPayment`, `relayrSentPaymentsSnapshot`, `MAX_RELAYR_SENT_PAYMENTS`
  (16) and `RELAYR_UUID_RE`, with the types `RelayrSentPayment` and
  `RelayrReleaseClient`. A saved payment's deadline must be the one its
  calldata pays until.

Juicebox Money's `relayrQuoteReleased` is not ported: it reads the device
clock, and only an account view's line still calls it.

Where it differs from Juicebox Money's copies (each difference holds the quote
rather than releasing it or paying again):

- Amounts and deadlines are read as the SDK reads any untrusted number, so a
  padded or signed string such as `" 5"` is not a number. Juicebox Money's
  `BigInt` read it. Such an option is not the one to pay again, such a quote
  is not open, and such a deadline has not passed.
- Payments or options that are not lists are refused, and the quote holds.
  Juicebox Money threw a `TypeError` there.
- A bundle ID that is not a Relayr ID is never read, so its quote is neither
  funded nor released. Juicebox Money sent it to Relayr and compared the echo.
- `requireRelayrRetry` refuses, as `invalid`, payments that are not a list, an
  empty list and any list `relayrSentPaymentsSnapshot` refuses. Juicebox
  Money's resolved for an empty list (its only caller never passed one), threw
  a `TypeError` for a non-list or a payment like `[null]` or
  `[{ bundleUuid }]`, and threw its "another bundle" error for `[{}]`. A chain
  without a client is refused as `unknown`, where Juicebox Money's client
  lookup threw its own error.
- `proveSavedRelayrPayment` reads payments that are not a list as none and
  resolves false, where Juicebox Money threw a `TypeError`.
- `relayrRetryOption` refuses when an option on the latest payment's chain,
  with its calldata, comes first with an amount that can't be read, such as
  `"100 "`. Juicebox Money returned that option and then refused to pay with
  it; the SDK refuses at once and never returns a later twin.
- A time that is not a finite number closes the quote in
  `relayrPaidQuoteOpen`, and `revertedRelayrQuote` holds with its line rather
  than throwing a `RangeError`. Juicebox Money only ever read `Date.now()`.
- A saved payment's deadline must be the deadline word of its calldata, which
  the payment's proof reads onchain: `relayrSentPaymentsSnapshot` and
  `requireRelayrRetry` refuse one that is not, and a release holds it. Juicebox
  Money released on the saved deadline alone, so a journal that saved an
  earlier deadline released before the payment's own one passed.
- `revertedRelayrQuote` holds, neither payable nor released, while any payment
  names another bundle than the quote. Juicebox Money never compared them,
  though its retry refused such a journal.
