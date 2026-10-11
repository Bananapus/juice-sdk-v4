import {
  ContractFunctionRevertedError,
  type PublicClient,
  zeroAddress,
} from "viem";
import { describe, expect, test } from "vitest";
import { jb721TiersHookAbi } from "../generated/juicebox.js";
import { getProject721Shop } from "./nft.js";
import { getProjectNftInventory } from "./nftInventory.js";

const hook = "0x1111111111111111111111111111111111111111";
const store = "0x69913acf79dbba170d9efafe605ee62b42164f9c";
const deployer = "0xbfa54a97099485c134f06c9a08a4909c26fd7318";
const implementation = "0x3184783d0e3cbf5a821794b246c71a3d1a0cf312";
const token = "0x000000000000000000000000000000000000eeee";
const cloneCode = `0x363d3d373d3d3d363d73${implementation.slice(2)}5af43d82803e903d91602b57fd5bf3`;
const args = { chainId: 84532 as const, projectId: 46n };
const ruleset = {
  ruleset: { id: 9 },
  metadata: { dataHook: hook, useDataHookForPay: false },
};
const tier = (id: number) => ({
  id,
  price: 1000n,
  remainingSupply: 999_999_998,
  initialSupply: 999_999_999,
  votingUnits: 0n,
  reserveFrequency: 0,
  category: 0,
  discountPercent: 0,
  encodedIpfsUri: `0x${"00".repeat(32)}`,
  resolvedUri: "",
  flags: {},
});
type Request = {
  functionName: string;
  args?: readonly unknown[];
  blockNumber?: bigint;
};
function fixture(overrides: Record<string, unknown> = {}) {
  const requests: Request[] = [];
  const defaults: Record<string, unknown> = {
    currentRulesetOf: [ruleset.ruleset, ruleset.metadata],
    upcomingRulesetOf: [ruleset.ruleset, ruleset.metadata],
    ownerOf: deployer,
    store,
    CODE_ORIGIN: implementation,
    projectId: args.projectId,
    gamePhaseReporter: deployer,
    gamePotReporter: deployer,
    pricingCurrency: 61166n,
    contractURI: "ipfs://collection",
    currentGamePotOf: [0n, token, 6n],
    currentGamePhaseOf: 3,
    tiersOf: [tier(1)],
    tierNameOf: "Crab: -0.5% to < +0.5%",
    currentSupplyOfTier: 1n,
    STORE: store,
    METADATA_ID_TARGET: implementation,
    pricingContext: [61166n, 18n],
    tiered721HookOf: hook,
  };
  const client = {
    getBlockNumber: async () => 123n,
    getChainId: async () => overrides.chainId ?? 84532,
    getBytecode: async (request: { blockNumber?: bigint }) => {
      expect(request.blockNumber).toBe(overrides.blockNumber ?? 123n);
      return overrides.cloneCode ?? cloneCode;
    },
    readContract: async (request: Request) => {
      requests.push(request);
      const value =
        request.functionName in overrides
          ? overrides[request.functionName]
          : defaults[request.functionName];
      if (value instanceof Error) throw value;
      if (value === undefined)
        throw new Error(`Unexpected read ${request.functionName}`);
      return typeof value === "function" ? value(request) : value;
    },
  } as unknown as PublicClient;
  return { client, requests };
}

describe("getProjectNftInventory", () => {
  test("discovers named Defifa tiers after pay closes using native exact pricing, not 18-decimal guesses", async () => {
    const { client, requests } = fixture();
    const result = await getProjectNftInventory(client, args);
    expect(result).toMatchObject({
      protocol: "defifa",
      hook,
      store,
      implementation,
      contractUri: "ipfs://collection",
      phase: 3,
      blockNumber: 123n,
      pricing: { currency: 61166, decimals: 6, token },
      capabilities: {
        genericPay: false,
        genericCashOut: false,
        manageTiers: false,
      },
      tiers: [
        {
          id: 1,
          name: "Crab: -0.5% to < +0.5%",
          currentSupply: 1n,
          remainingSupply: 999_999_998,
        },
      ],
      nextStartingId: null,
    });
    expect(result).not.toHaveProperty("metadataIdTarget");
    expect(requests.every((request) => request.blockNumber === 123n)).toBe(
      true,
    );
    expect(
      requests.find((request) => request.functionName === "tiersOf")?.args,
    ).toEqual([hook, [], false, 0n, 101n]);
  });

  test.each([1, 10, 8453, 42161, 11155111, 11155420, 84532, 421614] as const)(
    "recognizes the pinned deployment on chain %s",
    async (chainId) => {
      const isMainnet = [1, 10, 8453, 42161].includes(chainId);
      const owner = isMainnet
        ? "0x375afb2a4b1cadae99f8863f96fc1aebcbaf8bde"
        : deployer;
      const codeOrigin = isMainnet
        ? "0xe2229dd6a7da99ebb8f7d749612edd1b2addafe1"
        : implementation;
      const { client } = fixture({
        chainId,
        ownerOf: owner,
        gamePhaseReporter: owner,
        gamePotReporter: owner,
        CODE_ORIGIN: codeOrigin,
        cloneCode: `0x363d3d373d3d3d363d73${codeOrigin.slice(2)}5af43d82803e903d91602b57fd5bf3`,
      });
      expect(
        await getProjectNftInventory(client, { ...args, chainId }),
      ).toMatchObject({ protocol: "defifa", implementation: codeOrigin });
    },
  );

  test("handles a verified empty game without inventing tier supply or changing native decimal precision", async () => {
    const { client } = fixture({
      tiersOf: [],
      currentGamePotOf: [0n, token, 0n],
    });
    expect(await getProjectNftInventory(client, args)).toMatchObject({
      protocol: "defifa",
      pricing: { decimals: 0 },
      tiers: [],
      nextStartingId: null,
    });
  });

  test("pins later pages to the supplied block without reading a new head", async () => {
    const { client, requests } = fixture({ blockNumber: 777n });
    client.getBlockNumber = async () => {
      throw new Error("Must not read a new head");
    };
    const result = await getProjectNftInventory(client, {
      ...args,
      blockNumber: 777n,
    });
    expect(result?.blockNumber).toBe(777n);
    expect(requests.every((request) => request.blockNumber === 777n)).toBe(
      true,
    );
  });
  test("rejects invalid snapshot blocks before any project reads", async () => {
    const { client, requests } = fixture();
    await expect(
      getProjectNftInventory(client, { ...args, blockNumber: -1n }),
    ).rejects.toThrow(/blockNumber/);
    expect(requests).toEqual([]);
  });

  test("discovers countdown tiers from the queued hook", async () => {
    const { client, requests } = fixture({
      currentRulesetOf: [{ id: 0 }, { dataHook: zeroAddress }],
      currentGamePhaseOf: 0,
    });
    expect(await getProjectNftInventory(client, args)).toMatchObject({
      protocol: "defifa",
      phase: 0,
    });
    expect(
      requests.some((request) => request.functionName === "upcomingRulesetOf"),
    ).toBe(true);
  });

  test("uses the next actual sorted tier ID for bounded pagination, including resolver/category options", async () => {
    const { client, requests } = fixture({ tiersOf: [tier(7), tier(2)] });
    const result = await getProjectNftInventory(client, {
      ...args,
      tierLimit: 1,
      startingId: 7n,
      categories: [3n],
      includeResolvedUri: true,
    });
    expect(result?.tiers.map((item) => item.id)).toEqual([7]);
    expect(result?.nextStartingId).toBe(2n);
    expect(
      requests.find((request) => request.functionName === "tiersOf")?.args,
    ).toEqual([hook, [3n], true, 7n, 2n]);
    expect(
      requests.filter((request) => request.functionName === "tierNameOf"),
    ).toHaveLength(1);
  });

  test("returns no inventory when a deployer-owned project has no current or queued hook", async () => {
    const { client } = fixture({
      currentRulesetOf: [{ id: 0 }, { dataHook: zeroAddress }],
      upcomingRulesetOf: [{ id: 0 }, { dataHook: zeroAddress }],
    });
    expect(await getProjectNftInventory(client, args)).toBeNull();
  });

  test("returns null for a custom non-NFT hook only after a proven missing STORE getter", async () => {
    const { client, requests } = fixture({
      ownerOf: zeroAddress,
      STORE: new ContractFunctionRevertedError({
        abi: jb721TiersHookAbi,
        functionName: "STORE",
      }),
    });
    expect(await getProjectNftInventory(client, args)).toBeNull();
    expect(requests.some((request) => request.functionName === "store")).toBe(
      false,
    );
  });

  test.each(["ownerOf", "STORE", "tierNameOf", "currentGamePotOf"])(
    "does not turn %s RPC outages into empty inventory",
    async (functionName) => {
      const { client } = fixture({
        ...(functionName === "STORE" ? { ownerOf: zeroAddress } : {}),
        [functionName]: new Error("RPC unavailable"),
      });
      await expect(getProjectNftInventory(client, args)).rejects.toThrow(
        "RPC unavailable",
      );
    },
  );

  test.each([
    { cloneCode: "0x" },
    { store: zeroAddress },
    { CODE_ORIGIN: zeroAddress },
    { projectId: 47n },
    { gamePhaseReporter: zeroAddress },
    { gamePotReporter: zeroAddress },
  ])("rejects mismatched native provenance %#", async (overrides) => {
    const { client } = fixture(overrides);
    await expect(getProjectNftInventory(client, args)).rejects.toThrow(
      /Defifa hook/,
    );
  });

  test.each([
    { pricingCurrency: 0x100000000n },
    { currentGamePotOf: [0n, token, 256n] },
    { currentGamePotOf: [0n, zeroAddress, 18n] },
    { currentGamePhaseOf: 6 },
  ])("rejects invalid verified pricing/phase context %#", async (overrides) => {
    const { client } = fixture(overrides);
    await expect(getProjectNftInventory(client, args)).rejects.toThrow(
      /context is invalid/,
    );
  });

  test.each([0, -1, 1.5, 129, Number.NaN])(
    "rejects an unbounded/invalid tier limit %s before RPC reads",
    async (tierLimit) => {
      const { client, requests } = fixture();
      await expect(
        getProjectNftInventory(client, { ...args, tierLimit }),
      ).rejects.toThrow(/tierLimit/);
      expect(requests).toEqual([]);
    },
  );
  test("rejects negative cursors before RPC reads", async () => {
    const { client, requests } = fixture();
    await expect(
      getProjectNftInventory(client, { ...args, startingId: -1n }),
    ).rejects.toThrow(/startingId/);
    expect(requests).toEqual([]);
  });

  test("rejects a public client on the wrong chain before project reads", async () => {
    const { client, requests } = fixture({ chainId: 8453 });
    await expect(getProjectNftInventory(client, args)).rejects.toThrow(
      /wrong chain/,
    );
    expect(requests).toEqual([]);
  });
  test.each([
    { categories: [2n, 1n] },
    { categories: [1n, 1n] },
    { categories: [-1n] },
    { categories: [0x1000000n] },
  ])(
    "rejects category order that cannot produce a stable page %#",
    async ({ categories }) => {
      const { client, requests } = fixture();
      await expect(
        getProjectNftInventory(client, { ...args, categories }),
      ).rejects.toThrow(
        "NFT inventory categories must be ascending, unique uint24 values for stable pagination.",
      );
      expect(requests).toEqual([]);
    },
  );

  test("reuses the ordinary JB721 shop context and preserves legacy pay-disabled behavior", async () => {
    const { client, requests } = fixture({
      ownerOf: zeroAddress,
      tiersOf: [tier(3), tier(1)],
    });
    expect(
      await getProject721Shop(client, { ...args, isRevnet: false }),
    ).toBeNull();
    const result = await getProjectNftInventory(client, {
      ...args,
      tierLimit: 1,
      startingId: 3n,
    });
    expect(result).toMatchObject({
      protocol: "jb721",
      metadataIdTarget: implementation,
      pricing: { currency: 61166, decimals: 18 },
      capabilities: {
        genericPay: true,
        genericCashOut: true,
        manageTiers: true,
      },
      nextStartingId: 1n,
      tiers: [{ id: 3 }],
    });
    expect(
      requests.filter((request) => request.functionName === "currentRulesetOf"),
    ).toHaveLength(2);
  });

  test("does not read Defifa ownership or rulesets for revnets", async () => {
    const { client, requests } = fixture();
    expect(
      await getProjectNftInventory(client, { ...args, isRevnet: true }),
    ).toMatchObject({ protocol: "jb721", ruleset: null });
    expect(
      requests.some(
        (request) =>
          request.functionName === "ownerOf" ||
          request.functionName === "currentRulesetOf",
      ),
    ).toBe(false);
  });
  test("returns null for a revnet without an NFT hook", async () => {
    const { client } = fixture({ tiered721HookOf: zeroAddress });
    expect(
      await getProjectNftInventory(client, { ...args, isRevnet: true }),
    ).toBeNull();
  });
});
