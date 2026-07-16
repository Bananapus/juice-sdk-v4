import { describe, expect, test } from "vitest";
import { ONE_ETHER } from "../constants.js";
import { applyJbDaoCashOutFee } from "../utils/fee.js";
import {
  MAX_FEE,
  STANDARD_FEE,
  TERMINAL_FEE_PER_BILLION,
  amountAfterFee,
  feeForAmount,
} from "./fees.js";

describe("fees", () => {
  test("constants agree on 2.5%", () => {
    expect(STANDARD_FEE).toEqual(25n);
    expect(MAX_FEE).toEqual(1000n);
    expect((STANDARD_FEE * 1_000_000_000n) / MAX_FEE).toEqual(
      TERMINAL_FEE_PER_BILLION,
    );
  });

  test("feeForAmount takes 2.5% by default", () => {
    expect(feeForAmount(ONE_ETHER)).toEqual(25000000000000000n);
    expect(feeForAmount(1_000_000_000n)).toEqual(25_000_000n);
  });

  test("amountAfterFee leaves 97.5% by default", () => {
    expect(amountAfterFee(ONE_ETHER)).toEqual(975000000000000000n);
    expect(amountAfterFee(ONE_ETHER)).toEqual(applyJbDaoCashOutFee(ONE_ETHER));
  });

  test("fee + net always equals the gross amount", () => {
    for (const amount of [0n, 1n, 39n, 40n, 41n, ONE_ETHER, ONE_ETHER + 1n]) {
      expect(feeForAmount(amount) + amountAfterFee(amount)).toEqual(amount);
    }
  });

  test("fee rounds down; tiny amounts pay no fee", () => {
    expect(feeForAmount(39n)).toEqual(0n);
    expect(amountAfterFee(39n)).toEqual(39n);
    expect(feeForAmount(40n)).toEqual(1n);
  });

  test("custom fee rates", () => {
    // 10% per billion.
    expect(feeForAmount(ONE_ETHER, 100_000_000n)).toEqual(100000000000000000n);
    expect(amountAfterFee(ONE_ETHER, 100_000_000n)).toEqual(
      900000000000000000n,
    );
    // Zero fee.
    expect(feeForAmount(ONE_ETHER, 0n)).toEqual(0n);
    expect(amountAfterFee(ONE_ETHER, 0n)).toEqual(ONE_ETHER);
  });
});
