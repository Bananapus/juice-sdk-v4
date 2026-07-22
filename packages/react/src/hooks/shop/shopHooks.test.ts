import { beforeEach, describe, expect, test, vi } from "vitest";
import { useOwnedShopItems } from "./useOwnedShopItems";
import { useShopPurchases } from "./useShopPurchases";
import {
  OwnedShopItemsDocument,
  ShopPurchasesDocument,
} from "../../lib/bendystraw/queries/shop";

const mocks = vi.hoisted(() => ({
  chainId: 10 as number | undefined,
  projectId: 7n,
  version: 6,
  query: vi.fn(),
}));

vi.mock("react", () => ({ useMemo: <T>(factory: () => T) => factory() }));
vi.mock("../../contexts/JBChainContext/JBChainContext", () => ({
  useJBChainId: () => mocks.chainId,
}));
vi.mock("../../contexts/JBContractContext/JBContractContext", () => ({
  useJBContractContext: () => ({
    projectId: mocks.projectId,
    version: mocks.version,
  }),
}));
vi.mock("../../lib/bendystraw/useBendystrawQuery", () => ({
  useBendystrawQuery: mocks.query,
}));

describe("shop hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.chainId = 10;
    mocks.projectId = 7n;
    mocks.version = 6;
  });

  test("normalizes owned NFTs and scopes the query to the exact project owner", () => {
    mocks.query.mockReturnValue({
      data: {
        nfts: {
          totalCount: 1,
          items: [
            {
              chainId: "10",
              projectId: "7",
              createdAt: "123",
              mintTx: "0xabc",
              hook: {
                address: "0x1111111111111111111111111111111111111111",
              },
              tokenId: 42n,
              owner: "0xAABB",
              tierId: "3",
            },
          ],
        },
      },
      isLoading: false,
    });

    const result = useOwnedShopItems({
      owner: "0xAABB",
      limit: 25,
      offset: 50,
    });

    expect(mocks.query).toHaveBeenCalledWith(
      OwnedShopItemsDocument,
      {
        where: {
          projectId: 7,
          chainId: 10,
          version: 6,
          owner: "0xaabb",
        },
        limit: 25,
        offset: 50,
      },
      { enabled: true },
    );
    expect(result).toEqual({
      data: [
        {
          chainId: 10,
          projectId: 7,
          createdAt: 123,
          mintTx: "0xabc",
          hook: "0x1111111111111111111111111111111111111111",
          tokenId: "42",
          owner: "0xaabb",
          tierId: 3,
        },
      ],
      totalCount: 1,
      isLoading: false,
    });
  });

  test("disables owned-item reads until chain, project, and owner exist", () => {
    mocks.chainId = undefined;
    mocks.projectId = 0n;
    mocks.query.mockReturnValue({ data: undefined });

    const result = useOwnedShopItems({ owner: undefined });

    expect(mocks.query.mock.calls[0][1]).toEqual(
      expect.objectContaining({ limit: 100, offset: 0 }),
    );
    expect(mocks.query.mock.calls[0][2]).toEqual({ enabled: false });
    expect(result.data).toBeUndefined();
    expect(result.totalCount).toBeUndefined();
  });

  test("normalizes purchases and applies an optional beneficiary filter", () => {
    mocks.query.mockReturnValue({
      data: {
        mintNftEvents: {
          totalCount: 1,
          items: [
            {
              chainId: "10",
              projectId: "7",
              timestamp: "123",
              tierId: "3",
              tokenId: 42n,
              totalAmountPaid: 500n,
              beneficiary: "0xAABB",
            },
          ],
        },
      },
      isFetching: false,
    });

    const result = useShopPurchases({
      beneficiary: "0xAABB",
      limit: 20,
      offset: 40,
    });

    expect(mocks.query).toHaveBeenCalledWith(
      ShopPurchasesDocument,
      {
        where: {
          projectId: 7,
          chainId: 10,
          version: 6,
          beneficiary: "0xaabb",
        },
        limit: 20,
        offset: 40,
      },
      { enabled: true },
    );
    expect(result.data).toEqual([
      {
        chainId: 10,
        projectId: 7,
        timestamp: 123,
        tierId: 3,
        tokenId: "42",
        totalAmountPaid: "500",
        beneficiary: "0xAABB",
      },
    ]);
    expect(result.totalCount).toBe(1);
  });

  test("omits the beneficiary filter and honors an explicit disable", () => {
    mocks.query.mockReturnValue({ data: undefined });
    useShopPurchases({ enabled: false });

    expect(mocks.query.mock.calls[0][1].where).not.toHaveProperty(
      "beneficiary",
    );
    expect(mocks.query.mock.calls[0][2]).toEqual({ enabled: false });
  });
});
