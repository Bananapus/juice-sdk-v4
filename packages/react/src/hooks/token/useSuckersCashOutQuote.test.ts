import {
  ETH_CURRENCY_ID,
  NATIVE_TOKEN_DECIMALS,
  applyJbDaoCashOutFee,
  getProjectTerminalStore,
  jbTerminalStoreAbi,
  jbTerminalStoreV5Abi,
} from "@bananapus/nana-sdk-core";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useSuckersCashOutQuote } from "./useSuckersCashOutQuote";

const mocks = vi.hoisted(() => ({
  chainId: 10 as number | undefined,
  version: 6,
  pairs: [
    { peerChainId: 1, projectId: 11n },
    { peerChainId: 10, projectId: 22n },
  ] as { peerChainId: number; projectId: bigint }[],
  suckersLoading: false,
  suckersError: undefined as Error | undefined,
  queryData: 1_000n as bigint | undefined,
  queryLoading: false,
  queryError: undefined as Error | undefined,
  useQuery: vi.fn(),
  reclaimable: vi.fn(),
  getContract: vi.fn(),
  getClient: vi.fn(),
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
    isLoading: mocks.suckersLoading,
    error: mocks.suckersError,
  }),
}));

describe("useSuckersCashOutQuote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.chainId = 10;
    mocks.version = 6;
    mocks.pairs = [
      { peerChainId: 1, projectId: 11n },
      { peerChainId: 10, projectId: 22n },
    ];
    mocks.suckersLoading = false;
    mocks.suckersError = undefined;
    mocks.queryData = 1_000n;
    mocks.queryLoading = false;
    mocks.queryError = undefined;
    mocks.reclaimable.mockResolvedValueOnce(100n).mockResolvedValueOnce(200n);
    mocks.getContract.mockReturnValue({
      read: { currentReclaimableSurplusOf: mocks.reclaimable },
    });
    mocks.useQuery.mockImplementation((config) => ({
      ...config,
      data: mocks.queryData,
      isLoading: mocks.queryLoading,
      error: mocks.queryError,
    }));
  });

  test("sums canonical V6 reclaimable-surplus reads and applies the DAO fee", async () => {
    const result = useSuckersCashOutQuote(500n);
    const config = mocks.useQuery.mock.calls[0][0];

    expect(config.queryKey).toEqual([
      "suckersTokenRedemptionQuote",
      "7",
      "10",
      6,
      "500",
      "1,10",
    ]);
    expect(config.enabled).toBe(true);
    await expect(config.queryFn()).resolves.toBe(300n);
    expect(mocks.getContract).toHaveBeenNthCalledWith(1, {
      address: getProjectTerminalStore(1, 6),
      abi: jbTerminalStoreAbi,
      client: undefined,
    });
    expect(mocks.reclaimable).toHaveBeenCalledWith([
      11n,
      500n,
      [],
      [],
      BigInt(NATIVE_TOKEN_DECIMALS),
      BigInt(ETH_CURRENCY_ID),
    ]);
    expect(result.data).toBe(applyJbDaoCashOutFee(1_000n));
    expect(result.isLoading).toBe(false);
    expect(result.errors).toEqual([]);
  });

  test("selects the legacy tuple ABI and combines upstream query state", async () => {
    const suckerError = new Error("index failed");
    const quoteError = new Error("RPC failed");
    mocks.version = 5;
    mocks.pairs = [{ peerChainId: 1, projectId: 11n }];
    mocks.suckersLoading = true;
    mocks.suckersError = suckerError;
    mocks.queryLoading = true;
    mocks.queryError = quoteError;
    mocks.reclaimable.mockReset().mockResolvedValue(100n);

    const result = useSuckersCashOutQuote(500n);
    await expect(mocks.useQuery.mock.calls[0][0].queryFn()).resolves.toBe(100n);
    expect(mocks.getContract.mock.calls[0][0].abi).toBe(jbTerminalStoreV5Abi);
    expect(result.isLoading).toBe(true);
    expect(result.errors).toEqual([suckerError, quoteError]);
  });

  test("disables and short-circuits the quote without a selected chain", async () => {
    mocks.chainId = undefined;
    const result = useSuckersCashOutQuote(500n);
    const config = mocks.useQuery.mock.calls[0][0];

    expect(config.enabled).toBe(false);
    await expect(config.queryFn()).resolves.toBeNull();
    expect(mocks.getContract).not.toHaveBeenCalled();
    expect(result.data).toBe(applyJbDaoCashOutFee(1_000n));
  });
});
