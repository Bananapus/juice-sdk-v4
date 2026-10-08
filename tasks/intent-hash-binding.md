# Bind Center intent signatures to the reviewed envelope

## Plan refinement

- **Objective:** Preserve Sticky's existing protection when its listing migrates to shared SDK publication: the signer receives only the exact returned envelope's canonical content hash, and a returned publication must name that same hash.
- **System fit:** `publishSignedIntent` owns intent snapshot, remote preparation, signing and publication; Sticky and Homerun consume it. Server preparation is untrusted evidence, the adapter retains wallet authority, and an invalid publication response must remain an error rather than become a launch/recovery identifier.
- **Reuse and simplicity:** Extend the existing canonical JSON owner in `jbcenter/publish.ts` to support exact case-preserving Center hashing, keeping its existing case-insensitive envelope comparison. Reuse viem keccak256/toBytes; retain caller template support and snapshot semantics. Publish the exact compared-and-hashed prepared-envelope snapshot, as legacy does, so accepted hex casing cannot make the posted payload differ from the signature. Check only the legacy post-publication content-hash identity alongside existing response shape validation.
- **Evidence and unknowns:** A read-only Node22 reproduction invoked the SDK signer for an arbitrary server hash despite an unchanged envelope; legacy `webclient/center-intents.js` rejects that exact case. Authoritative `extensions/jbcenter/src/intent.ts` hashes UTF-8 key-sorted JSON preserving string case and array order. No live requests or wallet signatures are needed.
- **Verification:** Add failing-before wrong-hash plus matching-message and mismatched publication regressions; replace arbitrary fixture hashes with exact canonical hashes; retain checksum, sorting, text-case, snapshot, template and abort tests. Match a fixed legacy Unicode/hash vector and integer-like key ordering, then require publish.ts 100 percent coverage and core production/test type checks. Parent runs combined build/package gates.
- **Resource budget:** One writer limited to publish.ts/tests and this plan; bounded local source/fixture reads. No new exports, dependencies or network mutation. Replan only if published response normalization contradicts the documented exact hash contract.

- [x] Record failing-before acceptance regressions.
- [x] Bind preparation and publication to the exact canonical envelope hash.
- [x] Verify focused coverage/types and report package rebuild needs.

## Review

Both attacker regressions failed before the fix (`/private/tmp/sdk-intent-hash-before.log`). All 16 focused tests now pass, including the independently pinned legacy Unicode/checksum hash, integer-like key ordering and deferred-signer response mutation; publish.ts retains 100 percent statements, branches, functions and lines. Core production TypeScript passes; test TypeScript reported no intent errors and one concurrent contractWrite.test.ts mock-return error, handed to its owner for the combined rerun. `git diff --check` passes. Parent owns combined final coverage/build/package checks and restaging the final SDK preview. No live service or wallet mutations.
