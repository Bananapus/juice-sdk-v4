import {
  JBChainContext,
  JBChainProvider,
  useJBChainId,
} from "./JBChainContext";
import { describe, expect, test, vi } from "vitest";

vi.mock("react", () => ({
  createContext: (defaultValue: unknown) => ({
    Provider: "mock-context-provider",
    _value: defaultValue,
  }),
  useContext: (context: { _value: unknown }) => context._value,
}));

describe("JBChainContext", () => {
  test("provides and reads the selected project chain", () => {
    const element = JBChainProvider({
      chainId: 10,
      children: "child",
    }) as unknown as {
      props: { value: { chainId: number }; children: unknown };
    };

    expect(element.props).toEqual({
      value: { chainId: 10 },
      children: "child",
    });

    (JBChainContext as unknown as { _value: unknown })._value =
      element.props.value;
    expect(useJBChainId()).toBe(10);
  });
});
