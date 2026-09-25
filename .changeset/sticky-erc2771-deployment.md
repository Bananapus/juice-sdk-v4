---
"@bananapus/nana-sdk-core": patch
---

`jbContractAddress[6]` points the five Sticky contracts at their ERC-2771
redeployment, the same address on all eight chains: `StickyDeployer`
`0xdA38Ec48B5b1d186B02BA99F297e95153BEE33a9`, `StickyHook`
`0xa8DcD735031cf96C4213D9A3f66a1DFFDCdba693`, `StickyDistributor`
`0xc62b3fED668Cd8a3879ba34890a67C48a52b1Bb8`, `StickyRewardReceiverFactory`
`0xF65743b76C062762D19eecb4Ab5C7a943e128720` and `StickyAutoStick`
`0x9B091e21d25c424De67751F4b6Ae8494351218C5`. The earlier addresses are
superseded and hold no projects. The Sticky ABIs add `trustedForwarder()` and
`isTrustedForwarder(address)`, since each contract now accepts Juicebox core's
meta-transaction forwarder, and the hook's constructor takes it. Generated from
`mejango/sticky` at `bb5780307cce47c841d162da0577e93f31fbdb1e`.
