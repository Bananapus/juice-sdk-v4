---
"@bananapus/nana-sdk-core": minor
---

Juicebox Money, Homerun and revnet.money each kept their own checks around a
project's Safe and its distributions. One copy now ships in the SDK, with the
stricter check where the copies differed. Nothing in it signs or sends.

`@bananapus/nana-sdk-core/safe` (authority identity):

- `readAuthorityIdentity` classifies an address as `eoa`, `delegated-eoa`,
  `contract` or `safe`, with `{ blockNumber }` to pin every read. An exact
  EIP-7702 designator is a `delegated-eoa`, never a Safe. A Safe needs a
  recognized proxy runtime, a slot zero naming a recognized singleton with
  code (`RECOGNIZED_SAFE_RELEASES`: Safe and SafeL2, canonical and EIP-155,
  1.3.0 and 1.4.1), a `masterCopy()` that agrees, its release's exact version,
  1 to 50 unique nonzero owners, a threshold within them, clean guard and
  fallback slots, and a fallback handler that is contract code. Nothing calls
  through the proxy before its singleton is known; every call is a raw, gas-
  and return-bounded `eth_call` whose answer must be exactly canonical. An RPC
  failure is `null`.
- `proveSafeCreation` proves how a Safe was made from its creation record:
  - a recognized release's factory and singleton;
  - the exact canonical `setup`, with no delegatecall hook but SafeToL2Setup
    and no payment;
  - the CREATE2 address is the Safe.

  Matching owners and code on two chains is only the visible policy. A setup
  hook can plant an owner or module no getter shows, and a 1.3.0 Safe made with
  `createProxy` can be claimed at its address on another chain.
  `readMatchingAuthorityIdentities` and `readCrossChainHandleAuthority` take the
  record (`creation`). Without a valid proof, Safes never match
  (`creationUnproven`) and a handle is `unproven-creation`.

- `authorityIdentitiesMatch`, `readMatchingAuthorityIdentities`,
  `readCrossChainHandleAuthority`, `isDeployableSafeAuthority`,
  `safeSingletonsAreEquivalent`, `isEip7702DelegatedEoaRuntime`,
  `isRecognizedSafeDeployment`, `readBoundedSafeNonce` and
  `readBoundedSafeApprovedHash`.
- Same-address deployment: `validateSafeCreationForCurrentPolicy`,
  `buildSafeProxyFactoryCall` and `prepareSafeSameAddressDeployment`. The
  creation must replay today's plain policy exactly; the destination address
  must be free; the factory and singleton must carry the source chain's code
  there, the owners must be EOAs and the fallback handler the same contract;
  and a raw simulation must return the Safe's address. Each refusal is a named
  reason.
- MultiSend: `MULTI_SEND_CALL_ONLY`, `MULTI_SEND_ABI`, `packMultiSend`,
  `encodeMultiSend`, `decodeMultiSend` (canonical calldata of whole CALL
  entries only) and `multiSendCallsOf`.
- Also `SAFE_TO_L2_SETUP_CODE_HASH`, `SAFE_CANONICAL_PAYMENT_RECEIVER` and
  `SAFE_L1_L2_SINGLETON_PAIRS`. The module no longer runs `getAddress` or
  `parseAbi` when it loads.

`@bananapus/nana-sdk-core/safe-service` (Safe transactions and the service):

- `safeExecutionResult` reads a receipt as `success`, `failed`
  (ExecutionFailure: the nonce is spent), `reverted` or `unproven`, from the
  Safe 1.3 or the Safe 1.4 event layout. It needs exactly one event for the
  reviewed safeTxHash, or, when Safe{Wallet} executed at once and returned the
  transaction's own hash, exactly one event of the Safe. Success and failure
  carry the refund the Safe paid (`payment`); another proposal's event never
  decides this one, and a malformed event leaves it unproven.
  `requireSafeExecutionSuccess` throws for anything but success.
  `safeTransactionHasRefund` lets a queue card show or refuse a refund before
  executing.
- `safeExecutionSignatures` places each EIP-1271 contract signature after
  every 65-byte head, at its byte offset, as Safe's `checkNSignatures` reads
  it. Signatures that cannot be well-formed never count.
- `SAFE_TX_TYPES`, `SAFE_EXEC_ABI`, `safeTransactionMessage` (every field read
  strictly), `safeTransactionHash` and `canonicalSafeTxHash`, which refuses a
  record naming another Safe or advertising a different hash.
- `usableSafeConfirmations`, `safeExecutionSignatures` and `safeExecutionArgs`:
  one confirmation per current owner, signatures of at least 65 bytes, in
  numeric owner order.
- `safeProposalFor`, `safeBatchProposalFor`, `safeTransactionMatchesCall`
  (exact call and zero refund), `nextProposalNonce` and `onchainApprovalStep`.
- `listPendingSafeTransactions` (at most 250, every row authenticated;
  no service throws rather than reading as an empty queue),
  `findPendingSafeTransaction`, `readSafeTransaction`,
  `proposeSafeTransaction`, `submitSafeConfirmation` (posted to the hash of
  the exact fields), `fetchSafesOwnedBy`, `safeCreationUrl`,
  `parseSafeCreationPayload`, `fetchSafeCreation` (the source chain's service
  only), `hasSafeService` and `safeTransactionUrl`. Service calls accept the
  app's own `fetch`, retry a 429 after its Retry-After delay, and send the
  optional `jb-safe-api-key` from local storage.
- `waitForSafeExecutionHash` refuses a malformed proposal hash and a malformed
  execution hash from the service.
- Listed rows come back normalized: the nonce as a number, the Safe and the
  checked hash. Executed rows are dropped. A row without an advertised hash,
  with more than 100 confirmations, or in a page over 50 rows is refused. A
  null `gasToken` or `refundReceiver` (as the service stores an omitted one)
  reads as the zero address. `fetchSafesOwnedBy` reads at most 200 Safes per
  chain.

`@bananapus/nana-sdk-core/v6`: `verifyPayoutReceipt` and
`verifyReservedDistributionReceipt` prove a distribution from its receipt: no
recipient failure, exactly one completion event from the reviewed sender in
the reviewed ruleset and cycle, to the reviewed owner, for the reviewed
amounts, and every reviewed split's exact share in order. A payout split's net
is its gross, or its gross less the 2.5% fee, and only its gross when marked
feeless. Reserved tokens may be burned only for shares sent to `0x…dEaD`. A
log of the reviewed contract that its ABI cannot read is refused, not skipped.

The review decoder's eleven generated ABIs now live in modules of their own, so
a page that imports other ABIs from the SDK no longer loads them.
