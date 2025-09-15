# juice-sdk-react

[Wagmi](https://wagmi.sh/) hooks for Juicebox. Useful data contexts and helpers for building React applications.

## Installation

Install the `juice-sdk-react` for React, and it's peer dependency, `juice-sdk-core`.

```
npm install juice-sdk-react juice-sdk-core
```

## Usage

Fetching all of the commonly used data for Juicebox projects can be cumbersome. We expose the `JBProjectProvider` to fetch a bunch of data about a juicebox project, including (but not limited to):

- important contracts (like payment terminals, stores etc.)
- project metadata (ipfs)
- current ruleset
- project token details

`JBProjectProvider` is used in the following example:

```tsx
import { JBProjectProvider } from "juice-sdk-react";

function MyPage() {
  const projectId = 1n;

  return (
    <JBProjectProvider
      chainId={1}
      projectId={projectId}
      version={5}
      ctxProps={{
        metadata: {
          ipfsGatewayHostname: "jbm.infura-ipfs.io", // your custom gateway. Defaults to `ipfs.io`
        },
      }}
    >
      <MyPageComponents />
    </JBProjectProvider>
  );
}
```
