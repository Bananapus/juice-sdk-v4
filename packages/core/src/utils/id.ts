import { JBChainId } from "src/types.js";

export function jbId(urn: string): {
  chainId: JBChainId;
  projectId: bigint;
} {
  const [chainId, projectId] = urn.split(":");
  return {
    chainId: parseInt(chainId) as JBChainId,
    projectId: BigInt(projectId),
  };
}

export function jbUrn(chainId: JBChainId, projectId: bigint): string {
  return `${chainId}:${projectId}`;
}
