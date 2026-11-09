import {
  relayrProgress,
  type RelayrProgressSummary,
} from "@bananapus/nana-sdk-core/review/relayr";
import { useCallback, useMemo, useState } from "react";
import { useQuery } from "wagmi/query";
import { API } from "../constants";
import { RelayrGetBundleResponse } from "../types";

const POLL_INTERVAL = 2000;
/** How long a bundle is polled before the hook stops, as core's `pollRelayrBundle` does. */
const POLL_TIMEOUT = 5 * 60_000;

/** The bundle's progress by core's case-insensitive rules, with unreported rows counted as pending. */
const progressOf = (
  response: RelayrGetBundleResponse | undefined,
  expectedCount: number | undefined,
): RelayrProgressSummary => {
  const records = (response?.transactions ?? []).map((tx) => ({
    status: { state: tx?.status?.state },
  }));
  return relayrProgress(records, expectedCount ?? records.length);
};

const isComplete = ({ total, confirmed }: RelayrProgressSummary) =>
  total > 0 && confirmed === total;

const fetchTxBundle = async (
  uuid: string | undefined,
  signal?: AbortSignal,
): Promise<RelayrGetBundleResponse> => {
  if (!uuid) {
    throw new Error("No UUID provided");
  }
  const response = await fetch(`${API}/v1/bundle/${uuid}`, { signal });
  if (!response.ok) {
    const errorMessage = await response.text();
    throw new Error(errorMessage);
  }
  return response.json();
};

/**
 * Polls one Relayr bundle until every transaction succeeded (`expectedCount`
 * of them, when given), one failed, or five minutes passed. A failed read is
 * polled again; `error` is the last one.
 */
export function useGetRelayrTxBundle() {
  const [target, setTarget] = useState<{
    uuid: string;
    expectedCount?: number;
    until: number;
  }>();
  const uuid = target?.uuid;
  const expectedCount = target?.expectedCount;

  const getRelayrTxBundle = useQuery<
    RelayrGetBundleResponse,
    Error,
    RelayrGetBundleResponse,
    ["txBundle", string | undefined]
  >({
    queryKey: ["txBundle", uuid],
    queryFn: ({ signal }) => fetchTxBundle(uuid, signal),
    enabled: !!uuid,
    refetchInterval: (query) => {
      const progress = progressOf(query.state.data, expectedCount);
      return isComplete(progress) ||
        progress.failed > 0 ||
        !target ||
        Date.now() >= target.until
        ? false
        : POLL_INTERVAL;
    },
  });

  const startPolling = useCallback(
    (bundleUuid: string, expectedCount?: number) => {
      setTarget({
        uuid: bundleUuid,
        ...(expectedCount === undefined ? {} : { expectedCount }),
        until: Date.now() + POLL_TIMEOUT,
      });
      if (bundleUuid === uuid) void getRelayrTxBundle.refetch();
    },
    [getRelayrTxBundle.refetch, uuid],
  );

  const progress = useMemo(
    () => progressOf(getRelayrTxBundle.data, expectedCount),
    [getRelayrTxBundle.data, expectedCount],
  );
  const complete = isComplete(progress);
  const hasFailed = progress.failed > 0;
  // The read that landed after the deadline is the last one: its update renders this.
  const lastRead = Math.max(
    getRelayrTxBundle.dataUpdatedAt ?? 0,
    getRelayrTxBundle.errorUpdatedAt ?? 0,
  );
  const timedOut =
    !!target && !complete && !hasFailed && lastRead >= target.until;

  return {
    startPolling,
    isComplete: complete,
    hasFailed,
    /** Polling stopped after five minutes with the bundle still unfinished. */
    timedOut,
    progress,
    uuid,
    response: getRelayrTxBundle.data,
    isPolling: !!target && !complete && !hasFailed && !timedOut,
    isFetching: getRelayrTxBundle.isFetching,
    error: getRelayrTxBundle.error,
  };
}
