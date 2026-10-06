---
"@bananapus/nana-sdk-core": minor
---

JB Center's node-lag retry and its rate limit now live in
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
