import { FixedInt } from "fpnum";
import { parseUnits } from "viem";
import {
  MAX_REDEMPTION_RATE,
  MAX_RESERVED_RATE,
  ReservedRate,
  RulesetWeight,
} from "./data";
import { ONE_ETHER } from "../constants";

/**
 * Return a quote for token mints for a given [payAmount].
 * Returned quote contains:
 * - total tokens to be minted (JB ruleset `weight`).
 * - tokens reserved for project.
 * - tokens minted for the payer.
 */
export const getTokenAToBQuote = <D extends number>(
  tokenAAmount: FixedInt<D>, // wei
  cycleParams: { weight: RulesetWeight; reservedRate: ReservedRate }
) => {
  const { weight, reservedRate } = cycleParams;

  const weightRatio = BigInt(10 ** tokenAAmount.decimals);

  const totalTokens = (weight.val * tokenAAmount.val) / weightRatio;
  const reservedTokens =
    (weight.val * reservedRate.val * tokenAAmount.val) /
    MAX_RESERVED_RATE /
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
 */
export const getTokenBPrice = (
  tokenADecimals: number,
  cycleParams: { weight: RulesetWeight; reservedRate: ReservedRate }
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
 * Return the ETH cost to mint a given [tokensAmount] to the payer.
 * @param tokensAmount
 * @param cycleParams
 * @returns
 */
export const getTokenBtoAQuote = <D extends number>(
  tokenBAmount: FixedInt<D>, // wei
  tokenADecimals: number,
  cycleParams: { weight: RulesetWeight; reservedRate: ReservedRate }
) => {
  const tokenBPrice = getTokenBPrice(tokenADecimals, cycleParams);
  const oneTokenA = parseUnits("1", tokenADecimals);

  const tokenAQuote = (tokenBPrice.val * tokenBAmount.val) / oneTokenA;
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
    redemptionRate: bigint;
    tokensReserved: bigint;
  }
) => {
  // totalOutstandingTokensOf in contract.
  const realTotalSupply = totalSupply + tokensReserved;

  // base = ox/s
  const base = (overflowWei * tokensAmount) / realTotalSupply;

  if (redemptionRate === MAX_REDEMPTION_RATE) return base;

  const frac =
    (tokensAmount * (MAX_REDEMPTION_RATE - redemptionRate)) / realTotalSupply;

  // numerator = r + (x(1 - r)/s)
  const numerator = redemptionRate + frac;
  // y = base * numerator ==> ox/s * ( r + (x(1 - r)/s) )
  const y = (base * numerator) / MAX_REDEMPTION_RATE;

  return y / 10n;
};
