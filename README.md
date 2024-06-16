# juice-sdk-v4

A JavaScript SDK for building applications on the [Juicebox protocol](https://docs.juicebox.money/).

## Usage

Juice SDK is split across the following npm packages:

- [`juice-sdk-core`](./packages/core/README.md): Core utilities and helpers for building client and server-side applications.
- [`juice-sdk-react`](./packages/react/README.md): [Wagmi](https://wagmi.sh/) hooks for Juicebox. Useful data contexts and helpers for building React applications.

Choose the package that best serves your needs.

### Working with data

The Juicebox contracts use [fixed-point representations](https://medium.com/cementdao/fixed-point-math-in-solidity-616f4508c6e8) of data extensively. To make this data easier to work with, Juice SDK uses [`fpnum`](https://github.com/peeldao/fpnum) for common Juicebox datatypes. These include Reserved Rate, Redemption Rate, Weight, Decay Rate and so on. See [`utils/data.ts`](./packages/core/src/utils/data.ts) for a full reference to all available data types.

## Development

Juice SDK is based on Yarn workspaces. Each package in the `packages/` directory is published seperately.

> Note: `juice-sdk-react` depends on `juice-sdk-core`.

1. Populate the `.env` file based on the `.env.example`.
1. Install dependencies for both packages.

   ```
   # in the root directory
   yarn install
   ```

1. Change directory into the package you're working on.
1. Consult the package's README for specific setup steps.

### Build process

Both packages use [Wagmi CLI](https://wagmi.sh/cli/getting-started) to generate foundational code. Further utilities and helpers are included in each package.

The build process for each package is roughly as follows:

1. Compile a list of contract addresses to use for codegen (see [Add or update contract addresses](#add-or-update-contract-addresses)).
1. Generate viem/wagmi code using Wagmi CLI and the list of contract addresses from Step 1. Each package has a `wagmi.config.ts` file that defines Wagmi CLI behavior.
1. Compile and build the package for publishing.

To build each package, run `yarn build` from the root directory.

#### Wagmi CLI patch

Out-of-the-box Wagmi CLI is inadequate for our needs. We apply a patch to the package (using [patch-package](https://www.npmjs.com/package/patch-package)) that changes the following:

| Patch                                                                    | Why                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Accept optional `address` arg in contract read/write functions and hooks | Not all Juicebox projects use the same contract addresses. Juicebox contracts store references to other Juicebox contracts, and it's common to need to call a function on a specific contract address instead of the 'default' address given in the Forge deployment manifest. For example, two projects might use different payment terminal contracts. This patch lets developers pass a 'custom' address to read/write functions. |
| Add Optimism Sepolia as a possible codegen target                        | Juicebox contracts are deployed on Optimism Sepolia (chain ID `11155420`). This patch means Wagmi CLI will generate Optimism Sepolia-compatible code.                                                                                                                                                                                                                                                                                |

### Add or update contract addresses

The `scripts/generateAddresses.ts` script produces an `addresses.json` which contains the contract addresses Wagmi CLI will use for codegen.

To add new contract addresses, modify the `generateAddresses` script to fetch and parse the desired Forge deployment manifest, and include the result in the script output.

To update existing contract addresses, just run the script; it will pull the latest contract addresses from GitHub.

To add support for a new chain, add its chain ID to `juice.config.ts` and run `yarn build`.

### Local links

In local development, linking juice-sdk to another local project or app requires some extra setup.
Both juice-sdk and the local project need to depend on **the same `wagmi` on the filesystem**.

The following describes how to link a local juice-sdk to another local project:

1. Run `yarn link` in both `packages/juice-sdk-react` and `packages/juice-sdk-core`
1. In `packages/juice-sdk-react`, run `yarn link "juice-sdk-core"`.
1. In 2 separate processes, run `yarn dev` in both `packages/juice-sdk-react` and `packages/juice-sdk-core`.

**In your local project**:
1. Clear any build files `rm -Rf .next`
1. Manually remove the project's `wagmi` dependency
   ```sh
   rm -Rf node_modules/wagmi
   ```
1. Symlink juice-sdk's `wagmi` dependency to the project's node_modules

   ```sh
   ln -s /absolute/path/to/juice-sdk/node_modules/wagmi node_modules
   ```
1. Run or build the project.
