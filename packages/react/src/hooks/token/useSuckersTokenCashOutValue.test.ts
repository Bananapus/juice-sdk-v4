import { beforeEach, describe, expect, test, vi } from "vitest";
import { parseEther } from "viem";
import { useSuckersTokenCashOutValue } from "./useSuckersTokenCashOutValue";

const mocks = vi.hoisted(() => ({
  ethPrice: 2_000 as number | undefined,
  ethLoading: false,
  ethPriceError: undefined as Error | undefined,
  quote: 500_000_000_000_000_000n as bigint | undefined,
  quoteLoading: false,
  errors: [] as Error[],
  quoteHook: vi.fn(),
}));

vi.mock("../useEtherPrice", () => ({
  useEtherPrice: () => ({
    data: mocks.ethPrice,
    isLoading: mocks.ethLoading,
    error: mocks.ethPriceError,
  }),
}));
vi.mock("./useSuckersCashOutQuote", () => ({
  useSuckersCashOutQuote: mocks.quoteHook,
}));

describe("useSuckersTokenCashOutValue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.ethPrice = 2_000;
    mocks.ethLoading = false;
    mocks.ethPriceError = undefined;
    mocks.quote = parseEther("0.5");
    mocks.quoteLoading = false;
    mocks.errors = [];
    mocks.quoteHook.mockImplementation(() => ({
      data: mocks.quote,
      isLoading: mocks.quoteLoading,
      errors: mocks.errors,
    }));
  });

  test("returns one-token cash-out value in ETH or USD", () => {
    expect(useSuckersTokenCashOutValue({ targetCurrency: "eth" })).toEqual({
      loading: false,
      data: 0.5,
      errors: [],
    });
    expect(useSuckersTokenCashOutValue({ targetCurrency: "usd" })).toEqual({
      loading: false,
      data: 1_000,
      errors: [],
    });
    expect(mocks.quoteHook).toHaveBeenCalledWith(1_000_000_000_000_000_000n);
  });

  test("withholds stale values while either dependency is loading", () => {
    mocks.ethLoading = true;
    expect(useSuckersTokenCashOutValue({ targetCurrency: "usd" })).toEqual({
      loading: true,
      data: undefined,
    });
    mocks.ethLoading = false;
    mocks.quoteLoading = true;
    expect(useSuckersTokenCashOutValue({ targetCurrency: "eth" })).toEqual({
      loading: true,
      data: undefined,
    });
  });

  test("propagates a missing quote as undefined, not zero", () => {
    const error = new Error("quote failed");
    mocks.quote = undefined;
    mocks.errors = [error];
    expect(useSuckersTokenCashOutValue({ targetCurrency: "usd" })).toEqual({
      loading: false,
      data: undefined,
      errors: [error],
    });
  });

  test("propagates a failed ETH price as undefined USD, not zero", () => {
    const priceError = new Error("price unavailable");
    mocks.ethPrice = undefined;
    mocks.ethPriceError = priceError;

    expect(useSuckersTokenCashOutValue({ targetCurrency: "usd" })).toEqual({
      loading: false,
      data: undefined,
      errors: [priceError],
    });
    // The ETH leg does not depend on the price, so it still answers.
    expect(useSuckersTokenCashOutValue({ targetCurrency: "eth" })).toEqual({
      loading: false,
      data: 0.5,
      errors: [],
    });
  });

  test("withholds the USD value when the price is simply absent", () => {
    mocks.ethPrice = undefined;

    expect(useSuckersTokenCashOutValue({ targetCurrency: "usd" })).toEqual({
      loading: false,
      data: undefined,
      errors: [],
    });
  });
});
