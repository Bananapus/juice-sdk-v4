import {
  JBCoreContracts,
  JBProjectToken,
  jbTokensAbi,
} from "@bananapus/nana-sdk-core";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useSuckersUserTokenBalance } from "./useSuckersUserTokenBalance";

const mocks = vi.hoisted(() => ({
  chainId: 10 as number | undefined,
  user: "0x1111111111111111111111111111111111111111" as
    | `0x${string}`
    | undefined,
  pairs: [{ peerChainId: 1, projectId: 11n }] as {
    peerChainId: number;
    projectId: bigint;
  }[],
  suckerLoading: false,
  suckerError: false,
  queryLoading: false,
  queryError: false,
  useQuery: vi.fn(),
  readContract: vi.fn(),
  getContract: vi.fn(),
  totalBalanceOf: vi.fn(),
  getClient: vi.fn(),
}));

vi.mock("viem", async (importOriginal) => ({
  ...(await importOriginal<typeof import("viem")>()),
  getContract: mocks.getContract,
}));
vi.mock("wagmi", () => ({
  useAccount: () => ({ address: mocks.user }),
  useConfig: () => ({ getClient: mocks.getClient }),
  useReadContract: mocks.readContract,
}));
vi.mock("wagmi/query", () => ({ useQuery: mocks.useQuery }));
vi.mock("../../contexts/JBChainContext/JBChainContext", () => ({
  useJBChainId: () => mocks.chainId,
}));
vi.mock("../../contexts/JBContractContext/JBContractContext", () => ({
  useJBContractContext: () => ({
    projectId: 7n,
    contractAddress: (_contract: unknown, chainId?: number) =>
      chainId === 1
        ? "0x2222222222222222222222222222222222222222"
        : "0x3333333333333333333333333333333333333333",
  }),
}));
vi.mock("../suckers/useSuckers", () => ({
  useSuckers: () => ({
    data: mocks.pairs,
    isLoading: mocks.suckerLoading,
    isError: mocks.suckerError,
  }),
}));

describe("useSuckersUserTokenBalance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.chainId = 10;
    mocks.user = "0x1111111111111111111111111111111111111111";
    mocks.pairs = [{ peerChainId: 1, projectId: 11n }];
    mocks.suckerLoading = false;
    mocks.suckerError = false;
    mocks.queryLoading = false;
    mocks.queryError = false;
    mocks.readContract.mockImplementation((config) => ({
      data: config.args ? config.query.select(50n) : undefined,
      isLoading: false,
    }));
    mocks.totalBalanceOf.mockResolvedValue(100n);
    mocks.getContract.mockReturnValue({
      read: { totalBalanceOf: mocks.totalBalanceOf },
    });
    mocks.useQuery.mockImplementation((config) => ({
      ...config,
      data: undefined,
      isLoading: mocks.queryLoading,
      isError: mocks.queryError,
    }));
  });

  test("reads peer balances and appends the current chain when absent", async () => {
    const result = useSuckersUserTokenBalance();
    const currentConfig = mocks.readContract.mock.calls[0][0];
    const query = mocks.useQuery.mock.calls[0][0];

    expect(currentConfig).toEqual(
      expect.objectContaining({
        abi: jbTokensAbi,
        functionName: "totalBalanceOf",
        address: "0x3333333333333333333333333333333333333333",
        chainId: 10,
        args: [mocks.user, 7n],
      }),
    );
    expect(currentConfig.query.select(75n)).toBeInstanceOf(JBProjectToken);
    expect(query.queryKey).toEqual([
      "suckersUserTokenBalance",
      "7",
      "10",
      "50",
      "1",
    ]);

    const balances = await query.queryFn();
    expect(balances).toHaveLength(2);
    expect(balances[0]).toEqual({
      balance: expect.any(JBProjectToken),
      chainId: 1,
      projectId: 11n,
    });
    expect(balances[0].balance.value).toBe(100n);
    expect(balances[1]).toEqual({
      balance: expect.any(JBProjectToken),
      chainId: 10,
      projectId: 7n,
    });
    expect(balances[1].balance.value).toBe(50n);
    expect(mocks.getContract).toHaveBeenCalledWith({
      address: "0x2222222222222222222222222222222222222222",
      abi: jbTokensAbi,
      client: undefined,
    });
    expect(mocks.totalBalanceOf).toHaveBeenCalledWith([mocks.user, 11n]);
    expect(result.isLoading).toBe(false);
    expect(result.isError).toBe(false);
  });

  test("does not duplicate the current chain when Bendystraw includes it", async () => {
    mocks.pairs = [
      { peerChainId: 1, projectId: 11n },
      { peerChainId: 10, projectId: 22n },
    ];
    mocks.totalBalanceOf
      .mockResolvedValueOnce(100n)
      .mockResolvedValueOnce(200n);

    useSuckersUserTokenBalance();
    const balances = await mocks.useQuery.mock.calls[0][0].queryFn();

    expect(balances).toHaveLength(2);
    expect(balances.map((entry: { chainId: number }) => entry.chainId)).toEqual(
      [1, 10],
    );
    expect(balances[1].projectId).toBe(22n);
    expect(balances[1].balance.value).toBe(200n);
  });

  test("returns only the current chain when there are no peers", async () => {
    mocks.pairs = [];
    useSuckersUserTokenBalance();
    const balances = await mocks.useQuery.mock.calls[0][0].queryFn();

    expect(balances).toEqual([
      {
        balance: expect.any(JBProjectToken),
        chainId: 10,
        projectId: 7n,
      },
    ]);
    expect(mocks.getContract).not.toHaveBeenCalled();
  });

  test("short-circuits without wallet identity and combines query status", async () => {
    mocks.user = undefined;
    mocks.suckerLoading = true;
    mocks.suckerError = true;
    mocks.queryLoading = true;
    mocks.queryError = true;
    const result = useSuckersUserTokenBalance();

    expect(mocks.readContract.mock.calls[0][0].args).toBeUndefined();
    await expect(mocks.useQuery.mock.calls[0][0].queryFn()).resolves.toBeNull();
    expect(result.isLoading).toBe(true);
    expect(result.isError).toBe(true);
    expect(mocks.getContract).not.toHaveBeenCalled();
  });
});
