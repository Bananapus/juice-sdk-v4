---
"@bananapus/nana-sdk-core": patch
---

A Safe execution hash the wallet returned at once is saved as `executed` only after it is authenticated as this Safe's canonical execution of the exact reviewed call, with the same check `verifyReviewedWriteReceipt` uses. Before, a receipt alone marked it executed even when it ran a different call, which nothing could settle and `onUnproven` couldn't end, so the call stayed blocked. Such a hash now stays unproven: the warned exit after 30 minutes, and `onUnproven` offers it at once.
