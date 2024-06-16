import { PropsWithChildren, createContext, useContext, useMemo } from "react";
import { Address } from "viem";
import { AsyncData, AsyncDataNone } from "../types";

/**
 * Data structure for the context for a given dataHook.
 */
export type JBDataHookContextData = AsyncData<{
  /**
   * Address of the dataHook.
   */
  dataHookAddress: Address;
}>;

/**
 * Context for a given dataHook.
 */
export const JBDataHookContext =
  createContext<JBDataHookContextData>(AsyncDataNone);

export function useJBDataHookContext() {
  return useContext(JBDataHookContext);
}

export type JBDataHookProviderProps = PropsWithChildren<{
  dataHookAddress: Address | undefined;
}>;

/**
 * Provides information about a given dataHook.
 * ONLY SUPPORTS JB721Delegate!
 * @TODO support other dataHooks (e.g. buy-back delegate)
 *
 * @note depends on JBContractContext
 */
export const JBDataHookProvider = ({
  dataHookAddress,
  children,
}: JBDataHookProviderProps) => {
  const data = useMemo(() => {
    if (!dataHookAddress) {
      return AsyncDataNone;
    }

    return {
      isLoading: false,
      data: {
        dataHookAddress,
      },
    } as JBDataHookContextData;
  }, [dataHookAddress]);

  return (
    <JBDataHookContext.Provider value={data}>
      {children}
    </JBDataHookContext.Provider>
  );
};
