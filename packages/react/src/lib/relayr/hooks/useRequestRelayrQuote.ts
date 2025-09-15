"use client";
import { JBChainId, jbContractAddress } from "juice-sdk-core";
import { useJBContractContext } from "src/contexts/JBContractContext/JBContractContext";
import { useMutation } from "wagmi/query";
import { API } from "../constants";
import { RelayrPostBundleResponse } from "../types";

export function useRequestRelayrQuote() {
  const { version } = useJBContractContext();

  return useMutation({
    mutationFn: async (
      args: {
        data: `0x${string}`;
        chain: JBChainId;
        value: string;
      }[]
    ) => {
      const transactions = args.map((ct) => {
        return {
          chain: ct.chain,
          data: ct.data,
          target: jbContractAddress[version]["ERC2771Forwarder"][ct.chain],
          value: ct.value,
        };
      });

      const response = await fetch(`${API}/v1/bundle/prepaid`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transactions,
          virtual_nonce_mode: "Disabled",
        }),
      });

      if (!response.ok) {
        console.error("Relayr ERROR:: ", response);
        const errorMessage = await response.text();
        throw new Error(errorMessage);
      }

      return (await response.json()) as RelayrPostBundleResponse;
    },
  });
}
