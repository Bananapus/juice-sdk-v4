import { describe, expect, test } from "vitest";
import { parseSuckerDeployerConfig, MappableAsset } from "./deploy.js";
import { arbitrum, base, mainnet, optimism } from "viem/chains";
import { createSalt } from "./tx.js";

describe("sucker parsing", () => {
  test("ouputs correct amount of sucker configurations and mappings", () => {
    const result = parseSuckerDeployerConfig(
      mainnet.id,
      [optimism.id, arbitrum.id, base.id],
      [MappableAsset.USDC, MappableAsset.NATIVE],
    );

    // Should be 3 deployer configurations, one for each chain that is being connected to mainnet.
    expect(result.deployerConfigurations.length).toBe(3);

    // Each configuration should have 2 mappings, one for USDC and one for NATIVE.
    result.deployerConfigurations.map((conf) => {
      expect(conf.mappings.length).toBe(2);
    });
  });

  test("keeps salt if passed in explicitly", () => {
    const salt = createSalt();
    const result = parseSuckerDeployerConfig(
      mainnet.id,
      [optimism.id, arbitrum.id, base.id],
      [MappableAsset.NATIVE],
      { salt: salt },
    );

    // Salt should be the same as the one we passed in.
    expect(result.salt).toBe(salt);
  });
});
