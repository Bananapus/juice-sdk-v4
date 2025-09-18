import { arbitrum, base, mainnet, optimism } from "viem/chains";

const bendystrawUrl = "https://bendystraw.xyz";
const testnetBendystrawUrl = "https://testnet.bendystraw.xyz";

export type BendystrawConfig = {
  apiKey: string;
  url?: string;
};

export function getBendystrawUrl(chainId: number, config: BendystrawConfig): string {
  const { url, apiKey } = config;
  if (url) return `${url}/${apiKey}`;

  const isMainnet = [mainnet, base, arbitrum, optimism].some((c) => c.id === chainId);
  return `${isMainnet ? bendystrawUrl : testnetBendystrawUrl}${apiKey !== "" ? `/${apiKey}` : ""}`;
}
