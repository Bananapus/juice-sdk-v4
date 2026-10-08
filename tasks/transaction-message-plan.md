# Shared transaction message presentation

## Plan refinement

- **Objective:** Give all four clients one presentation-only formatter for execution-service diagnostics while preserving simulation reasons, pending-payment uncertainty, recovery guidance and untouched original evidence.
- **System fit:** SDK review owns neutral display wording; apps retain error selection, wallet rejection wording, persisted errors and transaction authority. The formatter receives and returns strings without mutating Error objects, journals or execution status. Existing app presentation consumers keep their import paths as aliases.
- **Reuse and simplicity:** Extract Revnet's existing formatter into the SDK review barrel first, then reconcile the demonstrated Juicebox additions in that owner. Preserve Revnet's URL/identifier boundary protection and article correction; include Juicebox's second simulation failure code, reported wording, curly apostrophe and action vocabulary. No dependency, parser, new UI, or duplicate formatter remains.
- **Evidence and unknowns:** Source inspection disproved an initial identical-copy assumption: Revnet src/lib/utils.ts and Juicebox src/lib/transaction-message.ts differ in these bounded presentation rules. Their existing errors.test.ts and wallet-error.test.ts provide both acceptance sets. Root owns exact SDK packaging and physical app dependencies; local code alone is not proof of a publishable package.
- **Verification:** Run an SDK table covering both clients' source rules, idempotence, HTTP failure distinctions and URL/identifier preservation; existing client error tests verify diagnostic objects/journals remain unchanged. Re-run app source checks and affected Safe/transaction callers. SDK owner owns full coverage/type/build/package gates and public export accounting.
- **Resource budget:** One reserved SDK source/test/barrel change alongside coordinated disjoint owner work. First validate unchanged Revnet extraction, then reconcile only the known additions and rerun both acceptance sets. No package installation, release or remote mutation; replan for any change to money/recovery policy.

- [x] Extract and check existing Revnet formatter behavior.
- [x] Reconcile Juicebox presentation cases and migrate both existing consumers.
- [ ] Run focused SDK/client checks and hand off precise evidence.

Review: unchanged Revnet extraction passed 15 acceptance cases. Five additional Juicebox cases failed before reconciliation, then all 22 passed. Focused SDK coverage is 100% statements/branches/functions/lines. Existing app aliases now import the owner; app regressions wait for root-staged exact SDK preview. No SDK Error or journal mutation is introduced. Shared SDK owner owns final publicSurface export list, coverage threshold, module builds and package size attribution.
