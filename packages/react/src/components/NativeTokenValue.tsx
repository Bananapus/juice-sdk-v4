import { NATIVE_TOKEN_DECIMALS, formatUnits } from "juice-sdk-core";
import { useNativeTokenSymbol } from "../hooks/token/useNativeTokenSymbol";

/**
 * Format a native token value for display.
 *
 * The Native Token might be ETH, Sepolia ETH, etc.
 *
 * @param wei The native token value in wei (fixed-point number with 18 decimals).
 * @param decimals The number of decimal places (or 'fraction digits') to display.
 */
export function NativeTokenValue({
  wei,
  decimals = 4,
}: {
  wei: bigint;
  decimals?: number;
}) {
  const symbol = useNativeTokenSymbol();

  return (
    <>
      {formatUnits(wei, NATIVE_TOKEN_DECIMALS, {
        fractionDigits: decimals,
      })}{" "}
      {symbol}
    </>
  );
}
