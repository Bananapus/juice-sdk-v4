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
  `requireRelayrBundleUnpaid` on one more read. Anything else throws, and the
  quote holds.
- `relayrRetryOption(payments, options)`: the option a quote paid before is
  paid again with, exactly the one its latest payment used.
- `relayrPaymentAttemptOutcome(error, { sending, paid })`: `reverted`,
  `unpaid`, or null to keep the journal as it is.
- `relayrPaidQuoteOpen(payments, nowMs)` and `relayrQuotedOptions`.
- `sentRelayrPayment`, `relayrSentPaymentsSnapshot`, `MAX_RELAYR_SENT_PAYMENTS`
  (16) and `RELAYR_UUID_RE`, with the types `RelayrSentPayment` and
  `RelayrReleaseClient`.

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
