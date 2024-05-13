import { Address, bytesToHex, keccak256, toBytes } from "viem";

/**
 * createMetadataTargetIdPayHash returns metadataTargetId hashed with string `"pay"`.
 *
 * @link https://github.com/Bananapus/nana-core/blob/cfb1d4cd4e79bed840a9c8fcd17a0f397da3e3bf/src/libraries/JBMetadataResolver.sol#L280
 * bytes4(bytes20(target) ^ bytes20(keccak256(bytes(purpose))));
 */
export function createMetadataTargetIdPayHash(
  metadataTargetId: Address,
  purpose: string = "pay"
) {
  const targetBytes = toBytes(metadataTargetId);
  const purposeBytes = toBytes(purpose);

  const targetBytes20 = targetBytes.slice(0, 20);
  const purposeBytes20 = toBytes(keccak256(purposeBytes)).slice(0, 20);

  const xorResult = targetBytes20.map((byte, i) => byte ^ purposeBytes20[i]);

  return bytesToHex(xorResult.slice(0, 4));
}
