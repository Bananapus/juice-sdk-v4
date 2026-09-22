// `jbcenter.ts` re-exports this module, so it takes only types from there:
// a top-level read of one of its values would resolve before `jbcenter.ts`
// finishes evaluating under CJS.
import type {
  JBCenterDeploymentCall,
  JBCenterIntent,
  JBCenterJsonObject,
} from "../jbcenter.js";
import { decodeDeploymentCall } from "./decode.js";
import type { JBCenterDecodedLaunch } from "./decode.js";

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

/** One of an intent's calls, with the launch or Safe creation it carries. */
export type JBCenterDecodedCall = JBCenterDeploymentCall & {
  decoded: JBCenterDecodedLaunch;
};

export type JBCenterChainCalls = {
  setup: JBCenterDecodedCall[];
  launch: JBCenterDecodedCall;
};

/**
 * An intent's calls per chain, decoded, so a client renders "creates this
 * Safe, then launches" without repeating the rule: the last call for a chain
 * is its launch and every call before it is a setup call.
 */
export function intentCalls(
  intent: JBCenterIntent<JBCenterJsonObject>,
): Map<number, JBCenterChainCalls> {
  const result = new Map<number, JBCenterChainCalls>();

  for (const [chainId, calls] of groupDeploymentCalls(
    intent.envelope.deploymentCalls,
  )) {
    const decoded = calls.map((call) => ({
      ...call,
      decoded: decodeDeploymentCall(call),
    }));
    result.set(chainId, {
      setup: decoded.slice(0, -1),
      launch: decoded[decoded.length - 1],
    });
  }

  return result;
}
