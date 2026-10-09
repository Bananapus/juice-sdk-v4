# Ordinary wallet-write recovery — 2026-10-09

Review baseline: published SDK `4c8646ee08ab41dc3536a00180d9b1a4fef25518`, Sticky `74dc087`, and the matching Juicebox, Homerun and Revnet reconciliation worktrees. Required workspace resources remain `/Users/jango/Documents/jb/v6/evm/AGENTS.md`, `workflow/ponytail/SKILL.md`, `workflow/ponytail/README.md`, `docs/PLAN_REFINEMENT.md` and relevant `tasks/lessons.md`, plus each affected client's descendant instructions.

## Plan refinement

- **Objective:** Prevent a second non-idempotent ordinary wallet write after the first may have broadcast but its reply was lost, including reset, remount and browser reload; preserve usable recovery for recorded hashes in all four clients. Keep independently journaled launch/bridge/admin actions under their existing recovery owner.
- **System fit:** SDK reviewed-write execution owns the distinction between preflight failure, explicit wallet rejection, returned submission identity and ambiguous wallet outcome. A shared SDK recovery record binds wallet/account/chain and reviewed call evidence; ordinary client engines own presentation and receipt following, while Revnet adapts its existing durable activity journal. Canonical result evidence, rather than elapsed time or nonce advance, releases a held action. No publishing, deployment or merge is authorized.
- **Reuse and simplicity:** Reuse `submitReviewedContractWrite`, `isDefiniteWalletRejection`, existing callback journals, SDK receipt/Safe proof and native browser storage/locks. Add one generic recovery owner only where ordinary writes currently have no durable owner, and adapt Revnet's existing activity owner instead of introducing parallel persistence. Keep Safe replacement proof in the existing SDK Safe-service owner.
- **Evidence and unknowns:** An isolated Node reproduction of actual Sticky `useSafeTx` and installed SDK shows a successful modeled transfer followed by a lost reply sets `phase=error`, `busy=false`, then Retry sends a second transfer. A second actual-SDK reproduction shows an executed Safe proposal with a stale service record becomes `replaced` after eleven simulated minutes solely from nonce advance. Hashless nonunique writes cannot safely be released using arbitrary historical matching transactions; documented recovery must preserve that uncertainty.
- **Verification:** Add focused SDK transition and persistence round-trip regressions covering lost replies, storage failures, rejected writes, preflight aborts, account/connector changes, exact evidence and unresolved action scope. Add real-engine client checks for duplicate suppression after reset/remount/reload, known-hash receipt recovery and preservation of existing domain-journal recovery. Verify the Safe watcher does not infer replacement from prolonged stale service data. Root serializes broad build/test/RPC checks; this work uses bounded Node/unit checks and no live writes.
- **Resource budget:** Share the fresh SDK worktree with the route-readiness reviewer using disjoint paths (`review/` and `safeService` here, `v6/` there); do not stage or commit concurrently. Parallelize read-only inventory and separate client adapters only after the shared API is settled. Replan if existing journals cannot compose without a second unreleasable lock or if recovery needs a new authority assumption.

## Checklist

- [x] Prove ordinary-write lost-reply retry and inventory all four current consumers.
- [x] Independently inspect launch/bridge durable recovery and Safe replacement behavior.
- [ ] Agree concrete shared recovery transitions and client recovery presentation before production edits.
- [ ] Add meaningful failing SDK/client regressions for the proved paths.
- [ ] Implement shared uncertainty/recovery owner and compose existing domain journals.
- [ ] Wire and verify each of Sticky, Juicebox, Homerun and Revnet.
- [ ] Preserve uncertain Safe proposals unless independent execution evidence settles them.
- [ ] Record exact verification evidence and residual recovery limitations for root integration.

### Refinement from independent implementation review

- A returned wallet hash must survive in current-session memory even when saving that hash fails; the persisted prewallet record remains held, and the typed persistence failure carries the exact returned identity for a checked write retry and receipt recovery.
- Adopting an existing Safe proposal records its actual queued call. A newly stamped review call cannot replace the calldata that the proposal will execute; replacement calldata must remain within the same conflict scope.
- A known proposal's canonical execution event can bind executor-wrapped Safe transactions. A wallet reply that is the execution hash still needs exact inner-call evidence. A reverted wrapper never proves the Safe proposal was consumed.
- Receipt-free expiration release requires authenticated exact proposal fields and the canonical target's contract-enforced deadline at a finalized, numbered-block Safe nonce snapshot. A stale indexer plus nonce advancement is retained as uncertainty. The verifier belongs to the same SDK recovery owner and reuses the Safe-service snapshot rules.
- Reset and unmount invalidate the final wallet gate. Asynchronous confirmation of an earlier different call must not mark the currently reviewed call successful; recovery identity guards late state updates.
- Sticky bridge and collector repairs bind a retained wallet reply to the original uniquely identified reservation, including its metadata and journal key. Identical calldata in a replacement attempt is insufficient. Existing owner locks and canonical-proof snapshot checks remain authoritative; focused regressions cover failed hash persistence, replacement attempts and legacy records.

## Review results

Pending implementation. Proof scripts: `/private/tmp/sticky-ambiguous-write-repro.cjs` and `/private/tmp/sticky-safe-stale-replacement-repro.cjs`; these model wallet/node/service responses and execute source or installed SDK code, and are not evidence of any live transaction.
