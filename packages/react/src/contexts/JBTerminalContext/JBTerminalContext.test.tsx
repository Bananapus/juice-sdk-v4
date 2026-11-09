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
  terminalLoading: false,
  terminalError: null as Error | null,
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
    contracts: {
      primaryNativeTerminal: {
        data: mocks.terminal,
        isLoading: mocks.terminalLoading,
        error: mocks.terminalError,
      },
    },
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
    mocks.terminalLoading = false;
    mocks.terminalError = null;
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
      store: { data: store, isLoading: false, error: null },
      accountingContexts: { data: contexts, isLoading: true, error: null },
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

  test("wraps children with the same provider before and after the terminal resolves", () => {
    const pending = JBPrimaryNativeTerminalProvider({
      children: "child",
    }) as unknown as {
      type: unknown;
      props: { address: string | undefined; children: unknown };
    };
    // The element type must not change when the address arrives, or React
    // remounts the whole subtree below it.
    expect(pending.type).toBe(JBTerminalProvider);
    expect(pending.props).toEqual({
      address: undefined,
      upstream: { isLoading: false, error: null },
      children: "child",
    });

    mocks.terminal = terminal;
    const element = JBPrimaryNativeTerminalProvider({
      children: "child",
    }) as unknown as {
      type: unknown;
      props: { address: string; children: unknown };
    };
    expect(element.type).toBe(JBTerminalProvider);
    expect(element.props).toEqual({
      address: terminal,
      upstream: { isLoading: false, error: null },
      children: "child",
    });
  });

  test("reports the terminal's reads loading while the terminal resolves, not none", () => {
    // wagmi reports a read with no address as disabled: not loading.
    mocks.readContract.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });
    mocks.terminalLoading = true;
    const wrapper = JBPrimaryNativeTerminalProvider({
      children: null,
    }) as unknown as { props: Parameters<typeof JBTerminalProvider>[0] };

    const element = JBTerminalProvider(wrapper.props) as unknown as {
      props: { value: Record<string, any> };
    };

    expect(element.props.value.store).toEqual({
      data: undefined,
      isLoading: true,
      error: null,
    });
    expect(element.props.value.accountingContexts.isLoading).toBe(true);
  });

  test("reports a failed terminal lookup as an error, not none", () => {
    const failure = new Error("RPC down");
    mocks.readContract.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });
    mocks.terminalError = failure;
    const wrapper = JBPrimaryNativeTerminalProvider({
      children: null,
    }) as unknown as { props: Parameters<typeof JBTerminalProvider>[0] };

    const element = JBTerminalProvider(wrapper.props) as unknown as {
      props: { value: Record<string, any> };
    };

    expect(element.props.value.store.error).toBe(failure);
    expect(element.props.value.accountingContexts.error).toBe(failure);
  });
});
