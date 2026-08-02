---
"@bananapus/nana-sdk-core": patch
---

Add narrow v6 payment, Permit2, loan math, cash-out, Uniswap V4, and Uniswap deployment entry points and mark the core package as side-effect free so browser bundlers can exclude unrelated SDK modules. Pure loan arithmetic no longer imports transaction-builder ABIs.
