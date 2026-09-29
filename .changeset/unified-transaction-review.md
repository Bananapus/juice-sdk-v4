---
"@bananapus/nana-sdk-core": minor
---

Juicebox Money, revnet.money and Homerun now share one review model through
`@bananapus/nana-sdk-core/review`:

- A reviewed call can carry the `gas` its wallet or forwarder signs and a Safe
  proposal's `safeTxGas`. Both appear in `transactionReviewJson`, and
  `requestContractTransactionReview` refuses to continue when either changes
  after approval.
- `requireFundingChainSelection(options, preferredChainId)` preselects the
  connected chain when it is quoted, or a lone quote, and hands the handler that
  choice. `fundingChainLabel(chainName, amountWei)` words each option, for
  example "Base (~0.000123 ETH)".
- `TransactionReviewCancelledError` is exported. Closing a review or the fee
  picker raises it, so apps can say nothing was sent instead of showing an
  error.
- The audit prompt also checks `gas` and `safeTxGas`, and separates what a
  Relayr or Safe authorization signs now from its later execution.
