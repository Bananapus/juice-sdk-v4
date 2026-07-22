import {
  ETH_CURRENCY_ID,
  NATIVE_TOKEN,
  NATIVE_TOKEN_DECIMALS,
  jbMultiTerminalAbi,
  jbMultiTerminalV5Abi,
} from "@bananapus/nana-sdk-core";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useSuckersNativeTokenSurplus } from "./useSuckersNativeTokenSurplus";

const mocks = vi.hoisted(() => ({
  chainId: 10 as number | undefined,
  version: 6,
  pairs: [{ peerChainId: 1, projectId: 11n }] as {
    peerChainId: number;
    projectId: bigint;
  }[],
  suckerLoading: false,
  suckerError: false,
  queryLoading: false,
  queryError: false,
  useQuery: vi.fn(),
  getPrimaryNativeTerminal: vi.fn(),
  getContract: vi.fn(),
  currentSurplusOf: vi.fn(),
  getClient: vi.fn(),
}));

vi.mock("@bananapus/nana-sdk-core", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@bananapus/nana-sdk-core")>()),
  getPrimaryNativeTerminal: mocks.getPrimaryNativeTerminal,
}));
vi.mock("viem", async (importOriginal) => ({
  ...(await importOriginal<typeof import("viem")>()),
  getContract: mocks.getContract,
}));
vi.mock("wagmi", () => ({
  useConfig: () => ({ getClient: mocks.getClient }),
}));
vi.mock("wagmi/query", () => ({ useQuery: mocks.useQuery }));
vi.mock("../../contexts/JBChainContext/JBChainContext", () => ({
  useJBChainId: () => mocks.chainId,
}));
vi.mock("../../contexts/JBContractContext/JBContractContext", () => ({
  useJBContractContext: () => ({ projectId: 7n, version: mocks.version }),
}));
vi.mock("../suckers/useSuckers", () => ({
  useSuckers: () => ({
    data: mocks.pairs,
    isLoading: mocks.suckerLoading,
    isError: mocks.suckerError,
  }),
}));

const terminal = "0x1111111111111111111111111111111111111111" as const;

describe("useSuckersNativeTokenSurplus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.chainId = 10;
    mocks.version = 6;
    mocks.pairs = [{ peerChainId: 1, projectId: 11n }];
    mocks.suckerLoading = false;
    mocks.suckerError = false;
    mocks.queryLoading = false;
    mocks.queryError = false;
    mocks.getPrimaryNativeTerminal.mockResolvedValue(terminal);
    mocks.currentSurplusOf.mockResolvedValue(100n);
    mocks.getContract.mockReturnValue({
      read: { currentSurplusOf: mocks.currentSurplusOf },
    });
    mocks.useQuery.mockImplementation((config) => ({
      ...config,
      data: undefined,
      isLoading: mocks.queryLoading,
      isError: mocks.queryError,
    }));
  });

  test("uses the V6 token-address overload on each peer terminal", async () => {
    useSuckersNativeTokenSurplus();
    const config = mocks.useQuery.mock.calls[0][0];

    expect(config.queryKey).toEqual([
      "suckersNativeTokenSurplus",
      "7",
      "10",
      6,
      "1",
    ]);
    await expect(config.queryFn()).resolves.toEqual([
      { surplus: 100n, chainId: 1, projectId: 11n },
    ]);
    expect(mocks.getContract.mock.calls[0][0].abi).toBe(jbMultiTerminalAbi);
    expect(mocks.currentSurplusOf).toHaveBeenCalledWith([
      11n,
      [NATIVE_TOKEN],
      BigInt(NATIVE_TOKEN_DECIMALS),
      BigInt(ETH_CURRENCY_ID),
    ]);
  });

  test("uses the legacy accounting-context overload on V5", async () => {
    mocks.version = 5;
    useSuckersNativeTokenSurplus();
    await mocks.useQuery.mock.calls[0][0].queryFn();

    expect(mocks.getContract.mock.calls[0][0].abi).toBe(jbMultiTerminalV5Abi);
    expect(mocks.currentSurplusOf).toHaveBeenCalledWith([
      11n,
      [
        {
          token: NATIVE_TOKEN,
          decimals: NATIVE_TOKEN_DECIMALS,
          currency: ETH_CURRENCY_ID,
        },
      ],
      BigInt(NATIVE_TOKEN_DECIMALS),
      BigInt(ETH_CURRENCY_ID),
    ]);
  });

  test("short-circuits missing-chain and empty-peer states and combines status", async () => {
    mocks.chainId = undefined;
    useSuckersNativeTokenSurplus();
    await expect(mocks.useQuery.mock.calls[0][0].queryFn()).resolves.toBeNull();

    vi.clearAllMocks();
    mocks.chainId = 10;
    mocks.pairs = [];
    mocks.suckerLoading = true;
    mocks.suckerError = true;
    mocks.useQuery.mockImplementation((config) => ({
      ...config,
      data: [],
      isLoading: false,
      isError: false,
    }));
    const result = useSuckersNativeTokenSurplus();
    await expect(mocks.useQuery.mock.calls[0][0].queryFn()).resolves.toEqual(
      [],
    );
    expect(result.isLoading).toBe(true);
    expect(result.isError).toBe(true);
    expect(mocks.getContract).not.toHaveBeenCalled();
  });
});
