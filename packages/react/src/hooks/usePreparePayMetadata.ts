import { DEFAULT_ALLOW_OVERSPENDING, createHookMetadata } from "juice-sdk-core";
import {
  JBDataHookName,
  useJBDataHookContext,
} from "src/contexts/JBDataHookContext/JBDataHookContext";
import { Address, Hash, encodeAbiParameters } from "viem";

function getJB721DelegateId(dataHook: Address) {
  return dataHook.slice(10); // first 4 bytes
}

interface Jb721DelegateV3_2PayMetadata {
  tierIdsToMint: bigint[];
  allowOverspending?: boolean;
}

function encodeJB721DelegatePayMetadata(
  metadata: Jb721DelegateV3_2PayMetadata
) {
  const args = [
    metadata.allowOverspending ?? DEFAULT_ALLOW_OVERSPENDING,
    metadata.tierIdsToMint.map(Number),
  ] as [boolean, readonly number[]];

  const encoded = encodeAbiParameters(
    [{ type: "bool" }, { type: "uint16[]" }],
    args
  );

  return encoded;
}

/**
 * Returns pay metadata for the given arguments, depending on the current datasource.
 * @note only supports JB721Delegate V3.4 datasource.
 * @note depends on JBDataSourceContext.
 * @todo support buy-back delegate.
 */
export function usePreparePayMetadata({
  jb721Delegate,
}: {
  jb721Delegate?: { tierIdsToMint: bigint[] };
} = {}): Hash | null {
  const dataHook = useJBDataHookContext();
  if (
    dataHook.data?.name !== JBDataHookName.JB721Delegate ||
    !jb721Delegate ||
    jb721Delegate.tierIdsToMint.length === 0
  ) {
    return null;
  }

  const jb721DelegateMetadata = encodeJB721DelegatePayMetadata({
    tierIdsToMint: jb721Delegate.tierIdsToMint,
    allowOverspending: DEFAULT_ALLOW_OVERSPENDING,
  });

  const delegateIds: string[] = [getJB721DelegateId(dataHook.data.address)];
  const metadatas: string[] = [jb721DelegateMetadata];

  return createHookMetadata(delegateIds, metadatas) as Hash;
}
