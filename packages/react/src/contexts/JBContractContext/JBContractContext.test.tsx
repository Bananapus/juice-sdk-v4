import {
  DynamicContract,
  JBContractContext,
  JBContractProvider,
  useJBContractContext,
  useJBProjectId,
} from "./JBContractContext";
import {
  JBCoreContracts,
  getJBContractAddress,
  jbControllerAbi,
  jbDirectoryAbi,
} from "@bananapus/nana-sdk-core";
import { zeroAddress } from "viem";
import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  chainId: 10 as number | undefined,
  suckers: undefined as
    | { peerChainId: number; projectId: bigint }[]
    | undefined,
  readContract: vi.fn(),
}));

vi.mock("react", () => ({
  createContext: (defaultValue: unknown) => ({
    Provider: "mock-context-provider",
    _value: defaultValue,
  }),
  useContext: (context: { _value: unknown }) => context._value,
  useCallback: <T,>(callback: T) => callback,
  useMemo: <T,>(factory: () => T) => factory(),
}));
vi.mock("wagmi", () => ({ useReadContract: mocks.readContract }));
vi.mock("../JBChainContext/JBChainContext", () => ({
  useJBChainId: () => mocks.chainId,
}));
vi.mock("../../hooks", () => ({
  useSuckers: () => ({ data: mocks.suckers }),
}));

const terminal = "0x1111111111111111111111111111111111111111" as const;
const controller = "0x2222222222222222222222222222222222222222" as const;
const fundAccessLimits = "0x3333333333333333333333333333333333333333" as const;
const rulesets = "0x4444444444444444444444444444444444444444" as const;
const tokens = "0x5555555555555555555555555555555555555555" as const;
const splits = "0x6666666666666666666666666666666666666666" as const;

function installContractReads({
  ethTerminal = terminal,
}: { ethTerminal?: `0x${string}` } = {}) {
  let primaryCall = 0;
  mocks.readContract.mockImplementation((config) => {
    if (config.functionName === "primaryTerminalOf") {
      primaryCall += 1;
      return {
        data: primaryCall === 1 ? ethTerminal : terminal,
        isLoading: false,
      };
    }
    const byFunction: Record<string, `0x${string}`> = {
      controllerOf: controller,
      FUND_ACCESS_LIMITS: fundAccessLimits,
      RULESETS: rulesets,
      TOKENS: tokens,
      SPLITS: splits,
    };
    return { data: byFunction[config.functionName], isLoading: false };
  });
}

describe("JBContractContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.chainId = 10;
    mocks.suckers = undefined;
    installContractReads();
  });

  test("loads the V6 project contract graph from the canonical directory", () => {
    expect(
      (
        JBContractContext as unknown as {
          _value: { contractAddress: () => string };
        }
      )._value.contractAddress(),
    ).toBe(zeroAddress);

    const element = JBContractProvider({
      projectId: 7n,
      version: 6,
      children: "child",
    }) as unknown as {
      props: { value: Record<string, any>; children: unknown };
    };
    const value = element.props.value;

    expect(element.props.children).toBe("child");
    expect(value.projectId).toBe(7n);
    expect(value.version).toBe(6);
    expect(value.contracts).toEqual({
      primaryNativeTerminal: { data: terminal, isLoading: false },
      controller: { data: controller, isLoading: false },
      fundAccessLimits: { data: fundAccessLimits, isLoading: false },
      rulesets: { data: rulesets, isLoading: false },
      tokens: { data: tokens, isLoading: false },
      splits: { data: splits, isLoading: false },
    });
    expect(value.contractAddress(JBCoreContracts.JBTokens)).toBe(
      getJBContractAddress(JBCoreContracts.JBTokens, 6, 10),
    );
    expect(value.contractAddress(JBCoreContracts.JBTokens, 1)).toBe(
      getJBContractAddress(JBCoreContracts.JBTokens, 6, 1),
    );

    expect(mocks.readContract).toHaveBeenCalledTimes(7);
    for (const call of mocks.readContract.mock.calls.slice(0, 2)) {
      expect(call[0]).toEqual(
        expect.objectContaining({ abi: jbDirectoryAbi, chainId: 10 }),
      );
    }
    for (const call of mocks.readContract.mock.calls.slice(3)) {
      expect(call[0]).toEqual(
        expect.objectContaining({
          abi: jbControllerAbi,
          address: controller,
          chainId: 10,
        }),
      );
    }
  });

  test("falls back to the USDC terminal and disables excluded reads", () => {
    vi.clearAllMocks();
    installContractReads({ ethTerminal: zeroAddress });

    const element = JBContractProvider({
      projectId: 7n,
      version: 6,
      include: [DynamicContract.Tokens],
      children: null,
    }) as unknown as { props: { value: Record<string, any> } };

    expect(element.props.value.contracts.primaryNativeTerminal.data).toBe(
      terminal,
    );
    expect(mocks.readContract.mock.calls[0][0].args).toBeUndefined();
    expect(mocks.readContract.mock.calls[1][0].args).toBeUndefined();
    expect(mocks.readContract.mock.calls[2][0].query.enabled).toBe(false);
    expect(mocks.readContract.mock.calls[3][0].query.enabled).toBe(false);
    expect(mocks.readContract.mock.calls[4][0].query.enabled).toBe(false);
    expect(mocks.readContract.mock.calls[5][0].query.enabled).toBe(true);
    expect(mocks.readContract.mock.calls[6][0].query.enabled).toBe(false);
  });

  test("normalizes a missing controller to zero before dependent reads", () => {
    mocks.readContract.mockImplementation((config) => ({
      data:
        config.functionName === "controllerOf"
          ? zeroAddress
          : config.functionName === "primaryTerminalOf"
            ? terminal
            : undefined,
      isLoading: false,
    }));

    JBContractProvider({ projectId: 7n, version: 6, children: null });

    for (const call of mocks.readContract.mock.calls.slice(3)) {
      expect(call[0].address).toBe(zeroAddress);
    }
  });

  test("does not invent a directory address before the chain resolves", () => {
    mocks.chainId = undefined;

    JBContractProvider({ projectId: 7n, version: 6, children: null });

    expect(
      mocks.readContract.mock.calls.every(([config]) => !config.chainId),
    ).toBe(true);
    expect(
      mocks.readContract.mock.calls
        .slice(0, 3)
        .every(([config]) => !config.address),
    ).toBe(true);
  });

  test("returns the current project unless an explicit sucker peer is requested", () => {
    (JBContractContext as unknown as { _value: unknown })._value = {
      projectId: 7n,
      version: 6,
      contracts: {},
      contractAddress: vi.fn(),
    };

    expect(useJBContractContext()).toEqual(
      expect.objectContaining({ projectId: 7n, version: 6 }),
    );
    expect(useJBProjectId()).toEqual({
      projectId: 7n,
      chainId: 10,
      version: 6,
    });
    expect(useJBProjectId(10)).toEqual({
      projectId: 7n,
      chainId: 10,
      version: 6,
    });

    mocks.suckers = [{ peerChainId: 1, projectId: 42n }];
    expect(useJBProjectId(1)).toEqual({
      projectId: 42n,
      chainId: 1,
      version: 6,
    });
    expect(useJBProjectId(8453 as never)).toEqual({
      projectId: undefined,
      chainId: 8453,
      version: 6,
    });
  });
});
