# Final Relayr wallet refusal

Required workspace resources: `/Users/jango/Documents/jb/v6/evm/AGENTS.md`, `workflow/ponytail/SKILL.md` and `README.md`, `docs/PLAN_REFINEMENT.md`, root `tasks/lessons.md` and current root plan. No SDK descendant instructions. Branch `codex/client-final-wallet-guards-20261008`, baseline `cabf58e`; Node 22.23.1/npm 10.9.8.

## Plan refinement

- **Objective:** Preserve a safe retry when an app's synchronous final wallet guard refuses after durable `onSending` completes but before any wallet invocation. Never reinterpret actual wallet uncertainty or a known payment as unsent.
- **System fit:** App adapters own live account, chain, connector, view-as and quote checks; SDK `relayrPaymentAttemptOutcome` owns durable payment outcome classification, and `safeRelayr` owns Safe session restoration. The typed refusal connects a proven pre-wallet refusal to those existing recovery owners. Review, payment proof, destination execution and actual wallet error policies remain unchanged.
- **Reuse and simplicity:** Add one exported error to the existing Relayr owner, preserve its original cause using the existing nonenumerable helper, and reuse the existing outcome classifier in the Safe controller. Consumers wrap only their synchronous final guard, never awaited persistence or wallet calls. No new module, dependency, journal schema or classifier copy.
- **Evidence and unknowns:** Juicebox's awaited `onSending` can outlive its last wallet check. A plain guard error leaves the saved marker pending even though no wallet call occurred. Reproduce with owner tests before changing behavior; class-name strings, serialized errors and nested causes must not acquire this authority. The unchanged-payment-history condition must still prevent a typed refusal from erasing a reported payment.
- **Verification:** Add failed-before classifier/controller cases for first and previously paid attempts, original diagnostic preservation, no-marker refusal, spoofed/nested errors and a reported new payment. Run focused full owner coverage, source/test types, all existing core coverage if required, public exports, format/dead-code/wallet/package/generated gates, ESM/CJS builds and measured package comparison. Root qualifies all consumers on the final official package; this artifact is an explicit preview only.
- **Resource budget:** One SDK writer, three independent app adapters. Keep source coverage separate from ABI-generating build/type commands. Reuse the physical locked dependency graph and current package attribution, adding only measured artifact growth. Root owns commit, PR and release. No actual wallet transaction.

## Work

- [x] Reproduce classifier and Safe-controller refusal failures before implementation.
- [x] Add shared typed refusal and migrate both recovery owners without changing wallet uncertainty semantics.
- [x] Run owner, type, export and package gates; hand off a qualified preview and exact evidence.

## Review

The constructor was introduced first without changing recovery behavior; three financial expectations then failed because the classifier returned unknown and the Safe controller kept first/retry attempts pending (`/private/tmp/sdk-relayr-final-guard-before.log`). After the narrow classifier/controller change, all 2,212 core tests pass; Relayr owner coverage remains 100% in all categories, and the existing Safe controller retains 98.92% lines/94.14% branches/100% functions with all changed branches exercised. New cases prove typed first/retry refusal, preserved hidden diagnostics, no-marker behavior, named/serialized/nested lookalikes, and refusal after a reported hash. Existing actual wallet rejection, ambiguous reply and canonical payment proof behavior remains covered.

All three workspace production/test type checks, ESM/CJS and consumer builds, public export tests, format ratchet, dead-code, wallet boundary, generated-file and five example checks pass. React and connect coverage suites pass independently. The first build attempt omitted the required Sticky artifact environment and failed before generation; its log is retained, and the qualified build uses the same pinned Sticky and deploy-all sources as the preceding release qualification. Coverage and build were serialized. Logs are `/private/tmp/sdk-relayr-final-guard-*.log`.

Qualified preview 3 is `/private/tmp/sdk-client-reconciliation-qualified-preview3/bananapus-nana-sdk-core-2.24.5.tgz`, integrity `sha512-ViaQFhNfQ3kg1/pOdlM69wafbdx4a3ZUhZ5Bd7yrJolFPbDV9dmZrXTL+bMpH6Lptt+0EyVW3v4XwoFbEbH10Q==`; exact source hashes and package comparison are beside it. This is still a preview, not the official 2.25 release. Compared with the preceding qualified preview, fourteen existing artifacts change, no files are added/removed, and growth is 939 bytes packed/3,650 unpacked. Measured package size is 1,293,389 packed/20,814,576 unpacked/762 entries; the measured narrow package caps pass. No dependencies changed.

Root reviewed the Safe controller's full-lifecycle `withLock` contract and strict cumulative `onSent` history boundary; no speculative second storage/CAS protocol was added. Raw app journals outside that controller retain their exact-marker comparison. Root owns the commit, version PR, official publication and consumer qualification; no wallet invocation or remote write was performed here.

## Plan refinement

- **Objective:** Ensure an already invoked wallet cannot claim the authority of a local pre-wallet refusal by returning `RelayrPaymentNotSentError`; every such wallet result remains ambiguous.
- **System fit:** The actual wallet-call catch passes its error through the existing Relayr module before the unchanged outcome classifier. The local final guard continues creating the typed refusal, and known payments, journals and canonical retry proof retain their existing owners.
- **Reuse and simplicity:** Add one `relayrWalletPaymentError(error)` export using the existing private hidden-field helper. Return every ordinary error unchanged. A branded wallet error becomes a plain Error with hidden `walletError` diagnostics, not `cause`, so a nested rejection code cannot regain unsent authority. No executor abstraction, new module, error class, state or dependency.
- **Evidence and unknowns:** Final RN consumer review reproduced that directly classifying a wallet-thrown typed instance releases its marker. The rejection classifier traverses causes, so preserving that instance as `cause` would still allow nested code 4001 to release it. JBM, Revnet and Homerun adopt the shared normalizer at their actual wallet catches. Baseline is release branch `codex/client-sdk-release-20261008` at `f9c1e68`, pending core 2.25.0.
- **Verification:** Regress actual typed wallet errors with normal and nested-rejection causes as ambiguous, hidden diagnostic preservation, ordinary error/rejection identity and the unchanged local refusal behavior. Run owner coverage, public export, all types/builds and measured package gates, then hand off preview 4; root owns PR updates and official release.
- **Resource budget:** A bounded single-module correction plus its owner/export tests and existing 2.25 changelog, without a new changeset. Serialize source coverage and generation/build; reuse locked physical dependencies. No app source edits or wallet calls by this SDK owner.

- [x] Add and verify the shared actual-wallet error normalizer.
- [x] Qualify preview 4 and hand off exact source/package identity.

### Invoked-wallet normalization review

An initial identity export preserved the previous propagation behavior; both branded-wallet regressions then failed with `unpaid` instead of unknown, including the nested code-4001 case (`/private/tmp/sdk-relayr-wallet-error-before.log`). The final owner has 100% coverage in every category and all 2,215 core tests pass. Ordinary errors/rejections retain object identity; local guard refusals remain retryable, while normalized invoked-wallet errors preserve hidden diagnostics and cannot traverse the rejection cause chain.

All workspace production/test types and builds pass, along with public surface, package, generated-file, format ratchet, wallet boundary, dead-code and five example checks. The unchanged React/connect suites passed 153/35 tests in the immediately preceding qualification; this correction adds only the unused-by-those-packages Relayr export and its tests. No source coverage ran alongside generation. Logs are `/private/tmp/sdk-relayr-wallet-error-*.log`.

Qualified preview 4 is `/private/tmp/sdk-client-reconciliation-qualified-preview4/bananapus-nana-sdk-core-2.25.0.tgz`, integrity `sha512-DeJMW245XZq1QUs+0zzgE8E8ETah+s+D7QxJoh0KG5uTzyrQh3Jn3EWDRh69f/hi6mTOBCMR1txt8TWUf0RoMA==`, source aggregate SHA-256 `0bcbe3b5940488d6cca7f34cbbc2cab78e5151cb4f9f7125a5741de48396c44e`. It is not yet an official release. Relative to preview 3, only the eight existing Relayr artifacts and the 2.25.0 package manifest change, with no new files/dependencies: +630 bytes packed/+2,065 unpacked. Measured package size is 1,294,019 packed/20,816,641 unpacked/762 entries; narrow measured caps pass. Root owns the existing version PR update and publication.
