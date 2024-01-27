import { NATIVE_TOKEN } from "juice-sdk-core";
import { PropsWithChildren, createContext, useContext } from "react";
import { Address } from "viem";
import {
  useJbControllerFundAccessLimits,
  useJbDirectoryControllerOf,
  useJbDirectoryPrimaryTerminalOf,
} from "../../generated/juicebox";
import { AsyncData, AsyncDataNone } from "../types";

/**
 * Context for project-specific contracts.
 */
export type JBContractContextData = {
  projectId: bigint;
  contracts: {
    primaryNativeTerminal: AsyncData<Address>;
    controller: AsyncData<Address>;
    fundAccessLimits: AsyncData<Address>;
  };
};

/**
 * Context for project-specific contracts.
 */
export const JBContractContext = createContext<JBContractContextData>({
  /**
   * The project id of the Juicebox project.
   *
   * @default 0n
   */
  projectId: 0n,

  /**
   * The addresses of the contracts for the project.
   */
  contracts: {
    primaryNativeTerminal: AsyncDataNone,
    controller: AsyncDataNone,
    fundAccessLimits: AsyncDataNone,
  },
});

export function useJBContractContext() {
  return useContext(JBContractContext);
}

// contracts that are different across JB projects.
export enum DynamicContract {
  "Controller",
  "PrimaryNativePaymentTerminal",
  "FundAccessLimits",
}

export type JBContractProviderProps = PropsWithChildren<{
  projectId: bigint;
  include?: DynamicContract[];
}>;

/**
 * Load project-specific contract addresses for a given JB project.
 *
 * If `include` arg not specified, all contracts are loaded
 */
export const JBContractProvider = ({
  projectId,
  include,
  children,
}: JBContractProviderProps) => {
  const enabled = (selector: DynamicContract[]) => {
    return (
      typeof include === "undefined" ||
      include.some((c) => selector.includes(c))
    );
  };

  const primaryNativeTerminal = useJbDirectoryPrimaryTerminalOf({
    args: enabled([DynamicContract.PrimaryNativePaymentTerminal])
      ? [projectId, NATIVE_TOKEN]
      : undefined,
  });
  const controller = useJbDirectoryControllerOf({
    args: [projectId],
    enabled: enabled([DynamicContract.Controller]),
  });

  const fundAccessLimits = useJbControllerFundAccessLimits({
    address: controller.data,
    enabled: enabled([
      DynamicContract.Controller,
      DynamicContract.FundAccessLimits,
    ]),
  });

  return (
    <JBContractContext.Provider
      value={{
        projectId,
        contracts: {
          controller,
          fundAccessLimits,
          primaryNativeTerminal,
        },
      }}
    >
      {children}
    </JBContractContext.Provider>
  );
};
