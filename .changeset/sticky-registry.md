---
"@bananapus/nana-sdk-core": minor
---

`jbContractAddress[6]` names the Sticky contracts on all eight supported
chains: `StickyDeployer`, `StickyHook`, `StickyDistributor`,
`StickyRewardReceiverFactory` and `StickyAutoStick`, each at one address on
every chain, with their ABIs exported as `stickyDeployerAbi`, `stickyHookAbi`,
`stickyDistributorAbi`, `stickyRewardReceiverFactoryAbi` and
`stickyAutoStickAbi`, and the names as the `StickyContracts` enum. They are
generated from `mejango/sticky`'s executed deployments, pinned by commit beside
deploy-all-v6.

`decodeDeploymentCall` no longer reads `HomerunDeployer.launchFundFor`: the
`"homerun-fund"` flavor is gone from `JBCenterDecodedLaunch`, and a FUND launch
now decodes as `"unknown"`. Homerun decodes its own launches in its own app.
