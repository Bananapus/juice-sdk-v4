import { Hash, encodePacked, zeroHash } from "viem";

/**
 *
 * Create metadata for pay or redeem hooks.
 * 
 * @link https://github.com/simplemachine92/JBMetadata-Helper
 * @attribution simplemachine92/nowonder
 */
export function createHookMetadata(ids: string[], metadatas: string[]) {
  // Check lengths
  if (ids.length !== metadatas.length) throw new Error("LENGTH_MISMATCH");

  // Initialize metadata with first 32B for the protocol reserved word
  let metadata = encodePacked(["bytes32"], [zeroHash]);

  // Calculate offset for the data is after the first reserved word...
  let offset = 1;

  // ... and after the id/offset lookup table, rounding up to 32 bytes if not a multiple
  offset += Math.floor(ids.length);

  // For each id, add it to the lookup table with the next free offset, then increment the offset by the data length
  for (let i = 0; i < ids.length; i++) {
    // Get metadata, id and offset
    metadata += encodePacked(["bytes4"], [ids[i] as Hash]).slice(2);

    metadata += encodePacked(["uint8"], [offset]).slice(2);
    // increment the offset by the data length, rounded up to the nearest 32-byte word
    offset += metadatas[i].length / 32;

    // Overflowing a bytes1?
    if (offset > 2 ** 8) throw new Error("METADATA_TOO_LONG");
  }

  // Pad the table to a multiple of 32B
  let paddedLength =
    metadata.length % 32 === 0
      ? metadata.length
      : Math.ceil(metadata.length / 32 + 1) * 32;

  // Update metadata length
  metadata = metadata.padEnd(paddedLength + 2, "0") as Hash;

  // Add each metadata to the array, each padded to 32 bytes
  for (let i = 0; i < metadatas.length; i++) {
    // Append metadata to array
    metadata += encodePacked(
      ["bytes"],
      [metadatas[i].padEnd(paddedLength, "0") as Hash]
    ).slice(2);
  }

  // Return complete metadata
  return metadata;
}
