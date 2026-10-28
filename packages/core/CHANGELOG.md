# juice-sdk-core

## 5.0.0

### Major Changes

- 600102e: Gaps the four client landings on 4.0 found. Major: a sent transaction never reads as failed.

  Migration:
  - `useReviewedRun`'s `run` also resolves `{ status: "receipt", step, hash, ended }` (`ReviewedRunReceipt`): the step was sent and its hold is still verifying the receipt. Handle `status: "receipt"` wherever a wrapper branches on the result or narrows it to `ReviewedResult`: treat it as sent and pending (show the hook's `receipt` phase), never as failed and never as a reason to send again. A flow that goes on once the action finished awaits `ended()`: `done` with every step's hash, `failed`, or null when the hold was released.
  - A site's engine loader (`deps.engine`) must also give `completeReviewedStep`: `() => import("@bananapus/nana-sdk-core/review")` does; a loader that picks exports (`webpackExports`) adds it.
  - A direct `sendReviewed` caller that catches `ReviewedReceiptUnverifiedError` (now also thrown for a reverted receipt its hold has not verified) passes `follow: { onConfirming }` instead: the run follows a step still confirming itself, at any position, shows it through `onConfirming(step)`, and goes on to the next step in the same review or resolves `done` with the settling receipt (a verified revert throws `ReviewedCallRevertedError`). Show that step as pending ("Confirming your transaction."), not as an error. Only after `follow.timeoutMs` (2 minutes by default) or `follow.signal` does the error reach the caller, the step still held. Signatures the run signed before the send are on `error.held.signatures`, and on the hook's `receipt` result as `signatures`.
  - `useReviewedRun`'s `run` follows a step still confirming in place, in the same review (`phase` "receipt"), and resolves `receipt` only after `follow.timeoutMs` (2 minutes by default) or `follow.signal`. A reset, a later run or an unmount ends that follow, sends no later step, and resolves an awaited `ended()` with null; the step stays held. A direct caller's `follow.signal` likewise stops a run from sending any step after one it sent, as late as the adapter's last check before the wallet (`sendTransaction` takes it as `signal`; `viemWalletAdapter` refuses it unsent), and an action's own `follow.signal` aborting resolves `ended()` with null, with nothing continued.
  - `viemWalletAdapter` refuses a wallet client over a composite transport (viem's `fallback`): pass one over a single provider (wagmi's connector client is).
  - `runRelayrReviewed` is removed. It could end a paid bundle unproven without handing back the bundle's uuid or its extra signatures. Sign a bundle's requests with `signReviewedForwardRequests` and pay its quote with `payRelayrReviewed`, which tells `onSent` each hash.

  Changes:
  - `sendReviewed` and `resumeReviewed` report `done` only once the step's write hold verified its receipt. A receipt the hold has not verified yet (a lagging node, a same-nonce replacement, a block since reorged out) throws `ReviewedReceiptUnverifiedError` ("Confirming your transaction."); the step stays held, and in flight in its journal, until the hold settles it. A reverted receipt is reported (`ReviewedCallRevertedError`) only once the hold verified it too. `useReviewedRun`'s `run` resolves `{ status: "receipt", step, hash }` (`ReviewedRunReceipt`), never `failed`, for a step that was sent; its `phase` says `receipt` too, and it follows the hold. When the hold settles that send, even before the hook attached, `completeReviewedStep` completes it as the run would have (the saved sequence records it, `onConfirmed` is told once, with the hold view's receipt) before the hook shows `done`; while the receipt `onConfirmed` needs can't be read, nothing advances and the hook tries again. A direct caller's `follow` option does the same within the run.
  - A run is refused before its review while the action's last success is unacknowledged (`WriteHoldUnacknowledgedSuccessError`, "This went through while you were away.", with `success`), so a double click or a remount can't send it twice. `useReviewedRun` acknowledges a `done` it shows, and offers one it could not show as `sendAgainAction`; a direct caller acknowledges with the hold handle's `acknowledge(error.success)`. A success is acknowledged only by checked completion (a run's `done`, `completeReviewedStep`, `resumeReviewed`, a saved attempt retired on its evidence), after its receipt is verified and `onConfirmed` has run, never by a held-write view telling `onSettled`: until then every send of it stays refused, with or without a journal or `scope`, and a view whose own send is refused shows it as `succeeded` with "Send it again".
  - A step the wallet sped up or replaced with exactly the reviewed call is reported in `hashes`, journaled and acknowledged by the hash its hold verified (the mined one, matching its receipt), so the next run is not refused as "This went through while you were away."
  - Once a wallet returned a hash, a run ends only `done`, as its hold verified a failure (`ReviewedCallRevertedError`, a Safe's failed call), or `ReviewedReceiptUnverifiedError` with its hold, hash, step and signatures, which `follow` and `completeReviewedStep` resume. A receipt watcher that gave up (`TransactionReceiptUnavailableError`) is now that error's `cause`, not the error itself; every site callback (`onProgress`, `follow.onConfirming`, `onSubmitted`, `onConfirmed`, a held-write view's `onSettled`) is called through one guard: one that throws or rejects is logged with `console.error` and never changes what was sent or how it settled, so a site's failed record of the hash no longer ends the run unverified, and a resumed final step whose `onProgress` throws still ends `done`. `onUnsent`, a held-write view's `onReleased` and `onAdopted` go through the same guard, and a callback's promise always reaches it, so one that rejects asynchronously is logged too, never left unhandled. `onConfirmed` is told once per settlement: the completion that first claims the settlement's notice on its hold (a run, `completeReviewedStep` or `resumeReviewed`, in any tab) tells it, and one that loses the claim, such as a page closed and reopened while it completed, stays silent. A caller that checked `isTransactionReceiptUnavailableError` after a send checks `ReviewedReceiptUnverifiedError` instead. `payRelayrReviewed` ends a sent payment proven, reverted, contradicted (`RelayrProofError`), or `RelayrProofUnavailableError` with its hash, never a bare read failure.
  - A sent step's outcome is its write hold's verified settlement: its result, its hash, and the receipt in the block the hold verified (`WriteHoldSettled` now carries `blockHash`, none when a finalized Safe log proved it). `sendReviewed`'s `receipts`, `onConfirmed`, the next step's `prior` and its dependent simulation, a resumed run's `reverify` prior block, `completeReviewedStep`, `resumeReviewed` and a hold view's `onSettled` get only that receipt, never a receipt watcher's that a reorg or replacement left behind, so an approval re-mined in a later block is the block the payment is simulated on. A settlement with no block kept (a Safe log's, or one saved by 4.x) takes only a receipt in a block still canonical and final whose status agrees with it: a success a success, a failure a revert, unless the settlement is a Safe's execution (`WriteHoldSettled`'s new `safe`), whose own failure runs under a successful outer transaction (a 4.x failure counts as ordinary); until one reads, the step stays unverified, `completeReviewedStep` and `resumeReviewed` advance nothing, and `onSettled` gets no receipt. `useReviewedRun` completes a followed Safe proposal (or any held step it follows) the same checked way before it shows it: the journal records it, `onConfirmed` is told once with the execution's verified receipt, and while that receipt can't be read the step stays confirming, never `done`. A failed one shows its execution's receipt when the view gave the one its hold settled. `completeReviewedStep` takes a proposal's step and its `held` call and reservation too, and resolves `{ settled, receipt }`, the receipt it checked (a failure's too), so a failed execution read only on a retry still shows its receipt. `payRelayrReviewed` reports a revert (`ReviewedCallRevertedError`) only once the hold verified it; a watcher's reverted receipt the hold has not verified ends `RelayrProofUnavailableError` with the payment's hash.
  - `payRelayrReviewed` reads a payment's proof again while the node can't read it yet, for as long as `follow` follows a step, a read that stalls included, then throws `RelayrProofUnavailableError` (with the payment's hash) as before; a contradicting proof or a verified revert is never retried.
  - A payment the review-time simulation refused keeps the revert as its `cause` (the review's line, with the node's error and its revert data inside), so `decodePayFailure` reads it and the allowed-decrease retry works for that attempt.
  - `viemWalletAdapter` checks the connection where the wallet is reached: every sending or signing provider request (`eth_sendTransaction`, `wallet_sendCalls`, `eth_signTypedData_v4`, `personal_sign` and the like) first re-reads the account, chain, Safe mode, the connector (new `connector`, wagmi's `connector?.uid`) and the site's own synchronous `check` (view-as, say), since viem awaits its own reads before it sends. A connector that changes while the wallet client loads is fetched again (three tries, then "Wallet connection changed"). A send or signature request is forwarded once, with the wallet transport's retries off, so no retry reaches the wallet past the check, and an ambiguous first error is never followed by a 4001 that would release it; viem's `wallet_sendTransaction` fallback is checked too, as a plain refusal once a send went out. Its refusals before any request went out, a wallet client that can't be fetched, and a viem failure before any request went out (an unreadable chain, another chain) are `WalletNotInvokedError`: core counts them as unsent, releases the held step and frees a Relayr payment's quote (`relayrPaymentAttemptOutcome` is `unpaid`), and the site sees the refusal's own line, not a cancel. Only that class counts, never a field a provider sets or an error the wallet returned.
  - `signReviewed` hands a self-reviewing wallet the raw typed data or text to review on its own page, with no in-app prompt (`onPreview` gets the model). `selfReviewingAdapter` takes `signTypedData` and `signMessage`; without them it still refuses with 4200.
  - `nana-wallet-check` also catches `signaWalletAdapter`, `selfReviewingAdapter` and `registerReviewHandler` called through `.call`, `.apply` or `.bind`.

## 4.0.0

### Major Changes

- 5b068a8: `prepareUserPay` refuses a payment the buyback hook would swap when its quote, or a read after it, fails twice, comes back empty, resolves to nothing or cannot be decoded, and when the minimum without a quote floors to zero. It throws `PaySwapQuoteFailedError` (`code` `PAY_SWAP_QUOTE_FAILED`, the read's error as `cause`) with `PAY_SWAP_QUOTE_FAILED_MESSAGE`, "The swap quote could not be loaded.", for the app to show as one line with Retry. It no longer returns a minimum set by a failed read, which could be zero. A pool that cannot fill the swap, a pool that loses to minting, and a swap the quoter cannot take (no quoter on the chain, an amount beyond uint128, which also sets `quoteFailed`) keep the mint minimum while it is above zero. Payments the hook would not swap, and payments with no buyback hook, are unchanged and still return `quoteFailed`.
- d29ff2b: `resolveSuckers` and `getSuckerPairs` read Juicebox V6 only and load only the v6 address table. An app's page that imports `resolveSuckers` drops from 10,488 B to 5,002 B gzip. `version` is optional and accepts only `6`; a V4 or V5 read is refused before any call. V6 results are unchanged.
- 7f82e5c: Review gaps found moving revnet and juicebox-money onto the reviewed path:
  - `ReviewedCall.gas` sets the exact gas limit a call is sent with (revnet's saved pending-router envelope, its capped handle write). It is shown and bound in the review (changing it after review sends nothing), simulated at that gas, sent at that gas and never estimated or padded. A Safe app still proposes with `safeTxGas` 0, and a self-reviewing wallet gets it on its raw call. Unset, gas is estimated as before.
  - `WalletAdapter.ready()` (and `viemWalletAdapter`'s `ready` option) settles once the adapter's kind and Safe mode can be trusted, as Safe{Wallet} over WalletConnect is known only once its peer metadata settles. Every reviewed send, signature, Relayr and Safe entry awaits it first, for at most 10 s. A rejection or timeout sends nothing (`WALLET_NOT_READY_LINE`) and never reads the wallet as a plain one.
  - `ReviewedCall.adoptIgnoringArgs` (with `abi` and `functionName`) lists the arg indexes, such as a fresh deadline, in which a proposal its Safe already queued may differ and still be adopted instead of proposed twice. The SDK decodes both calls with the call's ABI: same function, the queued bytes its canonical encoding, every other arg equal, and the same target, value and CALL. No app code runs while matching. The list is bound into the review model id and saved with the step. Unset, adoption stays exact bytes; an invalid list sends nothing.
  - A reviewed step mined and reverted throws `ReviewedCallRevertedError` (same line) with its `step`, `hash` and `receipt`, so a site can close its own record. The action can be reviewed and sent again.
  - `useReviewedRun`:
    - **Breaking:** `run` resolves `{ status: "failed", error, failure }` when the run failed. Null now means only that the user cancelled. Check `status`, never truthiness.
    - A followed Safe proposal (or held step) ends its run once its hold settles it: `phase` "done" with `hash` and the new `receipt`, or the settlement's line in `error`. A release ends it too.
    - `error` shows a message only when the SDK raised it (`ReviewLineError`, which the review engine's errors and error classes now extend); the SDK's typed Relayr and Safe refusals show fixed lines (by `reason` for `RelayrPaymentRetryError`); anything else (a node, RPC, wallet, service, runtime or app error, however it reads) shows `NETWORK_ERROR_LINE`. `errorLine` is exported for other displays; `failure` keeps the raw value.
    - **Breaking:** its deps take `engine`, the loader of the send engine (review model, decoder and ABIs). Pass `() => import("@bananapus/nana-sdk-core/review")` and a page that mounts the hook no longer carries the engine in its first load (about 69 KB gzipped); the hook calls it once mounted, so a run does not wait on it. A loader that fails ends the run with `REVIEWED_ENGINE_LOAD_LINE` (nothing sent; reload), the loader's error as its cause.
  - **Breaking:** a confirmed review whose simulation found a revert throws `REVIEWED_SIMULATION_FAILED_LINE`, with the detailed reason (shown in the review) as its `cause`. A send-time simulation failure is a plain error quoting the node. Signature validation lines no longer quote the rejected value.
  - `openStepHold` moved to `writeHold.ts` and `REVIEWED_ACCOUNT_CHANGED_LINE` to `messages.ts`; both are still exported from `/review`.
  - A review's raw JSON shows both the signatures and the authorization when a request carries both.
  - `nana-wallet-check` flags a member `.request(...)` only when its method signs or is not written out (`{ method: "eth_call" }` and `request("lock-name", ...)` are reads), and counts `wallet_sendTransaction` as a signing method. Remove inventory rows the check now reports as stale.

- 551104e: Review gaps found moving sticky, juicebox-money and revnet onto the reviewed path:
  - **Breaking:** the boolean review API is gone: `registerTransactionReviewHandler`, `requestTransactionReview`, `requireTransactionReview`, `requestContractTransactionReview`, `requireContractTransactionReview` and the `ContractTransactionReviewCall` and `TransactionReviewOptions` types. Every review goes through core's prompt (`registerReviewHandler`) and its minted confirmation. `nana-wallet-check` now inventories `registerReviewHandler` calls in its place: a client's inventory needs a row for its review provider's registration, and its old `registerTransactionReviewHandler` rows become stale.
  - `/testing` exports `promptReviewForTests(request, { simulation?, signal? })`: it prompts the registered review handler with core's model, as a send does, and returns `{ model, outcome }`.
  - `ReviewedAction.reverify(call, index, prior)` gets `prior`, the chain, block number and block hash where the previous step confirmed (this run's receipt, or a resumed run's last completed step), or undefined for the first step.
  - A `kind: "message"` signature takes `calls`, the calls the message lets someone run. They are validated, decoded with the transaction decoder and bound into the review model.
  - `ReviewedAction.signal` (and `signReviewed`'s `signal`) withdraws an open review: the run ends as cancelled with nothing sent, and `ReviewPrompt.signal` aborts so the dialog closes. Once confirmed, it changes nothing.
  - `ReviewedAction.onConfirmed(call, step, receipt)` is awaited after each step's receipt succeeds and is saved; its throw is ignored.
  - `ReviewedAction.batch`: through a Safe app, every call goes to the Safe as one proposal through `WalletAdapter.sendCalls` (a MultiSend its signers approve once), held as that MultiSend (`safeBatchCall`) under the first call's intent or `safeBatchIntent`. The calls must share a chain and the adapter must offer `sendCalls` (`SAFE_BATCH_UNSUPPORTED_LINE`, before the review). An answer that is not a safeTxHash keeps the batch held (`SAFE_BATCH_UNFOLLOWABLE_LINE`). Nothing is journaled; `useReviewedRun` follows the proposal's hold. A resumed sequence, and any other wallet, sends the calls one by one. A held batch now matches a proposal or execution through any recognized MultiSendCallOnly (1.3.0 or 1.4.1), with the same calldata and DELEGATECALL.
  - A resumed run whose steps all settled while away reports the `done` progress.
  - `useReviewedRun` returns `preload()`, which loads the engine once (again only after a failed load) and is shared with `run`, so a site can preload on hover or focus; and `discard(scope)`, which drops a released sequence. It is refused while a step is held or a run of the hook is open (`REVIEWED_RUN_BUSY_LINE`).
  - `ReviewLineError` and `ReviewedCallRevertedError` are exported from `/review` without the send engine, so a site can throw its own refusal line from `reverify`, `assertWriteState` or `beforeWallet` and recognize a mined revert statically. The Defifa preparations throw `ReviewLineError`, so their reasons show.
  - Fixed lines name the next step: the network line, a failed Safe call, an expired Safe proposal, a mined result that can't be read, and the saved-attempt check line.

- dde49ad: Review gaps found moving sticky onto 4.0:
  - `useReviewedRun` state has `settled: { step, finished }` once a followed step (a Safe proposal, a held step) settles successfully. Only the action's last step (or a Safe app batch) ends the run as `done`; an earlier one (an approval) leaves it `idle`, and running the action again resumes it.
  - `useReviewedRun().discard(scope, account?)` drops the sequence saved for `account`, the one that sent it, which may no longer be the connected one.
  - A failed simulation never shows viem's or the node's text. A payment revert the SDK decodes (`decodePayFailure`) shows its line; any other revert shows "This transaction would fail. Check the amounts and try again." (`REVERT_UNKNOWN_LINE`). `ReviewSimulation`'s failed result has `explained` when its message says why, and the refusal after the review says "the review shows why" (`REVIEWED_SIMULATION_FAILED_LINE`) only then; otherwise `REVIEWED_SIMULATION_UNEXPLAINED_LINE`. `revertDetail` no longer reads error text. A sequence's or a step's revert now throws the SDK's line (a `ReviewLineError`), so `errorLine` shows it instead of the network line.
  - `errorLine` no longer carries the lines of the SDK's typed Relayr and Safe errors: each error class carries its own `line` (they extend `ReviewFixedLineError`), so a page that imports `errorLine` loads about 1 KB less. A plain error renamed to look like one gets the network line.
  - A sequence step whose hold the user released by its exit ("I checked my wallet"), or that was released because nothing was sent, is no longer a `REVIEWED_SEQUENCE_UNCERTAIN_LINE` dead end: resuming reviews the remaining steps, that one included, once and sends them. A step cleared with no settlement and no release (a settlement that could not be saved) is still refused. Write holds expose `released(reservation)`.
  - `reviewPlan(action, deps)` asks once over exactly `action.calls` (each from `account`, its own `from`, or `"relayr"`), simulated as their senders, and returns a frozen, single-use `ReviewedPlan`. `sendReviewed`, `signReviewed`, `proposeReviewedSafeTransaction`, `confirmReviewedSafeTransaction`, `payRelayrReviewed` and `runRelayrReviewed` take `plan`: they skip their prompt only for calls identical to unspent plan calls (account, chain, sender, target, data, value, and the gas limit when one was reviewed or a forward request signs one), spend each once, and refuse anything else, a plan core did not mint, and a plan more than 15 minutes past its confirm (`REVIEWED_PLAN_REFUSED_LINE`, `REVIEWED_PLAN_EXPIRED_LINE`). Each signature matches by the exact payload signed: a Safe transaction by its CALL or MultiSendCallOnly calls, only with no refund and safeTxGas 0; a forward request by its call. Under a plan, `sendReviewed` refuses `adoptIgnoringArgs` and a Safe app's unbatched multi-call action. A plan call is spent when its action passes the match, so a send that then fails before the wallet needs a fresh review. A plan call may name its `runRelayrReviewed` run (`relayrRound`): the plan's review then shows each run's fee bound (Relayr's stand-in quote plus `RELAYR_FEE_MARGIN_BPS`, paid on the run's first chain, or on the funding chain `relayrRounds[key].paymentChainId` names), and a run whose real quote is within it pays with no prompt; only a quote above it asks again. A run with no reviewed bound asks for its fee. `payRelayrReviewed(quote, chainId, { plan, relayrRound })` spends a round's bound the same way, for an app that posts and pays the round itself: a quote of exactly that round's calls (signed under the plan or not) pays with no prompt when its fee is at most the bound on the chain it was reviewed for, once; a higher fee, a spent bound, another round's quote or another chain asks. `relayrFeeCap` is exported.
  - `runRelayrReviewed` takes `raw: true` calls: Relayr runs them from its own account, unsigned. The review shows them as "Sent by Relayr"; they are bound into the quote, simulated before posting and paying, and refused when changed after review, under the same scope and no-double-pay rules. A raw call can't carry ETH.
  - A simulation line names the chain from the SDK's chains when the client carries none ("Base Sepolia", not "chain 84532").
  - A Relayr payment check that gets a malformed reply viem can't decode says "Could not check the payment. Nothing was sent.", with the detail as `cause`.
  - `signReviewed` refuses a `safe-tx` whose given `safeTxHash` is not the hash of the transaction it signs.
  - `reviewPlan` simulates a Relayr round's signed call that carries value with its signer's balance covering it, since Relayr pays it: a wallet with no ETH on that chain no longer sees a failed simulation.
  - A Relayr payment that reverts settles its hold from the receipt and throws `ReviewedCallRevertedError`, so it can be reviewed and paid again at once.

### Minor Changes

- 195bcb2: `sendReviewed` sends one user action, one call or a sequence such as approve then pay, after one review. Core builds the review model, asks the handler registered with `registerReviewHandler` once, and sends nothing unless the handler returns the confirmation core minted for that prompt and model. `true`, a forged object, a confirmation from another prompt or model, or one already used is refused. The review-time simulation runs while the review is open and confirm never waits on it: a revert it already reported refuses the confirmation, an unavailable one adds the `simulation-unavailable` warning, and the simulation before each send still decides. Each step reruns the app's stale-state check, refuses any change to the reviewed bytes, account, chain or Safe connection with nothing sent, simulates (at the previous step's receipt block when it depends on it), and sends the exact reviewed bytes under the step's write hold. Only an explicit wallet rejection (4001) releases the hold. `viemWalletAdapter` and `selfReviewingAdapter` are the `WalletAdapter` boundary, the only core code that calls a wallet; a self-reviewing wallet (Signa) gets the raw calls and no in-app prompt. Sequence simulation errors now carry what the node answered as `cause`, and `revertDetail` names a failed call's reason.

  `isDefiniteWalletRejection` now counts only EIP-1193 code 4001 anywhere in the cause chain; an error named `UserRejectedRequestError` without that code keeps its write held.

- 8e80374: `nana-wallet-check` is a published bin: `nana-wallet-check --root <dir>... --inventory <json> [--forbid-import <spec>]...` exits 1 on an unreviewed or stale wallet call or signing RPC literal, on the identifier `reviewedInParent` or a `registerTransactionReviewHandler` call without an inventory row, on a `selfReviewingAdapter` or `signaWalletAdapter` call outside the files the inventory lists under `selfReviewing`, and on an import of a `--forbid-import` specifier. It resolves `typescript` (optional peer, `>=5.4`) from the working directory. Clients run it as their wallet-boundary gate.
- a28b109: `getRegisteredSucker` returns a project's sucker as the JBSuckerRegistry lists it (active or deprecated), bridging to the named chain, so a queued movement's Execute sends `toRemote` to the registry's address and never to an indexer's. It throws `UnverifiedSuckerError` (`code` `SUCKER_UNVERIFIED`) with `reason` `unregistered` when the registry doesn't list the address for the project or the sucker bridges elsewhere, and `unreadable`, carrying the error as `cause`, when a read fails or the client is on another chain. It confirms identity only; a sucker that no longer sends still fails its `toRemote` simulation. Its `message` is one line an app can show.
- 50f7e9d: Review gaps found moving juicebox-money onto the reviewed path. `useReviewedRun` keeps the value a failed run threw, with its cause chain, as `failure` (null on success and cancel), so a site can decode it (a slippage retry, say) beside the friendly `error`. A Safe-connected wallet reuses a proposal its Safe already queued for exactly the reviewed call (same Safe, chain, target, value, calldata, and a zero-refund CALL) instead of proposing it again; a near match is never reused, and a queue that can't be read, or doesn't answer within the hold's 8-second service bound, sends nothing. The queue is read through the write hold's Safe service (now exposed as `hold.safeService`), and the adopted proposal's nonce is held so its execution can be proven onchain. `findPendingSafeAppProposal` takes `exact` to find only a proposal of exactly the call, stamp included. `ReviewContextRow` takes `lines` (a value over several lines) and a `note`, both bound into the model's id. `buildReviewModel` never throws: a request it can't read or bind exactly gets a model with an `unreadable` warning (a new `ReviewWarningCode`), the parts it could read, and an id that matches no other model; core's own review prompt refuses such a model before any handler sees it, so it never sends or signs. `/review/decode` exports `addressLabel` and `currencyLabel`, and `/testing` exports the review fixture requests as `REVIEW_REQUESTS`.
- 2e71c9f: More review gaps found moving juicebox-money and sticky onto the reviewed path:
  - `ReviewCallModel` carries each call's exact `data`. The model's id already binds it. `buildTransactionReviewPrompt` also takes a `ReviewModel`, so a review dialog can run its fee check and copy the audit prompt from the model alone.
  - `ReviewedAction` takes three awaited per-step hooks at the wallet boundary, one design for every client's own journals (jbm's launch, multisig, mint and Defifa records; sticky's bridge, collector and launch session):
    - `beforeWallet(call, step)` runs after the step's hold reserves it and its journal saves it, right before the wallet opens. A throw sends nothing and releases the step.
    - `onUnsent(call, step)` runs only when nothing was sent: a gate refused, the hook threw, or the wallet rejected with 4001. It never runs after an ambiguous failure.
    - `onSubmitted(call, step, hash, { safe, adopted })` runs once the wallet or an adopted Safe proposal returns the hash, before the receipt wait. A throw keeps the step pending, never unsent.

    The hooks run around a self-reviewing wallet's submit too, which then checks the account once more after them. `resumeReviewed` passes them through.

  - `ReviewedCall.simulationBlockNumber` names the block where a prerequisite confirmed outside the run took effect. A lone call is simulated on the latest block, or on that block while the node is behind it, so it never sees state from before the prerequisite or stale state after it. A resumed run uses the latest block.
  - `ReviewedCall.legacy` takes the hold's own legacy sources (`WriteHoldLegacySource`, now exported): an old namespace, `{ call }` or `{ match: { to, selector } }`. The journal saves them, and `discardReviewedSequence` stays refused while a write under any of them is held.
  - `payRelayrReviewed` takes `onSending` (after the hold reserves, before the wallet; a throw sends nothing) and `onSent` (every hash the payment is known by). It also lets a Safe app pay by proposal: zero `safeTxGas`, `{ safeTxHash }` returned, the hold following it to the Safe's execution, and a proposal of the exact payment the Safe already queued adopted instead of proposed again. A site's `onSent` failure on a replaced (sped-up) hash reads as sent, never as unsent.
  - `nana-wallet-check` scans every source file under a root, generated and test files included, unless `--exclude <glob>` names it. Clients that relied on the old implicit skips add `--exclude "**/generated/**" --exclude "**/*.test.*" --exclude "**/*.spec.*"`.
  - `useReviewedRun`'s `run` takes an `account`, the one the calls were built for. It refuses before the review unless that account is connected (`REVIEWED_ACCOUNT_CHANGED_LINE`).
  - `useReviewedRun`'s `held` is now a full held-write view of the step in flight, with `exitAction` ("I checked my wallet") and `sendAgainAction`, the same ones `useHeldSend` gives.

- ae3dda6: The review model shows more of what a call does. Each call names the addresses it gives a part (`roles`: spender, recipient, beneficiary, owner, operator) and the token amounts it moves or approves (`tokenAmounts`, with decimals and symbol when known). New warnings flag an unknown destination, an unlimited approval, an ownership change, a permission grant (any approval, permit or approval for all to an address the app does not name) and unknown token decimals. An `approve` or `transferFrom` that ERC-721 shares, sent to an unknown contract, carries `possible-token-id` until enrichment settles it, and `nft` names the NFT when the call is an ERC-721 one. Tuple and array arguments carry labeled `children`, so a client can show them nested. `enrichReviewModel` reads each token's decimals and symbol once per chain, leaving them null when a read fails, asks such a contract `supportsInterface(0x80ac58cd)` to tell an NFT approval from an ERC-20 one, and never changes the model's id. `decodeReviewCall` decodes raw calldata with the SDK's own ABIs (the contract's at that address first, then by selector), for callers that hold only the bytes.
- 882062e: `runRelayrReviewed` runs ERC-2771 calls through Relayr under one review. Before the review it quotes stand-ins of the calls, signed by a key made in memory for that quote only, and shows the fee as "Up to X" (the quote plus `RELAYR_FEE_MARGIN_BPS`). When the calls need the real sender, a public call with the same chain, gas and calldata length is quoted instead; without any quote in time, the fee is bounded from a gas estimate through the forwarder as the sender (`RELAYR_FEE_MARKUP_BPS`). After confirm it signs the requests, checks each against the forwarder and simulates it, posts them for the quote that binds them, and pays without asking again when the fee is at most the cap; a higher fee opens one fresh review of the payment, and a quote that expires before the wallet opens is replaced the same way. The payment goes only to Relayr's pinned contract and selector, under its write hold, and is proven from the chain. The action's `scope` is required: it holds the payment on every funding chain, so a rerun never pays a second fee. `signReviewedForwardRequests` and `payRelayrReviewed` are the single-purpose paths, each with its own review; every destination must trust the chain's canonical forwarder. `pollRelayrBundle` treats only `failed`, in any case, as final. `safeRelayrWalletDeps` supplies `review` and `sendPayment` for `createSafeRelayrController`.
- 9db2d67: `proposeReviewedSafeTransaction`, `confirmReviewedSafeTransaction` and `executeReviewedSafeTransaction` give every client one reviewed Safe path. A proposal is one zero-refund Safe transaction (a CALL, or a MultiSendCallOnly batch for several calls) signed after one review through `signReviewed`, at the nonce after everything queued, refused when another proposal takes that nonce while the review is open, and found again when the service queued it but its answer was lost; a queued proposal of the same calls is confirmed instead of proposed twice. A confirmation signs exactly the queued fields, read once, and refuses a record whose fields do not hash to the hash it advertises, a gas refund, or a passed nonce. An execution goes through `sendReviewed`, held under the new `safeExecutionIntent` (the Safe and its exact hash, whatever signatures it carries), checks before the wallet opens that the Safe's policy and nonce are unchanged and that `execTransaction` simulates to true, refuses an execution bound to its nonce only by the executor's own approval, or one from inside the Safe itself, and is done only on the Safe's own ExecutionSuccess for the exact hash. Every path first proves the Safe onchain (a recognized Safe with every module read) and that the connected wallet signs for it, and a Safe signature is asked for, and posted, only while the Safe is unchanged since the review opened. `signReviewed` takes an optional async `reverify`, run after confirm and before each signature.

  A write hold whose call is a Safe's `execTransaction` settles as succeeded only on the Safe's own ExecutionSuccess for that call's exact hash, at the nonce the Safe spent in the receipt's block (new `safeExecTransactionResult`); an ExecutionFailure, or no event for it, settles as failed, so no held-write notice or later reader reports it succeeded, and `sendReviewed` stops at that step with `WRITE_HOLD_CALL_FAILED_LINE`, or, while the Safe's result is unproven, keeps it in flight with `WRITE_HOLD_SAFE_UNCONFIRMED_LINE`. `isSafeExecTransaction` is exported. A target that is not a Safe is decided as any other call; nonces it cannot read, or two executions of the same fields in one block, keep the write held.

- 4aefe13: A reviewed action with a `scope` is saved as a sequence once its review is confirmed, before the first wallet call, and advanced as each step's receipt lands. `findReviewedSequence(scope, account)` finds an unfinished one (a step sent or in flight), `resumeReviewed` finishes it: the step whose wallet call opened is decided by its own write-hold reservation first (still held is refused, a settled success counts as completed, a revert lets it be reviewed again, and an outcome it can't show, such as one hidden by a later send of the same call, is refused until the user discards), then only the remaining steps are reviewed once and sent, with `reverify` given each step's original index. A completed step is never sent again, only the account that started a sequence can resume it, a fresh run of the same scope is refused while one is unfinished, and every save is compare-and-set under a lock across windows so another window's progress is never overwritten. A Safe-connected step's proposal is recorded and the sequence resumes once it runs. Calls with an argument that could not be saved exactly (bytes as an array, a class instance) are refused before the review. `discardReviewedSequence` drops one (it resolves once removed), refused while any remaining step's call or intent is held.

  `useReviewedRun` (`@bananapus/nana-sdk-core/review/react`) is the one reviewed-send hook every site shares: it resumes a scope's unfinished sequence, reports each step's phase, maps error lines through `transactionMessage`, treats a closed review or a 4001 as a cancel, follows the hold of a step a run left in flight as `held` (live, here or in another window), and refuses a multi-step run without a scope. It resumes only when the same calls are asked for again. A site's own hook only builds its deps from its wallet library.

- d409d12: `signReviewed` signs only what the person reviewed: a Safe transaction, an ERC-2771 forward request, a Permit2 allowance or a plain message. Core builds every typed-data definition from its own constants, so no caller passes `types` or `domain`: a Safe transaction is signed for its Safe, a forward request for the chain's Juicebox forwarder (from the connected account, with a deadline no later than `relayrForwarderDeadline()`), and Permit2 for `PERMIT2_ADDRESS`. Any other kind, a Safe DELEGATECALL to anything but a recognized MultiSendCallOnly, or a chain with no forwarder is refused before the review opens. Every signature in one call shares one prompt. The review model gains `signatures`, each with its exact typed data or text, the calls it lets someone run decoded (the Safe inner call or MultiSend, the forwarded call), and Permit2's token, amount, spender and expiry rows; the model id binds them. `sendReviewed` takes `signatures` too, shows them in the same prompt as its calls, signs them after confirm and before the first send, and returns them as `signatures`. A wallet rejection (4001) while signing throws `TransactionReviewCancelledError` and returns no signature. A self-reviewing wallet (Signa) is refused with 4200 for either until it has a reviewed-signature path.

## 3.5.2

### Patch Changes

- 552d44c: `prepareUserPay` no longer sets `quoteFailed` when the V4 quoter reverts with `NotEnoughLiquidity` because the pool cannot fill the swap. That is the pool's state, not a failed read: the payment keeps the mint-rate minimum the hook settles at, without a retry or a warning the payer cannot clear.

## 3.5.1

### Patch Changes

- 8d87055: `PAY_QUOTE_FAILED_MESSAGE` says it in payer terms: "Couldn't load the market price, so this payment's minimum may be lower than usual."

## 3.5.0

### Minor Changes

- 0074629: `prepareUserPay` retries a failed pool quote once and returns `quoteFailed: true` when the retry fails too, so apps can tell the payer that the pool's rate is not protected. A hook rejecting the quoted minimum still falls back without the flag. Paid through the router terminal, its registry or its gateway, a project without a buyback hook now gets its minimum from what minting the quoted conversion issues, instead of from the router's floor, which can sit far below the pool's price on large swaps. This applies only when the router has one route: the project's one terminal is the multi-terminal, accepting one other token, and the payment reaches the current router. Native-to-wrapped payments, which the router wraps 1:1, keep the floor.

  Add `PAY_QUOTE_FAILED_MESSAGE`, the one line apps and agents show when `quoteFailed` is set.

## 3.4.1

### Patch Changes

- 510f443: `decodePayFailure` and `classifyCashOutExecutionError` name a revert only from revert data that is a known selector with exactly its canonically encoded arguments, from the router gateway's `RouteFailed` whose hash fingerprints a known selector (reason only, no amounts), or, when an error carries no revert data, from an error viem typed against the matching ABI item with arguments of its types. Text never counts, so an error name, selector or revert data in a message or an `Error(string)` reason is not a revert, and a bare selector no longer classifies. Shortfall reverts must settle below their minimum. A shortfall that settles nothing sets `zeroFill: true` and its message suggests no setting. The new `adjustable: "minimum"` field marks the terminal and buyback hook minimums that preparing again with a larger `slippageBps` relaxes (never the router's conversion minimum), and `payRetrySlippageBps(failure, currentBps)` gives that tolerance, capped at the new `PAY_MAX_SLIPPAGE_BPS` (49.5%, so a loosened minimum stays at a nominal 50.5% of the quote). `PAY_DEFAULT_SLIPPAGE_BPS` exports `prepareUserPay`'s default. Router, permit, Permit2 and NFT overspending messages now name the check that failed.

  The write hold releases a direct write as soon as its own transaction's receipt shows it reverted in a canonical block, instead of waiting for finality, so the payer can review and send again at once (`HELD_FAILED_LINE`). Pending, unknown and succeeded writes hold as before, a revert whose block the node can't show canonical stays held, and a Safe failure still waits for finality. `verifyDefifaNftTransaction` classifies a direct revert the same way.

## 3.4.0

### Minor Changes

- 3ca7137: `prepareUserPay` quotes the buyback pool behind a router terminal too.
  - When a router converts the paid token first (for example ETH to USDC for a project whose buyback pool is in USDC), `prepareUserPay` finds the pool among the tokens the project accepts. It quotes the router's conversion in the pool the router picks (Uniswap V3 or V4). It then previews the destination at that return to see what the hook receives (after any NFT split), quotes the buyback pool on it, and sends the floored quote as the hook's explicit minimum. The preview matches the fill. Before, it fell back to the payer's mint share, and large buys could mint instead of swapping.
  - The minimum sits above what the hook would mint for the quoted conversion, so the hook swaps. If the conversion returns noticeably less, the payment reverts with the hook's reason. The payer can then prepare again with a larger `slippageBps`.
  - The quoted payment is previewed again, and the quote is kept only if the hook still swaps in the same pool. Routes that are not a single swap of the whole payment, such as cashing out a project token first, keep the mint-share fallback.
  - Add `quoteUniswapV3ExactInputSingle` and `UNISWAP_V3_QUOTER_V2_ADDRESSES`. Each quoter's factory and WETH9 match the router terminal's on every supported chain.

## 3.3.0

### Minor Changes

- 0094820: `prepareUserPay` now quotes the buyback pool and sends the slippage-floored quote as the hook's explicit minimum on every quotable path, not only when the payer skips the reserved split. With `skipSplits` false, and always on buyback hook 1.1.1 (which ignores `skipSplits`), the minimum covers the whole issuance before the split, and `minReturnedTokens` is the beneficiary's share of it. The payer's mint share remains only for payments with no quote: no pool, a router converting the token first, or a failed quote.

  Add `decodePayFailure`, which reads a simulation or transaction error (or raw revert data) and returns `{ reason, received?, minimum?, message }` for the terminal and buyback minimums, the buyback floor, the router's conversion, paused or unready projects, token approvals and balances, and NFT tiers. When a payment falls short of a minimum, `received` and `minimum` let the payer lower it and retry. `classifyCashOutExecutionError` reads the same table.

## 3.2.0

### Minor Changes

- e60a114: `prepareUserPay` keys its quote to the buyback hook a payment actually reaches, and can honor the reserved split.
  - When a ruleset calls buyback hook 1.4 directly, or through the omnichain deployer's extra data hook, instead of through the registry, `prepareUserPay` now keys the quote to the hook and reads its pay specification. Before, the hook ignored the registry-keyed entry, so the payment did not skip the split, and a project with no registry assignment got a zero minimum.
  - `previewPay` recognizes that hook's specification too, but sends the metadata it is given unchanged; a direct hook ignores a registry-keyed entry.
  - Add `skipSplits` to `prepareUserPay` and `buildUserPayMetadata`. It defaults to true, as before. Swapped tokens skip the reserved split only with true. Pass false for payments that should honor the project's splits, such as fees or revenue routed into a project. The minimum is then the beneficiary's share of the mint entitlement, with no pool quote.
  - Add `hook` to `buildUserPayMetadata`, to key the quote to a buyback hook the ruleset calls directly.

## 3.1.0

### Minor Changes

- 3f55a8f: Pages load less of the SDK for the same imports. Every existing export keeps its import path and value.
  - Add `JBCenterRpcClient`, the read-only RPC half of `JBCenterClient`, in a module of its own. `JBCenterClient` extends it and `createJBCenterRpcProvider` builds it, so a page that only reads chains through JB Center no longer loads the intent decoders, ABIs and Safe code (`createJBCenterRpcProvider`: 20.3 KB to 2.8 KB gzip).
  - Add `jbV4ContractAddress`, `jbV5ContractAddress` and `jbV6ContractAddress`, one deployment table per version. `jbContractAddress` joins them by version with the same values; prefer the version's own table, since the joined one loads all three. The SDK's V6 code reads `jbV6ContractAddress`.
  - Add `compileBendystrawDocument`, which builds the same operation contract as `compileBendystrawOperation` from a document parsed at build time, so a page need not bundle the GraphQL parser.
  - Every generated ABI has a module of its own, the chain definitions and load-time tables are marked pure, and module-level ABIs are written parsed instead of `parseAbi` calls. The Sticky collectors, the tier price math, the review queue and the sucker deployer maps sit in modules of their own, re-exported where they were. `verifyStickyCollectorRoute` imports the sucker helpers statically, so esbuild can tree-shake bundles that include it.
  - `buildUserPayMetadata` on a chain without a V6 buyback registry deployment now throws the `v6Address` message ("No v6 JBBuybackHookRegistry deployment on chain …"). Every supported chain has one.

## 3.0.0

### Major Changes

- 8876120: Pay cards pay through the terminal with the buyback hook's `skipSplits` instead of buying from Uniswap directly.
  - Add `prepareUserPay`, which returns a payment's metadata, preview and `minReturnedTokens` together. It sends the buyback registry a `(0, minimum, skipSplits=true)` quote, so buyback 1.4 buys from the pool when that beats the payer's share of a mint and hands the swapped tokens over without the reserved split. When the hook's pool is in the paid token, the minimum is the slippage-floored pool quote. Without it the hook's TWAP floor reaches zero on large buys and sends them to minting. When no pool quote applies (hook 1.1.1, a router converting the token, a failed quote), the minimum is the payer's mint entitlement, which the hook never settles below.
  - Add `buildUserPayMetadata` and `effectivePayPreview`.
  - `previewPay` now folds the pay specification of the hook the buyback registry resolves (1.4 or 1.1.1) into its counts, using the router terminal's scoring rule. It used to report zero tokens whenever the hook swapped. The swap figure has no pool fee or price impact, so it is a preview, not a minimum.
  - Breaking: remove the `./v6/direct-pay` entry point (`quoteDirectPaySwap`, `buildDirectPaySwapTx`, `addPermit2SignatureToDirectPaySwap`, `NATIVE_SWAP_BY_CHAIN`) and `chooseBestPayRoute` with its route types. Sell-side direct swaps (`chooseBestCashOutRoute`, `buildUniswapV4ExactInputSwapTx`) are unchanged.

## 2.41.3

### Patch Changes

- eeeb388: Use the verified Sticky production deployments and source collectors on all supported home chains. Live pool and route checks remain required.

## 2.41.2

### Patch Changes

- 4a485b2: Two held-write view fixes Sticky found on 2.41.1, so no app needs a workaround:
  - A send that starts while its own view is reading the hold (on mount, focus, a poll or the read after the previous send) now waits for that read and its lock instead of refusing as busy. Another writer holding the call still refuses it.
  - A direct write whose hash is mined but whose result can't be read yet shows the confirming line during the normal confirmation window. "Your transaction is onchain, but its result can't be read yet." appears only after the existing two-minute wait, as the wallet's pending line does.

- 4a485b2: Two more held-write view fixes found validating the candidate against jbm:
  - A send made in the same tick as its view's start (as `useHeldSend` does) waits for the start's first read and for the view's follower read, so an earlier held send refuses it as held, never as busy.
  - A view acknowledges a success only when it delivered it to an `onSettled` callback. A watcher with no callback (`useHeldWrites`, `HeldWritesNotice`, app-wide followers) leaves the success unacknowledged, so the gate keeps blocking, the view shows `succeeded`, and the notice offers "Send it again" until the user acts.

## 2.41.1

### Patch Changes

- 64878a0: Every write hold controller over the same tab storage now shares one subscriber registry, by storage key. A reservation, hash, receipt, settlement, acknowledgement or release made through any handle reaches every view of that write in the tab at once. Previously a receipt reported on a separately opened handle (an app's receipt hook or root follower) reached the sending view only on its next poll. Sending the same action again right after "Confirmed" was then refused with "This went through while you were away." Other tabs still hear changes through the storage event and polls.
- fc44095: Held-write view fixes found by the Homerun migration:
  - A started view keeps hearing its hold after a send: the send subscribes its own listener, so unsubscribing it no longer removes the view's.
  - Every send that went out ends with one checked read, so a write mined during the send shows its settlement without waiting for the poll or focus.
  - A reservation the view's own send withdrew before the wallet (`onRejected`), or a clear read begun before the view saw that reservation, is never reported as released by another window.

## 2.41.0

### Minor Changes

- 9d7ea97: `useHeldSend` (`@bananapus/nana-sdk-core/review/react`, re-exported by nana-sdk-react) runs sends whose call is known only at send time, such as a generic contract write or Safe transaction. Each send goes through its intent's (or exact call's) held-write view, made once and reused, and the hook shows the current send's state, notice and exit as `useHeldWrite` does, so no app creates a held-write view itself.

  `view.exit()` now reports a release by another window during the exit as `releasedBy: "other-tab"` ("released elsewhere"), not as the user's.

  New intent builders follow the coarse identity rule (identity plus explicit choices, never derived or quoted values): `redeemIntent`, `allowanceIntent`, `burnIntent`, `safeBatchIntent` and `syncIntent`.

## 2.40.0

### Minor Changes

- d7ff352: The held-write hooks (`useHeldWrite`, `useHeldIntents`, `useHeldWrites`, `HeldWritesNotice` and `useSavedAttempt`) now live in core at `@bananapus/nana-sdk-core/review/react`, which imports React and no wagmi, so apps on wagmi 3 can use them. React is an optional peer of core. `@bananapus/nana-sdk-react` re-exports them, so existing imports keep working.

  A send now refuses when its own pre-wallet check finds an earlier success: only a success already delivered through `onSettled` before the send, with its acknowledgement under way, lets it through.

  Settlements saved before 2.39 (a latest marker with no time) read as acknowledged, so returning users meet no extra "Send it again" prompt.

## 2.39.0

### Minor Changes

- e021cad: One held write, the same in every app.
  - Core `/review`: `createHeldWriteView` (framework-free) and `followHeldWrite`. The view gives a held write's phase (`clear`, `awaiting`, `confirming`, `held`, `settled`, `released`), its one line, its exit, its send under the hold, the watch, one shared follower per reservation, and the adoption of a previous deploy's record before any send.
    - Once a write is confirming it never goes back to awaiting.
    - A read the chain didn't check never hides an exit already shown.
    - `onSettled` fires once, only for what the view saw held.
    - A release reads as released, by the user's exit or neutrally by another window, never as a result.
    - The follower ends only on the hold's authenticated settlement or the user's exit.
  - `hold.list({ account, chainId })` lists every write held for an account, intent and exact-call alike, never a mirror. Each comes with its handle at the key it was saved under. `listReviewedWrites` is the storage read.
  - New lines: `HELD_CONFIRMING_LINE`, `HELD_RELEASED_LINE`, `HELD_RELEASED_ELSEWHERE_LINE`, `HELD_EXIT_LABEL`, `HELD_RELEASE_LABEL`, `HELD_SUCCESS_LINE` and `HELD_EXPIRED_LINE`. `hidesShownExit` and `settledLine` move into the SDK.
  - React: `useHeldWrite` binds the view. Its exit only releases, and `onReleased("user")` is where the app reopens its review. `useHeldIntents`, `useHeldWrites` (from `hold.list`) and `HeldWritesNotice` make one app-wide notice.
  - `hold.adopt` also says why it adopted nothing: `declined: "refused"` when the evidence is proven another write (a hash that isn't the call's, or a malformed one), or `declined: "unreadable"` when it couldn't check (the chain unread, a client on another chain, no client, or a lock another writer held). The view refuses its send while an adoption is unread, and adopts again on the next send.
  - A success that settled while the page was closed is phase `succeeded` ("This went through while you were away."). Every send refuses, including one whose own check finds it, until the user picks "Send it again" (`view.acknowledge()`, `sendAgainAction`). That calls the new `hold.acknowledge(settled)`, which marks the settlement `acknowledged` under the lock, keeping its result and hash for every reader. An acknowledged success blocks nothing on a later load. A tab that saw the write held still shows it as a success and fires its own `onSettled` once, never a release. A success the view saw settle live is delivered through `onSettled` and acknowledged at once. Each call key keeps one settlement, which the next reservation replaces, so nothing piles up. New copy: `HELD_AWAY_SUCCESS_LINE`, `HELD_SEND_AGAIN_LABEL`.
  - A Safe proposal is truly pending only while Safe's service returns it unexecuted. Each such read restarts its 30-minute clock (`pendingSeenAt`); a Safe nonce that still waits restarts nothing. Once 30 minutes pass since it was sent, adopted or last listed, with nothing proving it ran, it gets the warned exit (`held-unchecked`), saved nonce or not, and even when the chain's id can't be read. It stays behind the gate on pending or recently mined evidence, and still needs the user's explicit exit. An unproven end (the service can't find it) has its own warned exit, until the service lists this exact proposal unexecuted again. That listing undoes the unproven end and restarts the clock, so the checked answer removes the exit.
  - A legacy hold an intent stood for keeps its settlement through the intent's `state()`, `peek()` and `acknowledge()`. A view that saw it held shows its result, never a release, and so do its subscriptions: the intent's own empty clear never reaches a view while a legacy hold stands for it. An unacknowledged success still blocks a fresh view's sends until it is acknowledged, where it was saved.
  - An adoption read that lands after its view stopped applies and acknowledges nothing, and a StrictMode restart runs the adoption again.
  - A settlement is acknowledged only once its `onSettled` callback has run while the view is live. A delivery a stop interrupted is retried on the next start of the same controller.
  - The legacy hold an intent was seen standing for keeps its result through settlement, even if the intent reserved before (a rejected attempt). An old settlement never seen held stays unannounced. Undelivered settlements are kept per reservation, and a restart retries each.
  - On a fresh load, a legacy settlement reserved after the intent's own latest reservation is the intent's unacknowledged success, and it blocks the send until acknowledged. Reservation markers now carry their time (`latestReservedAt`), with the settlement's time (`settledAt`) as the fallback. An older settlement stays unannounced. Equal or missing times can't prove order, so they block. The same choice applies when the intent already has its own older settlement, such as a revert, and it applies in reads, events and the send guard.
  - Across several legacy keys, any eligible unacknowledged success (newer, or of unprovable order) wins over failures and acknowledged successes, the same in reads, events, acknowledgement and the send guard. `useHeldWrite` keys `legacy` calls with bigint values safely.
  - What a view shows and whether it may send are now separate. Each settlement of a reservation the view saw held is delivered once, by reservation. The send gate is a pure read over current evidence, the new `handle.unacknowledgedSuccess()`: any eligible unacknowledged success of the intent or its legacy holds. `send()` refuses on it every time, whatever is shown. `succeeded` ("Send it again") shows whenever the gate holds and nothing is left to deliver, replacing a retained settled or released result of another reservation. "Send it again" acknowledges the gate's success where it was saved.
  - The send gate looks past a success only after excluding the ones this view already told, so every other eligible success still blocks (`unacknowledgedSuccess(skip)`). It is asked again at the reservation itself, after any lock retries. A finished "Send it again" ends only that success's presentation, never a newer hold or its exit. Each reservation a view saw held is delivered once through the new `handle.settlementOf(reservation)`, even while another hold is shown.

- 42b65da: One saved-attempt recovery, the same in every app.
  - Core `/review`: `createSavedAttemptRecovery({ hold, storage?, locks? })` with `recover(attempt, client)`, `retire(attempt, reason)` and `canDiscard(attempt)`. An app describes a saved attempt by its intent namespaces (legacy ones included), what it saved (`started`, `hash`, `safeTxHash`, `safeNonce`, nonce evidence, `submittedAt`, `before`) and its `authenticate(hash)` domain check (`proven`, `not-this` or `unknown`).
  - `recover` returns exactly one of `held`, `done` (`success`, `authenticated` or not, or the hold's proven `failed`), `check` or `none`, and never throws. It needs only what was saved, so it runs before any fresh-send preparation. A missing hold record with a started send, a refused or unreadable adoption, an empty search, holds kept only in this tab and every exception are `check`. A settled success always wins: one the app's check can't show is `done` with `authenticated: false` and its hash, never a check or a send, and only `{ by: "settled" }` retires it. A check whose hold evidence moved while the app's check ran is evaluated again, and a check stays bound to the snapshot it evaluated; a success that settles while the passes run still returns `done`.
  - `retire` saves the user's exit, the user's check action or a followed settlement under every namespace's hold lock, for every tab and reload, bound to the hold evidence it saw: a later reservation or settlement is never covered. A followed success is acknowledged on the hold. It returns `{ retired: true, durable }`, where `durable: false` means that commit lasts in this tab alone (the new optional `HeldWriteStorage.durableAt(key)`, which `createHeldWriteStorage` implements, says so per key).
  - A reservation the SDK drops on a definite wallet rejection or an abort before the wallet opened is now recorded (`rejectedReservation()` on the write recovery), so its saved attempt retires on its own (`none` with `retired: "rejected"`) instead of asking for a check, across the legacy mirrors that share its reservation id.
  - Rule E: only `{ by: "settled" }` retires a success. An authenticated success is saved for every tab, so a stale check or exit elsewhere is refused. Check and exit retirements read the hold fresh and error-aware under its locks (new `assertReadable()` on the write recovery and optional `HeldWriteStorage.getItemStrict`, which `createHeldWriteStorage` implements), then await the attempt's required `confirmRetirable()` (the app's journal re-read). A proven success overrides any retirement but `settled`. `canDiscard` and the `none` decision use the same strict reads. Storage that exists but can't be read makes a retirement return `{ retired: false, reason: "unreadable" }`; only then may the app offer the warned `force: "unreadable"` exit, which retires in this tab alone. New copy: `SAVED_ATTEMPT_TAB_ONLY_LINE`, `SAVED_ATTEMPT_UNREADABLE_LINE`, `SAVED_ATTEMPT_CONTINUE_ANYWAY_LABEL`; React adds `unreadableAction`. `none` needs `saved.started === false` with no hash or nonce evidence.
  - `canDiscard` is false while the attempt is held, or while a success it settled hasn't been followed.
  - New copy: `SAVED_ATTEMPT_CHECK_LINE`, `SAVED_ATTEMPT_CHECK_WARNING` and `checkedItLabel(next)` ("I checked it. Review it again.").
  - React: `useSavedAttempt({ recovery, attempt, client, checkNext })`, with answers from the latest request of the mounted attempt only, callbacks bound to the attempt last rendered (refused from the next attempt's first layout effect on), and the one `checkAction`.

## 2.38.2

### Patch Changes

- d0faff4: A namespaced hold whose send never reaches the wallet no longer leaves its exact-call mirror behind. When the app reports the send unsent (`gate.onRejected()`: a reset or abort during the review, a review rejection, or a definite wallet rejection), the reservation's mirrors are removed by their id, under the locks the send still holds, through the same cleanup used after a failed mirror write. A mirror stays only when a wallet send may have happened.

## 2.38.1

### Patch Changes

- ecf5030: A legacy `{ match: { to, selector } }` no longer lets two intents through the same target and selector block each other. At a key a match found, only a true pre-intent exact-call record holds: any intent's mirror there is skipped, including one an older version left, and no intent writes its mirror there. Each intent's own namespace already holds its own writes. A pay to project A no longer blocks a pay to project B through the same terminal, and one LP position no longer blocks another.

## 2.38.0

### Minor Changes

- e90a3fc: Shared write intents, so every web client keys the same user action the same way.
  - `/review` exports `payIntent`, `cashOutIntent`, `loanIntent`, `borrowIntent`, `bridgeIntent`, `approvalIntent`, `launchIntent` and `liquidityIntent`. Each returns a write hold namespace from identity plus explicit user choices, never derived, quoted, routed or auto-filled values, and reads only the fields it names. Every value is normalized first, in one place: a safe integer and a bigint are one value (1000 and 1000n give one key, ids and `launchIntent`'s config alike). Nothing is inferred from a string's shape: plain strings stay exactly as given, and only values tagged with `intent.address` or `intent.hex` compare case-blind. Each builder tags the parameters whose meaning it knows (project, beneficiary, holder, sucker, token, spender, account, pool); in `launchIntent`'s free-form config, the app tags addresses and bytes itself. A list it takes (liquidity `positions`) is a set: sorted and deduplicated, so order and repeats never change the key. A coarse key may make a second action of the same kind wait on an unresolved first one, but never sends twice.
  - `resetWriteHoldsForTests()` and `resetWriteRecoveryForTests()` empty the tab's lock queues and held-write memory in place, so a controller made at module scope before the reset no longer keeps old holds.
  - A candidate execution reported with `onExecuted` keeps its 30-minute unseen window through failing chain reads after `onUnproven`, until the chain first shows it pending or mined: no exit at once. Its report time is saved as `candidateSeenAt`.

## 2.37.0

### Minor Changes

- 31c0929: A Safe Relayr action no longer says "already has a payment in progress" when it only couldn't check.
  - The bundle's payment status is three-valued. A read that fails is retried a few times, then reported as unknown: a pending result with recovery `status-unknown` (`retryable: true`) and `SAFE_RELAYR_STATUS_UNKNOWN_LINE` ("Couldn't check this payment's status. Try again in a moment."). It is never treated as paid, and never as free to pay again. A later successful read proceeds normally.
  - A quote's deadline is checked against the chain's finalized clock, the one that enforces it. When the browser's clock has closed the payment window but the chain hasn't passed the deadline, the result says so (`quote-closing`, `SAFE_RELAYR_QUOTE_CLOSING_LINE`) instead of "in progress"; when the chain's finalized block can't be read, it is unknown rather than open or expired.
  - Relayr reporting the bundle paid or running still says a payment is in progress.
  - Every bundle status read (the first read of a check, the unpaid check, the final check before the wallet, and the read before a quote is replaced) goes through one helper with the same bounded retries and the same `status-unknown` classification.
  - `relayrDeadlinePassed` is three-valued and the one home of the deadline rule: `true` passed, `false` open, `null` unknown (no finalized block, a finalized block no longer canonical, or a deadline that can't be read). Null is falsy, so `if (await relayrDeadlinePassed(...))` keeps its meaning; a caller typed `Promise<boolean>` needs `=== true`. `relayrQuoteUnfundable` (now exported) carries unknown through as `null`; unknown never releases.
  - An unused quote is replaced only after a status read proves it unpaid. Relayr reporting it paid or running is saved as observed funding (from any status read, the final pre-payment check included), and an unknown status keeps the quote.
  - A quote whose status stays unknown after its deadline passed on finalized evidence, with every payment canonically reverted or answered not found by the node (a failed read, or a payment still pending, stays unknown), and no funding ever reported, offers a warned exit: recovery `exit: true` with `SAFE_RELAYR_UNCONFIRMED_LINE` ("We couldn't confirm this payment's status. If your wallet shows no payment, get a new quote."). The controller's new `exit({ account, sessionId })` rechecks that evidence, then releases the quote as `payment-unconfirmed`, keeping its record for reconciliation, so a new quote can follow.
  - A payment the node can't find is never released on its own, even with the deadline final and Relayr reporting unpaid: no node can prove a transaction doesn't exist, so the user's warned exit ends it. Funding reported by any read during a check is saved before the result returns.
  - `revertedRelayrQuote` returns `funded` when its last read before release reports the bundle paid or running (it threw before), and takes `confirmUnpaid` so a caller can run that read through its own retries. Safe Relayr does, and saves that report as observed funding.
  - Funding Relayr reported once stays unresolved until the chain proves a payment funded the quote or its calls ran: a later unpaid read, or this session's own payments reverting, never releases it on its own or lets it be paid again (`funding-unresolved`). Its only way out is the warned exit below.
  - When the last read before releasing a quote whose payments reverted stays unknown after its retries, the check returns `status-unknown` with the evidence-checked warned exit instead of throwing.
  - So a spurious funding report is no dead end: once every deadline is final and an hour has passed since funding was last reported (`fundingObservedAt`), `funding-unresolved` offers a warned exit with `SAFE_RELAYR_FUNDING_EXIT_LINE` ("Relayr reported a payment for this quote. Check your wallet and Relayr before paying again."). `exit()` then releases the quote as `payment-unconfirmed`, keeping the record, `fundingObserved` included, for reconciliation. A status read that stays unknown after funding was reported offers the same exit, with the same line, on the same rule and the same chain evidence.
  - Funding evidence is sticky in the controller's one save path: a save from an older snapshot never drops `fundingObserved` or `fundingObservedAt` that another flow saved. `prepare` checks a kept quote from the session its own status read saved, and every bundle read, the missing-quote check and each read of `revertedRelayrQuote` (now `statusRead`, in place of `confirmUnpaid`) included, goes through the shared retries.
  - Just before the wallet opens, `fund` reads the saved record again: funding another flow reported, or any change to its state, payment status, bundle or payments, refuses without opening the wallet.

## 2.36.0

### Minor Changes

- a4a5b18: Find old exact-call holds by target and selector, and reset holds between tests.
  - `open(call, { legacy: [{ match: { to, selector } }] })` finds every exact-call write this account saved on this chain to `to` whose calldata starts with `selector`, and delegates to it exactly like a `{ call }` legacy key (one lock at a time, mirrors and the ordered reserve all apply). It is looked up when the handle opens, on every `state()`, `send()` and `exit()`, and at the final reserve, where a newly found match refuses the send and is reached by `state()` and `exit()` from then on. It covers holds saved before the deploy, not a concurrent tab still running the old version. For a hold an earlier version saved under calldata a retry can't rebuild, such as an old minimum, expiration or deadline; pass one only for writes whose calldata is volatile. An intent's mirror is never matched: it is found by its namespace.
  - `findReviewedWrites({ chainId, account, to, selector })` is that lookup. It returns each record with the key it was saved under, checks the record's account, chain, target and selector against the match, and the hold reads, locks and exits each at that key, never one rebuilt from its calldata, so a reused Safe proposal saved under its reviewed call's key is found and reached too. `createBrowserWriteRecovery` takes that key as `at`. It lists the storage's keys (`HeldWriteStorage.keys()`, or Web Storage's `length` and `key()`); a store that can't list them finds none.
  - The test-only entry `@bananapus/nana-sdk-core/testing` (no other entry exports it): `resetWriteHoldsForTests()` stops every controller's settle polls and tab listeners and drops this tab's lock queues and held-write memory. `resetSafeRelayrForTests()` stops every Safe Relayr watch (it rejects with an AbortError) and forgets remembered reviews. `resetWriteRecoveryForTests()` drops the lock queues and held-write memory alone.
  - `handle.adopt(snapshot, { nonce | sentNonce, fromBlock, submittedAt })` moves a hashless write a previous deploy kept outside these holds (such as Sticky's main-era bridge reservations) into the hold. Under the call's lock it reserves a hashless held record with that evidence only while nothing is held and no reservation came since `snapshot`, the state the app read: another tab's hold or settlement wins, and the current state is returned unchanged. Under an intent it reserves like a send, under every legacy key's lock, mirrored at each. It never sends, settles only on authenticated evidence, and adopting twice holds once.
  - A Safe hold may now hold a whole batch: its call is `{ to: MULTI_SEND_CALL_ONLY, data: encodeMultiSend(calls), value: 0 }`, so two batches that share a first approval no longer collide. `verifyReviewedWriteReceipt` proves such a hold by the calls it encodes: an execution at once settles only when the Safe ran exactly that MultiSend (target, calldata, value 0) by DELEGATECALL, never a direct CALL of a one-call batch's call, and a proof must give them with `batch: true`. Its expiry proof matches the proposal's DELEGATECALL. A single-call hold is unchanged.
  - `adopt` also takes a saved `hash` (or `safe: { safeTxHash }`) and a client. The hash is checked first: a transaction that is another call, from another account or on another chain, or a Safe proposal of another call, is refused and nothing is adopted. A pending one is held with no exit, a mined one settles on its verified receipt, and one the chain can't show gets the warned exit 30 minutes after `submittedAt` (or adoption).
  - A saved hash with no nonce evidence that the node doesn't know now waits the same 30 minutes before its exit, instead of offering it at once.
  - Every `state()` and `exit()` result carries `checked`: `true` when the gate read the chain under the call's lock, `false` when the lock was busy and the result is only the saved record (its exit hidden). Don't let a `checked: false` result hide an exit already shown.
  - `handle.attachSafeNonce(client, { safeTxHash, nonce })` saves the Safe nonce of a held proposal adopted before it was known, only when the call's proposal at that nonce hashes to `safeTxHash`, so a replacement can be proven later.
  - Every Safe-service read inside the hold, its body included, is bounded to one 8-second deadline, whatever its fetch does with the signal. A timeout is unknown: it never releases or settles, and a hung service no longer holds a send or the call's lock.
  - The held-write store's `keys()` also lists what this tab last saw in the browser's storage, as `getItem()` still shows it while that storage can't be read, so a legacy match still finds a hold then.

## 2.35.0

### Minor Changes

- 7f0aaaa: One home for write intents, in place of each app's `write-intent.ts`.
  - `writeIntentKey(action, params)` in `/review` returns the write hold namespace for a write whose calldata regenerates on retry. Params are canonically encoded (sorted keys, decimal integers, exact strings) and hashed behind a readable `intent:<action>:` prefix. Addresses and hex are normalized only when tagged with `intent.address()` or `intent.hex()`; plain strings stay case-sensitive, so memos "ABC" and "abc" no longer collide. Every value type has its own tag (a number never equals a bigint; pass amounts as bigint), and non-integer numbers and sparse arrays are refused.
  - `holds.open(call, { legacy })`: under an intent namespace, the current exact call and every legacy key (an old namespace, or `{ call }`) are checked, each alone under its own lock, never two at once. While one holds an unresolved write, the intent handle is that hold: `state()` returns its gated state, `send()` refuses with it, and `exit()` runs its own exit; it stays where it is and settles or exits in place. Only when all are clear does the intent's own record apply. The intent's send holds no lock while it reviews. The final check and reservation take the intent's lock and every legacy key's in one sorted order, after the nonce read, and keep them until the send ends; a key another writer briefly holds is retried for up to 2 s with a jittered backoff, every lock, the intent's own included, released and the checks repeated between attempts, before `WriteHoldBusyError`. When the intent reserves it writes a held mirror at each legacy key (`mirrorOf` on the record), so older versions and exact-call readers see it held. Every mirror is saved in the store the hold itself uses (its memory fallback included) before the wallet opens; otherwise the unsent reservation and its partial mirrors are undone; a same-version exact-call handle that finds a mirror is the intent's hold, so it never sends or releases on its own, and the intent's legacy delegates route the same way, so evidence and exits always act on the source attempt. A mirror never takes a hash or settles; it carries no evidence of its own. The mirror is removed, by the id of the reservation that ended only, when the intent settles or exits; a mirror never settles anything.
  - Every emitted, subscribed and returned state carries `reservation`, the id of the reservation it belongs to; a clear names the one that ended, even when its latest-reservation marker couldn't be saved. A late subscriber's replay is matched by reservation too.
  - Low level: `createBrowserWriteRecovery(...).latestReservation()`.
  - Each involved key's generation (its latest reservation id, kept after settlement and mirror removal) is read when the review opens and checked under the reserve locks. If another window's attempt came in between, the send throws `WriteHoldStaleReviewError` (`WRITE_HOLD_STALE_REVIEW_LINE`, with `settled` when known) and needs a fresh review; the next review sends normally.
  - `exit()` never waits behind another send's wallet prompt: on contention it returns `released: false` with the current state, without an exit.
  - An attempt's last record is removed only once its generation is the committed latest marker; otherwise it stays at its key, released, and carries the generation. A send is never blocked on this.
  - In memory-only mode (storage refused) tabs can't see each other's holds; sends are never refused for it, and every held state carries `notice` (`WRITE_HOLD_IN_TAB_LINE`), from one decorator every state leaves through, a replay and a final reserve's refusal included. The README states that cross-tab protection needs shared storage.
  - Unknown or not found is not pending: when no read of a returned hash shows it pending or mined (they fail, or the node says not found and its nonce can't be proven either way), the warned explicit exit comes 30 minutes after it was submitted or last seen pending (`pendingSeenAt`); it never releases on its own.

## 2.34.1

### Patch Changes

- a45e9c6: Only the gate offers an exit. Every method that has a client (`state`, `exit`, `onReceipt`, `onUnproven`, `onExecuted`, `attachHash`, and a send's refusal) returns, emits or embeds in its error only the gate's answer, so an exit appears at once where the gate allows it and never where `state()` would refuse it. `peek()`, a subscriber's replay and every other emitted state that didn't pass through the gate in `state()` or `exit()` (a send's progress, another tab's change) now keep the status and line with `exit: false`, so a UI can't unlock a retry from a stale exit, for example after the original hash became pending again. The exit appears once `state(client)` or `exit()` runs the gate. The `exit` field of the exit-capable states is now typed `boolean`.

## 2.34.0

### Minor Changes

- 7d3137e: Keep a held write's settlement for every reader, not just the caller that saw it.
  - When a hold clears on authenticated evidence (a verified receipt, or a Safe proposal's canonical execution), the settlement is saved in the hold's storage, with the same memory fallback and tab-shared evidence. A later `state()` or `peek()` for that call, from another tab, a reload or after the SDK's own follow timer settled it, returns `clear` with the same `settled: { result, hash }` until the next write on the call is reserved. Each settlement is bound to the reservation it settles, and is read only while that is the call's latest reservation (kept after a rejection or exit), so an older settlement never comes back, whether its removal failed or another tab's memory still holds it.
  - A clear released by the user's exit never carries `settled`, and a proven expiry reports it only to the caller that saw it. Holding and exits are unchanged.
  - Low level: `createBrowserWriteRecovery(...).markSettled(record, settlement)` and `.settled()`, with the `ReviewedWriteSettlement` type.
  - A Safe write whose returned hash, or any candidate hash the hold has seen, is a known pending transaction reads as `pending-known-hash` with no exit, in `state()` and in the exit's recheck, so a second submission can't follow while the first is still pending.
  - `onExecuted(client, hash)` no longer saves `executed` on the app's word. The hash is kept as a candidate (`candidates` on the record) and settles the write only once its own receipt proves this Safe's execution of the exact proposal or call. A candidate that fails verification leaves the hold free to reach `onUnproven` and its exit.
  - `subscribe(listener)` calls the listener at once with the hold's latest state, when it has one, so a subscriber that arrives after the hold spoke (as a React effect does) doesn't miss it.
  - One gate for every exit, offered or taken: no exit while any hash the hold has seen, its own or a candidate, is a known pending transaction (positive pending metadata only: a mined transaction whose receipt can't be read isn't pending), in every state, a Safe replacement included.
  - A hash reported to `onExecuted` is authenticated on arrival: its own receipt settles the write or disproves it, and only an unresolved one is kept as a candidate. A candidate is dropped only on canonical proof it isn't this proposal's execution (it reverted, or its Safe logged no execution of the safeTxHash); an RPC failure, a missing receipt or a timeout is unknown and never drops, settles or releases. There is no cap on candidates: they come only from the app's own wallet replies.
  - A reservation's latest-reservation marker is verified by reading it back, and a record saved at the call's key always outranks a settlement of another attempt, so a refused marker write never brings an older settlement back.
  - `subscribe()` replays the cached state only while it still names the call's current record, and listeners are keyed by the canonical recovery scope (`scopeKey` on `createBrowserWriteRecovery`), so a namespace and an exact call never share one.
  - `attachHash(client, hash)` attaches a hash the chain authenticates as the exact call, sent by the account on the reservation's chain (checked with the client's chain id), at or after the reservation's next nonce and not mined before it was reserved (a record saved with no nonce evidence attaches nothing and keeps its exit), to a held write that has none, under one lock and without releasing it. The hold then follows it: no exit while it is pending, and its receipt settles it.
  - A settlement is shown only on a positive identity match: a wallet rejection that can't save the latest-reservation marker keeps its record as released, so the rejection never uncovers an older success, and a replayed clear is compared by its settlement's identity.
  - A canonical finalized block showing the authenticated sent nonce used by another transaction proves the saved hash dropped even while a node still reports it pending: `dropped-proven`, with the exit, which that proof lets past the pending gate.
  - A proven drop at the sent nonce takes priority over a positive effect read (`looks-done`).
  - A held hash the node shows mined, with its receipt unreadable, may have run: it reads as `pending-known-hash` with `WRITE_HOLD_MINED_LINE` and no exit, and after 30 minutes (`minedAt` on the record) as `held-unchecked` with the warned exit. A receipt that becomes readable settles it as usual. This applies alike to an attached hash and a returned one.
  - The 30-minute mined rule covers every hash the hold has seen, unresolved candidates included, each with its own clock (`candidateMinedAt`). A saved clock keeps counting through read failures and stops only on positive pending evidence.
  - A proven Safe execution never offers a resend exit: when its receipt can't be read, the canonical ExecutionSuccess or ExecutionFailure log at a finalized block settles it with that result and hash.
  - A mined clock belongs to its hash: adopting a replacement hash (a speed-up after a reorg) starts it over. A readable receipt that can't be verified no longer stops a finalized Safe log from settling the execution.

## 2.33.2

### Patch Changes

- 208a687: A Safe execution hash the wallet returned at once is saved as `executed` only after it is authenticated as this Safe's canonical execution of the exact reviewed call, with the same check `verifyReviewedWriteReceipt` uses. Before, a receipt alone marked it executed even when it ran a different call, which nothing could settle and `onUnproven` couldn't end, so the call stayed blocked. Such a hash now stays unproven: the warned exit after 30 minutes, and `onUnproven` offers it at once.

## 2.33.1

### Patch Changes

- 7d3463a: No dead end for a seen hash that vanished (ruling R119).
  - A wallet hash seen with its sent nonce that the node has since answered as not found, continuously for 30 minutes, with the account's nonce still unused at a canonical finalized block, now gets `held-unchecked` with the exit and the warning. Before, it was held forever, although wallets often stop showing a dropped transaction.
  - The clock is kept on the record (`vanishedAt`), so it survives a reload, and is cleared whenever an authenticated hash is seen again, on every path (in the mempool, mined with its receipt not yet readable, or a speed-up adopted at its sent nonce). The exit rechecks: a hash that reappears or mines is followed, not released.
  - A finalized nonce past the sent nonce keeps the dropped-proof rules, and a node or finalized block that can't answer offers no exit.

## 2.33.0

### Minor Changes

- e5a36e3: Record a Safe follower that ends without proof (ruling R119, the Safe replaced ruling).
  - `onUnproven(client, proposalHash?)` on an opened write hold saves the end on the record (`unproven`, durable through reloads) when the app's Safe follower gives up or Safe's service loses the proposal. `proposalHash`, when given, must name the held proposal.
  - `state()` then returns `safe-unproven`, with the exit at once, `WRITE_HOLD_SAFE_UNPROVEN_LINE` ("This Safe transaction couldn't be confirmed here. Check your Safe, then send again.") and the warning. `exit()` follows the usual snapshot rules.
  - Authenticated evidence that arrives later (this proposal's canonical execution log, or its receipt) still settles it. A proven execution or replacement keeps its own state.
  - A canonical Safe execution failure authenticated before it is final is saved as executed with its hash (`ran-executed`, no exit), and settles as failed only at finality, so an earlier `safe-unproven` snapshot can no longer exit. `verifyReviewedWriteReceipt` takes `{ finality: false }` to authenticate such a failure before finality.

## 2.32.0

### Minor Changes

- 8abcff8: One controller for held wallet writes, so each app's send hook becomes thin wiring (ruling R119).
  - `createWriteHold({ storage, locks, safeService })` opens a hold per exact call with `send(client, run)` (its gate's `beforeSend`, `afterSubmit` and `onRejected` go to the wallet boundary), `onReceipt`, `onExecuted`, `exit(snapshot, { checkedWallet: true }, client)`, `state(client)`, `peek()` and `subscribe(listener)`. States: `clear`, `pending-known-hash`, `held-no-hash`, `dropped-proven` (proven from the nonce the hash was sent at, never the pre-wallet hint), `held-unchecked` (a hash the node doesn't know on a record saved without a nonce, or 30 minutes after the wallet returned it, as recorded in `submittedAt`, or for a record saved before that existed, after `firstSeenAt`, saved the first time the controller reads it: the exit, with `WRITE_HOLD_UNCHECKED_LINE`; a hash that shows up later is followed as usual) and `ran-executed`. `WriteHeldError` and `WriteHoldBusyError` refuse a held or already-open call; `WriteHoldNonceError` stops a send whose account nonce can't be read after one retry, before the wallet opens.
  - `createHeldWriteStorage` keeps holds in the browser's storage, or this tab's memory where storage is refused, reads both and moves memory holds into storage once it can be written. `WRITE_HOLD_IN_TAB_LINE`, `WRITE_HOLD_PENDING_LINE` and `WRITE_HOLD_REVERTED_LINE` are the lines.
  - A verified success releases at once; a revert, including a Safe execution returned at once that failed, holds until final; a Safe execution returned at once whose own transaction reverted ran nothing and settles as `failed` once final (`verifyReviewedWriteReceipt`), so a retry is allowed; a Safe proposal proven executed is saved (`executed`, `executionHash` on the record), refuses `abandon`, and settles from its execution's receipt. Proven-expired proposals release.
  - `lookAtSafeProposalEnd` and `watchSafeProposalEnd` return the execution the canonical ExecutionSuccess or ExecutionFailure log names, and read the chain's proof even when Safe's service already lists the proposal executed. `lookAtSafeProposal` and `watchSafeProposal` keep their return values.
  - `checkReviewedWrite` and `resolve` report `{ status: "pending", usedBy }` when a canonical finalized block shows another transaction used the nonce of a write the node doesn't know.
  - The per-tab lock fallback and the tab memory are shared by every copy of the module loaded in a tab.
  - A record whose hash the node knows but that was saved without a starting block searches for its sent nonce from genesis, so its drop can still be proven; a hashless record without nonce and block evidence gets the exit with `WRITE_HOLD_UNCHECKED_LINE`.
  - Ruling (UX6 review, kept as is): the unchecked exit opens after 30 minutes, or at once for a record saved with no evidence to check. It opens only on the user's explicit "I checked my wallet", and every exit of a write with a hash carries `warning`: `WRITE_HOLD_HASHED_EXIT_LINE` ("If that transaction is still in your wallet, sending again can run it twice."). Under R119 that way out beats a hold that lasts forever.
  - What a tab last read from the browser's storage (records, releases and deletions) is shared by every controller and module copy in the tab, so a new controller still holds a write after storage reads are refused.
  - A Safe proposal's authenticated nonce is saved on its record (`safeNonce`): from `afterSubmit(hash, proposal)` when the app has the proposal, or from Safe's service on the first look. Its end, and its execution, are then proven from the canonical log with `provenSafeProposalEnd`, without the service. A proposal the service never authenticates gets the unchecked exit after 30 minutes.
  - Execution logs count only when they carry the number and hash of the canonical block where the Safe's nonce passed. A saved execution is rechecked, so one reorganized away settles from this proposal's own canonical log, or is held as replaced.
  - A Safe execution the wallet returned at once saves who sent it and at which nonce (`sentFrom`, `sentNonce`, from its authenticated transaction). If a reorg removes it, another transaction at that nonce (`findTransactionAtNonce`) holds it as replaced; history that can't be read keeps it held, with the unchecked exit 30 minutes after the wallet returned it.
  - Ruling (UX6 review round 4): Safe proposals and direct Safe executions are never released automatically as replaced, since the transaction that used the nonce (another proposal, a module execution, the same call with a different safeTxGas) may have run the call too. Only authenticated evidence that this exact proposal or transaction succeeded or failed settles them. A replaced one is `safe-replaced` (saved as `replaced` on the record): the exit at once, with `WRITE_HOLD_SAFE_REPLACED_LINE` ("Another Safe transaction used this nonce. Check your Safe, then send again.") and the warning. Ordinary writes keep their rule: dropped needs a different call at the finalized nonce, and the exit is explicit.
  - Ruling (UX6 review round 5): an automatic release needs authenticated evidence for this exact transaction. `checkReviewedWrite` and `resolve` adopt another hash (a speed-up) only at the saved hash's authenticated `sentNonce`, never at the pre-wallet nonce, so a lost reply is no longer tracked by a hash found there; it keeps its exit.
  - Breaking for apps that pass `effect`: an effect read no longer releases a hold. The `ran` check status is gone; a pending check carries `effect: true`, and `createWriteHold` shows `looks-done` with `WRITE_HOLD_LOOKS_DONE_LINE` ("This looks done. Check your wallet, then continue.") and the exit at once. A Safe write is guarded before any effect is read.
  - A saved hash's `sentNonce` is bound only from its own transaction: the node's answer must carry that hash and, when it says, the saved chain. Any other answer binds nothing and keeps the hold.

## 2.31.0

### Minor Changes

- 8a989ad: Shorter Relayr request deadlines, so an action held behind an abandoned session waits at most 2 hours (rulings R114 (g) and R117 otherwise unchanged).

  Behavior changes:
  - `RELAYR_FORWARDER_DEADLINE_SECONDS` is now 2 hours, not 47. `relayrForwarderDeadline({ seconds, nowSeconds })` returns the deadline to sign with and accepts 1 to 47 hours.
  - `bindRelayrQuote` records the earliest signed request deadline as `requestsDeadline`. `relayrPaymentDetails` (with `requestsDeadline` or `expectedTransactions`) and `relayrPaymentOptions` refuse an option whose payment deadline is less than `RELAYR_REQUEST_RUN_MARGIN_SECONDS` (30 minutes) before it, so a paid bundle's requests can still run. Apps that refresh signatures before a quote must refresh once less than the payment window plus this margin is left.
  - A quote saved without `requestsDeadline` gets the same margin from its `expectedTransactions`; a forwarded quote whose request deadlines can't be read offers no option.

## 2.30.0

### Minor Changes

- ecafc01: Release holds that left users stuck, following revnet.money (ruling R119). Hold only where a second run could cost money the chain would not refuse.

  Behavior changes:
  - Write recovery holds an ordinary write by its exact call (account, chain, target, value and calldata), not by target and selector. A changed amount or quote is no longer held; a `namespace` still holds a whole action. Records under the old key still hold their exact call.
  - `reserve(call, evidence)` records the account's next nonce (`readReviewedWriteNonce`). `resolve` and `checkReviewedWrite` check the client's chain against the record's before any proof, and pass the saved chain ID to the app's `effect` read. The saved hash's own transaction binds the nonce it was sent at (`sentNonce`) and counts as sent wherever it ran, wallet wrappers included; the exact call at that nonce is adopted after a speed-up; `effect` returning true releases it as `ran`. Any other transaction at the nonce stays pending, since a wrapper or an EIP-7702 wallet may have run the call inside it: a wallet cancel costs the user one tap on the exit. `abandon(record, { checkedWallet: true })` is that exit; it marks only that exact record (by its ID) as released, so a stale exit can't erase a newer write from another tab, needs no lock, so it works when the cross-tab lock fails, and accepts a returned hash kept only in memory after a failed save.
  - `withLock` no longer refuses without Web Locks: the origin's tabs share an IndexedDB lease per action (claimed in one atomic transaction, renewed while held, lapsing 15 seconds after a tab closes), or, with no IndexedDB either, a lock within the tab, with one console note. `browserLocks()` exports the same fallback.
  - `lookAtSafeProposal` returns `executed` or `replaced`, and `watchSafeProposal` ends with them, once the Safe's nonce is past a proposal at a finalized block: a search of the Safe's nonce at past blocks finds the block where it was used, and the Safe's execution events there decide. Before, a passed proposal was watched forever.
  - A payment through a wallet contract that reverted now counts as reverted for `revertedRelayrQuote`, so the Safe Relayr controller releases its session once the deadlines are final and the bundle is unpaid, instead of leaving it pending with no exit.
  - New shared copy on `/review`: `relayrHeldMessage`, `relayrDiscardLine`, `writeHeldMessage`, `writeExitMessage`, `WRITE_EXIT_LABEL`, `SAFE_PROPOSAL_REPLACED_LINE`, `SAFE_PROPOSAL_EXECUTED_LINE`, `RELAYR_PAYMENT_RELEASED_LINE`.
  - `transactionMessage` writes "Relayr's" as "the" and a bare "Relayr" as "the network", instead of "the execution service". `SafeRelayrRecoveryError`'s default message no longer names Relayr.

## 2.29.0

### Minor Changes

- 54a588b: Add explicit native Defifa NFT payment, cash-out and transfer preparation,
  bounded holdings discovery, and canonical transaction/NFT receipt verification.
  Native payment metadata preserves address-based voting delegation and exact tier
  costs; review decoding distinguishes it from ordinary shop boolean metadata.
  Generic shop capability guards remain unchanged.

  Recover native receipt context from saved calls and historical project identity,
  distinguish finalized failures from incomplete proof, and isolate durable
  reviewed-write recovery by a stable project/action namespace.

## 2.28.0

### Minor Changes

- b61adbc: Add `getProjectNftInventory` for shared, read-only discovery of Defifa and JB721 NFT tiers. Defifa results expose native tier names, current supply, exact pricing and phase context, including countdown and pay-disabled games, and explicitly disable generic JB721 transaction capabilities. Reads verify supported native deployments and project bindings at one block, propagate RPC errors, and provide bounded sorted-tier pagination. Legacy shop discovery and calldata behavior remain unchanged.

## 2.27.0

### Minor Changes

- 6a2c3da: Add shared destination sucker mint readiness and durable reviewed-write recovery so clients refuse currently unmintable bridge routes and retain uncertain wallet submissions across retries. Preserve Safe proposal uncertainty until authenticated execution or expiry evidence is available, bind deadline expiry to canonical contracts, and refuse collector qualification for native Arbitrum L1 sends whose asynchronous refunds cannot be recovered. Recognize native Arbitrum L2 routes with their canonical zero-inbox and gateway configuration.

## 2.26.0

### Minor Changes

- f46f4cc: Add destination-bound Sticky collector deployment verification, reserved split recipes, queue reads and permissionless delivery transaction builders. Validate the selected home pool and canonical direct route, and decode configured collector splits and Safe calls with explicit home-chain identity. The collector deployment table remains empty until live deployments are verified.

## 2.25.0

### Minor Changes

- cabf58e: Share Safe app proposal confirmation, exact reviewed-call binding, pending-call deduplication and recovery readers across web clients. Export destination records before Relayr execution hashes arrive and a presentation-only transaction message formatter.

  Add paced JB Center admission to the existing limiter so requests on independent chains start without waiting for earlier responses, and rate-limit waits do not consume their network timeout. Existing finite-slot limiter behavior remains unchanged.

  Authenticate a prepared intent's canonical envelope hash before requesting its signature and preserve that same envelope through publication. Add a final synchronous app-specific guard after all awaited write preparation, retaining recovery locks for ambiguous wallet submissions.

  Add a typed pre-wallet Relayr refusal so a final synchronous guard can restore an unchanged payment attempt after durable preparation. Normalize incorrectly branded results from an invoked wallet so they remain ambiguous, including nested rejection causes. Actual wallet rejections and reported payments retain their existing recovery rules.

## 2.24.5

### Patch Changes

- c507c53: Verify wallet-wrapped native bundle payments using their exact canonical payment event and authenticated historical contract runtime, while retaining strict direct-payment and retry checks. Expose the shared payment event predicate, report final payment checking, and recover submitted Safe bundles through fresh funding or destination receipt proofs after a wallet adapter error.

## 2.24.4

### Patch Changes

- a48beb0: Export the existing project activity display grouping rule as `mergeCrossChainActivityGroups`. Matching signatures on distinct chains within six hours share one representative while retaining every original transaction link and input order. Display signatures remain caller-owned; grouping is not proof that transactions belong to one bundle.

## 2.24.3

### Patch Changes

- ea7b048: Show Relayr rejection variants, chains and reasons before transaction calldata,
  while retaining bounded original responses in private error causes. Expose Safe
  bundle progress per chain and keep checking paid transactions while their
  canonical receipts are temporarily unavailable. Preserve exact destination,
  Safe execution and payment proofs before reporting confirmation or offering a
  retry.

## 2.24.2

### Patch Changes

- 348343a: Allow a fresh Safe execution quote after unused or lost quote attempts. Review
  and validate the current selection before retiring prior quote-only records under
  the shared lock. Preserve actual or ambiguous funding, observed remote execution,
  and all funding evidence; keep existing canonical payment retry rules. Support
  single-session storage scopes without duplicating lifecycle policy in clients.

## 2.24.1

### Patch Changes

- b88857b: Report canonical Safe nonce evidence when a saved Relayr selection lacks its quote.
  Check all exact saved identities concurrently at finalized blocks. Release only
  unfunded selections whose nonces are all consumed, while preserving incomplete
  identities and uncertain funding for explicit recovery. Distinguish obsolete
  Safe selections from expired unpaid quotes and successful executions.

## 2.24.0

### Minor Changes

- 01bbb7f: Add the framework-independent Safe Relayr lifecycle at `review/safe-relayr`.
  Both web clients can share durable publication, exact saved-quote reuse,
  nonce reservations, payment retry and recovery, canonical expiry, and Safe
  execution receipt verification while retaining their storage and wallet adapters.

## 2.23.0

### Minor Changes

- 23b33ed: Juicebox Money, revnet.money and Homerun each decide when a Relayr quote whose
  payment reverted is funded by another payment, payable again or released, and
  what a failed payment attempt leaves (ruling R104). Those rules move into
  `@bananapus/nana-sdk-core/review/relayr`, so the three apps take one copy.
  Behavior is Juicebox Money's at 27c40e98, with the differences listed at the
  end.

  `@bananapus/nana-sdk-core/review/relayr`:
  - `revertedRelayrQuote(clientFor, quote, { fetch, nowMs })` reads the bundle
    once, never from a cache, and resolves `funded` (Relayr reports a payment or
    a call running or run), `payable` (the latest payment's quote is still open)
    or `released`. `quote` is the saved `bundleUuid`, `payments`, `options`,
    `destinationChainIds` and `account`. A release needs every payment sent
    proven canonically reverted, every deadline of those payments and of the
    quote's options passed at a canonical finalized block, and
    `requireRelayrBundleUnpaid` on one more read. The clock, by default, is
    read after the bundle. Anything else throws, and the quote holds.
  - `relayrRetryOption(payments, options)`: the option a quote paid before is
    paid again with, exactly the one its latest payment used. An option on that
    chain with that calldata whose amount can't be read, coming first, ends the
    search refused.
  - `relayrPaymentAttemptOutcome(error, { sending, paid })`: `reverted`,
    `unpaid`, or null to keep the journal as it is.
  - `requireRelayrRetry(clientFor, { payments, from, bundleUuid }, options)`
    groups the payments sent for a quote by the option each used (its chain,
    calldata in any case, and amount) and runs `requireRelayrPaymentRetry`, with
    the same `fetch` and `nowSeconds` options, for each group on its chain.
    Before reading anything it refuses, as `invalid`, payments that are not a
    list, an empty list, and any list `relayrSentPaymentsSnapshot` refuses: more
    than 16 payments, or a payment that is not an object or has a missing or
    malformed field, such as `[null]`, `[{}]` or `[{ bundleUuid }]`. It refuses
    a payment of another bundle, and a chain without a client as `unknown`.
  - `proveSavedRelayrPayment(clientFor, payments, account, onReverted)` proves a
    resumed session's latest payment: true once it succeeded, false while that
    can't be proven, and on a canonical revert it runs `onReverted` and throws,
    as it throws any other `RelayrProofError`.
  - `relayrPaidQuoteOpen(payments, nowMs)` and `relayrQuotedOptions`.
  - `sentRelayrPayment`, `relayrSentPaymentsSnapshot`, `MAX_RELAYR_SENT_PAYMENTS`
    (16) and `RELAYR_UUID_RE`, with the types `RelayrSentPayment` and
    `RelayrReleaseClient`. A saved payment's deadline must be the one its
    calldata pays until.

  Juicebox Money's `relayrQuoteReleased` is not ported: it reads the device
  clock, and only an account view's line still calls it.

  Where it differs from Juicebox Money's copies (each difference holds the quote
  rather than releasing it or paying again):
  - Amounts and deadlines are read as the SDK reads any untrusted number, so a
    padded or signed string such as `" 5"` is not a number. Juicebox Money's
    `BigInt` read it. Such an option is not the one to pay again, such a quote
    is not open, and such a deadline has not passed.
  - Payments or options that are not lists are refused, and the quote holds.
    Juicebox Money threw a `TypeError` there.
  - A bundle ID that is not a Relayr ID is never read, so its quote is neither
    funded nor released. Juicebox Money sent it to Relayr and compared the echo.
  - `requireRelayrRetry` refuses, as `invalid`, payments that are not a list, an
    empty list and any list `relayrSentPaymentsSnapshot` refuses. Juicebox
    Money's resolved for an empty list (its only caller never passed one), threw
    a `TypeError` for a non-list or a payment like `[null]` or
    `[{ bundleUuid }]`, and threw its "another bundle" error for `[{}]`. A chain
    without a client is refused as `unknown`, where Juicebox Money's client
    lookup threw its own error.
  - `proveSavedRelayrPayment` reads payments that are not a list as none and
    resolves false, where Juicebox Money threw a `TypeError`.
  - `relayrRetryOption` refuses when an option on the latest payment's chain,
    with its calldata, comes first with an amount that can't be read, such as
    `"100 "`. Juicebox Money returned that option and then refused to pay with
    it; the SDK refuses at once and never returns a later twin.
  - A time that is not a finite number closes the quote in
    `relayrPaidQuoteOpen`, and `revertedRelayrQuote` holds with its line rather
    than throwing a `RangeError`. Juicebox Money only ever read `Date.now()`.
  - A saved payment's deadline must be the deadline word of its calldata, which
    the payment's proof reads onchain: `relayrSentPaymentsSnapshot` and
    `requireRelayrRetry` refuse one that is not, and a release holds it. Juicebox
    Money released on the saved deadline alone, so a journal that saved an
    earlier deadline released before the payment's own one passed.
  - `revertedRelayrQuote` holds, neither payable nor released, while any payment
    names another bundle than the quote. Juicebox Money never compared them,
    though its retry refused such a journal.

## 2.22.0

### Minor Changes

- c39e6f0: `relayrSessionOutcome` reads a recheck that failed because the node could not
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

- bcfe437: Juicebox Money decides from the chain what a Relayr session may do once its
  bundle won't run as signed (rulings R104, R114 and R117). Those rules move into
  `@bananapus/nana-sdk-core/review/relayr`, framework-free, so revnet.money and
  Homerun take the same rules and Juicebox Money drops its copies. Behavior is
  Juicebox Money's at 02278f0, with the differences listed at the end.

  `@bananapus/nana-sdk-core/review/relayr`:
  - `relayrRequestStates(clientFor, requests)` classifies each signed forward
    request (`{ chainId, signer, deadline, nonce? }`) at a canonical finalized
    block on its chain, read once per chain and signer: dead once the forwarder's
    nonce for its signer moved past the saved one (`mayHaveRun`), or once its
    deadline is strictly earlier than the block's timestamp (`unused` while the
    nonce still equals the saved one). Anything unknown is live: an RPC error, a
    node without the finalized tag, a block no longer canonical, a missing client,
    and a request saved without its nonce until its deadline passes.
  - `relayrRequestsVerdict(states)`: any live request holds the set until the
    last live deadline; once every one is dead, whether one may have run and
    whether every nonce is unused.
  - `relayrSessionOutcome(verdict, { nonces, recheck })` says what the session
    does next: `hold`, `refresh` (sign again only at the saved nonces while a
    request is live and none moved), `re-sign` (every request dead and unused,
    recheck passed), `discard` with the reason `ran`, `changed` or `expired`,
    `reorg-hold` (a finalized nonce below a saved one, `nonces` omitted or
    empty, or no requests at all), or `unchecked` (the recheck could not reach
    the chain). `nonces` must be the saved nonces of exactly the requests that
    were classified, in order. The recheck is a `() => Promise<void>` that throws
    to refuse, and runs only once every request is dead and unused. An outcome's
    `error` is never enumerable.
  - `relayrRequestsDead(clientFor, requests)` is ruling R117's reservation: a
    session reserves its signers' forwarder nonces exactly while one of its
    requests is live. Requests that can't be classified (null) or none are never
    dead.
  - `relayrSignedRequests(entries, nonces)` reads a session's published entries
    into those requests, with the nonces when there is one per entry, or null
    when one is not an `execute` on its chain's canonical forwarder.
  - `relayrDeadlinePassed(client, deadline)` says whether a canonical finalized
    block is past a deadline, and `atCanonicalFinalizedBlock(client, read)` runs
    any read at one. `isRelayrDiscardReason` reads a stored reason back.
  - Types: `RelayrFinalizedClient`, `RelayrSignedRequest`, `RelayrRequestState`,
    `RelayrRequestsVerdict`, `RelayrSessionOutcome` and `RelayrDiscardReason`.

  Where it differs from Juicebox Money's copies:
  - A finalized block without a bigint number and timestamp and a 32-byte hash
    is unknown, so its requests stay live. Juicebox Money still read the nonce at
    a block missing its timestamp, and took two missing hashes as equal.
  - Each request's nonce is read for its own signer, the request's `from`.
    Juicebox Money read every request with the session's account, which its
    sessions always signed with.
  - Entries or nonces that are not lists read as none, where Juicebox Money threw
    or read a string's characters as nonces.
  - An empty set of requests is neither run nor unused, so it holds as
    `reorg-hold`, as Juicebox Money's callers held a session in which they found
    nothing to classify. An empty `nonces` list also gives `reorg-hold`, where
    Juicebox Money signed the calls again at the live forwarder nonce; it never
    saved an empty list.
  - Deadlines and nonces are read as the SDK reads any untrusted number: a safe
    integer, decimal or 0x-hex digits, or a bigint. Anything else (`""`, `" "`,
    `"-1"`) leaves the request live, and `relayrDeadlinePassed` false. Juicebox
    Money's `BigInt` read an empty or blank string as 0 and `"-1"` as -1, so such
    a deadline had passed and such a nonce had moved.

## 2.21.0

### Minor Changes

- 39773c9: JB Center's node-lag retry and its rate limit now live in
  `@bananapus/nana-sdk-core/jbcenter`, so Juicebox Money, revnet.money, Homerun,
  Sticky, Succulent and Telligence can drop their copies.
  - `createJBCenterRpcProvider` and `rpcProvider` ask again for a read that a
    node behind the head answered with JSON-RPC -32001, after 250, 500, 1,000,
    2,000 and 2,000 ms (`JBCENTER_BLOCK_LAG_RETRY_DELAYS_MS`).
    `blockLagRetryDelaysMs` sets other waits, and `[]` turns the retry off.
    Nothing else is retried, and `rpc` stays one request. The request options
    viem passes, `signal` included, go with every try. A wait between tries
    ends at once with the signal's reason, and a request whose signal has
    aborted sends nothing. The provider used to hand back the first -32001.
  - `createJBCenterLimiter({ slots })` lines up a page's requests to JB Center.
    Center counts each origin's requests, every chain's together and refused
    ones included: 600 a minute for an allowlisted first-party origin, 120 for
    any other. At most `slots` requests are in flight, in the order they were
    made, and `slots` has no default. Slots bound concurrency, not rate: two in
    flight send up to 343 a minute at a 0.35 s round trip, over 120. After a 429
    that says how long to wait, nothing starts until that has passed, a minute
    at most (`JBCENTER_MAX_RATE_LIMIT_PAUSE_MS`). A request whose signal aborts
    while it waits leaves the line unsent, and a slot frees exactly once however
    a request ends. Give the limiter to every chain's provider (`limiter`), where
    each try takes its own slot so a node-lag wait holds none, or wrap one other
    transport to Center with `limiter.transport`. A transport that already sends
    through the limiter, one built on a provider that has it or one wrapped
    twice, fails each request at once with a TypeError and sends nothing. A
    request must not ask its own limiter for another after an await, which no
    check can see. Nothing changes for an app that passes no limiter.
  - `errorChain`, `isRateLimited`, `retryAfterOf` and the `ErrorChainLink` type
    read a refusal through the errors viem wraps around it. `retryAfterOf` gives
    the first `retryAfter` in the chain, in seconds, and otherwise reads the
    Retry-After header viem's HTTP error carries, rounded up to whole seconds.
  - `ensureDeployed` ends at once when a step report aborts its signal, where it
    waited a poll interval and asked Center again first. A wait between polls
    ends at `timeoutMs` at the latest and never asks a timer for more than it
    holds (about 24.8 days): a `pollMs` longer than `timeoutMs` ran past the
    timeout, and one past the timer's limit polled Center every millisecond.
    `pollMs` must be a positive finite number and `timeoutMs` a positive number,
    `Infinity` to poll until the run lands; anything else is refused with a
    TypeError before Center is asked. A `pollMs` of NaN polled Center every
    millisecond.

  What each app replaces when it upgrades:
  - Juicebox Money, revnet.money, Homerun, Succulent and Telligence: delete
    `retryWhileBehindHead`, `isBehindHead` and `BLOCK_LAG_RETRY_DELAYS_MS` from
    `src/lib/jbcenter-rpc.ts` with their tests, and hand the provider to `custom`
    as it is, for example
    `custom(createJBCenterRpcProvider(chainId, { baseUrl, fetch, timeoutMs }), { retryCount: 1 })`.
    A copy kept after the upgrade wraps the SDK's retry, and a node behind the
    head is asked up to 36 times over about 40 seconds. An app that must take
    this version before it can drop its copy passes `blockLagRetryDelaysMs: []`
    until it does. To keep to the rate limit as well, create a limiter as Sticky
    does below and pass it as `limiter`.
  - An app that hands the provider to viem as it is, such as eth-shop, gets the
    retry with no change.
  - Sticky: delete `retryWhileBehindHead` from `src/lib/jbcenter-rpc.ts`, and
    `src/lib/center-limit.ts` with its test. `src/lib/line.ts` stays, since
    `in-turn.ts` uses it. Create the limiter once at module level,
    `const centerLimiter = createJBCenterLimiter({ slots: 2 })`. In the browser,
    build each chain's transport as
    `custom(center.rpcProvider(chainId, { limiter: centerLimiter }), { retryCount: 1 })`,
    and wrap the fixture transport with `centerLimiter.transport(http(...))`.
    `hook-logs.ts` imports `isRateLimited`, `retryAfterOf`, `errorChain` (its
    `failures`) and `ErrorChainLink` (its `Failure`) from the SDK. One reading
    widens: where no link of a refusal carries `retryAfter`, the SDK's
    `retryAfterOf` reads the Retry-After header on viem's HTTP error, which
    Sticky's copy left unread.

- ff9b8b0: `requestPersistedBendystraw` on `@bananapus/nana-sdk-core/bendystraw-operations`
  takes a `signal`. When the signal aborts, the request under way fails with the
  signal's reason and is not retried, and a signal that has already aborted sends
  nothing. A page that was left could not end a read it had started: it ran until
  it answered or timed out.
  - Sticky's `web/src/lib/bendystraw-browser.ts` exists only to pass a signal to
    this request. It can be deleted, and Sticky can call the SDK's function.
  - Juicebox Money's and Homerun's `bendystraw()` can take a `signal` option and
    pass it on, to this function in the browser and to `requestBendystraw` on the
    server.

  `resolvePersistedBendystrawRequest` is unchanged. Each of its refusals is now
  pinned by its own test here, so an app's tests of its relay need no copy of that
  table.

### Patch Changes

- 7776a1a: `waitForSafeExecutionHash` counts only a real "no such transaction" answer
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

  The `signal` now also ends the wait while a chain look is in flight, on any
  chain. It waited for that look to settle, which over a transport with no
  timeout is never. The look's late answer is ignored.

  On a chain with a Safe service, a failed chain check still leaves the decision to
  the service. A `client` whose `getTransaction` reports a missing transaction
  another way, such as a test double that throws a plain
  `Error("Transaction not found")`, no longer ends the wait. Make it throw viem's
  `TransactionNotFoundError`.

## 2.20.0

### Minor Changes

- 3818bbb: Juicebox Money, revnet.money, Homerun and Sticky each wrapped a few SDK checks
  where the SDK was looser or lacked an option. The SDK now applies those rules
  itself, so the apps can drop their wrappers.

  `@bananapus/nana-sdk-core/safe`:
  - `multiSendCallsOf` reads a batch sent through MultiSendCallOnly 1.4.1, which
    Safe{Wallet} uses for a 1.4.1 Safe, and through 1.3.0's EIP-155 deployment, as
    well as through 1.3.0's canonical one. `MULTI_SEND_CALL_ONLY_DEPLOYMENTS` lists
    the three addresses, from Safe's deployment records. Decoding is unchanged:
    canonical calldata of whole CALL entries only. Batches are still built for
    `MULTI_SEND_CALL_ONLY` (1.3.0).

  `@bananapus/nana-sdk-core/safe-service`:
  - `SafeServiceOptions` takes a `signal`. It goes with every service request and
    ends any wait between attempts; the call then fails with the signal's reason,
    except that `fetchSafesOwnedBy` and `fetchSafeCreation` read it as nothing
    found, as they read any failed request.
  - A 429 is waited out and retried only when its Retry-After asks for 10 seconds
    or less (`SAFE_SERVICE_MAX_RETRY_WAIT_MS`): delay-seconds of 0 or more, or an
    HTTP-date in any of RFC 9110's three forms, read as the time left until it (a
    two-digit RFC 850 year more than 50 years ahead is the last such year past, as
    RFC 9110 reads it). Without a Retry-After it waits 1, 2 and 3 seconds. A 429
    that asks for longer, or whose Retry-After cannot be read (words, a negative or
    fractional delay, an out-of-range date), is handed back at once, since
    retrying before the service allows works against its rate limit. It used to
    wait the whole Retry-After, and read an HTTP-date or garbage as no
    Retry-After.
  - `retryRateLimited: false` hands back the first 429 instead of retrying it, for
    a server render that must not wait. Juicebox Money and revnet.money turn a 429
    into a 503 in their own `fetch` for this today.
  - `listPendingSafeTransactions` no longer lists a page again after it answered
    429, since that request has had its retries.
  - `waitForSafeExecutionHash` polls as the other service calls do: each poll
    sends the local API key and the caller's `signal`, which now also ends a poll
    in flight, and after a 429 the next poll waits the longer of the polling
    interval and the wait its Retry-After asks for, up to the longest a timer
    holds (about 24.8 days; a longer timer fires at once). It used to poll every
    interval whatever a 429 said.

  `@bananapus/nana-sdk-core/jbcenter`:
  - A JB Center RPC provider (`createJBCenterRpcProvider`, `rpcProvider`) passes
    on the `signal` viem's custom transport hands it, so a request in flight ends
    when its page is left instead of holding its slot until it times out.
  - `JBCenterRequestError.retryAfter` reads the Retry-After header as the Safe
    service does, in whole seconds: delay-seconds, or the time left until an
    HTTP-date. A value it cannot read is undefined. It read an empty value as 0,
    "1e3" as 1000 and "1.5" as 1.5, and an HTTP-date as undefined.

  `@bananapus/nana-sdk-core/review`:
  - `submitReviewedContractWrite` refuses before the review opens when the
    connected account is not `expectedAccount`, as well as after the chain switch
    and before signing. Its default refusal is the apps' wording, "The connected
    account changed. Review again.", in place of "Connected account changed.
    Review the transaction again." Juicebox Money and Sticky can drop the `guard`
    that refused first.

  `@bananapus/nana-sdk-core/review/relayr`:
  - `relayrPaymentDetails` refuses a payment contract or token written in mixed
    case with a wrong EIP-55 checksum, or in upper case, as viem's strict address
    check does. Lower case and checksummed spellings pass.
  - `relayrPaymentOptions` offers no option for a chain when any of that chain's
    options has a contract or token that fails the strict address check, whether
    it comes before or after a valid one. A well-formed address that is not
    Relayr's is still refused on its own.
  - `quoteExpired(deadline, nowSeconds?)` is exported: a quote is dead once its
    deadline is 15 seconds away or less.
  - `requireRelayrPaymentRetry` throws a `RelayrPaymentRetryError` whose `reason`
    says why: `invalid`, `expired`, `paid`, `running` or `unknown`. The messages
    are unchanged. A hash that is another transaction still throws
    `RelayrProofError`. A malformed request is refused before anything is read.
  - `readRelayrBundle(bundleUuid, { fetch })` reads a bundle without any HTTP cache
    and refuses an answer naming another bundle.
  - `requireRelayrBundleUnpaid(bundleUuid, { fetch })` reads the bundle that way
    and throws a `RelayrPaymentRetryError` (`paid`, `running`, `unknown`, or
    `invalid` for a malformed bundle ID) unless Relayr reports it unpaid with
    every call pending. One call reads and checks, so an app confirms a bundle with
    it before releasing its quote. `requireRelayrPaymentRetry` ends with it.

- 9aad34d: `verifyReservedDistributionReceipt` accepts a distribution of at least the
  reviewed token count. Reserved tokens keep accruing until the distribution
  runs, so a Safe that executes days after the review distributes more than was
  reviewed. That receipt verifies: each split's share, the owner's leftover and
  the burns sent to `0x…dEaD` are checked against the count the receipt
  distributed. A receipt that distributed fewer tokens than were reviewed is
  refused, because another distribution ran first or the review was stale.

  It returns `{ tokenCount }`, the count the receipt distributed, so an app can
  show the amount that went out. `ExpectedReservedReceipt.tokenCount` keeps its
  shape and is the reviewed minimum: pass the pending reserves the review saw. A
  `tokenCount` of 0 is refused as an invalid expectation, since the controller
  cannot distribute 0 and a minimum of 0 would accept any count.
  `verifyPayoutReceipt` is unchanged.

## 2.19.0

### Minor Changes

- 8699565: Add read-only, block-pinned, JSON-safe deployment diagnostics for canonical Revnets, omnichain/direct 721 hooks, and ordinary Juicebox projects. Checks distinguish confirmed binding mismatches from unavailable reads and unsupported custom contracts, report pricing without treating unconventional precision as invalid, and optionally inspect operator powers. Add shared wording for independent indexer evidence and runnable read-only inspection/preparation examples.

  Add shared `resolve721PricingContext`, `buildRevnet721Config`, optional Revnet `default721Config`, and deployment overload selection. Omitted shop configuration retains the existing contract-default behavior; no new acknowledgement is required. Explicit pricing and permission choices are preserved. Validate unsupported precision and conflicting configuration, and reject allowed posts when no explicit shop config can encode them. Omnichain ruleset queue semantics remain unchanged.

## 2.18.0

### Minor Changes

- 5596359: Juicebox Money, Homerun and revnet.money each kept their own checks around a
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

## 2.17.0

### Minor Changes

- f44b312: Juicebox Money, Homerun and revnet.money each kept their own copy of the Relayr
  checks that run around a relayed bundle. One copy now ships on a new entry
  point, `@bananapus/nana-sdk-core/review/relayr`, with the stricter check where
  the copies differed. Nothing in it signs or sends:
  - Constants: `RELAYR_API`, `RELAYR_PAYMENT_ADDRESS`, `RELAYR_PAYMENT_SELECTOR`,
    `RELAYR_PAYMENT_CODE_HASH`, `RELAYR_NATIVE_TOKEN`, `RELAYR_PAYMENT_GAS`,
    `RELAYR_FORWARDER_DEADLINE_SECONDS`, `TRUSTED_FORWARDER_ABI` and
    `FORWARD_REQUEST_TYPES`.
  - Network families: `relayrSupportsChain`, `relayrSupportsChains` and
    `relayrPaymentChains`. A bundle is funded only within its destinations'
    family, mainnets or testnets.
  - Quotes: `relayrBundleRequest` builds the posted body, with virtual nonces
    counted per chain (`ChainIndependent`). `bindRelayrQuote` authenticates
    Relayr's response. It accepts `tx_uuids` or the legacy `txn_uuids`, refuses
    both when they differ, and binds each posted transaction to the one quoted ID
    whose record carries its exact request: chain, target, calldata, value and
    virtual nonce. Relayr lists IDs out of request order, so an ID is never bound
    by its position. The bundle is read when the quote leaves its records out,
    and its records must be exactly the quoted IDs, one each.
  - Payments: `relayrPaymentDetails` takes the destinations and refuses a payment
    chain outside their family, a contract or token other than Relayr's, and
    calldata other than a payment for this bundle with the quoted deadline. A
    quoted deadline is integer seconds or an RFC 3339 time with an offset, never
    a time read in the local timezone. Also `relayrPaymentOptions`,
    `requireRelayrPaymentRuntime` (the payment contract's code hash) and
    `simulateRelayrPayment` (a raw, gas-bounded `eth_call`).
  - Status: `relayrStateIsSuccess`, `relayrStateIsFailed`, `relayrProgress`,
    `relayrDestinationHash` and `relayrRecordChain`. Only `failed` is a failure;
    receipts are the proof.
  - Proofs: `verifyRelayrPayment`, `verifyRelayrDestination`,
    `verifyRelayrDestinations` and `relayrForwardRequest`, with any viem
    `PublicClient` (`RelayrProofClient`). A payment or destination is proven
    from the chain: the transaction at its hash is exactly the expected one (its
    sender for a payment, target, calldata, value and chain), its receipt is in
    the canonical block, and it succeeded. A saved payment may carry its amount
    as the decimal string JSON restores. `RelayrProofError` reports a
    transaction that is not the expected one: never pay again. Its subclasses
    report a canonical revert: `RelayrDestinationRevertedError` for a
    destination, and `RelayrPaymentRevertedError` for a payment, which shows
    only that this one transaction paid nothing. Any other error means the proof
    is not available yet. RPC failures are reported with a fixed message; the
    RPC error stays in a non-enumerable `cause`, so neither the message nor a
    serialized error carries the RPC URL.
  - Retrying a payment: `requireRelayrPaymentRetry` takes every payment hash the
    session sent for the quote. It clears the quote to be paid once more only when
    all of the following hold; an empty list never clears it:
    - every one of those payments canonically reverted;
    - the quote's deadline is more than 15 seconds away;
    - Relayr's bundle, read without any HTTP cache, reports
      `payment_received: false`;
    - every record of the bundle is still pending, with no destination hash.

    The payment contract keeps no state and Relayr keeps every payment it
    receives, so a revert alone never shows that the bundle is unpaid. Every
    Relayr bundle read in the module skips the HTTP cache.

## 2.16.0

### Minor Changes

- 059ee37: Juicebox Money, Homerun and revnet.money each kept a copy of the review
  dialog's decoders, the receipt fallback, the raw transaction preflight and the
  fee return helpers. One copy of each now ships here, with revnet.money's
  stricter checks where the copies differed:
  - `@bananapus/nana-sdk-core/review/decode`, a new entry point for the lazily
    loaded review dialog: `describeV4UnlockData`,
    `describeUniversalRouterExecute`, `describeJBHookMetadata`,
    `describeSuckerClaim`, `describeSafeInnerCall`, `describeSafeInitializer`,
    `describePermissionsData`, `describeSplitGroups`, `functionFromCall`,
    `readableValue`, `namedValue`, `nativeValue`, `knownAddressName` and
    `reviewDescription`. The decoded view never differs from the signed bytes:
    - `functionFromCall` matches the ABI item whose selector the calldata
      carries, and only when the call's `args` encode to exactly that calldata.
      A raw review whose `args` and `data` disagree shows the raw call.
    - `knownAddressName` names retired generations from
      `jbContractAddressHistory`: "JBRouterTerminal (previous)",
      "JBBuybackHook (current)".
    - `describeSafeInnerCall(chainId, to, data)` reads a queued Safe call with
      its target's ABI, the buyback hook, buyback registry, router registry and
      router gateway included, so a selector several contracts share (`pay`,
      `approve`) is never credited to the wrong one. USDC reads as ERC-20. An
      unknown target reads as ERC-20 and is titled as unrecognized, except
      `approve` and `transferFrom`, which ERC-721 shares: those show raw.
    - The Uniswap V4 and Universal Router decoders require each parameter's
      canonical encoding and empty hook data. A V4 settle shows who pays it.
      Each amount reads the way its command does: 0 is the open delta only in
      V4 swaps, takes and settles, and the contract-balance sentinel only in
      settles, wraps and V3 swaps. An unwrap minimum of 0 reads as no minimum.
    - Times show in UTC with their raw seconds, the same in every locale. A
      Permit2 expiration of 0 reads as this block only, and a value past the
      last calendar date as its raw number.
    - Address zero reads as native ETH only where it is a currency.
    - A Safe setup labels a `setupToL2` delegatecall only when it targets the
      canonical SafeToL2Setup; any other target keeps the delegatecall warning.
    - Hook metadata with a repeated lookup id shows raw, since the hook reads
      only the first entry for an id.
    - `reviewDescription` falls back to the standing guidance when a caller's
      description is blank.
  - `@bananapus/nana-sdk-core/review`: `waitForTrackedReceipt` and
    `TransactionReceiptUnavailableError`, whose `cause` is not enumerable, so
    serializing it leaves out the RPC error; `simulateStateChangingTransaction`,
    a raw `eth_call` that never follows CCIP-read, with gas and return data
    bounds and an optional block; `simulateCallSequence`, an ordered
    `eth_simulateV1` that falls back to one call at a time only when the node
    reports the method missing (-32601, -32004, or its own error text saying
    so); a revert, a lagging node or bad parameters stop the simulation; and
    `isDefiniteWalletRejection`. `submitReviewedContractWrite` uses it too, so a
    raw EIP-1193 rejection (code 4001) from the wallet now clears the caller's
    persisted intent.
  - `@bananapus/nana-sdk-core/v6/fee-buyback`: `isFeePayingCall`,
    `combineFeeResults`, `feeReviewConfirmLabel` and `feeBuybackOptions`, which
    trusts every buyback hook generation in the SDK's address tables.

## 2.15.0

### Minor Changes

- 1c81bb7: Safe tracking works for Safe{Wallet} connected over WalletConnect:
  - `waitForSafeExecutionHash` takes an optional `client` for the chain. A hash
    the chain already knows is returned as the execution, because Safe{Wallet}
    answers over WalletConnect with the execution's own hash when the owner
    executes at once. On a chain without a hosted transaction service, the
    client keeps checking until it gives up.
  - `isSafeWalletPeer(url)` says whether a WalletConnect peer is Safe{Wallet}.
    Apps use it to treat that connection as a Safe: the gas a dapp sends becomes
    the proposal's `safeTxGas`, and the reply is usually a Safe transaction hash.

## 2.14.0

### Minor Changes

- 47e45ab: Juicebox Money, revnet.money and Homerun now share one review model through
  `@bananapus/nana-sdk-core/review`:
  - A reviewed call can carry the `gas` its wallet or forwarder signs and a Safe
    proposal's `safeTxGas`. Both appear in `transactionReviewJson`, and
    `requestContractTransactionReview` refuses to continue when either changes
    after approval.
  - `requireFundingChainSelection(options, preferredChainId)` preselects the
    connected chain when it is quoted, or a lone quote, and hands the handler that
    choice. `fundingChainLabel(chainName, amountWei)` words each option, for
    example "Base (~0.000123 ETH)".
  - `TransactionReviewCancelledError` is exported. Closing a review or the fee
    picker raises it, so apps can say nothing was sent instead of showing an
    error.
  - The audit prompt also checks `gas` and `safeTxGas`, and separates what a
    Relayr or Safe authorization signs now from its later execution.

## 2.13.0

### Minor Changes

- 4dfa326: Juicebox Money and Homerun kept identical copies of their transaction review,
  Safe tracking, Bendystraw query and fee buyback code, and revnet.money kept a
  third copy of the Bendystraw and fee buyback parts. One copy of each now ships
  here:
  - `@bananapus/nana-sdk-core/review`: the transaction review queue
    (`requireContractTransactionReview` and its handlers),
    `submitReviewedContractWrite`, and `gasWithHeadroom` / `gasWithinCap`. The
    review prompts take the app's own chain names and explorer links.
  - `@bananapus/nana-sdk-core/safe-service`: `SAFE_PREFIX`, `SAFE_SERVICE_PREFIX`,
    `safeServiceBase`, `safeQueueUrl`, `swapDeadline`, `SAFE_NONCE_GUIDANCE` and
    `waitForSafeExecutionHash`, which turns a Safe proposal into its mined
    transaction hash.
  - `@bananapus/nana-sdk-core/bendystraw-operations`: `compileBendystrawOperation`
    (operation name, bounded variables and response-shape checks from one
    document), `bendystrawOperationId`, `resolvePersistedBendystrawRequest` for a
    same-origin proxy, and `requestPersistedBendystraw`. This entry point needs
    `graphql` 16, now an optional peer dependency.
  - `resolveProjectDeployments` from the root entry point: the verified
    per-chain project IDs of a sucker group.
  - `@bananapus/nana-sdk-core/v6/fee-buyback`: `checkFeeBuyback`,
    `analyzeFeeSimulation` and `createFeeWatch`, which say whether a fee will buy
    back from the pool or mint at the issuance rate.

## 2.12.2

### Patch Changes

- 8b96068: `StickyRewardReceiverFactory` points at its replacement,
  `0x41AEC7AacEa4759F2c8AaBD68D4a4C1574A6A737` on all eight supported chains,
  pinned to `mejango/sticky` commit `b3835db805786e680f5cc27e700d7be660fdba1f`.
  The old factory was `0xF65743b76C062762D19eecb4Ab5C7a943e128720`.
  `StickyDeployer`, `StickyHook`, `StickyDistributor` and `StickyAutoStick` keep
  their addresses and ABIs.

  The new factory clones reward receivers from one implementation.
  `stickyRewardReceiverFactoryAbi` changes to match: the constructor takes
  `receiver` instead of `distributor`, and the ABI adds the `RECEIVER()` view and
  the `StickyRewardReceiverFactory_InvalidStickyToken`, `FailedDeployment` and
  `InsufficientBalance` errors.

## 2.12.1

### Patch Changes

- cc23a93: The Sticky contracts point at their ERC-2771 redeployment, pinned to
  `mejango/sticky` commit `bb5780307cce47c841d162da0577e93f31fbdb1e`, at one
  address on all eight supported chains:
  - `StickyDeployer` `0xdA38Ec48B5b1d186B02BA99F297e95153BEE33a9`
  - `StickyHook` `0xa8DcD735031cf96C4213D9A3f66a1DFFDCdba693`
  - `StickyDistributor` `0xc62b3fED668Cd8a3879ba34890a67C48a52b1Bb8`
  - `StickyRewardReceiverFactory` `0xF65743b76C062762D19eecb4Ab5C7a943e128720`
  - `StickyAutoStick` `0x9B091e21d25c424De67751F4b6Ae8494351218C5`

  `stickyDeployerAbi`, `stickyHookAbi`, `stickyDistributorAbi` and
  `stickyAutoStickAbi` add `trustedForwarder()` and
  `isTrustedForwarder(address)`, and `StickyHook`'s constructor takes a
  `trustedForwarder`. `stickyDistributorAddress` and `isStickySplit` resolve the
  new distributor.

## 2.12.0

### Minor Changes

- 8e50cb0: `@bananapus/nana-sdk-core/v6` reads and writes Sticky splits. A split pays
  Sticky holders when its `hook` is the chain's `StickyDistributor`, its
  `beneficiary` is the Sticky token, and its `projectId` is the reward group.
  - `stickyDistributorAddress(chainId)` and `isStickySplit(split, chainId)`
  - `stickyGroupId({ minWeeks, maxWeeks })` encodes a tenure group as
    `minWeeks * 1000 + maxWeeks`; `maxWeeks` 0 means no upper bound
  - `decodeStickyGroupId(groupId)` returns `{ kind: "default" }` or
    `{ kind: "tenure", minWeeks, maxWeeks }`; an invalid ID decodes as the
    default group, which is what the distributor funds
  - `validateStickyGroupId(groupId)` returns a reason or null, matching
    `StickyDistributor.isValidGroupId`
  - `describeStickySplit(split)` gives short text for confirm dialogs and
    activity rows, like "Sticky holders stuck 4 to 52 weeks"
  - `STICKY_DEFAULT_GROUP_ID`, `STICKY_CRITERIA_BASE`, `STICKY_MAX_CRITERIA_WEEKS`

## 2.11.0

### Minor Changes

- 5201c38: `jbContractAddress[6]` names the Sticky contracts on all eight supported
  chains: `StickyDeployer`, `StickyHook`, `StickyDistributor`,
  `StickyRewardReceiverFactory` and `StickyAutoStick`, each at one address on
  every chain, with their ABIs exported as `stickyDeployerAbi`, `stickyHookAbi`,
  `stickyDistributorAbi`, `stickyRewardReceiverFactoryAbi` and
  `stickyAutoStickAbi`, and the names as the `StickyContracts` enum. They are
  generated from `mejango/sticky`'s executed deployments, pinned by commit beside
  deploy-all-v6.

  `decodeDeploymentCall` no longer reads `HomerunDeployer.launchFundFor`: the
  `"homerun-fund"` flavor is gone from `JBCenterDecodedLaunch`, and a FUND launch
  now decodes as `"unknown"`. Homerun decodes its own launches in its own app.

## 2.10.0

### Minor Changes

- 8856b17: `@bananapus/nana-sdk-core/jbcenter` deploys an intent one chosen chain at a
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

## 2.9.0

### Minor Changes

- 189d418: `@bananapus/nana-sdk-core/jbcenter` reads intents whose chains set up their
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

## 2.8.0

### Minor Changes

- 87d75d2: `@bananapus/nana-sdk-core/jbcenter` now carries the parts every intent client
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

## 2.7.0

### Minor Changes

- 678c1ae: `@bananapus/nana-sdk-core/jbcenter` now carries the whole project-intent
  surface: `decodeDeploymentCall` reads a frozen `{ chainId, to, data }` call
  back as a v6 project, 721, omnichain, or revnet launch; `mergeSearch`,
  `intentRow`, `intentPath`, `deployedChains`, and `isFullyDeployed` merge
  undeployed intents into a list of deployed projects and route them; and
  `ensureDeployed` is the pre-step a client runs before an intent's first
  on-chain write, picking exactly one sender per intent — JB Center's sponsor,
  polled to completion, or the caller's own `selfPaid` launch pipeline recorded
  back to Center — and never mixing the two.

## 2.6.0

### Minor Changes

- 8753bc5: Add the framework-independent `/safe` entry point for ordinary Safe 1.4.1
  multisigs. Resolve existing addresses or prepare deterministic Safe deployments,
  verify canonical deployments and their owner policies, and compose deployment
  calls with compatible project launches without signing or submitting transactions.

## 2.5.1

### Patch Changes

- 9866b3d: Allow the read-only `eth_simulateV1` method through the JB Center client and EIP-1193 provider so applications can inspect full-transaction simulation logs, including buyback fee fallbacks.

## 2.5.0

### Minor Changes

- 04fef83: Export the deployed router gateway and ratio-feed ABIs, per-chain rollout addresses, historical hook/router generations, and effective project router resolution. Encode the buyback hook's three-word pay quote and preserve cash-out routing for projects still using the previous hook. Include the executed production rollout from deployment records while preserving historical project routes and chain-specific absences.

## 2.4.1

### Patch Changes

- a6e20d1: `projectIdFromLaunchLogs` / `decodeLaunchProjectId` now recognise projects launched through a deployer. `JBOmnichainDeployer` creates the project via `JBProjects.createFor` and then calls `launchRulesetsFor`, so the controller emits `LaunchRulesets` rather than `LaunchProject`; both are decoded from the canonical controller, and `JBProjects.Create` from the canonical `JBProjects` is accepted as well since every launch path emits it. Previously an omnichain launch receipt decoded to `null`.

## 2.4.0

### Minor Changes

- faef1eb: `getProject721Shop` now returns the current ruleset it already read for non-revnet projects (`ruleset`, `null` for revnets) so callers stop repeating `getCurrentRuleset`, and takes `includeResolvedUri` (default `false`). Resolver URIs were always requested before, which makes `tiersOf` fail through RPC gateways on large shops; pass `includeResolvedUri: true` to restore the old behavior.

## 2.3.2

### Patch Changes

- f7e7182: Bind Juicebox Center's default fetch implementation so browser requests work.

## 2.3.1

### Patch Changes

- 5d6dac6: Use JB Center's single unversioned intent envelope format.

## 2.3.0

### Minor Changes

- 2dee99f: Support JB Center signed deployment calls, add a typed viem request helper, and remove the obsolete API-key option.

## 2.2.0

### Minor Changes

- 971785b: Add a typed Juicebox Center read-only RPC client and EIP-1193-compatible provider.

## 2.1.0

### Minor Changes

- 59dce8e: Add a typed, framework-independent JB Center client for project intents, search,
  deployment reconciliation, and redundant IPFS pinning.

## 2.0.0

### Major Changes

- 6c69949: Correct fee, permission, sucker, metadata, and price-feed behavior found by the 2026-08-07 webclient/SDK re-audit.

  **Breaking**
  - `getCashOutQuote().reclaimAmountAfterFee` is now `bigint | undefined`. The 2.5% protocol fee was applied unconditionally; the contract charges it on every non-zero-tax cash out and, when the tax is zero, only on `min(reclaim, feeFreeSurplusOf)`. Quotes now route through `cashOutProtocolFee` and return `undefined` while the inputs that decide the fee are unresolved instead of fabricating a number.
  - `REVLOANS_PERMISSION_ID` was `1` — `ROOT`. REVLoans only needs `BURN_TOKENS` (`11`). Use `REVLOANS_BURN_PERMISSION_ID`; the old name is a deprecated alias of the new value. Anything that granted the old constant handed REVLoans full operator power and should be revoked.
  - `createHookMetadata` was not byte-compatible with `JBMetadataResolver`: it threw `RangeError` on any 2+ entry composition and emitted 127 bytes where Solidity emits 96 for a one-word payload. Rewritten and pinned against bytes taken from the library itself. No in-repo caller was affected (all use payloads of two words or more).
  - `SplitGroup.ETHPayout` is removed (a payout group is `uint256(uint160(token))` and cannot be enumerated) and `SplitGroup.ReservedTokens` is `1`, not `2`. The old value read and wrote the wrong group.
  - `MAX_FEE` (root export, per-billion) is renamed `MAX_FEE_PER_BILLION` to end the 1e6× collision with `v6/fees.MAX_FEE` (`1000n`, matching `JBConstants.MAX_FEE`). `PROTOCOL_FEE_PERCENT` is folded into `STANDARD_FEE`.
  - `ipfsGatewayUrl` requires a string and returns `string | null`; it used to build `ipfs.io/ipfs/undefined`.
  - `getPrevRulesetWeight` throws a typed `RangeError` at a 100% weight cut instead of dividing by zero.
  - `DEFAULT_METADATA` (odd-nibble `"0x0"`, zero references) is removed.
  - `resolveSuckers` always includes the local `(chainId, projectId)`, dedupes on the full pair, and rejects on a registry read failure instead of silently returning a truncated group.
  - `toJbUrn` takes a version and emits `v<n>:` when it is not 4; parsing rejects non-digit project ids rather than coercing `eth:0x123` to `291n`.
  - Reading `JBContractContext` outside a provider now throws instead of silently reporting `version: 5, projectId: 0n` at the zero address.
  - OP Sepolia's `etherscanHostname` is now `optimism-sepolia.blockscout.com`. Explorer hostnames are derived from each chain definition, so the hand-maintained copy (which shipped a DNS-dead `optimism.etherscan.io` for OP mainnet) is gone.

  **Fixed**
  - `getSuckerPairs` reads the peer project id from the registry-recorded remote sucker and validates pair symmetry, so pairs whose suckers sit at different addresses resolve instead of rejecting the whole batch. `peer()` is typed `bytes32`.
  - All three remote-sucker readers validate through `suckerBytes32ToAddress`; a cleared or non-EVM remote fails closed instead of truncating to a plausible wrong address.
  - `get721MetadataIdTarget` and the `STORE()` probe fall back only on a proven contract revert and rethrow transport errors. A flaky RPC used to return the clone address, which hooks silently ignore — the shopper paid and received no NFT.
  - `getProjectMetadata` keeps path-style IPFS URIs (`ipfs://<cid>/metadata.json`) instead of fetching `ipfs.io/ipfs/metadata.json`.
  - Bendystraw's internal 15s timeout aborts with a distinct reason and is retried; it used to surface as a bare `AbortError` indistinguishable from a caller cancel, turning known indexer spikes into first-attempt failures.
  - `createSalt` uses `crypto.getRandomValues`. It used `Math.random`, giving ~52 bits right-padded into the high bytes of salts that seed deterministic omnichain sucker and ERC-20 addresses.
  - `useSuckersCashOutQuote` values tokens against aggregate sucker-group surplus and supply through the cash-out tax curve. It quoted the full amount on every chain and summed the results, inflating an omnichain quote by up to N×. Failed and pending quotes surface as `undefined` rather than `0`.
  - React contexts no longer read at `zeroAddress` when the controller is unresolved (`staleTime: Infinity` cached that failure permanently), no longer publish `isLoading: false, data: undefined` while an upstream read is in flight, and no longer resolve a pending data hook to the omnichain deployer — a pay in that window reverted and minted no NFTs.
  - `getJBContractAddress` no longer throws from a render body; `useNativeTokenSurplus`/`useNativeTokenSymbol` no longer call `useJBChainId()` conditionally (a changing `chainId` crashed React); `JBPrimaryNativeTerminalProvider` no longer remounts its subtree when the terminal resolves.
  - Query keys carry `chainId`, `version`, and `userAddress` where they were missing, ending cross-chain and cross-account cache bleed; `usePublicClient({ chainId })` no longer reads the wallet's chain.
  - Bendystraw URLs are built from `JB_CHAINS`, so a new production chain is no longer routed to the testnet host, and the empty-key `//graphql` double slash is gone.
  - `"use client"` is declared at the package entry and injected into every emitted chunk. `tsup` was stripping every directive, so App Router consumers could not mark a client boundary at all.

  **Added**
  - `requiredFeedPairs` and `probeFeedReachability` (`/v6`) report whether JBPrices can serve every conversion a project's accounting contexts will need — context↔base for pays and context↔context for cash outs. A missing feed is reported only on a proven revert; RPC failures report `unavailable` rather than being mistaken for a missing feed. Clients use this to block launches whose token combination has no price path.
  - `suckerAccountingContextKey` (`/v6`) replaces three divergent client copies, one of which threw on a chain with no USDC deployment.
  - `REV_METADATA_ALLOW_SUCKER_DEPLOYMENT` is exported and set by default in `buildRevnetStageConfig`; deploying a revnet with sucker configuration but without the bit now throws. Revnets built without it can never be extended to another chain, and stages are immutable.
  - Generated ABIs for `JBUniswapV4LPSplitHook`, its deployer, and `JBP6FeeLPSplitHook`, taken from deployment artifacts so the exported shape matches deployed bytecode.
  - The 4-argument `currentReclaimableSurplusOf` overload is restored to `jbTerminalStoreAbi`; a codegen filter dropped it even though it is live on chain, which is why consumers hand-wrote the fragment.
  - A `./chains` subpath export, so consumers stop importing the `viem/chains` barrel.

## 1.11.1

### Patch Changes

- 5580e71: Add V6 721 ruleset metadata helpers which encode and decode transfer and reserve-mint pauses while preserving unrelated hook metadata bits.

## 1.11.0

### Minor Changes

- 4efed1c: Add Uniswap V4 LP fee reads and a fee-collect transaction builder.

  `readUniswapV4PositionFees` reports a position's unclaimed fees through the
  canonical StateView lens (now in `UNISWAP_V4_STATE_VIEW_ADDRESSES` and
  `uniswapV4Deployment`), and `buildCollectUniswapV4FeesTx` encodes the
  zero-liquidity decrease that sweeps them without touching the position.
  `uniswapV4FeesOwed` and `uniswapV4PositionId` expose the underlying math.

## 1.10.1

### Patch Changes

- 6498fce: Add narrow v6 payment, Permit2, loan math, cash-out, Uniswap V4, and Uniswap deployment entry points and mark the core package as side-effect free so browser bundlers can exclude unrelated SDK modules. Pure loan arithmetic no longer imports transaction-builder ABIs.

## 1.10.0

### Minor Changes

- 55ddb17: Add reusable four-mainnet cross-currency direct-pay routing, Permit2 signature and allowance helpers, and contract-exact loan opening proceeds.

## 1.9.4

### Patch Changes

- 20dddb5: Correct buyback cash-out slippage routing; add best-execution selection across direct pool sales and terminal cash-outs, locked transaction preparation, and typed diagnostics; and normalize Uniswap V4 tick and price ranges across currency orderings.

## 1.9.3

### Patch Changes

- cf64c43: Harden contract deployment lookup and Bendystraw operation handling while removing unused generated GraphQL and runtime surface.

## 1.9.2

### Patch Changes

- 132bd4b: Preserve literal chain ID types when reading supported chain metadata from `JB_CHAINS`.

## 1.9.1

### Patch Changes

- ee80eb2: Define supported chains without importing the full viem chain barrel, keeping browser builds deterministic and warning-free.

## 1.9.0

### Minor Changes

- 616afa3: Add fail-closed Bendystraw network selection, canonical endpoint helpers,
  operation-level runtime validation, and shared cache-policy constants.

## 1.8.0

### Minor Changes

- 432b5f7: Add bounded Bendystraw requests, exact versioned project-reference filters,
  and 200-reference query batching, and use the shared transport in the React
  Bendystraw hook.

## 1.7.0

### Minor Changes

- 068abea: Add a framework-agnostic Largest-Triangle-Three-Buckets time-series downsampler for complete chart histories.

## 1.6.1

### Patch Changes

- f5aa499: Fix cash-out routing selecting the wrong hook specification as the buyback route: `resolveCashOutRoute` matched "the buyback spec" as the first specification with non-empty metadata, so a spec from any other data hook (e.g. a 721 tiers hook) whose metadata happened to decode could be routed as a pool sell with a zero terminal minimum and a floor keyed to the wrong hook. The buyback spec is now matched by hook address (case-insensitive) via the new optional `buybackHookAddress` argument on `resolveCashOutRoute` and `getHookAwareCashOutQuote`. `getHookAwareCashOutQuote` resolves it automatically from `chainId` (the chain's canonical `JBBuybackHook`) — pass it explicitly only for a project whose `JBBuybackHookRegistry` entry points at a custom hook. Callers using `resolveCashOutRoute` directly must now pass `buybackHookAddress` to get the AMM route; without it every specification is treated as non-buyback and the deterministic treasury route (with its real `minTokensReclaimed` floor) is returned — fail-safe, never a zero-minimum guess.

## 1.6.0

### Minor Changes

- de6f66d: Add hook-aware cash-out quoting and slippage-protected routing: `getHookAwareCashOutQuote` / `resolveCashOutRoute` quote through `JBMultiTerminal.previewCashOutFrom` (the exact, data-hook-inclusive path) and return the `minTokensReclaimed`/`metadata` pair to submit — terminal minimum on the treasury route, buyback `cashOut` metadata floor (terminal minimum zero) on the AMM route. Also adds `slippageFloor`, exact `/40` `cashOutProtocolFee` (including the zero-tax fee-free-surplus and feeless branches), `buildBuybackCashOutMetadata`, `decodeBuybackCashOutSpec`, and `DEFAULT_CASH_OUT_SLIPPAGE_BPS` (1%). Prefer these over `getCashOutQuote` for building transactions: `currentReclaimableSurplusOf` skips the data hook, so an exact minimum derived from it reverts with `JBMultiTerminal_UnderMin`.

## 1.5.1

### Patch Changes

- 1ba98eb: Allow accounting contexts to opt into a shared ETH or USD currency for protocol price-feed conversion, while preserving token-keyed currencies by default.

## 1.5.0

### Minor Changes

- 9793326: Add typed Uniswap V4 direct-swap quoting and transaction builders, Permit2 authorization, and guaranteed-best payment route selection.

## 1.4.1

### Patch Changes

- d4dd71e: Calculate cash-out quotes against the full outstanding supply, including pending
  reserved tokens, before applying the full-supply shortcut. This matches
  `JBCashOuts.cashOutFrom` and prevents overstating reclaimable surplus. Reject
  negative, fractional, or out-of-range inputs—including a combined supply which
  would overflow `uint256`—instead of returning an impossible quote.

## 1.4.0

### Minor Changes

- 997d0ad: Add shared web-client primitives for verified sucker movements and proofs,
  IPFS and 721 tier metadata, permission bitmaps, launch and project-payer
  receipts, ruleset issuance projections, and Uniswap V4 deployments and math.

## 1.3.0

### Minor Changes

- ef9f7e2: Add v6 JB721 "shop" helpers and fix a silent-mint footgun in `build721PayMetadata`.
  - `getProject721Shop(client, { chainId, projectId, isRevnet })` resolves a project's 721 tiers hook, its store, the metadata id target, the pricing context, and its tiers in one call (revnet and custom/omnichain hook resolution; returns `null` for projects with no shop, throws on RPC failure). Plus `get721MetadataIdTarget`, `effectiveTierPrice`, and `DISCOUNT_DENOMINATOR`.
  - `build721CashOutMetadata({ metadataIdTarget, tokenIds })` builds the cash-out (NFT redeem) metadata — the mirror of `build721PayMetadata` — reusing the shared metadata packer.
  - `build721PayMetadata` now takes `metadataIdTarget` (the hook's `METADATA_ID_TARGET` — the shared _implementation_ address). `hookAddress` is kept as a deprecated alias. Passing a project's clone hook address as the target produces an id the hook never matches, so the payment silently mints ZERO NFTs; the new param name plus `get721MetadataIdTarget` make the correct target explicit. The metadata id formula is unchanged, so existing correct callers are unaffected.

## 1.2.0

### Minor Changes

- 91c2361: v6 sucker deployment can now use native bridges alongside CCIP. `parseSuckerDeployerConfig` and `buildOmnichainLaunchProjectTx` take a `bridge` option: `"ccip"` (default, unchanged), `"native"` (OP/Base/Arbitrum standard-bridge suckers — Ethereum<->L2 pairs only), or `"both"` (one native AND one CCIP sucker per pair for redundancy; L2<->L2 pairs fall back to CCIP alone). Native-bridge deployer addresses ship as `NATIVE_SUCKER_DEPLOYER_ADDRESSES` / `jbNativeSuckerDeployerAddress`.

  Safety: native suckers only receive native-token mappings. Standard bridges deliver bridge-wrapped USDC.e — never canonical USDC — so a canonical-USDC mapping over a native bridge locks funds in bridge escrow (OP/Base) or strands them on the remote sucker (Arbitrum), and neither the sucker contracts nor the registry allowlist prevent it. `"native"` + USDC throws; `"both"` + USDC keeps the USDC mapping on the CCIP sucker only.

## 1.1.1

### Patch Changes

- b952234: Review fixes for the v6 action layer: `buildDeployRevnetTx` no longer attaches the creation fee when initializing an EXISTING project as a revnet (the deployer reverts on any value in that case; `creationFee` is now optional and only required for new revnets). `fillSplitPercents` throws when input drift exceeds rounding error instead of silently rewriting un-normalized groups. The package's `require` conditions now serve real CommonJS output (previously ESM was emitted into `dist/cjs`, breaking `require()` consumers). Docs: USDC-accounting caveat on `getCashOutQuote`, README example fix.

## 1.1.0

### Minor Changes

- ce5bf16: Add a complete framework-agnostic V6 action layer under the `@bananapus/nana-sdk-core/v6` subpath: pure tx-request builders (viem/wagmi-compatible, no React) and `PublicClient` reads covering launches (single + omnichain with creation fees and sucker configs), revnet deploys (REVDeployer/REVOwner), rulesets, splits (exact-remainder percent math), terminal resolution (router registry aware), pay + previews + 721 pay metadata, cash-outs + quotes, tokens/credits, permissions, cross-chain sucker bridging, and REVLoans.

## 3.0.0

### Major Changes

- 9d130e7: Add Juicebox V6 support.
  - `JBVersion` is now `4 | 5 | 6`; `jbContractAddress` has a `6` key and `/v6:` URNs parse.
  - BREAKING: unsuffixed ABI exports (`jbControllerAbi`, `revDeployerAbi`, etc.) are now the V6 ABIs. Older-version ABIs that drifted are exported with a version suffix (e.g. `jbControllerV5Abi`, `revLoansV4Abi`) — use those when reading v4/v5 contracts where the interface changed.
  - BREAKING: `CCIP_SUCKER_DEPLOYER_ADDRESSES` is now keyed by version (`5` and `6`) before the chain pair; `parseSuckerDeployerConfig` takes an optional `version` in `opts` (defaults to 5, which also serves v4).
  - New V6 contracts: `JBRouterTerminal` and `JBRouterTerminalRegistry` (the swap terminal is replaced by the router terminal in V6). The V6 `ERC2771Forwarder` address is injected at codegen (same address on every chain).
  - `useNativeTokenSurplus`, `useSuckersNativeTokenSurplus`, and `useResolveDataHook` branch per version where V6 renamed functions (`currentSurplusOf` takes token addresses; the omnichain deployer's `dataHookOf` split into `tiered721HookOf`/`extraDataHookOf`).

## 2.1.2

### Patch Changes

- Add address & ABI for JBSwapTerminalUSDCRegistry contract

## 2.1.1

### Patch Changes

- Add JBDeadline contracts

## 2.1.0

### Minor Changes

- Add Bendystraw client instead of using juicebox API

## 2.0.0

### Major Changes

- Add support for v5 contracts, remove auto-generated hooks & actions

## 1.10.0

### Minor Changes

- 1a17ec9: Added `JBSwapTerminal1_1`
- e73a095: Fix error with invalid primary terminal address for projects with USDC context

## 1.9.0

### Minor Changes

- 7b756c8: Added support for USDC suckers

## 1.8.9

### Patch Changes

- aaf50d0: Remove beta tags and mark packages as stable

  This release removes the `-beta` suffix from all package versions, marking them as stable releases. No breaking changes are included in this update.
