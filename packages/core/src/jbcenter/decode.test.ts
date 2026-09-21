import { encodeFunctionData, parseEther, zeroAddress, zeroHash } from "viem";
import { describe, expect, test } from "vitest";
import {
  jb721TiersHookProjectDeployerAbi,
  jbControllerAbi,
  revDeployerAbi,
} from "../generated/juicebox.js";
import {
  buildAccountingContext,
  buildLaunchProjectTx,
  buildRulesetConfiguration,
  buildTerminalConfigurations,
} from "../v6/launch.js";
import {
  JBDeploy721TiersHookConfig,
  buildOmnichainLaunchProjectTx,
  buildOmnichainQueueRulesetsTx,
} from "../v6/omnichain.js";
import {
  REVConfig,
  buildDeployRevnetTx,
  buildRevnetStageConfig,
} from "../v6/revnets.js";
import { v6Address } from "../v6/types.js";
import { createJBCenterDeploymentCall } from "../jbcenter.js";
import { decodeDeploymentCall } from "./decode.js";

const CHAIN_ID = 8453;
const OWNER = "0x000000000000000000000000000000000000dEaD" as const;
const SALT =
  "0xabababababababababababababababababababababababababababababababab" as const;

const DEPLOY_721_CONFIG: JBDeploy721TiersHookConfig = {
  deployTiersHookConfig: {
    name: "Test Collection",
    symbol: "TEST",
    baseUri: "ipfs://",
    tokenUriResolver: zeroAddress,
    contractUri: "",
    tiersConfig: {
      tiers: [
        {
          price: parseEther("0.01"),
          initialSupply: 999_999_999,
          votingUnits: 0,
          reserveFrequency: 0,
          reserveBeneficiary: zeroAddress,
          encodedIpfsUri: zeroHash,
          category: 1,
          discountPercent: 0,
          flags: {
            allowOwnerMint: false,
            useReserveBeneficiaryAsDefault: false,
            transfersPausable: false,
            useVotingUnits: false,
            cantBeRemoved: false,
            cantIncreaseDiscountPercent: false,
            cantBuyWithCredits: false,
          },
          splitPercent: 0,
          splits: [],
        },
      ],
      currency: 1,
      decimals: 18,
    },
    flags: {
      noNewTiersWithReserves: false,
      noNewTiersWithVotes: false,
      noNewTiersWithOwnerMinting: false,
      preventOverspending: false,
      issueTokensForSplits: false,
    },
  },
  useDataHookForCashOut: true,
  salt: SALT,
};

function ruleset() {
  return buildRulesetConfiguration({ weight: parseEther("1000") });
}

function terminals() {
  return buildTerminalConfigurations({ chainId: CHAIN_ID });
}

function revnetConfig(): REVConfig {
  return {
    description: {
      name: "Testnet Revnet",
      ticker: "TEST",
      uri: "ipfs://bafy-rev",
      salt: SALT,
    },
    baseCurrency: 1,
    operator: OWNER,
    scopeCashOutsToLocalBalances: false,
    stageConfigurations: [
      buildRevnetStageConfig({
        startsAtOrAfter: 1_750_000_000,
        initialIssuance: parseEther("1000"),
      }),
    ],
  };
}

describe("decodeDeploymentCall", () => {
  test("decodes a JBController launch", () => {
    const projectRuleset = ruleset();
    const tx = buildLaunchProjectTx({
      chainId: CHAIN_ID,
      owner: OWNER,
      projectUri: "ipfs://x",
      rulesetConfigurations: [projectRuleset],
      terminalConfigurations: terminals(),
      memo: "hi",
      creationFee: 1n,
    });
    const decoded = decodeDeploymentCall(createJBCenterDeploymentCall(tx));
    expect(decoded).toMatchObject({
      flavor: "project",
      owner: OWNER,
      projectUri: "ipfs://x",
      memo: "hi",
    });
    if (decoded.flavor !== "project") throw new Error("expected project");
    expect(decoded.rulesetConfigurations[0].weight).toBe(projectRuleset.weight);
  });

  test("decodes an omnichain launch without a 721 config", () => {
    const tx = buildOmnichainLaunchProjectTx({
      chainId: CHAIN_ID,
      chainIds: [CHAIN_ID],
      owner: OWNER,
      projectUri: "ipfs://omni",
      rulesetConfigurations: [ruleset()],
      terminalConfigurations: terminals(),
      memo: "omni",
      creationFee: 1n,
      salt: SALT,
    });
    const decoded = decodeDeploymentCall(createJBCenterDeploymentCall(tx));
    expect(decoded).toMatchObject({
      flavor: "omnichain",
      owner: OWNER,
      projectUri: "ipfs://omni",
      memo: "omni",
      has721: false,
    });
  });

  test("decodes an omnichain launch with a 721 config", () => {
    const tx = buildOmnichainLaunchProjectTx({
      chainId: CHAIN_ID,
      chainIds: [CHAIN_ID],
      owner: OWNER,
      projectUri: "ipfs://omni-721",
      rulesetConfigurations: [ruleset()],
      terminalConfigurations: terminals(),
      memo: "omni-721",
      creationFee: 1n,
      salt: SALT,
      deploy721Config: DEPLOY_721_CONFIG,
    });
    const decoded = decodeDeploymentCall(createJBCenterDeploymentCall(tx));
    expect(decoded).toMatchObject({
      flavor: "omnichain",
      owner: OWNER,
      projectUri: "ipfs://omni-721",
      memo: "omni-721",
      has721: true,
    });
  });

  test("decodes a revnet deploy", () => {
    const config = revnetConfig();
    const tx = buildDeployRevnetTx({
      chainId: CHAIN_ID,
      config,
      accountingContexts: [buildAccountingContext()],
      suckerConfig: { deployerConfigurations: [], salt: SALT },
      creationFee: 1n,
    });
    const decoded = decodeDeploymentCall(createJBCenterDeploymentCall(tx));
    expect(decoded).toMatchObject({
      flavor: "revnet",
      operator: OWNER,
      projectUri: "ipfs://bafy-rev",
    });
    if (decoded.flavor !== "revnet") throw new Error("expected revnet");
    expect(decoded.stages).toEqual(config.stageConfigurations);
    expect(decoded.description).toEqual(config.description);
  });

  test("decodes a 721 project deployer launch", () => {
    const controller = v6Address("JBController", CHAIN_ID);
    const data = encodeFunctionData({
      abi: jb721TiersHookProjectDeployerAbi,
      functionName: "launchProjectFor",
      args: [
        OWNER,
        DEPLOY_721_CONFIG.deployTiersHookConfig,
        {
          projectUri: "ipfs://tiers",
          rulesetConfigurations: [ruleset()],
          terminalConfigurations: terminals(),
          memo: "tiers",
        },
        controller,
        SALT,
      ],
    });
    const decoded = decodeDeploymentCall({
      chainId: CHAIN_ID,
      to: v6Address("JB721TiersHookProjectDeployer", CHAIN_ID),
      data,
    });
    expect(decoded).toMatchObject({
      flavor: "project-721",
      owner: OWNER,
      projectUri: "ipfs://tiers",
      memo: "tiers",
      salt: SALT,
    });
  });

  test("unknown target yields unknown", () => {
    expect(
      decodeDeploymentCall({
        chainId: 8453,
        to: "0x0000000000000000000000000000000000000001",
        data: "0x12345678",
      }),
    ).toEqual({
      flavor: "unknown",
      to: "0x0000000000000000000000000000000000000001",
      selector: "0x12345678",
    });
  });

  test("known target with an unknown selector yields unknown", () => {
    const to = v6Address("JBController", CHAIN_ID);
    const decoded = decodeDeploymentCall({
      chainId: CHAIN_ID,
      to,
      data: "0x12345678",
    });
    expect(decoded).toEqual({ flavor: "unknown", to, selector: "0x12345678" });
  });

  test("known target with a different known function selector yields unknown", () => {
    const to = v6Address("JBController", CHAIN_ID);
    const data = encodeFunctionData({
      abi: jbControllerAbi,
      functionName: "queueRulesetsOf",
      args: [1n, [], ""],
    });
    const decoded = decodeDeploymentCall({ chainId: CHAIN_ID, to, data });
    expect(decoded).toEqual({
      flavor: "unknown",
      to,
      selector: data.slice(0, 10),
    });
  });

  test("known JB721TiersHookProjectDeployer target with garbage or unrelated calldata yields unknown", () => {
    const to = v6Address("JB721TiersHookProjectDeployer", CHAIN_ID);
    expect(
      decodeDeploymentCall({ chainId: CHAIN_ID, to, data: "0x12345678" }),
    ).toEqual({ flavor: "unknown", to, selector: "0x12345678" });

    const data = encodeFunctionData({
      abi: jb721TiersHookProjectDeployerAbi,
      functionName: "DIRECTORY",
      args: [],
    });
    expect(decodeDeploymentCall({ chainId: CHAIN_ID, to, data })).toEqual({
      flavor: "unknown",
      to,
      selector: data.slice(0, 10),
    });
  });

  test("known JBOmnichainDeployer target with garbage or unrelated calldata yields unknown", () => {
    const to = v6Address("JBOmnichainDeployer", CHAIN_ID);
    expect(
      decodeDeploymentCall({ chainId: CHAIN_ID, to, data: "0x12345678" }),
    ).toEqual({ flavor: "unknown", to, selector: "0x12345678" });

    const data = encodeFunctionData(
      buildOmnichainQueueRulesetsTx({
        chainId: CHAIN_ID,
        projectId: 1n,
        rulesetConfigurations: [],
        memo: "",
      }),
    );
    expect(decodeDeploymentCall({ chainId: CHAIN_ID, to, data })).toEqual({
      flavor: "unknown",
      to,
      selector: data.slice(0, 10),
    });
  });

  test("known REVDeployer target with garbage or unrelated calldata yields unknown", () => {
    const to = v6Address("REVDeployer", CHAIN_ID);
    expect(
      decodeDeploymentCall({ chainId: CHAIN_ID, to, data: "0x12345678" }),
    ).toEqual({ flavor: "unknown", to, selector: "0x12345678" });

    const data = encodeFunctionData({
      abi: revDeployerAbi,
      functionName: "DIRECTORY",
      args: [],
    });
    expect(decodeDeploymentCall({ chainId: CHAIN_ID, to, data })).toEqual({
      flavor: "unknown",
      to,
      selector: data.slice(0, 10),
    });
  });

  test("unsupported chain yields unknown", () => {
    const to = "0x0000000000000000000000000000000000000002" as const;
    const decoded = decodeDeploymentCall({
      chainId: 999_999,
      to,
      data: "0x12345678",
    });
    expect(decoded).toEqual({ flavor: "unknown", to, selector: "0x12345678" });
  });
});
