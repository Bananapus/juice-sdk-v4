// `jbcenter.ts` re-exports this module, so it takes only types from there:
// a top-level read of one of its values would resolve before `jbcenter.ts`
// finishes evaluating under CJS.
import type { JBCenterDeploymentCall } from "../jbcenter.js";
import { decodeDeploymentCall } from "./decode.js";

/** JB Center's ceiling: one launch per chain, with up to three setup calls. */
const MAX_CALLS_PER_CHAIN = 4;

/** An intent's `deploymentCalls` per chain, each chain's calls in order. */
export function groupDeploymentCalls(
  calls: readonly JBCenterDeploymentCall[],
): Map<number, JBCenterDeploymentCall[]> {
  const groups = new Map<number, JBCenterDeploymentCall[]>();

  for (const call of calls) {
    const group = groups.get(call.chainId);
    if (group) group.push(call);
    else groups.set(call.chainId, [call]);
  }

  return groups;
}

/**
 * JB Center's rule, mirrored: a chain carries 1 to 4 calls, the last call for
 * a chain is its launch, and every call before it creates a Safe through the
 * canonical factory. Whether the chains named match the calls is the
 * envelope's own check.
 */
export function isValidDeploymentCalls(
  calls: readonly JBCenterDeploymentCall[],
): boolean {
  for (const group of groupDeploymentCalls(calls).values()) {
    if (group.length > MAX_CALLS_PER_CHAIN) return false;
    for (const call of group.slice(0, -1)) {
      if (decodeDeploymentCall(call).flavor !== "safe-create") return false;
    }
  }

  return true;
}
