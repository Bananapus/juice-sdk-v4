import {
  getJBContractAddress,
  jbControllerAbi,
  JBCoreContracts,
  JBProjectToken,
  jbTokensAbi,
} from "@bananapus/nana-sdk-core";
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
export const JBTokenProvider = ({
  children,
  withTotalOutstanding,
}: JBTokenProviderProps) => {
  const chainId = useJBChainId();

  const {
    projectId,
    version,
    contracts: { controller },
  } = useJBContractContext();

  // `getJBContractAddress` throws for a chain with no deployment, and it runs in
  // the render body — before any `enabled` gate can help. An unresolvable
  // address disables the read instead of taking the tree down.
  let jbTokensAddress: `0x${string}` | undefined;
  try {
    jbTokensAddress = chainId
      ? getJBContractAddress(JBCoreContracts.JBTokens, version, chainId)
      : undefined;
  } catch {
    jbTokensAddress = undefined;
  }

  const { data: tokenAddress, isLoading: isTokenAddressLoading } =
    useReadContract({
      address: jbTokensAddress,
      abi: jbTokensAbi,
      functionName: "tokenOf",
      chainId,
      args: [projectId],
      query: { enabled: !!projectId && !!jbTokensAddress },
    });

  const fetchTokenEnabled = Boolean(
    tokenAddress && !isAddressEqual(tokenAddress, zeroAddress),
  );
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

  const totalOutstandingData =
    totalOutstandingRes?.data !== undefined
      ? new JBProjectToken(totalOutstandingRes?.data)
      : undefined;

  return (
    <JBTokenContext.Provider
      value={{
        // The ERC-20 read is disabled until `tokenOf` answers, which would
        // otherwise publish `isLoading: false, data: undefined` — "this project
        // has no token" — on every page load.
        token: {
          ...token,
          isLoading: Boolean(token.isLoading || isTokenAddressLoading),
        },
        totalOutstanding: {
          data: totalOutstandingData,
          isLoading: Boolean(
            totalOutstandingRes?.isLoading || controller?.isLoading,
          ),
        },
      }}
    >
      {children}
    </JBTokenContext.Provider>
  );
};
