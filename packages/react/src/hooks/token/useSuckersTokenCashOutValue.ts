import { ONE_JB_TOKEN } from "@bananapus/nana-sdk-core";
import { formatEther } from "viem";
import { useEtherPrice } from "../useEtherPrice";
import { useSuckersCashOutQuote } from "./useSuckersCashOutQuote";

/**
 * Return the current cashout value of one project token.
 */
export function useSuckersTokenCashOutValue({
  targetCurrency,
}: {
  targetCurrency: "eth" | "usd";
}) {
  const {
    data: ethPrice,
    isLoading: isEthLoading,
    error: ethPriceError,
  } = useEtherPrice();

  const {
    data: quote,
    isLoading: isQuoteLoading,
    errors,
  } = useSuckersCashOutQuote(ONE_JB_TOKEN);

  const loading = isQuoteLoading || isEthLoading;

  if (loading) {
    return { loading: true, data: undefined };
  }

  // A missing quote means the read failed, not that the token is worth 0.
  if (quote == null) {
    return { loading, data: undefined, errors };
  }

  const quoteEth = parseFloat(formatEther(quote));

  if (targetCurrency === "eth") {
    return { loading, data: quoteEth, errors };
  }

  // Same rule for the USD leg: a failed price fetch means the value is unknown,
  // not that a token is worth $0. Surface the price error alongside the others.
  const allErrors = ethPriceError ? [...errors, ethPriceError] : errors;
  if (ethPrice === undefined) {
    return { loading, data: undefined, errors: allErrors };
  }

  return {
    loading,
    data: quoteEth * ethPrice,
    errors: allErrors,
  };
}
