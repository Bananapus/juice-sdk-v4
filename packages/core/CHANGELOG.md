# juice-sdk-core

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
