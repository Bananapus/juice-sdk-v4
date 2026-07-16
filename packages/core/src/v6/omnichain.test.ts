import {
  decodeFunctionData,
  encodeFunctionData,
  parseEther,
  zeroAddress,
  zeroHash,
} from "viem";
import { baseSepolia, optimismSepolia, sepolia } from "viem/chains";
import { describe, expect, test } from "vitest";
import { jbOmnichainDeployerAbi } from "../generated/juicebox.js";
import {
  buildRulesetConfiguration,
  buildTerminalConfigurations,
} from "./launch.js";
import {
  JBDeploy721TiersHookConfig,
  buildOmnichainLaunchProjectTx,
  buildOmnichainQueueRulesetsTx,
} from "./omnichain.js";
import { v6Address } from "./types.js";

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
          initialSupply: 999_999_999, // "unlimited" sentinel (NOT uint32 max)
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

function launchArgs() {
  return {
    chainId: sepolia.id,
    chainIds: [sepolia.id, optimismSepolia.id, baseSepolia.id],
    owner: OWNER,
    projectUri: "ipfs://bafy",
    rulesetConfigurations: [buildRulesetConfiguration()],
    terminalConfigurations: buildTerminalConfigurations({
      chainId: sepolia.id,
    }),
    creationFee: parseEther("0.01"),
    salt: SALT,
  };
}

describe("buildOmnichainLaunchProjectTx", () => {
  test("encodes the 6-arg overload with sucker configs for every other chain", () => {
    const request = buildOmnichainLaunchProjectTx(launchArgs());

    expect(request.address).toBe(v6Address("JBOmnichainDeployer", sepolia.id));
    expect(request.value).toBe(parseEther("0.01"));
    expect(request.args).toHaveLength(6);

    // The shared salt must flow into the sucker deployment configuration and
    // a deployer config must exist for each REMOTE chain (not the local one).
    const suckerConfiguration = request.args[5];
    if (typeof suckerConfiguration === "string") {
      throw new Error("expected a sucker deployment configuration");
    }
    expect(suckerConfiguration.salt).toBe(SALT);
    expect(suckerConfiguration.deployerConfigurations).toHaveLength(2);
    for (const deployerConfiguration of suckerConfiguration.deployerConfigurations) {
      expect(deployerConfiguration.peer).toBe(zeroHash);
      expect(deployerConfiguration.mappings).toHaveLength(1);
    }

    const data = encodeFunctionData(request);
    const decoded = decodeFunctionData({ abi: jbOmnichainDeployerAbi, data });
    expect(decoded.functionName).toBe("launchProjectFor");
  });

  test("encodes the 7-arg overload when a 721 config is given", () => {
    const request = buildOmnichainLaunchProjectTx({
      ...launchArgs(),
      deploy721Config: DEPLOY_721_CONFIG,
    });

    expect(request.args).toHaveLength(7);
    expect(request.args[2]).toBe(DEPLOY_721_CONFIG);
    expect(request.value).toBe(parseEther("0.01"));

    const data = encodeFunctionData(request);
    expect(data.length).toBeGreaterThan(10);
  });

  test("a single-chain launch produces no sucker deployer configs", () => {
    const request = buildOmnichainLaunchProjectTx({
      ...launchArgs(),
      chainIds: [sepolia.id],
    });
    const suckerConfiguration = request.args[5];
    if (typeof suckerConfiguration === "string") {
      throw new Error("expected a sucker deployment configuration");
    }
    expect(suckerConfiguration.deployerConfigurations).toEqual([]);
    expect(() => encodeFunctionData(request)).not.toThrow();
  });
});

describe("buildOmnichainQueueRulesetsTx", () => {
  test("encodes the 3-arg overload", () => {
    const request = buildOmnichainQueueRulesetsTx({
      chainId: sepolia.id,
      projectId: 9n,
      rulesetConfigurations: [buildRulesetConfiguration()],
      memo: "queue",
    });

    expect(request.address).toBe(v6Address("JBOmnichainDeployer", sepolia.id));
    expect(request.args).toHaveLength(3);

    const data = encodeFunctionData(request);
    const decoded = decodeFunctionData({ abi: jbOmnichainDeployerAbi, data });
    expect(decoded.functionName).toBe("queueRulesetsOf");
    expect(decoded.args[0]).toBe(9n);
  });

  test("encodes the 4-arg overload when deploying a 721 hook", () => {
    const request = buildOmnichainQueueRulesetsTx({
      chainId: sepolia.id,
      projectId: 9n,
      rulesetConfigurations: [buildRulesetConfiguration()],
      deploy721Config: DEPLOY_721_CONFIG,
    });

    expect(request.args).toHaveLength(4);
    expect(request.args[1]).toBe(DEPLOY_721_CONFIG);
    expect(request.args[3]).toBe(""); // default memo

    expect(() => encodeFunctionData(request)).not.toThrow();
  });
});
