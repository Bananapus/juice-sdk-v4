/**
 * The 721 tier price math, apart from the hook readers in `./nft.ts` (which
 * re-exports it), so a page that only prices tiers loads none of their ABIs.
 */

/**
 * JB721TiersHookStore's `DISCOUNT_DENOMINATOR`: a tier's `discountPercent` is
 * out of 200, so the shopper-facing "% off" is `discountPercent / 2`.
 */
export const DISCOUNT_DENOMINATOR = 200n;

/**
 * A tier's effective (discounted) price, matching the on-chain formula in
 * JB721TiersHookStore: `price - mulDiv(price, discountPercent, 200)` with
 * integer-floor division.
 *
 * @param price The tier's full (undiscounted) price.
 * @param discountPercent The tier's discount, out of 200 (`DISCOUNT_DENOMINATOR`).
 */
export function effectiveTierPrice(
  price: bigint,
  discountPercent: number | bigint,
): bigint {
  let discount = BigInt(discountPercent);
  if (discount <= 0n) return price;
  if (discount > DISCOUNT_DENOMINATOR) discount = DISCOUNT_DENOMINATOR;
  return price - (price * discount) / DISCOUNT_DENOMINATOR;
}
