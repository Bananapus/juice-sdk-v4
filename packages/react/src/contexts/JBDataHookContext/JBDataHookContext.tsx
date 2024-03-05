import { PropsWithChildren, createContext, useContext, useMemo } from "react";
import { useJb721DelegateVersion } from "src/hooks/jb721Delegate/useJb721DelegateVersion";
import { Address } from "wagmi";
import { AsyncData, AsyncDataLoading, AsyncDataNone } from "../types";

export enum JBDataHookName {
  JB721Delegate = "JB721Delegate",
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
 *
 * @note depends on JBContractContext
 */
export const JBDataHookProvider = ({
  dataHookAddress,
  children,
}: JBDataHookProviderProps) => {
  const { data: jb721DelegateVersion, isLoading } =
    useJb721DelegateVersion(dataHookAddress);

  // TODO in future, support other dataHooks (e.g. buy-back delegate)
  const data = useMemo(() => {
    if (isLoading) {
      return AsyncDataLoading;
    }

    if (!isLoading && jb721DelegateVersion) {
      return {
        isLoading: false,
        data: {
          name: JBDataHookName.JB721Delegate,
          version: jb721DelegateVersion,
          address: dataHookAddress,
        },
      };
    }

    return AsyncDataNone;
  }, [isLoading, jb721DelegateVersion]);

  return (
    <JBDataHookContext.Provider value={data}>
      {children}
    </JBDataHookContext.Provider>
  );
};
