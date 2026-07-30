import { describe, expect, expectTypeOf, it } from "vitest";
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
import { JB_CHAINS } from "./constants.js";

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

  it("preserves each JB_CHAINS key as its chain's literal ID type", () => {
    expectTypeOf(JB_CHAINS[1].chain.id).toEqualTypeOf<1>();
    expectTypeOf(JB_CHAINS[10].chain.id).toEqualTypeOf<10>();
    expectTypeOf(JB_CHAINS[8453].chain.id).toEqualTypeOf<8453>();
    expectTypeOf(JB_CHAINS[42161].chain.id).toEqualTypeOf<42161>();
    expectTypeOf(JB_CHAINS[11155111].chain.id).toEqualTypeOf<11155111>();
    expectTypeOf(JB_CHAINS[11155420].chain.id).toEqualTypeOf<11155420>();
    expectTypeOf(JB_CHAINS[84532].chain.id).toEqualTypeOf<84532>();
    expectTypeOf(JB_CHAINS[421614].chain.id).toEqualTypeOf<421614>();
  });
});
