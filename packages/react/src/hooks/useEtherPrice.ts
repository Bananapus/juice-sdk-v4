import { useQuery, UseQueryReturnType } from "wagmi/query";

/**
 * Chainlink feed doesn't tend to up date that quickly.
 * Refresh every 5 minutes.
 */
const PRICE_REFRESH_INTERVAL = 60 * 1000 * 5; // 5 minutes

/**
 * The default price route. It is one deployment's public API, not a protocol
 * endpoint — pass `endpoint` to read the price from somewhere else.
 */
export const DEFAULT_ETHER_PRICE_ENDPOINT =
  "https://juicebox.money/api/juicebox/prices/ethusd";

/**
 * Return the current price of ETH in USD.
 * @example 1234.69
 */
export function useEtherPrice({
  endpoint = DEFAULT_ETHER_PRICE_ENDPOINT,
}: { endpoint?: string } = {}): UseQueryReturnType<number> {
  return useQuery({
    queryKey: ["juice-sdk", "etherPrice", endpoint],
    queryFn: async () => {
      const response = await fetch(endpoint);
      // Without this an error page's body parses as `{}` and the price reads
      // as `undefined`, which downstream becomes a $0 valuation.
      if (!response.ok) {
        throw new Error(`Ether price request failed (${response.status}).`);
      }
      const { price } = (await response.json()) as { price: number };
      return price;
    },
    staleTime: PRICE_REFRESH_INTERVAL,
    // `staleTime` alone only marks the price stale; nothing refetches it on a
    // page that stays mounted, so the quoted price silently ages.
    refetchInterval: PRICE_REFRESH_INTERVAL,
  });
}
