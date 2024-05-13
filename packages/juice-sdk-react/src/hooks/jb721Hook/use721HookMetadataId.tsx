import { useEffect, useState } from "react";
import { useJb721TiersHookMetadataIdTarget } from "src/generated/juicebox";
import { Address, bytesToString, keccak256, toBytes } from "viem";

/**
 * createMetadataTargetIdPayHash returns metadataTargetId hashed with string `"pay"`.
 */
async function createMetadataTargetIdPayHash(
  metadataTargetId: Address,
  purpose: string = "pay"
) {
  const targetBytes = toBytes(metadataTargetId);
  const purposeBytes = toBytes(purpose);

  const targetBytes20 = keccak256(targetBytes).slice(0, 20);
  const purposeKeccak = keccak256(purposeBytes);
  const purposeBytes20 = purposeKeccak.slice(0, 20);

  const xorResult = toBytes(targetBytes20).map(
    (byte, i) => byte ^ toBytes(purposeBytes20)[i]
  );

  return bytesToString(xorResult.slice(0, 4));
}

/**
 * use721HookMetadataId returns the METADATA_TARGET_ID of the given dataHookAddress, hashed with string `"pay"`.
 */
export function use721HookMetadataId({
  dataHookAddress,
}: {
  dataHookAddress: Address | undefined;
}) {
  const [hashedMetadataId, setHashedMetadataId] = useState<string | null>(null);

  const { data: metadataTargetId } = useJb721TiersHookMetadataIdTarget({
    address: dataHookAddress,
    enabled: !!dataHookAddress,
  });

  useEffect(() => {
    if (!metadataTargetId) {
      return;
    }

    createMetadataTargetIdPayHash(metadataTargetId, "pay").then(
      setHashedMetadataId
    );
  }, [metadataTargetId]);

  return hashedMetadataId;
}
