import { FixedInt } from "fpnum";
import { parseEther, parseUnits } from "viem";
import { describe, expect, test } from "vitest";
import { ReservedPercent } from "./data.js";
import {
  getTokenAToBQuote,
  getTokenBPrice,
  getTokenCashOutQuoteEth,
} from "./token.js";

describe("token", () => {
  describe("getTokenAToBQuote", () => {
    test.each`
      tokenAAmount       | tokenADecimals | expectedPayerTokens
      ${1000000n}        | ${6}           | ${parseUnits("1", 18)}
      ${parseEther("1")} | ${18}          | ${parseUnits("1", 18)}
    `(
      "should return the correct token B quote when amount is $tokenAAmount and decimals is $tokenADecimals",
      ({ tokenAAmount, tokenADecimals, expectedPayerTokens }) => {
        const weight = FixedInt.parse<18>("1", 18); // 1 token per USDC
        const reservedPercent = new ReservedPercent(0);
        const { payerTokens } = getTokenAToBQuote(
          new FixedInt(tokenAAmount, tokenADecimals),
          {
            weight,
            reservedPercent,
          },
        );
        expect(payerTokens).toEqual(expectedPayerTokens);
      },
    );

    test.each`
      tokenADecimals | weight                       | expectedTokenBPrice
      ${18}          | ${FixedInt.parse("1", 18)}   | ${parseUnits("1", 18)}
      ${6}           | ${FixedInt.parse("1", 18)}   | ${parseUnits("1", 6)}
      ${18}          | ${FixedInt.parse("0.5", 18)} | ${parseUnits("2", 18)}
      ${6}           | ${FixedInt.parse("0.5", 18)} | ${parseUnits("2", 6)}
      ${6}           | ${FixedInt.parse("0.8", 18)} | ${parseUnits("1.25", 6)}
    `(
      "should return the correct token A quote when amount is $tokenBAmount and decimals is $tokenADecimals",
      ({ tokenADecimals, expectedTokenBPrice, weight }) => {
        const reservedPercent = new ReservedPercent(0);
        const tokenBPrice = getTokenBPrice(tokenADecimals, {
          weight,
          reservedPercent,
        });

        expect(tokenBPrice.value).toBe(expectedTokenBPrice);
      },
    );
  });

  describe("getTokenCashOutQuoteEth", () => {
    test("returns bigint zero for a zero cash out before the full-supply branch", () => {
      expect(
        getTokenCashOutQuoteEth(0n, {
          overflowWei: 1_000n,
          totalSupply: 0n,
          tokensReserved: 0n,
          cashOutTaxRate: 0,
        }),
      ).toBe(0n);
    });

    test("includes pending reserved tokens before deciding the full supply is cashed out", () => {
      const quote = getTokenCashOutQuoteEth(100n, {
        overflowWei: 1_000n,
        totalSupply: 100n,
        tokensReserved: 100n,
        cashOutTaxRate: 0,
      });

      // JBCashOuts.cashOutFrom(1_000, 100, 200, 0) = 500. Checking
      // `cashOutCount >= totalSupply` before adding the reserved 100 would
      // incorrectly return the entire 1,000 surplus.
      expect(quote).toBe(500n);
    });

    test("returns the full surplus only when the full outstanding supply is cashed out", () => {
      expect(
        getTokenCashOutQuoteEth(200n, {
          overflowWei: 1_000n,
          totalSupply: 100n,
          tokensReserved: 100n,
          cashOutTaxRate: 2_500,
        }),
      ).toBe(1_000n);
    });

    test("matches the contract's integer order for a taxed partial cash out", () => {
      // base = 1,000 * 50 / 200 = 250
      // curve = (10,000 - 5,000) + 5,000 * 50 / 200 = 6,250
      // result = 250 * 6,250 / 10,000 = 156 (Solidity floors each mulDiv)
      expect(
        getTokenCashOutQuoteEth(50n, {
          overflowWei: 1_000n,
          totalSupply: 125n,
          tokensReserved: 75n,
          cashOutTaxRate: 5_000,
        }),
      ).toBe(156n);
    });

    test("returns bigint zero at the maximum cash out tax rate", () => {
      expect(
        getTokenCashOutQuoteEth(50n, {
          overflowWei: 1_000n,
          totalSupply: 100n,
          tokensReserved: 0n,
          cashOutTaxRate: 10_000,
        }),
      ).toBe(0n);
    });

    test("rejects a negative cash-out count", () => {
      expect(() =>
        getTokenCashOutQuoteEth(-1n, {
          overflowWei: 100n,
          totalSupply: 100n,
          tokensReserved: 0n,
          cashOutTaxRate: 0,
        }),
      ).toThrow(RangeError);
    });

    test.each([
      { overflowWei: -1n },
      { totalSupply: -1n },
      { tokensReserved: -1n },
      { overflowWei: 1n << 256n },
      { totalSupply: 1n << 256n },
      { tokensReserved: 1n << 256n },
      { cashOutTaxRate: -1 },
      { cashOutTaxRate: 10_001 },
      { cashOutTaxRate: 0.5 },
    ])(
      "rejects values outside the contract's uint and tax-rate bounds",
      (overrides) => {
        expect(() =>
          getTokenCashOutQuoteEth(10n, {
            overflowWei: 100n,
            totalSupply: 100n,
            tokensReserved: 0n,
            cashOutTaxRate: 0,
            ...overrides,
          }),
        ).toThrow(RangeError);
      },
    );

    test("rejects a cash-out count outside uint256", () => {
      expect(() =>
        getTokenCashOutQuoteEth(1n << 256n, {
          overflowWei: 100n,
          totalSupply: 100n,
          tokensReserved: 0n,
          cashOutTaxRate: 0,
        }),
      ).toThrow(RangeError);
    });

    test("rejects overflow while combining minted and pending reserved supply", () => {
      expect(() =>
        getTokenCashOutQuoteEth(1n, {
          overflowWei: 100n,
          totalSupply: (1n << 256n) - 1n,
          tokensReserved: 1n,
          cashOutTaxRate: 0,
        }),
      ).toThrow(RangeError);
    });
  });
});
