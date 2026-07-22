import {
  CashOutTaxRate,
  ReservedPercent,
  RulesetWeight,
  WeightCutPercent,
  jbControllerAbi,
} from "@bananapus/nana-sdk-core";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useJBRuleset } from "./useJBRuleset";
import { useJBUpcomingRuleset } from "./useJBUpcomingRuleset";

const mocks = vi.hoisted(() => ({
  version: 6,
  controller: "0x1111111111111111111111111111111111111111" as
    | `0x${string}`
    | undefined,
  readContract: vi.fn(),
  resolveDataHook: vi.fn(),
}));

vi.mock("wagmi", () => ({ useReadContract: mocks.readContract }));
vi.mock("../../contexts/JBContractContext/JBContractContext", () => ({
  useJBContractContext: () => ({
    version: mocks.version,
    contracts: { controller: { data: mocks.controller } },
  }),
}));
vi.mock("./useResolveDataHook", () => ({
  useResolveDataHook: mocks.resolveDataHook,
}));

const rawRuleset = {
  id: 9,
  weight: 123n,
  weightCutPercent: 456,
};
const rawMetadata = {
  dataHook: "0x2222222222222222222222222222222222222222" as const,
  cashOutTaxRate: 500,
  reservedPercent: 1_000,
  scopeCashOutsToLocalBalances: true,
};
const resolvedHook = "0x3333333333333333333333333333333333333333";

describe("ruleset hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.version = 6;
    mocks.controller = "0x1111111111111111111111111111111111111111";
    mocks.resolveDataHook.mockReturnValue({ resolvedDataHook: resolvedHook });
  });

  test.each([6, 5])(
    "normalizes the current V%s ruleset while preserving version semantics",
    (version) => {
      mocks.version = version;
      mocks.readContract.mockImplementation((config) => ({
        data: config.query.select([rawRuleset, rawMetadata]),
        isLoading: false,
      }));

      const result = useJBRuleset({ projectId: 7n, chainId: 10 });
      const config = mocks.readContract.mock.calls[0][0];

      expect(config).toEqual(
        expect.objectContaining({
          abi: jbControllerAbi,
          functionName: "currentRulesetOf",
          address: mocks.controller,
          chainId: 10,
          args: [7n],
        }),
      );
      expect(config.query.enabled).toBe(true);
      expect(result.ruleset?.weight).toBeInstanceOf(RulesetWeight);
      expect(result.ruleset?.weightCutPercent).toBeInstanceOf(WeightCutPercent);
      expect(result.rulesetMetadata?.reservedPercent).toBeInstanceOf(
        ReservedPercent,
      );
      expect(result.rulesetMetadata?.cashOutTaxRate).toBeInstanceOf(
        CashOutTaxRate,
      );
      expect(result.rulesetMetadata?.scopeCashOutsToLocalBalances).toBe(
        version === 6,
      );
      expect(result.rulesetMetadata?.dataHook).toBe(resolvedHook);
      expect(mocks.resolveDataHook).toHaveBeenCalledWith({
        dataHookAddress: rawMetadata.dataHook,
        projectId: 7n,
        chainId: 10,
        rulesetId: 9n,
      });
    },
  );

  test("disables an incomplete current-ruleset read", () => {
    mocks.controller = undefined;
    mocks.readContract.mockReturnValue({ data: undefined, isLoading: false });

    const result = useJBRuleset({ projectId: undefined, chainId: undefined });

    expect(mocks.readContract.mock.calls[0][0].args).toBeUndefined();
    expect(mocks.readContract.mock.calls[0][0].query.enabled).toBe(false);
    expect(result.ruleset).toBeUndefined();
    expect(result.rulesetMetadata).toBeUndefined();
    expect(mocks.resolveDataHook).toHaveBeenCalledWith(
      expect.objectContaining({ rulesetId: 0n }),
    );
  });

  test.each([6, 5])(
    "normalizes the upcoming V%s ruleset while preserving version semantics",
    (version) => {
      mocks.version = version;
      mocks.readContract.mockReturnValue({
        data: [rawRuleset, rawMetadata],
        isLoading: true,
      });

      const result = useJBUpcomingRuleset({ projectId: 7n, chainId: 10 });
      const config = mocks.readContract.mock.calls[0][0];

      expect(config).toEqual(
        expect.objectContaining({
          abi: jbControllerAbi,
          functionName: "upcomingRulesetOf",
          address: mocks.controller,
          chainId: 10,
          args: [7n],
        }),
      );
      expect(result.ruleset?.weight).toBeInstanceOf(RulesetWeight);
      expect(result.ruleset?.weightCutPercent).toBeInstanceOf(WeightCutPercent);
      expect(result.rulesetMetadata?.reservedPercent).toBeInstanceOf(
        ReservedPercent,
      );
      expect(result.rulesetMetadata?.cashOutTaxRate).toBeInstanceOf(
        CashOutTaxRate,
      );
      expect(result.rulesetMetadata?.scopeCashOutsToLocalBalances).toBe(
        version === 6,
      );
      expect(result.rulesetMetadata?.dataHook).toBe(resolvedHook);
      expect(result.isLoading).toBe(true);
    },
  );

  test("returns no upcoming ruleset before a contract response", () => {
    mocks.readContract.mockReturnValue({ data: undefined, isLoading: false });

    expect(
      useJBUpcomingRuleset({ projectId: undefined, chainId: undefined }),
    ).toEqual({
      ruleset: undefined,
      rulesetMetadata: undefined,
      isLoading: false,
    });
    expect(mocks.readContract.mock.calls[0][0].args).toBeUndefined();
    expect(mocks.resolveDataHook).toHaveBeenCalledWith(
      expect.objectContaining({ rulesetId: 0n }),
    );
  });
});
