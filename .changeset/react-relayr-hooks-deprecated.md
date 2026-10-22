---
"@bananapus/nana-sdk-react": minor
---

`useSendRelayrTx`, `useGetRelayrTxQuote` and `useSignErc2771ForwardRequest` are deprecated. They sign and send without review; use `runRelayrReviewed`, `payRelayrReviewed` and `signReviewedForwardRequests` from `@bananapus/nana-sdk-core/review`.
