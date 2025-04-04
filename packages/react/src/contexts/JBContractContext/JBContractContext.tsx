import { NATIVE_TOKEN, debug } from "juice-sdk-core";
import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useMemo,
} from "react";
import { Address, isAddressEqual, zeroAddress } from "viem";
import {
  useReadJbControllerFundAccessLimits,
  useReadJbControllerRulesets,
  useReadJbControllerSplits,
  useReadJbControllerTokens,
  useReadJbDirectoryControllerOf,
  useReadJbDirectoryPrimaryTerminalOf,
} from "../../generated/juicebox";
import { useJBChainId } from "../JBChainContext/JBChainContext";
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
    rulesets: AsyncData<Address>;
    tokens: AsyncData<Address>;
    splits: AsyncData<Address>;
  };
};

/**
 * Context for project-specific contracts.
 */
export const JBContractContext = createContext<JBContractContextData>({
  /**
   * The project id of the Juicebox project.
   */
  projectId: 0n,

  /**
   * The addresses of the contracts for the project.
   */
  contracts: {
    primaryNativeTerminal: AsyncDataNone,
    controller: AsyncDataNone,
    fundAccessLimits: AsyncDataNone,
    rulesets: AsyncDataNone,
    tokens: AsyncDataNone,
    splits: AsyncDataNone,
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
  "Tokens",
  "Splits",
  "Rulesets",
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
  const chainId = useJBChainId();
  const enabled = useCallback(
    (selector: DynamicContract[]) => {
      if (typeof include === "undefined") {
        return true;
      }

      return include.some((c) => selector.includes(c));
    },
    [include]
  );

  const primaryNativeTerminal = useReadJbDirectoryPrimaryTerminalOf({
    chainId,
    args: enabled([DynamicContract.PrimaryNativePaymentTerminal])
      ? [projectId, NATIVE_TOKEN]
      : undefined,
  });
  const controller = useReadJbDirectoryControllerOf({
    chainId,
    args: [projectId],
    query: {
      enabled: enabled([DynamicContract.Controller]),
      staleTime: Infinity,
    },
  });
  const controllerAddress = useMemo(() => controller.data, [controller.data]);

  const hasController =
    controllerAddress && !isAddressEqual(controllerAddress, zeroAddress);

  const fundAccessLimits = useReadJbControllerFundAccessLimits({
    chainId,
    address: hasController ? controllerAddress : undefined,
    query: {
      enabled: enabled([
        DynamicContract.Controller,
        DynamicContract.FundAccessLimits,
      ]),
      staleTime: Infinity,
    },
  });

  const rulesets = useReadJbControllerRulesets({
    chainId,
    address: hasController ? controllerAddress : undefined,
    query: {
      enabled: enabled([DynamicContract.Controller, DynamicContract.Rulesets]),
      staleTime: Infinity,
    },
  });

  const tokens = useReadJbControllerTokens({
    chainId,
    address: hasController ? controllerAddress : undefined,
    query: {
      enabled: enabled([DynamicContract.Controller, DynamicContract.Tokens]),
      staleTime: Infinity,
    },
  });

  const splits = useReadJbControllerSplits({
    chainId,
    address: hasController ? controllerAddress : undefined,
    query: {
      enabled: enabled([DynamicContract.Controller, DynamicContract.Splits]),
      staleTime: Infinity,
    },
  });

  debug("JBContractContext", {
    projectId,
    contracts: {
      controller,
      fundAccessLimits,
      primaryNativeTerminal,
      rulesets,
      tokens,
      splits,
    },
  });

  return (
    <JBContractContext.Provider
      value={{
        projectId,
        contracts: {
          controller,
          fundAccessLimits,
          primaryNativeTerminal,
          rulesets,
          tokens,
          splits,
        },
      }}
    >
      {children}
    </JBContractContext.Provider>
  );
};
