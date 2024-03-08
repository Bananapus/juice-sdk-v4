import { DEFAULT_ALLOW_OVERSPENDING, createHookMetadata } from "juice-sdk-core";
import { useJBDataHookContext } from "src/contexts/JBDataHookContext/JBDataHookContext";
import { Address, Hash, encodeAbiParameters } from "viem";

function getJB721HookId(dataHook: Address) {
  return dataHook.slice(0, 10); // first 4 bytes
}

interface Jb721HookV3_2PayMetadata {
  tierIdsToMint: bigint[];
  allowOverspending?: boolean;
}

function encodeJB721HookPayMetadata(metadata: Jb721HookV3_2PayMetadata) {
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
  jb721Hook?: { tierIdsToMint: bigint[] };
} = {}): Hash | null {
  const dataHook = useJBDataHookContext();

  const HookIds: string[] = [];
  const metadatas: string[] = [];

  if (jb721Hook && dataHook.data && jb721Hook.tierIdsToMint.length > 0) {
    const jb721HookMetadata = encodeJB721HookPayMetadata({
      tierIdsToMint: jb721Hook.tierIdsToMint,
      allowOverspending: DEFAULT_ALLOW_OVERSPENDING,
    });

    HookIds.push(getJB721HookId(dataHook.data.address));
    metadatas.push(jb721HookMetadata);
  }

  return createHookMetadata(HookIds, metadatas) as Hash;
}
