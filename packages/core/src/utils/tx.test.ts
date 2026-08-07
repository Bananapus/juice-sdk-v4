import { describe, expect, test } from "vitest";
import { createSalt } from "./tx.js";

describe("createSalt", () => {
  test("is a full 32-byte hex value", () => {
    const salt = createSalt();
    expect(salt).toMatch(/^0x[0-9a-f]{64}$/);
  });

  test("fills every byte, not just the high ones", () => {
    // The regression: `Math.random().toString(16)` right-padded to 32 bytes put
    // ~52 bits of non-CSPRNG entropy in the leading bytes and zeroed the rest,
    // so the low half of every salt was constant.
    const lowHalves = new Set(
      Array.from({ length: 32 }, () => createSalt().slice(34)),
    );
    expect(lowHalves.size).toBe(32);
  });

  test("does not repeat", () => {
    const salts = new Set(Array.from({ length: 256 }, createSalt));
    expect(salts.size).toBe(256);
  });
});
