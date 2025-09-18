import { createContext, PropsWithChildren, useContext } from "react";
import { JBChainProvider } from "../JBChainContext/JBChainContext";
import {
  JBContractProvider,
  JBContractProviderProps,
} from "../JBContractContext/JBContractContext";
import { JBCurrentDataHookProvider } from "../JBDataHookContext/JBCurrentDataHookProvider";
import {
  JBProjectMetadataProvider,
  JBProjectMetadataProviderProps,
} from "../JBProjectMetadataContext/JBProjectMetadataContext";
import { JBRulesetProvider } from "../JBRulesetContext/JBRulesetContext";
import { JBTokenProvider, JBTokenProviderProps } from "../JBTokenContext/JBTokenContext";
import { JBPrimaryNativeTerminalProvider } from "../JBTerminalContext/JBPrimaryNativeTerminalProvider";
import { JBChainId, JBVersion } from "juice-sdk-core";
import { BendystrawConfig } from "../../lib/bendystraw/getBendystrawUrl";

type JBProjectProviderProps = PropsWithChildren<{
  projectId: bigint;
  chainId: JBChainId;
  version: JBVersion;
  ctxProps?: {
    token?: JBTokenProviderProps;
    contract?: JBContractProviderProps;
    metadata?: JBProjectMetadataProviderProps;
  };
  bendystraw: BendystrawConfig;
}>;

export type JBProjectContextData = {
  chainId: JBChainId;
  projectId: bigint;
  version: JBVersion;
  bendystraw: BendystrawConfig;
};

export const JBProjectContext = createContext<JBProjectContextData | undefined>(undefined);

/**
 * Juicebox project context provider. Loads all the data for a project.
 *
 * Allows for children to access:
 *  - {@link JBContractContext}
 *  - {@link JBFundingCycleContext}
 *  - {@link JBTokenContext}
 */
export const JBProjectProvider = ({
  projectId,
  chainId,
  children,
  ctxProps,
  version,
  bendystraw,
}: JBProjectProviderProps) => {
  return (
    <JBProjectContext.Provider value={{ chainId, projectId, version, bendystraw }}>
      <JBChainProvider chainId={chainId}>
        <JBContractProvider projectId={projectId} version={version} {...ctxProps?.contract}>
          <JBRulesetProvider>
            <JBProjectMetadataProvider {...ctxProps?.metadata}>
              <JBCurrentDataHookProvider>
                <JBPrimaryNativeTerminalProvider>
                  <JBTokenProvider {...ctxProps?.token}>{children}</JBTokenProvider>
                </JBPrimaryNativeTerminalProvider>
              </JBCurrentDataHookProvider>
            </JBProjectMetadataProvider>
          </JBRulesetProvider>
        </JBContractProvider>
      </JBChainProvider>
    </JBProjectContext.Provider>
  );
};

export function useJBProject(): Omit<JBProjectContextData, "bendystraw"> | undefined {
  return useContext(JBProjectContext);
}

export function useBendystrawConfig(): BendystrawConfig | undefined {
  return useContext(JBProjectContext)?.bendystraw;
}
