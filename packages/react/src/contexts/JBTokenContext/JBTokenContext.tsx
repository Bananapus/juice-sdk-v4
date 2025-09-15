import { jbControllerAbi, JBProjectToken, jbTokensAbi } from "juice-sdk-core";
import { createContext, PropsWithChildren, useContext } from "react";
import { isAddressEqual, zeroAddress } from "viem";
import { useReadContract, useToken, UseTokenReturnType } from "wagmi";
import { useJBChainId } from "../JBChainContext/JBChainContext";
import { useJBContractContext } from "../JBContractContext/JBContractContext";
import { AsyncData, AsyncDataNone } from "../types";

/**
 * Context for the token of a project.
 */
export type JBTokenContextData = {
  /**
   * The token of the project.
   */
  token: AsyncData<UseTokenReturnType["data"]>;
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
  withTotalOutstanding?: boolean;
}>;

/**
 * Provides the token for a project.
 *
 * @note depends on JBContractContext
 */
export const JBTokenProvider = ({ children, withTotalOutstanding }: JBTokenProviderProps) => {
  const chainId = useJBChainId();

  const {
    projectId,
    contracts: { controller },
  } = useJBContractContext();

  const { data: tokenAddress } = useReadContract({
    abi: jbTokensAbi,
    functionName: "tokenOf",
    chainId,
    args: [projectId],
  });
  const fetchTokenEnabled = Boolean(tokenAddress && !isAddressEqual(tokenAddress, zeroAddress));
  const token = useToken({
    chainId,
    address: fetchTokenEnabled ? tokenAddress : undefined,
    query: { enabled: fetchTokenEnabled },
  });

  const totalOutstandingRes = useReadContract({
    abi: jbControllerAbi,
    functionName: "totalTokenSupplyWithReservedTokensOf",
    chainId,
    address: controller?.data ?? undefined,
    args: withTotalOutstanding ? [projectId] : undefined,
    query: {
      enabled: withTotalOutstanding && controller?.data !== undefined,
    },
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
