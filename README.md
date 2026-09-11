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

const prepared = await center.prepareIntent({
  format: "juicebox.money/v1",
  deploymentVersion: "6",
  chainIds: [launchRequest.chainId],
  deploymentCalls: [deploymentCall],
  jb,
});

const signature = await walletClient.signMessage({
  account,
  message: prepared.message,
});

const intent = await center.publishIntent({
  ...prepared.envelope,
  publisher: account.address,
  signature,
});

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

| Package                                         | Description                                       | NPM                                                                                                                           |
| ----------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| [`@bananapus/nana-sdk-core`](./packages/core)   | Core utilities, contract bindings, and data types | [![npm](https://img.shields.io/npm/v/@bananapus/nana-sdk-core.svg)](https://www.npmjs.com/package/@bananapus/nana-sdk-core)   |
| [`@bananapus/nana-sdk-react`](./packages/react) | React hooks, contexts, and components             | [![npm](https://img.shields.io/npm/v/@bananapus/nana-sdk-react.svg)](https://www.npmjs.com/package/@bananapus/nana-sdk-react) |

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
canonical ABI exports describe the latest executed Sepolia generation, with
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

# Packages are automatically published when merged to main
```

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

The generated address table records deployments per chain. Pending mainnet
proposals do not make the new gateway available there; the same helper follows
each chain as its deployment records are updated. Historical router addresses
remain recognizable for projects that have not migrated. An RPC read failure
rejects the helper promise so callers can distinguish an unavailable read from
an unresolved route.

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
