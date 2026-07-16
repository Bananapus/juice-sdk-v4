import { describe, expect, test } from "vitest";
import { NATIVE_TOKEN } from "../constants.js";
import {
  BASE_CURRENCY_ETH,
  BASE_CURRENCY_USD,
  NATIVE_TOKEN_CURRENCY_ID,
  tokenCurrencyId,
} from "./currency.js";

describe("currency", () => {
  test("base currency ids", () => {
    expect(BASE_CURRENCY_ETH).toEqual(1);
    expect(BASE_CURRENCY_USD).toEqual(2);
  });

  test("tokenCurrencyId of the native token is 61166", () => {
    expect(tokenCurrencyId(NATIVE_TOKEN)).toEqual(61166);
    expect(tokenCurrencyId(NATIVE_TOKEN)).toEqual(NATIVE_TOKEN_CURRENCY_ID);
  });

  test("tokenCurrencyId is the low 32 bits of the address", () => {
    // Mainnet USDC; low 4 bytes are 0x3606eb48.
    expect(
      tokenCurrencyId("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"),
    ).toEqual(0x3606eb48);
  });

  test("tokenCurrencyId of the zero address is 0", () => {
    expect(
      tokenCurrencyId("0x0000000000000000000000000000000000000000"),
    ).toEqual(0);
  });

  test("tokenCurrencyId fits in a uint32 even for high addresses", () => {
    expect(
      tokenCurrencyId("0xffffffffffffffffffffffffffffffffffffffff"),
    ).toEqual(0xffffffff);
  });
});
