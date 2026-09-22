# Juice SDK v4

[![npm version](https://img.shields.io/npm/v/@bananapus/nana-sdk-core.svg)](https://www.npmjs.com/package/@bananapus/nana-sdk-core)
[![npm version](https://img.shields.io/npm/v/@bananapus/nana-sdk-react.svg)](https://www.npmjs.com/package/@bananapus/nana-sdk-react)

A JavaScript SDK for building applications on the [Juicebox protocol](https://docs.juicebox.money/) (V4, V5, and V6).

## JB Center

Use the framework-independent JB Center client to prepare and publish undeployed
project intents, include them in search, record verified deployments, and pin
project media. It also provides constrained read-only RPC access without exposing
an upstream provider credential:

```ts
import {
  createJBCenterClient,
  createJBCenterDeploymentCall,
  publishSignedIntent,
} from "@bananapus/nana-sdk-core/jbcenter";

const center = createJBCenterClient();

// Freeze the exact viem request the wallet, Safe, or Relayr will execute.
const deploymentCall = createJBCenterDeploymentCall({
  chainId: launchRequest.chainId,
  address: launchRequest.address,
  abi: launchRequest.abi,
  functionName: launchRequest.functionName,
  args: launchRequest.args,
});

// Prepares the intent, checks Center's envelope and message before the signer
// opens, and publishes what it checked.
const intent = await publishSignedIntent(
  center,
  {
    format: "juicebox.money/v1",
    deploymentVersion: "6",
    chainIds: [launchRequest.chainId],
    deploymentCalls: [deploymentCall],
    jb,
  },
  (message) => walletClient.signMessage({ account, message }),
  { publisher: account.address },
);

// No reconciler credential is needed. Center matches this transaction's
// direct or nested call trace to the publisher's signed deployment call.
await center.recordDeployment(intent.id, {
  chainId: launchRequest.chainId,
  projectId,
  transactionHash,
});

const chainId = await center.rpc<`0x${string}`>(1, {
  method: "eth_chainId",
});
```

The chain-bound provider is structurally compatible with EIP-1193 consumers
such as viem:

```ts
import { custom, createPublicClient, mainnet } from "viem";
import { createJBCenterRpcProvider } from "@bananapus/nana-sdk-core/jbcenter";

const publicClient = createPublicClient({
  chain: mainnet,
  transport: custom(createJBCenterRpcProvider(mainnet.id)),
});
```

### Project intents

A published intent (`publishSignedIntent`, above) is firm: JB Center exposes no edit
or withdraw endpoint, so the signed envelope is final the moment it publishes.

Every chain in an intent is deployed by exactly one sender - either JB Center's
sponsor or the app's own wallet - never a mix of the two across the same
intent. `ensureDeployed` picks the sender and polls to completion, falling
back to `selfPaid` when the intent isn't sponsorable or the sponsor can't take
it; apps never call `requestDeploy` directly, `ensureDeployed` does that on
the sponsor path:

```ts
import { ensureDeployed } from "@bananapus/nana-sdk-core/jbcenter";

const projectIdByChainId = await ensureDeployed({
  client: center,
  intent,
  // Runs the app's own launch pipeline for every chain JB Center didn't
  // sponsor, then reports each result back to Center.
  selfPaid: (calls) =>
    Promise.all(calls.map((call) => runOwnLaunchPipeline(call))),
  onStep: (step) => console.log(step.chainId, step.status),
});
```

Finishing another wallet's partially self-paid intent produces different
sucker, ERC-20, and 721-hook addresses and breaks cross-chain linking, so only
the wallet that sent the first chain should resume a self-paid intent.

Render an intent's frozen calldata without re-decoding it yourself:

```ts
import { decodeDeploymentCall } from "@bananapus/nana-sdk-core/jbcenter";

const launch = decodeDeploymentCall(deploymentCall);
if (launch.flavor === "revnet") {
  // launch.stages, launch.description, launch.accountingContexts
}
if (launch.flavor === "homerun-fund") {
  // launch.tokenName, launch.ticker, launch.mustStartAtOrAfter, launch.salt
}
```

A chain in an intent can carry more than one call. The last call for a chain is
its launch; every call before it is a setup call that creates a Safe through
the canonical Safe 1.4.1 proxy factory, so a project can be owned by a multisig
that does not exist yet — Safe addresses depend only on the factory, singleton,
initializer and salt nonce, so the creation and the launch can land in either
order. A chain carries at most four calls. `intentCalls` applies that rule once,
for every chain:

```ts
import { intentCalls } from "@bananapus/nana-sdk-core/jbcenter";

for (const [chainId, { setup, launch }] of intentCalls(intent)) {
  for (const call of setup) {
    if (call.decoded.flavor === "safe-create") {
      // call.decoded.address, .owners, .threshold, .saltNonce
    }
  }
  // launch.decoded is whatever the chain's last call decodes to, usually a launch.
}
```

A setup call reads back as `safe-create` only when it is a canonical
`createProxyWithNonce` to the canonical factory for the canonical singleton and
fallback handler, with 1 to 20 unique nonzero owners, a threshold inside the
owner count, and no setup hook or payment. Anything else makes the whole
envelope unreadable, so a client never renders a setup call it cannot name.
`ensureDeployed`'s `selfPaid` callback receives every remaining call, setup
calls included, in the order the intent carries them.

List views merge deployed projects and undeployed intents by creation time
with `mergeSearch`:

```ts
import { mergeSearch } from "@bananapus/nana-sdk-core/jbcenter";

const rows = mergeSearch(deployedProjectRows, searchPage.items);
```

An undeployed intent in a merged list routes to `/intent/<id>` (`intentPath`).
Once `isFullyDeployed` reports every chain deployed, redirect that route to
the project's own page instead of continuing to render the intent view.

A publisher signs JB Center's prepared message, not its own - so
`publishSignedIntent` (above) checks it first, with the app's own signer
passed in; this package never reaches a wallet.

It refuses with a `JBCenterIntentMismatchError` before calling the signer when
JB Center's prepared envelope carries different values than the intent built
locally (`reason: "envelope"` - key order, chain order, and the casing of
addresses and calldata are JB Center's to choose, the values are not), or when
the prepared message is not Center's signing message for that content hash
(`reason: "message"`). What it checked is what it publishes, so an intent the
caller keeps writing to while the signer is open cannot change under it. A
client whose Center asks for another message passes that template as
`expectMessage`.

Search Center's undeployed intents by `owner` - the intent's `jb.owner` - or
by `publisher`, the address that signed it; both are matched without regard to
checksum casing:

```ts
const mine = await center.searchIntents({ owner: account.address });
```

When JB Center declines to sponsor a deploy, show its refusal in fixed
wording rather than a provider's text:

```ts
import { describeCenterRefusal } from "@bananapus/nana-sdk-core/jbcenter";

const refusal = describeCenterRefusal(error);
if (refusal) showNotice(refusal.message);
else throw error;
```

The module's helpers, in full:

| Helper                           | What it does                                                                                       |
| -------------------------------- | -------------------------------------------------------------------------------------------------- |
| `createJBCenterClient`           | Builds the `JBCenterClient` every helper below takes.                                              |
| `createJBCenterRpcProvider`      | A chain-bound EIP-1193 provider over JB Center's read-only RPC.                                    |
| `createJBCenterDeploymentCall`   | Freezes a typed viem request into the `{ chainId, to, data }` call an intent signs.                |
| `publishSignedIntent`            | Prepares, checks JB Center's envelope and message, signs with the caller's signer, publishes.      |
| `JBCenterIntentMismatchError`    | Thrown by `publishSignedIntent` before signing; `reason` is `"envelope"` or `"message"`.           |
| `decodeDeploymentCall`           | Reads a frozen call back as a project, 721, omnichain, revnet, or Homerun FUND launch.             |
| `intentCalls`                    | An intent's calls per chain, decoded: the setup calls before it, then the launch.                  |
| `mergeSearch`                    | Interleaves undeployed intent rows into a list of deployed project rows by creation time.          |
| `intentRow`                      | Turns one search item into the row `mergeSearch` merges.                                           |
| `intentPath`                     | The `/intent/<id>` route for an undeployed intent.                                                 |
| `deployedChains`                 | The chain ids an intent has landed on.                                                             |
| `isFullyDeployed`                | Whether every chain in the intent has landed.                                                      |
| `isSponsorable`                  | Whether JB Center's sponsor covers every chain in the list.                                        |
| `ensureDeployed`                 | The pre-step before an intent's first on-chain write: one sender per intent, polled to completion. |
| `EnsureDeployedError`            | Thrown by `ensureDeployed` when a chain cannot be finished; carries the `chainId`.                 |
| `describeCenterRefusal`          | The fixed sentence for a sponsorship refusal, or `null` when the failure is something else.        |
| `JBCenterRequestError`           | A non-2xx answer from JB Center; carries `status`, `code`, `requestId`, `retryAfter`.              |
| `JBCenterTimeoutError`           | A request that passed its `timeoutMs`.                                                             |
| `JBCenterRpcError`               | A JSON-RPC error from the read-only RPC; carries `code` and `data`.                                |
| `JBCENTER_SPONSORED_CHAIN_IDS`   | The chain ids JB Center's sponsor covers.                                                          |
| `JBCenterClient`                 | The client class `createJBCenterClient` returns.                                                   |
| `JBCENTER_DEFAULT_URL`           | The JB Center origin a client uses when none is given.                                             |
| `JBCENTER_REQUEST_TIMEOUT_MS`    | The default per-request timeout.                                                                   |
| `JBCENTER_DEPLOYMENT_TIMEOUT_MS` | The timeout a sponsored deploy request is given.                                                   |
| `JBCENTER_PIN_TIMEOUT_MS`        | The timeout a media pin is given.                                                                  |
| `MAX_JBCENTER_RESPONSE_BYTES`    | The largest response body a client reads.                                                          |
| `JBCENTER_RPC_METHODS`           | The JSON-RPC methods JB Center's read-only RPC accepts.                                            |

## Inline Safe creation

`@bananapus/nana-sdk-core/safe` prepares ordinary Safe 1.4.1 multisigs without
React, a wallet, a relayer, or a hosted account service. Apps supply the owner
addresses and approval threshold, and assign the resulting address to their own
project Owner, Operator, or other role:

```ts
import {
  bundleSafeLaunch,
  checkSafeDeployments,
  resolveSafeAddress,
  verifySafeDeployments,
  verifySafeLaunchSimulation,
  type SafeCall,
} from "@bananapus/nana-sdk-core/safe";

// Persist the nonce and returned plan with the draft so retries use the same Safe.
// publicClients contains a read client for every destination chain.
const owner = await resolveSafeAddress(
  { kind: "create", owners: signerAddresses, threshold: 2, saltNonce },
  publicClients,
);
const plans = owner.plan ? [owner.plan] : [];

// Alternatively, accept an existing address without deploying a new Safe:
const operator = await resolveSafeAddress(
  { kind: "existing", address: existingOperatorAddress },
  [],
);

// Build an app-specific launch using owner.address and operator.address.
// Only bundle calls whose authorization tolerates Multicall3 as msg.sender.
const launchCall: SafeCall = buildAuthenticatedLaunchCall({
  owner: owner.address,
  operator: operator.address,
});
await checkSafeDeployments(publicClient, plans);
const batch = bundleSafeLaunch(launchCall, plans);
const simulation = await publicClient.call({ ...batch, account });
await verifySafeLaunchSimulation(publicClient, plans, simulation.data);

// The app signs/submits `batch`, then waits for a successful receipt.
await verifySafeDeployments(publicClient, plans, {
  blockNumber: receipt.blockNumber,
});
```

Each new configuration accepts 1–50 unique signer addresses and a threshold from
1 through the signer count. `saltNonce` is a 32-byte hex value. Resolution verifies
the canonical Safe factory, singleton, and fallback handler runtimes on every
supplied chain. Safe initialization adds no modules, guards, setup hooks, or
payments. Existing-address resolution normalizes the address; it does not certify
that the supplied address is a Safe.

The same Safe address across chains requires the same ordered signers,
threshold, nonce, initializer, factory, and proxy creation bytecode. Create-mode
resolution rejects differing creation bytecode across the supplied clients. Keep
the plan stable when resuming a launch. Preflight and receipt verification check
the deployed Safe runtime and owner policy; verification errors must prevent an
app from reporting success.

`SAFE_PROXY_CREATION_CODE` pins those proxy creation bytes, so an address can be
predicted from a signed call with no chain read; anything about to be deployed
still reads the factory on each chain.

`bundleSafeLaunch` uses Multicall3 `CALL`, so the launch contract sees Multicall3
as `msg.sender`. Use a sender-independent launch or a forwarded call that already
authenticates its signer. `buildSafeDeploymentTx(chainId, plans)` prepares a
separate deployment transaction when the launch must preserve its original
caller. Deployment calls tolerate retries, so a successful outer simulation
alone is insufficient: verify its inner results and the deployed Safes as shown
above.

Compose and submit one batch per destination chain. A Relayr integration may
fund several chains with one payment, but chains confirm independently; these
batches do not provide atomic execution across chains. The client owns signing,
funding, progress, and recovery.

## Installation

```bash
# For React applications
npm install @bananapus/nana-sdk-react @bananapus/nana-sdk-core

# For vanilla JavaScript/Node.js
npm install @bananapus/nana-sdk-core

# For Revnet-specific functionality
npm install revnet-sdk
```

## Quick Start

### React Application

```tsx
import {
  JBProjectProvider,
  useJBRuleset,
  useTokenCashOutQuoteEth,
} from "@bananapus/nana-sdk-react";
import { formatTokenAmount } from "@bananapus/nana-sdk-core";

function ProjectDashboard() {
  const projectId = 1n;

  return (
    <JBProjectProvider
      projectId={projectId}
      ctxProps={{
        metadata: {
          ipfsGatewayHostname: "jbm.infura-ipfs.io",
        },
      }}
    >
      <ProjectDetails />
    </JBProjectProvider>
  );
}

function ProjectDetails() {
  const { ruleset } = useJBRuleset();
  const { data: cashOutQuote } = useTokenCashOutQuoteEth({
    tokenAmount: 1000000000000000000n, // 1 token
  });

  return (
    <div>
      <h2>Project Ruleset #{ruleset?.cycleNumber}</h2>
      <p>Cash out value: {formatTokenAmount(cashOutQuote)} ETH</p>
    </div>
  );
}
```

### Core Utilities

```javascript
import {
  formatTokenAmount,
  parseTokenAmount,
  ReservedPercent,
  CashOutTaxRate,
  downsampleTimeSeries,
} from "@bananapus/nana-sdk-core";

// Format token amounts for display
const formatted = formatTokenAmount(1000000000000000000n); // "1.0"

// Work with project economics
const reservedRate = new ReservedPercent(10); // 10% reserved tokens
const taxRate = new CashOutTaxRate(2.5); // 2.5% cash out tax

// Fetch complete history first, then retain its visual shape within a chart budget
const chartPoints = downsampleTimeSeries(
  completeHistory,
  3000,
  (point) => point.timestamp,
  (point) => point.price,
);
```

## Packages

| Package                                             | Description                                                          | NPM                                                                                                                               |
| --------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| [`@bananapus/nana-sdk-core`](./packages/core)       | Core utilities, contract bindings, and data types                    | [![npm](https://img.shields.io/npm/v/@bananapus/nana-sdk-core.svg)](https://www.npmjs.com/package/@bananapus/nana-sdk-core)       |
| [`@bananapus/nana-sdk-react`](./packages/react)     | React hooks, contexts, and components                                | [![npm](https://img.shields.io/npm/v/@bananapus/nana-sdk-react.svg)](https://www.npmjs.com/package/@bananapus/nana-sdk-react)     |
| [`@bananapus/nana-sdk-connect`](./packages/connect) | Sign in with a Juicebox Center passkey account or an external wallet | [![npm](https://img.shields.io/npm/v/@bananapus/nana-sdk-connect.svg)](https://www.npmjs.com/package/@bananapus/nana-sdk-connect) |

### Core Package Features

- **Contract interactions** - Type-safe contract bindings for all Juicebox contracts
- **Data utilities** - Format, parse, and validate financial data
- **IPFS helpers** - Upload and fetch project metadata
- **Fee calculations** - Compute platform and cash-out fees
- **Address utilities** - Chain-specific contract address resolution

### React Package Features

- **Project context** - `JBProjectProvider` for complete project data
- **Specialized hooks** - Token operations, ruleset management, cross-chain functionality
- **Data contexts** - Chain, contract, metadata, and token contexts
- **Components** - Pre-built components for common UI patterns

## Multi-Chain Support

The Juice SDK supports the following networks:

- **Ethereum** (Mainnet & Sepolia)
- **Optimism** (Mainnet & Sepolia)
- **Base** (Mainnet & Sepolia)
- **Arbitrum** (One & Sepolia)

See https://docs.juicebox.money to learn more.

## Working with Fixed-Point Data

Juicebox contracts use fixed-point math for precision. The SDK provides helper classes:

```javascript
import {
  ReservedPercent,
  CashOutTaxRate,
  RulesetWeight,
} from "@bananapus/nana-sdk-core";

// Create percentage values
const reserved = new ReservedPercent(15); // 15%
const tax = new CashOutTaxRate(2.5); // 2.5%

// Work with weights
const weight = new RulesetWeight(1000000000000000000n); // 1e18

// Convert to/from contract values
const contractValue = reserved.toContractValue(); // 1500 (out of 10000)
const percentage = reserved.formatAsPercent(); // "15%"
```

## API Reference

### Core Utilities

- [Data utilities](./packages/core/src/utils/data.ts) - Fixed-point data types and formatters
- [Contract utilities](./packages/core/src/utils/contracts.ts) - Address resolution and contract helpers
- [IPFS utilities](./packages/core/src/utils/ipfs.ts) - Metadata upload and retrieval
- [Time-series utilities](./packages/core/src/utils/timeSeries.ts) - Shape-preserving chart downsampling

### React Hooks

- [Generated Bendystraw types](./packages/react/src/generated/graphql.ts) - Types generated from the committed schema and reviewed queries
- [Custom hooks](./packages/react/src/hooks/) - Higher-level functionality hooks

## Deployment generations

`jbContractAddress[6]` records only executed deployments on each chain. The
floor-fix buyback hook, router, gateway and ratio feed are deployed on Ethereum,
Optimism, Base, Arbitrum, Sepolia, Base Sepolia and Arbitrum Sepolia. OP Sepolia
has only the ratio feed from this rollout. The canonical ABI exports describe
this executed generation, sourced from Sepolia, with
`jbBuybackHookPreviousAbi`, `jbBuybackHookV1Abi`,
`jbRouterTerminalPreviousAbi`, and `jbRouterTerminalV1Abi` retained for older
interfaces. `jbContractAbiGeneration[6]` identifies which ABI generation each
canonical router or hook uses; `jbContractAddressHistory[6]` preserves retired
addresses for activity and projects that have not migrated. A deployment's
presence does not prove that a project has selected it: use `resolveRouterPath`
and the registry's project-specific hook selection.

Generation reads `PROTOCOL_DEPLOYMENTS_DIR` when set, otherwise each sibling
repository's flat `deployments/<chain>/` tree, then a pinned
`.contract-source/deploy-all-v6` checkout, then npm artifacts when no local tree exists.
Missing records in a selected tree stay absent; malformed records fail the
build. Hook, router, gateway and ratio-feed artifacts (including retained
generations) must identify the expected contract and chain and contain a successful
mined receipt with transaction and block hashes. CI pins the deployment source independently of npm publication. After
an executed rollout, regenerate and review the source pin and fixture together:

```sh
PROTOCOL_DEPLOYMENTS_DIR=../deploy-all-v6 npm run generate --workspace @bananapus/nana-sdk-core
PROTOCOL_DEPLOYMENTS_DIR=../deploy-all-v6 node --import tsx scripts/check-v6-protocol.ts --update-fixture
PROTOCOL_DEPLOYMENTS_DIR=../deploy-all-v6 npm run protocol:check
```

`buildBuybackPayMetadata` emits the three-word quote for hook 1.4.0 under the
selected hook's `pay` metadata ID. It defaults `skipSplits` to false. A zero
minimum uses the oracle floor and its mint fallback; an explicit minimum remains
a settlement guarantee.

## Development

### Prerequisites

- Node.js 22.23.1 (`nvm use` reads the repository pin)
- npm 10.9.8

### Setup

```bash
# Use the pinned Node/npm toolchain from .nvmrc and package.json.
nvm use

# Install exact locked dependencies
npm ci

# Build all packages
npm run build

# Run tests
npm run test

# Run coverage and type safety gates
npm run test:coverage
npm run type-check

# Verify V6 contract parity and the reviewed wallet boundary inventory
npm run protocol:check
npm run wallet:check

# Run the full deterministic gate
npm run check

# Format code
npm run format
```

See [TESTING.md](./TESTING.md) for the pinned deploy-all-v6 source commit,
coverage denominators, deterministic network policy, and CI/release invariants.

### Adding New Contracts

1. Modify [`contracts.ts`](./packages/core/src/contracts.ts)
2. Regenerate code: `npm run build`

#### Add a default contract address for JB Project deployments

Sometimes, even though an address isn't static, we'll need a 'default' address to use for JB project deployment transactions (for example, we need to set a JBMultiTerminal address when a project launches).

There's a script - `addJBProjectDeploymentAddresses.js` - that will append a `jbProjectDeploymentAddresses` variable for specified contracts to the codegen files.

Import and use `jbProjectDeploymentAddresses` to source addresses for project deployments.

To add a default contract address for deployment:

1. Modify `addJBProjectDeploymentAddresses.js`

### Publishing

We use [Changesets](https://github.com/changesets/changesets) for automated publishing:

```bash
# Create a changeset
npm run changeset

# Commit the changeset together with the implementation
```

After the change reaches `main`, the release workflow runs the verification
gates and opens or updates a versioning pull request. Merge that pull request to
apply the version bumps and changelogs; the following `main` workflow publishes
the new packages to npm with GitHub Actions provenance.

**Change Types:**

- `patch` - Bug fixes (1.0.0 → 1.0.1)
- `minor` - New features (1.0.0 → 1.1.0)
- `major` - Breaking changes (1.0.0 → 2.0.0)

## V6 actions (@bananapus/nana-sdk-core/v6)

A framework-agnostic Juicebox V6 action layer: writes are pure builders that return a fully typed, viem-compatible request object (no signing, no wallet, no React), and reads take a plain viem `PublicClient`. The same builders work with wagmi's `writeContract`, viem's `walletClient.writeContract`, or any other stack.

```ts
import { createPublicClient, createWalletClient, http } from "viem";
import { sepolia } from "viem/chains";
import {
  resolvePaymentTerminal,
  buildPayTx,
} from "@bananapus/nana-sdk-core/v6";

const client = createPublicClient({ chain: sepolia, transport: http() });
const wallet = createWalletClient({ chain: sepolia, transport: http() });

const { address: terminal } = await resolvePaymentTerminal(client, {
  chainId: sepolia.id,
  projectId: 4n,
  token: "0x000000000000000000000000000000000000EEEe",
});
const request = buildPayTx({
  chainId: sepolia.id,
  terminal,
  projectId: 4n,
  token: "0x000000000000000000000000000000000000EEEe",
  amount: 10n ** 18n,
  beneficiary: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
});
await wallet.writeContract({ account: "0xYourAccount", ...request });
```

Use `resolveRouterPath` to display a project's registry-selected router path. It
reads `terminalOf(projectId)`, respecting pinned terminals and cohort defaults,
then reads `ROUTER()` only when the selected terminal matches a deployed gateway
on that chain:

```ts
import { resolveRouterPath } from "@bananapus/nana-sdk-core/v6";

const route = await resolveRouterPath(client, {
  chainId: sepolia.id,
  projectId: 4n,
});

if (route.status === "gateway") {
  // Display route.registry -> route.gateway -> route.router.
} else if (route.status === "direct") {
  // Display route.registry -> route.router, including retired router generations.
} else if (route.status === "unknown") {
  // Display route.terminal as an unrecognized terminal; no router was assumed.
} else {
  // The registry currently resolves no terminal for this project.
}
```

The generated address table includes the executed gateway on all four mainnets,
Sepolia, Base Sepolia and Arbitrum Sepolia; OP Sepolia remains feed-only for this
rollout. Deployment availability does not establish a project's selected route.
Historical router addresses remain recognizable for projects that have not
migrated. An RPC read failure rejects the helper promise so callers can
distinguish an unavailable read from an unresolved route.

Continue using `resolvePaymentTerminal` for the token-specific payment address
and a payment preview to check routability. `resolveRouterPath` describes the
registry route; its underlying `router` address is not a substitute payment
target. The gateway can retain eligible failed source-project-opted calls,
including protocol fees, in the original input token. A successful transaction
that queues a pending call has not settled that payment. Track
`QueuePendingCall`, `ProcessPendingCall`, `RefundPendingCall`, and
`RecordTerminalCallFailure`, together with `pendingCallCount`,
`pendingCallCommitmentOf`, and `pendingCallFailureOf`, to show custody and retry
or refund state. Calls without retention eligibility still revert synchronously.

For buyback hook 1.4.0, the `pay` metadata entry contains three ABI words:
`(uint256 amountToSwapWith, uint256 minimumSwapAmountOut, bool skipSplits)`.
Build the entry under `hookMetadataId(selectedHook, "pay")` with
`createHookMetadata`; resolve the hook used by the project before choosing the
metadata ID or version. Two-word quote entries revert on this hook. Keep
`skipSplits` false to honor reserved splits on swapped tokens. For payments
without an explicit minimum, a swap that misses the TWAP floor unwinds and falls
back to issuance; an explicit user minimum still applies to the resulting output.

Modules:

- `launch` — project launches + creation fee
- `omnichain` — multi-chain launches and ruleset queues via JBOmnichainDeployer
- `rulesets` — queue + read rulesets
- `splits` — split groups and exact-remainder percent math
- `revnets` — REVDeployer + REVOwner actions
- `terminals` — payment terminal and effective router path resolution, accounting contexts
- `pay` — pay builders and previews
- `cashOut` — cash-out builders and quotes
- `tokens` — ERC-20 deploys, claims, credits, mint/burn
- `permissions` — JBPermissions ids, grants, and checks
- `suckers` — cross-chain token bridging (prepare/toRemote/claim) + sucker pair reads
- `loans` — REVLoans borrow/repay/reallocate + borrowable reads
- `currency` — currency id helpers
- `fees` — protocol fee constants and math
