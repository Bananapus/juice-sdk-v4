import { JB_CHAINS, JBChainId } from "@bananapus/nana-sdk-core";

const bendystrawUrl = "https://bendystraw.xyz";
const testnetBendystrawUrl = "https://testnet.bendystraw.xyz";

export type BendystrawConfig = {
  apiKey: string;
  url?: string;
};

export function getBendystrawUrl(
  chainId: number,
  config: BendystrawConfig,
): string {
  const { url, apiKey } = config;
  // An empty key must not leave a bare `/` behind: callers append `/graphql`.
  const keyPath = apiKey !== "" ? `/${apiKey}` : "";

  if (url) return `${url}${keyPath}`;

  // Derived from the chain registry rather than a hand-listed set of mainnets:
  // a hard-coded list routes every newly supported production chain to the
  // testnet indexer, which answers with data for a different network.
  const chain = JB_CHAINS[chainId as JBChainId]?.chain;
  const isMainnet = chain ? !chain.testnet : false;

  return `${isMainnet ? bendystrawUrl : testnetBendystrawUrl}${keyPath}`;
}
