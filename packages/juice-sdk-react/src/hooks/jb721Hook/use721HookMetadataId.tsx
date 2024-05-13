import { useEffect, useState } from "react";
import { useJb721TiersHookMetadataIdTarget } from "src/generated/juicebox";
import { Address } from "viem";
import { createMetadataTargetIdPayHash } from "./helpers";

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

    const newHash = createMetadataTargetIdPayHash(metadataTargetId, "pay");
    setHashedMetadataId(newHash);
  }, [metadataTargetId]);

  return hashedMetadataId;
}
