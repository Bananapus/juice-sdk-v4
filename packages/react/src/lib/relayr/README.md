# relayr

> A thing 0xBASED built

Relayr is a service that enables a user to pay once for multiple multi-chain transactions. Useful for deploying a juicebox project on multiple chains.

APP: https://api.relayr.ba5ed.com
DOCS: https://relayr-docs-staging.up.railway.app

### How to use

1. Call `getRelayrTxQuote` from `useGetRelayrTxQuote` ([example](https://github.com/jbx-protocol/juice-interface/blob/2cff54a65b89be5958567e9f90dea62a75b581a2/src/packages/v4/components/Create/hooks/DeployProject/hooks/useDeployOmnichainProject.ts#L32-L76))
   - Pass one transaction for each account and destination chain, for example one `JBOmnichainDeployer.launchProjectFor` call per chain. Two unexecuted forward requests for the same account/chain would share a nonce, so the hook rejects that bundle before requesting signatures.
   - This will prompt the user to sign a TX for every chain they're transacting on
   - It returns a quote for the gas cost and transaction details.
2. Prompt user to select which chain they want to pay on.
3. Call `sendRelayr` from `useSendRelayrTx`:
   - use `payment_info[selected_chain_id]` from the `getRelayrTxQuote` response as argument

4. Poll for the transaction bundle's status with `useGetRelayrTxBundle`
   - call `startPolling` with `bundle_uuid` from `getRelayrTxQuote` response
   - `isPolling` remains true while a selected bundle is pending; `isFetching` identifies the individual HTTP request in flight
5. Check `isComplete` or `hasFailed` on `useGetRelayrTxBundle` to determine when all destination transactions have reached a terminal state. Relayr's `Success` and `Completed` states are both successful.
