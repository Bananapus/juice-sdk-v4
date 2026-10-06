# Juice SDK v4

[![npm version](https://img.shields.io/npm/v/@bananapus/nana-sdk-core.svg)](https://www.npmjs.com/package/@bananapus/nana-sdk-core)
[![npm version](https://img.shields.io/npm/v/@bananapus/nana-sdk-react.svg)](https://www.npmjs.com/package/@bananapus/nana-sdk-react)

A JavaScript SDK for building applications on the [Juicebox protocol](https://docs.juicebox.money/) (V4, V5, and V6).

## JB Center

Use the framework-independent JB Center client to prepare and publish undeployed
project intents, include them in search, record verified deployments, and pin
project media. It also provides constrained read-only RPC access without exposing
an upstream provider credential:

```ts
import {
  createJBCenterClient,
  createJBCenterDeploymentCall,
  publishSignedIntent,
} from "@bananapus/nana-sdk-core/jbcenter";

const center = createJBCenterClient();

// Freeze the exact viem request the wallet, Safe, or Relayr will execute.
const deploymentCall = createJBCenterDeploymentCall({
  chainId: launchRequest.chainId,
  address: launchRequest.address,
  abi: launchRequest.abi,
  functionName: launchRequest.functionName,
  args: launchRequest.args,
});

// Prepares the intent, checks Center's envelope and message before the signer
// opens, and publishes what it checked.
const intent = await publishSignedIntent(
  center,
  {
    format: "juicebox.money/v1",
    deploymentVersion: "6",
    chainIds: [launchRequest.chainId],
    deploymentCalls: [deploymentCall],
    jb,
  },
  (message) => walletClient.signMessage({ account, message }),
  { publisher: account.address },
);

// No reconciler credential is needed. Center matches this transaction's
// direct or nested call trace to the publisher's signed deployment call.
await center.recordDeployment(intent.id, {
  chainId: launchRequest.chainId,
  projectId,
  transactionHash,
});

const chainId = await center.rpc<`0x${string}`>(1, {
  method: "eth_chainId",
});
```

### JB Center RPC

The chain-bound provider is structurally compatible with EIP-1193 consumers
such as viem. The request options viem passes, the read's `signal` among them,
go with every try:

```ts
import { custom, createPublicClient } from "viem";
import { mainnet } from "viem/chains";
import { createJBCenterRpcProvider } from "@bananapus/nana-sdk-core/jbcenter";

const publicClient = createPublicClient({
  chain: mainnet,
  transport: custom(createJBCenterRpcProvider(mainnet.id)),
});
```

JB Center load balances reads across nodes that import blocks at slightly
different times. A read pinned to a block one node has imported can land on a
node that has not, which answers JSON-RPC -32001 ("Requested resource not
found." in viem). The provider asks again after 250, 500, 1,000, 2,000 and
2,000 ms (`JBCENTER_BLOCK_LAG_RETRY_DELAYS_MS`; `blockLagRetryDelaysMs` sets
other waits, and `[]` none). Waiting is the only correct answer: reading
`latest` instead would read state older than the block the read pins. Nothing
else is retried, because -32001 is the one answer that changes by itself once
the node catches up: a revert, bad params or a refusal comes back the same, and
a 429 must wait out Center's minute. A wait between tries ends at once when the
read's signal aborts, and a read whose signal has aborted sends nothing. `rpc`
is always one request.

Center counts each origin's requests, every chain's together and refused ones
included: 600 a minute for an allowlisted first-party origin, 120 for any other.
Past that it refuses the rest of the minute with a 429 whose Retry-After says
how long is left. To keep a page within it, create one limiter when the page
loads and give it to every chain's provider:

```ts
import { custom, http } from "viem";
import {
  createJBCenterLimiter,
  createJBCenterRpcProvider,
} from "@bananapus/nana-sdk-core/jbcenter";

// Once per page: at module level in the browser.
const centerLimiter = createJBCenterLimiter({ slots: 2 });

const transport = custom(
  createJBCenterRpcProvider(chainId, { limiter: centerLimiter }),
  { retryCount: 1 },
);

// A transport to Center that does not go through the provider.
const overHttp = centerLimiter.transport(http(rpcUrl));
```

A limiter keeps at most `slots` requests in flight, every chain's together, and
starts them in the order they were made; `slots` has no default. Slots bound
how many requests are in flight, not how many go out a minute: two in flight
send up to 343 a minute at a 0.35 s round trip, under 600 but over 120. Each
try takes its own slot, so a read waiting out a node behind the head holds
none. After a 429 that says how long to wait, nothing starts until that has
passed, a minute at most (`JBCENTER_MAX_RATE_LIMIT_PAUSE_MS`). A request whose
signal aborts while it waits leaves the line unsent; one under way answers to
its own signal and frees its slot when it ends. Without a limiter, requests go
as they are made.

Give the limiter to the provider or wrap one transport with it, once. A
transport that already sends through the limiter, one built on a provider that
has it or one it wraps already, fails each request at once with a TypeError
and sends nothing. A request that asks its own limiter for another after an
await cannot be seen, and would wait on the slot it holds, so a request never
does.

`errorChain`, `isRateLimited` and `retryAfterOf` read a refusal through the
errors viem wraps around it: the chain of causes, whether any link is a 429,
and how many seconds it asked to wait, from the SDK's `retryAfter` or the
Retry-After header on viem's HTTP error.

### Project intents

A published intent (`publishSignedIntent`, above) is firm: JB Center exposes no edit
or withdraw endpoint, so the signed envelope is final the moment it publishes.

Every chain in an intent is launched by exactly one sender - JB Center's
sponsor - so the tokens, suckers and 721 hooks a deployer scopes to its caller
land on the same addresses across chains. Who pays for the gas is a separate
question. `ensureDeployed` runs one intent's chains and picks the payer per
chain: JB Center pays for the chains it sponsors, and `relayPaid` sends the
forward request Center signed for the chains it does not, from the visitor's
own wallet, with Center's sponsor still the sender the launch sees. Apps never
call `requestDeploy` or `requestRelay` directly; `ensureDeployed` does.

```ts
import { ensureDeployed } from "@bananapus/nana-sdk-core/jbcenter";

const projectIdByChainId = await ensureDeployed({
  client: center,
  intent,
  // Only these chains this time; the rest stay undeployed for a later run.
  chainIds: [8453, 1],
  // Sends the chains JB Center does not sponsor. The setup calls go first,
  // from the same wallet, then the forwarder call with its value and gas.
  relayPaid: async (request) => {
    for (const call of request.setup) await sendFromWallet(call);
    const transactionHash = await sendFromWallet(request);
    return { chainId: request.chainId, ...(await readLaunch(transactionHash)) };
  },
  onStep: (step) => console.log(step.chainId, step.status),
});
```

`sponsorableChains` and `unsponsoredChains` split a chain list the way this run
does, so a UI can label each chain "free" or price it from the relay request's
`gas` and `value` before anyone commits. Two visitors who ask for the same
chain get the same forwarder nonce: the second transaction reverts, and the
answer is to run `ensureDeployed` again for that chain.

`selfPaid` is the other sender, and it is a different bargain: it runs the
app's own launch pipeline, which makes the app's wallet the sender. A deployer
that scopes its token and sucker salt to the sender then produces different
addresses on that chain, breaking cross-chain pairing, so reach for `relayPaid`
whenever Center can sign the chain and keep `selfPaid` for launches that do not
pair.

```ts
const projectIdByChainId = await ensureDeployed({
  client: center,
  intent,
  // Runs the app's own launch pipeline for every chain in the run, then
  // reports each result back to Center.
  selfPaid: (calls) =>
    Promise.all(calls.map((call) => runOwnLaunchPipeline(call))),
});
```

`relayPaid` and `selfPaid` are never both given: one run, one payer per chain.

Finishing another wallet's partially self-paid intent produces different
sucker, ERC-20, and 721-hook addresses and breaks cross-chain linking, so only
the wallet that sent the first chain should resume a self-paid intent. A
relay-paid chain carries no such rule: whoever sends it, the forwarder reports
Center's sponsor, so anyone can finish the remaining chains of an intent whose
deployments were all sent through Center. Each recorded deployment says which
it was in `forwarded`, and `ensureDeployed` reads it to pick the run's sender.

Render an intent's frozen calldata without re-decoding it yourself:

```ts
import { decodeDeploymentCall } from "@bananapus/nana-sdk-core/jbcenter";

const launch = decodeDeploymentCall(deploymentCall);
if (launch.flavor === "revnet") {
  // launch.stages, launch.description, launch.accountingContexts
}
```

A chain in an intent can carry more than one call. The last call for a chain is
its launch; every call before it is a setup call that creates a Safe through
the canonical Safe 1.4.1 proxy factory, so a project can be owned by a multisig
that does not exist yet — Safe addresses depend only on the factory, singleton,
initializer and salt nonce, so the creation and the launch can land in either
order. A chain carries at most four calls. `intentCalls` applies that rule once,
for every chain:

```ts
import { intentCalls } from "@bananapus/nana-sdk-core/jbcenter";

for (const [chainId, { setup, launch }] of intentCalls(intent)) {
  for (const call of setup) {
    if (call.decoded.flavor === "safe-create") {
      // call.decoded.address, .owners, .threshold, .saltNonce
    }
  }
  // launch.decoded is whatever the chain's last call decodes to, usually a launch.
}
```

A setup call reads back as `safe-create` only when it is a canonical
`createProxyWithNonce` to the canonical factory for the canonical singleton and
fallback handler, with 1 to 20 unique nonzero owners, a threshold inside the
owner count, and no setup hook or payment. Anything else makes the whole
envelope unreadable, so a client never renders a setup call it cannot name.
`ensureDeployed`'s `selfPaid` callback receives every remaining call, setup
calls included, in the order the intent carries them.

List views merge deployed projects and undeployed intents by creation time
with `mergeSearch`:

```ts
import { mergeSearch } from "@bananapus/nana-sdk-core/jbcenter";

const rows = mergeSearch(deployedProjectRows, searchPage.items);
```

An undeployed intent in a merged list routes to `/intent/<id>` (`intentPath`).
Once `isFullyDeployed` reports every chain deployed, redirect that route to
the project's own page instead of continuing to render the intent view.

A publisher signs JB Center's prepared message, not its own - so
`publishSignedIntent` (above) checks it first, with the app's own signer
passed in; this package never reaches a wallet.

It refuses with a `JBCenterIntentMismatchError` before calling the signer when
JB Center's prepared envelope carries different values than the intent built
locally (`reason: "envelope"` - key order, chain order, and the casing of
addresses and calldata are JB Center's to choose, the values are not), or when
the prepared message is not Center's signing message for that content hash
(`reason: "message"`). What it checked is what it publishes, so an intent the
caller keeps writing to while the signer is open cannot change under it. A
client whose Center asks for another message passes that template as
`expectMessage`.

Search Center's undeployed intents by `owner` - the intent's `jb.owner` - or
by `publisher`, the address that signed it; both are matched without regard to
checksum casing:

```ts
const mine = await center.searchIntents({ owner: account.address });
```

When JB Center declines to sponsor a deploy, show its refusal in fixed
wording rather than a provider's text:

```ts
import { describeCenterRefusal } from "@bananapus/nana-sdk-core/jbcenter";

const refusal = describeCenterRefusal(error);
if (refusal) showNotice(refusal.message);
else throw error;
```

The module's helpers, in full:

| Helper                               | What it does                                                                                          |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `createJBCenterClient`               | Builds the `JBCenterClient` every helper below takes.                                                 |
| `createJBCenterRpcProvider`          | A chain-bound EIP-1193 provider over JB Center's read-only RPC that waits out a node behind the head. |
| `createJBCenterLimiter`              | One page's slots for JB Center's rate limit, shared by every chain's provider.                        |
| `errorChain`                         | An error and what it wraps, outermost first.                                                          |
| `isRateLimited`                      | Whether an error, or anything it wraps, is a 429.                                                     |
| `retryAfterOf`                       | How many seconds a refusal asked to wait.                                                             |
| `createJBCenterDeploymentCall`       | Freezes a typed viem request into the `{ chainId, to, data }` call an intent signs.                   |
| `publishSignedIntent`                | Prepares, checks JB Center's envelope and message, signs with the caller's signer, publishes.         |
| `JBCenterIntentMismatchError`        | Thrown by `publishSignedIntent` before signing; `reason` is `"envelope"` or `"message"`.              |
| `decodeDeploymentCall`               | Reads a frozen call back as a project, 721, omnichain, or revnet launch, or a Safe creation.          |
| `intentCalls`                        | An intent's calls per chain, decoded: the setup calls before it, then the launch.                     |
| `mergeSearch`                        | Interleaves undeployed intent rows into a list of deployed project rows by creation time.             |
| `intentRow`                          | Turns one search item into the row `mergeSearch` merges.                                              |
| `intentPath`                         | The `/intent/<id>` route for an undeployed intent.                                                    |
| `deployedChains`                     | The chain ids an intent has landed on.                                                                |
| `isFullyDeployed`                    | Whether every chain in the intent has landed.                                                         |
| `isSponsorable`                      | Whether JB Center's sponsor covers every chain in the list.                                           |
| `sponsorableChains`                  | The chains in a list JB Center's sponsor covers, in the order given.                                  |
| `unsponsoredChains`                  | The chains in a list JB Center's sponsor does not cover.                                              |
| `ensureDeployed`                     | The pre-step before an intent's first on-chain write: one sender per intent, polled to completion.    |
| `EnsureDeployedError`                | Thrown by `ensureDeployed` when a chain cannot be finished; carries the `chainId`.                    |
| `describeCenterRefusal`              | The fixed sentence for a sponsorship refusal, or `null` when the failure is something else.           |
| `JBCenterRequestError`               | A non-2xx answer from JB Center; carries `status`, `code`, `requestId`, `retryAfter`.                 |
| `JBCenterTimeoutError`               | A request that passed its `timeoutMs`.                                                                |
| `JBCenterRpcError`                   | A JSON-RPC error from the read-only RPC; carries `code` and `data`.                                   |
| `JBCENTER_SPONSORED_CHAIN_IDS`       | The chain ids JB Center's sponsor covers.                                                             |
| `JBCenterClient`                     | The client class `createJBCenterClient` returns.                                                      |
| `JBCENTER_DEFAULT_URL`               | The JB Center origin a client uses when none is given.                                                |
| `JBCENTER_REQUEST_TIMEOUT_MS`        | The default per-request timeout.                                                                      |
| `JBCENTER_DEPLOYMENT_TIMEOUT_MS`     | The timeout a sponsored deploy request is given.                                                      |
| `JBCENTER_PIN_TIMEOUT_MS`            | The timeout a media pin is given.                                                                     |
| `MAX_JBCENTER_RESPONSE_BYTES`        | The largest response body a client reads.                                                             |
| `JBCENTER_RPC_METHODS`               | The JSON-RPC methods JB Center's read-only RPC accepts.                                               |
| `JBCENTER_BLOCK_LAG_RETRY_DELAYS_MS` | The waits before a read a node behind the head could not answer is asked again.                       |
| `JBCENTER_MAX_RATE_LIMIT_PAUSE_MS`   | The longest a 429 pauses a limiter.                                                                   |

## Inline Safe creation

`@bananapus/nana-sdk-core/safe` prepares ordinary Safe 1.4.1 multisigs without
React, a wallet, a relayer, or a hosted account service. Apps supply the owner
addresses and approval threshold, and assign the resulting address to their own
project Owner, Operator, or other role:

```ts
import {
  bundleSafeLaunch,
  checkSafeDeployments,
  resolveSafeAddress,
  verifySafeDeployments,
  verifySafeLaunchSimulation,
  type SafeCall,
} from "@bananapus/nana-sdk-core/safe";

// Persist the nonce and returned plan with the draft so retries use the same Safe.
// publicClients contains a read client for every destination chain.
const owner = await resolveSafeAddress(
  { kind: "create", owners: signerAddresses, threshold: 2, saltNonce },
  publicClients,
);
const plans = owner.plan ? [owner.plan] : [];

// Alternatively, accept an existing address without deploying a new Safe:
const operator = await resolveSafeAddress(
  { kind: "existing", address: existingOperatorAddress },
  [],
);

// Build an app-specific launch using owner.address and operator.address.
// Only bundle calls whose authorization tolerates Multicall3 as msg.sender.
const launchCall: SafeCall = buildAuthenticatedLaunchCall({
  owner: owner.address,
  operator: operator.address,
});
await checkSafeDeployments(publicClient, plans);
const batch = bundleSafeLaunch(launchCall, plans);
const simulation = await publicClient.call({ ...batch, account });
await verifySafeLaunchSimulation(publicClient, plans, simulation.data);

// The app signs/submits `batch`, then waits for a successful receipt.
await verifySafeDeployments(publicClient, plans, {
  blockNumber: receipt.blockNumber,
});
```

Each new configuration accepts 1–50 unique signer addresses and a threshold from
1 through the signer count. `saltNonce` is a 32-byte hex value. Resolution verifies
the canonical Safe factory, singleton, and fallback handler runtimes on every
supplied chain. Safe initialization adds no modules, guards, setup hooks, or
payments. Existing-address resolution normalizes the address; it does not certify
that the supplied address is a Safe.

The same Safe address across chains requires the same ordered signers,
threshold, nonce, initializer, factory, and proxy creation bytecode. Create-mode
resolution rejects differing creation bytecode across the supplied clients. Keep
the plan stable when resuming a launch. Preflight and receipt verification check
the deployed Safe runtime and owner policy; verification errors must prevent an
app from reporting success.

`SAFE_PROXY_CREATION_CODE` pins those proxy creation bytes, so an address can be
predicted from a signed call with no chain read; anything about to be deployed
still reads the factory on each chain.

`bundleSafeLaunch` uses Multicall3 `CALL`, so the launch contract sees Multicall3
as `msg.sender`. Use a sender-independent launch or a forwarded call that already
authenticates its signer. `buildSafeDeploymentTx(chainId, plans)` prepares a
separate deployment transaction when the launch must preserve its original
caller. Deployment calls tolerate retries, so a successful outer simulation
alone is insufficient: verify its inner results and the deployed Safes as shown
above.

Compose and submit one batch per destination chain. A Relayr integration may
fund several chains with one payment, but chains confirm independently; these
batches do not provide atomic execution across chains. The client owns signing,
funding, progress, and recovery.

## Safe authority, queue and distribution checks

The checks web clients run around a project's Safe and its distributions. None
of them signs or sends; every service and RPC answer is read as untrusted.

`@bananapus/nana-sdk-core/safe` reads who controls an address and reproduces a
Safe on another chain:

- `readAuthorityIdentity(client, address, { blockNumber })` is `eoa`,
  `delegated-eoa` (an exact EIP-7702 designator, never a Safe), `contract`, or
  a `safe` with its live policy: a recognized proxy runtime whose slot zero
  names a recognized singleton (`RECOGNIZED_SAFE_RELEASES`), its owners,
  threshold, modules, guard and fallback handler. Every call into the proxy is
  a raw, gas- and return-bounded `eth_call`, made only after slot zero is
  known. An RPC failure is `null`, never an EOA or a Safe.
- `authorityIdentitiesMatch`, `readMatchingAuthorityIdentities` and
  `readCrossChainHandleAuthority` compare an authority across chains: the same
  EOA, or plain Safes (EOA owners, no modules, no guard) with the same policy
  and code. Safe's Ethereum and SafeL2 singletons count as one release.
- `readBoundedSafeNonce` and `readBoundedSafeApprovedHash` read one word each.
- `validateSafeCreationForCurrentPolicy`, `buildSafeProxyFactoryCall` and
  `prepareSafeSameAddressDeployment` reproduce a Safe at its address on
  another chain only when its creation replays today's plain policy, the
  destination address is free, the factory, singleton, owners and fallback
  handler check out there, and a raw simulation returns the Safe's address.
- `packMultiSend`, `encodeMultiSend`, `decodeMultiSend` and `multiSendCallsOf`
  handle MultiSendCallOnly batches of plain calls. Batches are built for
  `MULTI_SEND_CALL_ONLY` (1.3.0). `multiSendCallsOf` reads a batch sent through
  any of `MULTI_SEND_CALL_ONLY_DEPLOYMENTS` (1.3.0 canonical and EIP-155, and
  1.4.1, which Safe{Wallet} uses for a 1.4.1 Safe).

`@bananapus/nana-sdk-core/safe-service` handles Safe transactions and Safe's
transaction service:

```ts
import {
  canonicalSafeTxHash,
  listPendingSafeTransactions,
  safeExecutionResult,
} from "@bananapus/nana-sdk-core/safe-service";

// Every row belongs to `safe` and hashes to its advertised safeTxHash.
const queue = await listPendingSafeTransactions(chainId, safe, onchainNonce);

// After an execution: success, failed (ExecutionFailure: the nonce is spent),
// reverted (nothing ran) or unproven, from Safe 1.3 or 1.4 events.
const result = safeExecutionResult(receipt, safe, safeTxHash);
```

It also has `SAFE_TX_TYPES`, `safeTransactionMessage`, `safeTransactionHash`,
`requireSafeExecutionSuccess`, `usableSafeConfirmations`,
`safeExecutionSignatures`, `safeExecutionArgs`, `safeProposalFor`,
`safeBatchProposalFor`, `safeTransactionMatchesCall`, `nextProposalNonce`,
`onchainApprovalStep`, `findPendingSafeTransaction`, `readSafeTransaction`,
`proposeSafeTransaction`, `submitSafeConfirmation`, `fetchSafesOwnedBy`,
`fetchSafeCreation` and `safeTransactionUrl`. Service calls accept a `fetch`
of the app's own and a `signal`, and send the optional `jb-safe-api-key` from
local storage. A 429 is retried up to three times after the wait its
Retry-After asks for (delay-seconds or an HTTP-date) when that is 10 seconds or
less (`SAFE_SERVICE_MAX_RETRY_WAIT_MS`), or after 1, 2 and 3 seconds without
one, and the `signal` ends the wait. A 429 that asks for longer, or whose
Retry-After cannot be read, is handed back at once. `retryRateLimited: false`
hands back the first 429 instead, for a server render that must not wait.

`@bananapus/nana-sdk-core/v6` proves a distribution from its receipt:
`verifyPayoutReceipt` and `verifyReservedDistributionReceipt` require every
reviewed split's exact share, the reviewed ruleset, sender, owner and amounts,
no recipient failure, and, for reserved tokens, burns of only the shares sent
to `0x…dEaD`. Reserved tokens accrue until the distribution runs, so a reserved
receipt may distribute more than was reviewed, never fewer: each share is
checked against the count it distributed, which
`verifyReservedDistributionReceipt` returns. A refusal means: keep the
transaction, and do not distribute the same amounts again.

## Relayr sessions whose bundle won't run as signed

A Relayr session signs one ERC-2771 forward request per chain. When its
bundle won't run as signed (an unpaid quote released, a payment or a bundle
that reverted, a nonce that moved), `@bananapus/nana-sdk-core/review/relayr`
decides from the chain what the session may do next. These are Juicebox
Money's rules (rulings R104, R114 and R117), framework-free: plain data in,
verdicts out, no storage and no UI copy.

The forwarder is OpenZeppelin's ERC2771Forwarder: a request runs only at its
signer's current nonce and while its deadline is at least the block's
timestamp, and an execute that reverts leaves the nonce unused. Each request
is classified at a canonical finalized block on its chain: dead once the
forwarder's nonce for its signer moved past the saved one (it may have run),
or once its deadline is strictly earlier than that block's timestamp.
Anything that can't be read (an RPC error, a node without the finalized tag,
a block no longer canonical) counts as live.

```ts
import {
  relayrRequestStates,
  relayrRequestsDead,
  relayrRequestsVerdict,
  relayrSessionOutcome,
  relayrSignedRequests,
} from "@bananapus/nana-sdk-core/review/relayr";

// clientFor(chainId) is a PublicClient for that chain.
const requests = relayrSignedRequests(session.publishedEntries, session.nonces);
if (requests) {
  const verdict = relayrRequestsVerdict(
    await relayrRequestStates(clientFor, requests),
  );
  const outcome = await relayrSessionOutcome(verdict, {
    nonces: session.nonces,
    recheck: () => reverifyTheAction(), // omit where it can't run
  });
}

// Ruling R117: another action may sign on these chains once this is true.
const released = await relayrRequestsDead(clientFor, requests);
```

`relayrSessionOutcome` returns one `kind`:

- `hold`: a request can still run and one may already have run. No new
  signature, no new quote and no Discard until `until`.
- `refresh`: a request can still run and none moved. The session may quote or
  pay its saved requests again while they still verify and the action's
  recheck passes, or sign each again at its saved nonce (`nonces`, null when it
  saved none). The forwarder runs one request per nonce, so an old request and
  its refresh never both run. A signature at any other nonce waits until every
  request is dead.
- `re-sign`: every request is dead and unused and the recheck passed. Sign the
  calls again at `nonces`.
- `discard`, with a `reason`: every request is dead. `ran` when a nonce moved
  or the session saved no nonces (one may have run), `changed` when none ran
  and the recheck refuses (its refusal is `error`), and `expired` when none ran
  and no recheck was given, as in an account view, whose action still signs
  them again. Discard ends only the session, never the action's draft.
- `reorg-hold`: every request is dead and none moved, but a finalized nonce is
  below a saved one, as after a reorg drops an earlier forwarded transaction.
  It holds until the nonce catches up. It is also the outcome when `nonces` is
  omitted or empty, or there were no requests: such a session is neither
  discarded nor signed again.
- `unchecked`: the recheck failed because the node could not answer: within
  its first eight errors, an HTTP, timeout or WebSocket failure, a JSON-RPC
  error (such as -32001, -32005 or -32603), or a contract revert without revert
  data, which viem builds from a transient -32603. Nothing is decided. A revert
  that carries revert data is the chain answering and reads as `changed`, as
  does the action's own refusal.

`nonces` must be the saved nonces of exactly the requests that were
classified, in the same order, since `refresh` and `re-sign` hand them back to
sign at. The recheck resolves when the action's calls still apply and throws
when they don't, and runs only once every request is dead and unused. An
outcome's `error` is never enumerable, so no JSON or log of it shows an RPC
URL's key. A deadline or nonce that can't be read (anything but a safe
integer, decimal or 0x-hex digits, or a bigint) leaves its request live. A
session reserves its signers' forwarder nonces on its chains exactly while one
of its requests is live, never by a device clock or a quote's expiry: requests
that can't be classified never count as dead. `isRelayrDiscardReason` reads a
stored reason back. `relayrDeadlinePassed(client, deadline)` says whether a
canonical finalized block is past a deadline, such as a quote's payment
deadline, and `atCanonicalFinalizedBlock(client, read)` runs any read at that
block.

What each app replaces:

- Juicebox Money: its copies in `src/lib/relayr.ts` (`relayrRequestStates`,
  `relayrRequestsVerdict`, `relayrRequestsDead`, `relayrDeadlinePassed`,
  `atCanonicalFinalizedBlock`, `finalizedForwarderNonce`, `deadSessionNonces`
  and its recheck failure check, `RelayrDiscardReason` and its guard) and
  `savedForwardRequests` in `src/lib/forwarder-authorization.ts`. Its copy
  (`relayrHeldMessage`, the discard lines) and storage stay in the app.
- revnet.money: `useReviewedRelayr`'s release of an unpaid quote by the device
  clock (`relayrAuthorizationExpiresAt`) and its signing at the live nonce
  after one. A session holds while one of its requests is live, signs again
  only at its saved nonces, and reserves the forwarder nonce until every
  request is dead.
- Homerun: `fund-launch-relayr`'s inline finalized-block reads
  (`unusedSignaturesExpired`, `originalPaymentExpired` and the expiry check in
  its reconcile). A launch whose nonce moved can never be cancelled there; with
  these rules it ends with the `ran` Discard.

## Installation

```bash
# For React applications
npm install @bananapus/nana-sdk-react @bananapus/nana-sdk-core

# For vanilla JavaScript/Node.js
npm install @bananapus/nana-sdk-core

# For Revnet-specific functionality
npm install revnet-sdk
```

## Quick Start

### React Application

```tsx
import {
  JBProjectProvider,
  useJBRuleset,
  useTokenCashOutQuoteEth,
} from "@bananapus/nana-sdk-react";
import { formatTokenAmount } from "@bananapus/nana-sdk-core";

function ProjectDashboard() {
  const projectId = 1n;

  return (
    <JBProjectProvider
      projectId={projectId}
      ctxProps={{
        metadata: {
          ipfsGatewayHostname: "jbm.infura-ipfs.io",
        },
      }}
    >
      <ProjectDetails />
    </JBProjectProvider>
  );
}

function ProjectDetails() {
  const { ruleset } = useJBRuleset();
  const { data: cashOutQuote } = useTokenCashOutQuoteEth({
    tokenAmount: 1000000000000000000n, // 1 token
  });

  return (
    <div>
      <h2>Project Ruleset #{ruleset?.cycleNumber}</h2>
      <p>Cash out value: {formatTokenAmount(cashOutQuote)} ETH</p>
    </div>
  );
}
```

### Core Utilities

```javascript
import {
  formatTokenAmount,
  parseTokenAmount,
  ReservedPercent,
  CashOutTaxRate,
  downsampleTimeSeries,
} from "@bananapus/nana-sdk-core";

// Format token amounts for display
const formatted = formatTokenAmount(1000000000000000000n); // "1.0"

// Work with project economics
const reservedRate = new ReservedPercent(10); // 10% reserved tokens
const taxRate = new CashOutTaxRate(2.5); // 2.5% cash out tax

// Fetch complete history first, then retain its visual shape within a chart budget
const chartPoints = downsampleTimeSeries(
  completeHistory,
  3000,
  (point) => point.timestamp,
  (point) => point.price,
);
```

## Packages

| Package                                             | Description                                                          | NPM                                                                                                                               |
| --------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| [`@bananapus/nana-sdk-core`](./packages/core)       | Core utilities, contract bindings, and data types                    | [![npm](https://img.shields.io/npm/v/@bananapus/nana-sdk-core.svg)](https://www.npmjs.com/package/@bananapus/nana-sdk-core)       |
| [`@bananapus/nana-sdk-react`](./packages/react)     | React hooks, contexts, and components                                | [![npm](https://img.shields.io/npm/v/@bananapus/nana-sdk-react.svg)](https://www.npmjs.com/package/@bananapus/nana-sdk-react)     |
| [`@bananapus/nana-sdk-connect`](./packages/connect) | Sign in with a Juicebox Center passkey account or an external wallet | [![npm](https://img.shields.io/npm/v/@bananapus/nana-sdk-connect.svg)](https://www.npmjs.com/package/@bananapus/nana-sdk-connect) |

### Core Package Features

- **Contract interactions** - Type-safe contract bindings for all Juicebox contracts
- **Data utilities** - Format, parse, and validate financial data
- **IPFS helpers** - Upload and fetch project metadata
- **Fee calculations** - Compute platform and cash-out fees
- **Address utilities** - Chain-specific contract address resolution

### React Package Features

- **Project context** - `JBProjectProvider` for complete project data
- **Specialized hooks** - Token operations, ruleset management, cross-chain functionality
- **Data contexts** - Chain, contract, metadata, and token contexts
- **Components** - Pre-built components for common UI patterns

## Multi-Chain Support

The Juice SDK supports the following networks:

- **Ethereum** (Mainnet & Sepolia)
- **Optimism** (Mainnet & Sepolia)
- **Base** (Mainnet & Sepolia)
- **Arbitrum** (One & Sepolia)

See https://docs.juicebox.money to learn more.

## Working with Fixed-Point Data

Juicebox contracts use fixed-point math for precision. The SDK provides helper classes:

```javascript
import {
  ReservedPercent,
  CashOutTaxRate,
  RulesetWeight,
} from "@bananapus/nana-sdk-core";

// Create percentage values
const reserved = new ReservedPercent(15); // 15%
const tax = new CashOutTaxRate(2.5); // 2.5%

// Work with weights
const weight = new RulesetWeight(1000000000000000000n); // 1e18

// Convert to/from contract values
const contractValue = reserved.toContractValue(); // 1500 (out of 10000)
const percentage = reserved.formatAsPercent(); // "15%"
```

## API Reference

### Core Utilities

- [Data utilities](./packages/core/src/utils/data.ts) - Fixed-point data types and formatters
- [Contract utilities](./packages/core/src/utils/contracts.ts) - Address resolution and contract helpers
- [IPFS utilities](./packages/core/src/utils/ipfs.ts) - Metadata upload and retrieval
- [Time-series utilities](./packages/core/src/utils/timeSeries.ts) - Shape-preserving chart downsampling

### React Hooks

- [Generated Bendystraw types](./packages/react/src/generated/graphql.ts) - Types generated from the committed schema and reviewed queries
- [Custom hooks](./packages/react/src/hooks/) - Higher-level functionality hooks

## Deployment generations

`jbContractAddress[6]` records only executed deployments on each chain. The
floor-fix buyback hook, router, gateway and ratio feed are deployed on Ethereum,
Optimism, Base, Arbitrum, Sepolia, Base Sepolia and Arbitrum Sepolia. OP Sepolia
has only the ratio feed from this rollout. The canonical ABI exports describe
this executed generation, sourced from Sepolia, with
`jbBuybackHookPreviousAbi`, `jbBuybackHookV1Abi`,
`jbRouterTerminalPreviousAbi`, and `jbRouterTerminalV1Abi` retained for older
interfaces. `jbContractAbiGeneration[6]` identifies which ABI generation each
canonical router or hook uses; `jbContractAddressHistory[6]` preserves retired
addresses for activity and projects that have not migrated. A deployment's
presence does not prove that a project has selected it: use `resolveRouterPath`
and the registry's project-specific hook selection.

Generation reads `PROTOCOL_DEPLOYMENTS_DIR` when set, otherwise each sibling
repository's flat `deployments/<chain>/` tree, then a pinned
`.contract-source/deploy-all-v6` checkout, then npm artifacts when no local tree exists.
Sticky (`StickyDeployer`, `StickyHook`, `StickyDistributor`,
`StickyRewardReceiverFactory`, `StickyAutoStick`) is not in deploy-all-v6 and
has no npm artifacts: generation reads `STICKY_DEPLOYMENTS_DIR` when set,
otherwise a `mejango/sticky` checkout at `../extensions/sticky`, then a pinned
`.contract-source/sticky` checkout, and fails when none exists.
Missing records in a selected tree stay absent; malformed records fail the
build. Hook, router, gateway and ratio-feed artifacts (including retained
generations) must identify the expected contract and chain and contain a successful
mined receipt with transaction and block hashes. CI pins the deployment source independently of npm publication. After
an executed rollout, regenerate and review the source pin and fixture together:

```sh
export PROTOCOL_DEPLOYMENTS_DIR=../deploy-all-v6 STICKY_DEPLOYMENTS_DIR=../extensions/sticky
npm run generate --workspace @bananapus/nana-sdk-core
node --import tsx scripts/check-v6-protocol.ts --update-fixture
npm run protocol:check
```

`buildBuybackPayMetadata` emits the three-word quote for hook 1.4.0 under the
selected hook's `pay` metadata ID. It defaults `skipSplits` to false. A zero
minimum uses the oracle floor and its mint fallback; an explicit minimum remains
a settlement guarantee.

## Development

### Prerequisites

- Node.js 22.23.1 (`nvm use` reads the repository pin)
- npm 10.9.8

### Setup

```bash
# Use the pinned Node/npm toolchain from .nvmrc and package.json.
nvm use

# Install exact locked dependencies
npm ci

# Build all packages
npm run build

# Run tests
npm run test

# Run coverage and type safety gates
npm run test:coverage
npm run type-check

# Verify V6 contract parity and the reviewed wallet boundary inventory
npm run protocol:check
npm run wallet:check

# Run the full deterministic gate
npm run check

# Format code
npm run format
```

See [TESTING.md](./TESTING.md) for the pinned deploy-all-v6 source commit,
coverage denominators, deterministic network policy, and CI/release invariants.

### Adding New Contracts

1. Modify [`contracts.ts`](./packages/core/src/contracts.ts)
2. Regenerate code: `npm run build`

#### Add a default contract address for JB Project deployments

Sometimes, even though an address isn't static, we'll need a 'default' address to use for JB project deployment transactions (for example, we need to set a JBMultiTerminal address when a project launches).

There's a script - `addJBProjectDeploymentAddresses.js` - that will append a `jbProjectDeploymentAddresses` variable for specified contracts to the codegen files.

Import and use `jbProjectDeploymentAddresses` to source addresses for project deployments.

To add a default contract address for deployment:

1. Modify `addJBProjectDeploymentAddresses.js`

### Publishing

We use [Changesets](https://github.com/changesets/changesets) for automated publishing:

```bash
# Create a changeset
npm run changeset

# Commit the changeset together with the implementation
```

After the change reaches `main`, the release workflow runs the verification
gates and opens or updates a versioning pull request. Merge that pull request to
apply the version bumps and changelogs; the following `main` workflow publishes
the new packages to npm with GitHub Actions provenance.

**Change Types:**

- `patch` - Bug fixes (1.0.0 → 1.0.1)
- `minor` - New features (1.0.0 → 1.1.0)
- `major` - Breaking changes (1.0.0 → 2.0.0)

## V6 actions (@bananapus/nana-sdk-core/v6)

A framework-agnostic Juicebox V6 action layer: writes are pure builders that return a fully typed, viem-compatible request object (no signing, no wallet, no React), and reads take a plain viem `PublicClient`. The same builders work with wagmi's `writeContract`, viem's `walletClient.writeContract`, or any other stack.

```ts
import { createPublicClient, createWalletClient, http } from "viem";
import { sepolia } from "viem/chains";
import {
  resolvePaymentTerminal,
  buildPayTx,
} from "@bananapus/nana-sdk-core/v6";

const client = createPublicClient({ chain: sepolia, transport: http() });
const wallet = createWalletClient({ chain: sepolia, transport: http() });

const { address: terminal } = await resolvePaymentTerminal(client, {
  chainId: sepolia.id,
  projectId: 4n,
  token: "0x000000000000000000000000000000000000EEEe",
});
const request = buildPayTx({
  chainId: sepolia.id,
  terminal,
  projectId: 4n,
  token: "0x000000000000000000000000000000000000EEEe",
  amount: 10n ** 18n,
  beneficiary: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
});
await wallet.writeContract({ account: "0xYourAccount", ...request });
```

Use `resolveRouterPath` to display a project's registry-selected router path. It
reads `terminalOf(projectId)`, respecting pinned terminals and cohort defaults,
then reads `ROUTER()` only when the selected terminal matches a deployed gateway
on that chain:

```ts
import { resolveRouterPath } from "@bananapus/nana-sdk-core/v6";

const route = await resolveRouterPath(client, {
  chainId: sepolia.id,
  projectId: 4n,
});

if (route.status === "gateway") {
  // Display route.registry -> route.gateway -> route.router.
} else if (route.status === "direct") {
  // Display route.registry -> route.router, including retired router generations.
} else if (route.status === "unknown") {
  // Display route.terminal as an unrecognized terminal; no router was assumed.
} else {
  // The registry currently resolves no terminal for this project.
}
```

The generated address table includes the executed gateway on all four mainnets,
Sepolia, Base Sepolia and Arbitrum Sepolia; OP Sepolia remains feed-only for this
rollout. Deployment availability does not establish a project's selected route.
Historical router addresses remain recognizable for projects that have not
migrated. An RPC read failure rejects the helper promise so callers can
distinguish an unavailable read from an unresolved route.

Continue using `resolvePaymentTerminal` for the token-specific payment address
and a payment preview to check routability. `resolveRouterPath` describes the
registry route; its underlying `router` address is not a substitute payment
target. The gateway can retain eligible failed source-project-opted calls,
including protocol fees, in the original input token. A successful transaction
that queues a pending call has not settled that payment. Track
`QueuePendingCall`, `ProcessPendingCall`, `RefundPendingCall`, and
`RecordTerminalCallFailure`, together with `pendingCallCount`,
`pendingCallCommitmentOf`, and `pendingCallFailureOf`, to show custody and retry
or refund state. Calls without retention eligibility still revert synchronously.

For buyback hook 1.4.0, the `pay` metadata entry contains three ABI words:
`(uint256 amountToSwapWith, uint256 minimumSwapAmountOut, bool skipSplits)`.
Build the entry under `hookMetadataId(selectedHook, "pay")` with
`createHookMetadata`; resolve the hook used by the project before choosing the
metadata ID or version. Two-word quote entries revert on this hook. Keep
`skipSplits` false to honor reserved splits on swapped tokens. For payments
without an explicit minimum, a swap that misses the TWAP floor unwinds and falls
back to issuance; an explicit user minimum still applies to the resulting output.

Modules:

- `launch` — project launches + creation fee
- `omnichain` — multi-chain launches and ruleset queues via JBOmnichainDeployer
- `rulesets` — queue + read rulesets
- `splits` — split groups and exact-remainder percent math
- `sticky` — Sticky split group IDs: encode, decode, validate, describe
- `revnets` — REVDeployer + REVOwner actions
- `terminals` — payment terminal and effective router path resolution, accounting contexts
- `pay` — pay builders and previews
- `cashOut` — cash-out builders and quotes
- `tokens` — ERC-20 deploys, claims, credits, mint/burn
- `permissions` — JBPermissions ids, grants, and checks
- `suckers` — cross-chain token bridging (prepare/toRemote/claim) + sucker pair reads
- `loans` — REVLoans borrow/repay/reallocate + borrowable reads
- `currency` — currency id helpers
- `fees` — protocol fee constants and math

### Check a v6 deployment

`getProjectDeploymentDiagnostics` reads current contract wiring without a wallet or
indexer. It verifies the RPC network, pins all reads to one block, and returns a
JSON-safe report. Each check separates confirmed mismatches from unavailable
reads, unsupported custom contracts, and informational settings. A custom owner,
controller, hook, pricing precision, or restricted operator is not automatically
an invalid deployment. These checks establish the stated bindings and capabilities;
they are not an audit of custom contract behavior.

```ts
import { createPublicClient, http } from "viem";
import { baseSepolia } from "@bananapus/nana-sdk-core/chains";
import {
  getProjectDeploymentDiagnostics,
  describeProjectDataStatus,
} from "@bananapus/nana-sdk-core/v6";

const client = createPublicClient({ chain: baseSepolia, transport: http() });
const report = await getProjectDeploymentDiagnostics(client, {
  chainId: baseSepolia.id,
  projectId: 45n,
  // Optional: operator, expectedPricing: { currency: 2, decimals: 6 }
});
console.log(JSON.stringify(report, null, 2));
console.log(describeProjectDataStatus("not-checked"));
```

Indexer evidence is independent. A failed request does not prove indexing delay;
an empty successful query does not explain why a record is missing. The SDK never
includes raw provider errors or endpoint credentials in reports. The report records
the chain, project, timestamp, checked block and optional operator, so copied checks
remain attributable. To inspect a project URL or a deployment transaction from this
checkout, build core once, then use the read-only example:

```sh
npm run build:esm --workspace @bananapus/nana-sdk-core
node --import tsx examples/check-deployment.mts https://revnet.money/basesep:45
node --import tsx examples/check-deployment.mts v6:basesep:45
node --import tsx examples/check-deployment.mts 0xYOUR_TRANSACTION_HASH basesep
```

The transaction mode accepts a successful receipt identifying exactly one v6
project, through the canonical project registry or Revnet deployer. Otherwise,
supply the project explicitly. `RPC_URL` can override the public chain endpoint; `OPERATOR_ADDRESS` enables
current shop permission checks.
A mismatched network is rejected before interpreting project IDs. Current versionless Revnet and Juicebox URLs identify v6; explicit older versions
are rejected instead of being queried through v6 contracts.

### Prepare shop settings

Canonical v6 Revnet and omnichain launch overloads create an empty 721 shop even
when no shop configuration is supplied. That omission does **not** mean “no hook.”
Omitting configuration continues to use the original contract defaults: an empty
shop with 18-decimal pricing and, for Revnets, all four shop permissions granted
to the operator. These are valid settings; no extra acknowledgement is required.

To choose different settings, supply `tiered721Config` to the Revnet builder or
`deploy721Config` to the omnichain launch builder. Revnet callers can also use
`default721Config` to prepare an empty shop with conventional pricing precision
and explicit operator powers. Existing callers can continue unchanged.

`buildRevnet721Config` owns permission inversion and full shop configuration.
`resolve721PricingContext` conventionally chooses USD=6, ETH/native=18, or the
matching token accounting context's precision. Unknown or ambiguous currencies
require explicit `decimals`. Any explicit integer precision from 0 through 18 is
preserved, including USD=18. Existing tier integer prices must be encoded using
that precision; precision alone cannot prove a deployed price is wrong.

```ts
const request = buildDeployRevnetTx({
  chainId,
  config,
  accountingContexts,
  suckerConfig,
  creationFee: await getProjectCreationFee(client, chainId),
  default721Config: {
    operatorPermissions: {
      canAdjustTiers: true,
      canUpdateMetadata: true,
      canMint: false,
      canIncreaseDiscountPercent: false,
    },
  },
});
```

For a new project, read and send the **exact current creation fee on that chain**.
For an existing project converted to a Revnet, the builder sends zero value.
Explicit configs retain their provided values. Both builders select only the
intended overloaded function in the request ABI, making empty-array encoding and
simulation consistent. `selectDeploymentAbi` provides the same selection for
callers assembling custom deployment requests. Omnichain ruleset queue semantics
are unchanged.

A complete example prepares an empty USD shop and optionally simulates it:

```sh
node --import tsx examples/prepare-revnet.mts 0xYOUR_SENDER_ADDRESS
node --import tsx examples/prepare-revnet.mts 0xYOUR_SENDER_ADDRESS --simulate
```

This example only reads chain state, prints calldata, and optionally performs
`eth_call`. It never reads a private key or sends a transaction. Persist its shared
salt and absolute stage start before adapting it for deployment on multiple chains.

For app integration before an npm release, `scripts/pack-deployment-preview.mjs`
rebuilds core and creates a content-addressed preview package with source hashes:

```sh
node scripts/pack-deployment-preview.mjs . /tmp/juice-sdk-preview
```

The source package version remains unchanged; the generated archive carries its
preview version and `snapshot-provenance.json`. Keep the same archive and lockfile
in each consuming app until migrating to the released package.
