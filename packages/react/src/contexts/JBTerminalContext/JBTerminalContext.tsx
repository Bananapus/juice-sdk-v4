import { jbMultiTerminalAbi } from "@bananapus/nana-sdk-core";
import { PropsWithChildren, createContext, useContext } from "react";
import {
  Address,
  ContractFunctionReturnType,
  isAddressEqual,
  zeroAddress,
} from "viem";
import { useJBChainId } from "../JBChainContext/JBChainContext";
import { AsyncData, AsyncDataNone, dependentAsyncData } from "../types";
import { useReadContract } from "wagmi";

/**
 * [token] The address of the token that accounting is being done with.
 * [decimals] The number of decimals expected in that token's fixed point accounting.
 * [currency] The currency that the token is priced in terms of.
 */
type JBAccountingContext = ContractFunctionReturnType<
  typeof jbMultiTerminalAbi,
  "view",
  "accountingContextsOf"
>[0];

export type JBTerminalContext = {
  address: Address | undefined;
  accountingContexts: AsyncData<readonly JBAccountingContext[] | undefined>;
  store: AsyncData<Address>;
};

export const JBTerminalContext = createContext<JBTerminalContext>({
  address: undefined,
  accountingContexts: AsyncDataNone,
  store: AsyncDataNone,
});

export function useJBTerminalContext() {
  return useContext(JBTerminalContext);
}

type JBTerminalProviderProps = PropsWithChildren<{
  address: Address | undefined;
  /** The read that resolves `address`: while it loads or after it failed, the terminal's reads say so instead of "none". */
  upstream?: { isLoading: boolean; error?: Error | null };
}>;

/**
 * Provide details about a given terminal.
 */
export const JBTerminalProvider = ({
  address,
  upstream = AsyncDataNone,
  children,
}: JBTerminalProviderProps) => {
  const chainId = useJBChainId();

  const store = useReadContract({
    abi: jbMultiTerminalAbi,
    functionName: "STORE",
    chainId,
    address:
      address && isAddressEqual(address, zeroAddress) ? undefined : address,
  });

  const accountingContexts = useReadContract({
    abi: jbMultiTerminalAbi,
    functionName: "accountingContextsOf",
    chainId,
    address:
      address && isAddressEqual(address, zeroAddress) ? undefined : address,
  });

  return (
    <JBTerminalContext.Provider
      value={{
        address,
        store: dependentAsyncData(
          {
            data: store.data,
            isLoading: store.isLoading,
            error: store.error,
          },
          upstream,
        ),
        accountingContexts: dependentAsyncData(
          {
            data: accountingContexts.data,
            isLoading: accountingContexts.isLoading,
            error: accountingContexts.error,
          },
          upstream,
        ),
      }}
    >
      {children}
    </JBTerminalContext.Provider>
  );
};
