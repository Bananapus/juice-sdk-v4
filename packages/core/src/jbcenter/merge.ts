import type { Address } from "viem";
import type {
  JBCenterIntent,
  JBCenterSearchItem,
  JBCenterJsonObject,
} from "../jbcenter.js";

export type JBCenterIntentRow = {
  undeployed: true;
  intentId: string;
  name: string;
  tagline: string | null;
  logoUri: string | null;
  owner: Address | null;
  chainIds: number[];
  createdAt: number;
};

export function intentRow(item: JBCenterSearchItem): JBCenterIntentRow {
  const createdAt = Date.parse(item.createdAt);

  return {
    undeployed: true,
    intentId: item.intentId,
    name: item.name,
    tagline: item.tagline,
    logoUri: item.logoUri,
    owner: item.owner,
    chainIds: item.chainIds,
    createdAt: Number.isNaN(createdAt) ? 0 : Math.floor(createdAt / 1000),
  };
}

/** Deployed rows win ties so a list never reorders once an intent lands. */
export function mergeSearch<T extends { createdAt: number }>(
  rows: readonly T[],
  items: readonly JBCenterSearchItem[],
): (T | JBCenterIntentRow)[] {
  type Entry = { value: T | JBCenterIntentRow; isRow: boolean };

  const entries: Entry[] = [
    ...rows.map((value): Entry => ({ value, isRow: true })),
    ...items.map((item): Entry => ({ value: intentRow(item), isRow: false })),
  ];

  entries.sort((a, b) => {
    if (a.value.createdAt !== b.value.createdAt) {
      return b.value.createdAt - a.value.createdAt;
    }
    if (a.isRow !== b.isRow) return a.isRow ? -1 : 1;
    return 0;
  });

  return entries.map((entry) => entry.value);
}

export function intentPath(intentId: string): string {
  return `/intent/${encodeURIComponent(intentId)}`;
}

export function deployedChains(
  intent: JBCenterIntent<JBCenterJsonObject>,
): Record<number, string> {
  const result: Record<number, string> = {};

  for (const deployment of intent.deployments) {
    result[deployment.chainId] = deployment.projectId;
  }

  return result;
}

export function isFullyDeployed(
  intent: JBCenterIntent<JBCenterJsonObject>,
): boolean {
  const deployed = deployedChains(intent);

  return intent.envelope.chainIds.every((chainId) => chainId in deployed);
}
