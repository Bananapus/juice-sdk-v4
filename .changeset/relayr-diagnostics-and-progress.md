---
"@bananapus/nana-sdk-core": patch
---

Show Relayr rejection variants, chains and reasons before transaction calldata,
while retaining bounded original responses in private error causes. Expose Safe
bundle progress per chain and keep checking paid transactions while their
canonical receipts are temporarily unavailable. Preserve exact destination,
Safe execution and payment proofs before reporting confirmation or offering a
retry.
