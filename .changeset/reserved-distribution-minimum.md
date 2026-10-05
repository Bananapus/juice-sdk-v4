---
"@bananapus/nana-sdk-core": minor
---

`verifyReservedDistributionReceipt` accepts a distribution of at least the
reviewed token count. Reserved tokens keep accruing until the distribution
runs, so a Safe that executes days after the review distributes more than was
reviewed. That receipt verifies: each split's share, the owner's leftover and
the burns sent to `0x…dEaD` are checked against the count the receipt
distributed. A receipt that distributed fewer tokens than were reviewed is
refused, because another distribution ran first or the review was stale.

It returns `{ tokenCount }`, the count the receipt distributed, so an app can
show the amount that went out. `ExpectedReservedReceipt.tokenCount` keeps its
shape and is the reviewed minimum: pass the pending reserves the review saw.
`verifyPayoutReceipt` is unchanged.
