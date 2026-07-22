import {
  JBCoreContracts,
  JBProjectToken,
  getJBContractAddress,
  jbControllerAbi,
  jbTokensAbi,
} from "@bananapus/nana-sdk-core";
import { zeroAddress } from "viem";
import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  JBTokenContext,
  JBTokenProvider,
  useJBTokenContext,
} from "./JBTokenContext";

const mocks = vi.hoisted(() => ({
  chainId: 10 as number | undefined,
  projectId: 7n,
  version: 6,
  controller: "0x1111111111111111111111111111111111111111" as
    | `0x${string}`
    | undefined,
  tokenAddress: "0x2222222222222222222222222222222222222222" as
    | `0x${string}`
    | undefined,
  totalOutstanding: 0n as bigint | undefined,
  readContract: vi.fn(),
  useToken: vi.fn(),
}));

vi.mock("react", () => ({
  createContext: (defaultValue: unknown) => ({
    Provider: "mock-context-provider",
    _value: defaultValue,
  }),
  useContext: (context: { _value: unknown }) => context._value,
}));
vi.mock("wagmi", () => ({
  useReadContract: mocks.readContract,
  useToken: mocks.useToken,
}));
vi.mock("../JBChainContext/JBChainContext", () => ({
  useJBChainId: () => mocks.chainId,
}));
vi.mock("../JBContractContext/JBContractContext", () => ({
  useJBContractContext: () => ({
    projectId: mocks.projectId,
    version: mocks.version,
    contracts: { controller: { data: mocks.controller } },
  }),
}));

describe("JBTokenContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.chainId = 10;
    mocks.projectId = 7n;
    mocks.version = 6;
    mocks.controller = "0x1111111111111111111111111111111111111111";
    mocks.tokenAddress = "0x2222222222222222222222222222222222222222";
    mocks.totalOutstanding = 0n;
    mocks.readContract.mockImplementation((config) =>
      config.functionName === "tokenOf"
        ? { data: mocks.tokenAddress, isLoading: false }
        : { data: mocks.totalOutstanding, isLoading: true },
    );
    mocks.useToken.mockReturnValue({
      data: { symbol: "JBX", decimals: 18 },
      isLoading: false,
    });
  });

  test("loads token metadata and preserves a valid zero outstanding supply", () => {
    const element = JBTokenProvider({
      withTotalOutstanding: true,
      children: "child",
    }) as unknown as {
      props: { value: Record<string, any>; children: unknown };
    };

    expect(element.props.children).toBe("child");
    expect(element.props.value.token).toEqual({
      data: { symbol: "JBX", decimals: 18 },
      isLoading: false,
    });
    expect(element.props.value.totalOutstanding.data).toBeInstanceOf(
      JBProjectToken,
    );
    expect(element.props.value.totalOutstanding.data.value).toBe(0n);
    expect(element.props.value.totalOutstanding.isLoading).toBe(true);

    expect(mocks.readContract.mock.calls[0][0]).toEqual({
      address: getJBContractAddress(JBCoreContracts.JBTokens, 6, 10),
      abi: jbTokensAbi,
      functionName: "tokenOf",
      chainId: 10,
      args: [7n],
      query: { enabled: true },
    });
    expect(mocks.useToken).toHaveBeenCalledWith({
      chainId: 10,
      address: mocks.tokenAddress,
      query: { enabled: true },
    });
    expect(mocks.readContract.mock.calls[1][0]).toEqual({
      abi: jbControllerAbi,
      functionName: "totalTokenSupplyWithReservedTokensOf",
      chainId: 10,
      address: mocks.controller,
      args: [7n],
      query: { enabled: true },
    });

    (JBTokenContext as unknown as { _value: unknown })._value =
      element.props.value;
    expect(useJBTokenContext()).toEqual(element.props.value);
  });

  test("disables token metadata for zero address and omits optional supply args", () => {
    mocks.tokenAddress = zeroAddress;
    mocks.totalOutstanding = undefined;

    const element = JBTokenProvider({
      withTotalOutstanding: false,
      children: null,
    }) as unknown as { props: { value: Record<string, any> } };

    expect(mocks.useToken).toHaveBeenCalledWith({
      chainId: 10,
      address: undefined,
      query: { enabled: false },
    });
    expect(mocks.readContract.mock.calls[1][0].args).toBeUndefined();
    expect(mocks.readContract.mock.calls[1][0].query.enabled).toBe(false);
    expect(element.props.value.totalOutstanding.data).toBeUndefined();
  });
});
