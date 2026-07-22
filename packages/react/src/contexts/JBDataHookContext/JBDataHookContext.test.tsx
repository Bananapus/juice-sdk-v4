import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  JBDataHookContext,
  JBDataHookProvider,
  useJBDataHookContext,
} from "./JBDataHookContext";
import { JBCurrentDataHookProvider } from "./JBCurrentDataHookProvider";

const mocks = vi.hoisted(() => ({
  dataHook: undefined as `0x${string}` | undefined,
}));

vi.mock("react", () => ({
  createContext: (defaultValue: unknown) => ({
    Provider: "mock-context-provider",
    _value: defaultValue,
  }),
  useContext: (context: { _value: unknown }) => context._value,
  useMemo: <T,>(factory: () => T) => factory(),
}));
vi.mock("../JBRulesetContext/JBRulesetContext", () => ({
  useJBRulesetMetadata: () => ({ data: { dataHook: mocks.dataHook } }),
}));

const hook = "0x1111111111111111111111111111111111111111" as const;

describe("JBDataHookContext", () => {
  beforeEach(() => {
    mocks.dataHook = undefined;
  });

  test("represents an absent data hook explicitly", () => {
    const element = JBDataHookProvider({
      dataHookAddress: undefined,
      children: "child",
    }) as unknown as {
      props: { value: { data?: unknown; isLoading: boolean } };
    };

    expect(element.props.value).toEqual({
      data: undefined,
      isLoading: false,
    });
  });

  test("provides and reads a resolved data-hook address", () => {
    const element = JBDataHookProvider({
      dataHookAddress: hook,
      children: "child",
    }) as unknown as {
      props: {
        value: { data: { dataHookAddress: string }; isLoading: boolean };
      };
    };

    expect(element.props.value).toEqual({
      data: { dataHookAddress: hook },
      isLoading: false,
    });
    (JBDataHookContext as unknown as { _value: unknown })._value =
      element.props.value;
    expect(useJBDataHookContext()).toEqual(element.props.value);
  });

  test("wires the current ruleset's resolved hook into the provider", () => {
    mocks.dataHook = hook;
    const element = JBCurrentDataHookProvider({
      children: "child",
    }) as unknown as {
      type: unknown;
      props: { dataHookAddress: string; children: unknown };
    };

    expect(element.type).toBe(JBDataHookProvider);
    expect(element.props).toEqual({
      dataHookAddress: hook,
      children: "child",
    });
  });
});
