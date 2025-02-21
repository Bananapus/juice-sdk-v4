import { useQuery } from "wagmi/query";
import { useState } from "react";
import { API } from "../constants";
import { RelayrGetBundleResponse } from "../types";

const POLL_INTERVAL = 2000;

const fetchTxBundle = async (
  uuid: string | undefined
): Promise<RelayrGetBundleResponse> => {
  if (!uuid) {
    throw new Error("No UUID provided");
  }
  const response = await fetch(`${API}/v1/bundle/${uuid}`);
  if (!response.ok) {
    const errorMessage = await response.text();
    throw new Error(errorMessage);
  }
  return response.json();
};

export function useGetRelayrTxBundle() {
  const [uuid, setUuid] = useState<string>();

  const getRelayrTxBundle = useQuery({
    queryKey: ["txBundle", uuid],
    queryFn: () => fetchTxBundle(uuid),
    enabled: !!uuid,
    refetchInterval: (query) =>
      query.state.data?.transactions?.every((tx) => tx?.status.data?.hash)
        ? false
        : POLL_INTERVAL,
  });

  const startPolling = (bundleUuid: string) => {
    setUuid(bundleUuid);
    getRelayrTxBundle.refetch();
  };

  const isComplete = (
    getRelayrTxBundle.data as RelayrGetBundleResponse
  )?.transactions?.every((tx) => tx?.status.data?.hash);

  return {
    startPolling,
    isComplete,
    uuid,
    response: getRelayrTxBundle.data as RelayrGetBundleResponse,
    isPolling: getRelayrTxBundle.isFetching,
    error: getRelayrTxBundle.error,
  };
}
