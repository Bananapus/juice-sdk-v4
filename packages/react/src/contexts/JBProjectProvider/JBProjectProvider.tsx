import { PropsWithChildren } from "react";
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

type JBProjectProviderProps = PropsWithChildren<{
  projectId: bigint;
  chainId: JBChainId;
  version: JBVersion;
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
  version,
}: JBProjectProviderProps) => {
  return (
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
  );
};
