import {
  NATIVE_TOKEN,
  getProjectTerminalStore,
  jbTerminalStoreAbi,
} from "@bananapus/nana-sdk-core";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useSuckersNativeTokenBalance } from "./useSuckersNativeTokenBalance";

const mocks = vi.hoisted(() => ({
  chainId: 10 as number | undefined,
  pairs: [
    { peerChainId: 1, projectId: 11n },
    { peerChainId: 10, projectId: 22n },
  ] as { peerChainId: number; projectId: bigint }[],
  suckerLoading: false,
  suckerError: false,
  queryLoading: false,
  queryError: false,
  useQuery: vi.fn(),
  getPrimaryNativeTerminal: vi.fn(),
  getContract: vi.fn(),
  balanceOf: vi.fn(),
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
  useJBContractContext: () => ({ projectId: 7n, version: 6 }),
}));
vi.mock("../suckers/useSuckers", () => ({
  useSuckers: () => ({
    data: mocks.pairs,
    isLoading: mocks.suckerLoading,
    isError: mocks.suckerError,
  }),
}));

const terminal = "0x1111111111111111111111111111111111111111" as const;

describe("useSuckersNativeTokenBalance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.chainId = 10;
    mocks.pairs = [
      { peerChainId: 1, projectId: 11n },
      { peerChainId: 10, projectId: 22n },
    ];
    mocks.suckerLoading = false;
    mocks.suckerError = false;
    mocks.queryLoading = false;
    mocks.queryError = false;
    mocks.getPrimaryNativeTerminal.mockResolvedValue(terminal);
    mocks.balanceOf.mockResolvedValueOnce(100n).mockResolvedValueOnce(200n);
    mocks.getContract.mockReturnValue({
      read: { balanceOf: mocks.balanceOf },
    });
    mocks.useQuery.mockImplementation((config) => ({
      ...config,
      data: undefined,
      isLoading: mocks.queryLoading,
      isError: mocks.queryError,
    }));
  });

  test("reads each peer terminal's native-token accounting balance", async () => {
    const result = useSuckersNativeTokenBalance();
    const config = mocks.useQuery.mock.calls[0][0];

    expect(config.queryKey).toEqual([
      "suckersNativeTokenBalance",
      "7",
      "10",
      "1,10",
    ]);
    await expect(config.queryFn()).resolves.toEqual([
      { balance: 100n, chainId: 1, projectId: 11n },
      { balance: 200n, chainId: 10, projectId: 22n },
    ]);
    expect(mocks.getPrimaryNativeTerminal).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      1,
      11n,
      6,
    );
    expect(mocks.getContract).toHaveBeenNthCalledWith(1, {
      address: getProjectTerminalStore(1, 6),
      abi: jbTerminalStoreAbi,
      client: undefined,
    });
    expect(mocks.balanceOf).toHaveBeenNthCalledWith(1, [
      terminal,
      11n,
      NATIVE_TOKEN,
    ]);
    expect(result).toEqual({
      data: undefined,
      isLoading: false,
      isError: false,
    });
  });

  test("short-circuits missing-chain and empty-peer states", async () => {
    mocks.chainId = undefined;
    useSuckersNativeTokenBalance();
    await expect(mocks.useQuery.mock.calls[0][0].queryFn()).resolves.toBeNull();

    vi.clearAllMocks();
    mocks.chainId = 10;
    mocks.pairs = [];
    mocks.useQuery.mockImplementation((config) => ({
      ...config,
      data: [],
      isLoading: true,
      isError: true,
    }));
    const result = useSuckersNativeTokenBalance();
    await expect(mocks.useQuery.mock.calls[0][0].queryFn()).resolves.toEqual(
      [],
    );
    expect(result.isLoading).toBe(true);
    expect(result.isError).toBe(true);
    expect(mocks.getContract).not.toHaveBeenCalled();
  });
});
