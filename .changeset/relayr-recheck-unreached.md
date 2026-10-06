---
"@bananapus/nana-sdk-core": minor
---

`relayrSessionOutcome` reads a recheck that failed because the node could not
answer as `unchecked`, never as `changed` (ruling R118). Within the error's
first eight links, that is an HTTP, timeout or WebSocket failure, a JSON-RPC
error (viem's `RpcRequestError` or any `RpcError`, such as -32001, -32002,
-32005 or -32603), or a contract revert without revert data, which viem builds
from a transient -32603. A revert that carries revert data (viem's
`ContractFunctionRevertedError` with its raw or decoded data, or an execution
revert with code 3 and data) is the chain answering and reads as `changed`, as
does any other error, such as the action's own refusal.

This is a behavior change from Juicebox Money at 02278f0, which read only HTTP,
timeout and WebSocket failures as unreached. There, a node hiccup during the
recheck (a lagging node's -32001, a rate limit's -32005, a transient -32603)
offered Discard as "The project changed since this review", although a paid
session whose requests all expired unused can be signed again under its paid
quote.
