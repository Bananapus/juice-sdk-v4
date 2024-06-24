import { jbMultiTerminalAbi } from "juice-sdk-core";
import { PropsWithChildren, createContext, useContext } from "react";
import {
  Address,
  ContractFunctionReturnType,
  isAddressEqual,
  zeroAddress,
} from "viem";
import {
  useReadJbMultiTerminalAccountingContextsOf,
  useReadJbMultiTerminalStore,
} from "../../generated/juicebox";
import { AsyncData, AsyncDataNone } from "../types";
import { useJBChainId } from "../JBChainContext/JBChainContext";

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
}>;

export const JBTerminalProvider = ({
  address,
  children,
}: JBTerminalProviderProps) => {
  const chainId = useJBChainId();

  const { data: store, isLoading: isStoreLoading } =
    useReadJbMultiTerminalStore({
      chainId,
      address:
        address && isAddressEqual(address, zeroAddress) ? undefined : address,
    });
  const { data: accountingContexts, isLoading: accountingContextsLoading } =
    useReadJbMultiTerminalAccountingContextsOf({
      chainId,
      address:
        address && isAddressEqual(address, zeroAddress) ? undefined : address,
    });

  return (
    <JBTerminalContext.Provider
      value={{
        address,
        store: {
          data: store,
          isLoading: isStoreLoading,
        },
        accountingContexts: {
          data: accountingContexts,
          isLoading: accountingContextsLoading,
        },
      }}
    >
      {children}
    </JBTerminalContext.Provider>
  );
};
