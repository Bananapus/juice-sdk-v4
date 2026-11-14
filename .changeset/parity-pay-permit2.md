---
"@bananapus/nana-sdk-core": minor
---

Rules three web clients each kept on their own now have one home.

- ERC-20 pay authorization through Permit2: `readPermit2PayAuthorization` reads what a pay entry (multi terminal, router terminal, its registry or gateway) still needs from the payer, and `addPermit2PayMetadata` adds the signed `JBSingleAllowance` to pay metadata keyed to that entry. `planErc20PayAuthorization` picks the step for a payer: nothing, an exact approval of the entry (Safes and other contract wallets), or the Permit2 signature. `permit2PayAuthorizationReusable` says whether a signature kept from an earlier attempt still authorizes the payment. `addToHookMetadata` appends one entry to packed hook metadata and refuses malformed input.
- `resolveProjectBuybackHook` finds the buyback hook a project's current ruleset actually calls, per direction, through its data hook: the registry, a revnet's owner contract, the omnichain deployer's extra hook, or a hook of any generation. A project whose ruleset calls no buyback hook resolves to none, whatever default the registry names.
- `resolveProjectRouterTerminal` reads the project's own terminal list before trusting the router registry's default.
- Revnet cash out fee: `revnetCashOutFeeApplies`, `cashOutCountAfterRevnetFee`, `revnetCashOutFeeTerminalExists`, and a `revnetFeeApplies` option on `getCashOutQuote`.
