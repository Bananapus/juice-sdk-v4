---
"@bananapus/nana-sdk-core": major
---

Addresses for the executed hooks 2.0.0 and LP split hook 1.5.0 rollout (deploy-all-v6 8ff50c2), and every buyback and router generation projects still use. Major: retired generations are renamed.

Migration:

- `jbContractAddressHistory["6"].JBBuybackHook.previous` and `.JBRouterTerminal.previous` are now 1.4.0 and 1.3.0 (`_deprecated2`). What `previous` held before (1.1.1) is now `v2`; `v1` is unchanged. `jbBuybackHookPreviousAbi` follows, and `jbBuybackHookV2Abi` and `jbRouterTerminalV2Abi` are new.
- `JBRouterTerminalGateway` now has history: `previous` is 1.3.0, and `knownAddressName` labels the current one `JBRouterTerminalGateway (current)`.
- `jbUniswapV4LpSplitHookAbi`, `jbUniswapV4LpSplitHookDeployerAbi` and `jbp6FeeLpSplitHookAbi` are the 1.5.0 interfaces. 1.5.0 drops `tokenIdOf`, `activeTickLowerOf`, `activeTickUpperOf` and `rebalanceLiquidity` (it keeps `askTokenIdOf` and `bidTokenIdOf` positions), and `deployPool` takes only `projectId`. Hooks live projects use still have the old functions, so read those with your own fragment.

Changes:

- Current addresses: `JBBuybackHook` 2.0.0, `JBRouterTerminal` and `JBRouterTerminalGateway` 1.4.0, the LP split hook and deployer 1.5.0, `JBP6FeeLPSplitHook`.
- `v6Deployments(contract, chainId, generations?)` and `isV6Deployment` list and match a contract's current and retired addresses, newest first.
- `prepareUserPay` recognizes a buyback hook of the current, previous or v2 generation called directly by the ruleset, and follows a router payment through any generation's registry entry and gateway to the router it reaches, which then quotes the conversion. Projects still on gateway 1.3.0 keep their quoted minimum, and project 1 (gateway 1.4.0) gets one again. A terminal that reaches no known router keeps the mint minimum instead of quoting the current router.
- `resolvePaymentTerminal` recognizes the previous gateway and every router generation; cash-out quotes and fee checks recognize every quotable buyback generation.
