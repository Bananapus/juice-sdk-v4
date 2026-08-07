import { JB_CHAIN_SLUGS } from "../constants.js";
import { JBChainId, JBVersion } from "../types.js";

/** The version a versionless URN (`eth:3`) is understood to name. */
const DEFAULT_URN_VERSION = 4;

/**
 * Parse a Juicebox project URN.
 *
 * Two shapes are accepted: `<chainSlug>:<projectId>` (implicitly
 * {@link DEFAULT_URN_VERSION}) and `v<version>:<chainSlug>:<projectId>`.
 * `projectId` must be decimal digits naming a real project id (`>= 1`) — hex
 * (`0x123`) and any other `BigInt`-coercible spelling are rejected rather than
 * silently reinterpreted.
 */
export function jbUrn(urn: string): {
  chainId: JBChainId;
  projectId: bigint;
  version: JBVersion;
} | null {
  const urlParts = urn.split(":").map((part) => part.trim());
  if (urlParts.length < 2 || urlParts.length > 3) return null;

  let chainSlug: string | undefined;
  let version: number | undefined;
  let projectId: string | undefined;

  if (urlParts.length === 2) {
    // Versionless [/eth:3]
    version = DEFAULT_URN_VERSION;
    chainSlug = urlParts[0];
    projectId = urlParts[1];
  } else {
    // With version [/v5:eth:3]
    if (!urlParts[0].startsWith("v")) return null;
    version = Number(urlParts[0].replace("v", ""));
    chainSlug = urlParts[1];
    projectId = urlParts[2];
  }

  const chain = JB_CHAIN_SLUGS[chainSlug];
  if (!chain || !isProjectIdDigits(projectId) || !isValidVersion(version)) {
    return null;
  }

  return {
    chainId: chain.chain.id as JBChainId,
    projectId: BigInt(projectId),
    version,
  };
}

/**
 * Format a Juicebox project URN.
 *
 * The version prefix is emitted whenever `version` is not
 * {@link DEFAULT_URN_VERSION}, so a v5/v6 project round-trips through
 * {@link jbUrn} as itself rather than collapsing into the v4 tables.
 *
 * Returns `null` for an unsupported chain, an unsupported version, or a
 * `projectId` that {@link jbUrn} could not parse back (`<= 0`).
 */
export function toJbUrn(
  chainId: JBChainId,
  projectId: bigint,
  version: JBVersion = DEFAULT_URN_VERSION,
): string | null {
  const chain = Object.values(JB_CHAIN_SLUGS).find(
    (chain) => chain.chain.id === chainId,
  );
  if (!chain || projectId <= 0n || !isValidVersion(version)) {
    return null;
  }

  const prefix = version === DEFAULT_URN_VERSION ? "" : `v${version}:`;
  return `${prefix}${chain.slug}:${projectId}`;
}

/** Whether `value` is decimal digits naming a real project id (`>= 1`). */
function isProjectIdDigits(value: string | undefined): value is string {
  return typeof value === "string" && /^\d+$/.test(value) && BigInt(value) > 0n;
}

function isValidVersion(version: number): version is JBVersion {
  return version === 4 || version === 5 || version === 6;
}
