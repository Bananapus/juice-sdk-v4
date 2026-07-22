import { useCallback, useMemo, useState } from "react";
import { useQuery } from "wagmi/query";
import { API } from "../constants";
import { RelayrGetBundleResponse } from "../types";

const POLL_INTERVAL = 2000;

const transactionSucceeded = (state: string) =>
  state === "Success" || state === "Completed";

const areTransactionsComplete = (
  response: RelayrGetBundleResponse | undefined,
) =>
  !!response?.transactions?.length &&
  response.transactions.every((tx) => transactionSucceeded(tx.status.state));

const hasTransactionFailure = (response: RelayrGetBundleResponse | undefined) =>
  !!response?.transactions?.some((tx) => tx.status.state === "Failed");

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

export function useGetRelayrTxBundle() {
  const [uuid, setUuid] = useState<string>();

  const getRelayrTxBundle = useQuery<
    RelayrGetBundleResponse,
    Error,
    RelayrGetBundleResponse,
    ["txBundle", string | undefined]
  >({
    queryKey: ["txBundle", uuid],
    queryFn: ({ signal }) => fetchTxBundle(uuid, signal),
    enabled: !!uuid,
    refetchInterval: (query) =>
      areTransactionsComplete(query.state.data) ||
      hasTransactionFailure(query.state.data)
        ? false
        : POLL_INTERVAL,
  });

  const startPolling = useCallback(
    (bundleUuid: string) => {
      if (bundleUuid === uuid) {
        void getRelayrTxBundle.refetch();
        return;
      }

      setUuid(bundleUuid);
    },
    [getRelayrTxBundle.refetch, uuid],
  );

  const isComplete = useMemo(
    () => areTransactionsComplete(getRelayrTxBundle.data),
    [getRelayrTxBundle.data],
  );
  const hasFailed = useMemo(
    () => hasTransactionFailure(getRelayrTxBundle.data),
    [getRelayrTxBundle.data],
  );

  return {
    startPolling,
    isComplete,
    hasFailed,
    uuid,
    response: getRelayrTxBundle.data,
    isPolling: !!uuid && !isComplete && !hasFailed,
    isFetching: getRelayrTxBundle.isFetching,
    error: getRelayrTxBundle.error,
  };
}
