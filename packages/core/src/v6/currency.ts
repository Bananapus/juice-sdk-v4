import { Address } from "viem";

/**
 * The v6 base currency id for ETH (JBCurrencyIds.ETH).
 *
 * Base currencies are the small standard ids (ETH = 1, USD = 2) used to denominate a
 * ruleset's `baseCurrency` and fund access limits. They are NOT the same as
 * accounting-context currencies, which are derived from a token's address via
 * {@link tokenCurrencyId}. Never use an accounting-context currency (e.g. 61166 for the
 * native token) as a ruleset `baseCurrency` to "skip the price feed" — base currency
 * must be 1 or 2.
 *
 * @link https://github.com/Bananapus/nana-core-v6/blob/main/src/libraries/JBCurrencyIds.sol
 */
export const BASE_CURRENCY_ETH = 1;

/**
 * The v6 base currency id for USD (JBCurrencyIds.USD).
 *
 * See {@link BASE_CURRENCY_ETH} for the distinction between base currencies and
 * accounting-context currencies.
 *
 * @link https://github.com/Bananapus/nana-core-v6/blob/main/src/libraries/JBCurrencyIds.sol
 */
export const BASE_CURRENCY_USD = 2;

/**
 * The accounting-context currency id of the network's native token (e.g. ETH).
 *
 * Equal to `uint32(uint160(0x000000000000000000000000000000000000EEEe))` = 61166.
 * This is what {@link tokenCurrencyId} returns for the native token address.
 */
export const NATIVE_TOKEN_CURRENCY_ID = 61166;

/**
 * The v6 accounting-context currency id for a token: `uint32(uint160(tokenAddress))`,
 * i.e. the lowest 4 bytes of the token's address.
 *
 * Use this for terminal accounting contexts (`{ token, decimals, currency }`) — NOT for
 * a ruleset's `baseCurrency`, which must be a base currency id
 * ({@link BASE_CURRENCY_ETH} or {@link BASE_CURRENCY_USD}).
 *
 * @param token The token address to derive a currency id from.
 * @returns The token's accounting-context currency id (fits in a uint32).
 */
export function tokenCurrencyId(token: Address): number {
  return Number(BigInt(token) & 0xffffffffn);
}
