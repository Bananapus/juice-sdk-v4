import { JB_CHAIN_SLUGS } from "../constants.js";
import { JBChainId } from "../types.js";

export function jbUrn(urn: string): {
  chainId: JBChainId;
  projectId: bigint;
} | null {
  const [chainSlug, projectId] = urn.split(":");
  const chain = JB_CHAIN_SLUGS[chainSlug];
  if (!chain) {
    return null;
  }

  return {
    chainId: chain.chain.id as JBChainId,
    projectId: BigInt(projectId),
  };
}

export function toJbUrn(chainId: JBChainId, projectId: bigint): string | null {
  const chain = Object.values(JB_CHAIN_SLUGS).find(
    (chain) => chain.chain.id === chainId
  );
  if (!chain) {
    return null;
  }

  return `${chain.slug}:${projectId}`;
}
