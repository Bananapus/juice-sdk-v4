# relayr

> A thing 0xBASED built

Relayr is a service that enables a user to pay once for multiple multi-chain transactions. Useful for deploying a juicebox project on multiple chains.

APP: https://relayr-dashboard-staging.up.railway.app
DOCS: https://relayr-docs-staging.up.railway.app

### How to use

1. Call `getTxQuote` from `useGetTxQuote`
2. Prompt user to select which chain they want to pay on.
3. Call `sendTx` from `useSendTx`:

   - use `payment_info[selected_chain_id]` from the `getTxQuote` response as argument

4. Poll for the transaction bundle's status with `useGetTxBundle`
   - call `startPolling` with `bundle_uuid` from `getTxQuote` response
