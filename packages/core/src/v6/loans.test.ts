import { describe, expect, test, vi } from "vitest";
import { PublicClient, decodeFunctionData, encodeFunctionData } from "viem";
import { revLoansAbi } from "../generated/juicebox.js";
import {
  EMPTY_SINGLE_ALLOWANCE,
  LOANS_MAX_FEE,
  MIN_PREPAID_FEE_PERCENT,
  REVLOANS_PERMISSION_ID,
  REV_PREPAID_FEE_PERCENT,
  buildBorrowTx,
  buildReallocateCollateralTx,
  buildRepayLoanTx,
  getBorrowableAmount,
} from "./loans.js";
import { v6Address } from "./types.js";

const token = "0x000000000000000000000000000000000000EEEe" as const;
const beneficiary = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" as const;
const holder = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" as const;

describe("loans", () => {
  test("constants match REVLoans", () => {
    expect(MIN_PREPAID_FEE_PERCENT).toEqual(25n);
    expect(REV_PREPAID_FEE_PERCENT).toEqual(10n);
    expect(LOANS_MAX_FEE).toEqual(1000n);
    expect(REVLOANS_PERMISSION_ID).toEqual(1);
  });

  describe("buildBorrowTx", () => {
    test("targets REVLoans and encodes borrowFrom", () => {
      const tx = buildBorrowTx({
        chainId: 11155111,
        revnetId: 4n,
        token,
        collateralCount: 100n * 10n ** 18n,
        beneficiary,
        prepaidFeePercent: MIN_PREPAID_FEE_PERCENT,
        holder,
      });

      expect(tx.address).toEqual(v6Address("REVLoans", 11155111));
      expect(tx.functionName).toEqual("borrowFrom");

      const data = encodeFunctionData(tx);
      const decoded = decodeFunctionData({ abi: revLoansAbi, data });
      expect(decoded.functionName).toEqual("borrowFrom");
      expect(decoded.args).toEqual([
        4n,
        token,
        0n, // minBorrowAmount defaults to 0
        100n * 10n ** 18n,
        beneficiary,
        25n,
        holder,
      ]);
    });
  });

  describe("buildRepayLoanTx", () => {
    test("defaults to an empty Permit2 allowance and 0 value", () => {
      const tx = buildRepayLoanTx({
        chainId: 11155111,
        loanId: 7n,
        maxRepayBorrowAmount: 1000n,
        collateralCountToReturn: 5n,
        beneficiary,
      });

      expect(tx.value).toEqual(0n);
      expect(tx.args[4]).toEqual(EMPTY_SINGLE_ALLOWANCE);

      const data = encodeFunctionData(tx);
      const decoded = decodeFunctionData({ abi: revLoansAbi, data });
      expect(decoded.functionName).toEqual("repayLoan");
      expect(decoded.args).toEqual([
        7n,
        1000n,
        5n,
        beneficiary,
        EMPTY_SINGLE_ALLOWANCE,
      ]);
    });

    test("passes a native-token repayment value through", () => {
      const tx = buildRepayLoanTx({
        chainId: 1,
        loanId: 7n,
        maxRepayBorrowAmount: 1000n,
        collateralCountToReturn: 0n,
        beneficiary,
        value: 1000n,
      });

      expect(tx.value).toEqual(1000n);
      expect(() => encodeFunctionData(tx)).not.toThrow();
    });
  });

  describe("buildReallocateCollateralTx", () => {
    test("encodes reallocateCollateralFromLoan", () => {
      const tx = buildReallocateCollateralTx({
        chainId: 11155111,
        loanId: 7n,
        collateralCountToTransfer: 3n,
        token,
        collateralCountToAdd: 2n,
        beneficiary,
        prepaidFeePercent: 50n,
      });

      expect(tx.address).toEqual(v6Address("REVLoans", 11155111));

      const data = encodeFunctionData(tx);
      const decoded = decodeFunctionData({ abi: revLoansAbi, data });
      expect(decoded.functionName).toEqual("reallocateCollateralFromLoan");
      expect(decoded.args).toEqual([
        7n,
        3n,
        token,
        0n, // minBorrowAmount defaults to 0
        2n,
        beneficiary,
        50n,
      ]);
    });
  });

  describe("getBorrowableAmount", () => {
    test("returns named fields from borrowableAmountFrom", async () => {
      const readContract = vi.fn().mockResolvedValue([111n, 222n]);
      const client = { readContract } as unknown as PublicClient;

      const result = await getBorrowableAmount(client, {
        chainId: 11155111,
        revnetId: 4n,
        collateralCount: 100n,
        decimals: 18n,
        currency: 1n,
      });

      expect(readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: v6Address("REVLoans", 11155111),
          functionName: "borrowableAmountFrom",
          args: [4n, 100n, 18n, 1n],
        })
      );
      expect(result).toEqual({
        borrowableNow: 111n,
        borrowableCapacity: 222n,
      });
    });
  });
});
