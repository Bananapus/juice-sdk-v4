import { describe, expect, it } from "vitest";
import { isBytes32, isHexBytes, uint256 } from "./untrusted.js";

describe("untrusted input readers", () => {
  it("reads a uint256 from a bigint, a safe integer, or decimal or hex digits", () => {
    expect(uint256(5n)).toBe(5n);
    expect(uint256(7)).toBe(7n);
    expect(uint256("42")).toBe(42n);
    expect(uint256("0x2A")).toBe(42n);
    expect(uint256(`0x${"f".repeat(64)}`)).toBe((1n << 256n) - 1n);
  });

  it("refuses negatives, overflow, fractions, unsafe integers and other shapes", () => {
    for (const value of [
      -1n,
      1n << 256n,
      -1,
      1.5,
      2 ** 53,
      "",
      "-1",
      "1e3",
      " 1",
      "0x",
      "0xg1",
      `0x1${"0".repeat(64)}`,
      null,
      undefined,
      {},
      [1],
    ]) {
      expect(uint256(value)).toBeNull();
    }
  });

  it("accepts whole hex bytes and exact 32-byte hashes only", () => {
    expect(isHexBytes("0x")).toBe(true);
    expect(isHexBytes("0xAbCd")).toBe(true);
    // Case-insensitive throughout, the prefix included, as the hash rule reads.
    expect(isHexBytes("0XABCD")).toBe(true);
    for (const value of ["0xabc", "abcd", "0xzz", 1, null]) {
      expect(isHexBytes(value)).toBe(false);
    }
    expect(isBytes32(`0x${"Ab".repeat(32)}`)).toBe(true);
    expect(isBytes32(`0X${"ab".repeat(32)}`)).toBe(true);
    for (const value of [
      `0x${"ab".repeat(31)}`,
      `0x${"ab".repeat(33)}`,
      `0x${"zz".repeat(32)}`,
      undefined,
    ]) {
      expect(isBytes32(value)).toBe(false);
    }
  });
});
