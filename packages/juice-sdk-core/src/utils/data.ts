import { FixedInt, FixedPortion } from "fpnum";

/**
 * The maximum value for a ruleset's Reserved Rate.
 *
 * @link JBConstants.sol
 */
export const MAX_RESERVED_RATE = 10_000n;

/**
 * The maximum value for a ruleset's Redemption Rate.
 *
 * @link JBConstants.sol
 */
export const MAX_REDEMPTION_RATE = 10_000n;

/**
 * The maximum value for a ruleset's Decay Rate.
 *
 * @link JBConstants.sol
 */
export const MAX_DECAY_RATE = 1_000_000_000n;

/**
 * @link JBConstants.sol
 */
export const MAX_FEE = 1_000_000_000n;

/**
 * @link JBConstants.sol
 */
export const MAX_FEE_DISCOUNT = 1_000_000_000n;

/**
 * The 100% representation for a ruleset's Splits.
 *
 * The sum of all Splits should total this value.
 *
 * @link JBConstants.sol
 */
export const SPLITS_TOTAL_PERCENT = 1_000_000_000n;

/**
 * The number of decimals that the internal JB Token has.
 *
 * JB Token are internal to the Juicebox contracts.
 * They keep track of a given address's share of a treasury.
 * At a later time, a wallet can claim their ERC-20 tokens based on the JB Token they hold.
 *
 */
export const JB_TOKEN_DECIMALS = 18;

/**
 * An address representation of the network's 'native' token (e.g. ETH, OP).
 * Within Juicebox contracts, each chain's native token address is represented by this address.
 *
 * @link JBConstants.sol
 */
export const NATIVE_TOKEN = "0x000000000000000000000000000000000000EEEe";

/**
 * The ID that represents the network's 'native' currency (e.g. ETH, OP).
 * Within Juicebox contracts, 0 is used to represent the native currency.
 *
 * @link JBCurrencyIds.sol
 */
export const NATIVE_CURRENCY_ID = 0n;

/**
 * Reserved rate for a ruleset.
 *
 * Has a decimal precision of 4 and a maximum value of 10,000.
 *
 * @extends FixedPortion
 */
export class ReservedRate extends FixedPortion<4> {
  constructor(value: bigint) {
    super(value, 4, MAX_RESERVED_RATE);
  }
}

/**
 * Redemption rate for a ruleset.
 *
 * Has a decimal precision of 4 and a maximum value of 10,000.

 * @extends FixedPortion
 */
export class RedemptionRate extends FixedPortion<4> {
  constructor(value: bigint) {
    super(value, 4, MAX_REDEMPTION_RATE);
  }
}

/**
 * Decay rate for a ruleset.
 *
 * Has a decimal precision of 9 and a maximum value of 1,000,000,000.

 * @extends FixedPortion
 */
export class DecayRate extends FixedPortion<9> {
  constructor(value: bigint) {
    super(value, 9, MAX_DECAY_RATE);
  }
}

export class SplitPortion extends FixedPortion<9> {
  constructor(value: bigint) {
    super(value, 9, SPLITS_TOTAL_PERCENT);
  }
}

/**
 * Ether value.
 *
 * Has a decimal precision of 18.
 *
 * @extends FixedInt
 */
export class Ether extends FixedInt<18> {
  constructor(value: bigint) {
    super(value, 18);
  }
}

/**
 * A JB project's token.
 *
 * Has a decimal precision of 18.
 *
 * @extends FixedInt
 */
export class JBProjectToken extends FixedInt<18> {
  constructor(value: bigint) {
    super(value, 18);
  }
}

/**
 * ruleset weight.
 *
 * Has a decimal precision of 18.
 *
 * @extends FixedInt
 */
export class RulesetWeight extends FixedInt<18> {
  constructor(value: bigint) {
    super(value, 18);
  }
}

export interface TokenAmountType {
  symbol: string;
  amount: FixedInt<number>;
}
