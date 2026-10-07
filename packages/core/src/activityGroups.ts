/** Display matching may span six hours of chain confirmation delays. Timestamps are seconds. */
const CROSS_CHAIN_MERGE_WINDOW = 6 * 3600;

/**
 * Fold matching project activity across distinct chains, preserving input order
 * and the first representative value. The caller supplies the display signature,
 * including actor identity, after same-transaction grouping and filtering.
 *
 * Each row joins the first matching group within six hours of that group's first
 * row, provided its chain is not already present. Every original chain/hash link
 * is retained. This display heuristic does not prove shared transaction intent
 * or membership in a Relayr bundle.
 */
export function mergeCrossChainActivityGroups<T>(
  rows: readonly {
    value: T;
    signature: string;
    chainId: number;
    txHash: string;
    timestamp: number;
  }[],
): { value: T; chains: { chainId: number; txHash: string }[] }[] {
  const merged: {
    value: T;
    signature: string;
    timestamp: number;
    chains: { chainId: number; txHash: string }[];
  }[] = [];
  for (const row of rows) {
    const host = merged.find(
      (entry) =>
        entry.signature === row.signature &&
        Math.abs(entry.timestamp - row.timestamp) <= CROSS_CHAIN_MERGE_WINDOW &&
        !entry.chains.some((chain) => chain.chainId === row.chainId),
    );
    if (host) {
      host.chains.push({ chainId: row.chainId, txHash: row.txHash });
    } else {
      merged.push({
        value: row.value,
        signature: row.signature,
        timestamp: row.timestamp,
        chains: [{ chainId: row.chainId, txHash: row.txHash }],
      });
    }
  }
  return merged.map(({ value, chains }) => ({ value, chains }));
}
