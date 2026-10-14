---
"@bananapus/nana-sdk-core": patch
---

A namespaced hold whose send never reaches the wallet no longer leaves its exact-call mirror behind. When the app reports the send unsent (`gate.onRejected()`: a reset or abort during the review, a review rejection, or a definite wallet rejection), the reservation's mirrors are removed by their id, under the locks the send still holds, through the same cleanup used after a failed mirror write. A mirror stays only when a wallet send may have happened.
