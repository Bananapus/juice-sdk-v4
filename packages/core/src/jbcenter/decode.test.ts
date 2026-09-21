import {
  encodeFunctionData,
  isAddressEqual,
  parseAbi,
  parseEther,
  zeroAddress,
  zeroHash,
} from "viem";
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
/** HomerunDeployer on the mainnets, from Homerun's deployments directory. */
const HOMERUN_DEPLOYER = "0xac9250654ea223513ffee25fdb647dc016873905" as const;

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
    const omnichainRuleset = ruleset();
    const omnichainTerminals = terminals();
    const tx = buildOmnichainLaunchProjectTx({
      chainId: CHAIN_ID,
      chainIds: [CHAIN_ID],
      owner: OWNER,
      projectUri: "ipfs://omni",
      rulesetConfigurations: [omnichainRuleset],
      terminalConfigurations: omnichainTerminals,
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
    if (decoded.flavor !== "omnichain") throw new Error("expected omnichain");
    expect(decoded.rulesetConfigurations[0].weight).toBe(
      omnichainRuleset.weight,
    );
    expect(
      isAddressEqual(
        decoded.terminalConfigurations[0].terminal,
        omnichainTerminals[0].terminal,
      ),
    ).toBe(true);
  });

  test("decodes an omnichain launch with a 721 config", () => {
    const omnichainRuleset = ruleset();
    const omnichainTerminals = terminals();
    const tx = buildOmnichainLaunchProjectTx({
      chainId: CHAIN_ID,
      chainIds: [CHAIN_ID],
      owner: OWNER,
      projectUri: "ipfs://omni-721",
      rulesetConfigurations: [omnichainRuleset],
      terminalConfigurations: omnichainTerminals,
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
    if (decoded.flavor !== "omnichain") throw new Error("expected omnichain");
    expect(decoded.rulesetConfigurations[0].weight).toBe(
      omnichainRuleset.weight,
    );
    expect(
      isAddressEqual(
        decoded.terminalConfigurations[0].terminal,
        omnichainTerminals[0].terminal,
      ),
    ).toBe(true);
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
    const tiersRuleset = ruleset();
    const data = encodeFunctionData({
      abi: jb721TiersHookProjectDeployerAbi,
      functionName: "launchProjectFor",
      args: [
        OWNER,
        DEPLOY_721_CONFIG.deployTiersHookConfig,
        {
          projectUri: "ipfs://tiers",
          rulesetConfigurations: [tiersRuleset],
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
    if (decoded.flavor !== "project-721") {
      throw new Error("expected project-721");
    }
    expect(decoded.rulesetConfigurations[0].weight).toBe(tiersRuleset.weight);
    expect(decoded.rulesetConfigurations[0].metadata.reservedPercent).toBe(
      tiersRuleset.metadata.reservedPercent,
    );
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

  test("HomerunDeployer.launchFundFor round-trips through a deployment call", () => {
    // The signature the selector must match, from HomerunDeployer.sol:
    // launchFundFor(address,string,string,string,uint48,bytes32,address[])
    const abi = parseAbi([
      "function launchFundFor(address owner, string projectUri, string name, string ticker, uint48 mustStartAtOrAfter, bytes32 salt, address[] peerSuckerDeployers) payable returns (uint256 projectId, address token)",
    ]);
    const peers = [
      "0x0000000000000000000000000000000000000001",
      "0x0000000000000000000000000000000000000002",
    ] as const;

    const call = createJBCenterDeploymentCall({
      chainId: CHAIN_ID,
      address: HOMERUN_DEPLOYER,
      abi,
      functionName: "launchFundFor",
      args: [OWNER, "ipfs://fund", "Fund", "FUND", 1_790_000_000, SALT, peers],
    });

    expect(call.data.slice(0, 10)).toBe("0x011fb19e");
    expect(decodeDeploymentCall(call)).toEqual({
      flavor: "homerun-fund",
      owner: OWNER,
      projectUri: "ipfs://fund",
      tokenName: "Fund",
      ticker: "FUND",
      to: HOMERUN_DEPLOYER,
      mustStartAtOrAfter: 1_790_000_000,
      salt: SALT,
      peerSuckerDeployers: peers,
    });
  });

  test("the same FUND calldata at another address yields unknown", () => {
    const abi = parseAbi([
      "function launchFundFor(address owner, string projectUri, string name, string ticker, uint48 mustStartAtOrAfter, bytes32 salt, address[] peerSuckerDeployers) payable returns (uint256 projectId, address token)",
    ]);
    const to = "0x00000000000000000000000000000000000fa0ed" as const;
    const call = createJBCenterDeploymentCall({
      chainId: CHAIN_ID,
      address: to,
      abi,
      functionName: "launchFundFor",
      args: [OWNER, "ipfs://fund", "Fund", "FUND", 1_790_000_000, SALT, []],
    });

    expect(decodeDeploymentCall(call)).toEqual({
      flavor: "unknown",
      to,
      selector: "0x011fb19e",
    });
  });

  test("HomerunDeployer's own address on a chain it is not deployed to yields unknown", () => {
    const abi = parseAbi([
      "function launchFundFor(address owner, string projectUri, string name, string ticker, uint48 mustStartAtOrAfter, bytes32 salt, address[] peerSuckerDeployers) payable returns (uint256 projectId, address token)",
    ]);
    const call = createJBCenterDeploymentCall({
      chainId: 999_999,
      address: HOMERUN_DEPLOYER,
      abi,
      functionName: "launchFundFor",
      args: [OWNER, "ipfs://fund", "Fund", "FUND", 1_790_000_000, SALT, []],
    });

    expect(decodeDeploymentCall(call)).toEqual({
      flavor: "unknown",
      to: HOMERUN_DEPLOYER,
      selector: "0x011fb19e",
    });
  });

  test("the FUND selector with a garbage tail yields unknown", () => {
    expect(
      decodeDeploymentCall({
        chainId: CHAIN_ID,
        to: HOMERUN_DEPLOYER,
        data: `0x011fb19e${"ab".repeat(64)}`,
      }),
    ).toEqual({
      flavor: "unknown",
      to: HOMERUN_DEPLOYER,
      selector: "0x011fb19e",
    });
  });

  test("an unlinked FUND decodes with a zero salt and no peers", () => {
    const abi = parseAbi([
      "function launchFundFor(address owner, string projectUri, string name, string ticker, uint48 mustStartAtOrAfter, bytes32 salt, address[] peerSuckerDeployers) payable returns (uint256 projectId, address token)",
    ]);
    const call = createJBCenterDeploymentCall({
      chainId: CHAIN_ID,
      address: HOMERUN_DEPLOYER,
      abi,
      functionName: "launchFundFor",
      args: [OWNER, "ipfs://fund", "Fund", "FUND", 0, zeroHash, []],
    });

    expect(decodeDeploymentCall(call)).toEqual({
      flavor: "homerun-fund",
      owner: OWNER,
      projectUri: "ipfs://fund",
      tokenName: "Fund",
      ticker: "FUND",
      to: HOMERUN_DEPLOYER,
      mustStartAtOrAfter: 0,
      salt: zeroHash,
      peerSuckerDeployers: [],
    });
  });
});
