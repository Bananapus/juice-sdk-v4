---
"@bananapus/nana-sdk-core": minor
---

`@bananapus/nana-sdk-core/jbcenter` now carries the parts every intent client
was rebuilding: `publishSignedIntent` prepares an intent, signs JB Center's
message only once the prepared envelope carries the same values as the one
built locally and the message commits to its content hash — throwing
`JBCenterIntentMismatchError` otherwise — and publishes it with the caller's
own signer; `describeCenterRefusal` turns a sponsorship refusal into one fixed
sentence per `sponsor_quota`, `sponsor_budget`, `unavailable`, and a bare 429
or 503, and `null` for anything else, so no provider text reaches a reader;
`decodeDeploymentCall` reads `HomerunDeployer.launchFundFor` back as a
`"homerun-fund"` launch with its owner, project uri, token name, ticker, start,
salt, and peer sucker deployers; and `searchIntents` filters by `owner` and by
`publisher`.
