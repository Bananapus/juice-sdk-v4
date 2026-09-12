# SDK Risks

## Priority risks

Deployment availability, ABI generation and a project's selected terminal are
separate facts. A package upgrade does not deploy contracts or migrate registry
pins and cohorts. The floor-fix hook, router, gateway and ratio feed are now
deployed on all four mainnets, Sepolia, Base Sepolia and Arbitrum Sepolia;
OP Sepolia has only the ratio feed from this rollout. Projects can still use
different generations in the same SDK release; an absent chain record must
remain unavailable.

`resolveRouterPath` reads the registry-selected route. The payment token can have
a different primary terminal in the directory, which `resolvePaymentTerminal`
resolves. Preserve the payment's actual terminal through preview, approval and
submission. Sending directly to the gateway's underlying router bypasses gateway
custody. A queued gateway call represents retained input, not settled proceeds;
its pending state must be reconciled through processing or refund.

## Trust assumptions

Generation trusts reviewed deployment artifacts and the source commit pinned by
the protocol fixture and CI. Hook, router, gateway and ratio-feed records,
including historical generations, must identify the expected chain and contract
and contain successful mined-receipt evidence. These checks validate recorded
fields; they do not fetch receipts or compare deployed runtime bytecode. A
locally selected artifact tree therefore carries the same provenance obligation
as the pinned checkout. Missing records stay absent and invalid evidence fails
generation.

Unsuffixed ABIs describe the executed rollout generation, sourced from Sepolia.
Use the chain-specific address book, `jbContractAbiGeneration` and historical ABI exports
for the contract being called or decoded. Historical availability does not mean
that a registry permits selecting that generation again. Custom deployments are
not classified from a familiar-looking interface.

## Invariants to verify

- Use a public client on the requested chain. Router resolution returns
  `unresolved` for a zero registry terminal and `unknown` for an unrecognized
  terminal; RPC failures propagate as errors. Only the chain's recorded gateway
  is unwrapped. These reads are snapshots, not a promise that routing or pricing
  remains unchanged at transaction inclusion.
- `buildBuybackPayMetadata` encodes the current hook's three-word quote:
  `(amountToSwapWith, minimumSwapAmountOut, skipSplits)`, keyed to the supplied
  hook's `pay` metadata ID. The caller selects the project's actual hook and
  generation. ABI encoding enforces unsigned integer widths, but the helper does
  not check amounts against payment size, balances, token decimals or a live
  quote. Those checks belong to the transaction preparation flow.
- A zero buyback minimum uses the oracle-derived floor and mint fallback; an
  explicit minimum remains a settlement guarantee. `skipSplits` defaults to
  false. Quote preparation must preserve these meanings when composing metadata.
- Default cash-out quote recognition includes the current and previous hook
  recorded on that chain. V1 artifacts remain available for historical decoding;
  the default quote parser does not extend support to them. A custom hook requires
  an explicit caller-selected address and compatible diagnostic metadata.

`JBCENTER_RPC_METHODS` includes the gateway-supported `eth_simulateV1` read method. The client forwards the caller’s simulation parameters unchanged and the gateway enforces its existing simulation size and method restrictions. Simulation results do not authorize or submit transactions and are not guarantees of later execution; wallet, transaction-submission, and privileged debug methods remain excluded.
