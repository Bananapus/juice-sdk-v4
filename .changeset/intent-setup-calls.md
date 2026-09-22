---
"@bananapus/nana-sdk-core": minor
---

`@bananapus/nana-sdk-core/jbcenter` reads intents whose chains set up their
Safes before they launch. An intent's `deploymentCalls` may now carry one to
four calls per chain: the last call for a chain is its launch, and every call
before it creates a Safe through the canonical Safe 1.4.1 proxy factory. One
call per chain is unchanged, so every published intent stays valid.
`decodeDeploymentCall` gains a `safe-create` flavor carrying the singleton,
salt nonce, owners, threshold, fallback handler and the address the factory
would compute — predicted from the newly pinned
`SAFE_PROXY_CREATION_CODE` in `@bananapus/nana-sdk-core/safe`, with no chain
read. `intentCalls(intent)` returns each chain's setup calls and its launch,
decoded, so a client renders both without repeating the rule. `intentRow`,
`mergeSearch`, `ensureDeployed` and `publishSignedIntent` are unchanged.
