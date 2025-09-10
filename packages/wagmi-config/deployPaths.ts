export type JBVersion = 4 | 5;

const V5_BASE_MAP: Record<string, string> = {
  "@bananapus/core/deployments/nana-core": "@bananapus/core-v5/deployments/nana-core-v5",
  "@bananapus/721-hook/deployments/nana-721-hook":
    "@bananapus/721-hook-v5/deployments/nana-721-hook-v5",
  "@bananapus/address-registry/deployments/nana-address-registry":
    "@bananapus/address-registry-v5/deployments/nana-address-registry-v5",
  "@bananapus/suckers/deployments/nana-suckers":
    "@bananapus/suckers-v5/deployments/nana-suckers-v5",
  "@bananapus/swap-terminal/deployments/nana-swap-terminal":
    "@bananapus/swap-terminal-v5/deployments/nana-swap-terminal-v5",
  "@bananapus/buyback-hook/deployments/nana-buyback-hook":
    "@bananapus/buyback-hook-v5/deployments/nana-buyback-hook-v5",
  "@bananapus/omnichain-deployers/deployments/nana-omnichain-deployers":
    "@bananapus/omnichain-deployers-v5/deployments/nana-omnichain-deployers-v5",
};

export function withVersionPath(
  base: string,
  version: JBVersion,
  chainName: string,
  contractName: string
) {
  if (version === 5) {
    const mapped = V5_BASE_MAP[base];
    if (mapped) return `${mapped}/${chainName}/${contractName}.json`;
  }
  return `${base}/${chainName}/${contractName}.json`;
}

export type Family =
  | "core"
  | "721"
  | "address-registry"
  | "suckers"
  | "swap-terminal"
  | "buyback-hook"
  | "omnichain-deployers";

export const FAMILY_BASES: Record<Family, string> = {
  core: "@bananapus/core/deployments/nana-core",
  "721": "@bananapus/721-hook/deployments/nana-721-hook",
  "address-registry": "@bananapus/address-registry/deployments/nana-address-registry",
  suckers: "@bananapus/suckers/deployments/nana-suckers",
  "swap-terminal": "@bananapus/swap-terminal/deployments/nana-swap-terminal",
  "buyback-hook": "@bananapus/buyback-hook/deployments/nana-buyback-hook",
  "omnichain-deployers": "@bananapus/omnichain-deployers/deployments/nana-omnichain-deployers",
};

export function pathForFamily(
  version: JBVersion,
  family: Family,
  chainName: string,
  contractName: string
) {
  const base = FAMILY_BASES[family];
  return withVersionPath(base, version, chainName, contractName);
}
