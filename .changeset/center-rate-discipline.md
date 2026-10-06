---
"@bananapus/nana-sdk-core": minor
---

JB Center's node-lag retry and its rate limit now live in
`@bananapus/nana-sdk-core/jbcenter`, so Juicebox Money, revnet.money, Homerun
and Sticky can drop their copies.

- `createJBCenterRpcProvider` and `rpcProvider` ask again for a read that a
  node behind the head answered with JSON-RPC -32001, after 250, 500, 1,000,
  2,000 and 2,000 ms (`JBCENTER_BLOCK_LAG_RETRY_DELAYS_MS`).
  `blockLagRetryDelaysMs` sets other waits, and `[]` turns the retry off.
  Nothing else is retried, and `rpc` stays one request. The request options
  viem passes, `signal` included, go with every try. A wait between tries
  ends at once with the signal's reason, and a request whose signal has
  aborted sends nothing. The provider used to hand back the first -32001.
- `createJBCenterLimiter({ slots })` keeps a page within Center's rate limit:
  600 requests a minute per origin, every chain's together, refused ones
  counted. At most `slots` requests are in flight, in the order they were made,
  and `slots` has no default. After a 429 that says how long to wait, nothing
  starts until that has passed, a minute at most
  (`JBCENTER_MAX_RATE_LIMIT_PAUSE_MS`). A request whose signal aborts while it
  waits leaves the line unsent, and a slot frees exactly once however a
  request ends. Give the limiter to every chain's provider (`limiter`), where
  each try takes its own slot so a node-lag wait holds none, and wrap any
  other transport to Center with `limiter.transport`. Never both for the same
  requests. Nothing changes for an app that passes no limiter.
- `failures`, `isRateLimited` and `retryAfterOf` (and the `Failure` type) read
  a refusal through the errors viem wraps around it. `retryAfterOf` gives the
  first `retryAfter` in the chain, in seconds, and otherwise reads the
  Retry-After header viem's HTTP error carries, rounded up to whole seconds.
- `ensureDeployed` ends at once when a step report aborts its signal, where it
  waited a poll interval and asked Center again first. A `pollMs` longer than
  a timer holds (about 24.8 days) waits that long instead of polling Center
  every millisecond.

What each app replaces when it upgrades:

- Juicebox Money, revnet.money and Homerun: delete `retryWhileBehindHead`,
  `isBehindHead` and `BLOCK_LAG_RETRY_DELAYS_MS` from `src/lib/jbcenter-rpc.ts`
  and hand the provider to `custom` as it is:
  `custom(createJBCenterRpcProvider(chainId, { baseUrl, fetch, timeoutMs }), { retryCount: 1 })`.
  Drop the copy in the same upgrade: kept, it wraps the SDK's retry, and a
  node behind the head is asked up to 36 times over about 40 seconds. Its
  tests go with it. To keep to the rate limit as well, create a limiter as
  Sticky does below and pass it as `limiter`.
- Sticky: delete `retryWhileBehindHead` from `src/lib/jbcenter-rpc.ts`, and
  `src/lib/center-limit.ts` and `src/lib/line.ts` with their tests. Create the
  limiter once at module level,
  `const centerLimiter = createJBCenterLimiter({ slots: 2 })`. In the browser,
  build each chain's transport as
  `custom(center.rpcProvider(chainId, { limiter: centerLimiter }), { retryCount: 1 })`,
  and wrap the fixture transport with `centerLimiter.transport(http(...))`.
  `hook-logs.ts` imports `failures`, `isRateLimited`, `retryAfterOf` and
  `Failure` from the SDK. One reading widens: where no link of a refusal
  carries `retryAfter`, the SDK's `retryAfterOf` reads the Retry-After header
  on viem's HTTP error, which Sticky's copy left unread.
