---
"@bananapus/nana-sdk-core": minor
---

Safe proposals: `proposeReviewedSafeTransaction` takes an optional `nonce`, one of the new `proposalNonceChoices` (each queued nonce from the Safe's own on, then the next free one). A queued nonce offers the proposal as a replacement. The default stays the next free nonce.
