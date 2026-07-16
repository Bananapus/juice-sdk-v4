---
"@bananapus/nana-sdk-core": minor
---

v6 sucker deployment can now use native bridges alongside CCIP. `parseSuckerDeployerConfig` and `buildOmnichainLaunchProjectTx` take a `bridge` option: `"ccip"` (default, unchanged), `"native"` (OP/Base/Arbitrum standard-bridge suckers — Ethereum<->L2 pairs only), or `"both"` (one native AND one CCIP sucker per pair for redundancy; L2<->L2 pairs fall back to CCIP alone). Native-bridge deployer addresses ship as `NATIVE_SUCKER_DEPLOYER_ADDRESSES` / `jbNativeSuckerDeployerAddress`.

Safety: native suckers only receive native-token mappings. Standard bridges deliver bridge-wrapped USDC.e — never canonical USDC — so a canonical-USDC mapping over a native bridge locks funds in bridge escrow (OP/Base) or strands them on the remote sucker (Arbitrum), and neither the sucker contracts nor the registry allowlist prevent it. `"native"` + USDC throws; `"both"` + USDC keeps the USDC mapping on the CCIP sucker only.
