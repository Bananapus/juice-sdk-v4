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

describe("v6 bridge selection", () => {
  test("native bridges from mainnet to each L2", () => {
    const result = parseSuckerDeployerConfig(
      mainnet.id,
      [optimism.id, arbitrum.id, base.id],
      [MappableAsset.NATIVE],
      { version: 6, bridge: "native" },
    );

    expect(result.deployerConfigurations.length).toBe(3);
    expect(result.deployerConfigurations[0].deployer).toBe(
      "0x298a775c030adcedb641a89d9047ec9972674e1a", // JBOptimismSuckerDeployer
    );
  });

  test("both deploys a native and a CCIP sucker per L1<->L2 pair", () => {
    const result = parseSuckerDeployerConfig(
      mainnet.id,
      [optimism.id],
      [MappableAsset.NATIVE],
      { version: 6, bridge: "both" },
    );

    expect(result.deployerConfigurations.length).toBe(2);
    const [native, ccip] = result.deployerConfigurations;
    expect(native.deployer).not.toBe(ccip.deployer);
  });

  test("both falls back to CCIP alone for L2<->L2 pairs", () => {
    const result = parseSuckerDeployerConfig(
      optimism.id,
      [base.id],
      [MappableAsset.NATIVE],
      { version: 6, bridge: "both" },
    );

    expect(result.deployerConfigurations.length).toBe(1);
  });

  test("native throws for L2<->L2 pairs", () => {
    expect(() =>
      parseSuckerDeployerConfig(optimism.id, [base.id], [MappableAsset.NATIVE], {
        version: 6,
        bridge: "native",
      }),
    ).toThrow(/native bridges only connect Ethereum with an L2/);
  });

  test("native throws for USDC (bridge-wrapped USDC.e trap)", () => {
    expect(() =>
      parseSuckerDeployerConfig(mainnet.id, [optimism.id], [MappableAsset.USDC], {
        version: 6,
        bridge: "native",
      }),
    ).toThrow(/USDC\.e/);
  });

  test("both keeps USDC on the CCIP sucker only", () => {
    const result = parseSuckerDeployerConfig(
      mainnet.id,
      [optimism.id],
      [MappableAsset.NATIVE, MappableAsset.USDC],
      { version: 6, bridge: "both" },
    );

    expect(result.deployerConfigurations.length).toBe(2);
    const [native, ccip] = result.deployerConfigurations;
    expect(native.mappings.length).toBe(1); // native token only
    expect(ccip.mappings.length).toBe(2); // native + USDC
  });

  test("native is rejected for pre-v6 deployments", () => {
    expect(() =>
      parseSuckerDeployerConfig(mainnet.id, [optimism.id], [MappableAsset.NATIVE], {
        bridge: "native",
      }),
    ).toThrow(/only supported for v6/);
  });
});
