---
"@bananapus/nana-sdk-core": minor
---

`@bananapus/nana-sdk-core/jbcenter` deploys an intent one chosen chain at a
time, whoever pays for each. `sponsorableChains` and `unsponsoredChains` split
a chain list per chain; `isSponsorable` still means every chain.
`requestDeploy(id, { chainIds })` asks JB Center's sponsor for a subset.
`requestRelay(id, chainId)` reads the forward request Center's sponsor signed
for a chain it does not sponsor, validated field by field and returned with
wei and gas as `bigint`, alongside the setup calls that go first.
`ensureDeployed` takes `chainIds` to limit the run and `relayPaid` to send the
chains Center does not sponsor from the caller's own wallet: it fetches each
request, hands it to `relayPaid`, records the deployment it returns, and polls
with the sponsored chains. The forwarder keeps Center's sponsor as the sender,
so relay-paid chains pair with sponsored ones. `selfPaid` is unchanged and is
now documented as the option that breaks that pairing for a deployer whose
salt is scoped to the sender. `JBCenterDeployment` gains `forwarded`, which
says whether Center's forwarder carried that launch; `ensureDeployed` reads it
to decide whether the sponsor may still take the run's remaining chains. This
package still sends no transaction.
