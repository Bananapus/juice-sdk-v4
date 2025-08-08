# juice-sdk-v4

A JavaScript SDK for building applications on the [Juicebox protocol](https://docs.juicebox.money/).

## Usage

Juice SDK is split across the following npm packages:

- [`juice-sdk-core`](./packages/core): Wagmi CLI-generated Core utilities and helpers for building client and server-side applications.
- [`juice-sdk-react`](./packages/react): [Wagmi](https://wagmi.sh/) hooks for Juicebox. Useful data contexts and helpers for building React applications.
- [`revnet`](./packages/revnet/): [Wagmi](https://wagmi.sh/) hooks for Revnet contracts.

Choose the package that best serves your needs.

### Working with data

The Juicebox contracts use [fixed-point representations](https://medium.com/cementdao/fixed-point-math-in-solidity-616f4508c6e8) of data extensively. To make this data easier to work with, Juice SDK uses [`fpnum`](https://github.com/peeldao/fpnum) for common Juicebox datatypes. These include Reserved Percent, Cash Out Tax Rate, Weight, Weight Cut Percent and so on. See [`utils/data.ts`](./packages/core/src/utils/data.ts) for a full reference to all available data types.

## Development

Juice SDK is a Turborepo monorepo. It consists of the following packages:

- `wagmi-config`: defines the Wagmi config to be used for code generation (in `core`, `react` etc. packages)
- `core`: depends on `wagmi-config` to generate Typesafe ABI definitions, constant variables for contract addresses, and Viem functions.
- `react`: depends on `wagmi-config` to generate React hooks.
- `revnet`: generates React hooks for Revnet contracts.

### Setup

Requirements:

- node v20 (`nvm use` or `nvm use 20`)

1. Install deps for all packages.

```
npm install
```

1. Ask @aeolianeth for npm credentials.

### Add codegen for a new contract

[`wagmi-config`](./packages/wagmi-config/wagmi.config.ts) builds a wagmi config to be used for code generation. It essentially defines an array of contract addresses, passes in their ABIs (the JSON files defined in each contract's npm package), and gives that to Wagmi config: https://wagmi.sh/cli/config/options.

To add a new contract:

1. modify `wagmi.config.ts`. Use existing code as examples. If an address won't change across projects, add that contract to `HAS_STATIC_ADDRESS`
1. Regenerate and publish all the packages that rely on `wagmi-config` (currently `core` and `react`).

```
# in repo root dir
npm run build
```

1. Publish packages (if you want to, which you probably do)

#### Add a default contract address for JB Project deployments

Sometimes, even though an address isn't static, we'll need a 'default' address to use for JB project deployment transactions (for example, we need to set a JBMultiTerminal address when a project launches).

There's a script - `addJBProjectDeploymentAddresses.js` - that will append a `jbProjectDeploymentAddresses` variable for specified contracts to the codegen files.

Import and use `jbProjectDeploymentAddresses` to source addresses for project deployments.

To add a default contract address for deployment:

1. Modify `addJBProjectDeploymentAddresses.js`

### Publish packages

Only `react`, `core` and `revnet` are published. `wagmi-config` is "private"/internal-only.

**Automated Publishing (Recommended):**
Packages are automatically published when you push to the `main` branch using [Changesets](https://github.com/changesets/changesets).

1. Create a changeset to describe your changes:
   ```bash
   npm run changeset
   ```
2. Commit the changeset file along with your code changes
3. Push to main - packages will be automatically built, tested, and published

**Manual Publishing (Legacy):**

1. Bump package version in `package.json`
2. `cd` into the package and run `npm publish`

#### Creating Changesets

When you make changes that should trigger a new release:

```bash
# Create a new changeset
npm run changeset

# Follow the interactive prompts to:
# - Select which packages changed
# - Choose the type of change (patch/minor/major)
# - Write a summary of the changes
```

**Change Types:**

- `patch`: Bug fixes, small updates (1.0.0 → 1.0.1)
- `minor`: New features, non-breaking changes (1.0.0 → 1.1.0)
- `major`: Breaking changes (1.0.0 → 2.0.0)
