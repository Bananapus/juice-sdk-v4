import { Address } from "viem";

/**
 * The v6 base currency id for ETH (JBCurrencyIds.ETH).
 *
 * ETH = 1 and USD = 2 are well-known shared denominations used by protocol price
 * feeds. A ruleset's `baseCurrency` may instead be a token-keyed currency from
 * {@link tokenCurrencyId} when its issuance weight is denominated directly in that
 * token.
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
 * Use this for terminal accounting contexts (`{ token, decimals, currency }`). It may
 * also be used as a ruleset's `baseCurrency` when issuance is denominated directly in
 * that token. Use a shared denomination such as {@link BASE_CURRENCY_ETH} or
 * {@link BASE_CURRENCY_USD} when multiple accepted tokens must be converted through
 * price feeds.
 *
 * @param token The token address to derive a currency id from.
 * @returns The token's accounting-context currency id (fits in a uint32).
 */
export function tokenCurrencyId(token: Address): number {
  return Number(BigInt(token) & 0xffffffffn);
}
