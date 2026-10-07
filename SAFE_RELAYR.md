# Shared Safe execution lifecycle

Revnet Money and Juicebox Money use `@bananapus/nana-sdk-core/review/safe-relayr`
for the Relayr lifecycle of fully signed Safe executions. Their components keep
their own presentation. Their adapters supply project authority checks, wallet
access and storage translation.

## Ownership

The SDK owns preparation, saved selection matching, quote publication,
payment eligibility, payment transitions and read-only reconciliation. It uses
the existing Relayr proof helpers and Safe receipt decoder. Application adapters
must not decide whether an uncertain payment can be retried or a reservation
can be released.

An execution contains its exact Relayr entry and its chain, Safe address,
Safe transaction hash and nonce. Quote reuse compares the complete set of Safe
intents when recovering a funded session. Reservation checks compare chain,
Safe and nonce so another transaction cannot bypass funding recovery. An unused
quote is replaced with the current validated and explicitly reviewed selection;
additional owner signatures and changed chain selections do not force recovery.

Independent validation calls overlap. Request pacing remains at the clients'
RPC transport boundary; a slow response does not hold later chains in a worker
queue. Wallet interactions remain explicit and sequential.

## Persistence and recovery

Each adapter translates its existing journal into the shared session format and
saves transitions back into that journal. Application context carries the
project-specific checks and display metadata associated with frozen calls.

Publication intent is saved before posting a bundle. A lost publication response
is an unused quote attempt when its Safe calls are authentic, its payment status
is unfunded, and its payment history is empty with no observed funding or execution.
`canReplaceSafeRelayrQuote` owns this distinction. After validating and reviewing
the current selection, preparation rereads storage under the shared lock and
retires eligible old quotes as `quote-replaced` before saving the new quote. Old
tabs cannot pay those retired quotes. Rejected review leaves the old quote intact.

Payment intent is saved before invoking the wallet. A missing hash or an uncertain
wallet response is not proof of rejection. Observed remote funding or execution
is retained through `fundingObserved`, even if later responses omit it. Known
payment hashes still use canonical receipt and retry proofs. Storage failures
stop publication or payment before the external action.

Stores default to overlapping Safe reservations. A journal with one active slot
per Safe sets `scope: "single-session"`; the SDK then owns replacement of its old
selection even when the new selection uses disjoint chains. The adapter persists
lifecycle transitions before replacing its active slot, without deciding eligibility.

Saved paid bundles are checked by their original identities. Every destination
requires its exact canonical transaction and a successful, refund-free Safe
execution. Relayr's status text alone is not proof. Older records missing the
necessary immutable evidence remain available for read-only recovery.

A quote alone does not fund or execute a Safe transaction. Safe-native nonces and
live validation prevent repeated execution; unused quote attempts therefore do
not need expiry or old nonce-consumption proofs before replacement. Actual or
ambiguous funding remains protected. Reverted funding attempts use the existing
SDK payment retry and canonical expiry rules. Raw and forwarded Relayr
authorization policies are unchanged.

Preparation and checking never pay. Funding requires a current account, a
selected authenticated payment option, the application's exact-call review and
live revalidation immediately before sending. Cancellation invalidates the
pending preparation result; it does not erase publication or funding evidence.

The optional `onProgress` observer reports review, quote and payment phases, plus
each execution's pending, confirming, executed or failed state and known hash.
Quoting begins after accepted review. Notifications receive independent copies;
observer errors cannot interrupt funding or alter the journal. A failed Relayr
status is reported as such, but only an exact canonical receipt, matching Safe
success event and the application's postconditions can report executed.

Destination checks run independently as hashes arrive. Each successful chain is
reported immediately; a slower chain does not hide that progress. Receipt or
transaction lookup lag and reorg uncertainty are `RelayrProofUnavailableError`,
which leaves the original bundle pending for the existing bounded `watch` loop.
An application postcondition may use the same type for unavailable RPC evidence;
a proven nonce mismatch or other contradiction must remain an error. Watch
timeouts retain records and payment history for a later read-only check, never a
new payment. Every check re-proves receipts; display progress is not authority.

Relayr HTTP errors keep their status prefix and prioritize the error variant,
chain and reason over transaction calldata. The non-enumerable error cause
retains the original response up to 64 KiB, with an explicit truncation marker
beyond that limit. This improves diagnosis without inferring why Relayr's
simulation disagreed with a local check.

## Client integration before publication

Build a self-contained preview from this source with:

```sh
node scripts/pack-deployment-preview.mjs "$SDK_ROOT" "$OUTPUT_DIRECTORY" safe-lifecycle
```

The existing preview packer rebuilds ESM and CommonJS output and records the
source revision, per-file source hashes, aggregate digest and tarball integrity.
Both apps install the same tarball through a relative `file:vendor/...` dependency.
This avoids a link to a developer's checkout or a dependency on an unpublished
registry version. After the changeset release, replace both preview dependencies
with the same published SDK version and run the same adapter tests.

The SDK tests exercise lifecycle decisions once. Each application's tests
exercise its legacy journal translation, current authority checks, wallet and
review adapters, and modal cancellation/account behavior. Their source boundary
checks keep the shared controller in the actual execution path.
