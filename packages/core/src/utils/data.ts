import { FixedInt, FixedPortion } from "fpnum";
import {
  MAX_DECAY_RATE,
  MAX_REDEMPTION_RATE,
  MAX_RESERVED_RATE,
  SPLITS_TOTAL_PERCENT,
} from "../constants";

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
  symbol: string | undefined;
  amount: FixedInt<number>;
}
