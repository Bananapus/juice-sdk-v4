# juice-sdk-core

## 2.21.0

### Minor Changes

- 39773c9: JB Center's node-lag retry and its rate limit now live in
  `@bananapus/nana-sdk-core/jbcenter`, so Juicebox Money, revnet.money, Homerun,
  Sticky, Succulent and Telligence can drop their copies.
  - `createJBCenterRpcProvider` and `rpcProvider` ask again for a read that a
    node behind the head answered with JSON-RPC -32001, after 250, 500, 1,000,
    2,000 and 2,000 ms (`JBCENTER_BLOCK_LAG_RETRY_DELAYS_MS`).
    `blockLagRetryDelaysMs` sets other waits, and `[]` turns the retry off.
    Nothing else is retried, and `rpc` stays one request. The request options
    viem passes, `signal` included, go with every try. A wait between tries
    ends at once with the signal's reason, and a request whose signal has
    aborted sends nothing. The provider used to hand back the first -32001.
  - `createJBCenterLimiter({ slots })` lines up a page's requests to JB Center.
    Center counts each origin's requests, every chain's together and refused
    ones included: 600 a minute for an allowlisted first-party origin, 120 for
    any other. At most `slots` requests are in flight, in the order they were
    made, and `slots` has no default. Slots bound concurrency, not rate: two in
    flight send up to 343 a minute at a 0.35 s round trip, over 120. After a 429
    that says how long to wait, nothing starts until that has passed, a minute
    at most (`JBCENTER_MAX_RATE_LIMIT_PAUSE_MS`). A request whose signal aborts
    while it waits leaves the line unsent, and a slot frees exactly once however
    a request ends. Give the limiter to every chain's provider (`limiter`), where
    each try takes its own slot so a node-lag wait holds none, or wrap one other
    transport to Center with `limiter.transport`. A transport that already sends
    through the limiter, one built on a provider that has it or one wrapped
    twice, fails each request at once with a TypeError and sends nothing. A
    request must not ask its own limiter for another after an await, which no
    check can see. Nothing changes for an app that passes no limiter.
  - `errorChain`, `isRateLimited`, `retryAfterOf` and the `ErrorChainLink` type
    read a refusal through the errors viem wraps around it. `retryAfterOf` gives
    the first `retryAfter` in the chain, in seconds, and otherwise reads the
    Retry-After header viem's HTTP error carries, rounded up to whole seconds.
  - `ensureDeployed` ends at once when a step report aborts its signal, where it
    waited a poll interval and asked Center again first. A wait between polls
    ends at `timeoutMs` at the latest and never asks a timer for more than it
    holds (about 24.8 days): a `pollMs` longer than `timeoutMs` ran past the
    timeout, and one past the timer's limit polled Center every millisecond.
    `pollMs` must be a positive finite number and `timeoutMs` a positive number,
    `Infinity` to poll until the run lands; anything else is refused with a
    TypeError before Center is asked. A `pollMs` of NaN polled Center every
    millisecond.

  What each app replaces when it upgrades:
  - Juicebox Money, revnet.money, Homerun, Succulent and Telligence: delete
    `retryWhileBehindHead`, `isBehindHead` and `BLOCK_LAG_RETRY_DELAYS_MS` from
    `src/lib/jbcenter-rpc.ts` with their tests, and hand the provider to `custom`
    as it is, for example
    `custom(createJBCenterRpcProvider(chainId, { baseUrl, fetch, timeoutMs }), { retryCount: 1 })`.
    A copy kept after the upgrade wraps the SDK's retry, and a node behind the
    head is asked up to 36 times over about 40 seconds. An app that must take
    this version before it can drop its copy passes `blockLagRetryDelaysMs: []`
    until it does. To keep to the rate limit as well, create a limiter as Sticky
    does below and pass it as `limiter`.
  - An app that hands the provider to viem as it is, such as eth-shop, gets the
    retry with no change.
  - Sticky: delete `retryWhileBehindHead` from `src/lib/jbcenter-rpc.ts`, and
    `src/lib/center-limit.ts` with its test. `src/lib/line.ts` stays, since
    `in-turn.ts` uses it. Create the limiter once at module level,
    `const centerLimiter = createJBCenterLimiter({ slots: 2 })`. In the browser,
    build each chain's transport as
    `custom(center.rpcProvider(chainId, { limiter: centerLimiter }), { retryCount: 1 })`,
    and wrap the fixture transport with `centerLimiter.transport(http(...))`.
    `hook-logs.ts` imports `isRateLimited`, `retryAfterOf`, `errorChain` (its
    `failures`) and `ErrorChainLink` (its `Failure`) from the SDK. One reading
    widens: where no link of a refusal carries `retryAfter`, the SDK's
    `retryAfterOf` reads the Retry-After header on viem's HTTP error, which
    Sticky's copy left unread.

- ff9b8b0: `requestPersistedBendystraw` on `@bananapus/nana-sdk-core/bendystraw-operations`
  takes a `signal`. When the signal aborts, the request under way fails with the
  signal's reason and is not retried, and a signal that has already aborted sends
  nothing. A page that was left could not end a read it had started: it ran until
  it answered or timed out.
  - Sticky's `web/src/lib/bendystraw-browser.ts` exists only to pass a signal to
    this request. It can be deleted, and Sticky can call the SDK's function.
  - Juicebox Money's and Homerun's `bendystraw()` can take a `signal` option and
    pass it on, to this function in the browser and to `requestBendystraw` on the
    server.

  `resolvePersistedBendystrawRequest` is unchanged. Each of its refusals is now
  pinned by its own test here, so an app's tests of its relay need no copy of that
  table.

### Patch Changes

- 7776a1a: `waitForSafeExecutionHash` counts only a real "no such transaction" answer
  toward giving up on a chain without a Safe transaction service. It counted every
  failure of the `client`'s `getTransaction`, so a minute of RPC errors ended the
  wait with "Safe does not host a transaction service" for a hash that could be a
  real execution. An app that offers Dismiss on that error lets the user release
  and send again a call that already ran.

  Behavior change: on a chain without a service, only viem's
  `TransactionNotFoundError` counts toward the twelve looks (about a minute at the
  default interval) that end the wait. Any other failure, such as a timeout, an
  HTTP error or a node still indexing, neither counts nor starts the count over,
  and the wait keeps looking. It ends when the chain knows the hash, when twelve
  not-found answers are in, or when the `signal` aborts, so a wait without a
  `signal` lasts as long as the node cannot answer. The error is matched by its
  name, so it counts when the app's viem and the SDK's are different installs.

  The `signal` now also ends the wait while a chain look is in flight, on any
  chain. It waited for that look to settle, which over a transport with no
  timeout is never. The look's late answer is ignored.

  On a chain with a Safe service, a failed chain check still leaves the decision to
  the service. A `client` whose `getTransaction` reports a missing transaction
  another way, such as a test double that throws a plain
  `Error("Transaction not found")`, no longer ends the wait. Make it throw viem's
  `TransactionNotFoundError`.

## 2.20.0

### Minor Changes

- 3818bbb: Juicebox Money, revnet.money, Homerun and Sticky each wrapped a few SDK checks
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
    RFC 9110 reads it). Without a Retry-After it waits 1, 2 and 3 seconds. A 429
    that asks for longer, or whose Retry-After cannot be read (words, a negative or
    fractional delay, an out-of-range date), is handed back at once, since
    retrying before the service allows works against its rate limit. It used to
    wait the whole Retry-After, and read an HTTP-date or garbage as no
    Retry-After.
  - `retryRateLimited: false` hands back the first 429 instead of retrying it, for
    a server render that must not wait. Juicebox Money and revnet.money turn a 429
    into a 503 in their own `fetch` for this today.
  - `listPendingSafeTransactions` no longer lists a page again after it answered
    429, since that request has had its retries.
  - `waitForSafeExecutionHash` polls as the other service calls do: each poll
    sends the local API key and the caller's `signal`, which now also ends a poll
    in flight, and after a 429 the next poll waits the longer of the polling
    interval and the wait its Retry-After asks for, up to the longest a timer
    holds (about 24.8 days; a longer timer fires at once). It used to poll every
    interval whatever a 429 said.

  `@bananapus/nana-sdk-core/jbcenter`:
  - A JB Center RPC provider (`createJBCenterRpcProvider`, `rpcProvider`) passes
    on the `signal` viem's custom transport hands it, so a request in flight ends
    when its page is left instead of holding its slot until it times out.
  - `JBCenterRequestError.retryAfter` reads the Retry-After header as the Safe
    service does, in whole seconds: delay-seconds, or the time left until an
    HTTP-date. A value it cannot read is undefined. It read an empty value as 0,
    "1e3" as 1000 and "1.5" as 1.5, and an HTTP-date as undefined.

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

- 9aad34d: `verifyReservedDistributionReceipt` accepts a distribution of at least the
  reviewed token count. Reserved tokens keep accruing until the distribution
  runs, so a Safe that executes days after the review distributes more than was
  reviewed. That receipt verifies: each split's share, the owner's leftover and
  the burns sent to `0x…dEaD` are checked against the count the receipt
  distributed. A receipt that distributed fewer tokens than were reviewed is
  refused, because another distribution ran first or the review was stale.

  It returns `{ tokenCount }`, the count the receipt distributed, so an app can
  show the amount that went out. `ExpectedReservedReceipt.tokenCount` keeps its
  shape and is the reviewed minimum: pass the pending reserves the review saw. A
  `tokenCount` of 0 is refused as an invalid expectation, since the controller
  cannot distribute 0 and a minimum of 0 would accept any count.
  `verifyPayoutReceipt` is unchanged.

## 2.19.0

### Minor Changes

- 8699565: Add read-only, block-pinned, JSON-safe deployment diagnostics for canonical Revnets, omnichain/direct 721 hooks, and ordinary Juicebox projects. Checks distinguish confirmed binding mismatches from unavailable reads and unsupported custom contracts, report pricing without treating unconventional precision as invalid, and optionally inspect operator powers. Add shared wording for independent indexer evidence and runnable read-only inspection/preparation examples.

  Add shared `resolve721PricingContext`, `buildRevnet721Config`, optional Revnet `default721Config`, and deployment overload selection. Omitted shop configuration retains the existing contract-default behavior; no new acknowledgement is required. Explicit pricing and permission choices are preserved. Validate unsupported precision and conflicting configuration, and reject allowed posts when no explicit shop config can encode them. Omnichain ruleset queue semantics remain unchanged.

## 2.18.0

### Minor Changes

- 5596359: Juicebox Money, Homerun and revnet.money each kept their own checks around a
  project's Safe and its distributions. One copy now ships in the SDK, with the
  stricter check where the copies differed. Nothing in it signs or sends.

  `@bananapus/nana-sdk-core/safe` (authority identity):
  - `readAuthorityIdentity` classifies an address as `eoa`, `delegated-eoa`,
    `contract` or `safe`, with `{ blockNumber }` to pin every read. An exact
    EIP-7702 designator is a `delegated-eoa`, never a Safe. A Safe needs a
    recognized proxy runtime, a slot zero naming a recognized singleton with
    code (`RECOGNIZED_SAFE_RELEASES`: Safe and SafeL2, canonical and EIP-155,
    1.3.0 and 1.4.1), a `masterCopy()` that agrees, its release's exact version,
    1 to 50 unique nonzero owners, a threshold within them, clean guard and
    fallback slots, and a fallback handler that is contract code. Nothing calls
    through the proxy before its singleton is known; every call is a raw, gas-
    and return-bounded `eth_call` whose answer must be exactly canonical. An RPC
    failure is `null`.
  - `proveSafeCreation` proves how a Safe was made from its creation record:
    - a recognized release's factory and singleton;
    - the exact canonical `setup`, with no delegatecall hook but SafeToL2Setup
      and no payment;
    - the CREATE2 address is the Safe.

    Matching owners and code on two chains is only the visible policy. A setup
    hook can plant an owner or module no getter shows, and a 1.3.0 Safe made with
    `createProxy` can be claimed at its address on another chain.
    `readMatchingAuthorityIdentities` and `readCrossChainHandleAuthority` take the
    record (`creation`). Without a valid proof, Safes never match
    (`creationUnproven`) and a handle is `unproven-creation`.

  - `authorityIdentitiesMatch`, `readMatchingAuthorityIdentities`,
    `readCrossChainHandleAuthority`, `isDeployableSafeAuthority`,
    `safeSingletonsAreEquivalent`, `isEip7702DelegatedEoaRuntime`,
    `isRecognizedSafeDeployment`, `readBoundedSafeNonce` and
    `readBoundedSafeApprovedHash`.
  - Same-address deployment: `validateSafeCreationForCurrentPolicy`,
    `buildSafeProxyFactoryCall` and `prepareSafeSameAddressDeployment`. The
    creation must replay today's plain policy exactly; the destination address
    must be free; the factory and singleton must carry the source chain's code
    there, the owners must be EOAs and the fallback handler the same contract;
    and a raw simulation must return the Safe's address. Each refusal is a named
    reason.
  - MultiSend: `MULTI_SEND_CALL_ONLY`, `MULTI_SEND_ABI`, `packMultiSend`,
    `encodeMultiSend`, `decodeMultiSend` (canonical calldata of whole CALL
    entries only) and `multiSendCallsOf`.
  - Also `SAFE_TO_L2_SETUP_CODE_HASH`, `SAFE_CANONICAL_PAYMENT_RECEIVER` and
    `SAFE_L1_L2_SINGLETON_PAIRS`. The module no longer runs `getAddress` or
    `parseAbi` when it loads.

  `@bananapus/nana-sdk-core/safe-service` (Safe transactions and the service):
  - `safeExecutionResult` reads a receipt as `success`, `failed`
    (ExecutionFailure: the nonce is spent), `reverted` or `unproven`, from the
    Safe 1.3 or the Safe 1.4 event layout. It needs exactly one event for the
    reviewed safeTxHash, or, when Safe{Wallet} executed at once and returned the
    transaction's own hash, exactly one event of the Safe. Success and failure
    carry the refund the Safe paid (`payment`); another proposal's event never
    decides this one, and a malformed event leaves it unproven.
    `requireSafeExecutionSuccess` throws for anything but success.
    `safeTransactionHasRefund` lets a queue card show or refuse a refund before
    executing.
  - `safeExecutionSignatures` places each EIP-1271 contract signature after
    every 65-byte head, at its byte offset, as Safe's `checkNSignatures` reads
    it. Signatures that cannot be well-formed never count.
  - `SAFE_TX_TYPES`, `SAFE_EXEC_ABI`, `safeTransactionMessage` (every field read
    strictly), `safeTransactionHash` and `canonicalSafeTxHash`, which refuses a
    record naming another Safe or advertising a different hash.
  - `usableSafeConfirmations`, `safeExecutionSignatures` and `safeExecutionArgs`:
    one confirmation per current owner, signatures of at least 65 bytes, in
    numeric owner order.
  - `safeProposalFor`, `safeBatchProposalFor`, `safeTransactionMatchesCall`
    (exact call and zero refund), `nextProposalNonce` and `onchainApprovalStep`.
  - `listPendingSafeTransactions` (at most 250, every row authenticated;
    no service throws rather than reading as an empty queue),
    `findPendingSafeTransaction`, `readSafeTransaction`,
    `proposeSafeTransaction`, `submitSafeConfirmation` (posted to the hash of
    the exact fields), `fetchSafesOwnedBy`, `safeCreationUrl`,
    `parseSafeCreationPayload`, `fetchSafeCreation` (the source chain's service
    only), `hasSafeService` and `safeTransactionUrl`. Service calls accept the
    app's own `fetch`, retry a 429 after its Retry-After delay, and send the
    optional `jb-safe-api-key` from local storage.
  - `waitForSafeExecutionHash` refuses a malformed proposal hash and a malformed
    execution hash from the service.
  - Listed rows come back normalized: the nonce as a number, the Safe and the
    checked hash. Executed rows are dropped. A row without an advertised hash,
    with more than 100 confirmations, or in a page over 50 rows is refused. A
    null `gasToken` or `refundReceiver` (as the service stores an omitted one)
    reads as the zero address. `fetchSafesOwnedBy` reads at most 200 Safes per
    chain.

  `@bananapus/nana-sdk-core/v6`: `verifyPayoutReceipt` and
  `verifyReservedDistributionReceipt` prove a distribution from its receipt: no
  recipient failure, exactly one completion event from the reviewed sender in
  the reviewed ruleset and cycle, to the reviewed owner, for the reviewed
  amounts, and every reviewed split's exact share in order. A payout split's net
  is its gross, or its gross less the 2.5% fee, and only its gross when marked
  feeless. Reserved tokens may be burned only for shares sent to `0x…dEaD`. A
  log of the reviewed contract that its ABI cannot read is refused, not skipped.

  The review decoder's eleven generated ABIs now live in modules of their own, so
  a page that imports other ABIs from the SDK no longer loads them.

## 2.17.0

### Minor Changes

- f44b312: Juicebox Money, Homerun and revnet.money each kept their own copy of the Relayr
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

## 2.16.0

### Minor Changes

- 059ee37: Juicebox Money, Homerun and revnet.money each kept a copy of the review
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

## 2.15.0

### Minor Changes

- 1c81bb7: Safe tracking works for Safe{Wallet} connected over WalletConnect:
  - `waitForSafeExecutionHash` takes an optional `client` for the chain. A hash
    the chain already knows is returned as the execution, because Safe{Wallet}
    answers over WalletConnect with the execution's own hash when the owner
    executes at once. On a chain without a hosted transaction service, the
    client keeps checking until it gives up.
  - `isSafeWalletPeer(url)` says whether a WalletConnect peer is Safe{Wallet}.
    Apps use it to treat that connection as a Safe: the gas a dapp sends becomes
    the proposal's `safeTxGas`, and the reply is usually a Safe transaction hash.

## 2.14.0

### Minor Changes

- 47e45ab: Juicebox Money, revnet.money and Homerun now share one review model through
  `@bananapus/nana-sdk-core/review`:
  - A reviewed call can carry the `gas` its wallet or forwarder signs and a Safe
    proposal's `safeTxGas`. Both appear in `transactionReviewJson`, and
    `requestContractTransactionReview` refuses to continue when either changes
    after approval.
  - `requireFundingChainSelection(options, preferredChainId)` preselects the
    connected chain when it is quoted, or a lone quote, and hands the handler that
    choice. `fundingChainLabel(chainName, amountWei)` words each option, for
    example "Base (~0.000123 ETH)".
  - `TransactionReviewCancelledError` is exported. Closing a review or the fee
    picker raises it, so apps can say nothing was sent instead of showing an
    error.
  - The audit prompt also checks `gas` and `safeTxGas`, and separates what a
    Relayr or Safe authorization signs now from its later execution.

## 2.13.0

### Minor Changes

- 4dfa326: Juicebox Money and Homerun kept identical copies of their transaction review,
  Safe tracking, Bendystraw query and fee buyback code, and revnet.money kept a
  third copy of the Bendystraw and fee buyback parts. One copy of each now ships
  here:
  - `@bananapus/nana-sdk-core/review`: the transaction review queue
    (`requireContractTransactionReview` and its handlers),
    `submitReviewedContractWrite`, and `gasWithHeadroom` / `gasWithinCap`. The
    review prompts take the app's own chain names and explorer links.
  - `@bananapus/nana-sdk-core/safe-service`: `SAFE_PREFIX`, `SAFE_SERVICE_PREFIX`,
    `safeServiceBase`, `safeQueueUrl`, `swapDeadline`, `SAFE_NONCE_GUIDANCE` and
    `waitForSafeExecutionHash`, which turns a Safe proposal into its mined
    transaction hash.
  - `@bananapus/nana-sdk-core/bendystraw-operations`: `compileBendystrawOperation`
    (operation name, bounded variables and response-shape checks from one
    document), `bendystrawOperationId`, `resolvePersistedBendystrawRequest` for a
    same-origin proxy, and `requestPersistedBendystraw`. This entry point needs
    `graphql` 16, now an optional peer dependency.
  - `resolveProjectDeployments` from the root entry point: the verified
    per-chain project IDs of a sucker group.
  - `@bananapus/nana-sdk-core/v6/fee-buyback`: `checkFeeBuyback`,
    `analyzeFeeSimulation` and `createFeeWatch`, which say whether a fee will buy
    back from the pool or mint at the issuance rate.

## 2.12.2

### Patch Changes

- 8b96068: `StickyRewardReceiverFactory` points at its replacement,
  `0x41AEC7AacEa4759F2c8AaBD68D4a4C1574A6A737` on all eight supported chains,
  pinned to `mejango/sticky` commit `b3835db805786e680f5cc27e700d7be660fdba1f`.
  The old factory was `0xF65743b76C062762D19eecb4Ab5C7a943e128720`.
  `StickyDeployer`, `StickyHook`, `StickyDistributor` and `StickyAutoStick` keep
  their addresses and ABIs.

  The new factory clones reward receivers from one implementation.
  `stickyRewardReceiverFactoryAbi` changes to match: the constructor takes
  `receiver` instead of `distributor`, and the ABI adds the `RECEIVER()` view and
  the `StickyRewardReceiverFactory_InvalidStickyToken`, `FailedDeployment` and
  `InsufficientBalance` errors.

## 2.12.1

### Patch Changes

- cc23a93: The Sticky contracts point at their ERC-2771 redeployment, pinned to
  `mejango/sticky` commit `bb5780307cce47c841d162da0577e93f31fbdb1e`, at one
  address on all eight supported chains:
  - `StickyDeployer` `0xdA38Ec48B5b1d186B02BA99F297e95153BEE33a9`
  - `StickyHook` `0xa8DcD735031cf96C4213D9A3f66a1DFFDCdba693`
  - `StickyDistributor` `0xc62b3fED668Cd8a3879ba34890a67C48a52b1Bb8`
  - `StickyRewardReceiverFactory` `0xF65743b76C062762D19eecb4Ab5C7a943e128720`
  - `StickyAutoStick` `0x9B091e21d25c424De67751F4b6Ae8494351218C5`

  `stickyDeployerAbi`, `stickyHookAbi`, `stickyDistributorAbi` and
  `stickyAutoStickAbi` add `trustedForwarder()` and
  `isTrustedForwarder(address)`, and `StickyHook`'s constructor takes a
  `trustedForwarder`. `stickyDistributorAddress` and `isStickySplit` resolve the
  new distributor.

## 2.12.0

### Minor Changes

- 8e50cb0: `@bananapus/nana-sdk-core/v6` reads and writes Sticky splits. A split pays
  Sticky holders when its `hook` is the chain's `StickyDistributor`, its
  `beneficiary` is the Sticky token, and its `projectId` is the reward group.
  - `stickyDistributorAddress(chainId)` and `isStickySplit(split, chainId)`
  - `stickyGroupId({ minWeeks, maxWeeks })` encodes a tenure group as
    `minWeeks * 1000 + maxWeeks`; `maxWeeks` 0 means no upper bound
  - `decodeStickyGroupId(groupId)` returns `{ kind: "default" }` or
    `{ kind: "tenure", minWeeks, maxWeeks }`; an invalid ID decodes as the
    default group, which is what the distributor funds
  - `validateStickyGroupId(groupId)` returns a reason or null, matching
    `StickyDistributor.isValidGroupId`
  - `describeStickySplit(split)` gives short text for confirm dialogs and
    activity rows, like "Sticky holders stuck 4 to 52 weeks"
  - `STICKY_DEFAULT_GROUP_ID`, `STICKY_CRITERIA_BASE`, `STICKY_MAX_CRITERIA_WEEKS`

## 2.11.0

### Minor Changes

- 5201c38: `jbContractAddress[6]` names the Sticky contracts on all eight supported
  chains: `StickyDeployer`, `StickyHook`, `StickyDistributor`,
  `StickyRewardReceiverFactory` and `StickyAutoStick`, each at one address on
  every chain, with their ABIs exported as `stickyDeployerAbi`, `stickyHookAbi`,
  `stickyDistributorAbi`, `stickyRewardReceiverFactoryAbi` and
  `stickyAutoStickAbi`, and the names as the `StickyContracts` enum. They are
  generated from `mejango/sticky`'s executed deployments, pinned by commit beside
  deploy-all-v6.

  `decodeDeploymentCall` no longer reads `HomerunDeployer.launchFundFor`: the
  `"homerun-fund"` flavor is gone from `JBCenterDecodedLaunch`, and a FUND launch
  now decodes as `"unknown"`. Homerun decodes its own launches in its own app.

## 2.10.0

### Minor Changes

- 8856b17: `@bananapus/nana-sdk-core/jbcenter` deploys an intent one chosen chain at a
  time, whoever pays for each. `sponsorableChains` and `unsponsoredChains` split
  a chain list per chain; `isSponsorable` still means every chain.
  `requestDeploy(id, { chainIds })` asks JB Center's sponsor for a subset.
  `requestRelay(id, chainId)` reads the forward request Center's sponsor signed
  for a chain it does not sponsor, validated field by field and returned with
  wei and gas as `bigint`, alongside the setup calls that go first.
  `ensureDeployed` takes `chainIds` to limit the run and `relayPaid` to send the
  chains Center does not sponsor from the caller's own wallet: it fetches each
  request, hands it to `relayPaid`, records the deployment it returns, and polls
  with the sponsored chains. The forwarder keeps Center's sponsor as the sender,
  so relay-paid chains pair with sponsored ones. `selfPaid` is unchanged and is
  now documented as the option that breaks that pairing for a deployer whose
  salt is scoped to the sender. `JBCenterDeployment` gains `forwarded`, which
  says whether Center's forwarder carried that launch; `ensureDeployed` reads it
  to decide whether the sponsor may still take the run's remaining chains. This
  package still sends no transaction.

## 2.9.0

### Minor Changes

- 189d418: `@bananapus/nana-sdk-core/jbcenter` reads intents whose chains set up their
  Safes before they launch. An intent's `deploymentCalls` may now carry one to
  four calls per chain: the last call for a chain is its launch, and every call
  before it creates a Safe through the canonical Safe 1.4.1 proxy factory. One
  call per chain is unchanged, so every published intent stays valid.
  `decodeDeploymentCall` gains a `safe-create` flavor carrying the singleton,
  salt nonce, owners, threshold, fallback handler and the address the factory
  would compute — predicted from the newly pinned
  `SAFE_PROXY_CREATION_CODE` in `@bananapus/nana-sdk-core/safe`, with no chain
  read. `intentCalls(intent)` returns each chain's setup calls and its launch,
  decoded, so a client renders both without repeating the rule. `intentRow`,
  `mergeSearch`, `ensureDeployed` and `publishSignedIntent` are unchanged.

## 2.8.0

### Minor Changes

- 87d75d2: `@bananapus/nana-sdk-core/jbcenter` now carries the parts every intent client
  was rebuilding: `publishSignedIntent` prepares an intent, signs JB Center's
  message only once the prepared envelope carries the same values as the one
  built locally and the message is Center's whole signing message for that
  content hash — throwing `JBCenterIntentMismatchError` otherwise — and publishes it
  with the caller's own signer; `describeCenterRefusal` turns a sponsorship refusal into one fixed
  sentence per `sponsor_quota`, `sponsor_budget`, `unavailable`, and a bare 429
  or 503, and `null` for anything else, so no provider text reaches a reader;
  `decodeDeploymentCall` reads `HomerunDeployer.launchFundFor`, at Homerun's own
  deployer address on each chain it is deployed to, back as a `"homerun-fund"`
  launch with its owner, project uri, token name, ticker, target, start, salt,
  and peer sucker deployers; and `searchIntents` filters by `owner` and by
  `publisher`. Those two filters need a JB Center deployment that supports them:
  Center main after its intents-docs pull request.

## 2.7.0

### Minor Changes

- 678c1ae: `@bananapus/nana-sdk-core/jbcenter` now carries the whole project-intent
  surface: `decodeDeploymentCall` reads a frozen `{ chainId, to, data }` call
  back as a v6 project, 721, omnichain, or revnet launch; `mergeSearch`,
  `intentRow`, `intentPath`, `deployedChains`, and `isFullyDeployed` merge
  undeployed intents into a list of deployed projects and route them; and
  `ensureDeployed` is the pre-step a client runs before an intent's first
  on-chain write, picking exactly one sender per intent — JB Center's sponsor,
  polled to completion, or the caller's own `selfPaid` launch pipeline recorded
  back to Center — and never mixing the two.

## 2.6.0

### Minor Changes

- 8753bc5: Add the framework-independent `/safe` entry point for ordinary Safe 1.4.1
  multisigs. Resolve existing addresses or prepare deterministic Safe deployments,
  verify canonical deployments and their owner policies, and compose deployment
  calls with compatible project launches without signing or submitting transactions.

## 2.5.1

### Patch Changes

- 9866b3d: Allow the read-only `eth_simulateV1` method through the JB Center client and EIP-1193 provider so applications can inspect full-transaction simulation logs, including buyback fee fallbacks.

## 2.5.0

### Minor Changes

- 04fef83: Export the deployed router gateway and ratio-feed ABIs, per-chain rollout addresses, historical hook/router generations, and effective project router resolution. Encode the buyback hook's three-word pay quote and preserve cash-out routing for projects still using the previous hook. Include the executed production rollout from deployment records while preserving historical project routes and chain-specific absences.

## 2.4.1

### Patch Changes

- a6e20d1: `projectIdFromLaunchLogs` / `decodeLaunchProjectId` now recognise projects launched through a deployer. `JBOmnichainDeployer` creates the project via `JBProjects.createFor` and then calls `launchRulesetsFor`, so the controller emits `LaunchRulesets` rather than `LaunchProject`; both are decoded from the canonical controller, and `JBProjects.Create` from the canonical `JBProjects` is accepted as well since every launch path emits it. Previously an omnichain launch receipt decoded to `null`.

## 2.4.0

### Minor Changes

- faef1eb: `getProject721Shop` now returns the current ruleset it already read for non-revnet projects (`ruleset`, `null` for revnets) so callers stop repeating `getCurrentRuleset`, and takes `includeResolvedUri` (default `false`). Resolver URIs were always requested before, which makes `tiersOf` fail through RPC gateways on large shops; pass `includeResolvedUri: true` to restore the old behavior.

## 2.3.2

### Patch Changes

- f7e7182: Bind Juicebox Center's default fetch implementation so browser requests work.

## 2.3.1

### Patch Changes

- 5d6dac6: Use JB Center's single unversioned intent envelope format.

## 2.3.0

### Minor Changes

- 2dee99f: Support JB Center signed deployment calls, add a typed viem request helper, and remove the obsolete API-key option.

## 2.2.0

### Minor Changes

- 971785b: Add a typed Juicebox Center read-only RPC client and EIP-1193-compatible provider.

## 2.1.0

### Minor Changes

- 59dce8e: Add a typed, framework-independent JB Center client for project intents, search,
  deployment reconciliation, and redundant IPFS pinning.

## 2.0.0

### Major Changes

- 6c69949: Correct fee, permission, sucker, metadata, and price-feed behavior found by the 2026-08-07 webclient/SDK re-audit.

  **Breaking**
  - `getCashOutQuote().reclaimAmountAfterFee` is now `bigint | undefined`. The 2.5% protocol fee was applied unconditionally; the contract charges it on every non-zero-tax cash out and, when the tax is zero, only on `min(reclaim, feeFreeSurplusOf)`. Quotes now route through `cashOutProtocolFee` and return `undefined` while the inputs that decide the fee are unresolved instead of fabricating a number.
  - `REVLOANS_PERMISSION_ID` was `1` — `ROOT`. REVLoans only needs `BURN_TOKENS` (`11`). Use `REVLOANS_BURN_PERMISSION_ID`; the old name is a deprecated alias of the new value. Anything that granted the old constant handed REVLoans full operator power and should be revoked.
  - `createHookMetadata` was not byte-compatible with `JBMetadataResolver`: it threw `RangeError` on any 2+ entry composition and emitted 127 bytes where Solidity emits 96 for a one-word payload. Rewritten and pinned against bytes taken from the library itself. No in-repo caller was affected (all use payloads of two words or more).
  - `SplitGroup.ETHPayout` is removed (a payout group is `uint256(uint160(token))` and cannot be enumerated) and `SplitGroup.ReservedTokens` is `1`, not `2`. The old value read and wrote the wrong group.
  - `MAX_FEE` (root export, per-billion) is renamed `MAX_FEE_PER_BILLION` to end the 1e6× collision with `v6/fees.MAX_FEE` (`1000n`, matching `JBConstants.MAX_FEE`). `PROTOCOL_FEE_PERCENT` is folded into `STANDARD_FEE`.
  - `ipfsGatewayUrl` requires a string and returns `string | null`; it used to build `ipfs.io/ipfs/undefined`.
  - `getPrevRulesetWeight` throws a typed `RangeError` at a 100% weight cut instead of dividing by zero.
  - `DEFAULT_METADATA` (odd-nibble `"0x0"`, zero references) is removed.
  - `resolveSuckers` always includes the local `(chainId, projectId)`, dedupes on the full pair, and rejects on a registry read failure instead of silently returning a truncated group.
  - `toJbUrn` takes a version and emits `v<n>:` when it is not 4; parsing rejects non-digit project ids rather than coercing `eth:0x123` to `291n`.
  - Reading `JBContractContext` outside a provider now throws instead of silently reporting `version: 5, projectId: 0n` at the zero address.
  - OP Sepolia's `etherscanHostname` is now `optimism-sepolia.blockscout.com`. Explorer hostnames are derived from each chain definition, so the hand-maintained copy (which shipped a DNS-dead `optimism.etherscan.io` for OP mainnet) is gone.

  **Fixed**
  - `getSuckerPairs` reads the peer project id from the registry-recorded remote sucker and validates pair symmetry, so pairs whose suckers sit at different addresses resolve instead of rejecting the whole batch. `peer()` is typed `bytes32`.
  - All three remote-sucker readers validate through `suckerBytes32ToAddress`; a cleared or non-EVM remote fails closed instead of truncating to a plausible wrong address.
  - `get721MetadataIdTarget` and the `STORE()` probe fall back only on a proven contract revert and rethrow transport errors. A flaky RPC used to return the clone address, which hooks silently ignore — the shopper paid and received no NFT.
  - `getProjectMetadata` keeps path-style IPFS URIs (`ipfs://<cid>/metadata.json`) instead of fetching `ipfs.io/ipfs/metadata.json`.
  - Bendystraw's internal 15s timeout aborts with a distinct reason and is retried; it used to surface as a bare `AbortError` indistinguishable from a caller cancel, turning known indexer spikes into first-attempt failures.
  - `createSalt` uses `crypto.getRandomValues`. It used `Math.random`, giving ~52 bits right-padded into the high bytes of salts that seed deterministic omnichain sucker and ERC-20 addresses.
  - `useSuckersCashOutQuote` values tokens against aggregate sucker-group surplus and supply through the cash-out tax curve. It quoted the full amount on every chain and summed the results, inflating an omnichain quote by up to N×. Failed and pending quotes surface as `undefined` rather than `0`.
  - React contexts no longer read at `zeroAddress` when the controller is unresolved (`staleTime: Infinity` cached that failure permanently), no longer publish `isLoading: false, data: undefined` while an upstream read is in flight, and no longer resolve a pending data hook to the omnichain deployer — a pay in that window reverted and minted no NFTs.
  - `getJBContractAddress` no longer throws from a render body; `useNativeTokenSurplus`/`useNativeTokenSymbol` no longer call `useJBChainId()` conditionally (a changing `chainId` crashed React); `JBPrimaryNativeTerminalProvider` no longer remounts its subtree when the terminal resolves.
  - Query keys carry `chainId`, `version`, and `userAddress` where they were missing, ending cross-chain and cross-account cache bleed; `usePublicClient({ chainId })` no longer reads the wallet's chain.
  - Bendystraw URLs are built from `JB_CHAINS`, so a new production chain is no longer routed to the testnet host, and the empty-key `//graphql` double slash is gone.
  - `"use client"` is declared at the package entry and injected into every emitted chunk. `tsup` was stripping every directive, so App Router consumers could not mark a client boundary at all.

  **Added**
  - `requiredFeedPairs` and `probeFeedReachability` (`/v6`) report whether JBPrices can serve every conversion a project's accounting contexts will need — context↔base for pays and context↔context for cash outs. A missing feed is reported only on a proven revert; RPC failures report `unavailable` rather than being mistaken for a missing feed. Clients use this to block launches whose token combination has no price path.
  - `suckerAccountingContextKey` (`/v6`) replaces three divergent client copies, one of which threw on a chain with no USDC deployment.
  - `REV_METADATA_ALLOW_SUCKER_DEPLOYMENT` is exported and set by default in `buildRevnetStageConfig`; deploying a revnet with sucker configuration but without the bit now throws. Revnets built without it can never be extended to another chain, and stages are immutable.
  - Generated ABIs for `JBUniswapV4LPSplitHook`, its deployer, and `JBP6FeeLPSplitHook`, taken from deployment artifacts so the exported shape matches deployed bytecode.
  - The 4-argument `currentReclaimableSurplusOf` overload is restored to `jbTerminalStoreAbi`; a codegen filter dropped it even though it is live on chain, which is why consumers hand-wrote the fragment.
  - A `./chains` subpath export, so consumers stop importing the `viem/chains` barrel.

## 1.11.1

### Patch Changes

- 5580e71: Add V6 721 ruleset metadata helpers which encode and decode transfer and reserve-mint pauses while preserving unrelated hook metadata bits.

## 1.11.0

### Minor Changes

- 4efed1c: Add Uniswap V4 LP fee reads and a fee-collect transaction builder.

  `readUniswapV4PositionFees` reports a position's unclaimed fees through the
  canonical StateView lens (now in `UNISWAP_V4_STATE_VIEW_ADDRESSES` and
  `uniswapV4Deployment`), and `buildCollectUniswapV4FeesTx` encodes the
  zero-liquidity decrease that sweeps them without touching the position.
  `uniswapV4FeesOwed` and `uniswapV4PositionId` expose the underlying math.

## 1.10.1

### Patch Changes

- 6498fce: Add narrow v6 payment, Permit2, loan math, cash-out, Uniswap V4, and Uniswap deployment entry points and mark the core package as side-effect free so browser bundlers can exclude unrelated SDK modules. Pure loan arithmetic no longer imports transaction-builder ABIs.

## 1.10.0

### Minor Changes

- 55ddb17: Add reusable four-mainnet cross-currency direct-pay routing, Permit2 signature and allowance helpers, and contract-exact loan opening proceeds.

## 1.9.4

### Patch Changes

- 20dddb5: Correct buyback cash-out slippage routing; add best-execution selection across direct pool sales and terminal cash-outs, locked transaction preparation, and typed diagnostics; and normalize Uniswap V4 tick and price ranges across currency orderings.

## 1.9.3

### Patch Changes

- cf64c43: Harden contract deployment lookup and Bendystraw operation handling while removing unused generated GraphQL and runtime surface.

## 1.9.2

### Patch Changes

- 132bd4b: Preserve literal chain ID types when reading supported chain metadata from `JB_CHAINS`.

## 1.9.1

### Patch Changes

- ee80eb2: Define supported chains without importing the full viem chain barrel, keeping browser builds deterministic and warning-free.

## 1.9.0

### Minor Changes

- 616afa3: Add fail-closed Bendystraw network selection, canonical endpoint helpers,
  operation-level runtime validation, and shared cache-policy constants.

## 1.8.0

### Minor Changes

- 432b5f7: Add bounded Bendystraw requests, exact versioned project-reference filters,
  and 200-reference query batching, and use the shared transport in the React
  Bendystraw hook.

## 1.7.0

### Minor Changes

- 068abea: Add a framework-agnostic Largest-Triangle-Three-Buckets time-series downsampler for complete chart histories.

## 1.6.1

### Patch Changes

- f5aa499: Fix cash-out routing selecting the wrong hook specification as the buyback route: `resolveCashOutRoute` matched "the buyback spec" as the first specification with non-empty metadata, so a spec from any other data hook (e.g. a 721 tiers hook) whose metadata happened to decode could be routed as a pool sell with a zero terminal minimum and a floor keyed to the wrong hook. The buyback spec is now matched by hook address (case-insensitive) via the new optional `buybackHookAddress` argument on `resolveCashOutRoute` and `getHookAwareCashOutQuote`. `getHookAwareCashOutQuote` resolves it automatically from `chainId` (the chain's canonical `JBBuybackHook`) — pass it explicitly only for a project whose `JBBuybackHookRegistry` entry points at a custom hook. Callers using `resolveCashOutRoute` directly must now pass `buybackHookAddress` to get the AMM route; without it every specification is treated as non-buyback and the deterministic treasury route (with its real `minTokensReclaimed` floor) is returned — fail-safe, never a zero-minimum guess.

## 1.6.0

### Minor Changes

- de6f66d: Add hook-aware cash-out quoting and slippage-protected routing: `getHookAwareCashOutQuote` / `resolveCashOutRoute` quote through `JBMultiTerminal.previewCashOutFrom` (the exact, data-hook-inclusive path) and return the `minTokensReclaimed`/`metadata` pair to submit — terminal minimum on the treasury route, buyback `cashOut` metadata floor (terminal minimum zero) on the AMM route. Also adds `slippageFloor`, exact `/40` `cashOutProtocolFee` (including the zero-tax fee-free-surplus and feeless branches), `buildBuybackCashOutMetadata`, `decodeBuybackCashOutSpec`, and `DEFAULT_CASH_OUT_SLIPPAGE_BPS` (1%). Prefer these over `getCashOutQuote` for building transactions: `currentReclaimableSurplusOf` skips the data hook, so an exact minimum derived from it reverts with `JBMultiTerminal_UnderMin`.

## 1.5.1

### Patch Changes

- 1ba98eb: Allow accounting contexts to opt into a shared ETH or USD currency for protocol price-feed conversion, while preserving token-keyed currencies by default.

## 1.5.0

### Minor Changes

- 9793326: Add typed Uniswap V4 direct-swap quoting and transaction builders, Permit2 authorization, and guaranteed-best payment route selection.

## 1.4.1

### Patch Changes

- d4dd71e: Calculate cash-out quotes against the full outstanding supply, including pending
  reserved tokens, before applying the full-supply shortcut. This matches
  `JBCashOuts.cashOutFrom` and prevents overstating reclaimable surplus. Reject
  negative, fractional, or out-of-range inputs—including a combined supply which
  would overflow `uint256`—instead of returning an impossible quote.

## 1.4.0

### Minor Changes

- 997d0ad: Add shared web-client primitives for verified sucker movements and proofs,
  IPFS and 721 tier metadata, permission bitmaps, launch and project-payer
  receipts, ruleset issuance projections, and Uniswap V4 deployments and math.

## 1.3.0

### Minor Changes

- ef9f7e2: Add v6 JB721 "shop" helpers and fix a silent-mint footgun in `build721PayMetadata`.
  - `getProject721Shop(client, { chainId, projectId, isRevnet })` resolves a project's 721 tiers hook, its store, the metadata id target, the pricing context, and its tiers in one call (revnet and custom/omnichain hook resolution; returns `null` for projects with no shop, throws on RPC failure). Plus `get721MetadataIdTarget`, `effectiveTierPrice`, and `DISCOUNT_DENOMINATOR`.
  - `build721CashOutMetadata({ metadataIdTarget, tokenIds })` builds the cash-out (NFT redeem) metadata — the mirror of `build721PayMetadata` — reusing the shared metadata packer.
  - `build721PayMetadata` now takes `metadataIdTarget` (the hook's `METADATA_ID_TARGET` — the shared _implementation_ address). `hookAddress` is kept as a deprecated alias. Passing a project's clone hook address as the target produces an id the hook never matches, so the payment silently mints ZERO NFTs; the new param name plus `get721MetadataIdTarget` make the correct target explicit. The metadata id formula is unchanged, so existing correct callers are unaffected.

## 1.2.0

### Minor Changes

- 91c2361: v6 sucker deployment can now use native bridges alongside CCIP. `parseSuckerDeployerConfig` and `buildOmnichainLaunchProjectTx` take a `bridge` option: `"ccip"` (default, unchanged), `"native"` (OP/Base/Arbitrum standard-bridge suckers — Ethereum<->L2 pairs only), or `"both"` (one native AND one CCIP sucker per pair for redundancy; L2<->L2 pairs fall back to CCIP alone). Native-bridge deployer addresses ship as `NATIVE_SUCKER_DEPLOYER_ADDRESSES` / `jbNativeSuckerDeployerAddress`.

  Safety: native suckers only receive native-token mappings. Standard bridges deliver bridge-wrapped USDC.e — never canonical USDC — so a canonical-USDC mapping over a native bridge locks funds in bridge escrow (OP/Base) or strands them on the remote sucker (Arbitrum), and neither the sucker contracts nor the registry allowlist prevent it. `"native"` + USDC throws; `"both"` + USDC keeps the USDC mapping on the CCIP sucker only.

## 1.1.1

### Patch Changes

- b952234: Review fixes for the v6 action layer: `buildDeployRevnetTx` no longer attaches the creation fee when initializing an EXISTING project as a revnet (the deployer reverts on any value in that case; `creationFee` is now optional and only required for new revnets). `fillSplitPercents` throws when input drift exceeds rounding error instead of silently rewriting un-normalized groups. The package's `require` conditions now serve real CommonJS output (previously ESM was emitted into `dist/cjs`, breaking `require()` consumers). Docs: USDC-accounting caveat on `getCashOutQuote`, README example fix.

## 1.1.0

### Minor Changes

- ce5bf16: Add a complete framework-agnostic V6 action layer under the `@bananapus/nana-sdk-core/v6` subpath: pure tx-request builders (viem/wagmi-compatible, no React) and `PublicClient` reads covering launches (single + omnichain with creation fees and sucker configs), revnet deploys (REVDeployer/REVOwner), rulesets, splits (exact-remainder percent math), terminal resolution (router registry aware), pay + previews + 721 pay metadata, cash-outs + quotes, tokens/credits, permissions, cross-chain sucker bridging, and REVLoans.

## 3.0.0

### Major Changes

- 9d130e7: Add Juicebox V6 support.
  - `JBVersion` is now `4 | 5 | 6`; `jbContractAddress` has a `6` key and `/v6:` URNs parse.
  - BREAKING: unsuffixed ABI exports (`jbControllerAbi`, `revDeployerAbi`, etc.) are now the V6 ABIs. Older-version ABIs that drifted are exported with a version suffix (e.g. `jbControllerV5Abi`, `revLoansV4Abi`) — use those when reading v4/v5 contracts where the interface changed.
  - BREAKING: `CCIP_SUCKER_DEPLOYER_ADDRESSES` is now keyed by version (`5` and `6`) before the chain pair; `parseSuckerDeployerConfig` takes an optional `version` in `opts` (defaults to 5, which also serves v4).
  - New V6 contracts: `JBRouterTerminal` and `JBRouterTerminalRegistry` (the swap terminal is replaced by the router terminal in V6). The V6 `ERC2771Forwarder` address is injected at codegen (same address on every chain).
  - `useNativeTokenSurplus`, `useSuckersNativeTokenSurplus`, and `useResolveDataHook` branch per version where V6 renamed functions (`currentSurplusOf` takes token addresses; the omnichain deployer's `dataHookOf` split into `tiered721HookOf`/`extraDataHookOf`).

## 2.1.2

### Patch Changes

- Add address & ABI for JBSwapTerminalUSDCRegistry contract

## 2.1.1

### Patch Changes

- Add JBDeadline contracts

## 2.1.0

### Minor Changes

- Add Bendystraw client instead of using juicebox API

## 2.0.0

### Major Changes

- Add support for v5 contracts, remove auto-generated hooks & actions

## 1.10.0

### Minor Changes

- 1a17ec9: Added `JBSwapTerminal1_1`
- e73a095: Fix error with invalid primary terminal address for projects with USDC context

## 1.9.0

### Minor Changes

- 7b756c8: Added support for USDC suckers

## 1.8.9

### Patch Changes

- aaf50d0: Remove beta tags and mark packages as stable

  This release removes the `-beta` suffix from all package versions, marking them as stable releases. No breaking changes are included in this update.
