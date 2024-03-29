import { jbMultiTerminalABI } from "juice-sdk-core";
import { PropsWithChildren, createContext, useContext } from "react";
import { Address, isAddressEqual, zeroAddress } from "viem";
import { ReadContractResult } from "wagmi/dist/actions";
import {
  useJbMultiTerminalAccountingContextsOf,
  useJbMultiTerminalStore,
} from "../../generated/juicebox";
import { AsyncData, AsyncDataNone } from "../types";

/**
 * [token] The address of the token that accounting is being done with.
 * [decimals] The number of decimals expected in that token's fixed point accounting.
 * [currency] The currency that the token is priced in terms of.
 */
type JBAccountingContext = ReadContractResult<
  typeof jbMultiTerminalABI,
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
  const { data: store, isLoading: isStoreLoading } = useJbMultiTerminalStore({
    address:
      address && isAddressEqual(address, zeroAddress) ? undefined : address,
  });
  const { data: accountingContexts, isLoading: accountingContextsLoading } =
    useJbMultiTerminalAccountingContextsOf({
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
