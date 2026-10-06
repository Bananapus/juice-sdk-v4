---
"@bananapus/nana-sdk-core": patch
---

`waitForSafeExecutionHash` counts only a real "no such transaction" answer
toward giving up on a chain without a Safe transaction service. It counted every
failure of the `client`'s `getTransaction`, so a minute of RPC errors ended the
wait with "Safe does not host a transaction service" for a hash that could be a
real execution. An app that offers Dismiss on that error lets the user release
and send again a call that already ran.

Behavior change: on a chain without a service, only viem's
`TransactionNotFoundError` counts toward the twelve looks (about a minute at the
default interval) that end the wait. Any other failure, such as a timeout, an
HTTP error or a node still indexing, neither counts nor starts the count over,
and the wait keeps looking. It ends when the chain knows the hash, when twelve
not-found answers are in, or when the `signal` aborts, so a wait without a
`signal` lasts as long as the node cannot answer. The error is matched by its
name, so it counts when the app's viem and the SDK's are different installs.

Nothing changes on a chain with a Safe service: a failed chain check there still
leaves the decision to the service. A `client` whose `getTransaction` reports a
missing transaction another way, such as a test double that throws a plain
`Error("Transaction not found")`, no longer ends the wait. Make it throw viem's
`TransactionNotFoundError`.
