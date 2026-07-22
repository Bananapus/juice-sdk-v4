import {
  CashOutTaxRate,
  ReservedPercent,
  RulesetWeight,
  WeightCutPercent,
  jbControllerAbi,
} from "@bananapus/nana-sdk-core";
import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  JBRulesetContext,
  JBRulesetProvider,
  useJBRulesetContext,
  useJBRulesetMetadata,
} from "./JBRulesetContext";

const mocks = vi.hoisted(() => ({
  version: 6,
  readContract: vi.fn(),
  resolveDataHook: vi.fn(),
}));

vi.mock("react", () => ({
  createContext: (defaultValue: unknown) => ({
    Provider: "mock-context-provider",
    _value: defaultValue,
  }),
  useContext: (context: { _value: unknown }) => context._value,
}));
vi.mock("wagmi", () => ({ useReadContract: mocks.readContract }));
vi.mock("../../hooks/ruleset/useResolveDataHook", () => ({
  useResolveDataHook: mocks.resolveDataHook,
}));
vi.mock("../JBChainContext/JBChainContext", () => ({
  useJBChainId: () => 10,
}));
vi.mock("../JBContractContext/JBContractContext", () => ({
  useJBContractContext: () => ({
    projectId: 7n,
    version: mocks.version,
    contracts: {
      controller: {
        data: "0x1111111111111111111111111111111111111111",
      },
    },
  }),
}));

const rawRuleset = { id: 9, weight: 123n, weightCutPercent: 456 };
const rawMetadata = {
  dataHook: "0x2222222222222222222222222222222222222222",
  cashOutTaxRate: 500,
  reservedPercent: 1_000,
  scopeCashOutsToLocalBalances: true,
};
const resolvedHook = "0x3333333333333333333333333333333333333333";

describe("JBRulesetContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.version = 6;
    mocks.resolveDataHook.mockReturnValue({ resolvedDataHook: resolvedHook });
    mocks.readContract.mockImplementation((config) => ({
      data: config.query.select([rawRuleset, rawMetadata]),
      isLoading: true,
    }));
  });

  test.each([6, 5])("provides a normalized V%s current ruleset", (version) => {
    mocks.version = version;
    const element = JBRulesetProvider({
      children: "child",
    }) as unknown as {
      props: { value: Record<string, any>; children: unknown };
    };
    const value = element.props.value;
    const config = mocks.readContract.mock.calls[0][0];

    expect(config).toEqual(
      expect.objectContaining({
        abi: jbControllerAbi,
        functionName: "currentRulesetOf",
        chainId: 10,
        args: [7n],
      }),
    );
    expect(value.ruleset.data.weight).toBeInstanceOf(RulesetWeight);
    expect(value.ruleset.data.weightCutPercent).toBeInstanceOf(
      WeightCutPercent,
    );
    expect(value.rulesetMetadata.data.reservedPercent).toBeInstanceOf(
      ReservedPercent,
    );
    expect(value.rulesetMetadata.data.cashOutTaxRate).toBeInstanceOf(
      CashOutTaxRate,
    );
    expect(value.rulesetMetadata.data.scopeCashOutsToLocalBalances).toBe(
      version === 6,
    );
    expect(value.rulesetMetadata.data.dataHook).toBe(resolvedHook);
    expect(value.ruleset.isLoading).toBe(true);
    expect(value.rulesetMetadata.isLoading).toBe(true);
    expect(element.props.children).toBe("child");

    (JBRulesetContext as unknown as { _value: unknown })._value = value;
    expect(useJBRulesetContext()).toEqual(value);
    expect(useJBRulesetMetadata()).toEqual(value.rulesetMetadata);
    expect(mocks.resolveDataHook).toHaveBeenCalledWith({
      dataHookAddress: rawMetadata.dataHook,
      projectId: 7n,
      chainId: 10,
      rulesetId: 9n,
    });
  });
});
