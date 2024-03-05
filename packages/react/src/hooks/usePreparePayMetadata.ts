import { DEFAULT_ALLOW_OVERSPENDING } from "juice-sdk-core";
import { Hash, encodeAbiParameters } from "viem";
import {
  JBDataSourceName,
  useJBDataSourceContext,
} from "../../../contexts/JBDataSourceContext/JBDataSourceContext";

const IJBTiered721Delegate_V3_4_PAY_ID = "0x37323150"; // "721P", encoded as bytes4

interface Jb721DelegateV3_2PayMetadata {
  tierIdsToMint: bigint[];
  allowOverspending?: boolean;
}

function encodeJB721DelegateV3_4PayMetadata(
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
  const dataSource = useJBDataSourceContext();
  if (
    dataSource.data?.name !== JBDataSourceName.JB721Delegate ||
    !jb721Delegate ||
    jb721Delegate.tierIdsToMint.length === 0
  ) {
    return null;
  }

  const jb721DelegateMetadata = encodeJB721DelegateV3_4PayMetadata({
    tierIdsToMint: jb721Delegate.tierIdsToMint,
    allowOverspending: DEFAULT_ALLOW_OVERSPENDING,
  });

  const delegateIds: string[] = [IJBTiered721Delegate_V3_4_PAY_ID];
  const metadatas: string[] = [jb721DelegateMetadata];

  return createHookMetadata(delegateIds, metadatas) as Hash;
}
