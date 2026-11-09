import { describe, expect, it } from "vitest";
import { gasWithHeadroom, TRANSACTION_GAS_CAP } from "./gas.js";

describe("gasWithHeadroom", () => {
  it("sets an explicit 2x limit without rounding loss", () => {
    expect(gasWithHeadroom(1_119_186n)).toBe(2_238_372n);
  });

  it("stops at the per-transaction cap only when the estimate fits under it", () => {
    expect(TRANSACTION_GAS_CAP).toBe(16_777_216n);
    expect(gasWithHeadroom(10_000_000n)).toBe(TRANSACTION_GAS_CAP);
    expect(gasWithHeadroom(20_000_000n)).toBe(40_000_000n);
    expect(gasWithHeadroom(10_000_000n, 30_000_000n)).toBe(20_000_000n);
  });
});
