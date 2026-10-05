---
"@bananapus/nana-sdk-core": minor
---

Juicebox Money, revnet.money, Homerun and Sticky each wrapped a few SDK checks
where the SDK was looser or lacked an option. The SDK now applies those rules
itself, so the apps can drop their wrappers.

`@bananapus/nana-sdk-core/safe`:

- `multiSendCallsOf` reads a batch sent through MultiSendCallOnly 1.4.1, which
  Safe{Wallet} uses for a 1.4.1 Safe, and through 1.3.0's EIP-155 deployment, as
  well as through 1.3.0's canonical one. `MULTI_SEND_CALL_ONLY_DEPLOYMENTS` lists
  the three addresses, from Safe's deployment records. Decoding is unchanged:
  canonical calldata of whole CALL entries only. Batches are still built for
  `MULTI_SEND_CALL_ONLY` (1.3.0).

`@bananapus/nana-sdk-core/safe-service`:

- `SafeServiceOptions` takes a `signal`. It goes with every service request and
  ends any wait between attempts; the call then fails with the signal's reason,
  except that `fetchSafesOwnedBy` and `fetchSafeCreation` read it as nothing
  found, as they read any failed request.
- The wait before retrying a 429 is capped at 10 seconds
  (`SAFE_SERVICE_MAX_RETRY_WAIT_MS`), whatever its Retry-After asks. It had no
  cap.
- `retryRateLimited: false` hands back the first 429 instead of retrying it, for
  a server render that must not wait. Juicebox Money and revnet.money turn a 429
  into a 503 in their own `fetch` for this today.
- `listPendingSafeTransactions` no longer lists a page again after it answered
  429, since that request has had its retries.

`@bananapus/nana-sdk-core/review`:

- `submitReviewedContractWrite` refuses before the review opens when the
  connected account is not `expectedAccount`, as well as after the chain switch
  and before signing. Its default refusal is the apps' wording, "The connected
  account changed. Review again.", in place of "Connected account changed.
  Review the transaction again." Juicebox Money and Sticky can drop the `guard`
  that refused first.

`@bananapus/nana-sdk-core/review/relayr`:

- `relayrPaymentDetails` refuses a payment contract or token written in mixed
  case with a wrong EIP-55 checksum, or in upper case, as viem's strict address
  check does. Lower case and checksummed spellings pass. `relayrPaymentOptions`
  skips such an option like any other it refuses, so a later valid option on the
  same chain is offered.
- `quoteExpired(deadline, nowSeconds?)` is exported: a quote is dead once its
  deadline is 15 seconds away or less.
- `requireRelayrPaymentRetry` throws a `RelayrPaymentRetryError` whose `reason`
  says why: `invalid`, `expired`, `paid`, `running` or `unknown`. The messages
  are unchanged. A hash that is another transaction still throws
  `RelayrProofError`. A malformed request is refused before anything is read.
- `readRelayrBundle(bundleUuid, { fetch })` reads a bundle without any HTTP cache
  and refuses an answer naming another bundle. `requireRelayrBundleUnpaid(bundle)`
  throws a `RelayrPaymentRetryError` (`paid`, `running` or `unknown`) unless the
  bundle is unpaid with every call pending. An app confirms a bundle with the two
  before releasing its quote.
