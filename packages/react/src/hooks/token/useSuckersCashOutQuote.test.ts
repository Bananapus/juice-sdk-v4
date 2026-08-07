import {
  applyJbDaoCashOutFee,
  getJBContractAddress,
  getProjectTerminalStore,
  JBCoreContracts,
  jbController4_1Abi,
  jbControllerAbi,
  jbControllerV5Abi,
  jbDirectoryAbi,
  jbTerminalStoreAbi,
  jbTerminalStoreV5Abi,
} from "@bananapus/nana-sdk-core";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useSuckersCashOutQuote } from "./useSuckersCashOutQuote";

const CONTROLLER = "0xc000000000000000000000000000000000000001";

const mocks = vi.hoisted(() => ({
  chainId: 10 as number | undefined,
  version: 6,
  pairs: [
    { peerChainId: 1, projectId: 11n },
    { peerChainId: 10, projectId: 22n },
  ] as { peerChainId: number; projectId: bigint }[],
  suckersLoading: false,
  suckersError: undefined as Error | undefined,
  queryData: 1_000n as bigint | null | undefined,
  queryLoading: false,
  queryError: undefined as Error | undefined,
  useQuery: vi.fn(),
  currentTotalSurplusOf: vi.fn(),
  controllerOf: vi.fn(),
  totalTokenSupplyWithReservedTokensOf: vi.fn(),
  currentRulesetOf: vi.fn(),
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
    mocks.currentTotalSurplusOf.mockImplementation(async ([projectId]) =>
      projectId === 11n ? 100n : 200n,
    );
    mocks.controllerOf.mockResolvedValue(CONTROLLER);
    mocks.totalTokenSupplyWithReservedTokensOf.mockImplementation(
      async ([projectId]) => (projectId === 11n ? 1_000n : 500n),
    );
    mocks.currentRulesetOf.mockResolvedValue([{}, { cashOutTaxRate: 0n }]);
    mocks.getContract.mockImplementation(() => ({
      read: {
        currentTotalSurplusOf: mocks.currentTotalSurplusOf,
        controllerOf: mocks.controllerOf,
        totalTokenSupplyWithReservedTokensOf:
          mocks.totalTokenSupplyWithReservedTokensOf,
        currentRulesetOf: mocks.currentRulesetOf,
      },
    }));
    mocks.useQuery.mockImplementation((config) => ({
      ...config,
      data: mocks.queryData,
      isLoading: mocks.queryLoading,
      error: mocks.queryError,
    }));
  });

  test("quotes against the group's aggregate surplus and supply on V6", async () => {
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

    // Σsurplus = 300, Σsupply = 1,500: 500 tokens reclaim 300 * 500 / 1,500.
    await expect(config.queryFn()).resolves.toBe(100n);

    // The V6 quote runs in V6's own token-keyed native currency (61166), not
    // the V4/V5 ETH currency id (1).
    expect(mocks.currentTotalSurplusOf).toHaveBeenCalledWith([
      11n,
      18n,
      61_166n,
    ]);
    expect(mocks.currentTotalSurplusOf).toHaveBeenCalledWith([
      22n,
      18n,
      61_166n,
    ]);
    expect(mocks.totalTokenSupplyWithReservedTokensOf).toHaveBeenCalledWith([
      11n,
    ]);
    expect(mocks.totalTokenSupplyWithReservedTokensOf).toHaveBeenCalledWith([
      22n,
    ]);
    // The tax rate comes from the current chain's ruleset for the project in
    // context.
    expect(mocks.currentRulesetOf).toHaveBeenCalledWith([7n]);

    expect(mocks.getContract).toHaveBeenCalledWith({
      address: getProjectTerminalStore(1, 6),
      abi: jbTerminalStoreAbi,
      client: undefined,
    });
    expect(mocks.getContract).toHaveBeenCalledWith({
      address: getJBContractAddress(JBCoreContracts.JBDirectory, 6, 1),
      abi: jbDirectoryAbi,
      client: undefined,
    });
    expect(mocks.getContract).toHaveBeenCalledWith({
      address: CONTROLLER,
      abi: jbControllerAbi,
      client: undefined,
    });

    expect(result.data).toBe(applyJbDaoCashOutFee(1_000n));
    expect(result.isLoading).toBe(false);
    expect(result.errors).toEqual([]);
  });

  test("applies the cash-out tax curve and legacy ABIs on V5", async () => {
    const suckerError = new Error("index failed");
    const quoteError = new Error("RPC failed");
    mocks.version = 5;
    mocks.pairs = [{ peerChainId: 1, projectId: 11n }];
    mocks.suckersLoading = true;
    mocks.suckersError = suckerError;
    mocks.queryData = undefined;
    mocks.queryLoading = true;
    mocks.queryError = quoteError;
    mocks.currentRulesetOf.mockResolvedValue([{}, { cashOutTaxRate: 5_000n }]);

    const result = useSuckersCashOutQuote(500n);

    // base = 100 * 500 / 1,000 = 50; y = 50 * (5,000 + 2,500) / 10,000 = 37.
    await expect(mocks.useQuery.mock.calls[0][0].queryFn()).resolves.toBe(37n);

    expect(mocks.currentTotalSurplusOf).toHaveBeenCalledWith([11n, 18n, 1n]);
    expect(mocks.getContract).toHaveBeenCalledWith({
      address: getProjectTerminalStore(1, 5),
      abi: jbTerminalStoreV5Abi,
      client: undefined,
    });
    expect(mocks.getContract).toHaveBeenCalledWith({
      address: CONTROLLER,
      abi: jbControllerV5Abi,
      client: undefined,
    });

    // A missing quote propagates as undefined, never as "worth 0".
    expect(result.data).toBeUndefined();
    expect(result.isLoading).toBe(true);
    expect(result.errors).toEqual([suckerError, quoteError]);
  });

  test("selects the V4 controller ABI", async () => {
    mocks.version = 4;
    mocks.pairs = [{ peerChainId: 1, projectId: 11n }];

    useSuckersCashOutQuote(500n);
    await expect(mocks.useQuery.mock.calls[0][0].queryFn()).resolves.toBe(50n);

    expect(mocks.currentTotalSurplusOf).toHaveBeenCalledWith([11n, 18n, 1n]);
    expect(mocks.getContract).toHaveBeenCalledWith({
      address: CONTROLLER,
      abi: jbController4_1Abi,
      client: undefined,
    });
  });

  test("falls back to the current chain when no sucker pairs resolve", async () => {
    mocks.pairs = [];
    mocks.currentTotalSurplusOf.mockResolvedValue(300n);
    mocks.totalTokenSupplyWithReservedTokensOf.mockResolvedValue(1_500n);

    useSuckersCashOutQuote(500n);
    await expect(mocks.useQuery.mock.calls[0][0].queryFn()).resolves.toBe(100n);

    expect(mocks.currentTotalSurplusOf).toHaveBeenCalledTimes(1);
    expect(mocks.currentTotalSurplusOf).toHaveBeenCalledWith([
      7n,
      18n,
      61_166n,
    ]);
    expect(mocks.getContract).toHaveBeenCalledWith({
      address: getProjectTerminalStore(10, 6),
      abi: jbTerminalStoreAbi,
      client: undefined,
    });
  });

  test("disables and short-circuits the quote without a selected chain", async () => {
    mocks.chainId = undefined;
    mocks.queryData = null;
    const result = useSuckersCashOutQuote(500n);
    const config = mocks.useQuery.mock.calls[0][0];

    expect(config.enabled).toBe(false);
    await expect(config.queryFn()).resolves.toBeNull();
    expect(mocks.getContract).not.toHaveBeenCalled();
    expect(result.data).toBeUndefined();
  });
});
