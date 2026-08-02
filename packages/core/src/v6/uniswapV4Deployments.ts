import type { Address } from "viem";
import type { JBChainId } from "../types.js";

/** Canonical PoolManager deployments used by Juicebox v6. */
export const UNISWAP_V4_POOL_MANAGER_ADDRESSES: Readonly<
  Partial<Record<JBChainId, Address>>
> = {
  1: "0x000000000004444c5dc75cb358380d2e3de08a90",
  10: "0x9a13f98cb987694c9f086b1f5eb990eea8264ec3",
  8453: "0x498581ff718922c3f8e6a244956af099b2652b2b",
  42161: "0x360e68faccca8ca495c1b759fd9eee466db9fb32",
  84532: "0x05e73354cfdd6745c338b50bcfdfa3aa6fa03408",
  421614: "0xfb3e0c6f74eb1a21cc1da29aec80d2dfe6c9a317",
  11155111: "0xe03a1074c86cfedd5c142c4f04f1a1536e203543",
};

/** Canonical PositionManager deployments used by Juicebox v6. */
export const UNISWAP_V4_POSITION_MANAGER_ADDRESSES: Readonly<
  Partial<Record<JBChainId, Address>>
> = {
  1: "0xbd216513d74c8cf14cf4747e6aaa6420ff64ee9e",
  10: "0x3c3ea4b57a46241e54610e5f022e5c45859a1017",
  8453: "0x7c5f5a4bbd8fd63184577525326123b519429bdc",
  42161: "0xd88f38f930b7952f2db2432cb002e7abbf3dd869",
  84532: "0x4b2c77d209d3405f41a037ec6c77f7f5b8e2ca80",
  421614: "0xac631556d3d4019c95769033b5e719dd77124bac",
  11155111: "0x429ba70129df741b2ca2a85bc3a2a3328e5c09b4",
};

/** Canonical V4Quoter deployments; missing chains must fail closed. */
export const UNISWAP_V4_QUOTER_ADDRESSES: Readonly<
  Partial<Record<JBChainId, Address>>
> = {
  1: "0x52f0e24d1c21c8a0cb1e5a5dd6198556bd9e1203",
  10: "0x1f3131a13296fb91c90870043742c3cdbff1a8d7",
  8453: "0x0d5e0f971ed27fbff6c2837bf31316121532048d",
  42161: "0x3972c00f7ed4885e145823eb7c655375d275a1c5",
  84532: "0x4a6513c898fe1b2d0e78d3b0e0a4a151589b1cba",
  421614: "0x7de51022d70a725b508085468052e25e22b5c4c9",
  11155111: "0x61b3f2011a92d183c7dbadbda940a7555ccf9227",
};

/** Canonical Universal Router deployments which support V4 swaps. */
export const UNISWAP_V4_UNIVERSAL_ROUTER_ADDRESSES: Readonly<
  Partial<Record<JBChainId, Address>>
> = {
  1: "0x66a9893cc07d91d95644aedd05d03f95e1dba8af",
  10: "0x851116d9223fabed8e56c0e6b8ad0c31d98b3507",
  8453: "0x6ff5693b99212da76ad316178a184ab56d299b43",
  42161: "0xa51afafe0263b40edaef0df8781ea9aa03e381a3",
  84532: "0x492e6456d9528771018deb9e87ef7750ef184104",
  421614: "0xefd1d4bd4cf1e86da286bb4cb1b8bced9c10ba47",
  11155111: "0x3A9D48AB9751398BbFa63ad67599Bb04e4BdF98b",
};

/**
 * Canonical StateView deployments — the periphery lens over PoolManager's
 * `extsload` storage. Each address was verified by calling `poolManager()` and
 * matching it against {@link UNISWAP_V4_POOL_MANAGER_ADDRESSES} for the chain.
 */
export const UNISWAP_V4_STATE_VIEW_ADDRESSES: Readonly<
  Partial<Record<JBChainId, Address>>
> = {
  1: "0x7ffe42c4a5deea5b0fec41c94c136cf115597227",
  10: "0xc18a3169788f4f75a170290584eca6395c75ecdb",
  8453: "0xa3c0c9b65bad0b08107aa264b0f3db444b867a71",
  42161: "0x76fd297e2d437cd7f76d50f01afe6160f86e9990",
  84532: "0x571291b572ed32ce6751a2cb2486ebee8defb9b4",
  421614: "0x9d467fa9062b6e9b1a46e26007ad82db116c67cb",
  11155111: "0xe1dd9c3fa50edb962e442f60dfbc432e24537e4c",
};

/** Permit2 is deployed at the same address on supported EVM chains. */
export const UNISWAP_PERMIT2_ADDRESS: Address =
  "0x000000000022D473030F116dDEE9F6B43aC78BA3";

/** Resolve the supported V4 surface for a chain without guessing addresses. */
export function uniswapV4Deployment(chainId: number): {
  poolManager: Address;
  positionManager: Address | null;
  quoter: Address | null;
  universalRouter: Address | null;
  stateView: Address | null;
  permit2: Address;
} | null {
  const poolManager = (
    UNISWAP_V4_POOL_MANAGER_ADDRESSES as Readonly<
      Partial<Record<number, Address>>
    >
  )[chainId];
  if (!poolManager) return null;
  return {
    poolManager,
    positionManager:
      (
        UNISWAP_V4_POSITION_MANAGER_ADDRESSES as Readonly<
          Partial<Record<number, Address>>
        >
      )[chainId] ?? null,
    quoter:
      (
        UNISWAP_V4_QUOTER_ADDRESSES as Readonly<
          Partial<Record<number, Address>>
        >
      )[chainId] ?? null,
    universalRouter:
      (
        UNISWAP_V4_UNIVERSAL_ROUTER_ADDRESSES as Readonly<
          Partial<Record<number, Address>>
        >
      )[chainId] ?? null,
    stateView:
      (
        UNISWAP_V4_STATE_VIEW_ADDRESSES as Readonly<
          Partial<Record<number, Address>>
        >
      )[chainId] ?? null,
    permit2: UNISWAP_PERMIT2_ADDRESS,
  };
}
