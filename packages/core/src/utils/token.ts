import { FixedInt } from "fpnum";
import { parseUnits } from "viem";
import { ReservedPercent, RulesetWeight } from "./data.js";
import {
  ONE_ETHER,
  MAX_REDEMPTION_RATE,
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
 * @see https://www.desmos.com/calculator/sp9ru6zbpk
 * y = ox/s * ( r + (x(1 - r)/s) )
 *
 * Where:
 * - y = redeemable amount
 * - o = overflow (primaryTerminalCurrentOverflow)
 * - x = tokenAmount
 * - s = total supply of token (realTotalTokenSupply)
 * - r = redemptionRate
 *
 * @implements JBSingleTokenPaymentTerminalStore._reclaimableOverflowDuring (https://github.com/jbx-protocol/juice-contracts-v3/blob/main/contracts/JBSingleTokenPaymentTerminalStore.sol#L688)
 * @returns amount in ETH
 */
export const getTokenRedemptionQuoteEth = (
  tokensAmount: bigint,
  {
    overflowWei,
    totalSupply,
    redemptionRate,
    tokensReserved,
  }: {
    overflowWei: bigint;
    totalSupply: bigint;
    redemptionRate: number;
    tokensReserved: bigint;
  }
) => {
  // totalOutstandingTokensOf in contract.
  const realTotalSupply = totalSupply + tokensReserved;

  // base = ox/s
  const base = (overflowWei * tokensAmount) / realTotalSupply;

  if (redemptionRate === MAX_REDEMPTION_RATE) return base;

  const frac =
    (tokensAmount * BigInt(MAX_REDEMPTION_RATE - redemptionRate)) / realTotalSupply;

  // numerator = r + (x(1 - r)/s)
  const numerator = BigInt(redemptionRate) + frac;
  // y = base * numerator ==> ox/s * ( r + (x(1 - r)/s) )
  const y = (base * numerator) / BigInt(MAX_REDEMPTION_RATE);

  return y / 10n;
};
