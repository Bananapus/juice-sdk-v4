# juice-sdk-core

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
