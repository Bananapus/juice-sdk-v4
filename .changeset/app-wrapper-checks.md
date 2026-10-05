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
- A 429 is waited out and retried only when its Retry-After asks for 10 seconds
  or less (`SAFE_SERVICE_MAX_RETRY_WAIT_MS`): delay-seconds of 0 or more, or an
  HTTP-date in any of RFC 9110's three forms, read as the time left until it (a
  two-digit RFC 850 year more than 50 years ahead is the last such year past, as
  RFC 9110 reads it). Without a Retry-After it waits 1, 2 and 3 seconds. A 429 that asks for longer,
  or whose Retry-After cannot be read (words, a negative or fractional delay, a
  date that does not exist), is handed back at once, since retrying before the
  service allows works against its rate limit. It used to wait the whole
  Retry-After, and read an HTTP-date or garbage as no Retry-After.
- `retryRateLimited: false` hands back the first 429 instead of retrying it, for
  a server render that must not wait. Juicebox Money and revnet.money turn a 429
  into a 503 in their own `fetch` for this today.
- `listPendingSafeTransactions` no longer lists a page again after it answered
  429, since that request has had its retries.
- `waitForSafeExecutionHash` polls as the other service calls do: each poll
  sends the local API key and the caller's `signal`, which now also ends a poll
  in flight, and after a 429 the next poll waits the longer of the polling
  interval and the wait its Retry-After asks for. It used to poll every interval
  whatever a 429 said.

`@bananapus/nana-sdk-core/jbcenter`:

- A JB Center RPC provider (`createJBCenterRpcProvider`, `rpcProvider`) passes
  on the `signal` viem's custom transport hands it, so a request in flight ends
  when its page is left instead of holding its slot until it times out.

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
  check does. Lower case and checksummed spellings pass.
- `relayrPaymentOptions` offers no option for a chain when any of that chain's
  options has a contract or token that fails the strict address check, whether
  it comes before or after a valid one. A well-formed address that is not
  Relayr's is still refused on its own.
- `quoteExpired(deadline, nowSeconds?)` is exported: a quote is dead once its
  deadline is 15 seconds away or less.
- `requireRelayrPaymentRetry` throws a `RelayrPaymentRetryError` whose `reason`
  says why: `invalid`, `expired`, `paid`, `running` or `unknown`. The messages
  are unchanged. A hash that is another transaction still throws
  `RelayrProofError`. A malformed request is refused before anything is read.
- `readRelayrBundle(bundleUuid, { fetch })` reads a bundle without any HTTP cache
  and refuses an answer naming another bundle.
- `requireRelayrBundleUnpaid(bundleUuid, { fetch })` reads the bundle that way
  and throws a `RelayrPaymentRetryError` (`paid`, `running`, `unknown`, or
  `invalid` for a malformed bundle ID) unless Relayr reports it unpaid with
  every call pending. One call reads and checks, so an app confirms a bundle with
  it before releasing its quote. `requireRelayrPaymentRetry` ends with it.
