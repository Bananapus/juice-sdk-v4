# juice-sdk-v4

> ⚠️ WORK IN PROGRESS - NOT READY FOR PRODUCTION USE ⚠️

A JavaScript SDK for building applications on the [Juicebox protocol](https://docs.juicebox.money/).

## Packages

Juice SDK is split across multiple packages. Choose the package that best serves your needs.

- [`juice-sdk-core`](./packages/core/README.md): Core utilities and helpers for building client and server-side applications.
- [`juice-sdk-react`](./packages/react/README.md): [Wagmi](https://wagmi.sh/) hooks, useful data contexts and helpers for building React applications.

### Development

Juice SDK is based on Yarn workspaces. Each package in the `packages/` directory is published seperately.

> Note: `juice-sdk-react` depends on `juice-sdk-core`.

1. Install dependencies for both packages.

   ```
   # in the root directory
   yarn install
   ```

1. Change directory into the package you're working on.
1. Consult the package's README for specific setup steps.
