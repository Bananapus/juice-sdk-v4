---
"@bananapus/nana-sdk-core": patch
---

`StickyRewardReceiverFactory` points at its replacement,
`0x41AEC7AacEa4759F2c8AaBD68D4a4C1574A6A737` on all eight supported chains,
pinned to `mejango/sticky` commit `b3835db805786e680f5cc27e700d7be660fdba1f`.
The old factory was `0xF65743b76C062762D19eecb4Ab5C7a943e128720`.
`StickyDeployer`, `StickyHook`, `StickyDistributor` and `StickyAutoStick` keep
their addresses and ABIs.

The new factory clones reward receivers from one implementation.
`stickyRewardReceiverFactoryAbi` changes to match: the constructor takes
`receiver` instead of `distributor`, and the ABI adds the `RECEIVER()` view and
the `StickyRewardReceiverFactory_InvalidStickyToken`, `FailedDeployment` and
`InsufficientBalance` errors.
