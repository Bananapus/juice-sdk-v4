# Wrapped Safe funding proof

Required workspace instructions: [AGENTS.md](../../../AGENTS.md), [Ponytail](../../../workflow/ponytail/SKILL.md), [provenance](../../../workflow/ponytail/README.md), [plan refinement](../../../docs/PLAN_REFINEMENT.md), [lessons](../../../tasks/lessons.md), and [owning cross-product plan](../../../docs/WEBSITE_PERFORMANCE_RELEASE_FOLLOWUPS.md). No descendant SDK instructions were found. Base: main `0f59e9acfdee26a92ee1318ba42726037f513759`, core 2.24.4.

## Plan refinement

- **Objective:** Recognize the user's successful wrapped native payment and continue exact Safe execution progress, while preserving reviewed payment authority and no-double-payment guards in both products.
- **System fit:** The shared payment verifier owns canonical funding evidence; the Safe controller owns final validation phases and post-submission inspection. App adapters consume those results. Bundle `1a3bbc6f-b775-49ef-92c4-94dc0a47198f` is paid by transaction `0xeff2702e62754e13be6c30f861c1d7db89350eb8517472405a2f620c165814cf` through a wallet wrapper, and all four exact destination receipts verify. This proves bundle funding, not whose account was debited. No wallet sends, quotes or chain mutations are authorized.
- **Reuse and simplicity:** First extract the existing transaction read and canonical receipt checks without changing outcomes or read order. Move Center's exact unique Prepayment event semantics to the SDK owner; root coordinates the thin Center adapter migration. Keep direct-target from/input/value checks and retry proof strict; permit wrapped success only with exact transaction/chain, matching successful receipt, pinned runtime at its block, unique matching UUID/amount/deadline event, and a final canonical block check. Reuse the existing runtime validator and controller inspect operation.
- **Evidence and unknowns:** The offline real fixture reproduces the current SDK's exact mismatch; Center's existing event verifier accepts its logs, and historical payment code hashes to the existing pin. Captured evidence is in `/private/tmp/safe-wrapped-payment-{fixture,regression,runtime}.json`. The reviewed browser account is unknown and is unnecessary for a bundle-funding statement. Missing historical code or receipt evidence remains unavailable. Wrapped reverts never establish an exact reverted reviewed payment or permit retry.
- **Verification:** Preserve the failing-before fixture; regress direct success and all direct mismatches, malformed/duplicate/removed/wrong event data, wrong chain/hash/receipt/block/runtime, missing code reads, wrapper reverts, no double pay and unchanged destination checks. Assert final checking phase at beforeSend and one safe post-submit inspection after persisted hash; complete requires destination proofs, otherwise only canonically confirmed funding may return pending while retaining partial evidence. Run focused baseline/refactor/feature tests, type checks, coverage/release gates and independent financial review before root publication.
- **Resource budget:** One isolated SDK writer, independent reviewer, root-only release and separate app/Center owners. Reuse captured public data and existing fixtures; no further RPC/service requests needed. Keep the old SDK artifact and dirty shared checkout untouched. Replan on proof assumptions, persistence ambiguity, interface incompatibility or release-gate failure rather than weakening a guard.

- [x] Capture actual failing-before funding proof and authenticate its historical runtime.
- [x] Obtain independent minimum-design review.
- [ ] Extract canonical proof reads with behavior unchanged and baseline tests passing.
- [ ] Add the shared event owner and wrapped-success proof with adversarial regressions.
- [ ] Add final payment-checking phase and safe post-submission inspection.
- [ ] Complete SDK verification, independent review and release handoff.

## Review

Pending implementation and verification. Root owns publication and consumer adoption.
