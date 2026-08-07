import { beforeEach, describe, expect, test, vi } from "vitest";
import { DEFAULT_ETHER_PRICE_ENDPOINT, useEtherPrice } from "./useEtherPrice";

const mocks = vi.hoisted(() => ({ useQuery: vi.fn() }));

vi.mock("wagmi/query", () => ({ useQuery: mocks.useQuery }));

describe("useEtherPrice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useQuery.mockImplementation((config) => config);
  });

  test("refreshes the default price route every five minutes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ price: 3_456.78 }),
      }),
    );

    const query = useEtherPrice() as unknown as {
      queryKey: string[];
      staleTime: number;
      refetchInterval: number;
      queryFn: () => Promise<number>;
    };

    expect(query.queryKey).toEqual([
      "juice-sdk",
      "etherPrice",
      DEFAULT_ETHER_PRICE_ENDPOINT,
    ]);
    expect(query.staleTime).toBe(300_000);
    expect(query.refetchInterval).toBe(300_000);
    await expect(query.queryFn()).resolves.toBe(3_456.78);
    expect(fetch).toHaveBeenCalledWith(DEFAULT_ETHER_PRICE_ENDPOINT);
  });

  test("reads the price from a configured endpoint, keyed to it", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ price: 1 }),
      }),
    );

    const query = useEtherPrice({
      endpoint: "https://prices.example/ethusd",
    }) as unknown as { queryKey: string[]; queryFn: () => Promise<number> };

    expect(query.queryKey).toContain("https://prices.example/ethusd");
    await query.queryFn();
    expect(fetch).toHaveBeenCalledWith("https://prices.example/ethusd");
  });

  test("treats an error response as a failure, not a zero price", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: vi.fn().mockResolvedValue({}),
      }),
    );

    const query = useEtherPrice() as unknown as {
      queryFn: () => Promise<number>;
    };

    await expect(query.queryFn()).rejects.toThrow(
      "Ether price request failed (503).",
    );
  });
});
