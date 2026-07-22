import { beforeEach, describe, expect, test, vi } from "vitest";
import { useGetRelayrTxBundle } from "./useGetRelayrTxBundle";

const mocks = vi.hoisted(() => ({
  data: undefined as any,
  isFetching: true,
  queryConfig: undefined as any,
  queryError: null as unknown,
  refetch: vi.fn(),
  setUuid: vi.fn(),
  uuid: undefined as string | undefined,
}));

vi.mock("react", () => ({
  useCallback: (callback: unknown) => callback,
  useMemo: (factory: () => unknown) => factory(),
  useState: () => [mocks.uuid, mocks.setUuid],
}));

vi.mock("wagmi/query", () => ({
  useQuery: (config: any) => {
    mocks.queryConfig = config;
    return {
      data: mocks.data,
      error: mocks.queryError,
      isFetching: mocks.isFetching,
      refetch: mocks.refetch,
    };
  },
}));

const transaction = (state: string) => ({
  request: {},
  status: { state },
  tx_uuid: "tx-1",
});

describe("useGetRelayrTxBundle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.data = undefined;
    mocks.isFetching = true;
    mocks.queryError = null;
    mocks.uuid = undefined;
  });

  test("keeps the query disabled until a bundle UUID is selected", async () => {
    const relayr = useGetRelayrTxBundle();

    expect(mocks.queryConfig.queryKey).toEqual(["txBundle", undefined]);
    expect(mocks.queryConfig.enabled).toBe(false);
    expect(relayr).toMatchObject({
      error: null,
      hasFailed: false,
      isComplete: false,
      isFetching: true,
      isPolling: false,
      response: undefined,
      uuid: undefined,
    });
    await expect(mocks.queryConfig.queryFn({})).rejects.toThrow(
      "No UUID provided",
    );
  });

  test("starts a new query without refetching the render's stale UUID", () => {
    mocks.uuid = "bundle-old";

    useGetRelayrTxBundle().startPolling("bundle-new");

    expect(mocks.setUuid).toHaveBeenCalledWith("bundle-new");
    expect(mocks.refetch).not.toHaveBeenCalled();
  });

  test("allows an explicit refresh when polling the current bundle again", () => {
    mocks.uuid = "bundle-current";

    useGetRelayrTxBundle().startPolling("bundle-current");

    expect(mocks.setUuid).not.toHaveBeenCalled();
    expect(mocks.refetch).toHaveBeenCalledOnce();
  });

  test("fetches the selected bundle and returns the Relayr JSON payload", async () => {
    mocks.uuid = "bundle-123";
    mocks.isFetching = false;
    const bundle = {
      bundle_uuid: "bundle-123",
      transactions: [transaction("Pending")],
    };
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => bundle,
      ok: true,
    });
    vi.stubGlobal("fetch", fetchMock);

    const relayr = useGetRelayrTxBundle();

    expect(mocks.queryConfig.queryKey).toEqual(["txBundle", "bundle-123"]);
    expect(mocks.queryConfig.enabled).toBe(true);
    const controller = new AbortController();
    await expect(
      mocks.queryConfig.queryFn({ signal: controller.signal }),
    ).resolves.toBe(bundle);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.relayr.ba5ed.com/v1/bundle/bundle-123",
      { signal: controller.signal },
    );
    expect(relayr.uuid).toBe("bundle-123");
    expect(relayr.isPolling).toBe(true);
    expect(relayr.isFetching).toBe(false);
  });

  test("surfaces Relayr HTTP response text as the polling error", async () => {
    mocks.uuid = "bundle-expired";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        text: async () => "bundle expired",
      }),
    );

    useGetRelayrTxBundle();

    await expect(mocks.queryConfig.queryFn({})).rejects.toThrow(
      "bundle expired",
    );
  });

  test("exposes the query's polling error to consumers", () => {
    const queryError = new Error("Relayr unavailable");
    mocks.uuid = "bundle-unavailable";
    mocks.queryError = queryError;

    expect(useGetRelayrTxBundle().error).toBe(queryError);
  });

  test("polls pending, missing, and empty transaction sets", () => {
    useGetRelayrTxBundle();
    const interval = mocks.queryConfig.refetchInterval;

    expect(interval({ state: { data: undefined } })).toBe(2000);
    expect(interval({ state: { data: { transactions: [] } } })).toBe(2000);
    expect(
      interval({ state: { data: { transactions: [transaction("Pending")] } } }),
    ).toBe(2000);
    expect(
      interval({
        state: {
          data: {
            transactions: [transaction("Success"), transaction("Pending")],
          },
        },
      }),
    ).toBe(2000);
  });

  test.each(["Success", "Completed"])(
    "stops polling and reports completion when every transaction is %s",
    (state) => {
      mocks.uuid = "bundle-complete";
      mocks.data = {
        bundle_uuid: "bundle-complete",
        transactions: [transaction(state), transaction(state)],
      };

      const relayr = useGetRelayrTxBundle();

      expect(
        mocks.queryConfig.refetchInterval({ state: { data: mocks.data } }),
      ).toBe(false);
      expect(relayr.isComplete).toBe(true);
      expect(relayr.hasFailed).toBe(false);
      expect(relayr.isPolling).toBe(false);
    },
  );

  test("stops polling and exposes a terminal transaction failure", () => {
    mocks.uuid = "bundle-failed";
    mocks.data = {
      bundle_uuid: "bundle-failed",
      transactions: [transaction("Success"), transaction("Failed")],
    };

    const relayr = useGetRelayrTxBundle();

    expect(
      mocks.queryConfig.refetchInterval({ state: { data: mocks.data } }),
    ).toBe(false);
    expect(relayr.isComplete).toBe(false);
    expect(relayr.hasFailed).toBe(true);
    expect(relayr.isPolling).toBe(false);
  });

  test("does not treat an empty bundle as complete", () => {
    mocks.data = { bundle_uuid: "bundle-empty", transactions: [] };

    expect(useGetRelayrTxBundle().isComplete).toBe(false);
  });
});
