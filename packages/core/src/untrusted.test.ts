import { describe, expect, it } from "vitest";
import { isBytes32, isHexBytes, retryAfterMs, uint256 } from "./untrusted.js";

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

  // Monday 5 October 2026, 12:00:00 UTC.
  const NOW = Date.UTC(2026, 9, 5, 12, 0, 0);

  it("reads a Retry-After as delay-seconds or an HTTP-date in any of RFC 9110's three forms", () => {
    expect(retryAfterMs("0", NOW)).toBe(0);
    expect(retryAfterMs("120", NOW)).toBe(120_000);
    for (const date of [
      "Mon, 05 Oct 2026 12:00:05 GMT",
      "Monday, 05-Oct-26 12:00:05 GMT",
      "Mon Oct  5 12:00:05 2026",
    ]) {
      expect(retryAfterMs(date, NOW)).toBe(5_000);
    }
    // A date that has passed asks for no wait.
    expect(retryAfterMs("Mon, 05 Oct 2026 11:00:00 GMT", NOW)).toBe(0);
    // An RFC 850 year 50 years ahead stays ahead; one more is a century back.
    expect(retryAfterMs("Monday, 05-Oct-76 12:00:00 GMT", NOW)).toBe(
      Date.UTC(2076, 9, 5, 12, 0, 0) - NOW,
    );
    expect(retryAfterMs("Monday, 05-Oct-77 12:00:00 GMT", NOW)).toBe(0);
    // The clock is the default.
    expect(retryAfterMs("Mon, 05 Oct 2099 12:00:00 GMT")).toBeGreaterThan(0);
  });

  it("reads no other Retry-After", () => {
    for (const value of [
      null,
      undefined,
      5,
      "",
      "soon",
      "1.5",
      "-1",
      "1e3",
      " 5",
      "5, 7",
      "Sun, 06 Nov 1994 08:49:37 +0000",
      "Sun, 32 Nov 1994 08:49:37 GMT",
    ]) {
      expect(retryAfterMs(value, NOW)).toBeNull();
    }
  });
});
