import { describe, expect, test } from "vitest";
import { zeroAddress, zeroHash } from "viem";
import { resolve721PricingContext, buildRevnet721Config } from "./revnet721.js";
import { tokenCurrencyId } from "./currency.js";

const token = "0x0000000000000000000000000000000000000123" as const;
const permissions = {
  canAdjustTiers: true,
  canUpdateMetadata: false,
  canMint: false,
  canIncreaseDiscountPercent: true,
};

describe("721 deployment preparation", () => {
  test("currency, not reserve token, selects the conventional precision", () => {
    const contexts = [{ token, currency: tokenCurrencyId(token), decimals: 8 }];
    expect(
      resolve721PricingContext({ currency: 2, accountingContexts: contexts }),
    ).toEqual({ currency: 2, decimals: 6 });
    expect(resolve721PricingContext({ currency: 1 })).toEqual({
      currency: 1,
      decimals: 18,
    });
    expect(
      resolve721PricingContext({
        currency: tokenCurrencyId(token),
        accountingContexts: contexts,
      }),
    ).toEqual({ currency: tokenCurrencyId(token), decimals: 8 });
  });
  test("preserves deliberate precision and rejects guesses for custom currencies", () => {
    expect(resolve721PricingContext({ currency: 2, decimals: 18 })).toEqual({
      currency: 2,
      decimals: 18,
    });
    expect(() => resolve721PricingContext({ currency: 123 })).toThrow(
      /explicit.*decimals/,
    );
    expect(() =>
      resolve721PricingContext({
        currency: 123,
        accountingContexts: [
          { token, currency: 123, decimals: 6 },
          { token, currency: 123, decimals: 8 },
        ],
      }),
    ).toThrow(/explicit.*decimals/);
  });
  test.each([-1, 19, 1.5, NaN])("rejects invalid precision %s", (decimals) => {
    expect(() => resolve721PricingContext({ currency: 2, decimals })).toThrow(
      /0 and 18/,
    );
  });
  test("translates every explicit permission and preserves collection configuration", () => {
    expect(
      buildRevnet721Config({
        name: "Store",
        symbol: "SHOP",
        contractUri: "ipfs://metadata",
        salt: zeroHash,
        pricing: { currency: 2, decimals: 6 },
        operatorPermissions: permissions,
      }),
    ).toEqual({
      baseline721HookConfiguration: {
        name: "Store",
        symbol: "SHOP",
        baseUri: "ipfs://",
        tokenUriResolver: zeroAddress,
        contractUri: "ipfs://metadata",
        tiersConfig: { tiers: [], currency: 2, decimals: 6 },
        flags: {
          noNewTiersWithReserves: false,
          noNewTiersWithVotes: false,
          noNewTiersWithOwnerMinting: false,
          preventOverspending: false,
        },
      },
      salt: zeroHash,
      preventOperatorAdjustingTiers: false,
      preventOperatorUpdatingMetadata: true,
      preventOperatorMinting: true,
      preventOperatorIncreasingDiscountPercent: false,
    });
  });
});
