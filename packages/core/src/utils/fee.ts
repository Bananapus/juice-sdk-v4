/**
 * Net a token amount of the full 2.5% protocol cash-out fee, using the
 * contract's exact arithmetic: `amount - amount / 40` (floor division — NOT
 * `× 975 / 1000`, which can differ by 1 wei and break an exact minimum).
 *
 * @deprecated Use `cashOutProtocolFee` from
 * `@bananapus/nana-sdk-core/v6/cash-out` instead. The protocol fee is
 * CONDITIONAL: with a non-zero cash-out tax rate every cash out pays it, but
 * zero-tax cash outs pay it only on `min(reclaimAmount, feeFreeSurplusOf)`,
 * and feeless beneficiaries pay none. This helper unconditionally deducts the
 * full fee and therefore under-states zero-tax quotes.
 */
export function applyJbDaoCashOutFee(tokenAmountWei: bigint) {
  return tokenAmountWei - tokenAmountWei / 40n;
}
