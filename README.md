# Juice SDK v4

[![npm version](https://img.shields.io/npm/v/juice-sdk-core.svg)](https://www.npmjs.com/package/juice-sdk-core)
[![npm version](https://img.shields.io/npm/v/juice-sdk-react.svg)](https://www.npmjs.com/package/juice-sdk-react)

A JavaScript SDK for building applications on the [Juicebox V4 protocol](https://docs.juicebox.money/).

## Installation

```bash
# For React applications
npm install juice-sdk-react juice-sdk-core

# For vanilla JavaScript/Node.js
npm install juice-sdk-core

# For Revnet-specific functionality
npm install revnet-sdk
```

## Quick Start

### React Application

```tsx
import { JBProjectProvider, useJBRuleset, useTokenCashOutQuoteEth } from "juice-sdk-react";
import { formatTokenAmount } from "juice-sdk-core";

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
} from "juice-sdk-core";

// Format token amounts for display
const formatted = formatTokenAmount(1000000000000000000n); // "1.0"

// Work with project economics
const reservedRate = new ReservedPercent(10); // 10% reserved tokens
const taxRate = new CashOutTaxRate(2.5); // 2.5% cash out tax
```

## Packages

| Package                               | Description                                       | NPM                                                                                                       |
| ------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| [`juice-sdk-core`](./packages/core)   | Core utilities, contract bindings, and data types | [![npm](https://img.shields.io/npm/v/juice-sdk-core.svg)](https://www.npmjs.com/package/juice-sdk-core)   |
| [`juice-sdk-react`](./packages/react) | React hooks, contexts, and components             | [![npm](https://img.shields.io/npm/v/juice-sdk-react.svg)](https://www.npmjs.com/package/juice-sdk-react) |
| [`revnet-sdk`](./packages/revnet)     | Revnet protocol utilities and hooks               | [![npm](https://img.shields.io/npm/v/revnet-sdk.svg)](https://www.npmjs.com/package/revnet-sdk)           |

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

Juice SDK v4 supports the following networks:

- **Ethereum** (Mainnet & Sepolia)
- **Optimism** (Mainnet & Sepolia)
- **Base** (Mainnet & Sepolia)
- **Arbitrum** (One & Sepolia)

See https://docs.juicebox.money to learn more.

## Working with Fixed-Point Data

Juicebox contracts use fixed-point math for precision. The SDK provides helper classes:

```javascript
import { ReservedPercent, CashOutTaxRate, RulesetWeight } from "juice-sdk-core";

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

### React Hooks

- [Generated hooks](./packages/react/src/generated/juicebox.ts) - Auto-generated contract hooks
- [Custom hooks](./packages/react/src/hooks/) - Higher-level functionality hooks

## Development

### Prerequisites

- Node.js v20+ (`nvm use` or `nvm use 20`)
- npm 10+

### Setup

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm run test

# Run linting
npm run lint

# Format code
npm run format
```

### Adding New Contracts

1. Modify [`contracts.ts`](./packages/core/contracts.ts)
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
