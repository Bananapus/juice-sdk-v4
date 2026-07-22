import { describe, expect, test, vi } from "vitest";
import {
  JBProjectContext,
  JBProjectProvider,
  useBendystrawConfig,
  useJBProject,
} from "./JBProjectProvider";
import { JBChainProvider } from "../JBChainContext/JBChainContext";
import { JBContractProvider } from "../JBContractContext/JBContractContext";
import { JBCurrentDataHookProvider } from "../JBDataHookContext/JBCurrentDataHookProvider";
import { JBProjectMetadataProvider } from "../JBProjectMetadataContext/JBProjectMetadataContext";
import { JBRulesetProvider } from "../JBRulesetContext/JBRulesetContext";
import { JBTokenProvider } from "../JBTokenContext/JBTokenContext";
import { JBPrimaryNativeTerminalProvider } from "../JBTerminalContext/JBPrimaryNativeTerminalProvider";

vi.mock("react", () => ({
  createContext: (defaultValue: unknown) => ({
    Provider: "mock-context-provider",
    _value: defaultValue,
  }),
  useContext: (context: { _value: unknown }) => context._value,
}));
vi.mock("../JBChainContext/JBChainContext", () => ({
  JBChainProvider: vi.fn(),
}));
vi.mock("../JBContractContext/JBContractContext", () => ({
  JBContractProvider: vi.fn(),
}));
vi.mock("../JBDataHookContext/JBCurrentDataHookProvider", () => ({
  JBCurrentDataHookProvider: vi.fn(),
}));
vi.mock("../JBProjectMetadataContext/JBProjectMetadataContext", () => ({
  JBProjectMetadataProvider: vi.fn(),
}));
vi.mock("../JBRulesetContext/JBRulesetContext", () => ({
  JBRulesetProvider: vi.fn(),
}));
vi.mock("../JBTokenContext/JBTokenContext", () => ({
  JBTokenProvider: vi.fn(),
}));
vi.mock("../JBTerminalContext/JBPrimaryNativeTerminalProvider", () => ({
  JBPrimaryNativeTerminalProvider: vi.fn(),
}));

function onlyChild(element: any) {
  return element.props.children;
}

describe("JBProjectProvider", () => {
  test("wires the project providers in their dependency order", () => {
    const bendystraw = {
      apiHost: "https://bendystraw.example",
      apiKey: "public-key",
    } as const;
    const element = JBProjectProvider({
      projectId: 7n,
      chainId: 10,
      version: 6,
      bendystraw,
      ctxProps: {
        contract: { include: [] } as never,
        metadata: { ipfsGatewayHostname: "gateway.example" },
        token: { withTotalOutstanding: true },
      },
      children: "child",
    }) as any;

    expect(element.props.value).toEqual({
      projectId: 7n,
      chainId: 10,
      version: 6,
      bendystraw,
    });

    const chain = onlyChild(element);
    expect(chain.type).toBe(JBChainProvider);
    expect(chain.props.chainId).toBe(10);

    const contract = onlyChild(chain);
    expect(contract.type).toBe(JBContractProvider);
    expect(contract.props).toEqual(
      expect.objectContaining({ projectId: 7n, version: 6, include: [] }),
    );

    const ruleset = onlyChild(contract);
    expect(ruleset.type).toBe(JBRulesetProvider);
    const metadata = onlyChild(ruleset);
    expect(metadata.type).toBe(JBProjectMetadataProvider);
    expect(metadata.props.ipfsGatewayHostname).toBe("gateway.example");
    const dataHook = onlyChild(metadata);
    expect(dataHook.type).toBe(JBCurrentDataHookProvider);
    const terminal = onlyChild(dataHook);
    expect(terminal.type).toBe(JBPrimaryNativeTerminalProvider);
    const token = onlyChild(terminal);
    expect(token.type).toBe(JBTokenProvider);
    expect(token.props.withTotalOutstanding).toBe(true);
    expect(onlyChild(token)).toBe("child");
  });

  test("exposes project identity separately from Bendystraw configuration", () => {
    const bendystraw = { apiHost: "https://bendystraw.example" } as const;
    (JBProjectContext as unknown as { _value: unknown })._value = {
      projectId: 7n,
      chainId: 10,
      version: 6,
      bendystraw,
    };

    expect(useJBProject()).toEqual({
      projectId: 7n,
      chainId: 10,
      version: 6,
      bendystraw,
    });
    expect(useBendystrawConfig()).toBe(bendystraw);

    (JBProjectContext as unknown as { _value: unknown })._value = undefined;
    expect(useJBProject()).toBeUndefined();
    expect(useBendystrawConfig()).toBeUndefined();
  });
});
