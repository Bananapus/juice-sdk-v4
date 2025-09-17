import { debug, JBChainId } from "juice-sdk-core";
import { createContext, PropsWithChildren, useContext } from "react";

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
  chainId: undefined,
});

export function useJBChainId(): JBChainId | undefined {
  const { chainId } = useContext(JBChainContext);
  return chainId;
}

/**
 * Load project-specific contract addresses for a given JB project.
 *
 * If `include` arg not specified, all contracts are loaded
 */
export const JBChainProvider = ({
  chainId,
  children,
}: PropsWithChildren<{ chainId: JBChainId }>) => {
  debug("JBChainContext", { chainId });

  return <JBChainContext.Provider value={{ chainId }}>{children}</JBChainContext.Provider>;
};
