import { PropsWithChildren } from "react";
import { JBChainId, JBChainProvider } from "../JBChainContext/JBChainContext";
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
import {
  JBTokenProvider,
  JBTokenProviderProps,
} from "../JBTokenContext/JBTokenContext";
import { JBPrimaryNativeTerminalProvider } from "../JBTerminalContext/JBPrimaryNativeTerminalProvider";

type JBProjectProviderProps = PropsWithChildren<{
  projectId: bigint;
  chainId: JBChainId;
  ctxProps?: {
    token?: JBTokenProviderProps;
    contract?: JBContractProviderProps;
    metadata?: JBProjectMetadataProviderProps;
  };
}>;

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
}: JBProjectProviderProps) => {
  return (
    <JBChainProvider chainId={chainId}>
      <JBContractProvider projectId={projectId} {...ctxProps?.contract}>
        <JBRulesetProvider>
          <JBProjectMetadataProvider {...ctxProps?.metadata}>
            <JBCurrentDataHookProvider>
              <JBPrimaryNativeTerminalProvider>
                <JBTokenProvider {...ctxProps?.token}>
                  {children}
                </JBTokenProvider>
              </JBPrimaryNativeTerminalProvider>
            </JBCurrentDataHookProvider>
          </JBProjectMetadataProvider>
        </JBRulesetProvider>
      </JBContractProvider>
    </JBChainProvider>
  );
};
