import { describe, expect, it } from "vitest";
import {
  arbitrum as viemArbitrum,
  arbitrumSepolia as viemArbitrumSepolia,
  base as viemBase,
  baseSepolia as viemBaseSepolia,
  mainnet as viemMainnet,
  optimism as viemOptimism,
  optimismSepolia as viemOptimismSepolia,
  sepolia as viemSepolia,
} from "viem/chains";
import {
  arbitrum,
  arbitrumSepolia,
  base,
  baseSepolia,
  mainnet,
  optimism,
  optimismSepolia,
  sepolia,
} from "./chains.js";

describe("supported chain definitions", () => {
  it.each([
    ["mainnet", mainnet, viemMainnet],
    ["sepolia", sepolia, viemSepolia],
    ["optimism", optimism, viemOptimism],
    ["optimismSepolia", optimismSepolia, viemOptimismSepolia],
    ["base", base, viemBase],
    ["baseSepolia", baseSepolia, viemBaseSepolia],
    ["arbitrum", arbitrum, viemArbitrum],
    ["arbitrumSepolia", arbitrumSepolia, viemArbitrumSepolia],
  ])("keeps %s aligned with viem", (_name, local, upstream) => {
    expect(local).toEqual(upstream);
  });
});
