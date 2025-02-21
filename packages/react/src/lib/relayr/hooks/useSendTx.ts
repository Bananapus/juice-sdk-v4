import { useCallback } from "react";
import { useChainId, useSwitchChain, useSendTransaction } from "wagmi";
import { ChainPayment } from "../types";

/**
 * Submit a relayr-given transaction onchain.
 */
export function useSendTx() {
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const _sendTransaction = useSendTransaction();

  const sendTransaction = useCallback(
    async (chainPayment: ChainPayment) => {
      try {
        if (chainId !== chainPayment.chain) {
          try {
            await switchChainAsync({ chainId: chainPayment.chain });
          } catch (e) {
            console.error(e);
            throw new Error("Failed to switch to correct chain");
          }
        }

        const tx = await _sendTransaction.sendTransactionAsync({
          to: chainPayment.target,
          value: BigInt(chainPayment.amount),
          data: chainPayment.calldata,
        });

        return tx;
      } catch (error) {
        throw error;
      }
    },
    [_sendTransaction.sendTransactionAsync, chainId, switchChainAsync]
  );

  return {
    sendTransaction,
    isPending: _sendTransaction.isPending,
    error: _sendTransaction.error,
    isSuccess: _sendTransaction.isSuccess,
    data: _sendTransaction.data,
  };
}
