import { beforeEach, describe, expect, test, vi } from "vitest";
import { jbMultiTerminalAbi } from "@bananapus/nana-sdk-core";
import { zeroAddress } from "viem";
import {
  JBTerminalContext,
  JBTerminalProvider,
  useJBTerminalContext,
} from "./JBTerminalContext";
import { JBPrimaryNativeTerminalProvider } from "./JBPrimaryNativeTerminalProvider";

const mocks = vi.hoisted(() => ({
  chainId: 10,
  terminal: undefined as `0x${string}` | undefined,
  readContract: vi.fn(),
}));

vi.mock("react", () => ({
  createContext: (defaultValue: unknown) => ({
    Provider: "mock-context-provider",
    _value: defaultValue,
  }),
  useContext: (context: { _value: unknown }) => context._value,
}));
vi.mock("wagmi", () => ({ useReadContract: mocks.readContract }));
vi.mock("../JBChainContext/JBChainContext", () => ({
  useJBChainId: () => mocks.chainId,
}));
vi.mock("../JBContractContext/JBContractContext", () => ({
  useJBContractContext: () => ({
    contracts: { primaryNativeTerminal: { data: mocks.terminal } },
  }),
}));

const terminal = "0x1111111111111111111111111111111111111111" as const;
const store = "0x2222222222222222222222222222222222222222" as const;
const contexts = [
  {
    token: "0x000000000000000000000000000000000000EEEe",
    decimals: 18,
    currency: 1,
  },
];

describe("JBTerminalContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.terminal = undefined;
    mocks.readContract.mockImplementation((config) =>
      config.functionName === "STORE"
        ? { data: store, isLoading: false }
        : { data: contexts, isLoading: true },
    );
  });

  test("reads the store and accounting contexts from the selected terminal", () => {
    const element = JBTerminalProvider({
      address: terminal,
      children: "child",
    }) as unknown as {
      props: { value: Record<string, any>; children: unknown };
    };

    expect(element.props.children).toBe("child");
    expect(element.props.value).toEqual({
      address: terminal,
      store: { data: store, isLoading: false },
      accountingContexts: { data: contexts, isLoading: true },
    });
    expect(mocks.readContract).toHaveBeenCalledTimes(2);
    expect(mocks.readContract.mock.calls[0][0]).toEqual({
      abi: jbMultiTerminalAbi,
      functionName: "STORE",
      chainId: 10,
      address: terminal,
    });
    expect(mocks.readContract.mock.calls[1][0]).toEqual({
      abi: jbMultiTerminalAbi,
      functionName: "accountingContextsOf",
      chainId: 10,
      address: terminal,
    });

    (JBTerminalContext as unknown as { _value: unknown })._value =
      element.props.value;
    expect(useJBTerminalContext()).toEqual(element.props.value);
  });

  test("never sends the zero terminal as a contract read target", () => {
    JBTerminalProvider({ address: zeroAddress, children: null });
    expect(
      mocks.readContract.mock.calls.every(([config]) => !config.address),
    ).toBe(true);
  });

  test("only wraps children after the primary native terminal resolves", () => {
    expect(JBPrimaryNativeTerminalProvider({ children: "child" })).toBe(
      "child",
    );

    mocks.terminal = terminal;
    const element = JBPrimaryNativeTerminalProvider({
      children: "child",
    }) as unknown as {
      type: unknown;
      props: { address: string; children: unknown };
    };
    expect(element.type).toBe(JBTerminalProvider);
    expect(element.props).toEqual({ address: terminal, children: "child" });
  });
});
