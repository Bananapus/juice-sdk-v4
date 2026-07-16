/**
 * The Juicebox protocol fee, as a decimal fraction: 2.5%.
 *
 * Applies to payouts sent outside the protocol and to cash outs from rulesets with a
 * non-zero cash out tax rate.
 */
export const PROTOCOL_FEE_PERCENT = 0.025;

/**
 * The standard protocol fee expressed out of {@link MAX_FEE}: 25 / 1000 = 2.5%.
 *
 * @link JBMultiTerminal.sol `FEE`
 */
export const STANDARD_FEE = 25n;

/**
 * The denominator for {@link STANDARD_FEE}-style fee percents.
 */
export const MAX_FEE = 1000n;

/**
 * The standard 2.5% protocol fee expressed per billion (out of 1e9), for legacy-style
 * fixed-point math: 25_000_000 / 1_000_000_000 = 2.5%.
 */
export const TERMINAL_FEE_PER_BILLION = 25_000_000n;

/**
 * The per-billion fee denominator (1e9).
 */
const PER_BILLION = 1_000_000_000n;

/**
 * The fee taken from `amount`, rounded down.
 *
 * @param amount The gross amount the fee is taken from.
 * @param feePerBillion The fee rate out of 1e9. Defaults to the standard 2.5% protocol
 * fee ({@link TERMINAL_FEE_PER_BILLION}).
 * @returns The fee, in the same fixed-point representation as `amount`.
 */
export function feeForAmount(
  amount: bigint,
  feePerBillion: bigint = TERMINAL_FEE_PER_BILLION,
): bigint {
  return (amount * feePerBillion) / PER_BILLION;
}

/**
 * The amount left over once the fee has been taken from `amount`.
 *
 * Guaranteed to satisfy `amountAfterFee(x) + feeForAmount(x) === x`.
 *
 * @param amount The gross amount the fee is taken from.
 * @param feePerBillion The fee rate out of 1e9. Defaults to the standard 2.5% protocol
 * fee ({@link TERMINAL_FEE_PER_BILLION}).
 * @returns The net amount after the fee.
 */
export function amountAfterFee(
  amount: bigint,
  feePerBillion: bigint = TERMINAL_FEE_PER_BILLION,
): bigint {
  return amount - feeForAmount(amount, feePerBillion);
}
