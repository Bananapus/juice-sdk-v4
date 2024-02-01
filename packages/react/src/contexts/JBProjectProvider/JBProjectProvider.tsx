import { PropsWithChildren } from "react";
import {
  JBContractProvider,
  JBContractProviderProps,
} from "../JBContractContext/JBContractContext";
import { JBRulesetProvider } from "../JBRulesetContext/JBRulesetContext";
import {
  JBTokenProvider,
  JBTokenProviderProps,
} from "../JBTokenContext/JBTokenContext";
import {
  JBProjectMetadataProvider,
  JBProjectMetadataProviderProps,
} from "../JBProjectMetadataContext/JBProjectMetadataContext";

type JBProjectProviderProps = PropsWithChildren<{
  projectId: bigint;
  ctxProps?: {
    token: JBTokenProviderProps;
    contract: JBContractProviderProps;
    metadata: JBProjectMetadataProviderProps;
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
  children,
  ctxProps,
}: JBProjectProviderProps) => {
  return (
    <JBContractProvider projectId={projectId} {...ctxProps?.contract}>
      <JBRulesetProvider>
        <JBProjectMetadataProvider {...ctxProps?.metadata}>
          <JBTokenProvider {...ctxProps?.token}>{children}</JBTokenProvider>
        </JBProjectMetadataProvider>
      </JBRulesetProvider>
    </JBContractProvider>
  );
};
