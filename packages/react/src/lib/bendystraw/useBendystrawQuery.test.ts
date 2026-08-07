import { type TypedDocumentNode } from "@graphql-typed-document-node/core";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useBendystrawQuery } from "./useBendystrawQuery";

const mocks = vi.hoisted(() => ({
  chainId: 1 as number | undefined,
  config: { apiKey: "secret" } as { apiKey: string; url?: string } | undefined,
  operationName: "Project" as string | undefined,
  queryConfig: undefined as any,
  requestBendystraw: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: (config: any) => {
    mocks.queryConfig = config;
    return { data: undefined, status: "pending" };
  },
}));

vi.mock("@bananapus/nana-sdk-core", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@bananapus/nana-sdk-core")>()),
  requestBendystraw: mocks.requestBendystraw,
}));

vi.mock("graphql-request", () => ({
  analyzeDocument: () => ({
    expression: "query Project($projectId: Int!) { project { id } }",
    operationName: mocks.operationName,
  }),
}));

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
    mocks.operationName = "Project";
    mocks.requestBendystraw.mockResolvedValue({ project: { id: "1" } });
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
    expect(mocks.requestBendystraw).toHaveBeenCalledWith(
      "https://bendystraw.xyz/secret/graphql",
      "query Project($projectId: Int!) { project { id } }",
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
    expect(mocks.requestBendystraw).toHaveBeenCalledWith(
      "https://bendystraw.example/indexer/tenant-a/graphql",
      "query Project($projectId: Int!) { project { id } }",
      { projectId: 2 },
    );
  });

  test("uses the testnet endpoint for a non-mainnet chain", async () => {
    mocks.chainId = 11155111;

    useBendystrawQuery(document, { projectId: 3 });

    await mocks.queryConfig.queryFn();
    expect(mocks.requestBendystraw).toHaveBeenCalledWith(
      "https://testnet.bendystraw.xyz/secret/graphql",
      "query Project($projectId: Int!) { project { id } }",
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

  test("delegates bounded retries to the transport and keeps stable cache timing", () => {
    useBendystrawQuery(document, { projectId: 1 });

    expect(mocks.queryConfig.retry).toBe(false);
    expect(mocks.queryConfig.staleTime).toBe(30000);
    expect(mocks.queryConfig.gcTime).toBe(300000);
  });

  test("rejects anonymous operations before they can share a cache key", () => {
    mocks.operationName = undefined;

    expect(() => useBendystrawQuery(document, { projectId: 1 })).toThrowError(
      "Bendystraw operations must have a name.",
    );
  });
});
