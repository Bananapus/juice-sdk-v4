import { goerli } from "viem/chains";
import { Address, useQuery } from "wagmi";
import { useChain } from "../useNetwork";
import { isAddressEqual, zeroAddress } from "viem";

export function useJb721DelegateVersion(datasource: Address | undefined) {
  const chain = useChain();

  return useQuery(["jb721DelegateVersion", datasource], async () => {
    if (!datasource || isAddressEqual(datasource, zeroAddress)) {
      return null;
    }

    try {
      const prefix = chain.id === goerli.id ? "goerli." : "";
      const response = await fetch(
        `https://${prefix}juicebox.money/api/juicebox/jb-721-delegate/${datasource}`
      );

      const data = (await response.json()) as { version: string | undefined };
      return data.version ?? null;
    } catch (e) {
      return null;
    }
  });
}
