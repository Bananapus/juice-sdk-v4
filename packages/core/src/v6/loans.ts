import { Address, Hex, PublicClient } from "viem";
import { revLoansAbi } from "../generated/juicebox.js";
import { JBChainId } from "../types.js";
import { v6Address } from "./types.js";

/**
 * The denominator for REVLoans fee percents: prepaid fee percents and source fee percents
 * are expressed out of 1000.
 */
export const LOANS_MAX_FEE = 1000n;

/**
 * The minimum `prepaidFeePercent` REVLoans accepts when borrowing: 25 of {@link LOANS_MAX_FEE}
 * (2.5%), paid upfront to the source revnet. Prepaying more than the minimum extends the
 * loan's zero-additional-cost duration; after it expires the repayment cost increases
 * linearly until the loan liquidates at 10 years.
 */
export const MIN_PREPAID_FEE_PERCENT = 25n;

/**
 * The upfront fee REVLoans routes to the $REV revnet on every borrow: 10 of
 * {@link LOANS_MAX_FEE} (1%), taken in addition to the prepaid fee.
 */
export const REV_PREPAID_FEE_PERCENT = 10n;

/**
 * The JBPermissions permission id apps grant to the REVLoans contract before borrowing
 * against a holder's tokens (v6 ROOT permission id 1). REVLoans needs it to manage the
 * holder's collateral tokens on their behalf.
 */
export const REVLOANS_PERMISSION_ID = 1;

/**
 * A Permit2 single allowance, passed to `repayLoan` when repaying with an ERC-20 via a
 * signed permit. Pass {@link EMPTY_SINGLE_ALLOWANCE} (the default) when repaying with the
 * native token or a pre-approved ERC-20.
 */
export type JBSingleAllowance = {
  sigDeadline: bigint;
  amount: bigint;
  expiration: number;
  nonce: number;
  signature: Hex;
};

/**
 * An empty Permit2 allowance: use when no permit signature is needed (native-token
 * repayments, or ERC-20s already approved to REVLoans).
 */
export const EMPTY_SINGLE_ALLOWANCE: JBSingleAllowance = {
  sigDeadline: 0n,
  amount: 0n,
  expiration: 0,
  nonce: 0,
  signature: "0x",
};

/**
 * Builds a `borrowFrom` transaction on REVLoans, opening a loan against a holder's revnet
 * tokens.
 *
 * The caller must be the holder or have permission to act on their behalf, and the holder
 * must have granted permission id {@link REVLOANS_PERMISSION_ID} to REVLoans.
 *
 * @param args.chainId The chain to borrow on.
 * @param args.revnetId The revnet to borrow from.
 * @param args.token The terminal token to borrow.
 * @param args.minBorrowAmount The minimum amount to borrow, denominated in `token`.
 * Defaults to 0.
 * @param args.collateralCount The number of revnet tokens to lock as collateral, as a
 * fixed point number with 18 decimals.
 * @param args.beneficiary The address that receives the borrowed funds and the loan NFT.
 * @param args.prepaidFeePercent The fee percent to prepay, out of {@link LOANS_MAX_FEE}.
 * Must be at least {@link MIN_PREPAID_FEE_PERCENT}.
 * @param args.holder The address whose tokens are used as collateral.
 */
export function buildBorrowTx({
  chainId,
  revnetId,
  token,
  minBorrowAmount = 0n,
  collateralCount,
  beneficiary,
  prepaidFeePercent,
  holder,
}: {
  chainId: JBChainId;
  revnetId: bigint;
  token: Address;
  minBorrowAmount?: bigint;
  collateralCount: bigint;
  beneficiary: Address;
  prepaidFeePercent: bigint;
  holder: Address;
}): {
  chainId: JBChainId;
  address: Address;
  abi: typeof revLoansAbi;
  functionName: "borrowFrom";
  args: readonly [bigint, Address, bigint, bigint, Address, bigint, Address];
} {
  return {
    chainId,
    address: v6Address("REVLoans", chainId),
    abi: revLoansAbi,
    functionName: "borrowFrom",
    args: [
      revnetId,
      token,
      minBorrowAmount,
      collateralCount,
      beneficiary,
      prepaidFeePercent,
      holder,
    ],
  };
}

/**
 * Builds a `repayLoan` transaction on REVLoans, paying down a loan and reclaiming
 * collateral.
 *
 * Payable: when the loan's source token is the native token, send the repayment as
 * `value`.
 *
 * @param args.chainId The chain the loan lives on.
 * @param args.loanId The id of the loan being repaid (also the loan NFT's token id).
 * @param args.maxRepayBorrowAmount The maximum amount to repay, denominated in the loan's
 * source token. Excess above what's owed is refunded.
 * @param args.collateralCountToReturn The number of collateral tokens to reclaim, as a
 * fixed point number with 18 decimals.
 * @param args.beneficiary The address that receives the reclaimed collateral (and any new
 * loan NFT for a partial repayment).
 * @param args.allowance A Permit2 allowance for ERC-20 repayments. Defaults to
 * {@link EMPTY_SINGLE_ALLOWANCE}.
 * @param args.value The native-token repayment to send along. Defaults to 0.
 */
export function buildRepayLoanTx({
  chainId,
  loanId,
  maxRepayBorrowAmount,
  collateralCountToReturn,
  beneficiary,
  allowance = EMPTY_SINGLE_ALLOWANCE,
  value = 0n,
}: {
  chainId: JBChainId;
  loanId: bigint;
  maxRepayBorrowAmount: bigint;
  collateralCountToReturn: bigint;
  beneficiary: Address;
  allowance?: JBSingleAllowance;
  value?: bigint;
}): {
  chainId: JBChainId;
  address: Address;
  abi: typeof revLoansAbi;
  functionName: "repayLoan";
  args: readonly [bigint, bigint, bigint, Address, JBSingleAllowance];
  value: bigint;
} {
  return {
    chainId,
    address: v6Address("REVLoans", chainId),
    abi: revLoansAbi,
    functionName: "repayLoan",
    args: [
      loanId,
      maxRepayBorrowAmount,
      collateralCountToReturn,
      beneficiary,
      allowance,
    ],
    value,
  };
}

/**
 * Builds a `reallocateCollateralFromLoan` transaction on REVLoans, moving collateral out
 * of an existing loan and into a new loan (optionally adding more collateral and borrowing
 * more).
 *
 * Note: this internally opens a new loan with the full current borrow capacity, so it is
 * economically equivalent to borrowing.
 *
 * @param args.chainId The chain the loan lives on.
 * @param args.loanId The id of the loan to reallocate collateral from.
 * @param args.collateralCountToTransfer The number of collateral tokens to move from the
 * existing loan into the new one, as a fixed point number with 18 decimals.
 * @param args.token The terminal token to borrow with the new loan.
 * @param args.minBorrowAmount The minimum amount the new loan must borrow, denominated in
 * `token`. Defaults to 0.
 * @param args.collateralCountToAdd The number of additional collateral tokens to add to
 * the new loan, as a fixed point number with 18 decimals.
 * @param args.beneficiary The address that receives the borrowed funds and the new loan
 * NFT.
 * @param args.prepaidFeePercent The fee percent to prepay on the new loan, out of
 * {@link LOANS_MAX_FEE}. Must be at least {@link MIN_PREPAID_FEE_PERCENT}.
 */
export function buildReallocateCollateralTx({
  chainId,
  loanId,
  collateralCountToTransfer,
  token,
  minBorrowAmount = 0n,
  collateralCountToAdd,
  beneficiary,
  prepaidFeePercent,
}: {
  chainId: JBChainId;
  loanId: bigint;
  collateralCountToTransfer: bigint;
  token: Address;
  minBorrowAmount?: bigint;
  collateralCountToAdd: bigint;
  beneficiary: Address;
  prepaidFeePercent: bigint;
}): {
  chainId: JBChainId;
  address: Address;
  abi: typeof revLoansAbi;
  functionName: "reallocateCollateralFromLoan";
  args: readonly [bigint, bigint, Address, bigint, bigint, Address, bigint];
} {
  return {
    chainId,
    address: v6Address("REVLoans", chainId),
    abi: revLoansAbi,
    functionName: "reallocateCollateralFromLoan",
    args: [
      loanId,
      collateralCountToTransfer,
      token,
      minBorrowAmount,
      collateralCountToAdd,
      beneficiary,
      prepaidFeePercent,
    ],
  };
}

/**
 * Reads how much a given collateral count can borrow from a revnet, via
 * `REVLoans.borrowableAmountFrom`.
 *
 * @param client A viem PublicClient connected to `chainId`.
 * @param args.chainId The chain to read on.
 * @param args.revnetId The revnet to borrow from.
 * @param args.collateralCount The number of revnet tokens that would be locked as
 * collateral, as a fixed point number with 18 decimals.
 * @param args.decimals The decimals the returned amounts should be denominated in.
 * @param args.currency The currency the returned amounts should be denominated in.
 * @returns `borrowableNow` (currently borrowable, net of the revnet's cash-out delay) and
 * `borrowableCapacity` (the full capacity the collateral represents).
 */
export async function getBorrowableAmount(
  client: PublicClient,
  {
    chainId,
    revnetId,
    collateralCount,
    decimals,
    currency,
  }: {
    chainId: JBChainId;
    revnetId: bigint;
    collateralCount: bigint;
    decimals: bigint;
    currency: bigint;
  }
): Promise<{ borrowableNow: bigint; borrowableCapacity: bigint }> {
  const [borrowableNow, borrowableCapacity] = await client.readContract({
    address: v6Address("REVLoans", chainId),
    abi: revLoansAbi,
    functionName: "borrowableAmountFrom",
    args: [revnetId, collateralCount, decimals, currency],
  });

  return { borrowableNow, borrowableCapacity };
}
