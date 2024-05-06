import { useEffect, useState } from "react";
import { useJb721TiersHookMetadataIdTarget } from "src/generated/juicebox";
import { Address } from "viem";

/**
 * createMetadataTargetIdPayHash returns metadataTargetId hashed with string `"pay"`.
 */
async function createMetadataTargetIdPayHash(metadataTargetId: Address) {
  const encoder = new TextEncoder();
  const data = encoder.encode(metadataTargetId + "pay");
  const hash = await window.crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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

    createMetadataTargetIdPayHash(metadataTargetId).then(setHashedMetadataId);
  }, [metadataTargetId]);

  return hashedMetadataId;
}
