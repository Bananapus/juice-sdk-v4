---
"@bananapus/nana-sdk-core": minor
---

Juicebox Money decides from the chain what a Relayr session may do once its
bundle won't run as signed (rulings R104, R114 and R117). Those rules move into
`@bananapus/nana-sdk-core/review/relayr`, framework-free, so revnet.money and
Homerun take the same rules and Juicebox Money drops its copies. Behavior is
Juicebox Money's at 02278f0, with the differences listed at the end.

`@bananapus/nana-sdk-core/review/relayr`:

- `relayrRequestStates(clientFor, requests)` classifies each signed forward
  request (`{ chainId, signer, deadline, nonce? }`) at a canonical finalized
  block on its chain, read once per chain and signer: dead once the forwarder's
  nonce for its signer moved past the saved one (`mayHaveRun`), or once its
  deadline is strictly earlier than the block's timestamp (`unused` while the
  nonce still equals the saved one). Anything unknown is live: an RPC error, a
  node without the finalized tag, a block no longer canonical, a missing client,
  and a request saved without its nonce until its deadline passes.
- `relayrRequestsVerdict(states)`: any live request holds the set until the
  last live deadline; once every one is dead, whether one may have run and
  whether every nonce is unused.
- `relayrSessionOutcome(verdict, { nonces, recheck })` says what the session
  does next: `hold`, `refresh` (sign again only at the saved nonces while a
  request is live and none moved), `re-sign` (every request dead and unused,
  recheck passed), `discard` with the reason `ran`, `changed` or `expired`,
  `reorg-hold` (a finalized nonce below a saved one, `nonces` omitted or
  empty, or no requests at all), or `unchecked` (the recheck could not reach
  the chain). `nonces` must be the saved nonces of exactly the requests that
  were classified, in order. The recheck is a `() => Promise<void>` that throws
  to refuse, and runs only once every request is dead and unused. An outcome's
  `error` is never enumerable.
- `relayrRequestsDead(clientFor, requests)` is ruling R117's reservation: a
  session reserves its signers' forwarder nonces exactly while one of its
  requests is live. Requests that can't be classified (null) or none are never
  dead.
- `relayrSignedRequests(entries, nonces)` reads a session's published entries
  into those requests, with the nonces when there is one per entry, or null
  when one is not an `execute` on its chain's canonical forwarder.
- `relayrDeadlinePassed(client, deadline)` says whether a canonical finalized
  block is past a deadline, and `atCanonicalFinalizedBlock(client, read)` runs
  any read at one. `isRelayrDiscardReason` reads a stored reason back.
- Types: `RelayrFinalizedClient`, `RelayrSignedRequest`, `RelayrRequestState`,
  `RelayrRequestsVerdict`, `RelayrSessionOutcome` and `RelayrDiscardReason`.

Where it differs from Juicebox Money's copies:

- A finalized block without a bigint number and timestamp and a 32-byte hash
  is unknown, so its requests stay live. Juicebox Money still read the nonce at
  a block missing its timestamp, and took two missing hashes as equal.
- Each request's nonce is read for its own signer, the request's `from`.
  Juicebox Money read every request with the session's account, which its
  sessions always signed with.
- Entries or nonces that are not lists read as none, where Juicebox Money threw
  or read a string's characters as nonces.
- An empty set of requests is neither run nor unused, so it holds as
  `reorg-hold`, as Juicebox Money's callers held a session in which they found
  nothing to classify. An empty `nonces` list also gives `reorg-hold`, where
  Juicebox Money signed the calls again at the live forwarder nonce; it never
  saved an empty list.
- Deadlines and nonces are read as the SDK reads any untrusted number: a safe
  integer, decimal or 0x-hex digits, or a bigint. Anything else (`""`, `" "`,
  `"-1"`) leaves the request live, and `relayrDeadlinePassed` false. Juicebox
  Money's `BigInt` read an empty or blank string as 0 and `"-1"` as -1, so such
  a deadline had passed and such a nonce had moved.
