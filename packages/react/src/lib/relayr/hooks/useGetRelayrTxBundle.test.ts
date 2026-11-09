import { beforeEach, describe, expect, test, vi } from "vitest";
import { useGetRelayrTxBundle } from "./useGetRelayrTxBundle";

const mocks = vi.hoisted(() => ({
  data: undefined as any,
  isFetching: true,
  queryConfig: undefined as any,
  queryError: null as unknown,
  refetch: vi.fn(),
  setTarget: vi.fn(),
  target: undefined as
    | { uuid: string; expectedCount?: number; until: number }
    | undefined,
  dataUpdatedAt: 0,
  errorUpdatedAt: 0,
}));

const select = (uuid: string, expectedCount?: number, until = Infinity) => {
  mocks.target = { uuid, until, ...(expectedCount ? { expectedCount } : {}) };
};

vi.mock("react", () => ({
  useCallback: (callback: unknown) => callback,
  useMemo: (factory: () => unknown) => factory(),
  useState: () => [mocks.target, mocks.setTarget],
}));

vi.mock("wagmi/query", () => ({
  useQuery: (config: any) => {
    mocks.queryConfig = config;
    return {
      data: mocks.data,
      dataUpdatedAt: mocks.dataUpdatedAt,
      error: mocks.queryError,
      errorUpdatedAt: mocks.errorUpdatedAt,
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
    mocks.target = undefined;
    mocks.dataUpdatedAt = 0;
    mocks.errorUpdatedAt = 0;
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
    select("bundle-old");

    useGetRelayrTxBundle().startPolling("bundle-new", 2);

    expect(mocks.setTarget).toHaveBeenCalledWith({
      uuid: "bundle-new",
      expectedCount: 2,
      until: expect.any(Number),
    });
    expect(mocks.refetch).not.toHaveBeenCalled();
  });

  test("refreshes, with a new five-minute window, when polling the current bundle again", () => {
    select("bundle-current", undefined, 0);

    useGetRelayrTxBundle().startPolling("bundle-current");

    expect(mocks.setTarget.mock.calls[0][0].until).toBeGreaterThan(Date.now());
    expect(mocks.refetch).toHaveBeenCalledOnce();
  });

  test("fetches the selected bundle and returns the Relayr JSON payload", async () => {
    select("bundle-123");
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
    select("bundle-expired");
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
    select("bundle-unavailable");
    mocks.queryError = queryError;

    expect(useGetRelayrTxBundle().error).toBe(queryError);
  });

  test("polls pending, missing, and empty transaction sets", () => {
    select("bundle-pending");
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
      select("bundle-complete");
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
    select("bundle-failed");
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

  test.each(["success", "completed", " SUCCESS "])(
    "reports completion when Relayr says %j, in any case",
    (state) => {
      select("bundle-lower");
      mocks.data = {
        bundle_uuid: "bundle-lower",
        transactions: [transaction(state)],
      };

      const relayr = useGetRelayrTxBundle();

      expect(
        mocks.queryConfig.refetchInterval({ state: { data: mocks.data } }),
      ).toBe(false);
      expect(relayr.isComplete).toBe(true);
      expect(relayr.isPolling).toBe(false);
    },
  );

  test("reports a lowercase failure as final", () => {
    select("bundle-lower-failed");
    mocks.data = {
      bundle_uuid: "bundle-lower-failed",
      transactions: [transaction("failed")],
    };

    const relayr = useGetRelayrTxBundle();

    expect(relayr.hasFailed).toBe(true);
    expect(relayr.isPolling).toBe(false);
  });

  test("keeps polling until every expected transaction is reported", () => {
    select("bundle-partial", 2);
    mocks.data = {
      bundle_uuid: "bundle-partial",
      transactions: [transaction("Success")],
    };

    const relayr = useGetRelayrTxBundle();

    expect(
      mocks.queryConfig.refetchInterval({ state: { data: mocks.data } }),
    ).toBe(2000);
    expect(relayr.isComplete).toBe(false);
    expect(relayr.isPolling).toBe(true);
    expect(relayr.progress).toEqual({
      confirmed: 1,
      failed: 0,
      pending: 1,
      total: 2,
    });
  });

  test("keeps polling through a failed read, and stops after five minutes", () => {
    const until = Date.now() + 1_000;
    select("bundle-slow", 1, until);
    mocks.queryError = new Error("offline");
    mocks.errorUpdatedAt = until - 1;

    const polling = useGetRelayrTxBundle();
    expect(polling.isPolling).toBe(true);
    expect(polling.error).toBe(mocks.queryError);
    expect(
      mocks.queryConfig.refetchInterval({ state: { data: undefined } }),
    ).toBe(2000);

    // The read that landed after the deadline is the last.
    select("bundle-slow", 1, Date.now() - 1);
    mocks.errorUpdatedAt = Date.now();
    const stopped = useGetRelayrTxBundle();
    expect(
      mocks.queryConfig.refetchInterval({ state: { data: undefined } }),
    ).toBe(false);
    expect(stopped.timedOut).toBe(true);
    expect(stopped.isPolling).toBe(false);
  });

  test("does not treat an empty bundle as complete", () => {
    mocks.data = { bundle_uuid: "bundle-empty", transactions: [] };

    expect(useGetRelayrTxBundle().isComplete).toBe(false);
  });
});
