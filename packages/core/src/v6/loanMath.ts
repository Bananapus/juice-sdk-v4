/**
 * The denominator for REVLoans fee percents: prepaid fee percents and source fee percents
 * are expressed out of 1000.
 */
export const LOANS_MAX_FEE = 1000n;

/**
 * The minimum `prepaidFeePercent` REVLoans accepts when borrowing: 25 of
 * {@link LOANS_MAX_FEE} (2.5%), paid upfront to the source revnet.
 */
export const MIN_PREPAID_FEE_PERCENT = 25n;

/** The largest prepaid source fee REVLoans accepts: 500 / 1000 = 50%. */
export const MAX_PREPAID_FEE_PERCENT = 500n;

/** The upfront fee REVLoans routes to the $REV revnet on every borrow: 1%. */
export const REV_PREPAID_FEE_PERCENT = 10n;

export interface LoanOpeningAmounts {
  grossBorrowAmount: bigint;
  protocolFee: bigint;
  revFee: bigint;
  sourceFee: bigint;
  netBorrowAmount: bigint;
}

/**
 * Calculate spendable loan proceeds using the contracts' floor-rounded fee arithmetic.
 */
export function loanOpeningAmounts({
  grossBorrowAmount,
  prepaidSourceFeePercent = MIN_PREPAID_FEE_PERCENT,
  protocolFeeApplies = true,
  revFeeApplies = true,
}: {
  grossBorrowAmount: bigint;
  prepaidSourceFeePercent?: bigint;
  protocolFeeApplies?: boolean;
  revFeeApplies?: boolean;
}): LoanOpeningAmounts {
  if (grossBorrowAmount < 0n) {
    throw new Error("grossBorrowAmount cannot be negative.");
  }
  if (
    prepaidSourceFeePercent < MIN_PREPAID_FEE_PERCENT ||
    prepaidSourceFeePercent > MAX_PREPAID_FEE_PERCENT
  ) {
    throw new Error(
      `prepaidSourceFeePercent must be between ${MIN_PREPAID_FEE_PERCENT} and ${MAX_PREPAID_FEE_PERCENT}.`,
    );
  }
  const protocolFee = protocolFeeApplies ? grossBorrowAmount / 40n : 0n;
  const revFee = revFeeApplies
    ? (grossBorrowAmount * REV_PREPAID_FEE_PERCENT) / LOANS_MAX_FEE
    : 0n;
  const sourceFee =
    (grossBorrowAmount * prepaidSourceFeePercent) / LOANS_MAX_FEE;
  const totalFees = protocolFee + revFee + sourceFee;
  return {
    grossBorrowAmount,
    protocolFee,
    revFee,
    sourceFee,
    netBorrowAmount:
      grossBorrowAmount > totalFees ? grossBorrowAmount - totalFees : 0n,
  };
}

/** Convenience accessor for {@link loanOpeningAmounts}. */
export function netLoanProceeds(
  grossBorrowAmount: bigint,
  prepaidSourceFeePercent = MIN_PREPAID_FEE_PERCENT,
): bigint {
  return loanOpeningAmounts({
    grossBorrowAmount,
    prepaidSourceFeePercent,
  }).netBorrowAmount;
}
