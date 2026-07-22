import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  JBProjectMetadataContext,
  JBProjectMetadataProvider,
  useJBProjectMetadataContext,
  useProjectMetadata,
} from "./JBProjectMetadataContext";

const mocks = vi.hoisted(() => ({
  publicClient: undefined as object | undefined,
  getProjectMetadata: vi.fn(),
  useQuery: vi.fn(),
}));

vi.mock("@bananapus/nana-sdk-core", () => ({
  debug: vi.fn(),
  getProjectMetadata: mocks.getProjectMetadata,
}));
vi.mock("react", () => ({
  createContext: (defaultValue: unknown) => ({
    Provider: "mock-context-provider",
    _value: defaultValue,
  }),
  useContext: (context: { _value: unknown }) => context._value,
}));
vi.mock("wagmi", () => ({
  usePublicClient: () => mocks.publicClient,
}));
vi.mock("wagmi/query", () => ({ useQuery: mocks.useQuery }));
vi.mock("../JBChainContext/JBChainContext", () => ({
  useJBChainId: () => 10,
}));
vi.mock("../JBContractContext/JBContractContext", () => ({
  useJBContractContext: () => ({
    projectId: 7n,
    contracts: {
      controller: {
        data: "0x1111111111111111111111111111111111111111",
      },
    },
  }),
}));

const controller = "0x1111111111111111111111111111111111111111" as const;

describe("JBProjectMetadataContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.publicClient = { chain: { id: 10 } };
    mocks.useQuery.mockImplementation((config) => config);
  });

  test("builds a chain-scoped metadata query and forwards the gateway", async () => {
    const metadata = { name: "Safe project" };
    mocks.getProjectMetadata.mockResolvedValue(metadata);

    const query = useProjectMetadata({
      projectId: 7n,
      jbControllerAddress: controller,
      ipfsGatewayHostname: "gateway.example",
    }) as unknown as {
      queryKey: unknown[];
      queryFn: () => Promise<unknown>;
    };

    expect(query.queryKey).toEqual([
      "juice-sdk",
      "useProjectMetadata",
      "7",
      controller,
      "gateway.example",
    ]);
    await expect(query.queryFn()).resolves.toEqual(metadata);
    expect(mocks.getProjectMetadata).toHaveBeenCalledWith(
      mocks.publicClient,
      { projectId: 7n, jbControllerAddress: controller },
      { ipfsGatewayHostname: "gateway.example" },
    );
  });

  test("does not read incomplete metadata and fails closed without a client", async () => {
    const incomplete = useProjectMetadata({
      projectId: undefined,
      jbControllerAddress: undefined,
    }) as unknown as { queryFn: () => Promise<unknown> };
    await expect(incomplete.queryFn()).resolves.toBeNull();
    expect(mocks.getProjectMetadata).not.toHaveBeenCalled();

    mocks.publicClient = undefined;
    const disconnected = useProjectMetadata({
      projectId: 7n,
      jbControllerAddress: controller,
    }) as unknown as { queryFn: () => Promise<unknown> };
    await expect(disconnected.queryFn()).rejects.toThrow(
      "Public client not available",
    );
  });

  test("normalizes an empty metadata response and provides query state", async () => {
    mocks.getProjectMetadata.mockResolvedValue(undefined);
    const empty = useProjectMetadata({
      projectId: 7n,
      jbControllerAddress: controller,
    }) as unknown as { queryFn: () => Promise<unknown> };
    await expect(empty.queryFn()).resolves.toBeNull();

    const metadataState = {
      data: { name: "Project" },
      isLoading: false,
    };
    mocks.useQuery.mockReturnValueOnce(metadataState);
    const element = JBProjectMetadataProvider({
      ipfsGatewayHostname: "gateway.example",
      children: "child",
    }) as unknown as {
      props: { value: { metadata: unknown }; children: unknown };
    };

    expect(element.props.value.metadata).toBe(metadataState);
    expect(element.props.children).toBe("child");
    (JBProjectMetadataContext as unknown as { _value: unknown })._value =
      element.props.value;
    expect(useJBProjectMetadataContext()).toEqual(element.props.value);
  });
});
