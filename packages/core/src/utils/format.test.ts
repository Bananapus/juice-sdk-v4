import { describe, expect, test } from "vitest";
import { formatEthAddress, formatEther, formatUnits } from "./format.js";

describe("formatting utilities", () => {
  test("formats Ethereum address correctly", () => {
    const address = "0x123456789abcdef0123456789abcdef012345678";
    expect(formatEthAddress(address, { truncateTo: 4 })).toEqual(
      "0x1234...5678"
    );
  });

  test.each`
    wei                     | fractionDigits | expected
    ${1000000000000000000n} | ${2}           | ${"1"}
    ${1234567890123456789n} | ${3}           | ${"1.235"}
    ${1234567890123456789n} | ${0}           | ${"1"}
  `("formats Ether correctly", ({ wei, fractionDigits, expected }) => {
    expect(formatEther(wei, { fractionDigits })).toEqual(expected);
  });

  test.each`
    value          | units | fractionDigits | expected
    ${1000000000n} | ${9}  | ${2}           | ${"1"}
    ${1234567890n} | ${9}  | ${3}           | ${"1.235"}
    ${1234567890n} | ${9}  | ${0}           | ${"1"}
  `("formats Units correctly", ({ value, units, fractionDigits, expected }) => {
    expect(formatUnits(value, units, { fractionDigits })).toEqual(expected);
  });
});
