# juice-sdk-core

Core utilities and helpers for building client and server-side applications on Juicebox.

## Installation

```
npm install juice-sdk-core
```

## Usage

Inspect the `utils/` directory for helpers and utilities. The following is a brief overview:

- `data.ts` - utilities for working with Juicebox datatypes.
- `token.ts` - utilities for calculating price quotes, token redemption value, etc.
- `ruleset.ts` - utilities for calculating ruleset-related data e.g. past and future weights
- `ipfs.ts` - utilities for working with ipfs as it relates to JB
- `hook.ts` - utilities for working with Juicebox Hooks, creating metadata for Pay/Redeem hooks

## Common usecases

### Fetch project metadata

```ts
import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";

const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(),
});

const projectId = 1n;
const ipfsGatewayHostname = ;

// read the project's Controller address from JBDirectory
const jbControllerAddress = await readJbDirectory({
  functionName: "controllerOf",
  args: [args.projectId],
});

const projectMetadata = await getProjectMetadata(
  publicClient,
  {
    projectId,
    jbControllerAddress,
  },
  {
    ipfsGatewayHostname: "jbm.infura-ipfs.io", // use a custom ipfs host if needed
  }
);

console.log(projectMetadata.name);
```
