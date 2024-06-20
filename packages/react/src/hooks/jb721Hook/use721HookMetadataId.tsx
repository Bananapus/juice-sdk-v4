import { useEffect, useState } from "react";
import { useReadJb721TiersHookMetadataIdTarget } from "src/generated/juicebox";
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
  const { data: hashedMetadataId } = useReadJb721TiersHookMetadataIdTarget({
    address: dataHookAddress,
    query: {
      enabled: !!dataHookAddress,
      select(metadataTargetId) {
        return createMetadataTargetIdPayHash(metadataTargetId, "pay");
      },
    },
  });

  return hashedMetadataId;
}
