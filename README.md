# juice-sdk-v4

> ⚠️ WORK IN PROGRESS - NOT READY FOR PRODUCTION USE ⚠️

A JavaScript SDK for building applications on the [Juicebox protocol](https://docs.juicebox.money/).

## Overview

Juice SDK is split across the following npm packages:F

- [`juice-sdk-core`](./packages/core/README.md): Core utilities and helpers for building client and server-side applications.
- [`juice-sdk-react`](./packages/react/README.md): [Wagmi](https://wagmi.sh/) hooks for Juicebox. Useful data contexts and helpers for building React applications.

Choose the package that best serves your needs.

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

### Add or update contract addresses

The `scripts/generateAddresses.ts` script produces an `addresses.json` which contains the contract addresses Wagmi CLI will use for codegen.

To add new contract addresses, modify the `generateAddresses` script to fetch and parse the desired Forge deployment manifest, and include the result in the script output.

To update existing contract addresses, just run the script; it will pull the latest contract addresses from GitHub.

To add support for a new chain, add its chain ID to `juice.config.ts` and run `yarn build`.
