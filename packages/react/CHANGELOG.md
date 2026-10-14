# juice-sdk-react

## 53.0.0

### Minor Changes

- e021cad: One held write, the same in every app.
  - Core `/review`: `createHeldWriteView` (framework-free) and `followHeldWrite`. The view gives a held write's phase (`clear`, `awaiting`, `confirming`, `held`, `settled`, `released`), its one line, its exit, its send under the hold, the watch, one shared follower per reservation, and the adoption of a previous deploy's record before any send.
    - Once a write is confirming it never goes back to awaiting.
    - A read the chain didn't check never hides an exit already shown.
    - `onSettled` fires once, only for what the view saw held.
    - A release reads as released, by the user's exit or neutrally by another window, never as a result.
    - The follower ends only on the hold's authenticated settlement or the user's exit.
  - `hold.list({ account, chainId })` lists every write held for an account, intent and exact-call alike, never a mirror. Each comes with its handle at the key it was saved under. `listReviewedWrites` is the storage read.
  - New lines: `HELD_CONFIRMING_LINE`, `HELD_RELEASED_LINE`, `HELD_RELEASED_ELSEWHERE_LINE`, `HELD_EXIT_LABEL`, `HELD_RELEASE_LABEL`, `HELD_SUCCESS_LINE` and `HELD_EXPIRED_LINE`. `hidesShownExit` and `settledLine` move into the SDK.
  - React: `useHeldWrite` binds the view. Its exit only releases, and `onReleased("user")` is where the app reopens its review. `useHeldIntents`, `useHeldWrites` (from `hold.list`) and `HeldWritesNotice` make one app-wide notice.
  - `hold.adopt` also says why it adopted nothing: `declined: "refused"` when the evidence is proven another write (a hash that isn't the call's, or a malformed one), or `declined: "unreadable"` when it couldn't check (the chain unread, a client on another chain, no client, or a lock another writer held). The view refuses its send while an adoption is unread, and adopts again on the next send.
  - A success that settled while the page was closed is phase `succeeded` ("This went through while you were away."). Every send refuses, including one whose own check finds it, until the user picks "Send it again" (`view.acknowledge()`, `sendAgainAction`). That calls the new `hold.acknowledge(settled)`, which marks the settlement `acknowledged` under the lock, keeping its result and hash for every reader. An acknowledged success blocks nothing on a later load. A tab that saw the write held still shows it as a success and fires its own `onSettled` once, never a release. A success the view saw settle live is delivered through `onSettled` and acknowledged at once. Each call key keeps one settlement, which the next reservation replaces, so nothing piles up. New copy: `HELD_AWAY_SUCCESS_LINE`, `HELD_SEND_AGAIN_LABEL`.
  - A Safe proposal is truly pending only while Safe's service returns it unexecuted. Each such read restarts its 30-minute clock (`pendingSeenAt`); a Safe nonce that still waits restarts nothing. Once 30 minutes pass since it was sent, adopted or last listed, with nothing proving it ran, it gets the warned exit (`held-unchecked`), saved nonce or not, and even when the chain's id can't be read. It stays behind the gate on pending or recently mined evidence, and still needs the user's explicit exit. An unproven end (the service can't find it) has its own warned exit, until the service lists this exact proposal unexecuted again. That listing undoes the unproven end and restarts the clock, so the checked answer removes the exit.
  - A legacy hold an intent stood for keeps its settlement through the intent's `state()`, `peek()` and `acknowledge()`. A view that saw it held shows its result, never a release, and so do its subscriptions: the intent's own empty clear never reaches a view while a legacy hold stands for it. An unacknowledged success still blocks a fresh view's sends until it is acknowledged, where it was saved.
  - An adoption read that lands after its view stopped applies and acknowledges nothing, and a StrictMode restart runs the adoption again.
  - A settlement is acknowledged only once its `onSettled` callback has run while the view is live. A delivery a stop interrupted is retried on the next start of the same controller.
  - The legacy hold an intent was seen standing for keeps its result through settlement, even if the intent reserved before (a rejected attempt). An old settlement never seen held stays unannounced. Undelivered settlements are kept per reservation, and a restart retries each.
  - On a fresh load, a legacy settlement reserved after the intent's own latest reservation is the intent's unacknowledged success, and it blocks the send until acknowledged. Reservation markers now carry their time (`latestReservedAt`), with the settlement's time (`settledAt`) as the fallback. An older settlement stays unannounced. Equal or missing times can't prove order, so they block. The same choice applies when the intent already has its own older settlement, such as a revert, and it applies in reads, events and the send guard.
  - Across several legacy keys, any eligible unacknowledged success (newer, or of unprovable order) wins over failures and acknowledged successes, the same in reads, events, acknowledgement and the send guard. `useHeldWrite` keys `legacy` calls with bigint values safely.
  - What a view shows and whether it may send are now separate. Each settlement of a reservation the view saw held is delivered once, by reservation. The send gate is a pure read over current evidence, the new `handle.unacknowledgedSuccess()`: any eligible unacknowledged success of the intent or its legacy holds. `send()` refuses on it every time, whatever is shown. `succeeded` ("Send it again") shows whenever the gate holds and nothing is left to deliver, replacing a retained settled or released result of another reservation. "Send it again" acknowledges the gate's success where it was saved.
  - The send gate looks past a success only after excluding the ones this view already told, so every other eligible success still blocks (`unacknowledgedSuccess(skip)`). It is asked again at the reservation itself, after any lock retries. A finished "Send it again" ends only that success's presentation, never a newer hold or its exit. Each reservation a view saw held is delivered once through the new `handle.settlementOf(reservation)`, even while another hold is shown.

- 42b65da: One saved-attempt recovery, the same in every app.
  - Core `/review`: `createSavedAttemptRecovery({ hold, storage?, locks? })` with `recover(attempt, client)`, `retire(attempt, reason)` and `canDiscard(attempt)`. An app describes a saved attempt by its intent namespaces (legacy ones included), what it saved (`started`, `hash`, `safeTxHash`, `safeNonce`, nonce evidence, `submittedAt`, `before`) and its `authenticate(hash)` domain check (`proven`, `not-this` or `unknown`).
  - `recover` returns exactly one of `held`, `done` (`success`, `authenticated` or not, or the hold's proven `failed`), `check` or `none`, and never throws. It needs only what was saved, so it runs before any fresh-send preparation. A missing hold record with a started send, a refused or unreadable adoption, an empty search, holds kept only in this tab and every exception are `check`. A settled success always wins: one the app's check can't show is `done` with `authenticated: false` and its hash, never a check or a send, and only `{ by: "settled" }` retires it. A check whose hold evidence moved while the app's check ran is evaluated again, and a check stays bound to the snapshot it evaluated; a success that settles while the passes run still returns `done`.
  - `retire` saves the user's exit, the user's check action or a followed settlement under every namespace's hold lock, for every tab and reload, bound to the hold evidence it saw: a later reservation or settlement is never covered. A followed success is acknowledged on the hold. It returns `{ retired: true, durable }`, where `durable: false` means that commit lasts in this tab alone (the new optional `HeldWriteStorage.durableAt(key)`, which `createHeldWriteStorage` implements, says so per key).
  - A reservation the SDK drops on a definite wallet rejection or an abort before the wallet opened is now recorded (`rejectedReservation()` on the write recovery), so its saved attempt retires on its own (`none` with `retired: "rejected"`) instead of asking for a check, across the legacy mirrors that share its reservation id.
  - Rule E: only `{ by: "settled" }` retires a success. An authenticated success is saved for every tab, so a stale check or exit elsewhere is refused. Check and exit retirements read the hold fresh and error-aware under its locks (new `assertReadable()` on the write recovery and optional `HeldWriteStorage.getItemStrict`, which `createHeldWriteStorage` implements), then await the attempt's required `confirmRetirable()` (the app's journal re-read). A proven success overrides any retirement but `settled`. `canDiscard` and the `none` decision use the same strict reads. Storage that exists but can't be read makes a retirement return `{ retired: false, reason: "unreadable" }`; only then may the app offer the warned `force: "unreadable"` exit, which retires in this tab alone. New copy: `SAVED_ATTEMPT_TAB_ONLY_LINE`, `SAVED_ATTEMPT_UNREADABLE_LINE`, `SAVED_ATTEMPT_CONTINUE_ANYWAY_LABEL`; React adds `unreadableAction`. `none` needs `saved.started === false` with no hash or nonce evidence.
  - `canDiscard` is false while the attempt is held, or while a success it settled hasn't been followed.
  - New copy: `SAVED_ATTEMPT_CHECK_LINE`, `SAVED_ATTEMPT_CHECK_WARNING` and `checkedItLabel(next)` ("I checked it. Review it again.").
  - React: `useSavedAttempt({ recovery, attempt, client, checkNext })`, with answers from the latest request of the mounted attempt only, callbacks bound to the attempt last rendered (refused from the next attempt's first layout effect on), and the one `checkAction`.

### Patch Changes

- Updated dependencies [e021cad]
- Updated dependencies [42b65da]
  - @bananapus/nana-sdk-core@2.39.0

## 52.0.0

### Patch Changes

- Updated dependencies [e90a3fc]
  - @bananapus/nana-sdk-core@2.38.0

## 51.0.0

### Patch Changes

- Updated dependencies [31c0929]
  - @bananapus/nana-sdk-core@2.37.0

## 50.0.0

### Patch Changes

- Updated dependencies [a4a5b18]
  - @bananapus/nana-sdk-core@2.36.0

## 49.0.0

### Patch Changes

- Updated dependencies [7f0aaaa]
  - @bananapus/nana-sdk-core@2.35.0

## 48.0.0

### Patch Changes

- Updated dependencies [7d3137e]
  - @bananapus/nana-sdk-core@2.34.0

## 47.0.0

### Patch Changes

- Updated dependencies [e5a36e3]
  - @bananapus/nana-sdk-core@2.33.0

## 46.0.0

### Patch Changes

- Updated dependencies [8abcff8]
  - @bananapus/nana-sdk-core@2.32.0

## 45.0.0

### Patch Changes

- Updated dependencies [8a989ad]
  - @bananapus/nana-sdk-core@2.31.0

## 44.0.0

### Patch Changes

- Updated dependencies [ecafc01]
  - @bananapus/nana-sdk-core@2.30.0

## 43.0.0

### Patch Changes

- Updated dependencies [54a588b]
  - @bananapus/nana-sdk-core@2.29.0

## 42.0.0

### Patch Changes

- Updated dependencies [b61adbc]
  - @bananapus/nana-sdk-core@2.28.0

## 41.0.0

### Patch Changes

- Updated dependencies [6a2c3da]
  - @bananapus/nana-sdk-core@2.27.0

## 40.0.0

### Patch Changes

- Updated dependencies [f46f4cc]
  - @bananapus/nana-sdk-core@2.26.0

## 39.0.0

### Patch Changes

- Updated dependencies [cabf58e]
  - @bananapus/nana-sdk-core@2.25.0

## 38.0.0

### Patch Changes

- Updated dependencies [01bbb7f]
  - @bananapus/nana-sdk-core@2.24.0

## 37.0.0

### Patch Changes

- Updated dependencies [23b33ed]
  - @bananapus/nana-sdk-core@2.23.0

## 36.0.0

### Patch Changes

- Updated dependencies [c39e6f0]
- Updated dependencies [bcfe437]
  - @bananapus/nana-sdk-core@2.22.0

## 35.0.0

### Patch Changes

- Updated dependencies [39773c9]
- Updated dependencies [ff9b8b0]
- Updated dependencies [7776a1a]
  - @bananapus/nana-sdk-core@2.21.0

## 34.0.0

### Patch Changes

- Updated dependencies [3818bbb]
- Updated dependencies [9aad34d]
  - @bananapus/nana-sdk-core@2.20.0

## 33.0.0

### Patch Changes

- Updated dependencies [8699565]
  - @bananapus/nana-sdk-core@2.19.0

## 32.0.0

### Patch Changes

- Updated dependencies [5596359]
  - @bananapus/nana-sdk-core@2.18.0

## 31.0.0

### Patch Changes

- Updated dependencies [f44b312]
  - @bananapus/nana-sdk-core@2.17.0

## 30.0.0

### Patch Changes

- Updated dependencies [059ee37]
  - @bananapus/nana-sdk-core@2.16.0

## 29.0.0

### Patch Changes

- Updated dependencies [1c81bb7]
  - @bananapus/nana-sdk-core@2.15.0

## 28.0.0

### Patch Changes

- Updated dependencies [47e45ab]
  - @bananapus/nana-sdk-core@2.14.0

## 27.0.0

### Patch Changes

- Updated dependencies [4dfa326]
  - @bananapus/nana-sdk-core@2.13.0

## 26.0.0

### Patch Changes

- Updated dependencies [8e50cb0]
  - @bananapus/nana-sdk-core@2.12.0

## 25.0.0

### Patch Changes

- Updated dependencies [5201c38]
  - @bananapus/nana-sdk-core@2.11.0

## 24.0.0

### Patch Changes

- Updated dependencies [8856b17]
  - @bananapus/nana-sdk-core@2.10.0

## 23.0.0

### Patch Changes

- Updated dependencies [189d418]
  - @bananapus/nana-sdk-core@2.9.0

## 22.0.0

### Patch Changes

- Updated dependencies [87d75d2]
  - @bananapus/nana-sdk-core@2.8.0

## 21.0.0

### Patch Changes

- Updated dependencies [678c1ae]
  - @bananapus/nana-sdk-core@2.7.0

## 20.0.0

### Patch Changes

- Updated dependencies [8753bc5]
  - @bananapus/nana-sdk-core@2.6.0

## 19.0.0

### Patch Changes

- Updated dependencies [04fef83]
  - @bananapus/nana-sdk-core@2.5.0

## 18.0.0

### Major Changes

- 8b3ef4b: `useBendystrawQuery` (and every hook built on it, including `useSuckers`) now throws when no Bendystraw config is in context instead of silently staying disabled. Wrap the tree in `JBProjectProvider` with a `bendystraw={{ apiKey }}` prop.

## 17.0.0

### Patch Changes

- Updated dependencies [faef1eb]
  - @bananapus/nana-sdk-core@2.4.0

## 16.0.0

### Patch Changes

- Updated dependencies [2dee99f]
  - @bananapus/nana-sdk-core@2.3.0

## 15.0.0

### Patch Changes

- Updated dependencies [971785b]
  - @bananapus/nana-sdk-core@2.2.0

## 14.0.0

### Patch Changes

- Updated dependencies [59dce8e]
  - @bananapus/nana-sdk-core@2.1.0

## 13.0.0

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

### Patch Changes

- Updated dependencies [6c69949]
  - @bananapus/nana-sdk-core@2.0.0

## 12.0.0

### Patch Changes

- Updated dependencies [4efed1c]
  - @bananapus/nana-sdk-core@1.11.0

## 11.0.0

### Patch Changes

- Updated dependencies [55ddb17]
  - @bananapus/nana-sdk-core@1.10.0

## 10.0.1

### Patch Changes

- cf64c43: Harden contract deployment lookup and Bendystraw operation handling while removing unused generated GraphQL and runtime surface.
- Updated dependencies [cf64c43]
  - @bananapus/nana-sdk-core@1.9.3

## 10.0.0

### Patch Changes

- Updated dependencies [616afa3]
  - @bananapus/nana-sdk-core@1.9.0

## 9.0.0

### Patch Changes

- 432b5f7: Add bounded Bendystraw requests, exact versioned project-reference filters,
  and 200-reference query batching, and use the shared transport in the React
  Bendystraw hook.
- Updated dependencies [432b5f7]
  - @bananapus/nana-sdk-core@1.8.0

## 8.0.0

### Patch Changes

- Updated dependencies [068abea]
  - @bananapus/nana-sdk-core@1.7.0

## 7.0.0

### Patch Changes

- Updated dependencies [de6f66d]
  - @bananapus/nana-sdk-core@1.6.0

## 6.0.0

### Patch Changes

- Updated dependencies [9793326]
  - @bananapus/nana-sdk-core@1.5.0

## 5.0.1

### Patch Changes

- 9b5bb93: Harden Relayr bundle submission and polling with explicit terminal status,
  `hasFailed` and `isFetching` state, quote validation, destination-chain and
  signature validation, and propagated Relayr errors. Scope Bendystraw cache
  entries by service URL so clients configured for different endpoints cannot
  share stale data. Declare React 19 as a supported peer alongside React 18.
- d4dd71e: Keep React Query controls out of `useSuckers` GraphQL variables while preserving its infinite
  stale-time behavior.
- d4dd71e: Preserve a valid zero total-outstanding-token response in `JBTokenContext`
  instead of treating it as missing data.
- Updated dependencies [d4dd71e]
  - @bananapus/nana-sdk-core@1.4.1

## 5.0.0

### Patch Changes

- Updated dependencies [997d0ad]
  - @bananapus/nana-sdk-core@1.4.0

## 4.0.0

### Minor Changes

- 2cf603d: Add `useShopPurchases` and `useOwnedShopItems` hooks for a project's 721 "shop": the customers/purchases feed (bendystraw `mintNftEvents`) and a holder's currently-owned store items (bendystraw `nfts`), for the project + chain in context. `useOwnedShopItems` is the basis for a redeem/cash-out list (verify `ownerOf` on-chain before offering a redemption). The typed query documents are hand-written (self-contained) rather than codegen'd, so they add no generated-schema churn.

### Patch Changes

- Updated dependencies [ef9f7e2]
  - @bananapus/nana-sdk-core@1.3.0

## 3.0.0

### Patch Changes

- Updated dependencies [91c2361]
  - @bananapus/nana-sdk-core@1.2.0

## 2.0.0

### Patch Changes

- Updated dependencies [ce5bf16]
  - @bananapus/nana-sdk-core@1.1.0

## 6.0.0

### Major Changes

- 9d130e7: Add Juicebox V6 support.
  - `JBVersion` is now `4 | 5 | 6`; `jbContractAddress` has a `6` key and `/v6:` URNs parse.
  - BREAKING: unsuffixed ABI exports (`jbControllerAbi`, `revDeployerAbi`, etc.) are now the V6 ABIs. Older-version ABIs that drifted are exported with a version suffix (e.g. `jbControllerV5Abi`, `revLoansV4Abi`) — use those when reading v4/v5 contracts where the interface changed.
  - BREAKING: `CCIP_SUCKER_DEPLOYER_ADDRESSES` is now keyed by version (`5` and `6`) before the chain pair; `parseSuckerDeployerConfig` takes an optional `version` in `opts` (defaults to 5, which also serves v4).
  - New V6 contracts: `JBRouterTerminal` and `JBRouterTerminalRegistry` (the swap terminal is replaced by the router terminal in V6). The V6 `ERC2771Forwarder` address is injected at codegen (same address on every chain).
  - `useNativeTokenSurplus`, `useSuckersNativeTokenSurplus`, and `useResolveDataHook` branch per version where V6 renamed functions (`currentSurplusOf` takes token addresses; the omnichain deployer's `dataHookOf` split into `tiered721HookOf`/`extraDataHookOf`).

### Patch Changes

- Updated dependencies [9d130e7]
  - juice-sdk-core@3.0.0

## 5.0.2

### Patch Changes

- Fix bug with wrong projectId in `useSuckers` hook

## 5.0.1

### Patch Changes

- Fix Bendystraw URL when API key isn't present

## 5.0.0

### Minor Changes

- Add Bendystraw client instead of using juicebox API

### Patch Changes

- Updated dependencies
  - juice-sdk-core@2.1.0

## 4.0.0

### Major Changes

- Add support for v5 contracts, remove auto-generated hooks & actions

### Patch Changes

- Updated dependencies
  - juice-sdk-core@2.0.0

## 3.0.0

### Minor Changes

- e73a095: Fix error with invalid primary terminal address for projects with USDC context

### Patch Changes

- Updated dependencies [1a17ec9]
- Updated dependencies [e73a095]
  - juice-sdk-core@1.10.0

## 2.0.0

### Patch Changes

- Updated dependencies [7b756c8]
  - juice-sdk-core@1.9.0

## 1.9.16

### Patch Changes

- aaf50d0: Remove beta tags and mark packages as stable

  This release removes the `-beta` suffix from all package versions, marking them as stable releases. No breaking changes are included in this update.

- Updated dependencies [aaf50d0]
  - juice-sdk-core@1.8.9
