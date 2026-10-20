---
"@bananapus/nana-sdk-core": minor
---

Pages load less of the SDK for the same imports. Every existing export keeps its import path and value.

- Add `JBCenterRpcClient`, the read-only RPC half of `JBCenterClient`, in a module of its own. `JBCenterClient` extends it and `createJBCenterRpcProvider` builds it, so a page that only reads chains through JB Center no longer loads the intent decoders, ABIs and Safe code (`createJBCenterRpcProvider`: 20.3 KB to 2.8 KB gzip).
- Add `jbV4ContractAddress`, `jbV5ContractAddress` and `jbV6ContractAddress`, one deployment table per version. `jbContractAddress` joins them by version with the same values; prefer the version's own table, since the joined one loads all three. The SDK's V6 code reads `jbV6ContractAddress`.
- Add `compileBendystrawDocument`, which builds the same operation contract as `compileBendystrawOperation` from a document parsed at build time, so a page need not bundle the GraphQL parser.
- Every generated ABI has a module of its own, the chain definitions and load-time tables are marked pure, and module-level ABIs are written parsed instead of `parseAbi` calls. The Sticky collectors, the tier price math, the review queue and the sucker deployer maps sit in modules of their own, re-exported where they were. `verifyStickyCollectorRoute` imports the sucker helpers statically, so esbuild can tree-shake bundles that include it.
- `buildUserPayMetadata` on a chain without a V6 buyback registry deployment now throws the `v6Address` message ("No v6 JBBuybackHookRegistry deployment on chain …"). Every supported chain has one.
