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
} from "@bananapus/nana-sdk-core";
import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useMemo,
} from "react";
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
 * There is no honest default for a project's identity: `projectId: 0n` with
 * `version: 5` reading at `zeroAddress` is a silent wrong answer, not an empty
 * one. Fail loudly instead so the missing provider is obvious at the call site.
 */
function outsideProvider(): never {
  throw new Error(
    "JBContractContext was read outside a JBContractProvider. Wrap the tree in JBProjectProvider or JBContractProvider.",
  );
}

/**
 * Context for project-specific contracts.
 */
export const JBContractContext = createContext<JBContractContextData>({
  /**
   * The project id of the Juicebox project.
   */
  get projectId(): bigint {
    return outsideProvider();
  },

  get version(): JBVersion {
    return outsideProvider();
  },

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

  contractAddress: outsideProvider,
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

  const projectId = suckers.find(
    (suckerPair) => suckerPair.peerChainId === chainId,
  )?.projectId;

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
    [include],
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

  const usdcAddress = chainId ? USDC_ADDRESSES[chainId] : undefined;

  const primaryNativeTerminalUsdc = useReadContract({
    address: jbDirectoryAddress,
    abi: jbDirectoryAbi,
    functionName: "primaryTerminalOf",
    chainId,
    args:
      usdcAddress && enabled([DynamicContract.PrimaryNativePaymentTerminal])
        ? [projectId, usdcAddress]
        : undefined,
  });

  const primaryNativeTerminal = useMemo(() => {
    const isTerminal = (address: Address | undefined) =>
      address !== undefined && !isAddressEqual(address, zeroAddress);

    if (isTerminal(primaryNativeTerminalEth.data))
      return primaryNativeTerminalEth;
    if (isTerminal(primaryNativeTerminalUsdc.data))
      return primaryNativeTerminalUsdc;

    // Neither accounting token resolved to a terminal. `primaryTerminalOf`
    // answers `zeroAddress` for "none", which must not be published as if it
    // were a contract to read from.
    return {
      ...primaryNativeTerminalEth,
      data: undefined,
      isLoading:
        primaryNativeTerminalEth.isLoading ||
        primaryNativeTerminalUsdc.isLoading,
    };
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
    return Boolean(
      controllerAddress && !isAddressEqual(controllerAddress, zeroAddress),
    );
  }, [controllerAddress]);

  // An unresolved controller is `undefined`, never `zeroAddress`: with
  // `staleTime: Infinity` a read aimed at `0x0` would be cached as the
  // project's permanent answer.
  const resolvedControllerAddress = useMemo(() => {
    return hasController ? controllerAddress : undefined;
  }, [controllerAddress, hasController]);

  const fundAccessLimits = useReadContract({
    chainId,
    address: resolvedControllerAddress,
    abi: jbControllerAbi,
    functionName: "FUND_ACCESS_LIMITS",
    query: {
      enabled:
        hasController &&
        enabled([DynamicContract.Controller, DynamicContract.FundAccessLimits]),
      staleTime: Infinity,
    },
  });

  const rulesets = useReadContract({
    chainId,
    address: resolvedControllerAddress,
    abi: jbControllerAbi,
    functionName: "RULESETS",
    query: {
      enabled:
        hasController &&
        enabled([DynamicContract.Controller, DynamicContract.Rulesets]),
      staleTime: Infinity,
    },
  });

  const tokens = useReadContract({
    chainId,
    address: resolvedControllerAddress,
    abi: jbControllerAbi,
    functionName: "TOKENS",
    query: {
      enabled:
        hasController &&
        enabled([DynamicContract.Controller, DynamicContract.Tokens]),
      staleTime: Infinity,
    },
  });

  const splits = useReadContract({
    chainId,
    address: resolvedControllerAddress,
    abi: jbControllerAbi,
    functionName: "SPLITS",
    query: {
      enabled:
        hasController &&
        enabled([DynamicContract.Controller, DynamicContract.Splits]),
      staleTime: Infinity,
    },
  });

  // A dependent read that is disabled because its controller has not resolved
  // yet reports `isLoading: false, data: undefined` — indistinguishable from
  // "this project has none". Carry the upstream's loading state instead.
  const dependent = <T,>(query: {
    data: T | undefined;
    isLoading: boolean;
  }) => ({
    ...query,
    isLoading: Boolean(query.isLoading || controller.isLoading),
  });

  const contractAddress = useCallback(
    (contract: Contract, _chainId?: JBChainId) => {
      return getJBContractAddress(contract, version, _chainId || chainId!);
    },
    [version, chainId],
  );

  const contracts = {
    controller,
    fundAccessLimits: dependent(fundAccessLimits),
    primaryNativeTerminal,
    rulesets: dependent(rulesets),
    tokens: dependent(tokens),
    splits: dependent(splits),
  };

  debug("JBContractContext", { projectId, contracts });

  return (
    <JBContractContext.Provider
      value={{
        version,
        projectId,
        contracts,
        contractAddress,
      }}
    >
      {children}
    </JBContractContext.Provider>
  );
};
