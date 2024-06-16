import {
  formatEther as formatEtherViem,
  formatUnits as formatUnitsViem,
} from "viem";

const DEFAULT_TRUNCATE_TO = 4;

/**
 * Format a given Ethereum address to a human-readable representation.
 * @param address The address to format.
 * @param opts.truncateTo The number of characters to include either side of the elipsis (...).
 * @returns The formatted string e.g. 0x0000...0000
 */
export function formatEthAddress(
  address: string,
  {
    truncateTo = DEFAULT_TRUNCATE_TO,
  }: {
    truncateTo?: number;
  } = {
    truncateTo: DEFAULT_TRUNCATE_TO,
  }
) {
  const frontTruncate = truncateTo + 2; // account for 0x
  return (
    address.substring(0, frontTruncate) +
    "..." +
    address.substring(address.length - truncateTo, address.length)
  );
}

/**
 * Converts numerical wei to a string representation of Ether.
 * This function wraps viem's formatEther.
 * @see https://viem.sh/docs/utilities/formatEther.html
 * @param wei the Ether value in wei (fixed-point number with 18 decimals)
 * @param opts.fractionDigits The number of
 * @returns
 */
export function formatEther(
  wei: bigint,
  opts?: { fractionDigits?: number }
): string {
  const formatted = formatEtherViem(wei);

  if (typeof opts?.fractionDigits === "undefined") return formatted;

  // parse float again to trim trailing 0s
  return parseFloat(
    parseFloat(formatted).toFixed(opts?.fractionDigits)
  ).toString();
}

/**
 * Divides a number by a given exponent of base 10 (10^exp), and formats it into a string representation of the number.
 * This function wraps viem's formatUnits.
 * @see https://viem.sh/docs/utilities/formatUnits.html
 * @param value The value to format.
 * @param units The units of the value.
 * @param opts.fractionDigits The number of fraction digits (i.e. decimal places) to format to.
 * @returns Formatted representation of [value].
 */
export function formatUnits(
  value: bigint,
  units: number,
  opts?: { fractionDigits?: number }
) {
  const formatted = formatUnitsViem(value, units);

  if (typeof opts?.fractionDigits === "undefined") return formatted;

  // parse float again to trim trailing 0s
  return parseFloat(
    parseFloat(formatted).toFixed(opts?.fractionDigits)
  ).toString();
}
