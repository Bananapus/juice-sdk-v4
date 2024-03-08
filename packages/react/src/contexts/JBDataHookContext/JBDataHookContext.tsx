import { PropsWithChildren, createContext, useContext, useMemo } from "react";
import { Address } from "wagmi";
import { AsyncData, AsyncDataNone } from "../types";

export enum JBDataHookName {
  JB721Hook = "JB721Hook",
}

/**
 * Data structure for the context for a given dataHook.
 */
export type JBDataHookContextData = AsyncData<{
  /**
   * The name of the dataHook.
   */
  name: JBDataHookName;
  /**
   * The version of the dataHook (in whatever verisoning scheme the dataHook uses)
   */
  version: string;
  /**
   * Address of the dataHook.
   */
  address: Address;
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
        name: JBDataHookName.JB721Hook,
        version: "0",
        address: dataHookAddress,
      },
    };
  }, []);

  return (
    <JBDataHookContext.Provider value={data}>
      {children}
    </JBDataHookContext.Provider>
  );
};
