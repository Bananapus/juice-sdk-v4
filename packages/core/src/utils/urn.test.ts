import { arbitrum, base, mainnet, optimism, sepolia } from "viem/chains";
import { describe, expect, it } from "vitest";
import { jbUrn, toJbUrn } from "./urn.js";

describe("jbUrn", () => {
  describe("valid URNs", () => {
    it("should parse /eth:3 as mainnet project id 3, version 4", () => {
      const result = jbUrn("eth:3");
      expect(result).toEqual({
        chainId: mainnet.id,
        projectId: 3n,
        version: 4,
      });
    });

    it("should parse /v5:eth:5 as mainnet project id 5, version 5", () => {
      const result = jbUrn("v5:eth:5");
      expect(result).toEqual({
        chainId: mainnet.id,
        projectId: 5n,
        version: 5,
      });
    });

    it("should parse large project IDs correctly", () => {
      const result = jbUrn("eth:999999999999999999");
      expect(result).toEqual({
        chainId: mainnet.id,
        projectId: 999999999999999999n,
        version: 4,
      });
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
    it("should accept versions 4, 5 and 6, default to 4", () => {
      expect(jbUrn("v4:eth:1")?.version).toBe(4);
      expect(jbUrn("v5:eth:1")?.version).toBe(5);
      expect(jbUrn("v6:eth:1")?.version).toBe(6);
      expect(jbUrn("eth:1")?.version).toBe(4); // default
    });

    it("should reject invalid versions", () => {
      expect(jbUrn("v1:eth:3")).toBeNull();
      expect(jbUrn("v7:eth:3")).toBeNull();
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
      // Only decimal digits are a project id. `BigInt` would happily read
      // "0x123" as 291 and "0b11" as 3 — silently naming a different project.
      expect(jbUrn("eth:0x123")).toBeNull();
      expect(jbUrn("eth:0b11")).toBeNull();
      expect(jbUrn("eth:1e3")).toBeNull();
      expect(jbUrn("eth:-1")).toBeNull();
      expect(jbUrn("eth: ")).toBeNull();
    });
  });

  describe("edge cases", () => {
    it("should handle whitespace by trimming", () => {
      expect(jbUrn(" eth:3")).toEqual({
        chainId: mainnet.id,
        projectId: 3n,
        version: 4,
      });
      expect(jbUrn("v5: eth : 3 ")).toEqual({
        chainId: mainnet.id,
        projectId: 3n,
        version: 5,
      });
    });

    it("should handle numeric edge cases", () => {
      expect(jbUrn("eth:0003")?.projectId).toBe(3n);
      // Project ids start at 1, so 0 names nothing.
      expect(jbUrn("eth:0")).toBeNull();
    });

    it("should reject invalid formats", () => {
      expect(jbUrn("eth-test:3")).toBeNull();
      expect(jbUrn("a".repeat(1000) + ":1")).toBeNull();
    });
  });
});

describe("toJbUrn", () => {
  it("formats a supported chain and project", () => {
    expect(toJbUrn(mainnet.id, 3n)).toBe("eth:3");
  });

  it("emits a version prefix for every version but the default", () => {
    expect(toJbUrn(mainnet.id, 3n, 4)).toBe("eth:3");
    expect(toJbUrn(mainnet.id, 3n, 5)).toBe("v5:eth:3");
    expect(toJbUrn(optimism.id, 7n, 6)).toBe("v6:op:7");
  });

  it("round-trips every version through jbUrn", () => {
    for (const version of [4, 5, 6] as const) {
      const urn = toJbUrn(base.id, 12n, version);
      expect(urn).not.toBeNull();
      expect(jbUrn(urn!)).toEqual({
        chainId: base.id,
        projectId: 12n,
        version,
      });
    }
  });

  it("returns null for an unsupported chain", () => {
    expect(toJbUrn(999 as never, 3n)).toBeNull();
  });

  it("returns null for input jbUrn could not read back", () => {
    expect(toJbUrn(mainnet.id, 0n)).toBeNull();
    expect(toJbUrn(mainnet.id, -1n)).toBeNull();
    expect(toJbUrn(mainnet.id, 3n, 3 as never)).toBeNull();
  });
});
