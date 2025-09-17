import {
  JBChainId,
  NATIVE_TOKEN,
  debug,
  USDC_ADDRESSES,
  jbDirectoryAbi,
  jbControllerAbi,
  JBVersion,
  jbContractAddress,
  JBCoreContracts,
  getJBContractAddress,
  Contract,
} from "juice-sdk-core";
import { PropsWithChildren, createContext, useCallback, useContext, useMemo } from "react";
import { Address, isAddressEqual, zeroAddress } from "viem";
import { useSuckers } from "../../hooks";
import { useJBChainId } from "../JBChainContext/JBChainContext";
import { AsyncData, AsyncDataNone } from "../types";
import { useReadContract } from "wagmi";

/**
 * Context for project-specific contracts.
 */
export type JBContractContextData = {
  projectId: bigint;
  version: JBVersion;
  contracts: {
    primaryNativeTerminal: AsyncData<Address>;
    controller: AsyncData<Address>;
    fundAccessLimits: AsyncData<Address>;
    rulesets: AsyncData<Address>;
    tokens: AsyncData<Address>;
    splits: AsyncData<Address>;
  };
  contractAddress: (contract: Contract, chainId?: JBChainId) => Address;
};

/**
 * Context for project-specific contracts.
 */
export const JBContractContext = createContext<JBContractContextData>({
  /**
   * The project id of the Juicebox project.
   */
  projectId: 0n,

  version: 5,

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

  contractAddress: () => zeroAddress,
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
  version: JBVersion;
  include?: DynamicContract[];
}>;

/**
 * Return the current project ID and chain ID. If `chainId` provided, return the project ID for that chain.
 * Otherwise, return the project ID for the current chain.
 */
export function useJBProjectId(chainId?: JBChainId): {
  projectId: bigint | undefined;
  chainId: JBChainId | undefined;
  version: JBVersion;
} {
  const currentChainId = useJBChainId();
  const { projectId: currentProjectId, version } = useJBContractContext();

  const { data: suckers } = useSuckers({ enabled: !!chainId });

  if (!chainId || currentChainId === chainId || !suckers) {
    return { projectId: currentProjectId, chainId: currentChainId, version };
  }

  const projectId = suckers.find((suckerPair) => suckerPair.peerChainId === chainId)?.projectId;

  return { projectId, chainId, version };
}

/**
 * Load project-specific contract addresses for a given JB project.
 *
 * If `include` arg not specified, all contracts are loaded
 */
export const JBContractProvider = ({
  projectId,
  include,
  children,
  version,
}: JBContractProviderProps) => {
  const chainId = useJBChainId();
  const enabled = useCallback(
    (selector: DynamicContract[]) => {
      if (typeof include === "undefined") return true;
      return include.some((c) => selector.includes(c));
    },
    [include]
  );

  const jbDirectoryAddress = chainId
    ? jbContractAddress[version][JBCoreContracts.JBDirectory][chainId]
    : undefined;

  const primaryNativeTerminalEth = useReadContract({
    address: jbDirectoryAddress,
    abi: jbDirectoryAbi,
    functionName: "primaryTerminalOf",
    chainId,
    args: enabled([DynamicContract.PrimaryNativePaymentTerminal])
      ? [projectId, NATIVE_TOKEN]
      : undefined,
  });

  const primaryNativeTerminalUsdc = useReadContract({
    address: jbDirectoryAddress,
    abi: jbDirectoryAbi,
    functionName: "primaryTerminalOf",
    chainId,
    args: enabled([DynamicContract.PrimaryNativePaymentTerminal])
      ? [projectId, chainId ? USDC_ADDRESSES[chainId] : zeroAddress]
      : undefined,
  });

  const primaryNativeTerminal = useMemo(() => {
    return primaryNativeTerminalEth.data !== zeroAddress
      ? primaryNativeTerminalEth
      : primaryNativeTerminalUsdc;
  }, [primaryNativeTerminalEth, primaryNativeTerminalUsdc]);

  const controller = useReadContract({
    chainId,
    address: jbDirectoryAddress,
    abi: jbDirectoryAbi,
    functionName: "controllerOf",
    args: [projectId],
    query: {
      enabled: enabled([DynamicContract.Controller]),
      staleTime: Infinity,
    },
  });

  const controllerAddress = useMemo(() => controller.data, [controller.data]);

  const hasController = useMemo(() => {
    return controllerAddress && !isAddressEqual(controllerAddress, zeroAddress);
  }, [controllerAddress]);

  const normalizedControllerAddress = useMemo(() => {
    return hasController ? controllerAddress : zeroAddress;
  }, [controllerAddress, hasController]);

  const fundAccessLimits = useReadContract({
    chainId,
    address: normalizedControllerAddress,
    abi: jbControllerAbi,
    functionName: "FUND_ACCESS_LIMITS",
    query: {
      enabled: enabled([DynamicContract.Controller, DynamicContract.FundAccessLimits]),
      staleTime: Infinity,
    },
  });

  const rulesets = useReadContract({
    chainId,
    address: normalizedControllerAddress,
    abi: jbControllerAbi,
    functionName: "RULESETS",
    query: {
      enabled: enabled([DynamicContract.Controller, DynamicContract.Rulesets]),
      staleTime: Infinity,
    },
  });

  const tokens = useReadContract({
    chainId,
    address: normalizedControllerAddress,
    abi: jbControllerAbi,
    functionName: "TOKENS",
    query: {
      enabled: enabled([DynamicContract.Controller, DynamicContract.Tokens]),
      staleTime: Infinity,
    },
  });

  const splits = useReadContract({
    chainId,
    address: normalizedControllerAddress,
    abi: jbControllerAbi,
    functionName: "SPLITS",
    query: {
      enabled: enabled([DynamicContract.Controller, DynamicContract.Splits]),
      staleTime: Infinity,
    },
  });

  const contractAddress = useCallback(
    (contract: Contract, _chainId?: JBChainId) => {
      return getJBContractAddress(contract, version, _chainId || chainId!);
    },
    [version, chainId]
  );

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
        version,
        projectId,
        contracts: {
          controller,
          fundAccessLimits,
          primaryNativeTerminal,
          rulesets,
          tokens,
          splits,
        },
        contractAddress,
      }}
    >
      {children}
    </JBContractContext.Provider>
  );
};
