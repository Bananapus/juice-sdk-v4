import { useCallback } from "react";
import { useChainId, useSwitchChain, useSendTransaction } from "wagmi";
import { ChainPayment } from "../types";

/**
 * Submit a relayr-given transaction onchain.
 */
export function useSendRelayrTx() {
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const _sendTransaction = useSendTransaction();

  const sendRelayrTx = useCallback(
    async (chainPayment: ChainPayment) => {
      if (chainId !== chainPayment.chain) {
        try {
          await switchChainAsync({ chainId: chainPayment.chain });
        } catch (e) {
          console.error(e);
          throw new Error("Failed to switch to correct chain");
        }
      }

      return await _sendTransaction.sendTransactionAsync({
        chainId: chainPayment.chain,
        to: chainPayment.target,
        value: BigInt(chainPayment.amount),
        data: chainPayment.calldata,
      });
    },
    [_sendTransaction.sendTransactionAsync, chainId, switchChainAsync],
  );

  return {
    sendRelayrTx,
    isPending: _sendTransaction.isPending,
    error: _sendTransaction.error,
    isSuccess: _sendTransaction.isSuccess,
    data: _sendTransaction.data,
  };
}
