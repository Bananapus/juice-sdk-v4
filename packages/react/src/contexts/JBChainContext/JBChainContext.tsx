import { PropsWithChildren, createContext, useContext } from "react";
import { debug } from "juice-sdk-core";
import { jbDirectoryAddress } from "../../generated/juicebox";
import { sepolia } from "viem/chains";

export type JBChainId = keyof typeof jbDirectoryAddress;

/**
 * Context for project-specific contracts.
 */
export type JBChainContextData = {
  chainId: JBChainId | undefined;
};

/**
 * Context for project-specific contracts.
 */
export const JBChainContext = createContext<JBChainContextData>({
  // Force the consumer/client to specify a chainId
  chainId: undefined,
});

export function useJBChainId(): JBChainId | undefined {
  const jbChainId = useContext(JBChainContext).chainId;
  return jbChainId;
}

/**
 * Load project-specific contract addresses for a given JB project.
 *
 * If `include` arg not specified, all contracts are loaded
 */
export const JBChainProvider = ({
  chainId,
  children,
}: PropsWithChildren<{
  chainId: JBChainId;
}>) => {
  debug("JBChainContext", {
    chainId,
  });

  return (
    <JBChainContext.Provider
      value={{
        chainId,
      }}
    >
      {children}
    </JBChainContext.Provider>
  );
};
