// The maximum fee percent
const MAX_PREPAID_FEE_PERCENT_BIGINT = 500n;

// Minimum prepaid fee value allowed by the contract
const MIN_PREPAID_FEE = 25n;

// The divisor (max months) as a BigInt for the calculation.
const MAX_PREPAYMENT_MONTHS_BIGINT = 120n;

export function calcPrepaidFee(monthsToPrePay: number): bigint {
  const calcd =
    (BigInt(monthsToPrePay) * MAX_PREPAID_FEE_PERCENT_BIGINT) /
      MAX_PREPAYMENT_MONTHS_BIGINT +
    MIN_PREPAID_FEE;

  if (calcd < MIN_PREPAID_FEE) {
    return MIN_PREPAID_FEE;
  } else if (calcd > MAX_PREPAID_FEE_PERCENT_BIGINT) {
    return MAX_PREPAID_FEE_PERCENT_BIGINT;
  } else {
    return calcd;
  }
}
