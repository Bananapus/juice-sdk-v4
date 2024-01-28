import { jbMultiTerminalABI } from "juice-sdk-core";
import { PropsWithChildren, createContext, useContext } from "react";
import { Address } from "viem";
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

/**
 * Context for the current ruleset of a project.
 */
export type JBTerminalContext = {
  /**
   * The current ruleset of the project.
   */
  address: Address | undefined;
  accountingContexts: AsyncData<readonly JBAccountingContext[] | undefined>;
  store: AsyncData<Address>;
};

/**
 * Context for the project's current ruleset.
 */
export const JBTerminalContext = createContext<JBTerminalContext>({
  address: undefined,
  accountingContexts: AsyncDataNone,
  store: AsyncDataNone,
});

export function useJBTerminalContext() {
  return useContext(JBTerminalContext);
}

type JBRulesetProviderProps = PropsWithChildren<{
  address: Address | undefined;
}>;

/**
 * Provides the current ruleset for a project.
 *
 * @note depends on JBContractContext
 */
export const JBTerminalProvider = ({
  address,
  children,
}: JBRulesetProviderProps) => {
  const { data: store, isLoading: isStoreLoading } = useJbMultiTerminalStore({
    address,
  });
  const { data: accountingContexts, isLoading: accountingContextsLoading } =
    useJbMultiTerminalAccountingContextsOf({
      address,
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
