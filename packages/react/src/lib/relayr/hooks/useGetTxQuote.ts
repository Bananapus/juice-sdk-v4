import { JBChainId } from "juice-sdk-core";
import { useRequestRelayrQuote } from "./useRequestRelayrQuote";
import {
  useSignErc2771ForwardRequest,
  ERC2771ForwardRequestData,
} from "./useSignErc2771ForwardRequest";

/**
 * Hook to get transaction quote from relayr.
 */
export function useGetTxQuote() {
  const requestRelayrQuote = useRequestRelayrQuote();
  const { sign } = useSignErc2771ForwardRequest();

  /**
   * Prompt user to sign transactions for each chain, then fetch transaction data from relayr.
   */
  async function getTransactionQuote(
    data: { chainId: JBChainId; data: ERC2771ForwardRequestData }[]
  ) {
    if (!data) return;

    /**
     * Prompt user to sign transactions for each chain
     */
    const txDataRequest = [];
    for (const d of data) {
      const signedData = await sign(d.data, d.chainId);
      txDataRequest.push({
        chain: d.chainId,
        data: signedData,
        value: "0",
      });
    }

    /**
     * Fetch transaction data from relayr
     * You'll eventually submit a transaction with this data onchain.
     */
    return await requestRelayrQuote.mutateAsync(txDataRequest);
  }

  return {
    getTransactionQuote,
    ...requestRelayrQuote,
  };
}
