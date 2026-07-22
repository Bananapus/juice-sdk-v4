import { type TypedDocumentNode } from "@graphql-typed-document-node/core";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useBendystrawQuery } from "./useBendystrawQuery";

const mocks = vi.hoisted(() => ({
  chainId: 1 as number | undefined,
  config: { apiKey: "secret" } as { apiKey: string; url?: string } | undefined,
  queryConfig: undefined as any,
  request: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: (config: any) => {
    mocks.queryConfig = config;
    return { data: undefined, status: "pending" };
  },
}));

vi.mock("graphql-request", () => ({ default: mocks.request }));

vi.mock("../../contexts/JBChainContext/JBChainContext", () => ({
  useJBChainId: () => mocks.chainId,
}));

vi.mock("../../contexts/JBProjectProvider/JBProjectProvider", () => ({
  useBendystrawConfig: () => mocks.config,
}));

type Result = { project: { id: string } };
type Variables = { projectId: number };

const document = {
  definitions: [{ name: { value: "Project" } }],
} as unknown as TypedDocumentNode<Result, Variables>;

describe("useBendystrawQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.chainId = 1;
    mocks.config = { apiKey: "secret" };
    mocks.request.mockResolvedValue({ project: { id: "1" } });
  });

  test("keys and requests the chain's configured Bendystraw endpoint", async () => {
    const variables = { projectId: 1 };

    useBendystrawQuery(document, variables);

    expect(mocks.queryConfig.queryKey).toEqual([
      "Project",
      1,
      "https://bendystraw.xyz/secret",
      variables,
    ]);
    expect(mocks.queryConfig.enabled).toBe(true);
    await expect(mocks.queryConfig.queryFn()).resolves.toEqual({
      project: { id: "1" },
    });
    expect(mocks.request).toHaveBeenCalledWith(
      "https://bendystraw.xyz/secret/graphql",
      document,
      variables,
    );
  });

  test("includes a custom endpoint in both the request and cache boundary", async () => {
    mocks.config = {
      apiKey: "tenant-a",
      url: "https://bendystraw.example/indexer",
    };

    useBendystrawQuery(document, { projectId: 2 });

    expect(mocks.queryConfig.queryKey).toContain(
      "https://bendystraw.example/indexer/tenant-a",
    );
    await mocks.queryConfig.queryFn();
    expect(mocks.request).toHaveBeenCalledWith(
      "https://bendystraw.example/indexer/tenant-a/graphql",
      document,
      { projectId: 2 },
    );
  });

  test("uses the testnet endpoint for a non-mainnet chain", async () => {
    mocks.chainId = 11155111;

    useBendystrawQuery(document, { projectId: 3 });

    await mocks.queryConfig.queryFn();
    expect(mocks.request).toHaveBeenCalledWith(
      "https://testnet.bendystraw.xyz/secret/graphql",
      document,
      { projectId: 3 },
    );
  });

  test("disables requests without a chain or Bendystraw configuration", () => {
    mocks.chainId = undefined;
    useBendystrawQuery(document, { projectId: 1 });
    expect(mocks.queryConfig.enabled).toBe(false);
    expect(mocks.queryConfig.queryKey).toEqual([
      "Project",
      undefined,
      undefined,
      { projectId: 1 },
    ]);

    mocks.chainId = 1;
    mocks.config = undefined;
    useBendystrawQuery(document, { projectId: 1 });
    expect(mocks.queryConfig.enabled).toBe(false);
  });

  test("honors explicit enablement and polling options", () => {
    useBendystrawQuery(
      document,
      { projectId: 1 },
      { enabled: false, pollInterval: 12_345, staleTime: Infinity },
    );

    expect(mocks.queryConfig.enabled).toBe(false);
    expect(mocks.queryConfig.refetchInterval).toBe(12_345);
    expect(mocks.queryConfig.staleTime).toBe(Infinity);
  });

  test("uses bounded exponential retry and stable cache timing", () => {
    useBendystrawQuery(document, { projectId: 1 });

    expect(mocks.queryConfig.retry).toBe(3);
    expect(mocks.queryConfig.retryDelay(0)).toBe(1000);
    expect(mocks.queryConfig.retryDelay(1)).toBe(2000);
    expect(mocks.queryConfig.retryDelay(5)).toBe(30000);
    expect(mocks.queryConfig.staleTime).toBe(30000);
    expect(mocks.queryConfig.gcTime).toBe(300000);
  });
});
