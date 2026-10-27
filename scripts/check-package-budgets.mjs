import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { build } from "esbuild";

const repositoryUrl = "https://github.com/Bananapus/juice-sdk-v4";
const budgets = {
  "@bananapus/nana-sdk-core": {
    directory: "packages/core",
    // Includes the public Bendystraw transport, supported-chain definitions,
    // Permit2 helpers, the viem error discriminators, the
    // price-feed reachability probe, the Uniswap V4 LP-split-hook ABIs, and
    // tree-shakable loan/deployment and JB Center entry points in both ESM and
    // CJS formats, plus the router gateway, ratio feed, and preserved router/
    // buyback ABI generations required by projects that have not migrated.
    // The /safe entry point adds eight ESM/CJS JS/declaration/map artifacts.
    // The JB Center intent decoder, merger, and deploy pre-step add
    // twenty-four more, and its guarded publish and refusal wording sixteen.
    // The intent setup-call grouping adds eight more, and the pinned Safe
    // proxy creation code adds about two kilobytes to four of them. The five
    // Sticky ABIs and addresses raise the unpacked budget, and the Sticky
    // split helpers add two entries and about ten kilobytes. Sticky's ERC-2771
    // trusted-forwarder views add about four kilobytes unpacked. The shared
    // web-client runtime (/review, the Safe service helpers,
    // /bendystraw-operations and /v6/fee-buyback) adds seven source files,
    // fifty-six artifacts and about two hundred kilobytes unpacked. The review
    // decoders on their own /review/decode entry point, the receipt fallback
    // and the raw preflight add three source files, twenty-four artifacts,
    // about 237 kilobytes unpacked and 48 kilobytes packed. The Relayr quote
    // binding, payment checks and payment and destination proofs on their own
    // /review/relayr entry point add one source file, eight artifacts, about
    // 179 kilobytes unpacked and 31 kilobytes packed. The decoder's eleven
    // generated ABIs, each in a module of its own so a page loads only the
    // ABIs it uses, add eleven source files, eighty-eight artifacts, about 36
    // kilobytes unpacked and 22 kilobytes packed. The Safe authority, queue
    // and execution checks on /safe and /safe-service, the distribution
    // verifiers on /v6 and the shared untrusted-input readers add two source
    // files, sixteen artifacts, about 377 kilobytes unpacked and 72 kilobytes
    // packed (measured 1,139,349 B packed, 20,075,303 B unpacked, 682 files).
    // Loading the decoder and the distribution checks without running
    // anything splits two modules into sixteen more artifacts, and the
    // creation proof with the pinned 1.3.0 proxy creation code, the contract
    // signature encoding and the refund and row checks add about 48 kilobytes
    // unpacked and 14 kilobytes packed (measured 1,153,389 B packed,
    // 20,123,016 B unpacked, 698 files).
    // Deployment diagnostics, shop preparation and overload selection add
    // three source modules and 24 ESM/CJS artifacts.
    // The checks the web clients wrapped (MultiSendCallOnly 1.4.1, the Safe
    // service's signal and 429 rules, the reviewed account before review,
    // Relayr's checksum, quote expiry, retry refusals, bundle read and unpaid
    // guard, the JB Center provider's signal and the shared Retry-After
    // reader) add no files and, mostly in documentation, about 45 kilobytes
    // unpacked and 10 kilobytes packed (measured 1,177,461 B packed,
    // 20,281,267 B unpacked, 722 files).
    // The Safe execution wait's not-found rule (only viem's not-found counts
    // toward giving up) and its signal (an abort ends a chain look in flight)
    // add no files and, mostly in documentation, about 9.5 kilobytes unpacked
    // and 2.5 kilobytes packed (measured 1,180,514 B packed, 20,293,611 B
    // unpacked, 722 files).
    // JB Center's node-lag retry, the shared abortable wait and the JB Center
    // rate-limit module (the limiter, its guard against a request asking it
    // for another, and the refusal readers the web clients copied) add two
    // source modules, sixteen artifacts, about 47 kilobytes unpacked and 8
    // kilobytes packed over the Safe wait fix (measured 1,189,051 B packed,
    // 20,342,557 B unpacked, 738 files).
    // The Relayr session rules Juicebox Money built (rulings R104, R114 and
    // R117: requests classified at a canonical finalized block, their
    // verdict, what the session does next, the forwarder-nonce reservation and
    // the signed-request reader) add no files and about 52 kilobytes unpacked
    // and 14 kilobytes packed, about half of it documentation repeated in the
    // ESM and CJS JavaScript and declarations (measured 1,203,010 B packed,
    // 20,395,254 B unpacked, 738 files).
    // The session rules' review fixes and ruling R118's recheck rule (a node
    // that could not answer reads as unchecked; revert data on any JSON-RPC
    // code reads as changed) add no files and about 8 kilobytes unpacked and
    // 3 kilobytes packed, mostly documentation (measured 1,205,816 B packed,
    // 20,403,617 B unpacked, 738 files).
    // Ruling R104's quote-release and payment-attempt rules (the sent-payment
    // journal, the option a quote is paid again with, a failed attempt's
    // outcome, the paid quote's clock, the quoted options and a reverted
    // quote's release) add no files and 46,326 bytes unpacked and 17,123 bytes
    // packed, about a third of it documentation, repeated in the ESM and CJS
    // JavaScript and declarations (measured 1,222,939 B packed, 20,449,943 B
    // unpacked, 738 files).
    // The retry rule over a quote's sent payments (grouped by the option each
    // used) and the saved payment's proof on resume add no files and 14,148
    // bytes unpacked and 2,187 bytes packed (measured 1,225,126 B packed,
    // 20,464,091 B unpacked, 738 files).
    // Their review's guards (a saved deadline bound to its calldata's, a
    // release holding another bundle's payment or an unreadable time, the
    // clock read after the bundle, and a retry list read as a journal) add no
    // files and 4,870 bytes unpacked and 911 bytes packed (measured 1,226,037 B
    // packed, 20,468,961 B unpacked, 738 files).
    // The shared Safe Relayr lifecycle replaces both clients' preparation,
    // funding and recovery rules. Its one source module adds eight compiled
    // artifacts: measured 1,244,411 B packed, 20,606,456 B unpacked, 746 files.
    // Retain the existing narrow rounding margin and all other package limits.
    // Finalized nonce recovery and structured recovery results add no files:
    // measured 1,251,517 B packed and 20,628,836 B unpacked (746 files).
    // Safe-only unused quote replacement and sticky funding evidence add no
    // files: measured 1,259,012 B packed and 20,645,481 B unpacked (746 files).
    // Bounded HTTP diagnostics and independent Safe destination progress add
    // no files: measured 1,268,545 B packed and 20,695,695 B unpacked (746 files).
    // The shared project activity display grouping adds eight artifacts:
    // measured 1,270,129 B packed, 20,703,967 B unpacked, 754 files.
    // Authenticated wrapped funding and Safe post-send recovery change only
    // sixteen existing JS/declaration/map artifacts: +4,962 B packed and
    // +21,043 B unpacked against published 2.24.4, with no new dependencies,
    // files or test fixtures. Retain narrow rounding: measured 1,275,091 B
    // packed, 20,725,010 B unpacked, 754 files.
    // Shared Safe app confirmation/pending-call helpers, early Relayr record
    // binding and paced request admission modify fifty-six existing artifacts.
    // Intent hash authentication and final pre-send guards are included.
    // The presentation-only message formatter adds eight ESM/CJS artifacts.
    // Against official 2.24.5: +17,359 B packed and +85,916 B unpacked, with
    // no new dependencies or bundled tests. Measured 1,292,450 B packed,
    // 20,810,926 B unpacked and 762 files; retain narrow rounding margins.
    // The typed post-persistence, pre-wallet Relayr refusal changes existing
    // artifacts only: +939 B packed / +3,650 B unpacked. Measured 1,293,389 B
    // packed / 20,814,576 B unpacked; keep the same narrow rounding policy.
    // Invoked-wallet normalization adds 630 B packed / 2,065 B unpacked,
    // changing only eight Relayr artifacts and the 2.25.0 manifest version.
    // Measured 1,294,019 B packed / 20,816,641 B unpacked, still 762 entries.
    // Destination-bound Sticky collector identity, route qualification and
    // review decoding reuse existing modules and add no artifacts/dependencies.
    // Explicit builder return types avoid repeating the ABI in declarations.
    // Measured 1,309,865 B packed / 20,942,912 B unpacked, still 762 entries
    // (+15,846 B packed / +126,271 B unpacked against 2.25.0).
    // Durable reviewed-write recovery adds one source module/eight artifacts
    // (+73,986 B unpacked). Shared mint readiness, collector transport checks,
    // Safe evidence checks and submission callbacks change forty existing
    // artifacts (+25,924 B unpacked). No dependencies or test fixtures added.
    // Against official 2.26.0: +20,718 B packed / +99,910 B unpacked;
    // measured 1,330,583 B packed / 21,042,822 B unpacked and 770 entries.
    // The returned-hash cache conflict guard changes six writeRecovery JS/map
    // artifacts only: +192 B packed / +1,574 B unpacked, no files/dependencies.
    // Measured 1,330,775 B packed / 21,044,396 B unpacked and 770 entries.
    // Defifa inventory adds one module/eight artifacts, no dependencies.
    // Measured 1,336,739 B packed / 21,087,436 B unpacked and 778 entries
    // (+5,964 B packed / +43,040 B unpacked against 2.27.0).
    // Allow narrow rounding and the pending minor-version changelog entry.
    // Native Defifa actions, bounded holdings and the shared deployment registry
    // add three modules/24 artifacts. Existing decode/index/nftInventory and
    // reviewed-write recovery artifacts also change. Against official 2.28.0:
    // +23,082 B packed / +180,785 B unpacked, no dependencies or tests.
    // Measured 1,359,821 B packed / 21,268,221 B unpacked and 802 entries.
    // Retain narrow release-note margin.
    // Ruling R119's release rules (exact-call write holds released on nonce
    // proof or the user's wallet check, the per-tab lock fallback, Safe
    // proposal ends proven by execution logs, the wrapped-payment release) and
    // the shared held/discard copy add one module (messages) and eight
    // artifacts, no dependencies: +11,269 B packed / +69,692 B unpacked.
    // Measured 1,371,090 B packed / 21,337,913 B unpacked and 810 entries.
    // The review fixes (proof bound to the sent nonce and chain, the IndexedDB
    // lease shared by tabs without Web Locks, the Safe nonce search for the
    // block that used a proposal's nonce) change existing artifacts only:
    // +11,150 B packed / +30,807 B unpacked, no files or dependencies.
    // Measured 1,382,240 B packed / 21,368,720 B unpacked and 810 entries.
    // The ID-keyed release marker behind the lock-free user exit (a stale
    // exit can't erase a newer write; a memory-only hash still exits) adds
    // +1,911 B packed / +9,252 B unpacked to existing artifacts.
    // Measured 1,384,151 B packed / 21,377,972 B unpacked and 810 entries.
    // The 2-hour request deadline and its helper, the quote's request
    // deadline (read from a restored quote's bindings too) and the 30-minute
    // run margin on payment options change existing artifacts only, no files
    // or dependencies. With the 2.30.0 changelog entry and the binding checks
    // (each entry's chain, forwarder calls told apart by function): measured
    // 1,388,807 B packed / 21,398,286 B unpacked and 810 entries.
    // The write hold controller every app's send hook adopts (ruling R119:
    // one owner for held writes, replacing four app copies) adds one module
    // (writeHold) and eight artifacts. The tab-shared held-write storage, the
    // proven-execution record fields, the dropped-nonce evidence and the
    // Safe proposal end with its execution's transaction change existing
    // artifacts. No dependencies: +23,245 B packed / +132,407 B unpacked.
    // Measured 1,412,052 B packed / 21,530,693 B unpacked and 818 entries.
    // The rulings on its two dead ends (a hash unseen 30 minutes after the
    // wallet returned it gets the exit; an at-once Safe execution whose own
    // transaction reverted settles as failed once final) change existing
    // artifacts only: +1,071 B packed / +5,286 B unpacked. Measured
    // 1,413,123 B packed / 21,535,979 B unpacked and 818 entries. The repair
    // paths (a record without a starting block, and a first-seen clock for
    // hashes saved by 2.31, which Homerun already shipped) add 1,264 B packed
    // and 6,820 B unpacked to existing artifacts. Measured 1,414,387 B packed /
    // 21,542,799 B unpacked and 818 entries. The review's fixes (tab-shared
    // durable evidence, the saved Safe proposal nonce and its service-free
    // proof, execution logs bound to the canonical block, rechecked saved
    // executions and the hashed exit's warning) change existing artifacts
    // only: +3,469 B packed / +20,317 B unpacked. Measured 1,417,856 B packed
    // / 21,563,116 B unpacked and 818 entries. Reconciling a direct Safe
    // execution reorganized away (its sender and nonce saved, the shared
    // nonce search) adds +2,418 B packed / +14,694 B unpacked to existing
    // artifacts. Measured 1,420,274 B packed / 21,577,810 B unpacked, 818.
    // Settling from what that replacement did (its own Safe execution of the
    // reviewed call) adds +967 B packed / +8,570 B unpacked. Measured
    // 1,421,241 B packed / 21,586,380 B unpacked and 818 entries. Rounds 4
    // to 6 (no automatic release of a replaced Safe write, no release on an
    // effect read, speed-ups adopted only at the authenticated sent nonce,
    // and that nonce bound only from the saved hash's own transaction) left
    // the measure at the edge (1,422,125 B packed / 21,590,464 B unpacked,
    // 818 entries); this margin gives the next fix room.
    // Recording a Safe follower's unproven end (onUnproven, the
    // safe-unproven state and its line) and the 2.32.0 changelog entry
    // change existing artifacts only. Measured 1,423,114 B packed /
    // 21,600,393 B unpacked and 818 entries.
    // The vanished-hash exit (vanishedAt, its finalized nonce check) and the
    // 2.33.0 changelog entry change existing artifacts only: measured
    // 1,424,541 B packed / 21,611,522 B unpacked and 818 entries, so the
    // margin is raised for the next change.
    // The write hold's kept settlement (bound to the reservation it settles),
    // the known-pending hash check, app-reported execution candidates and
    // the subscriber replay change existing artifacts only: measured
    // 1,433,153 B packed / 21,637,566 B unpacked and 818 entries. The review
    // round (one exit gate over every seen hash, candidates authenticated on
    // arrival, a verified latest marker, replay checked against the current
    // record and keyed by scope, and attachHash) measured 1,436,332 B packed
    // / 21,653,998 B unpacked and 818 entries.
    // Round 4 (three-valued candidate evidence, no candidate cap, attempt-bound
    // attachHash, settlement identity through rejection and replay, and the
    // canonical cancellation past the pending gate) measured 1,438,735 B
    // packed / 21,665,498 B unpacked and 818 entries; raised for headroom.
    // Rounds 5 to 7 (attach evidence, the mined clock per seen hash, and a
    // proven Safe execution settled from its canonical log) measured
    // 1,441,392 B packed / 21,683,809 B unpacked and 818 entries.
    // Write intents (writeIntentKey and its tags, one module and eight
    // artifacts), legacy-hold adoption and the reservation id on every state
    // measured 1,447,165 B packed / 21,722,125 B unpacked and 826 entries.
    // Delegating to legacy holds in place, in place of adopting them,
    // measured 1,453,822 B packed / 21,726,999 B unpacked and 826 entries.
    // Mutual exclusion with the legacy keys (sorted locks for the reserve,
    // mirror records, the exact-call handle's delegation) measured
    // 1,458,340 B packed / 21,752,155 B unpacked and 826 entries.
    // The reserve taking every lock in order, mirror-aware delegates and
    // evidence-free mirrors measured 1,461,348 B packed / 21,766,711 B
    // unpacked and 826 entries.
    // Stale-review generations, kept last records, the memory-only notice and
    // the unknown-read clock measured 1,464,159 B packed / 21,782,309 B
    // unpacked and 826 entries.
    // Legacy matches, test resets, adoption and MultiSend batch holds
    // measured 1,475,092 B packed / 21,830,136 B unpacked and 826 entries.
    // The test-only entry and its shared tab state, Safe nonce attachment and
    // bounded Safe-service reads measured 1,480,925 B packed / 21,861,181 B
    // unpacked and 842 entries.
    // With Safe Relayr's three-valued status reads, sticky funding evidence
    // and its warned exits: 1,494,786 B packed / 21,923,025 B unpacked.
    // The shared intent builders (review/intents) and the candidate unseen
    // window measured 1,498,599 B packed / 21,950,472 B unpacked and 850
    // entries.
    // The shared held-write view, its follower and hold.list measured
    // 1,513,496 B packed / 22,049,060 B unpacked and 858 entries.
    // With the away-success gate, acknowledgement and the bounded Safe
    // nonce wait: 1,518,154 B packed / 22,074,641 B unpacked; with legacy
    // settlements through intents and listing-only Safe clocks, 1,521,404 B
    // packed / 22,090,603 B unpacked; with the separate send gate, 22,113,761 B
    // unpacked.
    // The saved-attempt recovery engine (review/savedAttempt, its 8
    // artifacts), the rejected-reservation marker, strict storage reads and
    // the check copy measured 1,542,890 B packed / 22,244,040 B unpacked and
    // 866 entries.
    // The held-write React hooks, moved from nana-sdk-react to their own
    // /review/react entry point (five modules, 40 artifacts), measured
    // 1,554,581 B packed / 22,328,075 B unpacked and 906 entries.
    // useHeldSend and the hooks' shared view actions (two modules, 16
    // artifacts) with five intent builders measured 1,559,165 B packed /
    // 22,368,314 B unpacked and 922 entries.
    // Verified Sticky source/home families add one generated module (eight
    // ESM/CJS artifacts): 1,567,282 B packed, 22,498,259 B unpacked, 930 files.
    // Load-size splits: every generated ABI in a module of its own (89 more
    // modules), one deployment table per version (four modules), and the JB
    // Center RPC client, sucker deployer maps, Sticky collectors, tier price
    // and review queue in modules of their own, each eight ESM/CJS
    // artifacts. Packed size falls; the per-module declarations and maps
    // add: 1,561,709 B packed, 22,829,113 B unpacked, 1,706 files.
    // The pay and cash-out revert decoder, a module of its own, adds eight
    // artifacts, and the quoted pay's second preview a few kilobytes:
    // 1,571,557 B packed, 22,893,641 B unpacked, 1,714 files.
    // The Uniswap V3 quoter, a module of its own for router-converted pays,
    // adds eight artifacts: 1,583,013 B packed, 22,942,400 B unpacked, 1,722
    // files.
    // Typed-only revert matching, the pay-retry rule and the write hold's
    // release on a canonical revert change existing artifacts only:
    // 1,587,702 B packed, 22,966,884 B unpacked, 1,722 files.
    // The pay quote's retry and the router's quoted mint minimum change
    // existing artifacts only: 1,591,639 B packed, 22,990,003 B unpacked,
    // 1,722 files.
    // The plain-data review model, a module of its own, adds eight
    // artifacts: 1,598,614 B packed, 23,035,984 B unpacked, 1,730 files.
    // The review model's roles, token amounts, warnings and nested arguments,
    // and the raw-calldata decoder in a module of its own (eight artifacts):
    // The ERC-721 approval probe and the unnamed-spender grant add about
    // 15 kilobytes unpacked: 1,612,329 B packed, 23,138,745 B unpacked,
    // 1,738 files.
    // The core-issued confirmation, the wallet adapter and sendReviewed, each
    // in a module of its own (24 artifacts): 1,626,597 B packed,
    // 23,242,472 B unpacked, 1,762 files.
    // The reviewed-sequence journal and the shared useReviewedRun hook, each
    // in a module of its own (16 artifacts): 1,643,251 B packed,
    // 23,363,840 B unpacked, 1,778 files.
    // signReviewed in a module of its own (8 artifacts): 1,652,260 B packed,
    // 23,433,569 B unpacked, 1,786 files.
    // The reviewed Safe path in a module of its own (8 artifacts):
    // 1,662,032 B packed, 23,505,344 B unpacked, 1,794 files.
    // A Safe execTransaction settled by the Safe's own event:
    // 1,673,734 B packed, 23,530,747 B unpacked, 1,794 files.
    // Reviewed Relayr signing, payment and polling in a module of its own
    // (8 artifacts): 1,698,247 B packed, 23,665,143 B unpacked, 1,802 files.
    // The nana-wallet-check bin (one file; its test is not packed).
    // getRegisteredSucker and the pay swap-quote refusal, no files:
    // 1,706,925 B packed, 23,703,923 B unpacked, 1,803 files.
    // The review fixture requests on /testing, a module of its own (8
    // artifacts), the raw run failure, queued Safe proposal reuse and the
    // never-throwing review model: 1,717,660 B packed, 23,767,039 B
    // unpacked, 1,811 files.
    // Call bytes in the review model, the per-step wallet-boundary hooks,
    // the Safe Relayr payer, legacy hold sources and the simulation block
    // add no files: 1,723,499 B packed, 23,797,283 B unpacked, 1,811 files.
    // An app's exact gas, the wallet's ready, Safe adoption by declared
    // args, the revert receipt, settled runs and the run's failure add no
    // files; ReviewLineError in a module of its own (8 artifacts):
    // 1,740,168 B packed, 23,871,412 B unpacked, 1,819 files.
    // The review test prompt, the prior block, message calls, the review
    // abort, confirmed steps, the hook's preload and discard and the Safe
    // app batch add no files: 1,753,927 B packed, 23,911,253 B unpacked.
    // Reviewed plans in a module of their own (8 artifacts) and Relayr raw
    // calls: 1,766,660 B packed, 24,002,871 B unpacked, 1,827 files.
    // Paying a planned Relayr round's bound and the Safe hash check:
    // 1,779,547 B packed, 24,044,707 B unpacked.
    // The send-again boundary, verified receipts, kept revert data, the
    // dispatch-time wallet guard and self-reviewing signatures add no files:
    // 1,787,447 B packed, 24,079,865 B unpacked.
    packed: 1_790_000,
    unpacked: 24_100_000,
    entries: 1_827,
  },
  "@bananapus/nana-sdk-react": {
    directory: "packages/react",
    // useHeldWrite, useHeldIntents, useHeldWrites and HeldWritesNotice
    // measured 163,145 B packed / 1,805,792 B unpacked and 104 entries.
    // With useSavedAttempt: 168,731 B packed / 1,825,777 B unpacked, 106
    // entries.
    // With the held-write hooks moved to core and re-exported: 154,994 B
    // packed / 1,780,657 B unpacked, 96 entries.
    packed: 158_000,
    unpacked: 1_790_000,
    entries: 96,
  },
  "@bananapus/nana-sdk-connect": {
    directory: "packages/connect",
    packed: 60_000,
    unpacked: 400_000,
    entries: 40,
  },
};

// What an app pays up front for one import: the built ESM entry bundled with
// esbuild (minified, peer and wallet libraries external), in gzip bytes.
// Each ceiling sits about 5% above the size measured when the import was cut
// down (2026-10-20, before: createJBCenterRpcProvider 20,263 B, NATIVE_TOKEN
// 10,161, v6Address 7,298, prepareUserPay 17,603, feeBuybackOptions 7,891),
// so an import that starts pulling in another table, ABI or client fails here
// before it reaches a page. GraphQL counts for the build-time Bendystraw
// compiler: keeping its parser out is what that entry is for.
const entryBudgets = [
  ["@bananapus/nana-sdk-core/jbcenter", "createJBCenterRpcProvider", 2_900],
  ["@bananapus/nana-sdk-core", "NATIVE_TOKEN", 150],
  ["@bananapus/nana-sdk-core/chains", "mainnet", 450],
  ["@bananapus/nana-sdk-core/v6", "v6Address", 2_900],
  // The quoted pay's second preview: 10,276 B. Quoting a router's
  // conversion and previewing its destination (router reads, V3 quoter,
  // accounting contexts): 11,553 B. The quote's retry and the router's
  // quoted mint minimum: 12,018 B. Refusing a swap whose quote failed:
  // 12,543 B.
  ["@bananapus/nana-sdk-core/v6", "prepareUserPay", 12_700],
  ["@bananapus/nana-sdk-core/v6/fee-buyback", "feeBuybackOptions", 3_300],
  // With every version's address table: 10,488 B. With the v6 table only:
  // 5,002 B.
  ["@bananapus/nana-sdk-core", "resolveSuckers", 5_250],
  ["@bananapus/nana-sdk-core/v6", "effectiveTierPrice", 200],
  ["@bananapus/nana-sdk-core/review", "registerReviewHandler", 250],
  [
    "@bananapus/nana-sdk-core/bendystraw-operations",
    "compileBendystrawDocument",
    1_900,
    { bundleGraphql: true },
  ],
];
const external = [
  "viem",
  "viem/*",
  "ox",
  "ox/*",
  "abitype",
  "wagmi",
  "wagmi/*",
  "@wagmi/*",
  "react",
  "react/*",
  "react-dom",
  "@tanstack/*",
];

const failures = [];
for (const [entry, name, ceiling, options] of entryBudgets) {
  const { outputFiles } = await build({
    stdin: {
      contents: `export { ${name} } from "${entry}";`,
      resolveDir: process.cwd(),
    },
    bundle: true,
    minify: true,
    format: "esm",
    platform: "browser",
    external: options?.bundleGraphql ? external : [...external, "graphql"],
    write: false,
    logLevel: "error",
  });
  const size = gzipSync(outputFiles[0].contents, { level: 9 }).length;
  if (size > ceiling) {
    failures.push(`${name} from ${entry} loads ${size} B gzip > ${ceiling} B`);
  }
  console.log(`${name} from ${entry}: ${size} B gzip (ceiling ${ceiling} B)`);
}

for (const [workspace, budget] of Object.entries(budgets)) {
  const manifest = JSON.parse(
    readFileSync(join(process.cwd(), budget.directory, "package.json"), "utf8"),
  );
  if (
    manifest.repository?.type !== "git" ||
    manifest.repository?.url !== repositoryUrl ||
    manifest.repository?.directory !== budget.directory
  ) {
    failures.push(
      `${workspace} repository metadata must identify ${repositoryUrl}/${budget.directory}`,
    );
  }

  const result = spawnSync(
    "npm",
    [
      "pack",
      "--dry-run",
      "--json",
      "--ignore-scripts",
      "--workspace",
      workspace,
    ],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        npm_config_cache: join(tmpdir(), "juice-sdk-package-budget-cache"),
        npm_config_loglevel: "error",
      },
    },
  );
  if (result.status !== 0) {
    throw new Error(
      result.stderr || result.stdout || `npm pack failed for ${workspace}`,
    );
  }

  const packs = JSON.parse(result.stdout);
  const packed = Array.isArray(packs) ? packs[0] : packs[workspace];
  if (!packed?.files)
    throw new Error(`npm pack returned no metadata for ${workspace}`);
  const forbidden = packed.files
    .map(({ path }) => path)
    .filter((path) => /\.(?:test|spec)\.|tsbuildinfo$/.test(path));
  if (forbidden.length) {
    failures.push(
      `${workspace} publishes test/cache artifacts: ${forbidden.join(", ")}`,
    );
  }
  if (packed.size > budget.packed) {
    failures.push(`${workspace} packed ${packed.size} B > ${budget.packed} B`);
  }
  if (packed.unpackedSize > budget.unpacked) {
    failures.push(
      `${workspace} unpacked ${packed.unpackedSize} B > ${budget.unpacked} B`,
    );
  }
  if (packed.entryCount > budget.entries) {
    failures.push(
      `${workspace} files ${packed.entryCount} > ${budget.entries}`,
    );
  }

  console.log(
    `${workspace}: ${packed.size} B packed, ${packed.unpackedSize} B unpacked, ` +
      `${packed.entryCount} files`,
  );
}

if (failures.length) {
  throw new Error(`Package budget exceeded:\n- ${failures.join("\n- ")}`);
}
