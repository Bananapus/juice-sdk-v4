import { useCallback, useEffect, useState } from "react";
import { RelayrGetBundleResponse } from "../types";
import { API, DASHBOARD } from "../constants";

/**
 * Polls for the Relayr tx bundle. Useful for checking status of transactions in the bundle.
 */
export function useGetTxBundle() {
  const [relayrResponse, setRelayrResponse] =
    useState<RelayrGetBundleResponse>();
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [uuid, setUuid] = useState<string>();

  useEffect(() => {
    let pollInterval: NodeJS.Timeout;
    const pollBundle = async () => {
      try {
        console.log("fetching bundle_uuid:: ", uuid);
        const response = await fetch(`${API}/v1/bundle/${uuid}`);
        if (!response.ok) {
          const errorMessage = await response.text();
          throw new Error(errorMessage);
        }
        const data: RelayrGetBundleResponse = await response.json();
        console.log("Relayr:: ", data);
        console.log(
          "RelayrDashboard:: ",
          `${DASHBOARD}/bundle/${data.bundle_uuid}`
        );
        setRelayrResponse(data);
        setError(null);

        const allTxHaveHash = data.transactions?.every(
          (tx) => tx?.status.data?.hash
        );
        if (allTxHaveHash) {
          setIsPolling(false);
        }
      } catch (e: any) {
        setError(e);
        setIsPolling(false);

        console.log("Relayr ERROR:: ", e);
      }
    };

    if (isPolling && uuid) {
      pollBundle();
      pollInterval = setInterval(pollBundle, 2000);
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [isPolling, uuid, toast]);

  const startPolling = useCallback((bundleUuid: string) => {
    setError(null);
    setUuid(bundleUuid);
    setIsPolling(true);
  }, []);

  const isComplete =
    relayrResponse?.transactions?.every((tx) => tx?.status.data?.hash) ?? false;

  return {
    startPolling,
    response: relayrResponse,
    isPolling,
    isComplete,
    error,
    uuid,
  };
}
