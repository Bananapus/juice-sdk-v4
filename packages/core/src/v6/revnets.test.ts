import {
  PublicClient,
  decodeFunctionData,
  encodeFunctionData,
  parseEther,
  zeroAddress,
  zeroHash,
} from "viem";
import { sepolia } from "viem/chains";
import { describe, expect, test } from "vitest";
import { revDeployerAbi } from "../generated/juicebox.js";
import { buildAccountingContext } from "./launch.js";
import {
  REVConfig,
  REVDeploy721TiersHookConfig,
  REVSuckerDeploymentConfig,
  buildAutoIssueTx,
  buildDeployRevnetTx,
  buildRevnetStageConfig,
  getAmountToAutoIssue,
  getCashOutDelay,
  getRevnetTiered721Hook,
  isRevnetOperator,
} from "./revnets.js";
import { v6Address } from "./types.js";

const OPERATOR = "0x000000000000000000000000000000000000dEaD" as const;
const SALT =
  "0xcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd" as const;

const DEPLOY_START = 1_750_000_000;

const SUCKER_CONFIG: REVSuckerDeploymentConfig = {
  deployerConfigurations: [],
  salt: SALT,
};

const TIERED_721_CONFIG: REVDeploy721TiersHookConfig = {
  baseline721HookConfiguration: {
    name: "Rev Shop",
    symbol: "SHOP",
    baseUri: "ipfs://",
    tokenUriResolver: zeroAddress,
    contractUri: "",
    tiersConfig: {
      tiers: [
        {
          price: parseEther("0.05"),
          initialSupply: 100,
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
    },
  },
  salt: SALT,
  preventOperatorAdjustingTiers: false,
  preventOperatorUpdatingMetadata: false,
  preventOperatorMinting: false,
  preventOperatorIncreasingDiscountPercent: false,
};

function revnetConfig(): REVConfig {
  return {
    description: {
      name: "Testnet Revnet",
      ticker: "TEST",
      uri: "ipfs://bafy",
      salt: SALT,
    },
    baseCurrency: 1,
    operator: OPERATOR,
    scopeCashOutsToLocalBalances: false,
    stageConfigurations: [
      buildRevnetStageConfig({
        startsAtOrAfter: DEPLOY_START,
        initialIssuance: parseEther("1000"),
        splitPercent: 3800, // 38% of 10,000
        issuanceCutFrequency: 30 * 86_400,
        issuanceCutPercent: 200_000_000, // 20% of 1e9
        cashOutTaxRate: 2000, // 20% of 10,000
      }),
      buildRevnetStageConfig({
        // ABSOLUTE start, cumulative from the SAME deploy start.
        startsAtOrAfter: DEPLOY_START + 365 * 86_400,
        initialIssuance: 1n, // sentinel: inherit the previous (cut) issuance
      }),
    ],
  };
}

/** A stub PublicClient that records readContract calls. */
function stubClient(returnValue: unknown, calls: unknown[] = []) {
  const client = {
    readContract: async (params: unknown) => {
      calls.push(params);
      return returnValue;
    },
  } as unknown as PublicClient;
  return { client, calls };
}

describe("buildRevnetStageConfig", () => {
  test("applies safe defaults", () => {
    const stage = buildRevnetStageConfig({
      startsAtOrAfter: DEPLOY_START,
      initialIssuance: parseEther("1"),
    });
    expect(stage).toEqual({
      startsAtOrAfter: DEPLOY_START,
      autoIssuances: [],
      splitPercent: 0,
      splits: [],
      initialIssuance: parseEther("1"),
      issuanceCutFrequency: 0,
      issuanceCutPercent: 0,
      cashOutTaxRate: 0,
      extraMetadata: 0,
    });
  });

  test("carries auto-issuances", () => {
    const stage = buildRevnetStageConfig({
      startsAtOrAfter: DEPLOY_START,
      initialIssuance: parseEther("1"),
      autoIssuances: [
        {
          chainId: sepolia.id,
          count: parseEther("100"),
          beneficiary: OPERATOR,
        },
      ],
    });
    expect(stage.autoIssuances).toHaveLength(1);
    expect(stage.autoIssuances[0].count).toBe(parseEther("100"));
  });
});

describe("buildDeployRevnetTx", () => {
  test("encodes the 4-arg overload with revnetId 0n (new revnet)", () => {
    const creationFee = parseEther("0.01");
    const request = buildDeployRevnetTx({
      chainId: sepolia.id,
      config: revnetConfig(),
      accountingContexts: [buildAccountingContext()],
      suckerConfig: SUCKER_CONFIG,
      creationFee,
    });

    expect(request.address).toBe(v6Address("REVDeployer", sepolia.id));
    expect(request.value).toBe(creationFee);
    expect(request.args).toHaveLength(4);
    expect(request.args[0]).toBe(0n);

    const data = encodeFunctionData(request);
    const decoded = decodeFunctionData({ abi: revDeployerAbi, data });
    expect(decoded.functionName).toBe("deployFor");
  });

  test("encodes the 6-arg overload with a tiered 721 config", () => {
    const request = buildDeployRevnetTx({
      chainId: sepolia.id,
      config: revnetConfig(),
      accountingContexts: [buildAccountingContext()],
      suckerConfig: SUCKER_CONFIG,
      creationFee: parseEther("0.01"),
      tiered721Config: TIERED_721_CONFIG,
    });

    expect(request.args).toHaveLength(6);
    expect(request.args[4]).toBe(TIERED_721_CONFIG);
    expect(request.args[5]).toEqual([]); // allowedPosts default

    expect(() => encodeFunctionData(request)).not.toThrow();
  });
});

describe("REVOwner actions", () => {
  test("buildAutoIssueTx encodes autoIssueFor", () => {
    const request = buildAutoIssueTx({
      chainId: sepolia.id,
      revnetId: 4n,
      stageId: 2n,
      beneficiary: OPERATOR,
    });
    expect(request.address).toBe(v6Address("REVOwner", sepolia.id));
    expect(() => encodeFunctionData(request)).not.toThrow();
  });

  test("getAmountToAutoIssue reads amountToAutoIssue", async () => {
    const { client, calls } = stubClient(parseEther("100"));
    const amount = await getAmountToAutoIssue(client, {
      chainId: sepolia.id,
      revnetId: 4n,
      stageId: 2n,
      beneficiary: OPERATOR,
    });
    expect(amount).toBe(parseEther("100"));
    expect(calls[0]).toMatchObject({
      address: v6Address("REVOwner", sepolia.id),
      functionName: "amountToAutoIssue",
      args: [4n, 2n, OPERATOR],
    });
  });

  test("getCashOutDelay reads cashOutDelayOf", async () => {
    const { client, calls } = stubClient(0n);
    const delay = await getCashOutDelay(client, {
      chainId: sepolia.id,
      revnetId: 4n,
    });
    expect(delay).toBe(0n);
    expect(calls[0]).toMatchObject({
      functionName: "cashOutDelayOf",
      args: [4n],
    });
  });

  test("isRevnetOperator reads isOperatorOf", async () => {
    const { client, calls } = stubClient(true);
    const isOperator = await isRevnetOperator(client, {
      chainId: sepolia.id,
      revnetId: 4n,
      operator: OPERATOR,
    });
    expect(isOperator).toBe(true);
    expect(calls[0]).toMatchObject({
      functionName: "isOperatorOf",
      args: [4n, OPERATOR],
    });
  });

  test("getRevnetTiered721Hook reads tiered721HookOf", async () => {
    const { client, calls } = stubClient(zeroAddress);
    const hook = await getRevnetTiered721Hook(client, {
      chainId: sepolia.id,
      revnetId: 4n,
    });
    expect(hook).toBe(zeroAddress);
    expect(calls[0]).toMatchObject({
      functionName: "tiered721HookOf",
      args: [4n],
    });
  });
});
