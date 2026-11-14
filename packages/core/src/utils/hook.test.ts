import { encodeAbiParameters, keccak256, toBytes } from "viem";
import { describe, expect, test } from "vitest";
import {
  addToHookMetadata,
  createHookMetadata,
  hookMetadataId,
} from "./hook.js";

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

describe("addToHookMetadata", () => {
  const word = (n: number) => `0x${n.toString(16).padStart(64, "0")}`;
  const ids = ["0x11111111", "0x22222222", "0x33333333"];
  const datas = [word(1), `${word(2)}${word(3).slice(2)}`, word(4)];

  test("appends an entry exactly as packing them together would", () => {
    let metadata: string | undefined;
    ids.forEach((id, i) => {
      metadata = addToHookMetadata(metadata, id, datas[i]);
      expect(metadata).toBe(
        createHookMetadata(ids.slice(0, i + 1), datas.slice(0, i + 1)),
      );
    });
  });

  test("keeps earlier entries when the lookup table grows into a second word", () => {
    // Six entries fill 30 bytes of table; the seventh spills into a new word.
    const many = Array.from({ length: 7 }, (_, i) => `0x0000000${i + 1}`);
    const payloads = many.map((_, i) => word(i + 10));
    const built = many
      .slice(0, 6)
      .reduce<
        string | undefined
      >((metadata, id, i) => addToHookMetadata(metadata, id, payloads[i]), undefined);
    expect(addToHookMetadata(built, many[6], payloads[6])).toBe(
      createHookMetadata(many, payloads),
    );
  });

  test("refuses malformed metadata instead of padding it into something valid", () => {
    const good = createHookMetadata([ids[0]], [TWO_WORDS]);
    const table = (entries: string) =>
      `0x${"0".repeat(64)}${entries.padEnd(64, "0")}${word(1).slice(2)}`;
    for (const bad of [
      // A payload cut mid-word: padding it would flip `true` to `false`.
      good.slice(0, -2),
      // Cut inside the lookup table.
      good.slice(0, 2 + 64 + 20),
      // The reserved word alone.
      `0x${"0".repeat(64)}`,
      // An offset pointing past the end.
      table("1111111109"),
      // An offset pointing into the table.
      table("1111111101"),
      // Offsets out of order.
      `${table("11111111022222222202")}${word(2).slice(2)}`,
    ])
      expect(() => addToHookMetadata(bad, ids[1], datas[1])).toThrow(
        "not well-formed",
      );
  });

  test("starts from empty metadata", () => {
    expect(addToHookMetadata("0x", ids[0], datas[0])).toBe(
      createHookMetadata([ids[0]], [datas[0]]),
    );
  });
});
