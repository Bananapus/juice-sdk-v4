# relayr

> A thing 0xBASED built

Relayr is a service that enables a user to pay once for multiple multi-chain transactions. Useful for deploying a juicebox project on multiple chains.

APP: https://api.relayr.ba5ed.com
DOCS: https://relayr-docs-staging.up.railway.app

### How to use

1. Call `getRelayrTxQuote` from `useGetRelayrTxQuote` ([example](https://github.com/jbx-protocol/juice-interface/blob/2cff54a65b89be5958567e9f90dea62a75b581a2/src/packages/v4/components/Create/hooks/DeployProject/hooks/useDeployOmnichainProject.ts#L32-L76))
   - Pass in an array of transaction data for each chain. For example, an array of `JBOmnichainDeployer`.`launchProjectFor` transaction arguments for 
   - This will prompt the user to sign a TX for every chain they're transacting on
   - It returns a quote for the gas cost and transaction details.
2. Prompt user to select which chain they want to pay on.
3. Call `sendRelayr` from `useSendRelayrTx`:

   - use `payment_info[selected_chain_id]` from the `getRelayrTxQuote` response as argument

4. Poll for the transaction bundle's status with `useGetRelayrTxBundle`
   - call `startPolling` with `bundle_uuid` from `getRelayrTxQuote` response
5. Check `isComplete` status on the `useGetRelayrTxBundle` to determine when all txs are done.
