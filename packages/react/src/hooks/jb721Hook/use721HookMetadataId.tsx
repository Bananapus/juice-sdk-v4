import { useJBChainId } from "../../contexts/JBChainContext/JBChainContext";
import { Address } from "viem";
import { createMetadataTargetIdPayHash } from "./helpers";
import { jb721TiersHookAbi } from "juice-sdk-core";
import { useReadContract } from "wagmi";

/**
 * use721HookMetadataId returns the METADATA_TARGET_ID of the given dataHookAddress, hashed with string `"pay"`.
 */
export function use721HookMetadataId({
  dataHookAddress,
}: {
  dataHookAddress: Address | undefined;
}) {
  const chainId = useJBChainId();
  const { data: hashedMetadataId } = useReadContract({
    abi: jb721TiersHookAbi,
    functionName: "METADATA_ID_TARGET",
    chainId,
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
