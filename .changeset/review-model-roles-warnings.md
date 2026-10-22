---
"@bananapus/nana-sdk-core": minor
---

The review model shows more of what a call does. Each call names the addresses it gives a part (`roles`: spender, recipient, beneficiary, owner, operator) and the token amounts it moves or approves (`tokenAmounts`, with decimals and symbol when known). New warnings flag an unknown destination, an unlimited approval, an ownership change, a permission grant and unknown token decimals. Tuple and array arguments carry labeled `children`, so a client can show them nested. `enrichReviewModel` reads each token's decimals and symbol once per chain, leaving them null when a read fails, and never changes the model's id. `decodeReviewCall` decodes raw calldata with the SDK's own ABIs (the contract's at that address first, then by selector), for callers that hold only the bytes.
