import { JB_CHAIN_SLUGS } from "../constants.js";
import { JBChainId, JBVersion } from "../types.js";

export function jbUrn(urn: string): {
  chainId: JBChainId;
  projectId: bigint;
  version: JBVersion;
} | null {
  try {
    const urlParts = urn.split(":").map((part) => part.trim());
    if (urlParts.length < 2 || urlParts.length > 3) return null;

    let chainSlug: string | undefined;
    let version: number | undefined;
    let projectId: string | undefined;

    if (urlParts.length === 2) {
      // default to v4 [/eth:3]
      version = 4;
      chainSlug = urlParts[0];
      projectId = urlParts[1];
    } else {
      // with version [/v5:eth:3]
      if (!urlParts[0].startsWith("v")) return null;
      version = Number(urlParts[0].replace("v", ""));
      chainSlug = urlParts[1];
      projectId = urlParts[2];
    }

    const chain = JB_CHAIN_SLUGS[chainSlug];
    if (!chain || !projectId || !isValidVersion(version)) return null;

    return {
      chainId: chain.chain.id as JBChainId,
      projectId: BigInt(projectId),
      version,
    };
  } catch (e) {
    return null;
  }
}

export function toJbUrn(chainId: JBChainId, projectId: bigint): string | null {
  const chain = Object.values(JB_CHAIN_SLUGS).find((chain) => chain.chain.id === chainId);
  if (!chain) {
    return null;
  }

  return `${chain.slug}:${projectId}`;
}

function isValidVersion(version: number): version is JBVersion {
  return version === 4 || version === 5;
}
