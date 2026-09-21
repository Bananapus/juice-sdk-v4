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
  return {
    undeployed: true,
    intentId: item.intentId,
    name: item.name,
    tagline: item.tagline,
    logoUri: item.logoUri,
    owner: item.owner,
    chainIds: item.chainIds,
    createdAt: Math.floor(Date.parse(item.createdAt) / 1000),
  };
}

export function mergeSearch<T extends { createdAt: number }>(
  rows: readonly T[],
  items: readonly JBCenterSearchItem[],
): (T | JBCenterIntentRow)[] {
  const convertedItems = items.map(intentRow);

  type WithSource = (T | JBCenterIntentRow) & { _isRow?: boolean };

  const all: WithSource[] = [];

  for (const row of rows) {
    (all as WithSource[]).push({ ...row, _isRow: true } as WithSource);
  }

  for (const item of convertedItems) {
    (all as WithSource[]).push(item as WithSource);
  }

  all.sort((a, b) => {
    if (a.createdAt !== b.createdAt) {
      return b.createdAt - a.createdAt;
    }
    if (a._isRow && !b._isRow) return -1;
    if (!a._isRow && b._isRow) return 1;
    return 0;
  });

  return all.map((item) => {
    const { _isRow, ...rest } = item;
    return rest as T | JBCenterIntentRow;
  });
}

export function intentPath(intentId: string): string {
  return `/intent/${intentId}`;
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
