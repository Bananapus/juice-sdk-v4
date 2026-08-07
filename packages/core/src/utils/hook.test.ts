import { encodeAbiParameters, keccak256, toBytes } from "viem";
import { describe, expect, test } from "vitest";
import { createHookMetadata, hookMetadataId } from "./hook.js";

/**
 * Expected bytes captured from `JBMetadataResolver.createMetadata` in
 * nana-core-v6 (`forge test` over the library with the same ids and payloads),
 * so these assertions pin byte-exactness against the on-chain parser rather
 * than against this implementation's own arithmetic.
 */
const ONE_WORD = encodeAbiParameters([{ type: "uint256" }], [0x1111n]);
const TWO_WORDS = encodeAbiParameters(
  [{ type: "uint256" }, { type: "bool" }],
  [1000n, true],
);
const FIVE_WORDS = encodeAbiParameters(
  [{ type: "bool" }, { type: "uint16[]" }],
  [true, [1, 3]],
);

const byteLength = (hex: string) => (hex.length - 2) / 2;

describe("createHookMetadata", () => {
  test("matches Solidity for a single one-word payload", () => {
    expect(createHookMetadata(["0xaabbccdd"], [ONE_WORD])).toBe(
      "0x0000000000000000000000000000000000000000000000000000000000000000" +
        "aabbccdd02" +
        "0".repeat(54) +
        "0000000000000000000000000000000000000000000000000000000000001111",
    );
    // The pre-fix implementation emitted 127 bytes here.
    expect(byteLength(createHookMetadata(["0xaabbccdd"], [ONE_WORD]))).toBe(96);
  });

  test("matches Solidity for a single two-word payload", () => {
    expect(createHookMetadata(["0x12345678"], [TWO_WORDS])).toBe(
      "0x0000000000000000000000000000000000000000000000000000000000000000" +
        "1234567802" +
        "0".repeat(54) +
        "00000000000000000000000000000000000000000000000000000000000003e8" +
        "0000000000000000000000000000000000000000000000000000000000000001",
    );
  });

  test("matches Solidity for a 721 + buyback composition", () => {
    // The pre-fix implementation threw `RangeError` on any two-entry call.
    expect(
      createHookMetadata(["0xdeadbeef", "0xcafebabe"], [FIVE_WORDS, TWO_WORDS]),
    ).toBe(
      "0x0000000000000000000000000000000000000000000000000000000000000000" +
        // offsets 2 and 7: the table takes one word, the 721 payload five.
        "deadbeef02cafebabe07" +
        "0".repeat(44) +
        "0000000000000000000000000000000000000000000000000000000000000001" +
        "0000000000000000000000000000000000000000000000000000000000000040" +
        "0000000000000000000000000000000000000000000000000000000000000002" +
        "0000000000000000000000000000000000000000000000000000000000000001" +
        "0000000000000000000000000000000000000000000000000000000000000003" +
        "00000000000000000000000000000000000000000000000000000000000003e8" +
        "0000000000000000000000000000000000000000000000000000000000000001",
    );
  });

  test("matches Solidity when the lookup table spills into a second word", () => {
    const ids = Array.from(
      { length: 7 },
      (_, i) => `0x${(i + 1).toString(16).padStart(8, "0")}`,
    );
    const payloads = ids.map((_, i) =>
      encodeAbiParameters([{ type: "uint256" }], [BigInt(i + 1)]),
    );

    expect(createHookMetadata(ids, payloads)).toBe(
      "0x0000000000000000000000000000000000000000000000000000000000000000" +
        // 7 * 5 = 35 bytes of table => two words => first payload at word 3.
        "000000010300000002040000000305000000040600000005070000000608000000" +
        "0709" +
        "0".repeat(58) +
        payloads.map((payload) => payload.slice(2)).join(""),
    );
  });

  test("round-trips the ids produced by hookMetadataId", () => {
    const id = hookMetadataId(
      "0x1234567890abcdef1234567890abcdef12345678",
      "pay",
    );
    const metadata = createHookMetadata([id], [TWO_WORDS]);
    expect(metadata.slice(66, 74)).toBe(id.slice(2));
    expect(byteLength(metadata)).toBe(128);
  });

  test("returns empty bytes for no entries", () => {
    expect(createHookMetadata([], [])).toBe("0x");
  });

  test("pads a short or unaligned payload up to a whole word", () => {
    expect(createHookMetadata(["0xaabbccdd"], ["0x1111"])).toBe(
      "0x0000000000000000000000000000000000000000000000000000000000000000" +
        "aabbccdd02" +
        "0".repeat(54) +
        "1111" +
        "0".repeat(60),
    );
  });

  test("rejects mismatched, malformed, and empty inputs", () => {
    expect(() => createHookMetadata(["0xaabbccdd"], [])).toThrow(
      "LENGTH_MISMATCH",
    );
    expect(() => createHookMetadata(["0xaabbccdd"], ["0x"])).toThrow(
      "metadatas[0] cannot be empty",
    );
    expect(() => createHookMetadata(["0xaabbccdd"], ["0x111"])).toThrow(
      "metadatas[0] must be a 0x-prefixed hex string of whole bytes",
    );
    expect(() => createHookMetadata(["0xaabbcc"], [ONE_WORD])).toThrow(
      "ids[0] must be 4 bytes",
    );
    expect(() => createHookMetadata(["aabbccdd"], [ONE_WORD])).toThrow(
      "ids[0] must be a 0x-prefixed hex string of whole bytes",
    );
  });

  test("rejects a payload set that overflows the one-byte offset column", () => {
    expect(() =>
      createHookMetadata(["0xaabbccdd"], [`0x${"0".repeat(254 * 64)}`]),
    ).toThrow("METADATA_TOO_LONG");
    // 253 words leaves the next offset at 255, the last addressable word.
    expect(() =>
      createHookMetadata(["0xaabbccdd"], [`0x${"0".repeat(253 * 64)}`]),
    ).not.toThrow();
  });
});

describe("hookMetadataId", () => {
  test("xors the target with the purpose hash, per JBMetadataResolver.getId", () => {
    const target = "0x1234567890abcdef1234567890abcdef12345678";
    const purposeHash = keccak256(toBytes("cashOut"));
    const expected = Array.from({ length: 4 }, (_, i) =>
      (
        Number.parseInt(target.slice(2 + i * 2, 4 + i * 2), 16) ^
        Number.parseInt(purposeHash.slice(2 + i * 2, 4 + i * 2), 16)
      )
        .toString(16)
        .padStart(2, "0"),
    ).join("");

    expect(hookMetadataId(target, "cashOut")).toBe(`0x${expected}`);
  });
});
