# Reviewed write final synchronous gate

## Plan refinement

- **Objective:** Refuse wallet writes when app scope, selected chain or connection route changed during any asynchronous preparation, including durable intent persistence; preserve uncertain wallet submissions and product journals.
- **System fit:** Existing SDK submitReviewedContractWrite owns review, account checks, simulation and durable-intent cleanup. Add one synchronous beforeSend callback at its final boundary so app adapters supply live chain/view-as/Safe-route evidence after all awaits and the signing-phase callback. SDK owns cleanup if final validation aborts before write; apps retain their actual wallet state providers.
- **Reuse and simplicity:** Reuse beforeWrite/onBeforeWriteAborted and existing account guard. Move final account validation after onPhase signing, run beforeSend synchronously immediately before write, and remove local duplicated pre-write cleanup from consumers. Do not introduce a chain registry, wallet framework dependency or asynchronous final gate.
- **Evidence and unknowns:** JBM currently checks Safe-route drift inside write but not current chain/view-as after awaited preparation; RN and Homerun reproduce equivalent final-window gaps. Current SDK guard runs once and account checks precede the externally supplied signing-phase callback. Root explicitly approved this bounded shared fix and app adoption. Existing uncertain-error/rejection tests define which intent can be cleared.
- **Verification:** Regress beforeSend refusal both with and without persisted intent, phase-callback account changes, cleanup exactly once only before wallet invocation, no onWriteRejected on gate refusal, and continued intent retention for ambiguous wallet errors. Require 100% focused owner coverage and types, then app delayed chain/view-as/Safe drift tests plus existing wallet suites. SDK owner reruns all gates and packages final source after this change.
- **Resource budget:** Reserved SDK contractWrite.ts/test.ts only plus JBM hook/tests; RN/Homerun/Sticky owners adopt API independently. No installed graph changes here. Root controls final exact SDK preview/publication and sequential build/browser gates. Replan if synchronous callback cannot express the final evidence or cleanup semantics change.

- [x] Add final shared synchronous gate and regression evidence.
- [x] Adapt JBM and notify the other framework adapter owners.
- [ ] Run focused SDK/app tests and record exact evidence.

Review checkpoint: six new SDK regressions fail on the prior implementation, then all26 pass after the final gate, with100% statements/branches/functions/lines for contractWrite.ts. Core production and test type checks pass. Logs are /private/tmp/sdk-client-final-write-before.log, sdk-client-final-write-after.log and sdk-client-final-write-types.log. JBM four delayed simulation/persistence chain/view-as cases also fail before its adapter migration; final rebuilt package must be staged before the after run. Root/SDK owner continues full gates, final exact package and client qualification.
