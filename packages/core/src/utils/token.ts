import { FixedInt } from "fpnum";
import { parseUnits } from "viem";
import { ReservedPercent, RulesetWeight } from "./data.js";
import {
  ONE_ETHER,
  MAX_CASH_OUT_TAX_RATE,
  MAX_RESERVED_PERCENT,
} from "../constants.js";

/**
 * Return a quote for how much Token B to mint for a given `tokenAAmount`.
 *
 * Useful for when users specify how much they want to spend (Token A).
 *
 * Accounts for the ruleset's `weight` and `reservedPercent`.
 *
 * Returned quote contains:
 * - total tokens to be minted (JB ruleset `weight`).
 * - tokens reserved for project.
 * - tokens minted for the payer.
 */
export const getTokenAToBQuote = <D extends number>(
  tokenAAmount: FixedInt<D>, // wei
  cycleParams: { weight: RulesetWeight; reservedPercent: ReservedPercent }
) => {
  const { weight, reservedPercent } = cycleParams;

  const weightRatio = BigInt(10 ** tokenAAmount.decimals);

  const totalTokens = (weight.value * tokenAAmount.value) / weightRatio;
  const reservedTokens =
    (weight.value * reservedPercent.value * tokenAAmount.value) /
    BigInt(MAX_RESERVED_PERCENT) /
    weightRatio;

  const payerTokens = totalTokens - reservedTokens;

  return {
    tokenAAmount,
    payerTokens,
    reservedTokens,
    totalTokens,
  };
};

/**
 * Return the amount of Token A it costs to buy 1 Token B.
 *
 * Accounts for the ruleset's `weight` and `reservedPercent`.
 */
export const getTokenBPrice = (
  tokenADecimals: number,
  cycleParams: { weight: RulesetWeight; reservedPercent: ReservedPercent }
) => {
  const oneTokenA = FixedInt.parse("1", tokenADecimals);
  const weightRatio = BigInt(10 ** tokenADecimals);

  // 1 Token A = x Token B
  const tokenBQuote = getTokenAToBQuote(oneTokenA, cycleParams);
  if (tokenBQuote.payerTokens === 0n) return new FixedInt(0n, tokenADecimals);

  const tokenBPrice = (ONE_ETHER * weightRatio) / tokenBQuote.payerTokens;

  return new FixedInt(tokenBPrice, tokenADecimals);
};

/**
 * Return the amount of Token A it costs to mint a given `tokenBAmount`.
 *
 * Accounts for the ruleset's `weight` and `reservedPercent`.
 *
 * Useful for when users specify the outcome they want (how much Token B they want).
 */
export const getTokenBtoAQuote = <D extends number>(
  tokenBAmount: FixedInt<D>, // wei
  tokenADecimals: number,
  cycleParams: { weight: RulesetWeight; reservedPercent: ReservedPercent }
) => {
  const tokenBPrice = getTokenBPrice(tokenADecimals, cycleParams);
  const oneTokenA = parseUnits("1", tokenADecimals);

  const tokenAQuote = (tokenBPrice.value * tokenBAmount.value) / oneTokenA;
  return new FixedInt(tokenAQuote, tokenADecimals);
};

/**
 * Returns the ETH value (in wei) that a given [tokensAmount] can be redeemed for.
 *
 * @note Implements the formula:
 * ```
 * y = ox/s * ( (1 - r) + (x * r /s) )
 * ```
 *
 * Where:
 * - `y` = redeemable amount
 * - `o` = overflow (primaryTerminalCurrentOverflow)
 * - `x` = tokenAmount
 * - `s` = total supply of token (realTotalTokenSupply)
 * - `r` = cashOutTaxRate
 *
 * @implements JBCashOuts.cashOutFrom
 * @see https://github.com/Bananapus/nana-core/blob/44ae030f910e4a40a9a70a1eccf67cb0cf0c80f9/src/libraries/JBCashOuts.sol
 * @see https://www.desmos.com/calculator/sp9ru6zbpk
 * @returns amount in ETH
 */
export const getTokenCashOutQuoteEth = (
  tokensAmount: bigint,
  {
    overflowWei, // surplus
    totalSupply,
    cashOutTaxRate,
    tokensReserved,
  }: {
    overflowWei: bigint;
    totalSupply: bigint;
    cashOutTaxRate: number;
    tokensReserved: bigint;
  }
) => {
  // alias names, to match the contract's implementation for easier manual comparison.
  const surplus = overflowWei;
  const cashOutCount = tokensAmount;

  // If the cash out tax rate is the max, no surplus can be reclaimed.
  if (cashOutTaxRate === MAX_CASH_OUT_TAX_RATE) {
    return 0;
  }

  // If the total supply is being cashed out, return the entire surplus.
  if (cashOutCount >= totalSupply) {
    return surplus;
  }

  //
  /**
   * totalOutstandingTokensOf in contract.
   * @note this deviates from the contract's `cashOutFrom` implementation.
   */
  const realTotalSupply = totalSupply + tokensReserved;

  /**
   * Get a reference to the linear proportion.
   * ```
   * base = ox/s
   * ```
   */
  const base = (surplus * cashOutCount) / realTotalSupply;

  /**
   * These conditions are all part of the same curve.
   * Edge conditions are separated to minimize the operations performed in those cases.
   */
  if (cashOutTaxRate === 0) {
    return base;
  }

  const frac = (BigInt(cashOutTaxRate) * cashOutCount) / realTotalSupply;

  /**
   * ```
   * numerator = (1 - r) + (x * r / s)
   * ```
   */
  const numerator = BigInt(MAX_CASH_OUT_TAX_RATE - cashOutTaxRate) + frac;

  /**
   * ```
   * y = base * numerator ==> ox/s * ( (1 - r) + (x * r / s) )
   * ```
   */
  const y = (base * numerator) / BigInt(MAX_CASH_OUT_TAX_RATE);

  return y;
};
