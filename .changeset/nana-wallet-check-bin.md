---
"@bananapus/nana-sdk-core": minor
---

`nana-wallet-check` is a published bin: `nana-wallet-check --root <dir>... --inventory <json> [--forbid-import <spec>]...` exits 1 on an unreviewed or stale wallet call or signing RPC literal, on the identifier `reviewedInParent` or a `registerTransactionReviewHandler` call without an inventory row, on a `selfReviewingAdapter` or `signaWalletAdapter` call outside the files the inventory lists under `selfReviewing`, and on an import of a `--forbid-import` specifier. It resolves `typescript` (optional peer, `>=5.4`) from the working directory. Clients run it as their wallet-boundary gate.
