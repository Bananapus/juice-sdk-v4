import { JBChainId, JBVersion } from "juice-sdk-core";
import { useRequestRelayrQuote } from "./useRequestRelayrQuote";
import {
  ERC2771ForwardRequestData,
  useSignErc2771ForwardRequest,
} from "./useSignErc2771ForwardRequest";

/**
 * Hook to get transaction quote from relayr.
 */
export function useGetRelayrTxQuote() {
  const requestRelayrQuote = useRequestRelayrQuote();
  const { sign } = useSignErc2771ForwardRequest();

  /**
   * Prompt user to sign transactions for each chain, then fetch transaction data from relayr.
   *
   * Each transaction may carry a `version` to target that JB version's forwarder (defaults to
   * the context version).
   */
  async function getRelayrTxQuote(
    data: { chainId: JBChainId; data: ERC2771ForwardRequestData; version?: JBVersion }[]
  ) {
    if (!data) return;

    /**
     * Prompt user to sign transactions for each chain
     */
    const txDataRequest = [];
    for (const d of data) {
      const signedData = await sign(d.data, d.chainId, d.version);
      txDataRequest.push({
        chain: d.chainId,
        data: signedData,
        // The forwarder needs the forward request's value passed along with the execute call.
        value: d.data.value.toString(),
        version: d.version,
      });
    }

    /**
     * Fetch transaction data from relayr
     * You'll eventually submit a transaction with this data onchain.
     */
    return await requestRelayrQuote.mutateAsync(txDataRequest);
  }

  return {
    getRelayrTxQuote,
    ...requestRelayrQuote,
  };
}
