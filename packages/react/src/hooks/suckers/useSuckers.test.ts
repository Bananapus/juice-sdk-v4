import { ProjectDocument } from "../../generated/graphql";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useSuckers } from "./useSuckers";

const mocks = vi.hoisted(() => ({
  chainId: 10 as number | undefined,
  data: undefined as any,
  query: vi.fn(),
}));

vi.mock("react", () => ({ useMemo: <T>(factory: () => T) => factory() }));
vi.mock("../../contexts/JBChainContext/JBChainContext", () => ({
  useJBChainId: () => mocks.chainId,
}));
vi.mock("../../contexts/JBContractContext/JBContractContext", () => ({
  useJBContractContext: () => ({ projectId: 7n, version: 6 }),
}));
vi.mock("src/lib/bendystraw/useBendystrawQuery", () => ({
  useBendystrawQuery: mocks.query,
}));

describe("useSuckers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.chainId = 10;
    mocks.data = undefined;
    mocks.query.mockImplementation(() => ({
      data: mocks.data,
      isLoading: false,
    }));
  });

  test("normalizes and deterministically orders peer project identities", () => {
    mocks.data = {
      project: {
        suckerGroup: {
          projects: {
            items: [
              { chainId: 10, projectId: "30" },
              { chainId: 8453, projectId: "20" },
              { chainId: 1, projectId: "10" },
            ],
          },
        },
      },
    };

    const result = useSuckers();

    expect(mocks.query).toHaveBeenCalledWith(
      ProjectDocument,
      {
        projectId: 7,
        chainId: 10,
        version: 6,
      },
      { staleTime: Infinity, enabled: true },
    );
    expect(result).toEqual({
      data: [
        { peerChainId: 1, projectId: 10n },
        { peerChainId: 8453, projectId: 20n },
        { peerChainId: 10, projectId: 30n },
      ],
      isLoading: false,
    });
  });

  test("preserves query state and disables reads without a chain or by request", () => {
    mocks.chainId = undefined;
    expect(useSuckers().data).toBeUndefined();
    expect(mocks.query.mock.calls[0][2].enabled).toBe(false);

    mocks.chainId = 10;
    useSuckers({ enabled: false });
    expect(mocks.query.mock.calls[1][2].enabled).toBe(false);
  });

  test("does not invent peers when Bendystraw returns no sucker group", () => {
    mocks.data = { project: null };
    expect(useSuckers().data).toBeUndefined();
  });
});
