import { DEFAULT_ALLOW_OVERSPENDING, createHookMetadata } from "juice-sdk-core";
import { Address, Hash, encodeAbiParameters } from "viem";

function getJB721HookId(dataHook: Address) {
  return dataHook.slice(0, 10); // first 4 bytes
}

interface Jb721HookPayMetadata {
  tierIdsToMint: bigint[];
  allowOverspending?: boolean;
}

function encodeJB721HookPayMetadata(metadata: Jb721HookPayMetadata) {
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
 * @note only supports JB721Hook V3.4 datasource.
 * @note depends on JBDataSourceContext.
 * @todo support buy-back Hook.
 */
export function usePreparePayMetadata({
  jb721Hook,
}: {
  jb721Hook?: { dataHookAddress: Address; tierIdsToMint: bigint[] };
} = {}): Hash | null {
  const HookIds: string[] = [];
  const metadatas: string[] = [];

  if (jb721Hook && jb721Hook.tierIdsToMint.length > 0) {
    const jb721HookMetadata = encodeJB721HookPayMetadata({
      tierIdsToMint: jb721Hook.tierIdsToMint,
      allowOverspending: DEFAULT_ALLOW_OVERSPENDING,
    });

    HookIds.push(getJB721HookId(jb721Hook.dataHookAddress));
    metadatas.push(jb721HookMetadata);
  }

  return createHookMetadata(HookIds, metadatas) as Hash;
}
