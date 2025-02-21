import { useQuery } from "wagmi/query";
import { useState } from "react";
import { API } from "../constants";
import { RelayrGetBundleResponse } from "../types";

const POLL_INTERVAL = 2000;

const fetchTxBundle = async (
  uuid: string
): Promise<RelayrGetBundleResponse> => {
  const response = await fetch(`${API}/v1/bundle/${uuid}`);
  if (!response.ok) {
    const errorMessage = await response.text();
    throw new Error(errorMessage);
  }
  return response.json();
};

export function useGetTxBundle() {
  const [uuid, setUuid] = useState<string | null>(null);

  const {
    data: relayrResponse,
    error,
    isFetching: isPolling,
    refetch,
  } = useQuery({
    queryKey: ["txBundle", uuid],
    queryFn: () => fetchTxBundle(uuid!),
    enabled: !!uuid,
    refetchInterval: (query) =>
      query.state.data?.transactions?.every((tx) => tx?.status.data?.hash)
        ? false
        : POLL_INTERVAL,
  });

  const startPolling = (bundleUuid: string) => {
    setUuid(bundleUuid);
    refetch();
  };

  const isComplete = (
    relayrResponse as RelayrGetBundleResponse
  )?.transactions?.every((tx) => tx?.status.data?.hash);

  return {
    startPolling,
    response: relayrResponse as RelayrGetBundleResponse,
    isPolling,
    isComplete,
    error,
    uuid,
  };
}
