import { JBProjectToken } from "juice-sdk-core";
import { PropsWithChildren, createContext, useContext } from "react";
import { isAddressEqual, zeroAddress } from "viem";
import { useToken } from "wagmi";
import { FetchTokenResult } from "wagmi/dist/actions";
import {
  useJbControllerTotalTokenSupplyWithReservedTokensOf,
  useJbTokensTokenOf,
} from "../../generated/juicebox";
import { useJBContractContext } from "../JBContractContext/JBContractContext";
import { AsyncData, AsyncDataNone } from "../types";

/**
 * Context for the token of a project.
 */
export type JBTokenContextData = {
  /**
   * The token of the project.
   */
  token: AsyncData<FetchTokenResult>;
  /**
   * The total outstanding tokens of the project.
   */
  totalOutstanding: AsyncData<JBProjectToken>;
};

/**
 * Context for the token of a project.
 */
export const JBTokenContext = createContext<JBTokenContextData>({
  /**
   * The token of the project.
   *
   * @default none {@link AsyncDataNone}
   */
  token: AsyncDataNone,
  /**
   * The total outstanding tokens of the project.
   *
   * @default none {@link AsyncDataNone}
   */
  totalOutstanding: AsyncDataNone,
});

export function useJBTokenContext() {
  return useContext(JBTokenContext);
}

export type JBTokenProviderProps = PropsWithChildren<{
  projectId: bigint;
  withTotalOutstanding?: boolean;
}>;

/**
 * Provides the token for a project.
 *
 * @note depends on JBContractContext
 */
export const JBTokenProvider = ({
  projectId,
  children,
  withTotalOutstanding,
}: JBTokenProviderProps) => {
  const {
    contracts: { controller },
  } = useJBContractContext();

  const { data: tokenAddress } = useJbTokensTokenOf({
    args: [projectId],
  });
  const fetchTokenEnabled = Boolean(
    tokenAddress && !isAddressEqual(tokenAddress, zeroAddress)
  );
  const token = useToken({
    address: fetchTokenEnabled ? tokenAddress : undefined,
    enabled: fetchTokenEnabled,
  });

  const totalOutstandingRes =
    useJbControllerTotalTokenSupplyWithReservedTokensOf({
      address: controller?.data,
      args: withTotalOutstanding ? [projectId] : undefined,
      enabled: withTotalOutstanding && controller?.data !== undefined,
    });

  const totalOutstandingData = totalOutstandingRes?.data
    ? new JBProjectToken(totalOutstandingRes?.data)
    : undefined;

  return (
    <JBTokenContext.Provider
      value={{
        token,
        totalOutstanding: {
          data: totalOutstandingData,
          isLoading: totalOutstandingRes?.isLoading,
        },
      }}
    >
      {children}
    </JBTokenContext.Provider>
  );
};
