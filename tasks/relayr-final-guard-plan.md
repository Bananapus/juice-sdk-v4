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
