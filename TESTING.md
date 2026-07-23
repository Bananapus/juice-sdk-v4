# Testing policy

The SDK is the shared contract boundary for the frontends. Pull requests therefore run the same checks consumers rely on:

- `npm run protocol:check` validates every exported V6 address and normalized public ABI against an independently reviewed deployment fixture. CI and release additionally compare that fixture with an exact sparse checkout of `Bananapus/deploy-all-v6` commit `316e9d4d3f9e1c5b41a5df7c0ad6183abbeccc7f`.
- `npm run wallet:check` rejects a production wallet sign/send API unless its exact source site and focused test are reviewed in `test/wallet-boundaries.json`.
- `npm run deps:check` requires the dependency graph shipped to SDK consumers
  to be internally valid. Historical contract-generation packages remain
  development-only; their upstream Sphinx/Hardhat peer conflict is not allowed
  to obscure the validity of either published package.
- `npm run format:ratchet` rejects new formatting debt and content changes to any reviewed legacy debt file. Formatting an inventoried file is encouraged and requires removing its stale hash from `test/format-debt.json`.
- `npm run type-check` checks both public packages and their colocated tests in
  strict TypeScript mode. Separate test configs keep test declarations out of
  published artifacts without turning test code into an unchecked surface.
- `npm run audit:prod` blocks high or critical advisories in dependencies
  shipped by either package; development-tool advisories remain visible without
  conflating them with consumer runtime exposure.
- `npm run test:coverage` runs framework-free V6 builder/read/math tests plus React metadata, cash-out, Bendystraw query-boundary, and Relayr signing/quote/payment/polling tests, producing per-package coverage reports.
- `npm run build` regenerates contract bindings and builds the published ESM, CommonJS, declaration, and React outputs.
- `npm run check:generated` fails if the locked contract packages regenerate a different committed binding.
- `npm run check:gql` regenerates React query types from the committed Bendystraw schema and rejects any diff; refreshing that derivative schema from the live service remains an explicit reviewed maintainer action.
- `npm run check:package` dry-runs both npm tarballs, rejects compiled tests/build caches, and caps packed size, unpacked size, and file count so generated growth is visible before it reaches every frontend consumer.
- `npm run check` runs protocol parity, the wallet and formatting-debt inventories, deterministic type/coverage checks, both builds, package budgets, and generated-binding checks from a locked install. Run `npm run audit:prod` separately because advisory data is registry-backed and changes independently of the lockfile.

Use Node 22.23.1 from `.nvmrc` and npm 10.9.8 from `packageManager` for the release-equivalent result.

CI and release use Ubuntu 24.04 and pin every reusable GitHub Action to a full
commit SHA. Every checkout disables persisted credentials; the release action
receives its scoped token explicitly only when creating a release pull request
or publishing. npm publication requests GitHub Actions provenance through OIDC,
so consumers can verify which repository workflow produced a package.

Dependabot checks npm and GitHub Actions on Thursdays at 09:00
`America/Sao_Paulo`. Each ecosystem is limited to one grouped routine
minor/patch pull request, with a 14-day cooldown for minor updates and a 7-day
cooldown for patches. Security updates remain grouped without a SemVer
restriction. Major version migrations are reviewed and curated by maintainers
instead of being opened automatically. Every proposed update passes the same
protocol, package, type, coverage, generation, and audit gates.

## Contract parity

The deployed V6 contracts are the source of truth. Bendystraw is a derivative,
eventually consistent index and cannot override an ABI, address, chain,
permission, signer, beneficiary, amount, or other contract invariant.

`test/fixtures/protocol-deployments.v6.json` was reviewed directly from the
pinned deploy-all checkout, independently of the generated SDK file. The local
gate covers all 30 contracts exported under `jbContractAddress["6"]` on all
eight supported chains: 240 address slots in total, comprising 238 deployment
artifacts and the explicit absence of `JBBuybackHook` and `JBRouterTerminal` on
OP Sepolia. It also covers all 24 directed production/testnet sucker pairs and
their 36 deployed CCIP/native artifacts, with 12 native-bridge absences stated
explicitly.

Each contract fixture also pins a SHA-256 digest of its normalized public
functions, events, and errors. The gate compares all 30 generated public V6 ABI
exports with those digests. With an external checkout, it additionally compares
all 238 per-chain ABI copies so chain-specific drift cannot hide. Normalization
removes only declaration order, duplicate declarations, `internalType`, and
other artifact formatting. The one semantic allowlist is generation's existing,
documented removal of the legacy four-argument
`JBTerminalStore.currentReclaimableSurplusOf` overload; every other name,
parameter/component, event index, output, mutability, and error must match.

Run the source-artifact comparison locally with:

```sh
PROTOCOL_DEPLOYMENTS_DIR=/path/to/deploy-all-v6 npm run protocol:check
```

The checkout must be at the exact pinned commit. CI and release both perform a
sparse checkout of only `deployments/` at that commit and set the variable;
neither trusts package-generated addresses or Bendystraw as parity evidence.

Core write helpers must be pure request builders. Every new builder needs an encode/decode regression through the exported canonical ABI which asserts its contract address, chain, function/tuple shape, payable value, currency/decimals, beneficiary, and safety floors. Reads use a mocked `PublicClient` in pull requests; live RPCs and Bendystraw are never merge dependencies.

Both package suites replace global `fetch` with a rejecting default before each
test and replace `XMLHttpRequest`, `WebSocket`, and `EventSource` with throwing
constructors when the runtime exposes them. A Bendystraw, Relayr, RPC, or other
transport test must install an explicit response mock; an accidental live
request fails with its attempted URL. `packages/core/src/networkGuard.test.ts`
self-tests this boundary, and test-local `beforeEach` hooks must not call
`vi.unstubAllGlobals()` because that removes the guard before the test runs.

Bendystraw is derivative data. React/indexer tests pin query shape, pagination, version/chain/project identity, and malformed-data behavior, but contract ABIs and direct reads remain the source of truth for authorization and transactions.

Coverage explicitly includes every future non-generated production
`src/**/*.{ts,tsx}` file in both packages. At this checkpoint that is 41 core
files and 45 React files. The 34 core test files run 262 tests and cover
3,655/3,838 statements and lines (95.23%), 650/774 branches (83.97%), and
181/183 functions (98.90%), with 95/82/92/95 global floors, 100% per-file
floors for `dataHook`, `projectMetadata`, and `suckerPairs`, and a dedicated
no-regression floor on the shared token quote math. Focused public-surface,
contract-helper, value-constructor, quote, and URN tests preserve those floors
under patched Vitest 3's AST-aware V8 remapping. The 36 React test files run 126
tests and cover 1,722/1,722 statements and lines (100%), 344/359 branches
(95.82%), and 76/76 functions (100%), with 100/95/100/100 global floors and
stronger per-file floors on the money, indexer, and Relayr boundaries.
Generated contract/GraphQL output is excluded because deterministic
regeneration and protocol parity gate it directly.

## Wallet boundary inventory

`scripts/check-wallet-boundaries.mjs` parses all production TypeScript and TSX
in both packages. It inventories wagmi/viem hooks and raw signing, transaction,
contract-write, batched-call, wallet-client, and wallet `request` calls. The
current surface contains four reviewed sites: hook creation and execution for
Relayr EIP-712 signing, and hook creation and execution for Relayr transaction
submission. A new or moved site fails with an unreviewed residual until
`test/wallet-boundaries.json` names its safety boundary and an existing focused
test. Stale inventory rows fail too, so the inventory cannot silently become a
historical allowlist.
