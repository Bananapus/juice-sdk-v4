import { arbitrum, base, mainnet, optimism, sepolia } from "viem/chains";
import { describe, expect, it } from "vitest";
import { jbUrn } from "./urn.js";

describe("jbUrn", () => {
  describe("valid URNs", () => {
    it("should parse /eth:3 as mainnet project id 3, version 4", () => {
      const result = jbUrn("eth:3");
      expect(result).toEqual({ chainId: mainnet.id, projectId: 3n, version: 4 });
    });

    it("should parse /v5:eth:5 as mainnet project id 5, version 5", () => {
      const result = jbUrn("v5:eth:5");
      expect(result).toEqual({ chainId: mainnet.id, projectId: 5n, version: 5 });
    });

    it("should parse large project IDs correctly", () => {
      const result = jbUrn("eth:999999999999999999");
      expect(result).toEqual({ chainId: mainnet.id, projectId: 999999999999999999n, version: 4 });
    });
  });

  describe("supported chains", () => {
    const chainTests = [
      { slug: "eth", chainId: mainnet.id, name: "Ethereum mainnet" },
      { slug: "sep", chainId: sepolia.id, name: "Sepolia testnet" },
      { slug: "op", chainId: optimism.id, name: "Optimism" },
      { slug: "base", chainId: base.id, name: "Base" },
      { slug: "arb", chainId: arbitrum.id, name: "Arbitrum" },
    ];

    chainTests.forEach(({ slug, chainId, name }) => {
      it(`should parse ${name} (${slug}) correctly`, () => {
        const result = jbUrn(`${slug}:42`);
        expect(result).toEqual({ chainId, projectId: 42n, version: 4 });
      });
    });
  });

  describe("version validation", () => {
    it("should accept versions 4 and 5, default to 4", () => {
      expect(jbUrn("v4:eth:1")?.version).toBe(4);
      expect(jbUrn("v5:eth:1")?.version).toBe(5);
      expect(jbUrn("eth:1")?.version).toBe(4); // default
    });

    it("should reject invalid versions", () => {
      expect(jbUrn("v1:eth:3")).toBeNull();
      expect(jbUrn("v6:eth:3")).toBeNull();
      expect(jbUrn("v0:eth:3")).toBeNull();
    });
  });

  describe("invalid URNs", () => {
    it("should return null for invalid version format", () => {
      expect(jbUrn("version5:eth:3")).toBeNull();
      expect(jbUrn("5:eth:3")).toBeNull();
      expect(jbUrn("V5:eth:3")).toBeNull();
      expect(jbUrn("v5a:eth:3")).toBeNull();
    });

    it("should return null for unknown chain names", () => {
      expect(jbUrn("bitcoin:3")).toBeNull();
      expect(jbUrn("ethereum:3")).toBeNull();
      expect(jbUrn("ETH:3")).toBeNull();
    });

    it("should return null for malformed URLs", () => {
      expect(jbUrn("")).toBeNull();
      expect(jbUrn("eth:")).toBeNull();
      expect(jbUrn(":3")).toBeNull();
      expect(jbUrn("v5:eth:3:extra")).toBeNull();
      expect(jbUrn("eth")).toBeNull();
    });

    it("should handle invalid project IDs", () => {
      expect(jbUrn("eth:abc")).toBeNull();
      expect(jbUrn("eth:3.14")).toBeNull();
      // 0x123 = 291
      expect(jbUrn("eth:0x123")).toEqual({ chainId: mainnet.id, projectId: 291n, version: 4 });
    });
  });

  describe("edge cases", () => {
    it("should handle whitespace by trimming", () => {
      expect(jbUrn(" eth:3")).toEqual({ chainId: mainnet.id, projectId: 3n, version: 4 });
      expect(jbUrn("v5: eth : 3 ")).toEqual({ chainId: mainnet.id, projectId: 3n, version: 5 });
    });

    it("should handle numeric edge cases", () => {
      expect(jbUrn("eth:0003")?.projectId).toBe(3n);
      expect(jbUrn("eth:0")?.projectId).toBe(0n);
    });

    it("should reject invalid formats", () => {
      expect(jbUrn("eth-test:3")).toBeNull();
      expect(jbUrn("a".repeat(1000) + ":1")).toBeNull();
    });
  });
});
