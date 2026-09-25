import {
  concatHex,
  encodeFunctionData,
  isAddressEqual,
  parseEther,
  toHex,
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
import {
  SAFE_CREATE_ABI,
  SAFE_FACTORY,
  SAFE_FALLBACK,
  SAFE_SINGLETON,
} from "../safe.js";
import type { Address, Hex } from "viem";

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
});

const SAFE_OWNERS: readonly Address[] = [
  "0x0000000000000000000000000000000000000002",
  "0x0000000000000000000000000000000000000003",
];

type SetupArgs = {
  owners: readonly Address[];
  threshold: bigint;
  to: Address;
  data: Hex;
  fallbackHandler: Address;
  paymentToken: Address;
  payment: bigint;
  paymentReceiver: Address;
};

const SETUP: SetupArgs = {
  owners: SAFE_OWNERS,
  threshold: 2n,
  to: zeroAddress,
  data: "0x",
  fallbackHandler: SAFE_FALLBACK,
  paymentToken: zeroAddress,
  payment: 0n,
  paymentReceiver: zeroAddress,
};

function initializer(overrides: Partial<SetupArgs> = {}): Hex {
  const args = { ...SETUP, ...overrides };
  return encodeFunctionData({
    abi: SAFE_CREATE_ABI,
    functionName: "setup",
    args: [
      args.owners,
      args.threshold,
      args.to,
      args.data,
      args.fallbackHandler,
      args.paymentToken,
      args.payment,
      args.paymentReceiver,
    ],
  });
}

function safeCreateCall(
  overrides: Partial<SetupArgs> = {},
  singleton: Address = SAFE_SINGLETON,
  saltNonce = 42n,
) {
  return {
    chainId: CHAIN_ID,
    to: SAFE_FACTORY,
    data: encodeFunctionData({
      abi: SAFE_CREATE_ABI,
      functionName: "createProxyWithNonce",
      args: [singleton, initializer(overrides), saltNonce],
    }),
  };
}

describe("decodeDeploymentCall, safe-create", () => {
  test("reads a canonical factory call back as the Safe it creates", () => {
    expect(decodeDeploymentCall(safeCreateCall())).toEqual({
      flavor: "safe-create",
      to: SAFE_FACTORY,
      singleton: SAFE_SINGLETON,
      saltNonce: toHex(42n, { size: 32 }),
      owners: [...SAFE_OWNERS],
      threshold: 2,
      fallbackHandler: SAFE_FALLBACK,
      // The address the canonical factory itself returns for this plan.
      address: "0x53a62fb237E097DEa3714015Bced94790fE5c3BB",
    });
  });

  test("accepts one owner and twenty owners", () => {
    const one = decodeDeploymentCall(
      safeCreateCall({ owners: [SAFE_OWNERS[0]], threshold: 1n }),
    );
    expect(one.flavor).toBe("safe-create");

    const twenty = Array.from(
      { length: 20 },
      (_, index) =>
        `0x${(index + 2).toString(16).padStart(40, "0")}` as Address,
    );
    const many = decodeDeploymentCall(
      safeCreateCall({ owners: twenty, threshold: 20n }),
    );
    expect(many.flavor).toBe("safe-create");
  });

  const twentyOne = Array.from(
    { length: 21 },
    (_, index) => `0x${(index + 2).toString(16).padStart(40, "0")}` as Address,
  );

  test.each<[string, Partial<SetupArgs>]>([
    ["no owners", { owners: [], threshold: 0n }],
    ["twenty-one owners", { owners: twentyOne, threshold: 1n }],
    ["a repeated owner", { owners: [SAFE_OWNERS[0], SAFE_OWNERS[0]] }],
    ["a zero owner", { owners: [zeroAddress, SAFE_OWNERS[0]] }],
    [
      "the sentinel owner",
      {
        owners: ["0x0000000000000000000000000000000000000001", SAFE_OWNERS[0]],
      },
    ],
    ["a zero threshold", { threshold: 0n }],
    ["a threshold above the owner count", { threshold: 3n }],
    ["a setup delegatecall target", { to: SAFE_OWNERS[0] }],
    ["setup delegatecall data", { data: "0xdeadbeef" }],
    ["another fallback handler", { fallbackHandler: SAFE_OWNERS[0] }],
    ["a setup payment token", { paymentToken: SAFE_OWNERS[0] }],
    ["a setup payment", { payment: 1n }],
    ["a setup payment receiver", { paymentReceiver: SAFE_OWNERS[0] }],
  ])("refuses an initializer with %s", (_label, overrides) => {
    expect(decodeDeploymentCall(safeCreateCall(overrides)).flavor).toBe(
      "unknown",
    );
  });

  test("refuses another singleton, another target, and another selector", () => {
    expect(
      decodeDeploymentCall(safeCreateCall({}, SAFE_OWNERS[0])).flavor,
    ).toBe("unknown");
    expect(
      decodeDeploymentCall({ ...safeCreateCall(), to: SAFE_OWNERS[0] }).flavor,
    ).toBe("unknown");
    expect(
      decodeDeploymentCall({
        chainId: CHAIN_ID,
        to: SAFE_FACTORY,
        data: encodeFunctionData({
          abi: SAFE_CREATE_ABI,
          functionName: "proxyCreationCode",
        }),
      }).flavor,
    ).toBe("unknown");
  });

  test("refuses an initializer that is not a setup call", () => {
    expect(
      decodeDeploymentCall({
        chainId: CHAIN_ID,
        to: SAFE_FACTORY,
        data: encodeFunctionData({
          abi: SAFE_CREATE_ABI,
          functionName: "createProxyWithNonce",
          args: [
            SAFE_SINGLETON,
            encodeFunctionData({
              abi: SAFE_CREATE_ABI,
              functionName: "proxyCreationCode",
            }),
            42n,
          ],
        }),
      }).flavor,
    ).toBe("unknown");
  });

  test("refuses calldata that is not the canonical encoding", () => {
    const call = safeCreateCall();
    expect(
      decodeDeploymentCall({
        ...call,
        data: concatHex([call.data, toHex(0n, { size: 32 })]),
      }).flavor,
    ).toBe("unknown");
  });
});
