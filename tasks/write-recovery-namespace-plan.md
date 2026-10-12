# Independent native action recovery namespaces

Resources: `/Users/jango/Documents/jb/v6/evm/AGENTS.md`, `/Users/jango/Documents/jb/v6/evm/tasks/lessons.md`, `/Users/jango/Documents/jb/v6/evm/workflow/ponytail/SKILL.md`, `/Users/jango/Documents/jb/v6/evm/workflow/ponytail/README.md`, `/Users/jango/Documents/jb/v6/evm/docs/PLAN_REFINEMENT.md`. SDK has no descendant AGENTS. Existing shared write journal owns receipts, storage and browser locks.

## Plan refinement

- **Objective:** Allow unrelated native project actions to coexist, while reopening an unresolved action from its original saved evidence before current phase or terminal quotation.
- **System fit:** Extend the existing reviewed-write owner with an optional stable action/project namespace and read-only opener. Consumers use SDK proof and original call; generic legacy actions retain existing exact key policy.
- **Reuse and simplicity:** Extract existing readStored, memory hash cache and chain/account normalization first with identical behavior; prove existing tests and commit that stage before additive namespace behavior. No second journal, scanning or invented calldata. Keep Safe adoption target/selector checks independent of storage namespace.
- **Evidence and unknowns:** Current keys bind target/selector and cannot discover an older terminal before fresh preparation. New callers must supply stable action/project names, never per-click IDs or calldata fingerprints. Stale callbacks and uncertain broadcasts retain original records.
- **Verification:** Existing recovery suite before/after extraction; new namespace independence, same-action quote/target rotation blocking, opener-before-preparation, namespace validation, exact record roundtrip, cache persistence/readback and stale callback regressions. No public writes or pins; root owns full SDK gates/release.
- **Resource budget:** One existing storage parser/cache/key/lock owner, bounded namespace length, explicit lookup only. No global storage iteration, provider changes or new dependencies. Only writeRecovery.ts/test and this scoped plan are owned here.

- [x] Extract shared reader/identity normalizer, prove legacy tests and commit behavior-preserving stage.
- [x] Add optional namespace and read-only opener, preserve original call adoption authority.
- [x] Prove focused regression suite and hand off API/evidence to consumers and root.

Review evidence: behavior-preserving extraction6edf91f passed20existing tests before and after; additive namespace/reader60f05ac passes40focusedtests, including all ordinary storage/cache/callback/lock cases in both legacy and named scopes. Exact legacykey/shape, independent same-terminal projects, targetrotation opener, originalSafeadoption guard, failedhashpersistence repair, malformednamespace/corruptscope refusal are proved. Prettier and diffcheck pass. Mechanics confirms combined core production/test types after fixing unrelated in-progress native fixture casts. Independent review and required SDK full gates/release remain root-owned; no public writes/pins/publication here.
