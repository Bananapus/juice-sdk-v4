import { Address, Hex, bytesToHex, keccak256, toBytes } from "viem";

/**
 * The metadata lookup id a JB hook resolves via `JBMetadataResolver.getId`:
 * `bytes4(bytes20(target) ^ bytes20(keccak256(purpose)))`.
 *
 * For JB721 hooks, `target` MUST be the hook's `METADATA_ID_TARGET` — which is
 * `address(this)` in the *implementation's* constructor, so every delegatecall
 * clone reports the shared implementation address, NOT its own clone address.
 * Passing the clone address yields an id the hook never matches, so the pay or
 * cash out silently ignores the tier/token payload. Resolve the target with
 * `get721MetadataIdTarget` rather than passing a hook address directly.
 *
 * @link https://github.com/Bananapus/nana-core-v6/blob/main/src/libraries/JBMetadataResolver.sol (`getId`)
 */
export function hookMetadataId(target: Address, purpose: string): Hex {
  const targetBytes = toBytes(target).slice(0, 20);
  const purposeBytes = toBytes(keccak256(toBytes(purpose))).slice(0, 20);
  const xored = targetBytes.map((byte, i) => byte ^ purposeBytes[i]);
  return bytesToHex(xored.slice(0, 4));
}

/** `JBMetadataResolver.WORD_SIZE` — every section of the layout is word-aligned. */
const WORD_SIZE = 32;
/** `JBMetadataResolver.TOTAL_ID_SIZE` — 4 bytes of id plus 1 byte of offset. */
const TOTAL_ID_SIZE = 5;
/** The offset column is a single byte, so no entry may start past word 255. */
const MAX_OFFSET = 255;

/** Hex chars per 32-byte word. */
const WORD_CHARS = WORD_SIZE * 2;

/**
 * Strip the `0x` prefix after asserting the value is a whole number of bytes,
 * normalizing case so the packed result is comparable as a string.
 */
function hexBody(value: string, label: string): string {
  if (!/^0x([0-9a-fA-F]{2})*$/.test(value)) {
    throw new Error(`${label} must be a 0x-prefixed hex string of whole bytes`);
  }
  return value.slice(2).toLowerCase();
}

/**
 * Pack `{id: data}` entries into the JBMetadataResolver layout a JB hook parses
 * with `getDataFor`:
 *
 * - a 32-byte protocol-reserved word,
 * - a lookup table of `(bytes4 id, uint8 wordOffset)` entries padded to 32 bytes,
 * - each payload, padded to a whole number of 32-byte words.
 *
 * Offsets are counted in WORDS, not bytes: the first payload starts at word
 * `1 + ceil(ids.length * 5 / 32)` and each subsequent offset advances by the
 * payload's word count. Byte-for-byte identical to `JBMetadataResolver.createMetadata`
 * for the inputs Solidity accepts (payloads that are already a non-zero multiple
 * of 32 bytes); shorter or unaligned payloads are right-padded here rather than
 * rejected, since the resolver reads a payload as the span between two offsets.
 *
 * @param ids The 4-byte lookup ids, from {@link hookMetadataId}.
 * @param metadatas The payload for each id, positionally matched.
 * @returns The packed metadata, or `0x` when there are no entries.
 * @link https://github.com/Bananapus/nana-core-v6/blob/main/src/libraries/JBMetadataResolver.sol (`createMetadata`)
 */
export function createHookMetadata(ids: string[], metadatas: string[]): Hex {
  if (ids.length !== metadatas.length) throw new Error("LENGTH_MISMATCH");

  // Solidity returns empty bytes rather than a lone reserved word.
  if (ids.length === 0) return "0x";

  // Pad every payload up to a whole number of words first: the lookup table's
  // offsets are word counts of the PADDED payloads, so they cannot be computed
  // from the raw lengths.
  const payloads = metadatas.map((metadata, i) => {
    const body = hexBody(metadata, `metadatas[${i}]`);
    if (body.length === 0) {
      throw new Error(`metadatas[${i}] cannot be empty`);
    }
    return body.padEnd(Math.ceil(body.length / WORD_CHARS) * WORD_CHARS, "0");
  });

  // The first payload sits after the reserved word and after the lookup table,
  // which is itself rounded up to whole words.
  let offset = 1 + Math.ceil((ids.length * TOTAL_ID_SIZE) / WORD_SIZE);

  let table = "";
  for (let i = 0; i < ids.length; i++) {
    const id = hexBody(ids[i], `ids[${i}]`);
    if (id.length !== 8) throw new Error(`ids[${i}] must be 4 bytes`);

    table += id + offset.toString(16).padStart(2, "0");
    offset += payloads[i].length / WORD_CHARS;

    // Overflowing the single offset byte?
    if (offset > MAX_OFFSET) throw new Error("METADATA_TOO_LONG");
  }

  const paddedTable = table.padEnd(
    Math.ceil(table.length / WORD_CHARS) * WORD_CHARS,
    "0",
  );

  return `0x${"0".repeat(WORD_CHARS)}${paddedTable}${payloads.join("")}` as Hex;
}
