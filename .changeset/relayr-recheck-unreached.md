---
"@bananapus/nana-sdk-core": minor
---

`relayrSessionOutcome` reads a recheck that failed because the node could not
answer as `unchecked`, never as `changed` (ruling R118). That is a recheck
whose cause chain (its first eight errors) holds a transport failure (HTTP,
timeout or WebSocket) or a JSON-RPC failure (viem's `RpcRequestError` or any
`RpcError`, such as -32001, -32002, -32005 or -32603), and no revert data. It
includes a bare revert with no data, transient or not, which viem reads as a
`ContractFunctionRevertedError` without data, and an app error that wraps such
a failure as its `cause`.

Revert data on any JSON-RPC code is the chain answering and reads as
`changed`: hex of at least a 4-byte selector in an error's `data`, in a
`data.data` a node nests, or in the `raw` data of viem's
`ContractFunctionRevertedError`, or Nethermind's `"Reverted 0x…"` form. That
holds for code 3, -32000, -32603, -32015 and the rest, through `readContract`,
`call`, `estimateGas` and a raw `eth_call` alike. An app's own refusal with no
such failure in its cause chain reads as `changed` too.

This is a behavior change from Juicebox Money at 02278f0, which read only HTTP,
timeout and WebSocket failures as unreached. There, a node hiccup during the
recheck (a lagging node's -32001, a rate limit's -32005, a transient -32603)
offered Discard as "The project changed since this review", although a paid
session whose requests all expired unused can be signed again under its paid
quote.
