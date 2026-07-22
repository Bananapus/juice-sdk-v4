# juice-sdk-react

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
