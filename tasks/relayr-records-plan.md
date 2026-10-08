# Shared Relayr destination records

- [x] Extract the existing destination matcher without changing hash acceptance, error classes, messages or validation order; run its destination-proof regressions.
- [x] Export bound destination records before hashes arrive, using the same matcher and duplicate-hash rule; cover Homerun's complete matching acceptance set.
- [x] Run the focused Relayr suite and formatting/diff checks; hand off the public API to the app and package owners.

## Plan refinement

- **Objective:** Remove Homerun's duplicate destination-record policy by exposing bound records in SDK binding order, including records whose transaction hashes are not ready, while retaining the existing hash API's exact behavior.
- **System fit:** The SDK authenticates quote identity and signed-call bindings; Homerun consumes these untrusted status records for progress and still requires canonical receipt proof before success. This read-only extraction grants no signing, payment, recovery-release or deployment authority.
- **Reuse and simplicity:** Reuse relayr.ts UUID, entry, request, account and hash validators. Extract one ordered matcher and one duplicate-hash guard before adding the record API; a generator preserves the hash API's early missing-hash error before a later record mismatch, without exposing a mode flag or copying matching logic.
- **Evidence and unknowns:** SDK core2.24.5 relayrDestinationHashes is the compatibility baseline; Homerun src/lib/relayr.ts relayrDestinationRecords and test/relayr-quote-binding.test.ts define hashless matching behavior. No descendant AGENTS.md or SDK lessons file exists; workspace AGENTS.md, workflow/ponytail/SKILL.md, workflow/ponytail/README.md, docs/PLAN_REFINEMENT.md and the acceptance-set lesson in tasks/lessons.md apply. Other SDK writers own unrelated files and release qualification.
- **Verification:** Regress exact record inventory, request/UUID fallback, null requests, same-chain virtual nonce ambiguity, malformed bindings, optional account checks, missing/malformed hashes, case-insensitive duplicate hashes and mixed-error precedence; run Relayr destination-proof tests after extraction and the complete relayr.test.ts suite after the new API. The package owner runs combined typecheck, coverage, public-surface and build gates.
- **Resource budget:** Edit only packages/core/src/review/relayr.ts, its tests and this plan; use installed Node22.23.1 and physical locked dependencies, with no installs, package edits or network service requests. Share API early with the app/public-surface owners and replan if any compatibility difference appears.

## Review

Added `relayrDestinationRecords({ bindings, records, account? }): RelayrTransactionRecord[]`. One ordered matcher and one duplicate-hash guard serve both public APIs. Missing/malformed hashes remain pending progress for records; the hash API retains its exact existing errors, including an earlier missing hash taking precedence over a later mismatched call or duplicate available hashes. The record API preserves original record objects and validates the whole inventory before returning any result.

Node22.23.1 verification: the behavior-preserving extraction passed35 existing destination-proof tests before the new API was added. The completed `npm run test --workspace @bananapus/nana-sdk-core -- src/review/relayr.test.ts` passes365 tests. The first full attempt passed359 tests but its localhost HTTP fixture was blocked by sandbox `listen EPERM`; the identical suite passed with local-listen permission. Core `tsc --project tsconfig.test.json`, Prettier and scoped `git diff --check` pass. Combined SDK typecheck, coverage, public-surface, build and release qualification remain with the package owner; this task changes no manifests, generated files or installed dependencies.
