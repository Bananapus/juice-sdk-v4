import { FixedInt } from "fpnum";
import { parseEther, parseUnits } from "viem";
import { describe, expect, test } from "vitest";
import { ReservedPercent } from "./data.js";
import { getTokenAToBQuote, getTokenBPrice } from "./token.js";

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
          }
        );
        expect(payerTokens).toEqual(expectedPayerTokens);
      }
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
      }
    );
  });
});
