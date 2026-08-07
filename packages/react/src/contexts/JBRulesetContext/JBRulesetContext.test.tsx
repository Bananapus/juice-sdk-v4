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
  controller: {
    data: "0x1111111111111111111111111111111111111111",
    isLoading: false,
  } as {
    data: `0x${string}` | undefined;
    isLoading: boolean;
  },
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
    contracts: { controller: mocks.controller },
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
    mocks.controller = {
      data: "0x1111111111111111111111111111111111111111",
      isLoading: false,
    };
    mocks.resolveDataHook.mockReturnValue({
      resolvedDataHook: resolvedHook,
      isLoading: false,
    });
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

  test("withholds the metadata while the data hook is still being resolved", () => {
    mocks.resolveDataHook.mockReturnValue({
      resolvedDataHook: undefined,
      isLoading: true,
    });
    mocks.readContract.mockImplementation((config) => ({
      data: config.query.select([rawRuleset, rawMetadata]),
      isLoading: false,
    }));

    const element = JBRulesetProvider({ children: null }) as unknown as {
      props: { value: Record<string, any> };
    };

    // Publishing the deployer address here is what makes a pay in this window
    // revert in `use721HookMetadataId`.
    expect(element.props.value.rulesetMetadata).toEqual({
      data: undefined,
      isLoading: true,
    });
    expect(element.props.value.ruleset.data).toBeDefined();
  });

  test("keeps the ruleset read off an unresolved controller and reports it loading", () => {
    mocks.controller = { data: undefined, isLoading: true };
    mocks.readContract.mockReturnValue({ data: undefined, isLoading: false });

    const element = JBRulesetProvider({ children: null }) as unknown as {
      props: { value: Record<string, any> };
    };
    const config = mocks.readContract.mock.calls[0][0];

    expect(config.address).toBeUndefined();
    expect(config.query.enabled).toBe(false);
    // Otherwise this reads downstream as "this project has no ruleset".
    expect(element.props.value.ruleset).toEqual({
      data: undefined,
      isLoading: true,
    });
    expect(mocks.resolveDataHook).toHaveBeenCalledWith(
      expect.objectContaining({ rulesetId: undefined }),
    );
  });
});
