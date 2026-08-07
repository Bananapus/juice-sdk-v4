# juice-sdk-react

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
