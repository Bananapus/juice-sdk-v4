import { beforeEach, describe, expect, test, vi } from "vitest";
import { useFind721DataHook } from "./useFind721DataHook";

const mocks = vi.hoisted(() => ({
  dataHookAddress: "0x1111111111111111111111111111111111111111" as
    | `0x${string}`
    | undefined,
  rulesetId: 9n as bigint | undefined,
  publicClient: { chain: { id: 10 } } as object | undefined,
  find721DataHook: vi.fn(),
  useQuery: vi.fn(),
}));

vi.mock("@bananapus/nana-sdk-core", () => ({
  debug: vi.fn(),
  find721DataHook: mocks.find721DataHook,
}));
vi.mock("wagmi", () => ({ usePublicClient: () => mocks.publicClient }));
vi.mock("wagmi/query", () => ({ useQuery: mocks.useQuery }));
vi.mock("../../contexts/JBDataHookContext/JBDataHookContext", () => ({
  useJBDataHookContext: () => ({
    data: { dataHookAddress: mocks.dataHookAddress },
  }),
}));
vi.mock("../../contexts/JBContractContext/JBContractContext", () => ({
  useJBContractContext: () => ({ projectId: 7n, version: 6 }),
}));
vi.mock("../../contexts/JBRulesetContext/JBRulesetContext", () => ({
  useJBRulesetContext: () => ({
    ruleset: { data: { id: mocks.rulesetId } },
  }),
}));

describe("useFind721DataHook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.dataHookAddress = "0x1111111111111111111111111111111111111111";
    mocks.rulesetId = 9n;
    mocks.publicClient = { chain: { id: 10 } };
    mocks.useQuery.mockImplementation((config) => config);
  });

  test("finds the tiered hook using the complete project/ruleset identity", async () => {
    const found = { address: "0x2222222222222222222222222222222222222222" };
    mocks.find721DataHook.mockResolvedValue(found);

    const query = useFind721DataHook() as unknown as {
      queryKey: unknown[];
      staleTime: number;
      queryFn: () => Promise<unknown>;
    };

    expect(query.queryKey).toEqual(["dataHook", 7n, 9n, mocks.dataHookAddress]);
    expect(query.staleTime).toBe(Infinity);
    await expect(query.queryFn()).resolves.toBe(found);
    expect(mocks.find721DataHook).toHaveBeenCalledWith(mocks.publicClient, {
      dataHookAddress: mocks.dataHookAddress,
      projectId: 7n,
      rulesetId: 9n,
      version: 6,
    });
  });

  test("returns null for incomplete ruleset state", async () => {
    mocks.rulesetId = undefined;
    const query = useFind721DataHook() as unknown as {
      queryFn: () => Promise<unknown>;
    };
    await expect(query.queryFn()).resolves.toBeNull();
    expect(mocks.find721DataHook).not.toHaveBeenCalled();
  });

  test("fails closed when no public client is available", async () => {
    mocks.publicClient = undefined;
    const query = useFind721DataHook() as unknown as {
      queryFn: () => Promise<unknown>;
    };
    await expect(query.queryFn()).rejects.toThrow(
      "Public client not available",
    );
  });
});
