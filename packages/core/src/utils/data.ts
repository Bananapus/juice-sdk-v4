import { FixedInt, FixedPortion } from "fpnum";
import {
  MAX_WEIGHT_CUT_PERCENT,
  MAX_CASH_OUT_TAX_RATE,
  MAX_RESERVED_PERCENT,
  SPLITS_TOTAL_PERCENT,
} from "../constants.js";

/**
 * Reserved rate for a ruleset.
 *
 * Has a decimal precision of 4 and a maximum value of 10,000.
 *
 * @extends FixedPortion
 */
export class ReservedPercent extends FixedPortion<4> {
  constructor(value: number) {
    super(BigInt(value), 4, BigInt(MAX_RESERVED_PERCENT));
  }
}

/**
 * Cash Out Tax Rate for a ruleset.
 *
 * Has a decimal precision of 4 and a maximum value of 10,000.

 * @extends FixedPortion
 */
export class CashOutTaxRate extends FixedPortion<4> {
  constructor(value: number) {
    super(BigInt(value), 4, BigInt(MAX_CASH_OUT_TAX_RATE));
  }
}

/**
 * Decay rate for a ruleset.
 *
 * Has a decimal precision of 9 and a maximum value of 1,000,000,000.

 * @extends FixedPortion
 */
export class WeightCutPercent extends FixedPortion<9> {
  constructor(value: number) {
    super(BigInt(value), 9, BigInt(MAX_WEIGHT_CUT_PERCENT));
  }
}

export class SplitPortion extends FixedPortion<9> {
  constructor(value: number) {
    super(BigInt(value), 9, BigInt(SPLITS_TOTAL_PERCENT));
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
