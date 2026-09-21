---
"@bananapus/nana-sdk-core": minor
---

`@bananapus/nana-sdk-core/jbcenter` now carries the parts every intent client
was rebuilding: `publishSignedIntent` prepares an intent, signs JB Center's
message only once the prepared envelope carries the same values as the one
built locally and the message is Center's whole signing message for that
content hash — throwing `JBCenterIntentMismatchError` otherwise — and publishes it
with the caller's own signer; `describeCenterRefusal` turns a sponsorship refusal into one fixed
sentence per `sponsor_quota`, `sponsor_budget`, `unavailable`, and a bare 429
or 503, and `null` for anything else, so no provider text reaches a reader;
`decodeDeploymentCall` reads `HomerunDeployer.launchFundFor`, at Homerun's own
deployer address on each chain it is deployed to, back as a `"homerun-fund"`
launch with its owner, project uri, token name, ticker, target, start, salt,
and peer sucker deployers; and `searchIntents` filters by `owner` and by
`publisher`. Those two filters need a JB Center deployment that supports them:
Center main after its intents-docs pull request.
