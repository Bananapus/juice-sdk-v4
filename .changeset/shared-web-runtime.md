---
"@bananapus/nana-sdk-core": minor
---

Juicebox Money and Homerun kept identical copies of their transaction review,
Safe tracking, Bendystraw query and fee buyback code, and revnet.money kept a
third copy of the Bendystraw and fee buyback parts. One copy of each now ships
here:

- `@bananapus/nana-sdk-core/review`: the transaction review queue
  (`requireContractTransactionReview` and its handlers),
  `submitReviewedContractWrite`, and `gasWithHeadroom` / `gasWithinCap`. The
  review prompts take the app's own chain names and explorer links.
- `@bananapus/nana-sdk-core/safe-service`: `SAFE_PREFIX`, `SAFE_SERVICE_PREFIX`,
  `safeServiceBase`, `safeQueueUrl`, `swapDeadline`, `SAFE_NONCE_GUIDANCE` and
  `waitForSafeExecutionHash`, which turns a Safe proposal into its mined
  transaction hash.
- `@bananapus/nana-sdk-core/bendystraw-operations`: `compileBendystrawOperation`
  (operation name, bounded variables and response-shape checks from one
  document), `bendystrawOperationId`, `resolvePersistedBendystrawRequest` for a
  same-origin proxy, and `requestPersistedBendystraw`. This entry point needs
  `graphql` 16, now an optional peer dependency.
- `resolveProjectDeployments` from the root entry point: the verified
  per-chain project IDs of a sucker group.
- `@bananapus/nana-sdk-core/v6/fee-buyback`: `checkFeeBuyback`,
  `analyzeFeeSimulation` and `createFeeWatch`, which say whether a fee will buy
  back from the pool or mint at the issuance rate.
