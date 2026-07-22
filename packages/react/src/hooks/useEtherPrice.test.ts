import { beforeEach, describe, expect, test, vi } from "vitest";
import { useEtherPrice } from "./useEtherPrice";

const mocks = vi.hoisted(() => ({ useQuery: vi.fn() }));

vi.mock("wagmi/query", () => ({ useQuery: mocks.useQuery }));

describe("useEtherPrice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useQuery.mockImplementation((config) => config);
  });

  test("uses a stable key, five-minute freshness, and the public price route", async () => {
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
      queryFn: () => Promise<number>;
    };

    expect(query.queryKey).toEqual(["juice-sdk", "etherPrice"]);
    expect(query.staleTime).toBe(300_000);
    await expect(query.queryFn()).resolves.toBe(3_456.78);
    expect(fetch).toHaveBeenCalledWith(
      "https://juicebox.money/api/juicebox/prices/ethusd",
    );
  });
});
