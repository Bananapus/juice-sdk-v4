---
"@bananapus/nana-sdk-core": minor
---

`@bananapus/nana-sdk-core/jbcenter` now carries the whole project-intent
surface: `decodeDeploymentCall` reads a frozen `{ chainId, to, data }` call
back as a v6 project, 721, omnichain, or revnet launch; `mergeSearch`,
`intentRow`, `intentPath`, `deployedChains`, and `isFullyDeployed` merge
undeployed intents into a list of deployed projects and route them; and
`ensureDeployed` is the pre-step a client runs before an intent's first
on-chain write, picking exactly one sender per intent — JB Center's sponsor,
polled to completion, or the caller's own `selfPaid` launch pipeline recorded
back to Center — and never mixing the two.
