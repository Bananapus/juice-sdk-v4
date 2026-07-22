import { PublicClient, decodeFunctionData, encodeFunctionData } from "viem";
import { sepolia } from "viem/chains";
import { describe, expect, test } from "vitest";
import { jbControllerAbi } from "../generated/juicebox.js";
import { buildRulesetConfiguration, buildRulesetMetadata } from "./launch.js";
import {
  JBRuleset,
  buildQueueRulesetsTx,
  getAllRulesets,
  getCurrentRuleset,
  getUpcomingRuleset,
  RULESET_WEIGHT_INHERIT,
  resolveRulesetIssuanceStages,
  rulesetIssuanceRateAt,
} from "./rulesets.js";
import { v6Address } from "./types.js";

const RULESET: JBRuleset = {
  cycleNumber: 1,
  id: 1_700_000_000,
  basedOnId: 0,
  start: 1_700_000_000,
  duration: 86_400,
  weight: 10n ** 18n,
  weightCutPercent: 0,
  approvalHook: "0x0000000000000000000000000000000000000000",
  metadata: 0n,
};

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

describe("buildQueueRulesetsTx", () => {
  test("encodes against the controller ABI", () => {
    const request = buildQueueRulesetsTx({
      chainId: sepolia.id,
      projectId: 7n,
      rulesetConfigurations: [buildRulesetConfiguration({ duration: 604_800 })],
      memo: "next cycle",
    });

    expect(request.address).toBe(v6Address("JBController", sepolia.id));
    expect(request.chainId).toBe(sepolia.id);

    const data = encodeFunctionData(request);
    const decoded = decodeFunctionData({ abi: jbControllerAbi, data });
    expect(decoded.functionName).toBe("queueRulesetsOf");
    expect(decoded.args[0]).toBe(7n);
    expect(decoded.args[2]).toBe("next cycle");
  });

  test("defaults the memo to an empty string", () => {
    const request = buildQueueRulesetsTx({
      chainId: sepolia.id,
      projectId: 7n,
      rulesetConfigurations: [],
    });
    expect(request.args[2]).toBe("");
  });
});

describe("ruleset reads", () => {
  test("getCurrentRuleset returns named ruleset + metadata", async () => {
    const metadata = buildRulesetMetadata();
    const { client, calls } = stubClient([RULESET, metadata]);
    const result = await getCurrentRuleset(client, {
      chainId: sepolia.id,
      projectId: 3n,
    });
    expect(result.ruleset).toEqual(RULESET);
    expect(result.metadata).toEqual(metadata);
    expect(calls[0]).toMatchObject({
      address: v6Address("JBController", sepolia.id),
      functionName: "currentRulesetOf",
      args: [3n],
    });
  });

  test("getUpcomingRuleset reads upcomingRulesetOf", async () => {
    const metadata = buildRulesetMetadata();
    const { client, calls } = stubClient([RULESET, metadata]);
    const result = await getUpcomingRuleset(client, {
      chainId: sepolia.id,
      projectId: 3n,
    });
    expect(result.ruleset).toEqual(RULESET);
    expect(calls[0]).toMatchObject({ functionName: "upcomingRulesetOf" });
  });

  test("getAllRulesets pages with sane defaults", async () => {
    const page = [{ ruleset: RULESET, metadata: buildRulesetMetadata() }];
    const { client, calls } = stubClient(page);
    const result = await getAllRulesets(client, {
      chainId: sepolia.id,
      projectId: 3n,
    });
    expect(result).toEqual(page);
    expect(calls[0]).toMatchObject({
      functionName: "allRulesetsOf",
      args: [3n, 0n, 50n],
    });
  });

  test("getAllRulesets forwards explicit paging args", async () => {
    const { client, calls } = stubClient([]);
    await getAllRulesets(client, {
      chainId: sepolia.id,
      projectId: 3n,
      startingId: 42n,
      size: 5n,
    });
    expect(calls[0]).toMatchObject({ args: [3n, 42n, 5n] });
  });
});

describe("issuance schedule projection", () => {
  test("exports core's non-zero inheritance sentinel", () => {
    expect(RULESET_WEIGHT_INHERIT).toBe(1n);
  });
  test("sorts stages, applies recurring cuts, and resolves inheritance", () => {
    const resolved = resolveRulesetIssuanceStages([
      {
        start: 200,
        duration: 10,
        weight: 0n,
        weightCutPercent: 0,
        inheritsWeight: true,
      },
      {
        start: 100,
        duration: 25,
        weight: 1_000n * 10n ** 18n,
        weightCutPercent: 100_000_000,
      },
    ]);

    expect(resolved.map((stage) => stage.start)).toEqual([100, 200]);
    expect(rulesetIssuanceRateAt(resolved, 99)).toBe(0);
    expect(rulesetIssuanceRateAt(resolved, 100)).toBe(1_000);
    expect(rulesetIssuanceRateAt(resolved, 125)).toBeCloseTo(900);
    expect(resolved[1].issuanceRate).toBeCloseTo(656.1);
    expect(rulesetIssuanceRateAt(resolved, 1_000)).toBeCloseTo(656.1);
  });

  test("a genuine zero-weight stage remains zero", () => {
    const resolved = resolveRulesetIssuanceStages([
      {
        start: 1,
        duration: 10,
        weight: 100n * 10n ** 18n,
        weightCutPercent: 0,
      },
      { start: 20, duration: 10, weight: 0n, weightCutPercent: 50_000_000 },
    ]);
    expect(rulesetIssuanceRateAt(resolved, 100)).toBe(0);
  });

  test("rejects invalid protocol values", () => {
    expect(() =>
      resolveRulesetIssuanceStages([
        { start: 1, duration: 10, weight: 1n, weightCutPercent: 1_000_000_001 },
      ]),
    ).toThrow(/weight cut/);
    expect(() =>
      resolveRulesetIssuanceStages([
        {
          start: 1,
          duration: 10,
          weight: 1n,
          weightCutPercent: 0,
          inheritsWeight: true,
        },
      ]),
    ).toThrow(/first ruleset/);
  });
});
