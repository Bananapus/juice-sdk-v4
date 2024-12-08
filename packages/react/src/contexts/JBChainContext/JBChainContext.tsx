import { PropsWithChildren, createContext, useContext } from "react";
import { debug } from "../../debug";
import { jbDirectoryAddress } from "../../generated/juicebox";
import { sepolia } from "viem/chains";

export type JBChainId = keyof typeof jbDirectoryAddress;

/**
 * Context for project-specific contracts.
 */
export type JBChainContextData = {
  chainId: JBChainId;
};

/**
 * Context for project-specific contracts.
 */
export const JBChainContext = createContext<JBChainContextData>({
  chainId: sepolia.id,
});

export function useJBChainId(): JBChainId {
  return useContext(JBChainContext).chainId;
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
