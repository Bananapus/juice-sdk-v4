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

  it("derives every etherscanHostname from the chain's own block explorer", () => {
    for (const { chain, etherscanHostname } of Object.values(JB_CHAINS)) {
      expect(etherscanHostname).toBe(
        new URL(chain.blockExplorers!.default.url).hostname,
      );
    }
    // The regression this derivation prevents: a hand-maintained copy shipped
    // the DNS-dead `optimism.etherscan.io` while the chain definition carried
    // the correct host.
    expect(JB_CHAINS[10].etherscanHostname).toBe("optimistic.etherscan.io");
  });

  it("derives every JB_CHAINS display name from the chain definition", () => {
    for (const { chain, name } of Object.values(JB_CHAINS)) {
      expect(name).toBe(chain.name);
    }
    // The regression this derivation prevents: a hand-maintained copy read
    // "Optimism"/"Optimism Sepolia"/"Arbitrum" while the chain definitions
    // carried the canonical names.
    expect(JB_CHAINS[10].name).toBe("OP Mainnet");
    expect(JB_CHAINS[11155420].name).toBe("OP Sepolia");
    expect(JB_CHAINS[42161].name).toBe("Arbitrum One");
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
