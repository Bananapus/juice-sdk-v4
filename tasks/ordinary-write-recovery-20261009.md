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
- [x] Agree concrete shared recovery transitions and client recovery presentation before production edits.
- [x] Add meaningful failing SDK/client regressions for the proved paths.
- [x] Implement shared uncertainty/recovery owner and compose existing domain journals.
- [ ] Wire and verify each of Sticky, Juicebox, Homerun and Revnet.
- [x] Preserve uncertain Safe proposals unless independent execution evidence settles them.
- [ ] Record exact verification evidence and residual recovery limitations for root integration.

### Refinement from independent implementation review

- A returned wallet hash must survive in current-session memory even when saving that hash fails; the persisted prewallet record remains held, and the typed persistence failure carries the exact returned identity for a checked write retry and receipt recovery.
- Adopting an existing Safe proposal records its actual queued call. A newly stamped review call cannot replace the calldata that the proposal will execute; replacement calldata must remain within the same conflict scope.
- A known proposal's canonical execution event can bind executor-wrapped Safe transactions. A wallet reply that is the execution hash still needs exact inner-call evidence. A reverted wrapper never proves the Safe proposal was consumed.
- Receipt-free expiration release requires authenticated exact proposal fields and the canonical target's contract-enforced deadline at a finalized, numbered-block Safe nonce snapshot. A stale indexer plus nonce advancement is retained as uncertainty. The verifier belongs to the same SDK recovery owner and reuses the Safe-service snapshot rules.
- Reset and unmount invalidate the final wallet gate. Asynchronous confirmation of an earlier different call must not mark the currently reviewed call successful; recovery identity guards late state updates.
- Sticky bridge and collector repairs bind a retained wallet reply to the original uniquely identified reservation, including its metadata and journal key. Identical calldata in a replacement attempt is insufficient. Existing owner locks and canonical-proof snapshot checks remain authoritative; focused regressions cover failed hash persistence, replacement attempts and legacy records.

## Review results

The shared SDK owner was first qualified at `a4022589502dada1507c1b40be7e9c13308bc630`; the later cache-conflict refinement below supersedes that preview for final qualification. The historical preview is `2.27.0-preview.adversarial.9ee3da134017`; all 769 compiled artifacts are byte-identical after a fresh locked install and complete forced SDK check. Core 2,274 tests, React 153 tests and Connect 35 tests pass. `contractWrite` and `safeService` have 100% coverage in every metric; `writeRecovery` has 100% lines/statements/functions and 96.59% branches. The draft SDK PR is reviewable independently; client qualification is explicitly pending.

Juicebox full gates currently pass 2,970 tests and all 66 Chromium cases against the physical preview. Its create and aggregate bundle budgets need exact before/after attribution before a narrow limit change; no client runtime push or published-package qualification is claimed.

Sticky's 293 focused tests, touched-file lint and types passed before complete-suite fixture updates. The full gate exposed old receipt fixtures that require canonical RPC evidence; those are being corrected without proof mocks. Independent review then found repeated returned-hash storage failures could strand current-session recovery despite retaining the safety lock. The existing journal owner is being strengthened to preserve the exact original attempt's known reply; production review and final full gates remain open.

Homerun and Revnet final client work remains open. Homerun is reviewing linked-ruleset completion and partial-reservation failure semantics. Revnet is addressing cross-scope lost updates in its existing whole-array activity owner; the selected persistence API must preserve unrelated reservations and exact post-await proof snapshots. These are client owner refinements, not changes to the frozen SDK artifact.

Residual recovery limit: a hashless nonunique wallet write stays held without proof identifying that exact attempt; elapsed time, nonce movement, dismissal, or an arbitrary historical matching transaction cannot release it. Conflict scope deliberately includes account, chain, target and selector, so a changed recipient/amount still waits for the earlier same-function write. The durable store is local to the browser origin; losing or clearing that storage is outside the persistence guarantee.

Proof scripts: `/private/tmp/sticky-ambiguous-write-repro.cjs` and `/private/tmp/sticky-safe-stale-replacement-repro.cjs`; these model wallet/node/service responses and execute source or installed SDK code, and are not evidence of any live transaction.

## Plan refinement — repeated domain hash-save failure

- **Objective:** Preserve a trusted Bridge/Collector wallet reply across repeated hash-save failures and component close/remount, with an explicit working recovery check once storage returns; never associate it with a replacement attempt.
- **System fit:** The existing bridge journal retains the exact original UUID snapshot and submitted hash/Safe kind in session memory, while its durable reservation remains authoritative. Existing owner locks, canonical proof and post-proof raw snapshot comparison continue to control progress and clearing. Root explicitly authorized this narrow production reopen.
- **Reuse and simplicity:** Reuse the journal's submission CAS and both panels' Check transaction action. A storage-scoped WeakMap retains failed commits; public reads expose that reply only against its exact raw reservation, and one shared retry helper persists it before recovery. No timer, second durable journal, historical-hash adoption or SDK runtime change.
- **Evidence and unknowns:** Independent review reproduced initial and receipt-time hash persistence failures followed by a discarded UI hash, including failures to read the reservation. An unreadable raw record permits retaining a private candidate but never exposing, persisting or clearing it; a retained different attempt cannot be overwritten until raw identity is readable. Session memory survives component remount but does not survive page/process loss.
- **Verification:** Regress two failed saves followed by storage restoration and manual recovery in Bridge and Collector, plus replacement UUID/hash/metadata conflicts and raw-CAS behavior in the journal. Run the three focused files, touched-file types/lint and independent source reread before refreezing.
- **Resource budget:** Edit only the shared journal, two consumers and their existing tests. Parent holds full client gates until this bounded fix is frozen; no build, installation, staging or commit here.

- [x] Implement exact retained-reply retry in the existing owner and both consumers.
- [x] Verify repeated failure recovery and replacement isolation, then report refreeze.

Reopen verification: 129/129 tests across the existing journal, Bridge and Collector suites; all six touched files pass ESLint and targeted TypeScript checks, and `git diff --check` passes. Both consumers regress repeated read/write failure followed by unmount and storage restoration; journal cases cover exact private candidate exposure, Safe proposal kind, conflicting hashes/UUIDs/metadata, raw-only CAS, and an old unreadable repair preserving a newer retained reply. Independent final source reread reports no remaining concrete issue. Separately, Unstick's canonical wallet fixtures pass all 57 cases, including uncertain-response review close/reopen without another wallet call. Parent resumes broad client gates after refreeze.

## Plan refinement — SDK retained-reply replacement

- **Objective:** Keep the current SDK write's returned hash when an older attempt retries while storage is unreadable; retain valid newer replies after their exact durable reservation is verified.
- **System fit:** Root explicitly authorized a narrow SDK runtime reopen after an installed-artifact reproduction. The existing recovery cache remains the only memory owner; durable reservation identity, native locks, canonical proof and release rules remain unchanged.
- **Reuse and simplicity:** Guard the existing rememberSubmission helper against replacing different cached evidence without readable exact ownership. Successful raw reads remove proven-stale cache, and the existing submission CAS permits a legitimate current attempt to replace stale memory after a failed write. No new persistence, timing or API surface.
- **Evidence and unknowns:** Reproduction completes A, reserves B, fails B's hash write, then loses B's memory hash when A's stale repair encounters getItem failure. Tests must also show stale memory cannot suppress a fresh valid reply. Session-only retention limits are unchanged.
- **Verification:** Add a failing-before A/B regression, a fresh reservation following proven-stale memory, and a legitimate newer cache replacement after exact raw CAS. Run the source recovery tests, formatting and targeted types; obtain independent reread before parent reruns full SDK gates and repackaging.
- **Resource budget:** Edit only writeRecovery.ts, its test and this refinement record. Parent owns build, wallet-inventory line update, package installation and release provenance; no compiling, staging or committing here.

- [x] Preserve current retained evidence and verify both replacement directions.
- [x] Obtain independent source clearance and report exact test evidence before refreeze.

SDK narrow-reopen evidence: the original A/B source regression failed before the fix with B's returned hash missing. All 20 writeRecovery source tests now pass, including stale-cache removal before a new reservation and legitimate replacement after readable exact CAS. Both touched TypeScript files pass Prettier, targeted no-emit type checking (zero diagnostics), and `git diff --check`. Independent final source/test reread reports no remaining finding. No build, package installation, staging or commit was performed by this owner; parent owns the full gates and updating the factual Web Locks inventory line from 313 to 327 before repackaging.
